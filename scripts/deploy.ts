import { ethers } from 'hardhat'
import { parseEther } from 'ethers'
import { Valhalla__factory, StakingPool__factory } from '../typechain-types'

const TOTAL_SUPPLY = parseEther((10_000).toString())
const name = 'Valhalla'
const symbol = 'ALA'
const coupon = ''
const rewardPerSecond = 0
const startTimestamp = 0 // reward mining start timestamp

const main = async () => {
  const [admin] = await ethers.getSigners()

  const valhalla = await new Valhalla__factory(admin).deploy(TOTAL_SUPPLY, name, symbol)
  console.log('Valhalla:', valhalla.target, TOTAL_SUPPLY, name, symbol)

  const stakingPool = await new StakingPool__factory(admin).deploy(coupon, rewardPerSecond, startTimestamp)
  console.log('StakingPool:', stakingPool.target, coupon, rewardPerSecond, startTimestamp)

  process.exit()
}

main()
