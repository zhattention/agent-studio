#!/bin/bash
# Script to install dependencies and start the AI Agent Flow Editor

echo "Setting up AI Agent Flow Editor..."

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "Error: npm could not be found. Please install Node.js first."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Start the development server
echo "Starting development server..."
echo "Once the server is running, open your browser and navigate to: http://localhost:3000"
npm run dev 