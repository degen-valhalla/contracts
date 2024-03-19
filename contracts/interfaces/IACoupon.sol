//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface IACoupon is IERC1155 {
    function discounts(uint256 id) external view returns (uint256);

    function mint(address to, uint256 id, uint256 value, bytes memory data) external;

    function mintBatch(address to, uint256[] memory ids, uint256[] memory values, bytes memory data) external;

    function burn(address account, uint256 id, uint256 value) external;

    function burnBatch(address account, uint256[] memory ids, uint256[] memory values) external;

    // solhint-disable-next-line func-name-mixedcase
    function DISCOUNT_DIVISOR() external view returns (uint256);
}
