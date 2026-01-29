#!/bin/bash

# Retail Arbitrage Scraper - Unix/Mac Start Script

echo "============================================"
echo "  Retail Arbitrage Scraper"
echo "============================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo ""
    echo "Please install Node.js from https://nodejs.org/"
    echo "Recommended version: 18.x or higher"
    exit 1
fi

echo "Starting server..."
echo ""
echo "Open your browser to: http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo ""

npm start
