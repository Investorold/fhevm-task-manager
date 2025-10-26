# FHEVM Task Manager 🔐

A confidential task management dApp built with Zama FHEVM, leveraging fully homomorphic encryption to protect user data on-chain.

## 🎯 Features

- **Encrypted Task Management**: Create, decrypt, complete, and delete tasks with full confidentiality
- **Zama FHEVM Integration**: Uses FHEVM for on-chain encryption and decryption
- **Wallet Support**: Works with MetaMask, Trust Wallet, and other EVM-compatible wallets
- **Task Sharing**: Share tasks with other users while maintaining privacy
- **Bulk Operations**: Select and delete multiple tasks at once
- **Demo Mode**: Test without connecting a wallet
- **Data Integrity**: User input is preserved and never tampered with
- **Sepolia Testnet**: Deployed and tested on Sepolia

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- MetaMask or compatible wallet
- Sepolia testnet ETH (for gas fees)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd fhevm-task-manager

# Install dependencies
npm install
cd contracts && npm install
cd ../frontend && npm install
```

### Running the Application

#### Option 1: Demo Mode (No Wallet Required)

```bash
# Start frontend in demo mode
cd frontend
npm run dev
```

Visit `http://localhost:3000` and start creating tasks without connecting a wallet.

#### Option 2: Production Mode (Sepolia Testnet)

1. **Deploy Contracts** (if not already deployed):

```bash
cd contracts
npx hardhat deploy --network sepolia
```

2. **Start Frontend**:

```bash
cd frontend
npm run dev
```

3. **Connect Your Wallet**:
   - Click "Connect Wallet" in the app
   - Ensure you're on Sepolia testnet
   - Confirm the connection

4. **Create Encrypted Tasks**:
   - Click "New Task"
   - Toggle "Encrypt Task" ON
   - Fill in details and create

## 📁 Project Structure

```
fhevm-task-manager/
├── contracts/          # Smart contracts
│   ├── contracts/      # Solidity files
│   ├── deployments/    # Deployment configs
│   └── test/           # Contract tests
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── services/    # FHEVM & blockchain services
│   │   └── types/       # TypeScript definitions
│   └── public/
└── README.md
```

## 🔐 Contract Addresses

### Sepolia Testnet
- **TaskManager**: `0xBd0EAE395C084154d159554287f1eAA89E700256`

## 🛠️ Troubleshooting

### Common Issues

**1. "New Task" button not working**
- Ensure FHEVM is initialized (check console logs)
- Try refreshing the page
- Check wallet connection status

**2. Tasks disappear after refresh**
- Ensure data is being saved to localStorage
- Check browser console for errors
- Verify wallet is connected

**3. Decryption not working**
- Confirm wallet is connected
- Check if transaction was signed
- Wait for confirmation (sometimes takes 30-60 seconds)

**4. Multiple transactions for single task**
- This should only happen once per encrypted task
- If it happens repeatedly, check the FHEVM relayer status

### Data Integrity Issues

If you notice your task data changing unexpectedly:
1. Check the browser console for errors
2. Clear localStorage and start fresh
3. Report the issue with console logs

## 🧪 Testing

```bash
# Run contract tests
cd contracts
npx hardhat test

# Run frontend tests (if configured)
cd frontend
npm test
```

## 📝 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Demo Mode Guide](./frontend/DEMO_MODE_GUIDE.md)
- [Troubleshooting Guide](./frontend/TROUBLESHOOTING.md)
- [Integration Guide](./INTEGRATION_GUIDE.md)

## 🤝 Contributing

This is a Zama Developer Program submission. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- [Zama](https://zama.ai/) for FHEVM technology
- [OpenZeppelin](https://openzeppelin.com/) for secure contract patterns
- Ethereum community

## 📞 Support

If you encounter issues or need help:
1. Check the troubleshooting section
2. Review console logs
3. Open an issue on GitHub
4. Contact the Zama Discord community

---

**Built with ❤️ for the Zama Developer Program**
