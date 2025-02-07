import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("ERC20Permit", function () {
  async function deployFixture() {
    const [holder, spender, owner, other] = await hre.ethers.getSigners();

    const MyToken = await hre.ethers.getContractFactory("MyToken");
    const token = await MyToken.deploy();

    return { token, holder, spender, owner, other };
  }

  it("initial nonce is 0", async function () {
    const { token, holder } = await loadFixture(deployFixture);
    expect(await token.nonces(holder)).to.equal(0n);
  });

  it("accepts owner signature", async function () {
    const { token, holder, spender, owner, other } = await loadFixture(
      deployFixture
    );
    const value = 42n;
    const nonce = 0n;
    const maxDeadline = hre.ethers.MaxUint256;

    const {
      fields,
      name,
      version,
      chainId,
      verifyingContract,
      salt,
      extensions,
    } = await token.eip712Domain();

    if (extensions.length > 0) {
      throw Error("Extensions not implemented");
    }

    const domain = {
      name,
      version,
      chainId,
      verifyingContract,
    };

    console.log("domain: ", domain);

    const data = {
      domain,
      types: {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      message: {
        owner: holder.address,
        spender: spender.address,
        value: value,
        nonce: nonce,
        deadline: maxDeadline,
      },
    };

    const signature = await holder.signTypedData(
      data.domain,
      data.types,
      data.message
    );

    const { v, r, s } = hre.ethers.Signature.from(signature);

    await token.permit(holder, spender, value, maxDeadline, v, r, s);

    expect(await token.nonces(holder)).to.equal(1n);
    expect(await token.allowance(holder, spender)).to.equal(value);

    await expect(
      token.connect(spender).transferFrom(holder, spender, value)
    ).to.changeTokenBalances(token, [holder, spender], [-value, value]);

    console.log("\nSpender balance:", await token.balanceOf(spender));
  });
});
