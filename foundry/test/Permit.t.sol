// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {MyToken} from "../src/MyToken.sol";

contract CounterTest is Test {
    MyToken token;

    uint256 ownerKey = 0x01;
    uint256 spenderKey = 0x02;

    address owner = address(vm.addr(ownerKey));
    address spender = address(vm.addr(spenderKey));

    uint256 initBalance = 500 ether;

    function setUp() public {
        token = new MyToken(owner, initBalance);
    }

    function test_Permit() public {
        uint256 nonceBefore = token.nonces(owner);
        uint256 deadline = block.timestamp + 1 hours;
        uint256 allowance = 100 ether;

        uint256 balanceOwnerBefore = token.balanceOf(owner);
        uint256 balanceSpenderBefore = token.balanceOf(spender);

        assertEq(balanceOwnerBefore, initBalance);
        assertEq(balanceSpenderBefore, 0);

        // EIP712
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                owner,
                spender,
                allowance,
                nonceBefore,
                deadline
            )
        );

        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0x01, hash);

        token.permit(owner, spender, allowance, deadline, v, r, s);

        assertEq(token.allowance(owner, spender), allowance);

        vm.prank(spender);
        token.transferFrom(owner, spender, allowance);

        uint256 balanceOwnerAfter = token.balanceOf(owner);
        uint256 balanceSpenderAfter = token.balanceOf(spender);

        assertEq(balanceOwnerAfter, balanceOwnerBefore - allowance);
        assertEq(balanceSpenderAfter, allowance);
    }
}
