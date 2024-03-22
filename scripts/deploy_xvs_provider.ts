import { ethers, upgrades } from 'hardhat'
import { parseEther } from 'ethers'
import {
  CouponProviderForXVS__factory,
  CouponProviderForXVS,
  MockXVSVault__factory,
  ACoupon__factory,
} from '../typechain-types'

const couponAddr = '0x8Ea9F030bfa6Ec8bC3cA97B4c9F74f96a4A34Be2'
const xvsAddr = '0x8Ea9F030bfa6Ec8bC3cA97B4c9F74f96a4A34Be2'

const main = async () => {
  const [admin] = await ethers.getSigners()

  const xvsVault = await new MockXVSVault__factory(admin).deploy()
  console.log('MockVault:', xvsVault.target)

  const params = [await admin.getAddress(), couponAddr, xvsVault.target, xvsAddr, 0]
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
