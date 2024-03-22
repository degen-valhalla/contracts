// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IACoupon} from "./interfaces/IACoupon.sol";
import {IXVSVault} from "./interfaces/IXVSVault.sol";

contract CouponProviderForXVS is OwnableUpgradeable {
    struct RewardCriteria {
        uint256 xvsAmount;
        uint256[] couponIds;
        uint256[] couponValues;
    }

    IACoupon public coupon;
    mapping(address => bool) public claimed;

    IXVSVault private xvsVault;
    address private xvs;
    uint256 private xvsVaultPid;

    RewardCriteria[] public rewardCriteria;

    event CouponClaim(address indexed user, uint256[] ids, uint256[] values);

    function initialize(
        address _owner,
        address _coupon,
        IXVSVault _xvsVault,
        address _xvs,
        uint256 _xvsVaultPid
    ) public initializer {
        require(_coupon != address(0), "zero address");
        __Ownable_init(_owner);
        coupon = IACoupon(_coupon);
        xvsVault = _xvsVault;
        xvs = _xvs;
        xvsVaultPid = _xvsVaultPid;
    }

    function criteriaLength() public view returns (uint256 length) {
        length = rewardCriteria.length;
    }

    // Admin functions
    function addCriteria(RewardCriteria memory criteria) external onlyOwner {
        _checkCriteria(criteria);
        uint256 length = criteriaLength();
        if (length > 0) {
            RewardCriteria memory lastCriteria = rewardCriteria[length - 1];
            require(lastCriteria.xvsAmount < criteria.xvsAmount, "small xvs amount");
        }
        rewardCriteria.push(criteria);
    }

    function updateCriteria(RewardCriteria memory criteria, uint256 index) external onlyOwner {
        uint256 length = criteriaLength();
        _checkCriteria(criteria);
        require(index < length, "invalid index");
        if (index > 0) {
            RewardCriteria memory previousCriteria = rewardCriteria[index - 1];
            require(previousCriteria.xvsAmount < criteria.xvsAmount, "small xvs amount");
        }
        if (index < length - 1) {
            RewardCriteria memory followingCriteria = rewardCriteria[index + 1];
            require(criteria.xvsAmount < followingCriteria.xvsAmount, "big xvs amount");
        }
        rewardCriteria[index] = criteria;
    }

    function _checkCriteria(RewardCriteria memory criteria) private pure {
        require(
            criteria.couponIds.length == criteria.couponValues.length && criteria.couponValues.length > 0,
            "invalid coupon info"
        );
        require(criteria.xvsAmount > 0, "zero xvs amount");
    }

    // User functions
    function claimCoupon() external {
        require(!claimed[msg.sender], "already claimed");
        (uint256[] memory ids, uint256[] memory values) = claimableCoupons(msg.sender);
        uint256 length = ids.length;
        require(length > 0, "not eligible to claim");

        for (uint256 i = 0; i < length; ) {
            uint256 id = ids[i];
            uint256 value = values[i];
            if (value > 0) {
                coupon.mint(msg.sender, id, value, new bytes(0));
                claimed[msg.sender] = true;
            }
            unchecked {
                ++i;
            }
        }

        emit CouponClaim(msg.sender, ids, values);
    }

    function claimableCoupons(address user) public view returns (uint256[] memory ids, uint256[] memory values) {
        uint256 length = criteriaLength();
        if (length == 0 || claimed[user]) {
            return (ids, values);
        }
        (uint256 amount, , uint256 pendingWithdrawals) = xvsVault.getUserInfo(xvs, xvsVaultPid, user);
        for (uint256 i = length; i >= 1; ) {
            if (rewardCriteria[i - 1].xvsAmount <= amount - pendingWithdrawals) {
                return (rewardCriteria[i - 1].couponIds, rewardCriteria[i - 1].couponValues);
            }
            unchecked {
                --i;
            }
        }

        return (ids, values);
    }

    function getCriteria(uint256 index) external view returns (uint256, uint256[] memory, uint256[] memory) {
        RewardCriteria memory criteria = rewardCriteria[index];
        return (criteria.xvsAmount, criteria.couponIds, criteria.couponValues);
    }

    function getVaultInfo() external view returns (address, address, uint256) {
        return (address(xvsVault), xvs, xvsVaultPid);
    }
}
