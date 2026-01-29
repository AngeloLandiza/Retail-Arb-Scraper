// server.js - Local Express server for Retail Arbitrage Scraper
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

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

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/', apiLimiter); // Apply rate limiting to all API routes
app.use(express.static(path.join(__dirname)));

// Serve index.html at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint to get Amazon product data
// NOTE: Currently uses mock data for demonstration. 
// Real implementation would require web scraping or Amazon API (with seller account)
app.get('/api/amazon/:asin', async (req, res) => {
    const { asin } = req.params;
    
    // Validate ASIN format
    if (!ASIN_REGEX.test(asin)) {
        return res.status(400).json({ error: 'Invalid ASIN format' });
    }
    
    try {
        // Using mock data for free, legal demonstration
        // To get real data, you would need to implement web scraping (check retailer ToS)
        // or use Amazon Product Advertising API (requires seller account)
        const mockData = await getMockAmazonData(asin);
        
        res.json(mockData);
    } catch (error) {
        console.error('Error fetching Amazon data:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch Amazon data',
            details: error.message 
        });
    }
});

// API endpoint for retailer scraping
// NOTE: Currently uses mock data for demonstration
app.post('/api/scrape', async (req, res) => {
    const { retailer, query } = req.body;
    
    // Validate retailer
    if (!VALID_RETAILERS.includes(retailer)) {
        return res.status(400).json({ 
            error: 'Invalid retailer',
            validRetailers: VALID_RETAILERS 
        });
    }
    
    try {
        // Using mock data for demonstration
        // Real implementation requires web scraping (check retailer terms of service)
        const products = await getMockRetailerProducts(retailer, query);
        res.json({ products });
    } catch (error) {
        console.error('Error scraping retailer:', error.message);
        res.status(500).json({ 
            error: 'Failed to scrape retailer',
            details: error.message 
        });
    }
});

// Mock data functions
// NOTE: These provide sample data for demonstration purposes
// In a production environment with real scraping, replace these with actual data fetching

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
