import { ethers, upgrades } from 'hardhat'
import { parseEther, MaxUint256 } from 'ethers'
import {
  Valhalla__factory,
  Valhalla,
  ACoupon__factory,
  ACoupon,
  CouponVault__factory,
  CouponVault,
  IUniswapV2Router02,
  IUniswapV2Pair,
  IUniswapV2Pair__factory,
  IWETH9,
} from '../../typechain-types'
import { UniswapV2Deployer } from './UniswapV2Deployer'

const TOTAL_SUPPLY = parseEther((10000).toString())

export interface MainFixture {
  valhalla: Valhalla
  coupon: ACoupon
  couponVault: CouponVault
  router: IUniswapV2Router02
  weth9: IWETH9
  pair: IUniswapV2Pair
}

export async function deployValhallaFixture(): Promise<MainFixture> {
  // deploy uniswap
  const [admin, treasury] = await ethers.getSigners()
  const { router, weth9, factory } = await UniswapV2Deployer.deploy(admin)

  const valhalla = await new Valhalla__factory(admin).deploy(TOTAL_SUPPLY, 'Valhalla', 'ALA')

  const coupon = (await upgrades.deployProxy(new ACoupon__factory(admin), {
    initializer: false,
  })) as unknown as ACoupon
  await coupon.initialize('aCoupon', 'aCoupon', 'aCoupon', admin, [500, 1000])

  const couponVault = await new CouponVault__factory(admin).deploy(
    valhalla,
    coupon,
    router,
    await admin.getAddress(),
    treasury,
  )

  // admin setting
  await coupon.setOperator(couponVault, true)
  await valhalla.transfer(couponVault, (TOTAL_SUPPLY * 3n) / 10n)

  // add 7000 ALA and 100 BNB on pancakeswap
  await valhalla.approve(await router.getAddress(), MaxUint256)
  await router.addLiquidityETH(await valhalla.getAddress(), parseEther('7000'), 0, 0, admin, MaxUint256, {
    value: parseEther('100'),
  })

  const pair = IUniswapV2Pair__factory.connect(await factory.getPair(valhalla, weth9), admin)

  return {
    valhalla,
    coupon,
    couponVault,
    router,
    weth9,
    pair,
  }
}
