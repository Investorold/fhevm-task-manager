# Wallet Connection Troubleshooting Guide

## Common Issues and Solutions

### 1. MetaMask Provider Conflict Error
**Error:** `Cannot set property ethereum of #<Window> which has only a getter`

**Cause:** Multiple wallet extensions installed (MetaMask, Coinbase Wallet, Trust Wallet, etc.)

**Solution:** 
- ✅ **Automatic Fix Applied** - Our app now automatically resolves this conflict
- The app will prefer MetaMask if available, otherwise use any available wallet
- You should see "Multiple Wallets Detected" info message

### 2. Wallet Popup Not Appearing
**Symptoms:** Click "Connect Wallet" but no popup appears

**Solutions:**
1. **Check if wallet is unlocked** - Make sure your wallet extension is unlocked
2. **Try the refresh button** - Click "🔄 Refresh Wallet Detection"
3. **Check browser console** - Look for error messages
4. **Try different wallet** - If you have multiple wallets, try switching

### 3. Connection Request Already Pending
**Error:** `Connection request already pending`

**Solution:**
- Check your wallet extension for pending connection requests
- Approve or reject the existing request
- Try connecting again

### 4. No Wallet Found
**Error:** `No EVM wallet found`

**Solutions:**
1. **Install a wallet** - Download MetaMask, Trust Wallet, or Coinbase Wallet
2. **Enable wallet** - Make sure the wallet extension is enabled in your browser
3. **Refresh page** - Try refreshing the browser page

### 5. FHEVM Relayer Issues
**Error:** `backend connection task has stopped`

**Solution:**
- ✅ **Automatic Fallback** - The app will offer to create tasks locally
- Click "OK" when prompted to create demo tasks
- The relayer issues are temporary and will resolve

## Debug Information

To get detailed debug information, open browser console (F12) and look for:
- `🔧 Provider Conflict Resolver...`
- `🔧 Multiple providers detected: X`
- `✅ Provider conflict resolved`

## Manual Testing

Run this in browser console to test wallet connection:
```javascript
// Test wallet detection
console.log('window.ethereum:', !!window.ethereum);
console.log('Selected provider:', window.__selectedProvider);

// Test connection
if (window.ethereum) {
  window.ethereum.request({ method: 'eth_requestAccounts' })
    .then(accounts => console.log('Connected:', accounts))
    .catch(error => console.error('Connection failed:', error));
}
```

