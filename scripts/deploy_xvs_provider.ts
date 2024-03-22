import { ethers, upgrades } from 'hardhat'
import { parseEther } from 'ethers'
import { CouponProviderForXVS__factory, CouponProviderForXVS, ACoupon__factory } from '../typechain-types'

const couponAddr = '0x7d31688Dc47322A684BaBF3FdA9FBa7c3B6644E9'
const xvsAddr = '0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63'
const vaultAddr = '0x051100480289e704d20e9DB4804837068f3f9204'

const main = async () => {
  const [admin] = await ethers.getSigners()

  const params = [await admin.getAddress(), couponAddr, vaultAddr, xvsAddr, 0]
  const provider = (await upgrades.deployProxy(
    new CouponProviderForXVS__factory(admin),
    params,
  )) as unknown as CouponProviderForXVS
  await provider.waitForDeployment()

  await provider.addCriteria({ xvsAmount: parseEther('500'), couponIds: [1], couponValues: [1] })
  await provider.addCriteria({ xvsAmount: parseEther('1000'), couponIds: [2], couponValues: [1] })
  await provider.addCriteria({ xvsAmount: parseEther('5000'), couponIds: [1, 2], couponValues: [1, 1] })

  await ACoupon__factory.connect(couponAddr, admin).setOperator(provider.target, true)

  console.log('Provider:', provider.target)

  process.exit()
}

main()
