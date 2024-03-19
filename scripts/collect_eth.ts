import { ethers } from 'hardhat'
import { Wallet, formatEther, parseUnits } from 'ethers'

const keys = []
const send = true

const main = async () => {
  const [admin] = await ethers.getSigners()

  for (const key of keys) {
    const wallet = new Wallet(key, ethers.provider)
    const address = await wallet.getAddress()
    const balance = await ethers.provider.getBalance(address)
    console.log(address, formatEther(balance))
    if (send && balance > 0) {
      const tx = await wallet.sendTransaction({
        to: admin,
        value: (balance * 9n) / 10n,
        gasPrice: parseUnits('5.5', 9),
      })
      console.log(tx.hash)
    }
  }

  process.exit()
}

main()
