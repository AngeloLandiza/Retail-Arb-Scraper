// amazon-analyzer.js - Amazon listing analytics (live, free scraping)

class AmazonAnalyzer {
    constructor() {
        // No API keys needed - uses free methods
    }

    /**
     * Get comprehensive Amazon product analytics
     * @param {object|string} productOrAsin - Product object or Amazon ASIN
     * @returns {Promise<object>} Product analytics
     */
    async analyzeProduct(productOrAsin) {
        const product = typeof productOrAsin === 'string'
            ? { asin: productOrAsin }
            : (productOrAsin || {});

        const [logistics, salesData, complaints] = await Promise.all([
            this.getProductLogistics(product),
            this.getSalesData(product),
            this.getIPComplaints(product)
        ]);

        return {
            asin: logistics.asin || product.asin || null,
            logistics,
            salesData,
            complaints,
            score: this.calculateScore(logistics, salesData, complaints)
        };
    }

    /**
     * Get product listing data (price, rating, reviews)
     * @param {object} product - Product with title or ASIN
     * @returns {Promise<object>} Logistics data
     */
    async getProductLogistics(product) {
        const payload = product?.asin
            ? { asin: product.asin }
            : { query: product?.title || '' };
        if (typeof product?.price === 'number') {
            payload.price = product.price;
        }

        if (!payload.asin && !payload.query) {
            return {
                asin: null,
                buyBoxPrice: null,
                rating: null,
                reviews: null,
                url: null
            };
        }

        try {
            const response = await fetch('/api/amazon/lookup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return {
                asin: data.asin || payload.asin || null,
                buyBoxPrice: typeof data.price === 'number' ? data.price : null,
                rating: typeof data.rating === 'number' ? data.rating : null,
                reviews: typeof data.reviews === 'number' ? data.reviews : null,
                url: data.url || null
            };
        } catch (error) {
            console.error('Error fetching Amazon data:', error);
            return {
                asin: payload.asin || null,
                buyBoxPrice: null,
                rating: null,
                reviews: null,
                url: null
            };
        }
    }

    /**
     * Get sales data - FREE alternative to Keepa API
     * Uses Amazon Best Seller Rank to estimate sales when available
     * @param {object} product - Product data
     * @returns {Promise<object>} Sales and pricing data
     */
    async getSalesData(product) {
        // No free reliable sales API; return unknown values
        return this.getDefaultSalesData();
    }

    /**
     * Get IP (Intellectual Property) complaints data
     * @returns {Promise<object>} IP complaints information
     */
    async getIPComplaints() {
        // No free public IP complaints database available
        return { hasComplaints: null, count: null, details: [] };
    }

    /**
     * Calculate product score based on various factors
     */
    calculateScore(logistics, salesData, complaints) {
        let score = 50; // Neutral base

        if (typeof salesData.monthlySales === 'number') {
            if (salesData.monthlySales < 100) score -= 25;
            else if (salesData.monthlySales < 200) score -= 15;
            else if (salesData.monthlySales < 300) score -= 5;
        }

        if (complaints.hasComplaints === true) {
            score -= (complaints.count || 1) * 15;
        }

        if (typeof logistics.rating === 'number') {
            if (logistics.rating >= 4.5) score += 5;
            else if (logistics.rating < 3.8) score -= 10;
        }
        if (typeof logistics.reviews === 'number') {
            if (logistics.reviews >= 500) score += 5;
            else if (logistics.reviews < 20) score -= 5;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Check if product meets SOP criteria
     * @param {object} product - Product with price
     * @param {object} analytics - Amazon analytics
     * @param {object} sop - Standard Operating Procedure criteria
     * @returns {object} SOP validation result
     */
    validateSOP(product, analytics, sop) {
        const checks = {
            minPrice: product.price >= (sop.minPrice || 0),
            minMonthlySales:
                typeof analytics.salesData.monthlySales === 'number'
                    ? analytics.salesData.monthlySales >= (sop.minMonthlySales || 0)
                    : null,
            minROI: this.calculateROI(product, analytics) >= (sop.minROI || 0),
            noIPComplaints:
                analytics.complaints.hasComplaints === null
                    ? null
                    : !analytics.complaints.hasComplaints
        };

        const passed = Object.values(checks).every(value => value !== false);

        return {
            passed,
            checks,
            failedChecks: Object.keys(checks).filter(key => checks[key] === false),
            unknownChecks: Object.keys(checks).filter(key => checks[key] === null)
        };
    }

    /**
     * Calculate ROI percentage
     */
    calculateROI(product, analytics) {
        const buyPrice = product.price || 0;
        const sellPrice = analytics.logistics.buyBoxPrice || 0;
        const fees = sellPrice * 0.15; // Estimate 15% fees
        const profit = sellPrice - buyPrice - fees;
        if (buyPrice <= 0) return 0;
        const roi = (profit / buyPrice) * 100;
        return Math.round(roi * 10) / 10;
    }

    getDefaultSalesData() {
        return {
            monthlySales: null,
            avgPrice30Days: null,
            avgPrice90Days: null,
            avgPrice360Days: null,
            lowestPrice360Days: null,
            highestPrice360Days: null,
            salesRank: null,
            category: 'Unknown',
            priceDrops: null,
            priceHistory: []
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AmazonAnalyzer;
}
