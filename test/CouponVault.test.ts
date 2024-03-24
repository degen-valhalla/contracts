import { ethers } from 'hardhat'
import { expect } from 'chai'
import { loadFixture, takeSnapshot } from '@nomicfoundation/hardhat-network-helpers'
import { Signer, parseEther } from 'ethers'
import { deployValhallaFixture } from './shared/fixtures'
import { Valhalla, ACoupon, CouponVault, IUniswapV2Router02, IUniswapV2Pair, IWETH9 } from '../typechain-types'

const discounts = {
  1: 5n,
  2: 10n,
}

const getDiscountedAmount = (ids: number[], values: number[]) => {
  let sum = 0n
  for (let i = 0; i < ids.length; i++) {
    sum += (parseEther('1') * BigInt(values[i]) * (100n - discounts[ids[i]])) / 100n
  }

  return sum
}

describe('CouponVault', () => {
  let admin: Signer
  let treasury: Signer
  let alice: Signer
  let david: Signer

  let valhalla: Valhalla
  let coupon: ACoupon
  let couponVault: CouponVault
  let router: IUniswapV2Router02
  let weth9: IWETH9
  let pair: IUniswapV2Pair

  before(async () => {
    ;[admin, treasury, alice, david] = await ethers.getSigners()

    const contracts = await loadFixture(deployValhallaFixture)
    valhalla = contracts.valhalla
    coupon = contracts.coupon
    couponVault = contracts.couponVault
    router = contracts.router
    weth9 = contracts.weth9
    pair = contracts.pair
  })

  it('mint coupon', async () => {
    await coupon.mint(alice, 1, 5, '0x')
    const balance = await coupon.balanceOf(alice, 1)
    expect(balance).equal(5)
    await coupon.mint(alice, 2, 5, '0x')
  })

  it('alice buy token using coupon', async () => {
    const ids = [1, 2]
    const values = [2, 1]
    const [tokens, , amountIn] = await couponVault.quote(alice, ids, values)

    const snapshot = await takeSnapshot()

    const beforeBalance = await ethers.provider.getBalance(alice)
    const discountedAmount = getDiscountedAmount(ids, values)
    const txResponse = await router
      .connect(alice)
      .swapETHForExactTokens(
        discountedAmount,
        [weth9, valhalla],
        alice,
        Math.floor(new Date().getTime() / 1000 + 120),
        { value: parseEther('10') },
      )
    const receipt = await ethers.provider.getTransactionReceipt(txResponse.hash)
    const afterBalance = await ethers.provider.getBalance(alice)
    const amountInForDirectSwap = beforeBalance - afterBalance - receipt.gasUsed * receipt.gasPrice

    await snapshot.restore()

    const originAmountIn = (await router.getAmountsIn(tokens, [weth9, valhalla]))[0]

    const txBuy = couponVault.connect(alice).buyUsingCoupon(ids, values, alice, { value: amountIn })

    expect(amountIn).eq(amountInForDirectSwap)
    await expect(txBuy).changeTokenBalance(valhalla, alice, tokens)
    await expect(txBuy).changeEtherBalance(alice, -amountIn)
    await expect(txBuy).changeTokenBalance(valhalla, couponVault, -tokens)

    const balance1 = await coupon.balanceOf(alice, 1)
    const balance2 = await coupon.balanceOf(alice, 2)
    expect(balance1).eq(5 - values[0])
    expect(balance2).eq(5 - values[1])

    expect(amountIn).lte((originAmountIn * 95n) / 100n)
  })
})
