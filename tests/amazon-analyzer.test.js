// amazon-analyzer.test.js - Tests for Amazon analysis functionality
const AmazonAnalyzer = require('../amazon-analyzer.js');

describe('AmazonAnalyzer Tests', () => {
    let analyzer;

    beforeEach(() => {
        analyzer = new AmazonAnalyzer();
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getProductLogistics', () => {
        test('should return logistics data from Amazon lookup', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    asin: 'B08ASIN001',
                    price: 50.0,
                    rating: 4.5,
                    reviews: 120
                })
            });

            const result = await analyzer.getProductLogistics({ asin: 'B08ASIN001' });

            expect(result).toHaveProperty('asin', 'B08ASIN001');
            expect(result).toHaveProperty('buyBoxPrice', 50.0);
            expect(result).toHaveProperty('rating', 4.5);
            expect(result).toHaveProperty('reviews', 120);
        });

        test('should return fallback data when lookup fails', async () => {
            global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });

            const result = await analyzer.getProductLogistics({ asin: 'B00UNKNOWN' });

            expect(result.buyBoxPrice).toBeNull();
            expect(result.rating).toBeNull();
        });
    });

    describe('getSalesData', () => {
        test('should return default sales data when unavailable', async () => {
            const result = await analyzer.getSalesData({ asin: 'B08ASIN001' });

            expect(result).toHaveProperty('salesRank');
            expect(result).toHaveProperty('monthlySales');
            expect(result.salesRank).toBeNull();
            expect(result.monthlySales).toBeNull();
        });
    });

    describe('getIPComplaints', () => {
        test('should return unknown complaints by default', async () => {
            const result = await analyzer.getIPComplaints('B08ASIN001');

            expect(result).toHaveProperty('hasComplaints');
            expect(result).toHaveProperty('count');
            expect(result.hasComplaints).toBeNull();
            expect(result.count).toBeNull();
        });
    });

    describe('calculateScore', () => {
        test('should calculate solid score for good product with strong listing signals', () => {
            const logistics = { rating: 4.7, reviews: 800 };
            const salesData = { monthlySales: 350 };
            const complaints = { hasComplaints: false };
            
            const score = analyzer.calculateScore(logistics, salesData, complaints);
            
            expect(score).toBeGreaterThan(55); // Should be above baseline
        });

        test('should reduce score for products with complaints', () => {
            const logistics = { rating: 4.4, reviews: 200 };
            const salesData = { monthlySales: 250 };
            const complaints = { hasComplaints: true, count: 2 };
            
            const score = analyzer.calculateScore(logistics, salesData, complaints);
            
            expect(score).toBeLessThan(90); // IP complaints should reduce score
        });

        test('should reduce score for low sales', () => {
            const logistics = { rating: 4.2, reviews: 120 };
            const salesData = { monthlySales: 50 };
            const complaints = { hasComplaints: false };
            
            const score = analyzer.calculateScore(logistics, salesData, complaints);
            
            expect(score).toBeLessThan(90); // Low sales should reduce score
        });
    });

    describe('analyzeProduct', () => {
        test('should return complete analysis for ASIN', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    asin: 'B08ASIN001',
                    price: 50.0
                })
            });

            const result = await analyzer.analyzeProduct('B08ASIN001');
            
            expect(result).toHaveProperty('asin', 'B08ASIN001');
            expect(result).toHaveProperty('logistics');
            expect(result).toHaveProperty('salesData');
            expect(result).toHaveProperty('complaints');
            expect(result).toHaveProperty('score');
        });

        test('should calculate score correctly', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    asin: 'B08ASIN001',
                    price: 50.0
                })
            });

            const result = await analyzer.analyzeProduct('B08ASIN001');
            
            expect(typeof result.score).toBe('number');
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(100);
        });
    });
});
