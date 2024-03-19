import { ethers } from 'hardhat'
import { Valhalla__factory, ACoupon__factory } from '../typechain-types'

const valhallaAddr = '0x3AecB31a5243d4A7Ba5ed58B911f05db3DA0Fb4A'
const couponAddr = '0x8Ea9F030bfa6Ec8bC3cA97B4c9F74f96a4A34Be2'
const couponVaultAddr = '0x2B2a3d7F67776DCb09b17c417E567a57A76aDAD1'
const stakingPoolAddr = '0x'

const main = async () => {
  const [admin] = await ethers.getSigners()

  const valhalla = Valhalla__factory.connect(valhallaAddr, admin)

  const coupon = ACoupon__factory.connect(couponAddr, admin)

  await valhalla.setCoupon(coupon, 1, 1)
  await coupon.setOperator(valhalla, true)
  await coupon.setOperator(couponVaultAddr, true)
  await coupon.setOperator(stakingPoolAddr, true)

  process.exit()
}

main()
