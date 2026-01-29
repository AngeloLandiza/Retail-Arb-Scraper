#!/bin/bash

# Retail Arbitrage Scraper Installation Script
# This script sets up everything needed to run the tool locally

echo "============================================"
echo "  Retail Arbitrage Scraper - Setup"
echo "============================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo ""
    echo "Please install Node.js from https://nodejs.org/"
    echo "Recommended version: 18.x or higher"
    exit 1
fi

echo "✓ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✓ npm found: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "  ✓ Installation Complete!"
    echo "============================================"
    echo ""
    echo "To start the application, run:"
    echo "  npm start"
    echo ""
    echo "Then open your browser to:"
    echo "  http://localhost:3000"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
else
    echo ""
    echo "❌ Installation failed. Please check the errors above."
    exit 1
fi
