# Confidential Task Manager Frontend

A modern, privacy-focused task management dApp built with React, TypeScript, and Tailwind CSS, powered by Zama's FHEVM.

## Features

### 🔒 **Confidential Task Management**
- **Create Tasks**: Encrypt and store tasks with title, description, due date, and priority
- **Edit Tasks**: Update encrypted task details
- **Complete Tasks**: Mark tasks as completed
- **Delete Tasks**: Remove tasks from the system
- **Share Tasks**: Grant decryption permissions to other users

### 🛡️ **FHEVM Integration**
- **Full Encryption**: All task data is encrypted using FHEVM
- **User Decryption**: Only authorized users can decrypt task details
- **Permission Management**: Granular control over who can access tasks
- **Due Soon Count**: Encrypted computation of tasks due within a time margin

### 🎨 **Modern UI/UX**
- **Minimalist Design**: Clean, professional interface
- **Zama Branding**: Subtle integration of Zama colors
- **Responsive Layout**: Works on desktop and mobile
- **Real-time Updates**: Live status indicators and animations

## Tech Stack

- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Ethers.js** for blockchain interactions
- **@zama-fhe/relayer-sdk** for FHEVM integration
- **Lucide React** for icons
- **Date-fns** for date handling

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Connect Wallet**
   - Install MetaMask browser extension
   - Connect to Sepolia testnet
   - The app will automatically initialize FHEVM

4. **Deploy Contract**
   - Deploy your TaskManager contract to Sepolia
   - Enter the contract address in the app
   - Start creating encrypted tasks!

## Contract Integration

The frontend integrates with your TaskManager.sol contract and supports all 9 use cases:

1. ✅ Create Task (with fee payment)
2. ✅ Complete Task
3. ✅ Delete Task
4. ✅ Edit Task
5. ✅ Share Task
6. ✅ Request Due Soon Count
7. ✅ Fee Management
8. ✅ Add Simple Task (TodoList contract)
9. ✅ Mark Complete (TodoList contract)

## Security Features

- **HTTPS Required**: FHEVM requires secure connections
- **Encryption Preview**: Visual confirmation of encrypted data
- **Permission Warnings**: Clear warnings about sharing access
- **Address Validation**: Ethereum address format validation

## Development

- **Hot Reload**: Instant updates during development
- **Type Safety**: Full TypeScript support
- **ESLint**: Code quality and consistency
- **Responsive**: Mobile-first design approach

## Production Build

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

## Contributing

This is a Zama bounty submission. The codebase follows modern React patterns and is designed to showcase FHEVM capabilities in a user-friendly interface.