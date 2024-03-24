// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {BEP429} from "./BEP429.sol";
import {IACoupon} from "./interfaces/IACoupon.sol";

contract Valhalla is BEP429, Ownable {
    using Strings for uint256;

    string private _baseTokenURI;
    string private _sbtBaseTokenURI;

    address public coupon;
    uint256 public couponId;
    uint256 public couponValue;

    constructor(
        uint256 amount_,
        string memory name_,
        string memory symbol_
    ) BEP429(name_, symbol_) Ownable(_msgSender()) {
        _mint(msg.sender, amount_);
    }

    /**
     * @dev Update _baseTokenURI
     */
    function setBaseTokenURI(string calldata uri) external onlyOwner {
        _baseTokenURI = uri;
    }

    function setSbtBaseTokenURI(string calldata uri) external onlyOwner {
        _sbtBaseTokenURI = uri;
    }

    function setCoupon(address _coupon, uint256 _couponId, uint256 _couponValue) external onlyOwner {
        coupon = _coupon;
        couponId = _couponId;
        couponValue = _couponValue;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId);
        bool isValidForTokenId = _isValidTokenId(tokenId);
        string memory base = isValidForTokenId ? _baseTokenURI : _sbtBaseTokenURI;
        tokenId = isValidForTokenId ? tokenId & (ID_ENCODING_PREFIX - 1) : tokenId % 200;
        return bytes(base).length > 0 ? string.concat(base, tokenId.toString(), ".json") : "";
    }

    function _afterBurnNft(address from, uint256) internal override {
        if (coupon != address(0)) {
            IACoupon(coupon).mint(from, couponId, couponValue, new bytes(0));
        }
    }
}
