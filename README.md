# FHEVM Task Manager

A privacy-preserving task management dApp leveraging Zama's FHEVM for on-chain encrypted data.

> **Zama Developer Program Submission**  
> Live Demo: [https://fhevm-task-manager.vercel.app/](https://fhevm-task-manager.vercel.app/)  
> Contract: `0xe8602589175597668f7dE429422FED0A3B955cD9` ([Etherscan](https://sepolia.etherscan.io/address/0xe8602589175597668f7dE429422FED0A3B955cD9))

## Features

- **Encrypted Task Management** – Create, share, decrypt, and complete tasks with FHE-protected payloads
- **Confidential Sharing** – Recipients must prove wallet ownership before seeing plaintext
- **Wallet Integration** – Works with MetaMask and any EIP-1193 compatible provider
- **Hybrid Storage** – Smart contract stores encrypted handles; backend/relayer return plaintext metadata on demand
- **Production Demo** – Live deployment on Vercel with a Cloudflare tunnel exposing the secure backend

## Architecture Overview

```
Wallet (MetaMask)
        │
        ▼
Frontend (React + Vite)
        │        ▲
        │        │
        │   Zama Relayer (FHEVM)
        │        │
        ▼        │
Backend (Express + Cloudflare Tunnel) ──► `tasks.json` metadata store
        │
        ▼
TaskManager.sol (Sepolia)
```

- **Frontend** (`frontend/`): React app that orchestrates wallet auth, encryption requests, and UI flows.
- **Backend** (`backend/`): Express service that keeps per-user plaintext metadata. Exposed via `https://api.zamataskhub.com` through Cloudflare Tunnel (`cloudflared` systemd service).
- **Contracts** (`contracts/`): `TaskManager.sol` FHEVM-enabled contract deployed at `0xe8602589175597668f7dE429422FED0A3B955cD9` on Sepolia.
- **Relayer**: Zama testnet relayer performs user decryption once wallet signs the request.

## Environment & Deployment

| Component | Command | Notes |
|-----------|---------|-------|
| Backend   | `cd backend && npm install && npm start` | Default port `3001`. Behind Cloudflare tunnel (`cloudflared tunnel run`). |
| Frontend  | `cd frontend && npm install && npm run dev` | Uses Vite. Production build deployed to Vercel. |
| Contracts | `cd contracts && npm install` | Hardhat environment for deploying/testing. |

### Environment Variables

Frontend (Vercel / `.env`):

```
VITE_BACKEND_URL=https://api.zamataskhub.com
VITE_TASK_MANAGER_ADDRESS=0xe8602589175597668f7dE429422FED0A3B955cD9
```

Backend (`backend/.env`, optional overrides):

```
PORT=3001
REQUIRE_SIGNATURE=false
```

### Cloudflare Tunnel (server)

The production backend is exposed using an existing tunnel:

```bash
# Authenticate once (already done on the server)
cloudflared tunnel login

# Run tunnel
cloudflared tunnel --config /etc/cloudflared/config.yml run
```

`/etc/systemd/system/cloudflared.service` keeps the tunnel alive on reboot.

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

### Demo Script

1. Connect wallet (MetaMask → Sepolia).
2. Create a task (optionally mark as encrypted/plain).
3. Share an encrypted task with another address.
4. Switch to the recipient wallet → Received tab → **Decrypt**.
5. Backend and relayer return plaintext; UI swaps out the asterisks.
6. Optionally mark the task as complete or delete it.

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

## Submission Notes

- Frontend: [https://zamataskhub.com](https://zamataskhub.com)
- Backend API: [https://api.zamataskhub.com](https://api.zamataskhub.com) (`/health`, `/api/tasks/:address`)
- Contract: `0xe8602589175597668f7dE429422FED0A3B955cD9` (Sepolia)
- Demo video: https://www.loom.com/share/d1c18c16c0c04aaaa45861eaa52b48d6
- Known quirk: tasks created **before** backend normalization (pre‑2025‑11‑01) may need to be re-saved so metadata is flattened; new tasks are unaffected.

## License

MIT License

## Acknowledgments

Built with [Zama FHEVM](https://docs.zama.ai/fhevm) for the Zama Developer Program.
