import type { HardhatUserConfig } from 'hardhat/types'
import 'dotenv/config'
import '@nomicfoundation/hardhat-toolbox'
import '@openzeppelin/hardhat-upgrades'
import 'hardhat-contract-sizer'
import 'hardhat-tracer'
import fs from 'fs'
import path from 'path'

const SEPOLIA_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY!
const MAINNET_PRIVATE_KEY = process.env.MAINNET_PRIVATE_KEY!

const SEPOLIA_URL = process.env.SEPOLIA_URL
const MAINNET_URL = process.env.MAINNET_URL
const BSC_URL = process.env.BSC_URL
const BSC_TESTNET_URL = process.env.BSC_TESTNET_URL
const ETHER_SCAN_APIKEY = process.env.ETHER_SCAN_APIKEY

const SKIP_LOAD = process.env.SKIP_LOAD === 'true'

// Load hardhat tasks.
if (!SKIP_LOAD) {
  console.log('Loading scripts...')
  const tasksDir = path.join(__dirname, 'tasks')
  const tasksDirs = fs.readdirSync(tasksDir)
  tasksDirs.forEach((dirName) => {
    const tasksDirPath = path.join(tasksDir, dirName)
    const tasksFiles = fs.readdirSync(tasksDirPath)
    tasksFiles.forEach((fileName) => {
      const tasksFilePath = path.join(tasksDirPath, fileName)
      /* eslint-disable-next-line global-require */
      require(tasksFilePath)
    })
  })
}

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      accounts: {
        count: 125,
      },
    },
    sepolia: {
      url: SEPOLIA_URL !== undefined ? SEPOLIA_URL : '',
      accounts: SEPOLIA_PRIVATE_KEY !== undefined ? [SEPOLIA_PRIVATE_KEY] : [],
    },
    main: {
      url: MAINNET_URL !== undefined ? MAINNET_URL : '',
      accounts: MAINNET_PRIVATE_KEY !== undefined ? [MAINNET_PRIVATE_KEY] : [],
    },
    bsc: {
      url: BSC_URL !== undefined ? BSC_URL : '',
      accounts: MAINNET_PRIVATE_KEY !== undefined ? [MAINNET_PRIVATE_KEY] : [],
    },
    bscTestnet: {
      url: BSC_TESTNET_URL !== undefined ? BSC_TESTNET_URL : '',
      accounts: MAINNET_PRIVATE_KEY !== undefined ? [MAINNET_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/

    apiKey: ETHER_SCAN_APIKEY !== undefined ? ETHER_SCAN_APIKEY : '',
  },
  solidity: {
    compilers: [
      {
        version: '0.8.20',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      { version: '0.5.16', settings: {} },
    ],
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    coinmarketcap: process.env.COIN_MARKET_CAP_KEY,
  },
}

export default config
