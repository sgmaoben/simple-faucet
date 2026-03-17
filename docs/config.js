window.APP_CONFIG = {
  chainId: "0x61",
  chainName: "BSC Testnet",
  rpcUrls: ["https://bsc-testnet-dataseed.bnbchain.org"],
  nativeCurrency: {
    name: "Test BNB",
    symbol: "tBNB",
    decimals: 18,
  },
  blockExplorerUrls: ["https://testnet.bscscan.com"],
  faucetAddress: "0x86e9197CC0F76E4e4aaa7082180945196bBAb5D3",
  faucetAbi: [
    {
      inputs: [{ internalType: "address", name: "_tokenInstance", type: "address" }],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      inputs: [{ internalType: "address", name: "_address", type: "address" }],
      name: "allowedToWithdraw",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "requestTokens",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "tokenAmount",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "tokenInstance",
      outputs: [{ internalType: "contract ERC20", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "waitTime",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ],
};
