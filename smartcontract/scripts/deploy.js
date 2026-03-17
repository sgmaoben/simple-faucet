const hre = require("hardhat");

async function main() {
  // ⚠️ 部署前请替换为你的 ERC20 代币地址
  const TOKEN_ADDRESS = "0xc70b8741b8b07a6d61e54fd4b20f22fa648e5565";

  if (TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.error("❌ 请先在脚本中设置你的 ERC20 代币地址！");
    console.error("   编辑 scripts/deploy.js 文件，修改 TOKEN_ADDRESS 变量");
    process.exit(1);
  }

  console.log("🚀 开始部署 Faucet 合约...");
  console.log("📍 代币地址:", TOKEN_ADDRESS);

  const Faucet = await hre.ethers.getContractFactory("Faucet");
  const faucet = await Faucet.deploy(TOKEN_ADDRESS);

  await faucet.waitForDeployment();

  const faucetAddress = await faucet.getAddress();
  
  console.log("✅ Faucet 合约已部署到:", faucetAddress);
  console.log("");
  console.log("📝 下一步操作:");
  console.log("   1. 向 Faucet 合约转入一些代币供用户领取");
  console.log("   2. 更新前端 docs/faucet.js 中的合约地址:");
  console.log(`      - token_address = '${TOKEN_ADDRESS}'`);
  console.log(`      - faucet_address = '${faucetAddress}'`);
  console.log("");
  console.log("🔍 验证合约 (可选):");
  console.log(`   npx hardhat verify --network <网络名> ${faucetAddress} "${TOKEN_ADDRESS}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
