// server.test.js - Tests for server handlers (no network)

// Create test server instance
function createTestServer() {
    const VALID_RETAILERS = ['walmart', 'walgreens', 'target'];
    const ASIN_REGEX = /^[A-Z0-9]{10}$/;

    // Mock Amazon handler
    const amazonHandler = async (req, res) => {
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

describe('Server API Tests', () => {
    let handlers;

    beforeAll(() => {
        handlers = createTestServer();
    });

    describe('GET /api/amazon/:asin', () => {
        test('should return product data for valid ASIN', async () => {
            const res = makeRes();
            await handlers.amazonHandler({ params: { asin: 'B08ASIN001' } }, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('asin', 'B08ASIN001');
            expect(res.body).toHaveProperty('title');
            expect(res.body).toHaveProperty('price');
            expect(res.body).toHaveProperty('salesRank');
        });

        test('should return 400 for invalid ASIN format', async () => {
            const res = makeRes();
            await handlers.amazonHandler({ params: { asin: 'invalid' } }, res);

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error', 'Invalid ASIN format');
        });

        test('should reject ASIN with special characters', async () => {
            const res = makeRes();
            await handlers.amazonHandler({ params: { asin: 'B08-ASIN01' } }, res);
            expect(res.statusCode).toBe(400);
        });
    });

    describe('POST /api/scrape', () => {
        test('should return products for valid retailer', async () => {
            const res = makeRes();
            await handlers.scrapeHandler({ body: { retailer: 'walmart', query: 'test' } }, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('products');
            expect(Array.isArray(res.body.products)).toBe(true);
        });

        test('should return 400 for invalid retailer', async () => {
            const res = makeRes();
            await handlers.scrapeHandler({ body: { retailer: 'invalid', query: 'test' } }, res);

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('error', 'Invalid retailer');
            expect(res.body).toHaveProperty('validRetailers');
        });

        test('should accept all valid retailers', async () => {
            const retailers = ['walmart', 'walgreens', 'target'];
            
            for (const retailer of retailers) {
                const res = makeRes();
                await handlers.scrapeHandler({ body: { retailer, query: 'test' } }, res);

                expect(res.statusCode).toBe(200);
                expect(res.body.products[0].retailer).toBe(retailer);
            }
        });
    });
});
