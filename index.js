require('dotenv').config();
const ethers = require('ethers');
const readline = require('readline');
const chalk = require('chalk');
const cliSpinners = require('cli-spinners');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs').promises;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const network = {
  name: 'Tea Sepolia Testnet 🌐',
  rpc: 'https://tea-sepolia.g.alchemy.com/public',
  chainId: 10218,
  symbol: 'TEA',
  explorer: 'https://sepolia.tea.xyz/'
};

const erc20ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)'
];

const stTeaABI = [
  'function stake() payable',
  'function balanceOf(address owner) view returns (uint256)',
  'function withdraw(uint256 _amount)'
];

const stTeaContractAddress = '0x04290DACdb061C6C9A0B9735556744be49A64012';

async function loadProxies() {
  try {
    const data = await fs.readFile('proxies.txt', 'utf8');
    const proxies = data.split('\n').map(line => line.trim()).filter(line => line);
    if (proxies.length === 0) {
      console.log(chalk.yellow('No proxies found in proxies.txt. Running without proxy.'));
      return null;
    }
    return proxies;
  } catch (error) {
    console.error(chalk.red('Error reading proxies.txt:', error.message, '❌'));
    return null;
  }
}

async function loadPrivateKeys() {
  const privateKeys = [];
  let i = 1;
  while (process.env[`PRIVATE_KEY${i}`]) {
    privateKeys.push(process.env[`PRIVATE_KEY${i}`]);
    i++;
  }
  if (privateKeys.length === 0) {
    console.error(chalk.red('Error: No PRIVATE_KEYs found in .env file 🚫'));
    process.exit(1);
  }
  return privateKeys;
}

function parseProxy(proxy) {
  if (!proxy) return null;
  let proxyUrl = proxy;
  if (!proxy.startsWith('http://') && !proxy.startsWith('https://')) {
    proxyUrl = `http://${proxy}`;
  }
  return proxyUrl;
}

function showSpinner(message) {
  const spinner = cliSpinners.dots.frames;
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r${chalk.yellow(message)} ${spinner[i++ % spinner.length]}`);
  }, 100);
  return () => {
    clearInterval(interval);
    process.stdout.write('\r');
  };
}

async function confirmTransaction(details) {
  console.log(chalk.white('┌─── Transaction Preview ───┐'));
  for (const [key, value] of Object.entries(details)) {
    console.log(chalk.white(`│ ${key.padEnd(10)} : ${chalk.cyan(value)}`));
  }
  console.log(chalk.white('└──────────────────────────┘'));
  return new Promise(resolve => {
    rl.question(chalk.yellow('Confirm transaction? (y/n): '), answer => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function displayBanner(provider) {
  try {
    const blockNumber = await provider.getBlockNumber();
    const gasPrice = await provider.getGasPrice();
    const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
    const bannerText = `
${chalk.white('===============================================')}
${chalk.cyan('                TEA SEPOLIA AUTO BOT')}
${chalk.yellow('     kachal is Here .Let me to show you ')}
${chalk.yellow(`        Block: ${blockNumber} | Gas: ${parseFloat(gasPriceGwei).toFixed(2)} Gwei `)}
${chalk.white('===============================================')}
    `;
    console.log(bannerText);
  } catch (error) {
    console.error(chalk.red('Error fetching network status:', error.message, '❌'));
    const bannerText = `
${chalk.white('===============================================')}
${chalk.cyan('                TEA SEPOLIA AUTO BOT')}
${chalk.yellow('     kachal is Here .Let me to show you ')}
${chalk.yellow('     Network status unavailable')}
${chalk.white('===============================================')}
    `;
    console.log(bannerText);
  }
}

async function connectToNetwork() {
  try {
    const proxies = await loadProxies();
    const privateKeys = await loadPrivateKeys();
    const wallets = [];

    for (let i = 0; i < privateKeys.length; i++) {
      const privateKey = privateKeys[i];
      const proxy = proxies && proxies[i] ? parseProxy(proxies[i]) : null;

      let provider;
      if (proxy) {
        const agent = new HttpsProxyAgent(proxy);
        provider = new ethers.providers.JsonRpcProvider({
          url: network.rpc,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          agent
        });
      } else {
        provider = new ethers.providers.JsonRpcProvider(network.rpc);
      }

      try {
        const wallet = new ethers.Wallet(privateKey, provider);
        wallets.push({ wallet, provider, proxy: proxies && proxies[i] ? proxies[i] : null });
      } catch (error) {
        console.error(chalk.red(`Invalid private key for PRIVATE_KEY${i + 1}: ${error.message} 🚫`));
      }
    }

    if (wallets.length === 0) {
      console.error(chalk.red('Error: No valid wallets found 🚫'));
      process.exit(1);
    }

    return wallets;
  } catch (error) {
    console.error(chalk.red('Connection error:', error.message, '❌'));
    process.exit(1);
  }
}

async function getWalletInfo(wallets) {
  for (let i = 0; i < wallets.length; i++) {
    const { wallet, provider, proxy } = wallets[i];
    const address = wallet.address;
    const teaBalance = await provider.getBalance(address);
    const stTeaContract = new ethers.Contract(
      stTeaContractAddress,
      ['function balanceOf(address owner) view returns (uint256)'],
      wallet
    );
    const stTeaBalance = await stTeaContract.balanceOf(address).catch(() => ethers.BigNumber.from(0));

    console.log(chalk.white(`\n===== WALLET ${i + 1} INFORMATION =====`));
    console.log(chalk.white(`Your address: ${chalk.cyan(address)} 👤`));
    console.log(chalk.white(`TEA Balance: ${chalk.cyan(ethers.utils.formatEther(teaBalance))} ${network.symbol} `));
    console.log(chalk.white(`stTEA Balance: ${chalk.cyan(ethers.utils.formatEther(stTeaBalance))} stTEA `));
    console.log(chalk.white(`Using proxy: ${chalk.cyan(proxy || 'None')} 🌐`));
    console.log(chalk.white('=============================\n'));
  }
}

async function stakeTea(wallet, amount) {
  try {
    const amountWei = ethers.utils.parseEther(amount.toString());
    const gasPrice = await wallet.provider.getGasPrice();
    const estimatedGas = 200000;
    const gasCost = ethers.utils.formatEther(gasPrice.mul(estimatedGas));

    const confirmed = await confirmTransaction({
      Action: 'Stake',
      Amount: `${amount} TEA`,
      'Est. Gas': `${gasCost} TEA`
    });

    if (!confirmed) {
      console.log(chalk.red('Transaction canceled. 🚫'));
      console.log(chalk.white('===== STAKING CANCELED =====\n'));
      return null;
    }

    const stTeaContract = new ethers.Contract(
      stTeaContractAddress,
      stTeaABI,
      wallet
    );

    console.log(chalk.white('\n=====(Dialogue) STAKING TEA ====='));
    console.log(chalk.yellow(`Staking ${amount} TEA...`));

    const tx = await stTeaContract.stake({
      value: amountWei,
      gasLimit: estimatedGas
    });

    console.log(chalk.white(`Transaction sent! Hash: ${chalk.cyan(tx.hash)} 📤`));
    console.log(chalk.gray(`View on explorer: ${network.explorer}/tx/${tx.hash} 🔗`));

    const stopSpinner = showSpinner('Waiting for confirmation...');
    const receipt = await tx.wait();
    stopSpinner();

    console.log(chalk.green(`Transaction confirmed in block ${receipt.blockNumber} ✅`));
    console.log(chalk.green(`Successfully staked ${amount} TEA! 🎉`));
    console.log(chalk.white('===== STAKING COMPLETED =====\n'));

    return receipt;
  } catch (error) {
    console.error(chalk.red('Error staking TEA:', error.message, '❌'));
    console.log(chalk.white('===== STAKING FAILED =====\n'));
    return null;
  }
}

async function withdrawTea(wallet, amount) {
  try {
    const amountWei = ethers.utils.parseEther(amount.toString());
    const gasPrice = await wallet.provider.getGasPrice();
    const estimatedGas = 100000;
    const gasCost = ethers.utils.formatEther(gasPrice.mul(estimatedGas));

    const confirmed = await confirmTransaction({
      Action: 'Withdraw',
      Amount: `${amount} stTEA`,
      'Est. Gas': `${gasCost} TEA`
    });

    if (!confirmed) {
      console.log(chalk.red('Transaction canceled. 🚫'));
      console.log(chalk.white('===== WITHDRAW CANCELED =====\n'));
      return null;
    }

    const stTeaContract = new ethers.Contract(
      stTeaContractAddress,
      stTeaABI,
      wallet
    );

    console.log(chalk.white('\n===== WITHDRAWING TEA ====='));
    console.log(chalk.yellow(`Withdrawing ${amount} stTEA...`));

    const tx = await stTeaContract.withdraw(amountWei, {
      gasLimit: estimatedGas
    });

    console.log(chalk.white(`Transaction sent! Hash: ${chalk.cyan(tx.hash)} 📤`));
    console.log(chalk.gray(`View on explorer: ${network.explorer}/tx/${tx.hash} 🔗`));

    const stopSpinner = showSpinner('Waiting for confirmation...');
    const receipt = await tx.wait();
    stopSpinner();

    console.log(chalk.green(`Transaction confirmed in block ${receipt.blockNumber} ✅`));
    console.log(chalk.green(`Successfully withdrawn ${amount} stTEA! 🎉`));
    console.log(chalk.white('===== WITHDRAW COMPLETED =====\n'));

    return receipt;
  } catch (error) {
    console.error(chalk.red('Error withdrawing TEA:', error.message, '❌'));
    console.log(chalk.white('===== WITHDRAW FAILED =====\n'));
    return null;
  }
}

async function claimRewards(wallet) {
  try {
    console.log(chalk.white('\n===== CLAIMING REWARDS ====='));
    console.log(chalk.yellow('Claiming stTEA rewards...'));

    const data = "0x3d18b912";
    const gasPrice = await wallet.provider.getGasPrice();
    const estimatedGas = 100000;
    const gasCost = ethers.utils.formatEther(gasPrice.mul(estimatedGas));

    const confirmed = await confirmTransaction({
      Action: 'Claim Rewards',
      'Est. Gas': `${gasCost} TEA`
    });

    if (!confirmed) {
      console.log(chalk.red('Transaction canceled. 🚫'));
      console.log(chalk.white('===== CLAIM CANCELED =====\n'));
      return null;
    }

    const tx = await wallet.sendTransaction({
      to: stTeaContractAddress,
      data: data,
      gasLimit: estimatedGas
    });

    console.log(chalk.white(`Transaction sent! Hash: ${chalk.cyan(tx.hash)} 📤`));
    console.log(chalk.gray(`View on explorer: ${network.explorer}/tx/${tx.hash} 🔗`));

    const stopSpinner = showSpinner('Waiting for confirmation...');
    const receipt = await tx.wait();
    stopSpinner();

    console.log(chalk.green(`Transaction confirmed in block ${receipt.blockNumber} ✅`));
    console.log(chalk.green('Successfully claimed rewards! 🎉'));
    console.log(chalk.white('===== CLAIMING COMPLETED =====\n'));

    const balance = await wallet.provider.getBalance(wallet.address);
    console.log(chalk.white(`Updated TEA Balance: ${chalk.cyan(ethers.utils.formatEther(balance))} ${network.symbol} 💰`));

    return receipt;
  } catch (error) {
    console.error(chalk.red('Error claiming rewards:', error.message, '❌'));
    console.log(chalk.white('===== CLAIMING FAILED =====\n'));
    return null;
  }
}

function generateRandomAddress() {
  const wallet = ethers.Wallet.createRandom();
  return wallet.address;
}

async function sendToRandomAddress(wallet, amount, skipConfirmation = false) {
  try {
    const toAddress = generateRandomAddress();
    const amountWei = ethers.utils.parseEther(amount.toString());
    const gasPrice = await wallet.provider.getGasPrice();
    const estimatedGas = 21000;
    const gasCost = ethers.utils.formatEther(gasPrice.mul(estimatedGas));

    if (!skipConfirmation) {
      const confirmed = await confirmTransaction({
        Action: 'Transfer',
        Amount: `${amount} TEA`,
        To: toAddress.slice(0, 6) + '...' + toAddress.slice(-4),
        'Est. Gas': `${gasCost} TEA`
      });

      if (!confirmed) {
        console.log(chalk.red('Transaction canceled. 🚫'));
        return null;
      }
    }

    console.log(chalk.yellow(`Sending ${amount} TEA to random address: ${chalk.cyan(toAddress)} 📤`));

    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountWei,
      gasLimit: estimatedGas
    });

    console.log(chalk.white(`Transaction sent! Hash: ${chalk.cyan(tx.hash)} 🚀`));
    console.log(chalk.gray(`View on explorer: ${network.explorer}/tx/${tx.hash} 🔗`));

    const stopSpinner = showSpinner('Waiting for confirmation...');
    const receipt = await tx.wait();
    stopSpinner();

    console.log(chalk.green(`Transaction confirmed in block ${receipt.blockNumber} ✅`));

    return { receipt, toAddress };
  } catch (error) {
    console.error(chalk.red('Error sending TEA:', error.message, '❌'));
    return null;
  }
}

async function executeRandomTransfers(wallet, amount, numberOfTransfers) {
  console.log(chalk.white('\n===== BATCH TRANSFER ====='));
  console.log(chalk.yellow(`Preparing ${numberOfTransfers} random transfers of ${amount} TEA each... 🚀`));

  const gasPrice = await wallet.provider.getGasPrice();
  const estimatedGas = 21000;
  const gasCost = ethers.utils.formatEther(gasPrice.mul(estimatedGas).mul(numberOfTransfers));

  const confirmed = await confirmTransaction({
    Action: 'Batch Transfer',
    'Total Amount': `${(amount * numberOfTransfers).toFixed(4)} TEA`,
    Transfers: numberOfTransfers,
    'Est. Gas': `${gasCost} TEA`
  });

  if (!confirmed) {
    console.log(chalk.red('Transaction canceled. 🚫'));
    console.log(chalk.white('===== BATCH TRANSFER CANCELED =====\n'));
    return [];
  }

  console.log(chalk.yellow(`Starting ${numberOfTransfers} transfers...\n`));

  const results = [];

  for (let i = 0; i < numberOfTransfers; i++) {
    console.log(chalk.white(`\nTransfer ${i + 1}/${numberOfTransfers}`));
    const result = await sendToRandomAddress(wallet, amount, true);

    if (result) {
      results.push(result);
    }

    if (i < numberOfTransfers - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(chalk.green(`\nCompleted ${results.length}/${numberOfTransfers} transfers successfully. 🎉`));
  console.log(chalk.white('===== BATCH TRANSFER COMPLETED =====\n'));

  return results;
}

async function executeDailyTask(wallet) {
  const amount = 0.0001;
  const numberOfTransfers = 100;

  console.log(chalk.white('\n===== DAILY TASK ====='));
  console.log(chalk.yellow(`Preparing daily task: ${numberOfTransfers} transfers of ${amount} TEA each`));

  const gasPrice = await wallet.provider.getGasPrice();
  const estimatedGas = 21000;
  const gasCost = ethers.utils.formatEther(gasPrice.mul(estimatedGas).mul(numberOfTransfers));

  const confirmed = await confirmTransaction({
    Action: 'Daily Task',
    'Total Amount': `${(amount * numberOfTransfers).toFixed(4)} TEA`,
    Transfers: numberOfTransfers,
    'Est. Gas': `${gasCost} TEA`
  });

  if (!confirmed) {
    console.log(chalk.red('Transaction canceled. 🚫'));
    console.log(chalk.white('===== DAILY TASK CANCELED =====\n'));
    return;
  }

  await executeRandomTransfers(wallet, amount, numberOfTransfers);

  console.log(chalk.white('\n===== DAILY TASK COMPLETED =====\n'));
}

async function showMainMenu() {
  const wallets = await connectToNetwork();
  await displayBanner(wallets[0].provider);
  await getWalletInfo(wallets);

  console.log(chalk.white('\n===== MAIN MENU ====='));
  console.log(chalk.white('1. Send TEA to random addresses'));
  console.log(chalk.white('2. Stake TEA'));
  console.log(chalk.white('3. Claim rewards'));
  console.log(chalk.white('4. Withdraw stTEA'));
  console.log(chalk.white('5. Daily task (100 transfers of 0.0001 TEA)'));
  console.log(chalk.white('6. Exit'));
  console.log(chalk.white('===================='));

  rl.question(chalk.yellow('\nChoose an option (1-6): '), async (answer) => {
    switch (answer) {
      case '1':
        await handleRandomTransfers(wallets);
        break;
      case '2':
        await handleStaking(wallets);
        break;
      case '3':
        await handleClaiming(wallets);
        break;
      case '4':
        await handleWithdrawing(wallets);
        break;
      case '5':
        await handleDailyTask(wallets);
        break;
      case '6':
        console.log(chalk.white('\n===== EXITING ====='));
        console.log(chalk.white('Thank you for using TEA BOT! 👋'));
        console.log(chalk.white('===================='));
        rl.close();
        process.exit(0);
        break;
      default:
        console.log(chalk.red('Invalid option. Please try again. ⚠️'));
        await showMainMenu();
        break;
    }
  });
}

async function handleRandomTransfers(wallets) {
  console.log(chalk.white('\n===== RANDOM TRANSFERS ====='));
  rl.question(chalk.yellow('Enter amount of TEA to send in each transfer: '), async (amountStr) => {
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      console.log(chalk.red('Invalid amount. Please enter a positive number. ⚠️'));
      return handleRandomTransfers(wallets);
    }

    rl.question(chalk.yellow('Enter number of transfers to make per wallet: '), async (countStr) => {
      const count = parseInt(countStr);

      if (isNaN(count) || count <= 0) {
        console.log(chalk.red('Invalid count. Please enter a positive integer. ⚠️'));
        return handleRandomTransfers(wallets);
      }

      for (let i = 0; i < wallets.length; i++) {
        console.log(chalk.white(`\nProcessing transfers for Wallet ${i + 1} (${wallets[i].wallet.address})`));
        await executeRandomTransfers(wallets[i].wallet, amount, count);
      }

      rl.question(chalk.yellow('\nPress Enter to return to the main menu...'), async () => {
        process.stdout.write('\x1Bc');
        console.clear();
        await showMainMenu();
      });
    });
  });
}

async function handleStaking(wallets) {
  console.log(chalk.white('\n===== STAKING ====='));
  rl.question(chalk.yellow('Enter amount of TEA to stake: '), async (amountStr) => {
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      console.log(chalk.red('Invalid amount. Please enter a positive number. ⚠️'));
      return handleStaking(wallets);
    }

    for (let i = 0; i < wallets.length; i++) {
      console.log(chalk.white(`\nStaking for Wallet ${i + 1} (${wallets[i].wallet.address})`));
      await stakeTea(wallets[i].wallet, amount);
    }

    rl.question(chalk.yellow('\nPress Enter to return to the main menu...'), async () => {
      process.stdout.write('\x1Bc');
      console.clear();
      await showMainMenu();
    });
  });
}

async function handleWithdrawing(wallets) {
  console.log(chalk.white('\n===== WITHDRAWING ====='));
  rl.question(chalk.yellow('Enter amount of stTEA to withdraw: '), async (amountStr) => {
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      console.log(chalk.red('Invalid amount. Please enter a positive number. ⚠️'));
      return handleWithdrawing(wallets);
    }

    for (let i = 0; i < wallets.length; i++) {
      console.log(chalk.white(`\nWithdrawing for Wallet ${i + 1} (${wallets[i].wallet.address})`));
      await withdrawTea(wallets[i].wallet, amount);
    }

    rl.question(chalk.yellow('\nPress Enter to return to the main menu...'), async () => {
      process.stdout.write('\x1Bc');
      console.clear();
      await showMainMenu();
    });
  });
}

async function handleClaiming(wallets) {
  console.log(chalk.white('\n===== CLAIMING ====='));
  for (let i = 0; i < wallets.length; i++) {
    console.log(chalk.white(`\nClaiming for Wallet ${i + 1} (${wallets[i].wallet.address})`));
    await claimRewards(wallets[i].wallet);
  }

  rl.question(chalk.yellow('\nPress Enter to return to the main menu...'), async () => {
    process.stdout.write('\x1Bc');
    console.clear();
    await showMainMenu();
  });
}

async function handleDailyTask(wallets) {
  console.log(chalk.white('\n===== DAILY TASK ====='));
  for (let i = 0; i < wallets.length; i++) {
    console.log(chalk.white(`\nExecuting daily task for Wallet ${i + 1} (${wallets[i].wallet.address})`));
    await executeDailyTask(wallets[i].wallet);
  }

  rl.question(chalk.yellow('\nPress Enter to return to the main menu...'), async () => {
    process.stdout.write('\x1Bc');
    console.clear();
    await showMainMenu();
  });
}

showMainMenu();

rl.on('close', () => {
  console.log(chalk.green('\nThank you for using TEA BOT! 👋'));
  process.exit(0);
});
