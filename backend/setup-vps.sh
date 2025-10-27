#!/bin/bash
# Backend Setup Script for VPS
echo "🚀 Setting up Task Manager Backend on VPS..."

# Go to backend directory
cd ~/Zama/fhevm-task-manager/backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Start backend with PM2 or directly
echo "🔄 Starting backend server..."

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    echo "📡 Starting backend with PM2..."
    pm2 start server.js --name task-manager-backend
    pm2 save
    echo "✅ Backend started with PM2 (will auto-restart on reboot)"
else
    echo "⚠️ PM2 not found. Install with: npm install -g pm2"
    echo "🔄 Starting backend directly (will stop when you close terminal)..."
    node server.js
fi

