// server.js - Local Express server for Retail Arbitrage Scraper
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const { scrapeRetailer, lookupAmazon } = require('./scrapers/retailers');
const { normalizeText } = require('./scrapers/match');
const { TTLCache } = require('./scrapers/cache');

const app = express();
const PORT = process.env.PORT || 3000;

// Valid retailers
const VALID_RETAILERS = ['walmart', 'walgreens', 'target'];

// ASIN validation regex (10 alphanumeric characters)
const ASIN_REGEX = /^[A-Z0-9]{10}$/;

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

// Caches
const searchCache = new TTLCache({ ttlMs: 10 * 60 * 1000, max: 200 });
const amazonCache = new TTLCache({ ttlMs: 30 * 60 * 1000, max: 500 });

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/api/', apiLimiter); // Apply rate limiting to all API routes
app.use(express.static(path.join(__dirname)));

// Serve index.html at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

function rankProducts(products, query) {
    const queryTokens = new Set(normalizeText(query).split(' ').filter(Boolean));
    if (queryTokens.size === 0) return products;

    const scored = products.map(product => {
        const titleTokens = new Set(normalizeText(product.title || '').split(' ').filter(Boolean));
        let score = 0;
        queryTokens.forEach(token => {
            if (titleTokens.has(token)) score += 1;
        });
        return { ...product, _score: score };
    });

    return scored
        .sort((a, b) => b._score - a._score)
        .map(({ _score, ...rest }) => rest);
}

// API endpoint to get Amazon product data by ASIN
app.get('/api/amazon/:asin', async (req, res) => {
    const { asin } = req.params;

    if (!ASIN_REGEX.test(asin)) {
        return res.status(400).json({ error: 'Invalid ASIN format' });
    }

    try {
        const cacheKey = `asin:${asin}`;
        const cached = amazonCache.get(cacheKey);
        if (cached) return res.json(cached);

        const result = await lookupAmazon({ asin });
        if (!result) {
            return res.status(404).json({ error: 'Product not found' });
        }

        amazonCache.set(cacheKey, result);
        res.json(result);
    } catch (error) {
        console.error('Error fetching Amazon data:', error.message);
        res.status(500).json({
            error: 'Failed to fetch Amazon data',
            details: error.message
        });
    }
});

// Amazon lookup by query
app.post('/api/amazon/lookup', async (req, res) => {
    const { query, asin, price } = req.body || {};
    const parsedPrice = typeof price === 'number' ? price : parseFloat(price);

    if (!query && !asin) {
        return res.status(400).json({ error: 'Missing query or asin' });
    }

    if (asin && !ASIN_REGEX.test(asin)) {
        return res.status(400).json({ error: 'Invalid ASIN format' });
    }

    try {
        const priceKey = Number.isFinite(parsedPrice) ? `:price:${parsedPrice}` : '';
        const cacheKey = asin ? `asin:${asin}` : `query:${query}${priceKey}`;
        const cached = amazonCache.get(cacheKey);
        if (cached) return res.json(cached);

        const result = await lookupAmazon({
            query,
            asin,
            price: Number.isFinite(parsedPrice) ? parsedPrice : undefined
        });
        if (!result) {
            return res.status(404).json({ error: 'Product not found' });
        }

        amazonCache.set(cacheKey, result);
        res.json(result);
    } catch (error) {
        console.error('Error fetching Amazon data:', error.message);
        res.status(500).json({
            error: 'Failed to fetch Amazon data',
            details: error.message
        });
    }
});

// API endpoint for retailer scraping
app.post('/api/scrape', async (req, res) => {
    const { retailer, query, limit } = req.body || {};

    if (!VALID_RETAILERS.includes(retailer)) {
        return res.status(400).json({
            error: 'Invalid retailer',
            validRetailers: VALID_RETAILERS
        });
    }

    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
    }

    try {
        const cacheKey = `${retailer}:${query}:${limit || 'default'}`;
        const cached = searchCache.get(cacheKey);
        if (cached) return res.json({ products: cached });

        const products = await scrapeRetailer(retailer, query, {
            limit: Number(limit) || 24
        });

        searchCache.set(cacheKey, products);
        res.json({ products });
    } catch (error) {
        console.error('Error scraping retailer:', error.message);
        res.status(500).json({
            error: 'Failed to scrape retailer',
            details: error.message
        });
    }
});

// API endpoint for intelligent search ranking
app.post('/api/intelligent-search', (req, res) => {
    const { products, query } = req.body || {};

    if (!query || !Array.isArray(products)) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const ranked = rankProducts(products, query);
    res.json({ products: ranked });
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('================================================');
    console.log('  🛒 Retail Arbitrage Scraper');
    console.log('================================================');
    console.log('');
    console.log(`  Server running on: http://localhost:${PORT}`);
    console.log('');
    console.log('  Open your browser and navigate to the URL above');
    console.log('  Press Ctrl+C to stop the server');
    console.log('');
    console.log('================================================');
    console.log('');
});
