// app.js - Main application logic

let scraper, amazonAnalyzer, llmAnalyzer;
let currentResults = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadSavedConfig();
    setupEventListeners();
});

function initializeApp() {
    scraper = new RetailScraper();
    amazonAnalyzer = new AmazonAnalyzer();
    llmAnalyzer = new LLMAnalyzer();
    console.log('Retail Arbitrage Scraper initialized');
}

function setupEventListeners() {
    // Save config on change
    const configInputs = document.querySelectorAll('.config-item input');
    configInputs.forEach(input => {
        input.addEventListener('change', saveConfig);
    });

    // Enter key to search
    document.getElementById('searchQuery').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchProducts();
        }
    });
}

function loadSavedConfig() {
    const config = localStorage.getItem('arbScraper_config');
    if (config) {
        const data = JSON.parse(config);
        Object.keys(data).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = data[key];
            }
        });
    }
}

function saveConfig() {
    const config = {
        minPrice: document.getElementById('minPrice').value,
        minMonthlySales: document.getElementById('minMonthlySales').value,
        minROI: document.getElementById('minROI').value,
        maxSellers: document.getElementById('maxSellers').value,
        keepaApiKey: document.getElementById('keepaApiKey').value,
        sellerampApiKey: document.getElementById('sellerampApiKey').value,
        llmApiKey: document.getElementById('llmApiKey').value
    };
    localStorage.setItem('arbScraper_config', JSON.stringify(config));
}

function getConfig() {
    return {
        minPrice: parseFloat(document.getElementById('minPrice').value) || 0,
        minMonthlySales: parseInt(document.getElementById('minMonthlySales').value) || 0,
        minROI: parseFloat(document.getElementById('minROI').value) || 0,
        maxSellers: parseInt(document.getElementById('maxSellers').value) || 999
    };
}

async function searchProducts() {
    const retailer = document.getElementById('retailer').value;
    const query = document.getElementById('searchQuery').value.trim();
    const config = getConfig();

    // Update analyzer instances with API keys
    const keepaKey = document.getElementById('keepaApiKey').value;
    const sellerampKey = document.getElementById('sellerampApiKey').value;
    const llmKey = document.getElementById('llmApiKey').value;

    amazonAnalyzer = new AmazonAnalyzer(keepaKey, sellerampKey);
    llmAnalyzer = new LLMAnalyzer(llmKey);

    // Show loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').innerHTML = '';
    currentResults = [];

    try {
        // Step 1: Scrape retail products
        console.log('Scraping products...');
        const products = await scraper.scrapeProducts(retailer, query);

        if (products.length === 0) {
            showNoResults();
            return;
        }

        // Step 2: Analyze each product
        console.log(`Analyzing ${products.length} products...`);
        const analyzedProducts = [];

        for (const product of products) {
            try {
                // Get Amazon analytics
                const analytics = await amazonAnalyzer.analyzeProduct(product.asin);
                
                // Validate against SOP
                const sopValidation = amazonAnalyzer.validateSOP(product, analytics, config);
                
                // Get LLM analysis
                const llmAnalysis = await llmAnalyzer.analyzeProductSuitability(product, analytics);

                analyzedProducts.push({
                    product: product,
                    analytics: analytics,
                    sopValidation: sopValidation,
                    llmAnalysis: llmAnalysis
                });
            } catch (error) {
                console.error(`Error analyzing product ${product.id}:`, error);
            }
        }

        currentResults = analyzedProducts;
        displayResults(analyzedProducts);

    } catch (error) {
        console.error('Search error:', error);
        showError('An error occurred while searching. Please try again.');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function displayResults(results) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    if (results.length === 0) {
        showNoResults();
        return;
    }

    // Sort by ROI (highest first)
    results.sort((a, b) => {
        const roiA = amazonAnalyzer.calculateROI(a.product, a.analytics);
        const roiB = amazonAnalyzer.calculateROI(b.product, b.analytics);
        return roiB - roiA;
    });

    results.forEach(result => {
        const card = createProductCard(result);
        resultsContainer.appendChild(card);
    });
}

function createProductCard(result) {
    const { product, analytics, sopValidation, llmAnalysis } = result;
    const roi = amazonAnalyzer.calculateROI(product, analytics);
    const profit = calculateProfit(product, analytics);

    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Add class based on recommendation
    if (llmAnalysis.recommendation === 'BUY' && sopValidation.passed) {
        card.classList.add('profitable');
    } else if (llmAnalysis.recommendation === 'AVOID' || !sopValidation.passed) {
        card.classList.add('rejected');
    } else {
        card.classList.add('warning');
    }

    card.innerHTML = `
        <img src="${product.image}" alt="${product.title}" class="product-image" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'">
        
        <div class="product-title">${product.title}</div>
        
        <div class="product-info">
            <div class="info-row">
                <span class="info-label">Retailer:</span>
                <span class="info-value">${product.retailer.toUpperCase()}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Buy Price:</span>
                <span class="info-value">$${product.price.toFixed(2)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Was:</span>
                <span class="info-value" style="text-decoration: line-through;">$${product.originalPrice.toFixed(2)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Amazon Price:</span>
                <span class="info-value">$${analytics.logistics.buyBoxPrice.toFixed(2)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Est. Profit:</span>
                <span class="info-value" style="color: ${profit > 0 ? '#4caf50' : '#f44336'};">$${profit.toFixed(2)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">ROI:</span>
                <span class="info-value">
                    <span class="profit-badge ${roi >= 40 ? 'high' : roi >= 25 ? 'medium' : 'low'}">
                        ${roi.toFixed(1)}%
                    </span>
                </span>
            </div>
        </div>

        <div class="amazon-metrics">
            <h4 style="margin-bottom: 10px; color: #667eea;">📊 Amazon Logistics</h4>
            <div class="metric-item">
                <span>Total Sellers:</span>
                <strong>${analytics.logistics.sellers}</strong>
            </div>
            <div class="metric-item">
                <span>FBA Sellers:</span>
                <strong>${analytics.logistics.fbaOffers}</strong>
            </div>
            <div class="metric-item">
                <span>Monthly Sales:</span>
                <strong>${analytics.salesData.monthlySales} units</strong>
            </div>
            <div class="metric-item">
                <span>Sales Rank:</span>
                <strong>#${analytics.salesData.salesRank.toLocaleString()}</strong>
            </div>
            <div class="metric-item">
                <span>360d Avg Price:</span>
                <strong>$${analytics.salesData.avgPrice360Days.toFixed(2)}</strong>
            </div>
            <div class="metric-item">
                <span>Price Range:</span>
                <strong>$${analytics.salesData.lowestPrice360Days.toFixed(2)} - $${analytics.salesData.highestPrice360Days.toFixed(2)}</strong>
            </div>
            <div class="metric-item">
                <span>IP Complaints:</span>
                <strong style="color: ${analytics.complaints.hasComplaints ? '#f44336' : '#4caf50'};">
                    ${analytics.complaints.hasComplaints ? '⚠️ ' + analytics.complaints.count : '✓ None'}
                </strong>
            </div>
            <div class="metric-item">
                <span>SOP Check:</span>
                <strong style="color: ${sopValidation.passed ? '#4caf50' : '#f44336'};">
                    ${sopValidation.passed ? '✓ Passed' : '✗ Failed'}
                </strong>
            </div>
        </div>

        <div class="llm-analysis">
            <h4>🤖 AI Analysis</h4>
            <p>${llmAnalysis.analysis.split('\n\n')[0]}</p>
            <div class="recommendation ${llmAnalysis.recommendation.toLowerCase()}">
                ${llmAnalysis.recommendation === 'BUY' ? '✓' : llmAnalysis.recommendation === 'AVOID' ? '✗' : '⚠'} 
                ${llmAnalysis.recommendation}
            </div>
        </div>

        <div style="margin-top: 15px; display: flex; gap: 10px;">
            <a href="${product.url}" target="_blank" style="flex: 1; padding: 8px; background: #667eea; color: white; text-align: center; text-decoration: none; border-radius: 4px; font-size: 0.9em;">
                View on ${product.retailer.toUpperCase()}
            </a>
            <a href="https://www.amazon.com/dp/${product.asin}" target="_blank" style="flex: 1; padding: 8px; background: #ff9900; color: white; text-align: center; text-decoration: none; border-radius: 4px; font-size: 0.9em;">
                View on Amazon
            </a>
        </div>
    `;

    return card;
}

function calculateProfit(product, analytics) {
    const buyPrice = product.price;
    const sellPrice = analytics.logistics.buyBoxPrice;
    const fees = sellPrice * 0.15; // Amazon fees
    const shipping = 3.00; // Shipping cost
    return sellPrice - buyPrice - fees - shipping;
}

function showNoResults() {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = `
        <div class="no-results">
            <h3>No products found</h3>
            <p>Try adjusting your search query or filters</p>
        </div>
    `;
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = `
        <div class="error-message">
            <strong>Error:</strong> ${message}
        </div>
    `;
    document.getElementById('loading').style.display = 'none';
}
