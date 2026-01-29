// server.test.js - Tests for Express server
const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Create test server instance
function createTestServer() {
    const app = express();
    const VALID_RETAILERS = ['walmart', 'walgreens', 'target'];
    const ASIN_REGEX = /^[A-Z0-9]{10}$/;

    app.use(cors());
    app.use(express.json());

    // Mock Amazon endpoint
    app.get('/api/amazon/:asin', async (req, res) => {
        const { asin } = req.params;
        
        if (!ASIN_REGEX.test(asin)) {
            return res.status(400).json({ error: 'Invalid ASIN format' });
        }
        
        const mockData = {
            asin: asin,
            title: 'Test Product',
            price: 50.00,
            salesRank: 10000,
            category: 'Test',
            sellers: 10,
            fbaOffers: 5,
            reviews: 100,
            rating: 4.5,
            inStock: true
        };
        
        res.json(mockData);
    });

    // Mock scrape endpoint
    app.post('/api/scrape', async (req, res) => {
        const { retailer, query } = req.body;
        
        if (!VALID_RETAILERS.includes(retailer)) {
            return res.status(400).json({ 
                error: 'Invalid retailer',
                validRetailers: VALID_RETAILERS 
            });
        }
        
        const products = [
            {
                id: '1',
                title: 'Test Product',
                retailer: retailer,
                price: 24.99,
                asin: 'B08ASIN001'
            }
        ];
        
        res.json({ products });
    });

    return app;
}

describe('Server API Tests', () => {
    let app;

    beforeAll(() => {
        app = createTestServer();
    });

    describe('GET /api/amazon/:asin', () => {
        test('should return product data for valid ASIN', async () => {
            const response = await request(app)
                .get('/api/amazon/B08ASIN001')
                .expect(200);

            expect(response.body).toHaveProperty('asin', 'B08ASIN001');
            expect(response.body).toHaveProperty('title');
            expect(response.body).toHaveProperty('price');
            expect(response.body).toHaveProperty('salesRank');
        });

        test('should return 400 for invalid ASIN format', async () => {
            const response = await request(app)
                .get('/api/amazon/invalid')
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Invalid ASIN format');
        });

        test('should reject ASIN with special characters', async () => {
            await request(app)
                .get('/api/amazon/B08-ASIN01')
                .expect(400);
        });
    });

    describe('POST /api/scrape', () => {
        test('should return products for valid retailer', async () => {
            const response = await request(app)
                .post('/api/scrape')
                .send({ retailer: 'walmart', query: 'test' })
                .expect(200);

            expect(response.body).toHaveProperty('products');
            expect(Array.isArray(response.body.products)).toBe(true);
        });

        test('should return 400 for invalid retailer', async () => {
            const response = await request(app)
                .post('/api/scrape')
                .send({ retailer: 'invalid', query: 'test' })
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Invalid retailer');
            expect(response.body).toHaveProperty('validRetailers');
        });

        test('should accept all valid retailers', async () => {
            const retailers = ['walmart', 'walgreens', 'target'];
            
            for (const retailer of retailers) {
                const response = await request(app)
                    .post('/api/scrape')
                    .send({ retailer, query: 'test' })
                    .expect(200);

                expect(response.body.products[0].retailer).toBe(retailer);
            }
        });
    });
});
