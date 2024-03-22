import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Signer, parseEther } from 'ethers'
import {
  ACoupon,
  ACoupon__factory,
  CouponProviderForXVS,
  CouponProviderForXVS__factory,
  MockXVSVault,
  MockXVSVault__factory,
} from '../typechain-types'

describe('XVS claim', () => {
  let admin: Signer
  let alice: Signer
  let david: Signer

  let aCoupon: ACoupon
  let xvsVault: MockXVSVault
  let provider: CouponProviderForXVS

  before(async () => {
    ;[admin, alice, david] = await ethers.getSigners()

    const initializerArgs = ['aCoupon', 'aCoupon', 'https://aCoupon/', await admin.getAddress(), [5, 15]]
    aCoupon = (await upgrades.deployProxy(new ACoupon__factory(admin), initializerArgs)) as unknown as ACoupon

    xvsVault = await new MockXVSVault__factory(admin).deploy()

    const params = [await admin.getAddress(), aCoupon.target, xvsVault.target, xvsVault.target, 0]
    provider = (await upgrades.deployProxy(
      new CouponProviderForXVS__factory(admin),
      params,
    )) as unknown as CouponProviderForXVS

    await aCoupon.setOperator(provider, true)

    await xvsVault.setMockData(alice, parseEther('550'), 0)
    await xvsVault.setMockData(david, parseEther('10000'), 0)
  })

  it('add criteria', async () => {
    await provider.addCriteria({ xvsAmount: parseEther('500'), couponIds: [1], couponValues: [1] })
    await provider.addCriteria({ xvsAmount: parseEther('800'), couponIds: [2], couponValues: [1] })
    await provider.addCriteria({ xvsAmount: parseEther('5000'), couponIds: [1, 2], couponValues: [1, 1] })

    await provider.updateCriteria({ xvsAmount: parseEther('1000'), couponIds: [2], couponValues: [1] }, 1)
  })

  it('alice claims', async () => {
    const result = await provider.claimableCoupons(alice)
    expect(result[0][0]).eq(1n)
    expect(result[1][0]).eq(1n)

    const tx = provider.connect(alice).claimCoupon()

    await expect(tx)
      .emit(provider, 'CouponClaim')
      .withArgs(await alice.getAddress(), [1n], [1n])
    const balance = await aCoupon.balanceOf(alice, 1)
    expect(balance).eq(1n)
  })

  it('alice cannot claim twice', async () => {
    const result = await provider.claimableCoupons(alice)
    expect(result[0].length).eq(0n)
    expect(result[1].length).eq(0n)

    const tx = provider.connect(alice).claimCoupon()

    await expect(tx).revertedWith('already claimed')
  })

  it('david claims', async () => {
    const result = await provider.claimableCoupons(david)
    expect(result[0][0]).eq(1n)
    expect(result[0][1]).eq(2n)
    expect(result[1][0]).eq(1n)
    expect(result[1][1]).eq(1n)

    const tx = provider.connect(david).claimCoupon()

    await expect(tx)
      .emit(provider, 'CouponClaim')
      .withArgs(await david.getAddress(), [1n, 2n], [1n, 1n])
    let balance = await aCoupon.balanceOf(david, 1)
    expect(balance).eq(1n)
    balance = await aCoupon.balanceOf(david, 2)
    expect(balance).eq(1n)
  })
})
