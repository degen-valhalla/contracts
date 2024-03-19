import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Signer } from 'ethers'
import { ACoupon, ACoupon__factory } from '../typechain-types'

describe('Coupon', () => {
  let admin: Signer
  let alice: Signer
  let david: Signer

  let aCoupon: ACoupon

  before(async () => {
    ;[admin, alice, david] = await ethers.getSigners()

    aCoupon = (await upgrades.deployProxy(new ACoupon__factory(admin), {
      initializer: false,
    })) as unknown as ACoupon
    await aCoupon.initialize('aCoupon', 'aCoupon', 'https://aCoupon/', admin, [5, 15])
  })

  it('mint coupon', async () => {
    await aCoupon.mint(alice, 1, 5, '0x')
    const balance = await aCoupon.balanceOf(alice, 1)
    expect(balance).equal(5)
  })

  it('airdrop coupon', async () => {
    await aCoupon.airdrop([alice], 1, 5)
    const uri = await aCoupon.uri(1)
    console.log(uri)
  })
})
