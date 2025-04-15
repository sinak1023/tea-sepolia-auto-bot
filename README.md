# Tea Sepolia Auto Bot

A Node.js script for automating interactions with the Tea Sepolia Testnet, including staking, withdrawing, claiming rewards, and transferring TEA tokens. The bot supports **multiple wallets** with individual private keys and **dedicated proxies** for each wallet, making it ideal for managing multiple accounts efficiently.

## Features

- **Multi-Wallet Support**: Manage multiple wallets using private keys (`PRIVATE_KEY1`, `PRIVATE_KEY2`, etc.) from a `.env` file.
- **Proxy Support**: Assign unique proxies to each wallet from a `proxies.txt` file.
- **Interactive CLI**: User-friendly menu for performing actions like staking, withdrawing, claiming rewards, and batch transfers.
- **Automated Daily Task**: Execute 100 small transfers (0.0001 TEA each) for airdrop or testing purposes.
- **Transaction Confirmation**: Preview and confirm transactions before execution.
- **Real-Time Feedback**: Display wallet balances, transaction statuses, and network information with a colorful CLI.

## Prerequisites

- **Node.js** (v16 or higher)
- **npm** (Node Package Manager)
- A valid **Tea Sepolia Testnet RPC endpoint** (default: `https://tea-sepolia.g.alchemy.com/public`)
- Private keys for your wallets
- Optional: Proxy servers for enhanced privacy

## Installation

1. **Clone the Repository**:
```
   git clone https://github.com/sinak1023/tea-sepolia-auto-bot.git
   cd tea-sepolia-auto-bot
```
Install Dependencies:

```
npm install
```
This will install the required packages: ethers, chalk, cli-spinners, https-proxy-agent, and dotenv.

Set Up Environment Variables:
Create a .env file in the project root and add your private keys:

```
PRIVATE_KEY1=0xYourPrivateKeyHere1
PRIVATE_KEY2=0xYourPrivateKeyHere2
PRIVATE_KEY3=0xYourPrivateKeyHere3
```
You can add as many private keys as needed (PRIVATE_KEY4, PRIVATE_KEY5, etc.).

Configure Proxies (Optional):
Create a proxies.txt file in the project root and list your proxies (one per line):

```
proxy1:port
proxy2:port
proxy3:port
```
Each wallet will use a corresponding proxy from this file. If no proxies are provided or the number of proxies is less than the number of wallets, the remaining wallets will run without proxies.

Usage
Run the Script:
```
node index.js
```
Main Menu: Upon running, the script displays:
Network status (block number and gas price)
Information for each wallet (address, TEA balance, stTEA balance, and assigned proxy)
A menu with the following options:
text

Copy
1. Send TEA to random addresses
2. Stake TEA
3. Claim rewards
4. Withdraw stTEA
5. Daily task (100 transfers of 0.0001 TEA)
6. Exit
Select an Option:
Enter a number (1-6) to perform the desired action.
For options 1-5, the script will prompt for additional inputs (e.g., amount to stake or number of transfers) and execute the action for each wallet.
Confirm transactions when prompted to proceed.
Example Workflow:
Option 1 (Random Transfers): Enter the amount of TEA and the number of transfers per wallet. The script will send the specified amount to random addresses for each wallet.
Option 5 (Daily Task): Executes 100 transfers of 0.0001 TEA per wallet, useful for airdrop tasks.
File Structure
```
tea-sepolia-auto-bot/
├── index.js           # Main script
├── .env              # Environment variables (private keys)
├── proxies.txt       # Proxy list (optional)
├── package.json      # Project dependencies
├── README.md         # Project documentation
```
Notes
Security: Never share your .env file or private keys. Add .env to .gitignore before pushing to GitHub.
Proxies: Ensure proxies are valid and functional. Invalid proxies may cause connection errors, but the script will fallback to no proxy for affected wallets.
Balances: Ensure wallets have sufficient TEA for transactions (including gas fees).
Error Handling: The script includes robust error handling for invalid private keys, network issues, and transaction failures.
Contributing
Contributions are welcome! Please:

Fork the repository.
Create a feature branch (git checkout -b feature/your-feature).
Commit your changes (git commit -m 'Add your feature').
Push to the branch (git push origin feature/your-feature).
Open a pull request.
