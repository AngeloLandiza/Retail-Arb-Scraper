#!/bin/bash

# start-live.sh - Start server (live scraping is default)

echo "Starting Retail Arbitrage Scraper (live scraping)..."
echo ""
echo "⚠️  Note: Live scraping can be slow. Retailers may throttle requests."
echo ""

node server.js
