import { ethers, upgrades } from 'hardhat'
import { CouponProviderForXVS__factory } from '../typechain-types'

const xvsProvider = '0x79f7F107253B733242050d0195E99D0F0e6F632c'

const main = async () => {
  const [admin] = await ethers.getSigners()

  const tx = await upgrades.upgradeProxy(xvsProvider, new CouponProviderForXVS__factory(admin))
  await tx.waitForDeployment()

  process.exit()
}

main()
