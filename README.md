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

### Sepolia Testnet (Verified)
- **TaskManager**: `0xe8602589175597668f7dE429422FED0A3B955cD9`
- **Etherscan**: https://sepolia.etherscan.io/address/0xe8602589175597668f7dE429422FED0A3B955cD9
- **Features**: Stable task IDs, owner-aware sharing, completed task protection

## 🌐 Live Demo

### Vercel Deployment
**Status**: ✅ Deployed and Live!

**Live URL**: **[https://fhevm-task-manager.vercel.app/](https://fhevm-task-manager.vercel.app/)**

🚀 **Try it now!** Click the link above to test the app in your browser. Connect your MetaMask wallet on Sepolia testnet to create encrypted tasks.

#### Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Follow prompts**:
   - Link to existing project or create new
   - Set root directory: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`

5. **Environment Variables** (if needed):
   - No environment variables required - all config is in `src/config/contract.ts`

#### Or Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Set:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Deploy

#### Post-Deployment

After deployment, verify cross-origin isolation:
1. Open browser DevTools (F12)
2. Check Console for errors
3. Run: `console.log(self.crossOriginIsolated)` - should be `true`
4. Check Network tab - responses should have:
   - `Cross-Origin-Opener-Policy: same-origin`
   - `Cross-Origin-Embedder-Policy: require-corp`

The `vercel.json` file automatically configures these headers.

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
