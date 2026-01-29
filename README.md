# 🛒 Retail Arbitrage Scraper

A powerful GitHub Pages tool for finding profitable retail arbitrage opportunities by scraping clearance and sale items from major retailers (Walmart, Walgreens, Target) and analyzing their resale potential on Amazon.

## 🌟 Features

### Product Scraping
- Scrape clearance/sale items from Walmart, Walgreens, and Target
- Automatic ASIN matching to Amazon products
- Real-time price comparison

### Standard Operating Procedure (SOP) Filtering
- **Minimum Price Filter**: Set minimum product price thresholds
- **Monthly Sales Requirements**: Filter by minimum sales velocity
- **ROI Thresholds**: Only show products meeting minimum ROI requirements
- **Seller Competition Limits**: Avoid oversaturated markets

### Amazon Logistics Analysis
- **Seller Count**: Track total number of sellers and FBA vs FBM ratio
- **Price History**: Analyze prices over past 360 days
- **Sales Data**: Monthly sales estimates and sales rank
- **IP Complaints**: Detect intellectual property complaints and trademark issues
- **Buy Box Analysis**: Current buy box price tracking

### AI-Powered Product Analysis
- **LLM Integration**: Uses free LLM API (via OpenRouter) for intelligent analysis
- **Suitability Assessment**: AI determines if product is good for reselling
- **Risk Evaluation**: Identifies potential issues (competition, IP, margins)
- **Recommendations**: Clear BUY/REVIEW/AVOID recommendations

### API Integrations
- **Keepa API**: Historical pricing and sales data
- **SellerAmp API**: Advanced product analysis
- **OpenRouter LLM**: Free AI model for product reasoning

## 🚀 Live Demo

Visit the GitHub Pages site: `https://[username].github.io/Retail-Arb-Scraper/`

## 📋 How to Use

### 1. Configuration
Set your Standard Operating Procedure (SOP) criteria:
- **Minimum Price**: Lowest price you're willing to source (default: $10)
- **Min Monthly Sales**: Minimum monthly sales volume required (default: 50)
- **Minimum ROI**: Required return on investment percentage (default: 30%)
- **Max Sellers**: Maximum number of competing sellers (default: 20)

### 2. API Keys (Optional but Recommended)
For enhanced features, add API keys:
- **Keepa API**: Get historical price data and sales estimates
  - Sign up at [keepa.com](https://keepa.com)
  - API keys start at €15/month for 100k requests
  
- **SellerAmp API**: Get advanced product analysis
  - Sign up at [selleramp.com](https://selleramp.com)
  
- **LLM API Key**: For AI-powered analysis
  - Get free API key from [openrouter.ai](https://openrouter.ai)
  - Free tier includes access to Meta Llama models

**Note**: The tool works without API keys using simulated data for demonstration.

### 3. Search Products
1. Select a retailer (Walmart, Walgreens, or Target)
2. Enter a search term or product URL
3. Click "Search" to find and analyze products

### 4. Review Results
Each product card shows:
- **Pricing**: Buy price vs Amazon price
- **Profit Metrics**: Estimated profit and ROI
- **Amazon Logistics**: Sellers, sales, rank, price history
- **IP Status**: Any trademark/IP complaints
- **SOP Validation**: Whether product meets your criteria
- **AI Analysis**: LLM recommendation and reasoning

Color coding:
- 🟢 **Green**: Profitable opportunity (BUY + SOP passed)
- 🟡 **Yellow**: Needs review (REVIEW recommendation)
- 🔴 **Red**: Avoid (Failed SOP or AVOID recommendation)

## 🏗️ Project Structure

```
Retail-Arb-Scraper/
├── index.html              # Main UI
├── styles.css              # Styling
├── app.js                  # Main application logic
├── scraper.js              # Retail scraping module
├── amazon-analyzer.js      # Amazon logistics analysis
├── llm-analyzer.js         # AI-powered analysis
├── config.example.json     # Example configuration
└── README.md               # Documentation
```

## 🔧 Technical Details

### Retail Scraping
Due to CORS restrictions in browsers, the current implementation uses simulated data. For production use:
- Implement a backend proxy service
- Use a browser extension
- Deploy serverless functions (AWS Lambda, Cloudflare Workers)

### Amazon Data
Mock data is provided for demonstration. In production:
- Use Amazon Product Advertising API
- Integrate with Keepa API for historical data
- Use SellerAmp API for detailed analytics

### LLM Analysis
Uses OpenRouter to access free LLM models:
- Default model: `meta-llama/llama-3.2-3b-instruct:free`
- System prompt optimized for retail arbitrage analysis
- Evaluates: profitability, competition, IP risks, demand stability

## 📊 SOP Validation Logic

Products are validated against your SOP criteria:

```javascript
✓ Price >= Minimum Price
✓ Monthly Sales >= Min Monthly Sales  
✓ Total Sellers <= Max Sellers
✓ ROI >= Minimum ROI
✓ No IP Complaints
```

All criteria must pass for SOP validation.

## 🤖 AI Analysis System

The LLM analyzes products considering:

1. **Profit Potential**: ROI, margins, fees
2. **Market Saturation**: Seller count, FBA ratio
3. **Legal Risks**: IP complaints, brand restrictions
4. **Demand Stability**: Sales velocity, rank trends
5. **Price Volatility**: Historical price fluctuations

Output format:
- Brief analysis (2-3 sentences)
- Clear recommendation: BUY / REVIEW / AVOID
- Key risk or opportunity

## 🛠️ Development

### Local Development
1. Clone the repository
2. Open `index.html` in a browser
3. No build process required - pure HTML/CSS/JS

### Deploying to GitHub Pages
1. Push code to `main` branch
2. Go to Settings > Pages
3. Select branch to deploy
4. Site will be available at `https://[username].github.io/Retail-Arb-Scraper/`

### Adding Real Scraping
To add actual retail scraping:

1. **Backend Proxy**: Create a Node.js/Python backend
2. **Browser Extension**: Build Chrome/Firefox extension
3. **Serverless**: Deploy AWS Lambda functions

Example backend endpoint:
```javascript
// Backend API endpoint
app.post('/api/scrape', async (req, res) => {
  const { retailer, query } = req.body;
  const products = await scrapeRetailer(retailer, query);
  res.json({ products });
});
```

### API Integration

#### Keepa API Example:
```javascript
async fetchKeepaData(asin) {
  const response = await fetch(
    `https://api.keepa.com/product?key=${this.keepaApiKey}&domain=1&asin=${asin}`
  );
  return await response.json();
}
```

#### OpenRouter LLM Example:
```javascript
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'meta-llama/llama-3.2-3b-instruct:free',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: productData }
    ]
  })
});
```

## 📝 License

MIT License - feel free to use for personal or commercial projects.

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Real retailer scraping implementations
- Additional retailer support
- Enhanced analytics
- Mobile app version
- Chrome extension

## ⚠️ Disclaimer

This tool is for educational and research purposes. Always:
- Respect retailer terms of service
- Follow Amazon seller policies
- Verify all data before making business decisions
- Check local laws regarding arbitrage
- Understand tax implications

## 📞 Support

For issues or questions:
- Open a GitHub issue
- Check existing documentation
- Review API provider documentation

## 🔗 Useful Links

- [Amazon Seller Central](https://sellercentral.amazon.com/)
- [Keepa Documentation](https://keepa.com/#!api)
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [SellerAmp](https://selleramp.com/)

---

**Happy Arbitraging! 🚀📦💰**