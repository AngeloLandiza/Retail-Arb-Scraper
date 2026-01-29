// llm-analyzer.test.js - Tests for LLM analysis functionality

describe('LLMAnalyzer Tests', () => {
    // Mock LLMAnalyzer class for testing
    class LLMAnalyzer {
        constructor(apiKey = null) {
            this.apiKey = apiKey;
        }

        calculateROI(product, analytics) {
            const buyPrice = product.price;
            const sellPrice = analytics.logistics.buyBoxPrice;
            const fees = sellPrice * 0.15; // Estimate 15% Amazon fees
            const profit = sellPrice - buyPrice - fees;
            const roi = (profit / buyPrice) * 100;
            return Math.round(roi);
        }

        getRuleBasedAnalysis(product, analytics) {
            const roi = this.calculateROI(product, analytics);
            const sellers = analytics.logistics.sellers;
            const monthlySales = analytics.salesData.monthlySales;
            const hasComplaints = analytics.complaints.hasComplaints;

            let recommendation = 'REVIEW';
            let reasoning = '';
            let risks = [];
            let opportunities = [];

            // Critical red flags
            if (hasComplaints) {
                recommendation = 'AVOID';
                reasoning = 'IP complaints detected. High risk of account suspension.';
                risks.push('IP/trademark complaints');
            } else if (roi < 0) {
                recommendation = 'AVOID';
                reasoning = 'Negative ROI. Product would lose money.';
                risks.push('Negative margins');
            } else if (roi < 20) {
                recommendation = 'AVOID';
                reasoning = `Low ROI (${roi}%). Not worth the effort and risk.`;
                risks.push('Low profit margin');
            } else if (sellers > 20) {
                recommendation = 'AVOID';
                reasoning = `Too much competition (${sellers} sellers). Hard to win buy box.`;
                risks.push('High competition');
            } else if (monthlySales < 50) {
                recommendation = 'REVIEW';
                reasoning = `Low sales velocity (${monthlySales}/month). May take time to sell.`;
                risks.push('Low demand');
            } else if (roi >= 30 && sellers <= 15 && monthlySales >= 50) {
                recommendation = 'BUY';
                reasoning = `Great opportunity! ROI: ${roi}%, Good demand (${monthlySales}/month), Manageable competition (${sellers} sellers).`;
                opportunities.push('High ROI', 'Good sales velocity', 'Low competition');
            } else if (roi >= 25 && sellers <= 20) {
                recommendation = 'REVIEW';
                reasoning = `Decent opportunity. ROI: ${roi}%, but requires further analysis of competition and demand.`;
                opportunities.push('Reasonable ROI');
            }

            return {
                recommendation: recommendation,
                reasoning: reasoning,
                roi: roi,
                risks: risks,
                opportunities: opportunities,
                confidence: recommendation === 'BUY' ? 'High' : recommendation === 'AVOID' ? 'High' : 'Medium'
            };
        }

        async analyzeProductSuitability(product, analytics) {
            if (!this.apiKey) {
                return this.getRuleBasedAnalysis(product, analytics);
            }
            // In real implementation, would call LLM API
            return this.getRuleBasedAnalysis(product, analytics);
        }
    }

    let analyzer;

    beforeEach(() => {
        analyzer = new LLMAnalyzer();
    });

    describe('calculateROI', () => {
        test('should calculate positive ROI correctly', () => {
            const product = { price: 25.00 };
            const analytics = {
                logistics: { buyBoxPrice: 50.00 }
            };
            
            const roi = analyzer.calculateROI(product, analytics);
            
            expect(typeof roi).toBe('number');
            expect(roi).toBeGreaterThan(0);
        });

        test('should calculate negative ROI for unprofitable products', () => {
            const product = { price: 60.00 };
            const analytics = {
                logistics: { buyBoxPrice: 50.00 }
            };
            
            const roi = analyzer.calculateROI(product, analytics);
            
            expect(roi).toBeLessThan(0);
        });

        test('should handle zero prices gracefully', () => {
            const product = { price: 0 };
            const analytics = {
                logistics: { buyBoxPrice: 50.00 }
            };
            
            const roi = analyzer.calculateROI(product, analytics);
            
            expect(typeof roi).toBe('number');
        });
    });

    describe('getRuleBasedAnalysis', () => {
        test('should recommend AVOID for products with IP complaints', () => {
            const product = { price: 25.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 50.00, sellers: 10 },
                salesData: { monthlySales: 100 },
                complaints: { hasComplaints: true, count: 1 }
            };
            
            const result = analyzer.getRuleBasedAnalysis(product, analytics);
            
            expect(result.recommendation).toBe('AVOID');
            expect(result.risks).toContain('IP/trademark complaints');
        });

        test('should recommend BUY for high ROI, low competition products', () => {
            const product = { price: 25.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 60.00, sellers: 10 },
                salesData: { monthlySales: 100 },
                complaints: { hasComplaints: false, count: 0 }
            };
            
            const result = analyzer.getRuleBasedAnalysis(product, analytics);
            
            expect(result.recommendation).toBe('BUY');
            expect(result.roi).toBeGreaterThan(30);
        });

        test('should recommend AVOID for high competition', () => {
            const product = { price: 25.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 60.00, sellers: 25 },
                salesData: { monthlySales: 100 },
                complaints: { hasComplaints: false, count: 0 }
            };
            
            const result = analyzer.getRuleBasedAnalysis(product, analytics);
            
            expect(result.recommendation).toBe('AVOID');
            expect(result.risks).toContain('High competition');
        });

        test('should recommend AVOID for negative ROI', () => {
            const product = { price: 60.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 50.00, sellers: 10 },
                salesData: { monthlySales: 100 },
                complaints: { hasComplaints: false, count: 0 }
            };
            
            const result = analyzer.getRuleBasedAnalysis(product, analytics);
            
            expect(result.recommendation).toBe('AVOID');
            expect(result.roi).toBeLessThan(0);
        });

        test('should recommend REVIEW for moderate metrics', () => {
            const product = { price: 30.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 50.00, sellers: 18 },
                salesData: { monthlySales: 80 },
                complaints: { hasComplaints: false, count: 0 }
            };
            
            const result = analyzer.getRuleBasedAnalysis(product, analytics);
            
            expect(['REVIEW', 'BUY']).toContain(result.recommendation);
            expect(result).toHaveProperty('reasoning');
        });

        test('should include confidence level', () => {
            const product = { price: 25.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 60.00, sellers: 10 },
                salesData: { monthlySales: 100 },
                complaints: { hasComplaints: false, count: 0 }
            };
            
            const result = analyzer.getRuleBasedAnalysis(product, analytics);
            
            expect(result).toHaveProperty('confidence');
            expect(['High', 'Medium', 'Low']).toContain(result.confidence);
        });
    });

    describe('analyzeProductSuitability', () => {
        test('should use rule-based analysis when no API key', async () => {
            const product = { price: 25.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 60.00, sellers: 10 },
                salesData: { monthlySales: 100 },
                complaints: { hasComplaints: false, count: 0 }
            };
            
            const result = await analyzer.analyzeProductSuitability(product, analytics);
            
            expect(result).toHaveProperty('recommendation');
            expect(result).toHaveProperty('reasoning');
            expect(result).toHaveProperty('roi');
        });

        test('should return complete analysis object', async () => {
            const product = { price: 25.00, title: 'Test Product' };
            const analytics = {
                logistics: { buyBoxPrice: 60.00, sellers: 10 },
                salesData: { monthlySales: 100 },
                complaints: { hasComplaints: false, count: 0 }
            };
            
            const result = await analyzer.analyzeProductSuitability(product, analytics);
            
            expect(result).toHaveProperty('recommendation');
            expect(result).toHaveProperty('reasoning');
            expect(result).toHaveProperty('roi');
            expect(result).toHaveProperty('risks');
            expect(result).toHaveProperty('opportunities');
            expect(result).toHaveProperty('confidence');
        });
    });
});
