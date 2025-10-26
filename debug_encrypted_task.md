# 🔍 Debug Steps

After creating an encrypted task, open browser console (F12) and run:

```javascript
// Check localStorage
const tasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
console.log('localStorage tasks:', tasks);

// Check which tasks are marked as decrypted
const decrypted = JSON.parse(localStorage.getItem('decryptedTasks') || '[]');
console.log('Decrypted task IDs:', decrypted);

// Check what's in the state
console.log('All localStorage keys:', Object.keys(localStorage));
```

**Share the console output.**

The issue is that your encrypted task data is being stored at the WRONG index in localStorage, so when you refresh, it can't find the data and shows "Invalid Date" / "High Priority".

