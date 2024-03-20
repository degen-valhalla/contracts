import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { time } from '@nomicfoundation/hardhat-network-helpers'
import { MaxUint256, Signer, parseEther } from 'ethers'
import {
  ACoupon,
  ACoupon__factory,
  StakingPool,
  StakingPool__factory,
  TestToken,
  TestToken__factory,
} from '../typechain-types'

const VAI_COUPON_PER_SECOND = parseEther('4') / 1000n
const XVS_COUPON_PER_SECOND = parseEther('2') / 1000n
const VTOKEN_COUPON_PER_SECOND = parseEther('2') / 1000n

describe('Staking', () => {
  let admin: Signer
  let alice: Signer
  let david: Signer

  let aCoupon: ACoupon
  let stakingPool: StakingPool
  let vai: TestToken
  let xvs: TestToken
  let vToken: TestToken

  let startTimestamp: number

  const depositAmounts = [
    [parseEther('20000'), parseEther('30000'), parseEther('5000')],
    [parseEther('20000'), parseEther('20000'), parseEther('15000')],
  ]

  before(async () => {
    ;[admin, alice, david] = await ethers.getSigners()

    startTimestamp = Math.floor(new Date().getTime() / 1000) + 1000

    const params = ['aCoupon', 'aCoupon', 'https://aCoupon/', await admin.getAddress(), [5, 15]]
    aCoupon = (await upgrades.deployProxy(new ACoupon__factory(admin), params)) as unknown as ACoupon

    stakingPool = await new StakingPool__factory(admin).deploy(aCoupon, startTimestamp)

    await aCoupon.setOperator(stakingPool, true)

    vai = await new TestToken__factory(admin).deploy(parseEther('1000000'))
    xvs = await new TestToken__factory(admin).deploy(parseEther('1000000'))
    vToken = await new TestToken__factory(admin).deploy(parseEther('1000000'))

    await stakingPool.add(vai, VAI_COUPON_PER_SECOND, 1, true)
    await stakingPool.add(xvs, XVS_COUPON_PER_SECOND, 2, true)
    await stakingPool.add(vToken, VTOKEN_COUPON_PER_SECOND, 3, true)

    const tokens = [vai, xvs, vToken]
    for (const token of tokens) {
      await token.transfer(alice, parseEther('100000'))
      await token.transfer(david, parseEther('100000'))
    }
  })

  it('alice deposit vai', async () => {
    await vai.connect(alice).approve(stakingPool, MaxUint256)
    const amount = parseEther('10000')
    const tx = stakingPool.connect(alice).deposit(0, amount)

    await expect(tx)
      .emit(stakingPool, 'Deposit')
      .withArgs(await alice.getAddress(), 0, amount)

    await time.increase(500)

    const pending = await stakingPool['pendingCoupon(address)'](alice)
    expect(pending[0][2]).eq(0)
  })

  it('alice get reward', async () => {
    await time.increaseTo(startTimestamp + 1000)

    let pending = await stakingPool['pendingCoupon(address)'](alice)
    expect(pending[0][2]).eq(parseEther('4'))

    const tx = stakingPool.connect(alice).getReward(true)
    await expect(tx)
      .emit(stakingPool, 'GetCoupon')
      .withArgs(await alice.getAddress(), 1, 4)

    const balance = await aCoupon.balanceOf(alice, 1)
    expect(balance).eq(4)
  })

  it('alice withdraw', async () => {
    const amount = parseEther('10000')
    let tx = stakingPool.connect(alice).withdraw(0, amount + 1n)
    await expect(tx).revertedWith('withdraw: not good')

    tx = stakingPool.connect(alice).withdraw(0, amount)
    await expect(tx)
      .emit(stakingPool, 'Withdraw')
      .withArgs(await alice.getAddress(), 0, amount)
    await expect(tx).changeTokenBalance(vai, alice, amount)
    await expect(tx).changeTokenBalance(vai, stakingPool, -amount)

    tx = stakingPool.connect(alice).withdraw(0, 1n)
    await expect(tx).revertedWith('withdraw: not good')
  })

  it('users deposit', async () => {
    const users = [alice, david]
    const tokens = [vai, xvs, vToken]
    for (const user of users) {
      for (const token of tokens) {
        await token.connect(user).approve(stakingPool, MaxUint256)
      }
    }

    for (let i = 0; i < users.length; i++) {
      for (let j = 0; j < tokens.length; j++) {
        const tx = stakingPool.connect(users[i]).deposit(j, depositAmounts[i][j])
        await expect(tx)
          .emit(stakingPool, 'Deposit')
          .withArgs(await users[i].getAddress(), j, depositAmounts[i][j])
        await expect(tx).changeTokenBalance(tokens[j], users[i], -depositAmounts[i][j])
        await expect(tx).changeTokenBalance(tokens[j], stakingPool, depositAmounts[i][j])
      }
    }
  })

  it('users get coupon', async () => {
    const passedTime = 1000n * 10n
    await time.increase(passedTime + 20n)

    const poolRewards = [
      VAI_COUPON_PER_SECOND * passedTime,
      XVS_COUPON_PER_SECOND * passedTime,
      VTOKEN_COUPON_PER_SECOND * passedTime,
    ]
    const userRewards = [0, 1].map((userIndex) =>
      poolRewards.map(
        (reward, pid) =>
          (((reward * 10n ** 12n) / (depositAmounts[0][pid] + depositAmounts[1][pid])) *
            depositAmounts[userIndex][pid]) /
          10n ** 30n,
      ),
    )
    // console.log(userRewards)
    await stakingPool.connect(alice).getReward(true)
    let balance = await aCoupon.balanceOf(alice, 1)
    expect(balance).eq(4n + userRewards[0][0])
    balance = await aCoupon.balanceOf(alice, 2)
    expect(balance).eq(userRewards[0][1])
    balance = await aCoupon.balanceOf(alice, 3)
    expect(balance).eq(userRewards[0][2])

    await stakingPool.connect(david).getReward(true)
    balance = await aCoupon.balanceOf(david, 1)
    expect(balance).eq(userRewards[1][0])
    balance = await aCoupon.balanceOf(david, 2)
    expect(balance).eq(userRewards[1][1])
    balance = await aCoupon.balanceOf(david, 3)
    expect(balance).eq(userRewards[1][2])
  })

  it('users withdraw', async () => {
    const tokens = [vai, xvs, vToken]
    for (let pid = 0; pid < 3; pid++) {
      const { amount } = await stakingPool.userInfo(pid, alice)
      let tx = stakingPool.connect(alice).withdraw(pid, amount)
      await expect(tx).changeTokenBalance(tokens[pid], alice, amount)
      tx = stakingPool.connect(alice).withdraw(pid, 1n)
      await expect(tx).revertedWith('withdraw: not good')

      const { amount: amountForDavid } = await stakingPool.userInfo(pid, david)
      tx = stakingPool.connect(david).withdraw(pid, amountForDavid)
      await expect(tx).changeTokenBalance(tokens[pid], david, amountForDavid)
      tx = stakingPool.connect(david).withdraw(pid, 1n)
      await expect(tx).revertedWith('withdraw: not good')
    }
  })
})
