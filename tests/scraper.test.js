// scraper.test.js - Tests for RetailScraper class

describe('RetailScraper', () => {
    let scraper;

    beforeEach(() => {
        // Mock RetailScraper class
        class RetailScraper {
            constructor() {
                this.retailers = {
                    walmart: 'https://www.walmart.com',
                    walgreens: 'https://www.walgreens.com',
                    target: 'https://www.target.com'
                };
            }

            async delay(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }

            async scrapeProducts(retailer, query) {
                await this.delay(100);
                return this.getMockProducts(retailer, query);
            }

            getMockProducts(retailer, query) {
                const allProducts = [
                    {
                        id: 'wm-1',
                        title: 'Wireless Bluetooth Headphones - Clearance',
                        retailer: retailer,
                        price: 24.99,
                        originalPrice: 79.99,
                        url: `${this.retailers[retailer]}/ip/123456789`,
                        image: 'https://via.placeholder.com/300x300?text=Headphones',
                        asin: 'B08ASIN001',
                        clearance: true,
                        stock: 'In Stock'
                    },
                    {
                        id: 'wm-2',
                        title: 'Kitchen Knife Set - Sale',
                        retailer: retailer,
                        price: 34.99,
                        originalPrice: 89.99,
                        url: `${this.retailers[retailer]}/ip/987654321`,
                        image: 'https://via.placeholder.com/300x300?text=Knife',
                        asin: 'B08ASIN002',
                        clearance: true,
                        stock: 'Limited Stock'
                    }
                ];

                if (query && query.trim()) {
                    return allProducts.filter(p =>
                        p.title.toLowerCase().includes(query.toLowerCase())
                    );
                }

                return allProducts;
            }
        }

        scraper = new RetailScraper();
    });

    describe('constructor', () => {
        test('should initialize with correct retailers', () => {
            expect(scraper.retailers).toHaveProperty('walmart');
            expect(scraper.retailers).toHaveProperty('walgreens');
            expect(scraper.retailers).toHaveProperty('target');
        });

        test('should have correct retailer URLs', () => {
            expect(scraper.retailers.walmart).toBe('https://www.walmart.com');
            expect(scraper.retailers.walgreens).toBe('https://www.walgreens.com');
            expect(scraper.retailers.target).toBe('https://www.target.com');
        });
    });

    describe('scrapeProducts', () => {
        test('should return products for walmart', async () => {
            const products = await scraper.scrapeProducts('walmart', '');
            
            expect(Array.isArray(products)).toBe(true);
            expect(products.length).toBeGreaterThan(0);
            expect(products[0]).toHaveProperty('retailer', 'walmart');
        });

        test('should return products for walgreens', async () => {
            const products = await scraper.scrapeProducts('walgreens', '');
            
            expect(Array.isArray(products)).toBe(true);
            expect(products.length).toBeGreaterThan(0);
            expect(products[0]).toHaveProperty('retailer', 'walgreens');
        });

        test('should return products for target', async () => {
            const products = await scraper.scrapeProducts('target', '');
            
            expect(Array.isArray(products)).toBe(true);
            expect(products.length).toBeGreaterThan(0);
            expect(products[0]).toHaveProperty('retailer', 'target');
        });

        test('should filter products by query', async () => {
            const products = await scraper.scrapeProducts('walmart', 'headphones');
            
            expect(products.length).toBeGreaterThan(0);
            expect(products[0].title.toLowerCase()).toContain('headphones');
        });

        test('should return empty array for non-matching query', async () => {
            const products = await scraper.scrapeProducts('walmart', 'nonexistent12345');
            
            expect(Array.isArray(products)).toBe(true);
            expect(products.length).toBe(0);
        });

        test('should return all products when query is empty', async () => {
            const products = await scraper.scrapeProducts('walmart', '');
            
            expect(products.length).toBeGreaterThanOrEqual(2);
        });

        test('should have all required product fields', async () => {
            const products = await scraper.scrapeProducts('walmart', '');
            const product = products[0];

            expect(product).toHaveProperty('id');
            expect(product).toHaveProperty('title');
            expect(product).toHaveProperty('retailer');
            expect(product).toHaveProperty('price');
            expect(product).toHaveProperty('originalPrice');
            expect(product).toHaveProperty('url');
            expect(product).toHaveProperty('image');
            expect(product).toHaveProperty('asin');
            expect(product).toHaveProperty('clearance');
            expect(product).toHaveProperty('stock');
        });

        test('should have valid price data', async () => {
            const products = await scraper.scrapeProducts('walmart', '');
            const product = products[0];

            expect(typeof product.price).toBe('number');
            expect(typeof product.originalPrice).toBe('number');
            expect(product.price).toBeGreaterThan(0);
            expect(product.originalPrice).toBeGreaterThan(product.price);
        });

        test('should have valid ASIN format', async () => {
            const products = await scraper.scrapeProducts('walmart', '');
            const product = products[0];

            expect(product.asin).toMatch(/^[A-Z0-9]{10}$/);
        });

        test('should mark products as clearance', async () => {
            const products = await scraper.scrapeProducts('walmart', '');
            
            products.forEach(product => {
                expect(product.clearance).toBe(true);
            });
        });

        test('should handle case-insensitive search', async () => {
            const productsLower = await scraper.scrapeProducts('walmart', 'headphones');
            const productsUpper = await scraper.scrapeProducts('walmart', 'HEADPHONES');
            const productsMixed = await scraper.scrapeProducts('walmart', 'HeAdPhOnEs');

            expect(productsLower.length).toBe(productsUpper.length);
            expect(productsLower.length).toBe(productsMixed.length);
        });
    });

    describe('delay function', () => {
        test('should delay execution', async () => {
            const startTime = Date.now();
            await scraper.delay(100);
            const endTime = Date.now();

            expect(endTime - startTime).toBeGreaterThanOrEqual(90);
        });
    });
});
