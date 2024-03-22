// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import {IXVSVault} from "../interfaces/IXVSVault.sol";

contract MockXVSVault is IXVSVault {
    mapping(address => uint256) public amount;
    mapping(address => uint256) public pendingWithdrawals;

    function setMockData(address user, uint256 _amount, uint256 _pendingWithdrawals) external {
        amount[user] = _amount;
        pendingWithdrawals[user] = _pendingWithdrawals;
    }

    function getUserInfo(address, uint256, address _user) external view returns (uint256, uint256, uint256) {
        return (amount[_user], 0, pendingWithdrawals[_user]);
    }
}
