# FHEVM Task Manager

A privacy-preserving task management dApp leveraging Zama's FHEVM for on-chain encrypted data.

> **Zama Developer Program Submission**  
> Live Demo: [https://fhevm-task-manager.vercel.app/](https://fhevm-task-manager.vercel.app/)  
> Contract: `0xe8602589175597668f7dE429422FED0A3B955cD9` ([Etherscan](https://sepolia.etherscan.io/address/0xe8602589175597668f7dE429422FED0A3B955cD9))

## Features

- **Encrypted Task Management**: Create, share, decrypt, and complete tasks with FHE
- **Confidential Sharing**: Share tasks securely while maintaining on-chain privacy
- **Wallet Integration**: Compatible with MetaMask and EVM wallets
- **Persistent Storage**: Tasks survive page refreshes via local metadata cache
- **Sepolia Testnet**: Fully deployed and operational

## Quick Start

### Prerequisites
- Node.js 18+
- MetaMask wallet
- Sepolia testnet ETH

### Installation
```bash
git clone https://github.com/Investorold/fhevm-task-manager.git
cd fhevm-task-manager

# Install contracts
cd contracts && npm install

# Install frontend
cd ../frontend && npm install
```

### Run Locally
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` and connect your wallet to Sepolia testnet.

## Contract

**Network**: Sepolia Testnet  
**Address**: `0xe8602589175597668f7dE429422FED0A3B955cD9`  
**Verification**: [View on Etherscan](https://sepolia.etherscan.io/address/0xe8602589175597668f7dE429422FED0A3B955cD9)

## Project Structure

```
fhevm-task-manager/
├── contracts/          # Smart contracts and deployment
│   ├── contracts/      # Solidity source files
│   ├── test/           # Contract tests
│   └── deployments/    # Network deployments
├── frontend/           # React frontend
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── services/   # Blockchain services
│   │   └── config/     # Configuration
│   └── dist/           # Production build
└── vercel.json         # Deployment configuration
```

## Testing

```bash
# Contract tests
cd contracts
npx hardhat test

# Frontend development
cd frontend
npm run dev
```

## License

MIT License

## Acknowledgments

Built with [Zama FHEVM](https://docs.zama.ai/fhevm) for the Zama Developer Program.
