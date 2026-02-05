# Live Data Setup (100% Free)

## What's Included

- ✅ **Live Data Scraping** - Walmart, Target, Walgreens, Amazon (no paid APIs)
- ✅ **Caching + Rate Limits** - Faster repeated searches, less blocking
- ✅ **Optional AI Analysis** - OpenRouter free tier (optional)
- ✅ **Pagination + Export** - Handles large result sets smoothly

## Quick Start

```bash
# 1. One-time setup
bash setup.sh

# 2. Run the server (live scraping is default)
npm start

# 3. Open browser
http://localhost:3000
```

## How It Works

- **Retailers:** Scrapes live HTML/JSON state from Walmart/Target/Walgreens.
- **Amazon:** Matches products by title and pulls price/rating/reviews.
- **Analysis:** Rule-based by default, optional OpenRouter AI.

## Optional AI Analysis

1. Sign up at https://openrouter.ai
2. Create a free API key
3. Paste it into the UI (Optional Features section)

If you leave it blank, the app uses free rule-based analysis.

## Performance Notes

- First search may take a few seconds.
- Repeating the same query is much faster due to caching.
- Retailers can throttle or block scraping. If that happens, wait a bit and retry.

## Troubleshooting

- **No results:** Try a more specific query (e.g., "wireless earbuds" instead of "electronics").
- **Scraper errors:** Retailers may be blocking. Wait and try again later.
- **Slow searches:** This is normal for live scraping; caching helps repeat queries.

## Notes

Some Amazon metrics (sales rank, seller count, monthly sales) are not available for free and will show as **N/A**.

Happy arbitrage hunting!
