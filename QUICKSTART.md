# ⚡ Quick Start - 30 Seconds

## TL;DR

```bash
# 1. Setup (one time)
bash setup.sh

# 2. Run
npm start                 # Live scraping (no mock data)

# 3. Open
http://localhost:3000

# 4. Search
Type: "yoga mat" → Click Search → See results

# 5. Bonus: AI Analysis (optional)
# Add a free OpenRouter key in the UI
```

## What You Get

✅ **Live Prices** (no mock data) - Actual arbitrage opportunities  
✅ **AI Analysis** (optional) - OpenRouter recommendations
✅ **Pagination** - 100+ results no problem
✅ **Filtering** - Sort by ROI, Profit, Price
✅ **Export** - Download as CSV

## Commands

```bash
# Setup
bash setup.sh

# Run normal
npm start

# Run with logs
DEBUG=* npm start
npm start 2>&1 | tee server.log

# Stop server
Ctrl+C
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 in use | `lsof -i :3000` then `kill -9 <PID>` |
| No results | Try different search term or wait and retry |
| OpenRouter error | Leave API key blank to use free rule-based analysis |

## File Changes Since Last Version

- ✅ Added live Node.js scrapers (cheerio + HTML/JSON parsing)
- ✅ Added pagination (5/10/20/50 per page)
- ✅ Added filtering (ROI, Profit, Recommendation)
- ✅ Added CSV export
- ✅ Updated server.js for live scraping + caching

---

**Start now:** `bash setup.sh && npm start` then visit http://localhost:3000

That's it! 🎉
