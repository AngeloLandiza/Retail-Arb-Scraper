# Retail Arbitrage Scraper - Complete Edition

## 🎯 What It Does

Finds profitable retail arbitrage opportunities by:
1. Scraping products from Walmart, Target, Walgreens
2. Comparing prices with Amazon
3. Calculating profit & ROI
4. Providing BUY/REVIEW/AVOID recommendations
5. Displaying results with pagination and filters
6. Exporting to CSV for spreadsheets

## 🚀 Quick Start

### Install Dependencies
```bash
bash setup.sh
```

### Run (Live Scraping is Default)
```bash
npm start
```

### Optional AI Analysis (OpenRouter)
1. Sign up at https://openrouter.ai
2. Create a free API key
3. Paste it into the UI (Optional Features)

## 📊 Features

### Search & Display
- ✅ Search Walmart, Target, Walgreens
- ✅ Real-time product display
- ✅ Shows: Price, Profit, ROI, Amazon Comparison
- ✅ Clean product cards with images

### Advanced Filtering
- Sort by: ROI, Profit, or Price
- Filter by: Minimum Profit, Recommendation (BUY/AVOID)
- Real-time filter updates

### Pagination
- Handle 100+ results without slowdown
- 5, 10, 20, 50 items per page

### Export
- Download results as CSV
- Open in Excel/Google Sheets
- Includes all metrics (Price, Profit, ROI, etc.)

### AI Analysis (Optional)
- Free rule-based analysis by default
- Optional OpenRouter LLM recommendations
- No paid APIs required

## 📁 File Structure

```
Retail-Arb-Scraper/
├── scrapers/
│   ├── retailers/         # Walmart/Target/Walgreens/Amazon scrapers
│   ├── cache.js           # TTL cache for faster repeat queries
│   ├── http.js            # Fetch helpers + timeouts
│   ├── match.js           # Title matching
│   └── parse.js           # HTML/JSON parsing helpers
├── app.js                 # Main frontend logic
├── server.js              # Express backend + scrapers
├── index.html             # UI with filters & pagination
├── styles.css             # Styling (updated)
├── setup.sh               # One-command setup
└── SETUP_LIVE_DATA.md     # Detailed setup guide
```

## 🔍 How It Works

1. Frontend sends a search request
2. Server scrapes retailer pages and returns live products
3. Server finds best Amazon match for each product
4. Frontend analyzes ROI and shows recommendations

## 📈 Performance

- First search: a few seconds (live scraping)
- Repeat searches: faster due to caching
- Completely free (no paid APIs)

## 🛠️ Troubleshooting

### "No results found"
- Try different search terms
- Retailers may be throttling; wait and retry

### "Amazon price is N/A"
- Amazon match could not be found for that product
- Try a more specific search query

### Port 3000 in use
```bash
lsof -i :3000
kill -9 <PID>
```

## 📊 Data Fields

Each product shows:
- **Title** - Product name
- **Retailer** - Where to buy (Walmart/Target/Walgreens)
- **Buy Price** - Retail price
- **Was** - Original price
- **Amazon Price** - Current Amazon price (if found)
- **Est. Profit** - Profit after fees & shipping
- **ROI** - Return on Investment percentage
- **AI Recommendation** - BUY/REVIEW/AVOID

## 🔐 Legal Notes

- Uses public retailer data
- Includes delays to reduce load
- Educational use only
- Check retailer ToS before commercial use

## 🚀 Next Steps

1. ✅ Run `bash setup.sh`
2. ✅ Run `npm start`
3. ✅ Search: "yoga mat", "headphones", "coffee maker"
4. ✅ Filter & export results

---

**Happy Arbitrage Hunting!**
