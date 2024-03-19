//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBEP429 {
    error NotFound();
    error InvalidTokenId();
    error AlreadyExists();
    error InvalidRecipient(address recipient);
    error InvalidSender(address sender);
    error InvalidSpender(address spender);
    error InvalidOperator();
    error UnsafeRecipient();
    error Unauthorized(address sender);
    error InsufficientAllowance(address spender, uint256 allowance, uint256 needed);
    error DecimalsTooLow();
    error OwnedIndexOverflow();
    error MintLimitReached();
    error InvalidApprover(address approver);
    error InsufficientBalance(address sender, uint256 balance, uint256 needed);

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function decimals() external view returns (uint8);

    function totalSupply() external view returns (uint256);

    function erc20TotalSupply() external view returns (uint256);

    function erc721TotalSupply() external view returns (uint256);

    function balanceOf(address owner_) external view returns (uint256);

    function erc721BalanceOf(address owner_) external view returns (uint256);

    function erc20BalanceOf(address owner_) external view returns (uint256);

    function isApprovedForAll(address owner_, address operator_) external view returns (bool);

    function allowance(address owner_, address spender_) external view returns (uint256);

    function owned(address owner_) external view returns (uint256[] memory);

    function ownerOf(uint256 id_) external view returns (address erc721Owner);

    function tokenURI(uint256 id_) external view returns (string memory);

    function approve(address spender_, uint256 valueOrId_) external returns (bool);

    function erc721Approve(address spender_, uint256 id_) external;

    function setApprovalForAll(address operator_, bool approved_) external;

    function transferFrom(address from_, address to_, uint256 valueOrId_) external returns (bool);

    function erc721TransferFrom(address from_, address to_, uint256 id_) external;

    function transfer(address to_, uint256 amount_) external returns (bool);

    function getERC721QueueLength() external view returns (uint256);

    function getERC721TokensInQueue(uint256 start_, uint256 count_) external view returns (uint256[] memory);

    function safeTransferFrom(address from_, address to_, uint256 id_) external;

    function safeTransferFrom(address from_, address to_, uint256 id_, bytes calldata data_) external;

    function powerOf(address owner) external view returns (uint256);

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
}
