(() => {
  const { ethers } = window;
  const config = window.APP_CONFIG || {};

  const connectButton = document.getElementById("connectButton");
  const claimButton = document.getElementById("claimButton");
  const statusText = document.getElementById("statusText");
  const addressText = document.getElementById("addressText");
  const networkText = document.getElementById("networkText");
  const claimAmountText = document.getElementById("claimAmountText");
  const txText = document.getElementById("txText");

  let browserProvider;
  let signer;
  let faucetContract;
  let currentAccount;
  let tokenDecimals = 18;
  let tokenSymbol = "$U";

  function setStatus(message, type = "neutral") {
    statusText.textContent = message;
    statusText.className = `status ${type}`;
  }

  function isValidAddress(value) {
    return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
  }

  function assertConfigReady() {
    if (!config.chainId || config.chainId === "0x0") {
      throw new Error("Config error: chainId is missing in config.js");
    }
    if (!Array.isArray(config.faucetAbi) || config.faucetAbi.length === 0) {
      throw new Error("Config error: faucetAbi is missing in config.js");
    }
    if (!isValidAddress(config.faucetAddress)) {
      throw new Error("Config error: faucetAddress is invalid in config.js");
    }
  }

  async function ensureCorrectChain(autoSwitch = true) {
    const network = await browserProvider.getNetwork();
    const currentChainIdHex = `0x${network.chainId.toString(16)}`;

    if (currentChainIdHex.toLowerCase() === config.chainId.toLowerCase()) {
      networkText.textContent = `${config.chainName || "Target Network"} (${config.chainId})`;
      return true;
    }

    if (!autoSwitch) {
      networkText.textContent = `Wrong Network (${currentChainIdHex})`;
      setStatus(`Wallet connected. Please switch to ${config.chainId}.`, "warn");
      return false;
    }

    setStatus(
      `Wrong network (${currentChainIdHex}). Switching to ${config.chainId}...`,
      "warn"
    );

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: config.chainId }],
      });
      networkText.textContent = `${config.chainName || "Target Network"} (${config.chainId})`;
      setStatus("Network switched successfully.", "ok");
      return true;
    } catch (switchErr) {
      if (switchErr.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: config.chainId,
              chainName: config.chainName || "Custom Chain",
              rpcUrls: config.rpcUrls || [],
              nativeCurrency: config.nativeCurrency,
              blockExplorerUrls: config.blockExplorerUrls || [],
            },
          ],
        });

        setStatus("Network added. Please click Connect Wallet again.", "warn");
        return false;
      }

      throw switchErr;
    }
  }

  async function readClaimAmount() {
    try {
      const amount = await faucetContract.tokenAmount();
      claimAmountText.textContent = `${ethers.formatUnits(amount, tokenDecimals)} ${tokenSymbol}`;
      return amount;
    } catch (_err) {
      claimAmountText.textContent = "Unable to read claim amount";
      return null;
    }
  }

  async function refreshClaimEligibility() {
    if (!faucetContract || !currentAccount) {
      claimButton.disabled = true;
      return;
    }

    const claimAmount = await readClaimAmount();

    try {
      const allowed = await faucetContract.allowedToWithdraw(currentAccount);
      if (allowed) {
        claimButton.disabled = false;
        setStatus("Ready to claim U (United Stables).", "ok");
        return;
      }

      let waitSeconds = null;
      try {
        waitSeconds = Number(await faucetContract.waitTime());
      } catch (_err) {
        waitSeconds = null;
      }

      claimButton.disabled = true;
      if (waitSeconds && claimAmount) {
        const waitMinutes = Math.ceil(waitSeconds / 60);
        setStatus(`Not eligible yet. Try again in about ${waitMinutes} minutes.`, "warn");
      } else {
        setStatus("Not eligible yet. Please try again later.", "warn");
      }
    } catch (_err) {
      claimButton.disabled = true;
      setStatus("Unable to read faucet state.", "err");
    }
  }

  async function establishWalletSession(account, autoSwitch = true) {
    currentAccount = account;
    addressText.textContent = currentAccount;

    const chainOk = await ensureCorrectChain(autoSwitch);
    if (!chainOk) {
      claimButton.disabled = true;
      connectButton.textContent = "Wallet Connected";
      return;
    }

    signer = await browserProvider.getSigner();
    faucetContract = new ethers.Contract(config.faucetAddress, config.faucetAbi, signer);

    txText.textContent = "-";
    await refreshClaimEligibility();
    connectButton.textContent = "Wallet Connected";
  }

  async function connectWallet() {
    try {
      assertConfigReady();

      if (!window.ethereum) {
        throw new Error("MetaMask not found. Please install MetaMask and refresh.");
      }

      browserProvider = new ethers.BrowserProvider(window.ethereum);

      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No wallet account available.");
      }

      await establishWalletSession(accounts[0], true);
    } catch (err) {
      claimButton.disabled = true;
      setStatus(err.message || "Failed to connect wallet.", "err");
    }
  }

  async function restoreWalletConnection() {
    try {
      assertConfigReady();

      if (!window.ethereum) {
        return;
      }

      browserProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (!accounts || accounts.length === 0) {
        return;
      }

      await establishWalletSession(accounts[0], false);
    } catch (_err) {
      // Keep initial UI state on silent restore failure.
    }
  }

  async function claimTokens() {
    if (!faucetContract) {
      setStatus("Wallet is not connected.", "warn");
      return;
    }

    try {
      claimButton.disabled = true;
      setStatus("Sending transaction...", "neutral");
      const tx = await faucetContract.requestTokens();
      txText.textContent = tx.hash;

      setStatus("Waiting for confirmation...", "neutral");
      await tx.wait();

      setStatus("Claim successful. U (United Stables) has been received.", "ok");
      await refreshClaimEligibility();
    } catch (err) {
      claimButton.disabled = false;
      if (err.code === 4001) {
        setStatus("Transaction rejected in wallet.", "warn");
      } else {
        setStatus(err.shortMessage || err.message || "Claim failed.", "err");
      }
    }
  }

  function bindWalletEvents() {
    if (!window.ethereum || !window.ethereum.on) {
      return;
    }

    window.ethereum.on("accountsChanged", async (accounts) => {
      if (!accounts || accounts.length === 0) {
        currentAccount = null;
        addressText.textContent = "-";
        networkText.textContent = "-";
        txText.textContent = "-";
        claimAmountText.textContent = "-";
        claimButton.disabled = true;
        connectButton.textContent = "Connect Wallet";
        setStatus("Wallet disconnected.", "warn");
        return;
      }

      if (!browserProvider) {
        browserProvider = new ethers.BrowserProvider(window.ethereum);
      }
      await establishWalletSession(accounts[0], false);
    });

    window.ethereum.on("chainChanged", async () => {
      if (!window.ethereum) {
        return;
      }
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (!accounts || accounts.length === 0) {
        return;
      }
      if (!browserProvider) {
        browserProvider = new ethers.BrowserProvider(window.ethereum);
      }
      await establishWalletSession(accounts[0], false);
    });
  }

  connectButton.addEventListener("click", connectWallet);
  claimButton.addEventListener("click", claimTokens);
  bindWalletEvents();
  restoreWalletConnection();
})();
