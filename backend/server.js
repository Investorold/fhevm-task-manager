const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (can be replaced with database later)
let tasks = {};

// Helper function to read tasks from file
const readTasks = () => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'tasks.json'), 'utf8');
    tasks = JSON.parse(data);
  } catch (err) {
    tasks = {};
  }
};

// Helper function to write tasks to file
const writeTasks = () => {
  fs.writeFileSync(path.join(__dirname, 'tasks.json'), JSON.stringify(tasks, null, 2));
};

// Initialize on startup
readTasks();

// Optional: require signed requests for API access (set REQUIRE_SIGNATURE=true)
const REQUIRE_SIGNATURE = process.env.REQUIRE_SIGNATURE === 'true';

const verifySignatureMiddleware = (req, res, next) => {
  if (!REQUIRE_SIGNATURE) return next();
  // Allow health without signature
  if (req.path === '/health') return next();

  try {
    const addr = (req.headers['x-wallet-address'] || '').toString();
    const sig = (req.headers['x-signature'] || '').toString();
    const msg = (req.headers['x-message'] || '').toString();

    if (!addr || !sig || !msg) {
      return res.status(401).json({ error: 'Signature required' });
    }

    const recovered = ethers.verifyMessage(msg, sig);
    if (recovered.toLowerCase() !== addr.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Attach verified address to request
    req.verifiedAddress = recovered;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Signature verification failed' });
  }
};

// Apply signature verification to all API routes
app.use('/api', verifySignatureMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Task Manager Backend is running' });
});

// Get all tasks for a user
app.get('/api/tasks/:userAddress', (req, res) => {
  const { userAddress } = req.params;
  const userTasks = tasks[userAddress] || {};
  res.json(userTasks);
});

// Save task for a user
app.post('/api/tasks/:userAddress', (req, res) => {
  const { userAddress } = req.params;
  const taskData = req.body;
  const { taskIndex } = req.body;
  
  if (!tasks[userAddress]) {
    tasks[userAddress] = {};
  }
  
  // Use blockchain index as key for encrypted tasks
  // Use taskIndex as key
  const key = taskIndex !== undefined ? taskIndex : Object.keys(tasks[userAddress]).length;
  tasks[userAddress][key] = taskData;
  
  writeTasks();
  
  console.log(`Saved task ${key} for user ${userAddress}`);
  res.json({ success: true, taskIndex: key });
});

// Update task
app.put('/api/tasks/:userAddress/:taskIndex', (req, res) => {
  const { userAddress, taskIndex } = req.params;
  const taskData = req.body;
  
  if (!tasks[userAddress] || !tasks[userAddress][taskIndex]) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  tasks[userAddress][taskIndex] = { ...tasks[userAddress][taskIndex], ...taskData };
  writeTasks();
  
  res.json({ success: true });
});

// Delete task
app.delete('/api/tasks/:userAddress/:taskIndex', (req, res) => {
  const { userAddress, taskIndex } = req.params;
  
  if (!tasks[userAddress] || !tasks[userAddress][taskIndex]) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  delete tasks[userAddress][taskIndex];
  writeTasks();
  
  res.json({ success: true });
});

// Mark task as completed
app.post('/api/tasks/:userAddress/:taskIndex/complete', (req, res) => {
  const { userAddress, taskIndex } = req.params;
  
  if (!tasks[userAddress] || !tasks[userAddress][taskIndex]) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  tasks[userAddress][taskIndex].status = 'Completed';
  writeTasks();
  
  res.json({ success: true });
});

// Get decrypted tasks list
app.get('/api/decrypted/:userAddress', (req, res) => {
  const { userAddress } = req.params;
  const decrypted = req.query.ids ? req.query.ids.split(',') : [];
  res.json(decrypted);
});

// Save decrypted tasks list
app.post('/api/decrypted/:userAddress', (req, res) => {
  const { userAddress } = req.params;
  const { ids } = req.body;
  
  if (!tasks[userAddress]) {
    tasks[userAddress] = {};
  }
  
  if (!tasks[userAddress]._decrypted) {
    tasks[userAddress]._decrypted = [];
  }
  
  tasks[userAddress]._decrypted = ids;
  writeTasks();
  
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🚀 Task Manager Backend running on http://localhost:${PORT}`);
  console.log(`📝 API endpoints available at /api/tasks/:userAddress`);
});

