import { ethers } from 'hardhat'
import { CouponVault__factory } from '../typechain-types'

const valhalla = '0x3AecB31a5243d4A7Ba5ed58B911f05db3DA0Fb4A'
const coupon = '0x8Ea9F030bfa6Ec8bC3cA97B4c9F74f96a4A34Be2'
const router = '0xD99D1c33F9fC3444f8101754aBC46c52416550D1'
const treasury = '0xf1465270a013a882BD6645d0a2b42eC26dD5241D'

const main = async () => {
  const [admin] = await ethers.getSigners()

  const params: [string, string, string, string, string] = [
    valhalla,
    coupon,
    router,
    await admin.getAddress(),
    treasury,
  ]

  const couponVault = await new CouponVault__factory(admin).deploy(...params)
  console.log('Vault:', couponVault.target, ...params)

  process.exit()
}

main()
