// llm-analyzer.test.js - Tests for LLM analysis functionality
const LLMAnalyzer = require('../llm-analyzer.js');

describe('LLMAnalyzer Tests', () => {
    let analyzer;

    beforeEach(() => {
        analyzer = new LLMAnalyzer();
    });

    describe('calculateROI', () => {
        test('should calculate positive ROI correctly', () => {
            const product = { price: 25.00 };
            const analytics = {
                logistics: { buyBoxPrice: 60.00 }
            };
            
            const roi = analyzer.calculateROI(product, analytics);
            
            expect(typeof roi).toBe('number');
            expect(roi).toBeGreaterThan(0);
            // ROI = (60 - 25 - 9) / 25 * 100 = 104%
            expect(roi).toBeCloseTo(104, 0);
        });

        test('should calculate negative ROI for unprofitable products', () => {
            const product = { price: 60.00 };
            const analytics = {
                logistics: { buyBoxPrice: 50.00 }
            };
            
            const roi = analyzer.calculateROI(product, analytics);
            
            expect(roi).toBeLessThan(0);
        });

        test('should handle edge case prices', () => {
            const product = { price: 1.00 };
            const analytics = {
                logistics: { buyBoxPrice: 50.00 }
            };
            
            const roi = analyzer.calculateROI(product, analytics);
            
            expect(typeof roi).toBe('number');
            expect(roi).toBeGreaterThan(0);
        });
    });

    describe('getRuleBasedAnalysis', () => {
        test('should recommend AVOID for products with IP complaints', () => {
            const product = { price: 25.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 50.00, rating: 4.6, reviews: 200 },
                salesData: { monthlySales: 200, priceDrops: 1 },
                complaints: { hasComplaints: true, count: 1 }
            };
            
            const result = analyzer.getRuleBasedAnalysis(product, analytics);
            
            expect(result.recommendation).toBe('AVOID');
            expect(result.analysis).toContain('IP complaint');
        });

        test('should recommend BUY for high ROI with strong listing signals', () => {
            const product = { price: 25.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 70.00, rating: 4.6, reviews: 300 },
                salesData: { monthlySales: 200, priceDrops: 1 },
                complaints: { hasComplaints: false, count: 0 }
            };
            
            const result = analyzer.getRuleBasedAnalysis(product, analytics);
            
            expect(result.recommendation).toBe('BUY');
            expect(result.analysis).toContain('Strong opportunity');
        });

        test('should recommend AVOID for low ROI', () => {
            const product = { price: 60.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 70.00, rating: 4.4, reviews: 120 },
                salesData: { monthlySales: 200, priceDrops: 1 },
                complaints: { hasComplaints: false, count: 0 }
            };
            
            const result = analyzer.getRuleBasedAnalysis(product, analytics);
            
            expect(result.recommendation).toBe('AVOID');
            expect(result.analysis).toContain('Low profit margin');
        });

        test('should recommend REVIEW for moderate metrics', () => {
            const product = { price: 30.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 55.00, rating: 4.0, reviews: 30 },
                salesData: { monthlySales: 100, priceDrops: 2 },
                complaints: { hasComplaints: false, count: 0 }
            };
            
            const result = analyzer.getRuleBasedAnalysis(product, analytics);
            
            expect(result.recommendation).toBe('REVIEW');
        });

        test('should include recommendation in analysis text', () => {
            const product = { price: 25.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 70.00, rating: 4.6, reviews: 300 },
                salesData: { monthlySales: 200, priceDrops: 1 },
                complaints: { hasComplaints: false, count: 0 }
            };
            
            const result = analyzer.getRuleBasedAnalysis(product, analytics);
            
            expect(result.analysis).toContain('Recommendation:');
            expect(result.analysis).toContain(result.recommendation);
        });

        test('should include timestamp', () => {
            const product = { price: 25.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 70.00, rating: 4.6, reviews: 300 },
                salesData: { monthlySales: 200, priceDrops: 1 },
                complaints: { hasComplaints: false, count: 0 }
            };
            
            const result = analyzer.getRuleBasedAnalysis(product, analytics);
            
            expect(result).toHaveProperty('timestamp');
            expect(new Date(result.timestamp)).toBeInstanceOf(Date);
        });
    });

    describe('analyzeProductSuitability', () => {
        test('should use rule-based analysis when no API key', async () => {
            const product = { price: 25.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 70.00, rating: 4.6, reviews: 300 },
                salesData: { monthlySales: 200, priceDrops: 1 },
                complaints: { hasComplaints: false, count: 0 }
            };
            
            const result = await analyzer.analyzeProductSuitability(product, analytics);
            
            expect(result).toHaveProperty('recommendation');
            expect(result).toHaveProperty('analysis');
            expect(result).toHaveProperty('timestamp');
        });

        test('should return complete analysis object', async () => {
            const product = { price: 25.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 70.00, rating: 4.6, reviews: 300 },
                salesData: { monthlySales: 200, priceDrops: 1 },
                complaints: { hasComplaints: false, count: 0 }
            };
            
            const result = await analyzer.analyzeProductSuitability(product, analytics);
            
            expect(result).toHaveProperty('analysis');
            expect(typeof result.analysis).toBe('string');
            expect(result.analysis.length).toBeGreaterThan(0);
            expect(result).toHaveProperty('recommendation');
            expect(['BUY', 'REVIEW', 'AVOID']).toContain(result.recommendation);
        });
    });
});
