const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (can be replaced with database later)
let tasks = {};

// Helper function to read tasks from file
const readTasks = () => {
  try {
    const data = fs.readFileSync(path.join('/tmp', 'tasks.json'), 'utf8');
    tasks = JSON.parse(data);
  } catch (err) {
    tasks = {};
  }
};

// Helper function to write tasks to file
const writeTasks = () => {
  try {
    fs.writeFileSync(path.join('/tmp', 'tasks.json'), JSON.stringify(tasks, null, 2));
  } catch (err) {
    console.error('Error writing tasks:', err);
  }
};

// Initialize tasks
readTasks();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Get tasks for a specific user address
app.get('/api/tasks/:address', (req, res) => {
  const { address } = req.params;
  const userTasks = tasks[address] || {};
  res.json(userTasks);
});

// Save or update a task for a user
app.post('/api/tasks/:address', (req, res) => {
  const { address } = req.params;
  const { taskIndex, taskData } = req.body;

  if (!tasks[address]) {
    tasks[address] = {};
  }

  tasks[address][taskIndex] = taskData;
  writeTasks();

  res.json({ success: true, message: 'Task saved successfully' });
});

// Update a specific task
app.put('/api/tasks/:address/:taskIndex', (req, res) => {
  const { address, taskIndex } = req.params;
  const updates = req.body;

  if (!tasks[address] || !tasks[address][taskIndex]) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks[address][taskIndex] = { ...tasks[address][taskIndex], ...updates };
  writeTasks();

  res.json({ success: true, message: 'Task updated successfully' });
});

// Delete a specific task
app.delete('/api/tasks/:address/:taskIndex', (req, res) => {
  const { address, taskIndex } = req.params;

  if (!tasks[address] || !tasks[address][taskIndex]) {
    return res.status(404).json({ error: 'Task not found' });
  }

  delete tasks[address][taskIndex];
  writeTasks();

  res.json({ success: true, message: 'Task deleted successfully' });
});

// Get decrypted tasks list for a user
app.get('/api/decrypted/:address', (req, res) => {
  const { address } = req.params;
  // Return empty array if not found (decrypted tasks are tracked separately)
  const decryptedList = tasks[`${address}_decrypted`] || [];
  res.json(decryptedList);
});

// Save decrypted tasks list for a user
app.post('/api/decrypted/:address', (req, res) => {
  const { address } = req.params;
  const { ids } = req.body;

  tasks[`${address}_decrypted`] = ids || [];
  writeTasks();

  res.json({ success: true, message: 'Decrypted tasks list saved' });
});

// Export for Vercel serverless
module.exports = app;

