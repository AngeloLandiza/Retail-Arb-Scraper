// amazon-analyzer.test.js - Tests for Amazon analysis functionality
const AmazonAnalyzer = require('../amazon-analyzer.js');

describe('AmazonAnalyzer Tests', () => {
    let analyzer;

    beforeEach(() => {
        analyzer = new AmazonAnalyzer();
    });

    describe('getProductLogistics', () => {
        test('should return logistics data for known ASIN', async () => {
            const result = await analyzer.getProductLogistics('B08ASIN001');
            
            expect(result).toHaveProperty('sellers');
            expect(result).toHaveProperty('fbaOffers');
            expect(result).toHaveProperty('buyBoxPrice');
            expect(result.sellers).toBe(12);
        });

        test('should return default data for unknown ASIN', async () => {
            const result = await analyzer.getProductLogistics('B00UNKNOWN');
            
            expect(result.sellers).toBe(0);
            expect(result.buyBoxPrice).toBe(0);
        });
    });

    describe('getSalesData', () => {
        test('should return sales data for known ASIN', async () => {
            const result = await analyzer.getSalesData('B08ASIN001');
            
            expect(result).toHaveProperty('salesRank');
            expect(result).toHaveProperty('monthlySales');
            expect(result).toHaveProperty('category');
            expect(result.salesRank).toBe(15420);
        });

        test('should return default data for unknown ASIN', async () => {
            const result = await analyzer.getSalesData('B00UNKNOWN');
            
            expect(result.salesRank).toBe(999999);
            expect(result.monthlySales).toBe(0);
        });
    });

    describe('getIPComplaints', () => {
        test('should return no complaints by default', async () => {
            const result = await analyzer.getIPComplaints('B08ASIN001');
            
            expect(result).toHaveProperty('hasComplaints');
            expect(result).toHaveProperty('count');
            expect(result.hasComplaints).toBe(false);
            expect(result.count).toBe(0);
        });
    });

    describe('calculateScore', () => {
        test('should calculate high score for good product with low competition and good sales', () => {
            const logistics = { sellers: 5, fbaOffers: 4, fbmOffers: 1 };
            const salesData = { monthlySales: 350 };
            const complaints = { hasComplaints: false };
            
            const score = analyzer.calculateScore(logistics, salesData, complaints);
            
            expect(score).toBeGreaterThan(80); // Should be high score
        });

        test('should reduce score for products with complaints', () => {
            const logistics = { sellers: 10, fbaOffers: 5, fbmOffers: 5 };
            const salesData = { monthlySales: 250 };
            const complaints = { hasComplaints: true, count: 2 };
            
            const score = analyzer.calculateScore(logistics, salesData, complaints);
            
            expect(score).toBeLessThan(90); // IP complaints should reduce score
        });

        test('should reduce score for high competition', () => {
            const logistics = { sellers: 20, fbaOffers: 5, fbmOffers: 15 };
            const salesData = { monthlySales: 250 };
            const complaints = { hasComplaints: false };
            
            const score = analyzer.calculateScore(logistics, salesData, complaints);
            
            expect(score).toBeLessThan(90); // High competition should reduce score
        });

        test('should reduce score for low sales', () => {
            const logistics = { sellers: 10, fbaOffers: 5, fbmOffers: 5 };
            const salesData = { monthlySales: 50 };
            const complaints = { hasComplaints: false };
            
            const score = analyzer.calculateScore(logistics, salesData, complaints);
            
            expect(score).toBeLessThan(90); // Low sales should reduce score
        });
    });

    describe('analyzeProduct', () => {
        test('should return complete analysis for ASIN', async () => {
            const result = await analyzer.analyzeProduct('B08ASIN001');
            
            expect(result).toHaveProperty('asin', 'B08ASIN001');
            expect(result).toHaveProperty('logistics');
            expect(result).toHaveProperty('salesData');
            expect(result).toHaveProperty('complaints');
            expect(result).toHaveProperty('score');
        });

        test('should calculate score correctly', async () => {
            const result = await analyzer.analyzeProduct('B08ASIN001');
            
            expect(typeof result.score).toBe('number');
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(100);
        });
    });
});
