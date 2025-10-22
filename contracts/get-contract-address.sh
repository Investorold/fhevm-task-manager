#!/bin/bash

# Script to help get contract address from Termius deployment
# Run this script to get your deployed contract address

echo "🔍 Getting contract address from Termius deployment..."
echo ""

# Check if we can get the contract address from deployments
if [ -f "./deployments/sepolia/TaskManager.json" ]; then
    echo "✅ Found TaskManager deployment on Sepolia:"
    CONTRACT_ADDRESS=$(cat ./deployments/sepolia/TaskManager.json | grep -o '"address":"[^"]*"' | cut -d'"' -f4)
    echo "📍 Contract Address: $CONTRACT_ADDRESS"
    echo ""
    echo "📋 Copy this address to your frontend config:"
    echo "   Update frontend/src/config/contract.ts"
    echo "   Replace TASK_MANAGER_ADDRESS with: $CONTRACT_ADDRESS"
    echo ""
    echo "🌐 Etherscan: https://sepolia.etherscan.io/address/$CONTRACT_ADDRESS"
else
    echo "❌ No deployment found in ./deployments/sepolia/"
    echo ""
    echo "💡 To deploy to Sepolia:"
    echo "   1. Set up your .env file with INFURA_API_KEY"
    echo "   2. Run: npx hardhat deploy --network sepolia"
    echo "   3. Run this script again"
fi

echo ""
echo "🔧 Current frontend configuration:"
echo "   File: frontend/src/config/contract.ts"
echo "   Current address: $(grep 'TASK_MANAGER_ADDRESS' ../frontend/src/config/contract.ts | cut -d"'" -f2)"

