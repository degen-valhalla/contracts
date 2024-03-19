import { ethers, upgrades } from 'hardhat'
import { ACoupon__factory, ACoupon } from '../typechain-types'

// name, symbol, uri, owner, discounts(5%, 10%)
const initializerArgs = ['aCoupon', 'aCoupon', 'https://', '0x4226B0dd69Dd01B4407D44112796F7929dD4B308', [500, 1000]]

const main = async () => {
  const [admin] = await ethers.getSigners()

  const aCoupon = (await upgrades.deployProxy(new ACoupon__factory(admin), initializerArgs)) as unknown as ACoupon
  await aCoupon.waitForDeployment()

  console.log('Coupon:', aCoupon.target)

  process.exit()
}

main()
