// server.js - Local Express server for Retail Arbitrage Scraper
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Serve index.html at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint to get Amazon product data (free alternative to Keepa)
app.get('/api/amazon/:asin', async (req, res) => {
    const { asin } = req.params;
    
    try {
        // Use Amazon's mobile API endpoint or scrape product page
        // Note: This is a basic implementation. For production, consider using
        // Amazon Product Advertising API or other authorized methods
        
        const amazonUrl = `https://www.amazon.com/dp/${asin}`;
        
        // For now, return mock data. In production, you would scrape or use API
        const mockData = await getMockAmazonData(asin);
        
        res.json(mockData);
    } catch (error) {
        console.error('Error fetching Amazon data:', error.message);
        res.status(500).json({ error: 'Failed to fetch Amazon data' });
    }
});

// Free alternative: Get sales rank and seller data
app.get('/api/amazon/:asin/rank', async (req, res) => {
    const { asin } = req.params;
    
    try {
        // This would use free scraping or API alternatives
        const rankData = await getMockSalesRank(asin);
        res.json(rankData);
    } catch (error) {
        console.error('Error fetching sales rank:', error.message);
        res.status(500).json({ error: 'Failed to fetch sales rank' });
    }
});

// API endpoint for retailer scraping
app.post('/api/scrape', async (req, res) => {
    const { retailer, query } = req.body;
    
    try {
        // In production, implement actual scraping logic
        // For now, return mock data
        const products = await getMockRetailerProducts(retailer, query);
        res.json({ products });
    } catch (error) {
        console.error('Error scraping retailer:', error.message);
        res.status(500).json({ error: 'Failed to scrape retailer' });
    }
});

// Mock data functions (replace with actual implementations)
function getMockAmazonData(asin) {
    const mockData = {
        'B08ASIN001': {
            asin: asin,
            title: 'Wireless Bluetooth Headphones',
            price: 59.99,
            salesRank: 15420,
            category: 'Electronics',
            sellers: 12,
            fbaOffers: 8,
            reviews: 1234,
            rating: 4.5,
            inStock: true
        },
        'B08ASIN002': {
            asin: asin,
            title: 'Kitchen Knife Set',
            price: 74.99,
            salesRank: 8234,
            category: 'Kitchen',
            sellers: 5,
            fbaOffers: 3,
            reviews: 567,
            rating: 4.7,
            inStock: true
        },
        'B08ASIN003': {
            asin: asin,
            title: 'Yoga Mat with Carrying Strap',
            price: 34.99,
            salesRank: 2156,
            category: 'Sports',
            sellers: 18,
            fbaOffers: 15,
            reviews: 2341,
            rating: 4.3,
            inStock: true
        },
        'B08ASIN004': {
            asin: asin,
            title: 'Smart Watch Fitness Tracker',
            price: 99.99,
            salesRank: 1842,
            category: 'Electronics',
            sellers: 8,
            fbaOffers: 6,
            reviews: 3456,
            rating: 4.6,
            inStock: true
        },
        'B08ASIN005': {
            asin: asin,
            title: 'Coffee Maker 12-Cup',
            price: 54.99,
            salesRank: 5621,
            category: 'Kitchen',
            sellers: 15,
            fbaOffers: 10,
            reviews: 891,
            rating: 4.4,
            inStock: true
        }
    };
    
    return mockData[asin] || {
        asin: asin,
        title: 'Unknown Product',
        price: 0,
        salesRank: 999999,
        category: 'Unknown',
        sellers: 0,
        fbaOffers: 0,
        reviews: 0,
        rating: 0,
        inStock: false
    };
}

function getMockSalesRank(asin) {
    // Estimate monthly sales based on BSR (Best Sellers Rank)
    // This is a simplified approximation
    const amazonData = getMockAmazonData(asin);
    const bsr = amazonData.salesRank;
    
    let monthlySales = 0;
    if (bsr < 1000) monthlySales = 2000;
    else if (bsr < 5000) monthlySales = 500;
    else if (bsr < 10000) monthlySales = 250;
    else if (bsr < 50000) monthlySales = 100;
    else if (bsr < 100000) monthlySales = 50;
    else monthlySales = 20;
    
    return {
        asin: asin,
        salesRank: bsr,
        monthlySales: monthlySales,
        avgPrice30Days: amazonData.price * 1.05,
        avgPrice90Days: amazonData.price * 1.08,
        avgPrice360Days: amazonData.price * 1.12,
        lowestPrice360Days: amazonData.price * 0.85,
        highestPrice360Days: amazonData.price * 1.25,
        priceDrops: Math.floor(Math.random() * 5) + 1
    };
}

function getMockRetailerProducts(retailer, query) {
    // Return mock clearance products
    const mockProducts = [
        {
            id: '1',
            title: 'Wireless Bluetooth Headphones - Clearance',
            retailer: retailer,
            price: 24.99,
            originalPrice: 79.99,
            url: `https://www.${retailer}.com/product/1`,
            image: 'https://via.placeholder.com/300x300?text=Headphones',
            asin: 'B08ASIN001',
            clearance: true,
            stock: 'In Stock'
        },
        {
            id: '2',
            title: 'Kitchen Knife Set 15-Piece - Sale',
            retailer: retailer,
            price: 34.99,
            originalPrice: 89.99,
            url: `https://www.${retailer}.com/product/2`,
            image: 'https://via.placeholder.com/300x300?text=Knife+Set',
            asin: 'B08ASIN002',
            clearance: true,
            stock: 'Limited Stock'
        },
        {
            id: '3',
            title: 'Yoga Mat with Carrying Strap - Clearance',
            retailer: retailer,
            price: 15.99,
            originalPrice: 39.99,
            url: `https://www.${retailer}.com/product/3`,
            image: 'https://via.placeholder.com/300x300?text=Yoga+Mat',
            asin: 'B08ASIN003',
            clearance: true,
            stock: 'In Stock'
        },
        {
            id: '4',
            title: 'Smart Watch Fitness Tracker - Sale',
            retailer: retailer,
            price: 45.99,
            originalPrice: 129.99,
            url: `https://www.${retailer}.com/product/4`,
            image: 'https://via.placeholder.com/300x300?text=Smart+Watch',
            asin: 'B08ASIN004',
            clearance: true,
            stock: 'In Stock'
        },
        {
            id: '5',
            title: 'Coffee Maker 12-Cup Programmable - Clearance',
            retailer: retailer,
            price: 29.99,
            originalPrice: 69.99,
            url: `https://www.${retailer}.com/product/5`,
            image: 'https://via.placeholder.com/300x300?text=Coffee+Maker',
            asin: 'B08ASIN005',
            clearance: true,
            stock: 'Low Stock'
        }
    ];
    
    // Filter by query if provided
    if (query && query.trim()) {
        return mockProducts.filter(p => 
            p.title.toLowerCase().includes(query.toLowerCase())
        );
    }
    
    return mockProducts;
}

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
