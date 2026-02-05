# 🛒 Retail Arbitrage Scraper

A **100% FREE** local tool for finding profitable retail arbitrage opportunities by analyzing clearance and sale items from major retailers (Walmart, Walgreens, Target) and comparing with Amazon prices.

## 🌟 Key Features

- ✅ **Completely FREE** - No paid APIs required
- ✅ **Runs Locally** - Privacy-focused, your data stays on your machine
- ✅ **Easy Setup** - Clone and run install.sh
- ✅ **No API Keys Needed** - Works out of the box

### Product Analysis
- Scrape clearance/sale items from Walmart, Walgreens, and Target
- Automatic Amazon matching by title (no paid APIs)
- Real-time price comparison and ROI calculation
- Amazon price, rating, and review count (when available)

### Smart Filtering (SOP)
- **Minimum Price Filter**: Set minimum product price thresholds
- **Monthly Sales Requirements**: Filter by minimum sales velocity
- **ROI Thresholds**: Only show products meeting minimum ROI requirements

### Intelligent Analysis
- **Rule-Based Analysis**: Built-in intelligent recommendation system (FREE)
- **Optional LLM Enhancement**: Add OpenRouter API key for AI-powered insights (optional)
- **Risk Assessment**: Identifies IP complaints, competition, margin issues
- **Clear Recommendations**: BUY / REVIEW / AVOID with reasoning

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/AngeloLandiza/Retail-Arb-Scraper.git
cd Retail-Arb-Scraper
```

2. **Run the installer**
```bash
./install.sh
```
To skip Playwright browser downloads:
```bash
SKIP_PLAYWRIGHT=1 ./install.sh
```

3. **Start the application**
```bash
npm start
```

4. **Open your browser**
Navigate to: `http://localhost:3000`

That's it! The tool is now running locally on your machine.

## 📋 How to Use

### 1. Configure Your Criteria (SOP)
Set your Standard Operating Procedure:
- **Minimum Price**: Lowest price you're willing to source (default: $10)
- **Min Monthly Sales**: Minimum monthly sales volume required (default: 50)
- **Minimum ROI**: Required return on investment percentage (default: 30%)

### 2. Search Products
1. Select a retailer (Walmart, Walgreens, or Target)
2. Enter a search term (e.g., "electronics", "kitchen")
3. Click "Search" to find and analyze products

### 3. Review Results
Each product card shows:
- **Pricing**: Buy price vs Amazon price vs profit
- **ROI**: Return on investment percentage
- **Amazon Data**: Rating, reviews, sales rank (when available)
- **Analysis**: Intelligent recommendation with reasoning
- **SOP Status**: Whether product meets your criteria

Color coding:
- 🟢 **Green**: Profitable opportunity (BUY + SOP passed)
- 🟡 **Yellow**: Needs review (REVIEW recommendation)
- 🔴 **Red**: Avoid (Failed SOP or AVOID recommendation)

## 🔧 Technical Details

### How It Works (Free Alternatives)

This tool uses FREE methods instead of paid APIs:

1. **Retailer Data**:
   - Scrapes live HTML/JSON state from Walmart, Target, and Walgreens
   - No API keys, no paid services

2. **Amazon Data** (free lookup):
   - Matches products by title against Amazon search results
   - Uses price-aware matching and type heuristics to avoid bundle/console mismatches
   - Pulls price, rating, and review count when available
   - No Keepa/SellerAmp/PA-API required

3. **Product Analysis** (optional LLM):
   - Built-in rule-based analysis (100% FREE)
   - Optional: OpenRouter API for AI analysis (has free tier)
   - Works without any API keys

### Architecture

```
Retail-Arb-Scraper/
├── server.js              # Express server (handles CORS)
├── index.html             # Main UI
├── app.js                 # Application logic
├── scraper.js             # Retail scraping module
├── amazon-analyzer.js     # Amazon analysis (FREE)
├── llm-analyzer.js        # Rule-based analysis (FREE)
├── install.sh             # Easy setup script
├── package.json           # Dependencies
└── README.md              # Documentation
```

### Free Methods Used

**Amazon Sales Estimation (approximations):**
- BSR < 1,000 → ~2,000 sales/month
- BSR < 5,000 → ~500 sales/month
- BSR < 10,000 → ~250 sales/month
- BSR < 50,000 → ~100 sales/month
- BSR < 100,000 → ~50 sales/month

**Note**: These are rough estimates. Actual sales vary by category, seasonality, and other factors.

**Analysis Algorithm:**
```javascript
✓ ROI >= 30% AND solid listing signals = BUY
✓ ROI < 20% = AVOID
✓ Moderate metrics = REVIEW
✗ IP Complaints = AVOID (always)
```

**Current Implementation:**
- Uses live scraping by default (no mock/sample data)
- Some Amazon metrics (sales rank, monthly sales) are not available for free and show as N/A
- Retailers may rate-limit or block scraping; try different queries or wait and retry

## 💡 Optional Enhancements

### Add LLM Analysis (Optional)
For AI-powered insights, get a free API key from [OpenRouter](https://openrouter.ai):
1. Sign up at openrouter.ai
2. Get your free API key
3. Enter it in the "Optional Features" section
4. Enjoy AI-powered product analysis (still free!)

## 📊 Performance

- **Startup Time**: < 3 seconds
- **Analysis Speed**: ~1 second per product
- **Memory Usage**: ~50MB
- **Cost**: $0 (completely free)

## 🔒 Privacy

- **All data stays local** on your machine
- **No tracking** or analytics
- **No data collection**
- **Optional cloud APIs** only if you provide keys

## 🐛 Troubleshooting

### Port Already in Use
If port 3000 is busy:
```bash
PORT=3001 npm start
```

### Installation Issues
Make sure Node.js v18+ is installed:
```bash
node --version  # Should be v18 or higher
```

### Playwright Not Installed (Walmart/Target Captcha)
If you see "Playwright not installed for fallback":
```bash
npx playwright install
```

### Permission Denied
Make install.sh executable:
```bash
chmod +x install.sh
```

## 🛣️ Roadmap

- [ ] Real retailer scraping (Puppeteer integration)
- [ ] Chrome extension version
- [ ] Advanced filtering options
- [ ] Export results to CSV/Excel
- [ ] Price tracking and alerts
- [ ] Mobile app version

## 📝 License

MIT License - feel free to use for personal or commercial projects.

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Real retailer scraping implementations
- Additional retailer support (Best Buy, Home Depot, etc.)
- Enhanced analytics and visualizations
- Mobile app version
- Better UI/UX

## ⚠️ Disclaimer

This tool is for educational and research purposes. Always:
- Respect retailer terms of service
- Follow Amazon seller policies
- Verify all data before making business decisions
- Check local laws regarding arbitrage
- Understand tax implications
- Use web scraping responsibly and ethically

## 📞 Support

For issues or questions:
- Open a GitHub issue
- Check existing documentation
- Review the troubleshooting section

## 🔗 Useful Resources

- [Amazon Seller Central](https://sellercentral.amazon.com/)
- [OpenRouter API Docs](https://openrouter.ai/docs) (optional)
- [Node.js Documentation](https://nodejs.org/docs)
- [Express.js Guide](https://expressjs.com/)

---

**Happy Arbitraging! 🚀📦💰**
