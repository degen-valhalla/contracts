import { ethers } from 'hardhat'
import { ACoupon__factory } from '../typechain-types'

const couponAddr = '0x54b1d8E9348AEc707066686FB06809e68C1250CA'
const users = ['0x4226B0dd69Dd01B4407D44112796F7929dD4B308']

const main = async () => {
  const smartContractAddrs = []
  for (const user of users) {
    const code = await ethers.provider.getCode(user)
    if (code !== '0x') {
      smartContractAddrs.push(user)
    }
  }
  if (smartContractAddrs.length > 0) {
    console.log('Cannot airdrop to smart contract')
    console.log(smartContractAddrs)
    process.exit()
  }

  const [admin] = await ethers.getSigners()

  const aCoupon = ACoupon__factory.connect(couponAddr, admin)

  const tx = await aCoupon.airdrop(users, 1, 3)
  console.log(tx.hash)

  process.exit()
}

main()
