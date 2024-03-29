// SPDX-License-Identifier: MIT

pragma solidity 0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IUniswapV2Router01} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol";
import {IACoupon} from "./interfaces/IACoupon.sol";

contract CouponVault is Ownable, ReentrancyGuard {
    IERC20 public immutable TOKEN;
    IACoupon public immutable COUPON;

    IUniswapV2Router01 public immutable PANCAKE_V2_ROUTER;
    address public immutable WETH;

    address public treasury;
    uint256 public treasuryBPS = 100;

    uint256 public constant BPS_DIVISOR = 10000;
    uint256 private constant UNITS = 1 ether;

    error InvalidIdInfo();
    error InsufficientCoupon();
    error InsufficientInputAmount();

    event SwapAndLiquifyETH(uint256, uint256);

    constructor(
        IERC20 _token,
        IACoupon _coupon,
        IUniswapV2Router01 _pancakeV2Router,
        address initialOwner,
        address _treasury
    ) Ownable(initialOwner) {
        require(address(_token) != address(0), "invalid token address");
        require(address(_coupon) != address(0), "invalid coupon address");
        require(address(_treasury) != address(0), "invalid coupon address");
        TOKEN = _token;
        COUPON = _coupon;
        PANCAKE_V2_ROUTER = _pancakeV2Router;
        WETH = PANCAKE_V2_ROUTER.WETH();
        treasury = _treasury;

        // approve router
        TOKEN.approve(address(_pancakeV2Router), type(uint256).max);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(address(_treasury) != address(0), "invalid coupon address");
        treasury = _treasury;
    }

    function recover(address _token, uint256 _amount, address _to) external onlyOwner {
        IERC20(_token).transfer(_to, _amount);
    }

    function buyUsingCoupon(uint256[] memory ids, uint256[] memory values, address to) external payable nonReentrant {
        if (ids.length == 0 || ids.length != values.length) {
            revert InvalidIdInfo();
        }

        // calculate discounted amount
        address from = _msgSender();
        (uint256 tokensToProvide, , uint256 amountIn) = quote(from, ids, values);

        if (msg.value < amountIn) {
            revert InsufficientInputAmount();
        }
        uint256 originEthBalance = address(this).balance - msg.value;

        // transfer tokens to `to`
        TOKEN.transfer(to, tokensToProvide);

        // burn coupons
        COUPON.burnBatch(from, ids, values);

        // send ETH to treasury
        uint256 treasuryAmount = (amountIn * treasuryBPS) / BPS_DIVISOR;
        uint256 swapAmount = amountIn - treasuryAmount;
        if (treasuryAmount > 0) {
            (bool success, ) = treasury.call{value: treasuryAmount}(new bytes(0));
            require(success, "ETE");
        }

        // add liquidity
        swapAndLiquifyETH(swapAmount);
        uint256 currentEthBalance = address(this).balance;
        if (currentEthBalance > originEthBalance) {
            (bool success, ) = from.call{value: currentEthBalance - originEthBalance}(new bytes(0));
            require(success, "ETE");
        }
    }

    function quote(
        address from,
        uint256[] memory ids,
        uint256[] memory values
    ) public view returns (uint256, uint256, uint256) {
        if (ids.length == 0 || ids.length != values.length) {
            revert InvalidIdInfo();
        }

        // calculate discounted amount
        uint256 tokensToProvide;
        uint256 discountedAmounts;
        uint256 divisor = COUPON.DISCOUNT_DIVISOR();
        for (uint256 i = 0; i < ids.length; ) {
            uint256 id = ids[i];
            uint256 value = values[i];
            if (value == 0) {
                revert InvalidIdInfo();
            }
            if (COUPON.balanceOf(from, id) < value) {
                revert InsufficientCoupon();
            }

            tokensToProvide += UNITS * value;
            discountedAmounts += (UNITS * value * (divisor - COUPON.discounts(id))) / divisor;

            unchecked {
                ++i;
            }
        }

        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = address(TOKEN);
        uint256[] memory amountsIn = PANCAKE_V2_ROUTER.getAmountsIn(discountedAmounts, path);
        uint256 amountIn = amountsIn[0];

        return (tokensToProvide, discountedAmounts, amountIn);
    }

    function swapETHForTokens(uint256 ethAmount) private returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = WETH;
        path[1] = address(TOKEN);

        // make the swap
        uint256[] memory amounts = PANCAKE_V2_ROUTER.swapExactETHForTokens{value: ethAmount}(
            0, // accept any amount of ETH
            path,
            address(this),
            block.timestamp
        );

        return amounts[1];
    }

    function swapAndLiquifyETH(uint256 ethAmount) private {
        // split the eth balance into halves
        uint256 half = ethAmount / 2;
        uint256 anotherHalf = ethAmount - half;

        // swap ETH for tokens
        uint256 tokenAmount = swapETHForTokens(half);

        // add the liquidity
        PANCAKE_V2_ROUTER.addLiquidityETH{value: anotherHalf}(
            address(TOKEN),
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            treasury,
            block.timestamp
        );

        emit SwapAndLiquifyETH(anotherHalf, tokenAmount);
    }

    receive() external payable {}
}
