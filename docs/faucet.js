$(document).ready(function() {

	//////////////////////////////////////////////////////////////////////////////
	////     INSERT YOUR NODE RPC URL, NETWORK ID AND GAS PRICE HERE        //////
	//////////////////////////////////////////////////////////////////////////////
	var rpcURL = "https://bsc-dataseed.bnbchain.org";
	var networkID = 56;
	var minGasPrice = 0;
	//////////////////////////////////////////////////////////////////////////////
	////     INSERT THE TOKEN AND FAUCET ADDRESS HERE                       //////
	//////////////////////////////////////////////////////////////////////////////
	var token_address = '0x0000000000000000000000000000000000000000';
	var faucet_address = '0x0000000000000000000000000000000000000000';
	//////////////////////////////////////////////////////////////////////////////

	var account;
	var web3;

	var contract_token;
	var contract_faucet;

	var balanceETH = 0;
	var balanceToken = 0;

	var token_abi;
	var faucet_abi;

	async function initialize() {
		await setAccount();
		await setTokenBalance();
		await checkFaucet();
	}

	async function setAccount() {
		try {
			const netId = await web3.eth.net.getId();
			if (netId == networkID) { 
				$("#wrong_network").fadeOut(1000);
				setTimeout(function(){ $("#correct_network").fadeIn(); $("#faucet").fadeIn(); }, 1000);
				
				const accounts = await web3.eth.getAccounts();
				account = accounts[0];
				$("#address").text(account);
				
				const balance = await web3.eth.getBalance(account);
				balanceETH = Number(web3.utils.fromWei(balance, 'ether'));
				$('#balanceETH').text(balanceETH.toFixed(4) + " ETH");
				$('#balanceETH').show();
			} 
		} catch (err) {
			console.error("Error setting account:", err);
		}
	}

	async function setTokenBalance() {
		try {
			const accounts = await web3.eth.getAccounts();
			const result = await contract_token.methods.balanceOf(accounts[0]).call();
			balanceToken = Number(result);
			$('#balanceToken').text(web3.utils.fromWei(result, 'ether') + " Tokens");
		} catch (err) {
			console.error("Error getting token balance:", err);
		}
	}

	async function checkFaucet() {
		try {
			var tokenAmount = 0;
			
			const amount = await contract_faucet.methods.tokenAmount().call();
			tokenAmount = amount;
			$("#requestButton").text("Request " + web3.utils.fromWei(amount, 'ether') + " Test Tokens");

			const faucetBalance = await contract_token.methods.balanceOf(faucet_address).call();
			if (Number(faucetBalance) < Number(tokenAmount)) {
				$("#warning").html("Sorry - the faucet is out of tokens! But don't worry, we're on it!");
			} else {
				const accounts = await web3.eth.getAccounts();
				const allowed = await contract_faucet.methods.allowedToWithdraw(accounts[0]).call();
				if (allowed && balanceToken < tokenAmount * 1000) {
					$("#requestButton").removeAttr('disabled');
				} else {
					const waitTime = await contract_faucet.methods.waitTime().call();
					$("#warning").html("Sorry - you can only request tokens every " + (waitTime) / 60 + " minutes. Please wait!");
				}
			}
		} catch (err) {
			console.error("Error checking faucet:", err);
		}
	}

	async function getTestTokens() {
		$("#requestButton").attr('disabled', true);
		try {
			await contract_faucet.methods.requestTokens().send({
				value: 0,
				gas: 200000,
				gasPrice: minGasPrice,
				from: account
			});
			$('#getTokens').hide();
		} catch (err) {
			console.error("Error requesting tokens:", err);
			$('#getTokens').hide();
		}
	}

	async function initWeb3() {
		$("#rpc_url").text(rpcURL);
		$("#network_id").text(networkID);

		// Modern MetaMask detection
		if (typeof window.ethereum !== 'undefined') {
			web3 = new Web3(window.ethereum);
			try {
				// Request account access
				await window.ethereum.request({ method: 'eth_requestAccounts' });
				console.log("MetaMask connected");
			} catch (error) {
				console.error("User denied account access:", error);
				$("#warning").html("Please connect your MetaMask wallet to use this faucet.");
				return;
			}
		} else if (typeof window.web3 !== 'undefined') {
			// Legacy dapp browsers
			web3 = new Web3(window.web3.currentProvider);
		} else {
			// Fallback to RPC
			web3 = new Web3(new Web3.providers.HttpProvider(rpcURL));
			$("#warning").html("Please install MetaMask to use this faucet!");
			return;
		}

		// Load contract ABIs
		try {
			const tokenData = await $.getJSON('json/erc20.json');
			token_abi = tokenData;
			contract_token = new web3.eth.Contract(token_abi, token_address);

			const faucetData = await $.getJSON('json/faucet.json');
			faucet_abi = faucetData;
			contract_faucet = new web3.eth.Contract(faucet_abi, faucet_address);

			// Initialize after contracts are loaded
			setTimeout(function(){ initialize(); }, 1000);
		} catch (err) {
			console.error("Error loading contract ABIs:", err);
		}
	}

	// Initialize Web3
	initWeb3();

	// Button click handler
	let tokenButton = document.querySelector('#requestButton');
	tokenButton.addEventListener('click', function() {
		getTestTokens();
	});

	// Listen for account changes
	if (typeof window.ethereum !== 'undefined') {
		window.ethereum.on('accountsChanged', function (accounts) {
			account = accounts[0];
			$("#address").text(account);
			initialize();
		});

		window.ethereum.on('chainChanged', function (chainId) {
			window.location.reload();
		});
	}
});
