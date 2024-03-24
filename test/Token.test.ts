import { ethers, upgrades } from 'hardhat'
import { expect } from 'chai'
import { Signer, parseEther, ZeroAddress, hexlify } from 'ethers'
import { Valhalla__factory, Valhalla, ACoupon__factory, ACoupon } from '../typechain-types'

const ONE_ETH = parseEther('1')
const ID_ENCODING_PREFIX = 2n ** 254n
const SBT_ID_ENCODING_PREFIX = 2n ** 255n
const TOTAL_SUPPLY = parseEther((100).toString())

describe('Valhalla', () => {
  let admin: Signer
  let alice: Signer
  let david: Signer

  let valhalla: Valhalla
  let coupon: ACoupon

  before(async () => {
    ;[admin, alice, david] = await ethers.getSigners()

    valhalla = await new Valhalla__factory(admin).deploy(TOTAL_SUPPLY, 'Valhalla', 'ALA')
    await valhalla.setBaseTokenURI('https://valhalla.com/nft/')
    await valhalla.setSbtBaseTokenURI('https://valhalla.com/sbt/')

    coupon = (await upgrades.deployProxy(new ACoupon__factory(admin), [
      'Valhalla Coupon',
      'vCoupon',
      'https://valhalla.com/coupon/',
      await admin.getAddress(),
      [500, 1000],
    ])) as unknown as ACoupon

    await coupon.setOperator(valhalla, true)
    await valhalla.setCoupon(coupon, 1, 1)
  })

  it('send to alice', async () => {
    const amount = parseEther('55.5')
    const tx = valhalla.transfer(alice, amount)

    await expect(tx).to.be.changeTokenBalance(valhalla, admin, -amount)
    await expect(tx).to.be.changeTokenBalance(valhalla, alice, amount)
    await expect(tx)
      .to.be.emit(valhalla, 'Transfer')
      .withArgs(await admin.getAddress(), await alice.getAddress(), amount)
  })

  it('alice convert to nft', async () => {
    const num = 25n
    const tx = valhalla.connect(alice).convertToNFT(alice, num)

    await expect(tx).to.be.changeTokenBalance(valhalla, alice, -ONE_ETH * num)
    await expect(tx).to.be.changeTokenBalance(valhalla, valhalla.target, ONE_ETH * num)
  })

  it('alice cannot convert to more nfts than balance', async () => {
    const num = 31n
    const tx = valhalla.connect(alice).convertToNFT(alice, num)

    await expect(tx).to.be.reverted
  })

  it('alice convert to erc20', async () => {
    const num = 10n
    const tx = valhalla.connect(alice).convertFromNFT(num)

    await expect(tx).to.be.changeTokenBalance(valhalla, alice, num * ONE_ETH)
    await expect(tx).to.be.changeTokenBalance(valhalla, valhalla.target, -num * ONE_ETH)

    const nftBalance = await valhalla.erc721BalanceOf(alice)
    expect(nftBalance).to.be.equal(15)
  })

  it('alice transfer nft to david', async () => {
    let nftBalance = await valhalla.erc721BalanceOf(alice)
    const ids = await valhalla.owned(alice, 0, nftBalance)
    for (const id of ids) {
      const tx = valhalla.connect(alice).transferFrom(alice, david, id)
      await expect(tx).changeTokenBalance(valhalla, alice, 0)
      await expect(tx).changeTokenBalance(valhalla, david, 0)
      await expect(tx).changeTokenBalance(valhalla, valhalla, 0)
      await expect(tx)
        .emit(valhalla, 'Transfer')
        .withArgs(await alice.getAddress(), await david.getAddress(), id)
    }

    nftBalance = await valhalla.erc721BalanceOf(alice)
    const nftBalanceOfDavid = await valhalla.erc721BalanceOf(david)
    const balanceOfDavid = await valhalla.balanceOf(david)
    expect(nftBalance).to.be.equal(0)
    expect(nftBalanceOfDavid).to.be.equal(15)
    expect(balanceOfDavid).to.be.equal(0)
  })

  it('david convert to nft', async () => {
    const num = 5n
    const tx = valhalla.connect(david).convertFromNFT(num)

    await expect(tx).changeTokenBalance(valhalla, david, num * ONE_ETH)
    await expect(tx).changeTokenBalance(valhalla, valhalla.target, -num * ONE_ETH)

    await valhalla.connect(david).transfer(alice, num * ONE_ETH)
  })

  it('david approve alice for his nft', async () => {
    const nftBalance = await valhalla.erc721BalanceOf(david)
    const ids = await valhalla.owned(david, 0, nftBalance)

    const tx0 = valhalla.connect(alice).transferFrom(david, alice, ids[0])
    await expect(tx0).reverted

    await valhalla.connect(david).approve(alice, ids[0])

    const tx1 = valhalla.connect(alice).transferFrom(david, alice, ids[0])
    await expect(tx1)
      .emit(valhalla, 'Transfer')
      .withArgs(await david.getAddress(), await alice.getAddress(), ids[0])

    const tx2 = valhalla.connect(alice).transferFrom(david, alice, ids[1])
    await expect(tx2).reverted

    await valhalla.connect(david).setApprovalForAll(alice, true)
    await valhalla.connect(alice).transferFrom(david, alice, ids[1])
  })

  it('every user converts to as many nfts as possible', async () => {
    const users = [admin, alice, david]
    for (const user of users) {
      const balance = await valhalla.balanceOf(user)
      const maxNft = balance / ONE_ETH
      if (maxNft > 0n) {
        await valhalla.connect(user).convertToNFT(user, maxNft)
      }
    }

    let totalErc20 = 0n
    let totalErc721 = 0n
    for (const user of users) {
      totalErc20 += await valhalla.balanceOf(user)
      totalErc721 += await valhalla.erc721BalanceOf(user)
    }

    const totalSupply = await valhalla.totalSupply()
    const erc20TotalSupply = await valhalla.erc20TotalSupply()
    const erc721TotalSupply = await valhalla.erc721TotalSupply()

    expect(totalSupply).equal(TOTAL_SUPPLY)
    expect(totalErc20).equal(erc20TotalSupply)
    expect(totalErc721).equal(erc721TotalSupply)
    expect(totalErc721).gte(97)
    expect(totalSupply).equal(totalErc20 + totalErc721 * ONE_ETH)
  })

  it('every user convert from as many nfts as possible', async () => {
    const users = [admin, alice, david]
    for (const user of users) {
      const nftBalance = await valhalla.erc721BalanceOf(user)
      const ids = await valhalla.owned(user, 0, nftBalance)
      if (ids.length > 0n) {
        await valhalla.connect(user).convertFromNFT(ids.length)
      }
    }

    let totalErc20 = 0n
    let totalErc721 = 0n
    for (const user of users) {
      totalErc20 += await valhalla.balanceOf(user)
      totalErc721 += await valhalla.erc721BalanceOf(user)
    }

    const totalSupply = await valhalla.totalSupply()
    const erc20TotalSupply = await valhalla.erc20TotalSupply()
    const erc721TotalSupply = await valhalla.erc721TotalSupply()

    expect(totalSupply).equal(TOTAL_SUPPLY)
    expect(totalErc20).equal(erc20TotalSupply).equal(TOTAL_SUPPLY)
    expect(totalErc721).equal(erc721TotalSupply).equal(0)
  })

  it('alice convert to nft', async () => {
    const num = 10n
    await valhalla.connect(alice).convertToNFT(alice, num)

    const totalSupply = await valhalla.totalSupply()
    const erc20TotalSupply = await valhalla.erc20TotalSupply()
    const erc721TotalSupply = await valhalla.erc721TotalSupply()

    expect(totalSupply).equal(TOTAL_SUPPLY)
    expect(erc20TotalSupply).equal(TOTAL_SUPPLY - num * ONE_ETH)
    expect(erc721TotalSupply).equal(num)

    const nftBalance = await valhalla.erc721BalanceOf(alice)
    const ids = await valhalla.owned(alice, 0, nftBalance)
    const max = ids.reduce((_max, curr) => (_max > curr ? _max : curr), 0n)
    expect(max - ID_ENCODING_PREFIX).lte(TOTAL_SUPPLY / ONE_ETH)
  })

  it('alice burn nft to get SBT and coupon', async () => {
    const nftBalance = await valhalla.erc721BalanceOf(alice)
    const ids = await valhalla.owned(alice, 0, nftBalance)
    let tokenUri = await valhalla.tokenURI(ids[0])
    console.log('Token uri:', tokenUri)
    tokenUri = await valhalla.tokenURI(ids[1])
    console.log('Token uri:', tokenUri)
    tokenUri = await valhalla.tokenURI(ids[2])
    console.log('Token uri:', tokenUri)

    const sbtTokenId = SBT_ID_ENCODING_PREFIX + BigInt(hexlify(await alice.getAddress()))

    const tx = valhalla.connect(alice).burnNFT(ids[0])

    await expect(tx).changeTokenBalance(valhalla, valhalla, -ONE_ETH)
    await expect(tx)
      .emit(valhalla, 'Transfer')
      .withArgs(await alice.getAddress(), ZeroAddress, ids[0]) // NFT transfer to zero
    await expect(tx).emit(valhalla, 'Transfer').withArgs(valhalla.target, ZeroAddress, ONE_ETH) // ERC20 transfer to zero
    await expect(tx)
      .emit(valhalla, 'Transfer')
      .withArgs(ZeroAddress, await alice.getAddress(), sbtTokenId)

    const owner = await valhalla.ownerOf(sbtTokenId)
    expect(owner).eq(await alice.getAddress())

    const valhallaTotalSupply = await valhalla.totalSupply()
    const sbtPower = await valhalla.powerOf(alice)
    const couponBalance = await coupon.balanceOf(alice, 1)
    const sbtTokenUri = await valhalla.tokenURI(sbtTokenId)
    console.log(sbtTokenUri)

    expect(valhallaTotalSupply).eq(TOTAL_SUPPLY - ONE_ETH)
    expect(sbtPower).eq(1)
    expect(couponBalance).eq(1)
  })

  it('alice burn another nft to get more power', async () => {
    const nftBalance = await valhalla.erc721BalanceOf(alice)
    const ids = await valhalla.owned(alice, 0, nftBalance)

    const tx = valhalla.connect(alice).burnNFT(ids[0])

    await expect(tx).changeTokenBalance(valhalla, valhalla, -ONE_ETH)
    await expect(tx)
      .emit(valhalla, 'Transfer')
      .withArgs(await alice.getAddress(), ZeroAddress, ids[0]) // NFT transfer to zero
    await expect(tx).emit(valhalla, 'Transfer').withArgs(valhalla.target, ZeroAddress, ONE_ETH) // ERC20 transfer to zero

    const valhallaTotalSupply = await valhalla.totalSupply()
    const sbtPower = await valhalla.powerOf(alice)
    const couponBalance = await coupon.balanceOf(alice, 1)

    expect(valhallaTotalSupply).eq(TOTAL_SUPPLY - ONE_ETH * 2n)
    expect(sbtPower).eq(2)
    expect(couponBalance).eq(2)
  })
})
