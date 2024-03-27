// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IACoupon} from "./interfaces/IACoupon.sol";

contract StakingPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt.
        uint256 rewardEarned; // Reward Earned.
    }

    // Info of each pool.
    struct PoolInfo {
        IERC20 lpToken; // Address of LP token contract.
        uint256 rewardRate; // Coupon tokens per second.
        uint256 tokenId; // Coupon token id rewarded in this pool.
        uint256 lastRewardTimestamp; // Last block timestamp that reward distribution occurs.
        uint256 accRewardPerShare; // Accumulated reward per share, times 1e12.
    }

    // The Coupon TOKEN!
    address public coupon;

    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    // The block timestamp when Coupon reward starts.
    uint256 public startTimestamp;

    uint256 public constant UNITS = 1 ether;

    error PoolAlreadyAdded();

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event GetCoupon(address indexed user, uint256 couponId, uint256 indexed numOfCoupon);

    constructor(address _coupon, uint256 _startTimestamp) Ownable(msg.sender) {
        coupon = _coupon;
        startTimestamp = _startTimestamp;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    function add(IERC20 _lpToken, uint256 _rewardRate, uint256 _tokenId, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        // Duplication check
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ) {
            IERC20 poolToken = poolInfo[pid].lpToken;
            if (address(poolToken) == address(_lpToken)) {
                revert PoolAlreadyAdded();
            }
            unchecked {
                ++pid;
            }
        }

        uint256 lastRewardTimestamp = block.timestamp > startTimestamp ? block.timestamp : startTimestamp;
        poolInfo.push(
            PoolInfo({
                lpToken: _lpToken,
                rewardRate: _rewardRate,
                tokenId: _tokenId,
                lastRewardTimestamp: lastRewardTimestamp,
                accRewardPerShare: 0
            })
        );
    }

    // Update the given pool's reward rate. Can only be called by the owner.
    function set(uint256 _pid, uint256 _rewardRate, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        poolInfo[_pid].rewardRate = _rewardRate;
    }

    // Update coupon. Can only be called by the owner.
    function setCoupon(address _coupon) public onlyOwner {
        coupon = _coupon;
    }

    // View function to see pending Rewards on frontend.
    function pendingCoupon(uint256 _pid, address _user) public view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accRewardPerShare = pool.accRewardPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (block.timestamp > pool.lastRewardTimestamp && lpSupply != 0) {
            uint256 multiplier = block.timestamp - pool.lastRewardTimestamp;
            uint256 couponReward = multiplier * pool.rewardRate;
            accRewardPerShare = accRewardPerShare + (couponReward * 1e12) / lpSupply;
        }
        return (user.amount * accRewardPerShare) / 1e12 - user.rewardDebt + user.rewardEarned;
    }

    struct RewardData {
        uint256 pid;
        uint256 couponId;
        uint256 amount;
    }

    function pendingCoupon(address _user) external view returns (RewardData[] memory pendingRewards) {
        pendingRewards = new RewardData[](poolInfo.length);
        for (uint256 pid = 0; pid < poolInfo.length; ) {
            PoolInfo memory pool = poolInfo[pid];
            uint256 amount = pendingCoupon(pid, _user);
            pendingRewards[pid].pid = pid;
            pendingRewards[pid].couponId = pool.tokenId;
            pendingRewards[pid].amount = amount;
            unchecked {
                ++pid;
            }
        }
    }

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ) {
            updatePool(pid);
            unchecked {
                ++pid;
            }
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.timestamp <= pool.lastRewardTimestamp) {
            return;
        }
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            pool.lastRewardTimestamp = block.timestamp;
            return;
        }
        uint256 multiplier = block.timestamp - pool.lastRewardTimestamp;
        uint256 couponReward = multiplier * pool.rewardRate;
        pool.accRewardPerShare = pool.accRewardPerShare + (couponReward * 1e12) / lpSupply;
        pool.lastRewardTimestamp = block.timestamp;
    }

    // Deposit LP tokens for Coupon allocation.
    function deposit(uint256 _pid, uint256 _amount) public nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
            if (pending > 0) {
                user.rewardEarned += pending;
            }
        }
        if (_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount + _amount;
        }
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;
        emit Deposit(msg.sender, _pid, _amount);
    }

    // Withdraw LP tokens.
    function withdraw(uint256 _pid, uint256 _amount) public nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");

        updatePool(_pid);
        uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
        if (pending > 0) {
            user.rewardEarned += pending;
        }
        if (_amount > 0) {
            user.amount = user.amount - _amount;
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
        }
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Get reward.
    function getReward(bool _withUpdate) public nonReentrant {
        if (_withUpdate) {
            massUpdatePools();
        }
        for (uint256 pid = 0; pid < poolInfo.length; ) {
            PoolInfo storage pool = poolInfo[pid];
            UserInfo storage user = userInfo[pid][msg.sender];
            uint256 currentReward = user.rewardEarned;
            uint256 pending = (user.amount * pool.accRewardPerShare) / 1e12 - user.rewardDebt;
            if (pending > 0) {
                currentReward += pending;
            }
            uint256 numOfCoupon = currentReward / UNITS;
            if (numOfCoupon > 0) {
                IACoupon(coupon).mint(msg.sender, pool.tokenId, numOfCoupon, new bytes(0));
                emit GetCoupon(msg.sender, pool.tokenId, numOfCoupon);
                currentReward = currentReward - numOfCoupon * UNITS;
            }
            user.rewardEarned = currentReward;
            user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e12;
            unchecked {
                ++pid;
            }
        }
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public nonReentrant {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        pool.lpToken.safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, _pid, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }
}
