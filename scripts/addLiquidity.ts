import { ethers, network } from 'hardhat'
import { parseEther, MaxUint256 } from 'ethers'
import { IUniswapV2Router01__factory, Valhalla__factory } from '../typechain-types'

const routerAddr = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
const TOTAL_SUPPLY = parseEther((10_000).toString())
const INITIAL_LIQUIDITY = (TOTAL_SUPPLY * 7n) / 10n
const ethAmount = parseEther('3')

const main = async () => {
  const tokenAddr = network.name === 'sepolia' ? process.env.SEPOLIA_TOKEN_ADDR : process.env.MAINNET_TOKEN_ADDR
  const [admin] = await ethers.getSigners()
  const memToken = Valhalla__factory.connect(tokenAddr, admin)
  const tokenSymbol = await memToken.symbol()
  console.log('Token symbol:', tokenSymbol)
  await new Promise((res) => {
    setTimeout(res, 2000)
  })

  const approveTx = await memToken.approve(routerAddr, MaxUint256)
  await approveTx.wait()
  console.log('Approve tx', approveTx.hash)
  await new Promise((res) => setTimeout(res, 4000))

  const router = IUniswapV2Router01__factory.connect(routerAddr, admin)
  const tx = await router.addLiquidityETH(
    tokenAddr,
    INITIAL_LIQUIDITY,
    0n,
    0n,
    admin,
    Math.floor(new Date().getTime() / 1000 + 60),
    {
      value: ethAmount,
    },
  )

  await tx.wait()
  console.log('Liquidity added', tx.hash)
  process.exit()
}

main()
