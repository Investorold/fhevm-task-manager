# 🚨 Clear localStorage to Fix Data Issues

## Problem
You're seeing "Invalid Date" and "High Priority" after refresh because there's corrupted or missing data in localStorage.

## Solution

Open your browser console (F12 or Cmd+Option+I) and run:

```javascript
// Clear all localStorage data
localStorage.clear();

// Reload the page
location.reload();
```

## After Clearing

1. **Create a NEW encrypted task** (make sure to check the encryption checkbox)
2. **Enter your real title, description, and due date**
3. **Click "Create Task"**
4. **Decrypt the task** to verify it works
5. **Refresh the page** - your data should persist

## Expected Behavior
- ✅ Encrypted tasks show "******* ********" until decrypted
- ✅ Decrypted tasks show your actual data
- ✅ Data persists after refresh
- ✅ No more "Invalid Date" or wrong priority
