// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import {ERC1155SupplyUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {IACoupon} from "./interfaces/IACoupon.sol";

contract ACoupon is ERC1155SupplyUpgradeable, OwnableUpgradeable, IACoupon {
    using Strings for uint256;

    string public name;
    string public symbol;

    mapping(address operator => bool) public isOperator;

    mapping(uint256 tokenId => uint256) public discounts;

    uint256 public constant DISCOUNT_DIVISOR = 10000;

    modifier onlyOwnerOrOperator() {
        require(_msgSender() == owner() || isOperator[_msgSender()], "Only owner or operator");
        _;
    }

    function initialize(
        string memory _name,
        string memory _symbol,
        string memory _uri,
        address _owner,
        uint256[] memory _discounts
    ) public initializer {
        __Ownable_init(_owner);

        name = _name;
        symbol = _symbol;
        _setURI(_uri);

        for (uint256 i = 0; i < _discounts.length; ) {
            discounts[i + 1] = _discounts[i];
            unchecked {
                ++i;
            }
        }
    }

    // Admin functions
    function setOperator(address _operator, bool _value) external onlyOwner {
        isOperator[_operator] = _value;
    }

    function setURI(string memory _uri) external onlyOwner {
        _setURI(_uri);
    }

    function setDiscount(uint256 id, uint256 value) external onlyOwner {
        discounts[id] = value;
    }

    function mint(address to, uint256 id, uint256 value, bytes memory data) external onlyOwnerOrOperator {
        _mint(to, id, value, data);
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) external onlyOwnerOrOperator {
        _mintBatch(to, ids, values, data);
    }

    function burn(address account, uint256 id, uint256 value) external onlyOwnerOrOperator {
        _burn(account, id, value);
    }

    function burnBatch(address account, uint256[] memory ids, uint256[] memory values) external onlyOwnerOrOperator {
        _burnBatch(account, ids, values);
    }

    function airdrop(address[] memory users, uint256 id, uint256 value) external onlyOwner {
        for (uint256 i = 0; i < users.length; ) {
            _mint(users[i], id, value, new bytes(0));
            unchecked {
                ++i;
            }
        }
    }

    function uri(uint256 id) public view override returns (string memory) {
        string memory baseUri = super.uri(id);
        return string.concat(baseUri, id.toString(), ".json");
    }
}
