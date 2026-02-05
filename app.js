// app.js - Main application logic

let scraper, amazonAnalyzer, llmAnalyzer;
let currentResults = [];
let filteredResults = [];
let searchInFlight = false;
let currentPage = 1;
let itemsPerPage = 10;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing app...');
    try {
        initializeApp();
        loadSavedConfig();
        setupEventListeners();
        console.log('✓ App initialization complete');
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        alert('Error initializing app: ' + error.message);
    }
});

function initializeApp() {
    scraper = new RetailScraper();
    amazonAnalyzer = new AmazonAnalyzer();
    llmAnalyzer = new LLMAnalyzer();
    console.log('Retail Arbitrage Scraper initialized');
}

function setupEventListeners() {
    console.log('Setting up event listeners...');

    const configInputs = document.querySelectorAll('.config-item input');
    configInputs.forEach(input => {
        input.addEventListener('change', saveConfig);
    });

    const searchQueryInput = document.getElementById('searchQuery');
    if (searchQueryInput) {
        searchQueryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('Enter key pressed - triggering search');
                searchProducts();
            }
        });
    }

    const retailerSelect = document.getElementById('retailer');
    if (retailerSelect) {
        retailerSelect.addEventListener('change', () => {
            console.log('Retailer changed');
            currentResults = [];
            document.getElementById('results').innerHTML = '';
        });
    }

    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            console.log('Search button clicked');
            searchProducts();
        });
        console.log('✓ Search button listener attached');
    } else {
        console.error('❌ Search button not found!');
    }

    console.log('✓ Event listeners setup complete');
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
        llmApiKey: document.getElementById('llmApiKey').value
    };
    localStorage.setItem('arbScraper_config', JSON.stringify(config));
}

function getConfig() {
    return {
        minPrice: parseFloat(document.getElementById('minPrice').value) || 0,
        minMonthlySales: parseInt(document.getElementById('minMonthlySales').value) || 0,
        minROI: parseFloat(document.getElementById('minROI').value) || 0
    };
}

function formatMoney(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
    return `$${value.toFixed(2)}`;
}

function formatNumber(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
    return value.toLocaleString();
}

// Helper function to update status messages during search
function updateStatus(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessages');
    if (!statusDiv) return;

    const timestamp = new Date().toLocaleTimeString();
    const messageEl = document.createElement('div');
    messageEl.style.marginBottom = '8px';
    messageEl.style.padding = '8px';
    messageEl.style.borderRadius = '4px';
    messageEl.style.borderLeft = '3px solid #667eea';
    messageEl.innerHTML = `<strong>[${timestamp}]</strong> ${message}`;

    if (type === 'success') {
        messageEl.style.borderLeftColor = '#4caf50';
        messageEl.style.backgroundColor = '#f1f8f4';
    } else if (type === 'error') {
        messageEl.style.borderLeftColor = '#f44336';
        messageEl.style.backgroundColor = '#fef5f5';
    } else if (type === 'warning') {
        messageEl.style.borderLeftColor = '#ff9800';
        messageEl.style.backgroundColor = '#fff8f1';
    }

    statusDiv.appendChild(messageEl);
    statusDiv.scrollTop = statusDiv.scrollHeight;
}

function clearStatus() {
    const statusDiv = document.getElementById('statusMessages');
    if (statusDiv) statusDiv.innerHTML = '';
}

async function searchProducts() {
    console.log('=== Search initiated ===');
    const searchBtn = document.getElementById('searchBtn');
    const originalText = searchBtn.textContent;
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';

    const llmKey = document.getElementById('llmApiKey').value;
    amazonAnalyzer = new AmazonAnalyzer();
    llmAnalyzer = new LLMAnalyzer(llmKey);

    try {
        await runSearch();
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = originalText;
    }
}

async function runSearch() {
    if (searchInFlight) {
        console.log('Search already in progress, skipping...');
        return;
    }
    searchInFlight = true;

    const retailer = document.getElementById('retailer').value;
    const query = document.getElementById('searchQuery').value.trim();
    const config = getConfig();

    if (!query) {
        updateStatus('⚠️ Enter a search term or URL before searching.', 'warning');
        searchInFlight = false;
        return;
    }

    console.log(`Starting search for "${query}" on ${retailer}`);

    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').innerHTML = '';
    currentResults = [];
    clearStatus();
    updateStatus(`🔍 Starting search for "<strong>${query}</strong>" on <strong>${retailer.toUpperCase()}</strong>`);

    try {
        updateStatus(`📡 Fetching products from ${retailer.toUpperCase()}...`);
        let products = await scraper.scrapeProducts(retailer, query);
        updateStatus(`✓ Received <strong>${products.length}</strong> products from ${retailer.toUpperCase()}`, 'success');

        if (products.length === 0) {
            updateStatus(`⚠️ No products found on ${retailer.toUpperCase()}. Trying other retailers...`, 'warning');
            const allRetailers = ['walmart', 'walgreens', 'target'];
            const allProducts = [];

            for (const ret of allRetailers) {
                try {
                    updateStatus(`📡 Fetching from ${ret.toUpperCase()}...`);
                    const retProducts = await scraper.scrapeProducts(ret, query);
                    const count = retProducts.length;
                    allProducts.push(...retProducts);
                    if (count > 0) {
                        updateStatus(`✓ Found <strong>${count}</strong> products on ${ret.toUpperCase()}`, 'success');
                    } else {
                        updateStatus(`ℹ️ No products found on ${ret.toUpperCase()}`, 'info');
                    }
                } catch (e) {
                    updateStatus(`❌ Could not fetch from ${ret.toUpperCase()}: ${e.message}`, 'error');
                    console.log(`Could not fetch from ${ret}:`, e.message);
                }
            }

            if (allProducts.length > 0) {
                updateStatus(`🧠 Found <strong>${allProducts.length}</strong> products total. Using intelligent search to rank by relevance...`);
                try {
                    const response = await fetch('/api/intelligent-search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ products: allProducts, query: query })
                    });
                    const data = await response.json();
                    products = data.products || [];
                    updateStatus(`✓ Intelligent search ranked results - showing top <strong>${products.length}</strong>`, 'success');
                    console.log(`Intelligent search returned ${products.length} results`);
                } catch (e) {
                    updateStatus(`⚠️ Intelligent search unavailable, showing all ${allProducts.length} products`, 'warning');
                    console.log('Intelligent search failed, using all products:', e.message);
                    products = allProducts;
                }
            } else {
                updateStatus(`❌ No products found on any retailer matching "${query}"`, 'error');
                showNoResults();
                searchInFlight = false;
                return;
            }
        }

        updateStatus(`📊 Starting analysis of <strong>${products.length}</strong> products...`);

        const analyzedProducts = [];
        let analyzedCount = 0;
        const concurrency = 4;
        let nextIndex = 0;

        async function worker() {
            while (nextIndex < products.length) {
                const index = nextIndex++;
                const product = products[index];
                try {
                    analyzedCount++;
                    updateStatus(`🔬 Analyzing [${analyzedCount}/${products.length}] ${product.title.substring(0, 50)}...`);

                    const analytics = await amazonAnalyzer.analyzeProduct(product);
                    if (!analytics) {
                        updateStatus(`⚠️ Could not get Amazon data for product "${product.title.substring(0, 40)}..."`, 'warning');
                        continue;
                    }

                    const sopValidation = amazonAnalyzer.validateSOP(product, analytics, config);
                    const llmAnalysis = await llmAnalyzer.analyzeProductSuitability(product, analytics);

                    const analyzedProduct = {
                        product: normalizeProduct(product),
                        analytics: analytics,
                        sopValidation: sopValidation,
                        llmAnalysis: llmAnalysis
                    };

                    analyzedProducts.push(analyzedProduct);
                    currentResults.push(analyzedProduct);
                    updateStatus(`✓ Analyzed ${product.title.substring(0, 40)}... - <strong>${llmAnalysis.recommendation}</strong>`, 'success');

                    displayProductCard(analyzedProduct);
                } catch (error) {
                    updateStatus(`❌ Error analyzing "${product.title.substring(0, 40)}...": ${error.message}`, 'error');
                    console.error(`Error analyzing product ${product.id}:`, error);
                }
            }
        }

        await Promise.all(Array.from({ length: concurrency }, () => worker()));

        currentResults = analyzedProducts;
        displayResults(currentResults);
        updateStatus(`✅ Analysis complete! Found <strong>${analyzedProducts.length}</strong> qualifying products`, 'success');
    } catch (error) {
        console.error('Search error:', error);
        updateStatus(`❌ Critical error: ${error.message}`, 'error');
        showError('An error occurred while searching. Please try again.');
    } finally {
        document.getElementById('loading').style.display = 'none';
        searchInFlight = false;
    }
}

function normalizeProduct(product) {
    return {
        ...product,
        originalPrice: typeof product.originalPrice === 'number' ? product.originalPrice : product.price,
        image: product.image || 'https://via.placeholder.com/300x300?text=No+Image'
    };
}

function displayResults(results) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    if (results.length === 0) {
        showNoResults();
        document.getElementById('filterSection').style.display = 'none';
        document.getElementById('paginationControls').style.display = 'none';
        return;
    }

    document.getElementById('filterSection').style.display = 'block';

    filteredResults = [...results];
    currentPage = 1;
    applyFilters();
}

function displayProductCard(result) {
    const resultsContainer = document.getElementById('results');
    const card = createProductCard(result);
    resultsContainer.appendChild(card);
}

function createProductCard(result) {
    const { product, analytics, sopValidation, llmAnalysis } = result;
    const hasAmazonPrice =
        typeof analytics.logistics.buyBoxPrice === 'number' &&
        analytics.logistics.buyBoxPrice > 0;
    const roi = hasAmazonPrice ? amazonAnalyzer.calculateROI(product, analytics) : null;
    const profit = hasAmazonPrice ? calculateProfit(product, analytics) : null;

    const card = document.createElement('div');
    card.className = 'product-card';

    if (llmAnalysis.recommendation === 'BUY' && sopValidation.passed) {
        card.classList.add('profitable');
    } else if (llmAnalysis.recommendation === 'AVOID' || !sopValidation.passed) {
        card.classList.add('rejected');
    } else {
        card.classList.add('warning');
    }

    const amazonUrl = analytics.logistics?.url || (analytics.asin ? `https://www.amazon.com/dp/${analytics.asin}` : '');
    const sopStatus = sopValidation.unknownChecks?.length
        ? 'Partial (unknown data)'
        : sopValidation.passed
            ? '✓ Passed'
            : '✗ Failed';
    const profitColor = profit === null ? '#666' : profit > 0 ? '#4caf50' : '#f44336';
    const roiBadgeClass = roi === null ? 'low' : roi >= 40 ? 'high' : roi >= 25 ? 'medium' : 'low';
    const roiText = roi === null ? 'N/A' : `${roi.toFixed(1)}%`;

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
                <span class="info-value">${formatMoney(product.price)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Was:</span>
                <span class="info-value" style="text-decoration: line-through;">${formatMoney(product.originalPrice)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Amazon Price:</span>
                <span class="info-value">${formatMoney(analytics.logistics.buyBoxPrice)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Est. Profit:</span>
                <span class="info-value" style="color: ${profitColor};">${formatMoney(profit)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">ROI:</span>
                <span class="info-value">
                    <span class="profit-badge ${roiBadgeClass}">
                        ${roiText}
                    </span>
                </span>
            </div>
        </div>

        <div class="amazon-metrics">
            <h4 style="margin-bottom: 10px; color: #667eea;">📊 Amazon Listing</h4>
            <div class="metric-item">
                <span>Rating:</span>
                <strong>${analytics.logistics.rating ?? 'N/A'}</strong>
            </div>
            <div class="metric-item">
                <span>Reviews:</span>
                <strong>${analytics.logistics.reviews ?? 'N/A'}</strong>
            </div>
            <div class="metric-item">
                <span>Monthly Sales:</span>
                <strong>${analytics.salesData.monthlySales ?? 'N/A'}${analytics.salesData.monthlySales ? ' units' : ''}</strong>
            </div>
            <div class="metric-item">
                <span>Sales Rank:</span>
                <strong>${formatNumber(analytics.salesData.salesRank)}</strong>
            </div>
            <div class="metric-item">
                <span>360d Avg Price:</span>
                <strong>${formatMoney(analytics.salesData.avgPrice360Days)}</strong>
            </div>
            <div class="metric-item">
                <span>Price Range:</span>
                <strong>${formatMoney(analytics.salesData.lowestPrice360Days)} - ${formatMoney(analytics.salesData.highestPrice360Days)}</strong>
            </div>
            <div class="metric-item">
                <span>IP Complaints:</span>
                <strong style="color: ${analytics.complaints.hasComplaints ? '#f44336' : '#4caf50'};">
                    ${analytics.complaints.hasComplaints === null ? 'Unknown' : analytics.complaints.hasComplaints ? `⚠️ ${analytics.complaints.count}` : '✓ None'}
                </strong>
            </div>
            <div class="metric-item">
                <span>SOP Check:</span>
                <strong style="color: ${sopValidation.passed ? '#4caf50' : '#f44336'};">
                    ${sopStatus}
                </strong>
            </div>
        </div>

        <div class="llm-analysis">
            <h4>🤖 Analysis</h4>
            <p>${llmAnalysis.analysis.split('\n\n')[0]}</p>
            <div class="recommendation ${llmAnalysis.recommendation.toLowerCase()}">
                ${llmAnalysis.recommendation === 'BUY' ? '✓' : llmAnalysis.recommendation === 'AVOID' ? '✗' : '⚠'}
                ${llmAnalysis.recommendation}
            </div>
        </div>

        <div style="margin-top: 15px; display: flex; gap: 10px;">
            ${product.url && product.url.includes('http') ? `
                <a href="${product.url}" target="_blank" style="flex: 1; padding: 8px; background: #667eea; color: white; text-align: center; text-decoration: none; border-radius: 4px; font-size: 0.9em;">
                    View on ${product.retailer.toUpperCase()}
                </a>
            ` : ''}
            ${amazonUrl ? `
                <a href="${amazonUrl}" target="_blank" style="flex: 1; padding: 8px; background: #ff9900; color: white; text-align: center; text-decoration: none; border-radius: 4px; font-size: 0.9em;">
                    View on Amazon
                </a>
            ` : ''}
        </div>
    `;

    return card;
}

function calculateProfit(product, analytics) {
    const buyPrice = product.price || 0;
    const sellPrice = analytics.logistics.buyBoxPrice;
    if (typeof sellPrice !== 'number' || sellPrice <= 0) {
        return null;
    }
    const fees = sellPrice * 0.15; // Amazon fees
    const shipping = 3.0; // Shipping cost
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

// Pagination functions
function applyFilters() {
    const sortBy = document.getElementById('sortBy')?.value || 'roi';
    const minProfit = parseFloat(document.getElementById('minProfit')?.value || 0);
    const filterRec = document.getElementById('filterRec')?.value || '';

    filteredResults = currentResults.filter(result => {
        const profit = calculateProfit(result.product, result.analytics);
        const recommendation = result.llmAnalysis?.recommendation || '';

        if (profit === null) {
            if (minProfit > 0) return false;
        } else if (profit < minProfit) {
            return false;
        }
        if (filterRec && recommendation !== filterRec) return false;
        return true;
    });

    if (sortBy === 'roi') {
        filteredResults.sort((a, b) => {
            const roiA = a.analytics.logistics.buyBoxPrice ? amazonAnalyzer.calculateROI(a.product, a.analytics) : -Infinity;
            const roiB = b.analytics.logistics.buyBoxPrice ? amazonAnalyzer.calculateROI(b.product, b.analytics) : -Infinity;
            return roiB - roiA;
        });
    } else if (sortBy === 'profit') {
        filteredResults.sort((a, b) => {
            const profitA = calculateProfit(a.product, a.analytics);
            const profitB = calculateProfit(b.product, b.analytics);
            const safeA = profitA === null ? -Infinity : profitA;
            const safeB = profitB === null ? -Infinity : profitB;
            return safeB - safeA;
        });
    } else if (sortBy === 'price') {
        filteredResults.sort((a, b) => a.product.price - b.product.price);
    }

    currentPage = 1;
    displayPaginatedResults();
}

function displayPaginatedResults() {
    const resultsContainer = document.getElementById('results');
    const paginationDiv = document.getElementById('paginationControls');

    if (filteredResults.length === 0) {
        showNoResults();
        paginationDiv.style.display = 'none';
        return;
    }

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const pageResults = filteredResults.slice(startIdx, endIdx);

    resultsContainer.innerHTML = '';
    pageResults.forEach(result => {
        const card = createProductCard(result);
        resultsContainer.appendChild(card);
    });

    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages} (${filteredResults.length} total)`;
    paginationDiv.style.display = 'flex';
}

function nextPage() {
    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayPaginatedResults();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayPaginatedResults();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function changePageSize() {
    itemsPerPage = parseInt(document.getElementById('itemsPerPage').value);
    currentPage = 1;
    displayPaginatedResults();
}

function exportResults() {
    if (filteredResults.length === 0) {
        alert('No results to export');
        return;
    }

    const csv = [
        ['Title', 'Retailer', 'Buy Price', 'Amazon Price', 'Estimated Profit', 'ROI %', 'Recommendation', 'Status'].join(',')
    ];

    filteredResults.forEach(result => {
        const profit = calculateProfit(result.product, result.analytics);
        const roi = result.analytics.logistics.buyBoxPrice
            ? amazonAnalyzer.calculateROI(result.product, result.analytics)
            : null;
        const recommendation = result.llmAnalysis?.recommendation || 'REVIEW';
        const status = result.sopValidation?.passed ? '✓' : '✗';
        
        csv.push([
            `"${result.product.title}"`,
            result.product.retailer,
            result.product.price.toFixed(2),
            typeof result.analytics.logistics.buyBoxPrice === 'number'
                ? result.analytics.logistics.buyBoxPrice.toFixed(2)
                : 'N/A',
            profit === null ? 'N/A' : profit.toFixed(2),
            roi === null ? 'N/A' : roi.toFixed(1),
            recommendation,
            status
        ].join(','));
    });

    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `arbitrage-results-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
