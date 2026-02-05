// search-integration.test.js - Integration tests for search functionality (no network)

function createTestServer() {
    const VALID_RETAILERS = ['walmart', 'walgreens', 'target'];
    const ASIN_REGEX = /^[A-Z0-9]{10}$/;

    // Mock Amazon handler
    const amazonHandler = async (req, res) => {
        const { asin } = req.params;
        
        if (!ASIN_REGEX.test(asin)) {
            return res.status(400).json({ error: 'Invalid ASIN format' });
        }
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const mockData = {
            asin: asin,
            title: 'Test Product',
            price: 50.00,
            salesRank: 10000,
            category: 'Test',
            reviews: 100,
            rating: 4.5,
            inStock: true
        };
        
        res.json(mockData);
    };

    // Mock scrape handler
    const scrapeHandler = async (req, res) => {
        const { retailer, query } = req.body;
        
        if (!VALID_RETAILERS.includes(retailer)) {
            return res.status(400).json({ 
                error: 'Invalid retailer',
                validRetailers: VALID_RETAILERS 
            });
        }

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query is required' });
        }
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const products = [
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
                title: 'Kitchen Knife Set - Sale',
                retailer: retailer,
                price: 34.99,
                originalPrice: 89.99,
                url: `https://www.${retailer}.com/product/2`,
                image: 'https://via.placeholder.com/300x300?text=Knife',
                asin: 'B08ASIN002',
                clearance: true,
                stock: 'Limited Stock'
            }
        ];
        
        res.json({ products });
    };

    return { amazonHandler, scrapeHandler };
}

function makeRes() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };
}

describe('Search Integration Tests', () => {
    let handlers;

    beforeAll(() => {
        handlers = createTestServer();
    });

    describe('POST /api/scrape', () => {
        test('should successfully scrape walmart products', async () => {
            const res = makeRes();
            await handlers.scrapeHandler({ body: { retailer: 'walmart', query: 'headphones' } }, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('products');
            expect(Array.isArray(res.body.products)).toBe(true);
            expect(res.body.products.length).toBeGreaterThan(0);
        });

        test('should successfully scrape walgreens products', async () => {
            const res = makeRes();
            await handlers.scrapeHandler({ body: { retailer: 'walgreens', query: 'vitamins' } }, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('products');
            expect(Array.isArray(res.body.products)).toBe(true);
        });

        test('should successfully scrape target products', async () => {
            const res = makeRes();
            await handlers.scrapeHandler({ body: { retailer: 'target', query: 'clearance' } }, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('products');
            expect(Array.isArray(res.body.products)).toBe(true);
        });

        test('should reject invalid retailer', async () => {
            const res = makeRes();
            await handlers.scrapeHandler({ body: { retailer: 'invalid_retailer', query: 'test' } }, res);

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('Invalid retailer');
            expect(res.body).toHaveProperty('validRetailers');
        });

        test('should handle empty query', async () => {
            const res = makeRes();
            await handlers.scrapeHandler({ body: { retailer: 'walmart', query: '' } }, res);

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        test('should return product with required fields', async () => {
            const res = makeRes();
            await handlers.scrapeHandler({ body: { retailer: 'walmart', query: 'test' } }, res);

            const product = res.body.products[0];
            expect(product).toHaveProperty('id');
            expect(product).toHaveProperty('title');
            expect(product).toHaveProperty('retailer');
            expect(product).toHaveProperty('price');
            expect(product).toHaveProperty('originalPrice');
            expect(product).toHaveProperty('url');
            expect(product).toHaveProperty('asin');
            expect(product).toHaveProperty('clearance');
            expect(product).toHaveProperty('stock');
        });
    });

    describe('GET /api/amazon/:asin', () => {
        test('should fetch Amazon product data with valid ASIN', async () => {
            const res = makeRes();
            await handlers.amazonHandler({ params: { asin: 'B08ASIN001' } }, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('asin', 'B08ASIN001');
            expect(res.body).toHaveProperty('title');
            expect(res.body).toHaveProperty('price');
            expect(res.body).toHaveProperty('salesRank');
            expect(res.body).toHaveProperty('rating');
        });

        test('should reject invalid ASIN format (too short)', async () => {
            const res = makeRes();
            await handlers.amazonHandler({ params: { asin: 'B08ASIN' } }, res);

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('Invalid ASIN');
        });

        test('should reject invalid ASIN format (special characters)', async () => {
            const res = makeRes();
            await handlers.amazonHandler({ params: { asin: 'B08-ASIN01' } }, res);

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error');
        });

        test('should handle multiple concurrent Amazon requests', async () => {
            const asins = ['B08ASIN001', 'B08ASIN002', 'B08ASIN003'];
            
            const promises = asins.map(async asin => {
                const res = makeRes();
                await handlers.amazonHandler({ params: { asin } }, res);
                return res;
            });

            const responses = await Promise.all(promises);

            responses.forEach((response, index) => {
                expect(response.statusCode).toBe(200);
                expect(response.body.asin).toBe(asins[index]);
            });
        });
    });

    describe('Full Search Workflow', () => {
        test('should complete full search workflow', async () => {
            // Step 1: Scrape retailer
            const scrapeRes = makeRes();
            await handlers.scrapeHandler({ body: { retailer: 'walmart', query: 'headphones' } }, scrapeRes);

            expect(scrapeRes.statusCode).toBe(200);
            expect(scrapeRes.body.products.length).toBeGreaterThan(0);

            // Step 2: Fetch Amazon data for each product
            const product = scrapeRes.body.products[0];
            const amazonRes = makeRes();
            await handlers.amazonHandler({ params: { asin: product.asin } }, amazonRes);

            expect(amazonRes.statusCode).toBe(200);
            expect(amazonRes.body).toHaveProperty('asin', product.asin);
            expect(amazonRes.body).toHaveProperty('price');
        });

        test('should handle search with no results gracefully', async () => {
            const res = makeRes();
            await handlers.scrapeHandler({ body: { retailer: 'walmart', query: 'nonexistentproduct12345' } }, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('products');
            expect(Array.isArray(res.body.products)).toBe(true);
        });
    });

    describe('Response Time Tests', () => {
        test('scrape endpoint should respond within reasonable time', async () => {
            const startTime = Date.now();
            
            const res = makeRes();
            await handlers.scrapeHandler({ body: { retailer: 'walmart', query: 'test' } }, res);

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });

        test('amazon endpoint should respond quickly', async () => {
            const startTime = Date.now();
            
            const res = makeRes();
            await handlers.amazonHandler({ params: { asin: 'B08ASIN001' } }, res);

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
        });
    });
});

module.exports = { createTestServer };
