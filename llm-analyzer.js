// llm-analyzer.js - LLM-based product analysis using free API

class LLMAnalyzer {
    constructor(apiKey = null) {
        // LLM is optional - the tool works without it using rule-based analysis
        this.apiKey = apiKey;
        this.apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'meta-llama/llama-3.2-3b-instruct:free'; // Free model (if API key provided)

        this.systemPrompt = `You are an expert retail arbitrage analyst specializing in evaluating products for resale potential on Amazon. 

Your role is to analyze product data including:
- Pricing information (retail vs Amazon)
- Sales velocity and demand
- Amazon listing quality (rating/reviews when available)
- Price history and trends
- IP/trademark complaints
- Profit margins and ROI

Provide concise, actionable recommendations on whether a product is suitable for resale. Consider:
1. Profit potential and ROI
2. Legal/IP risks (complaints = avoid)
3. Demand stability (consistent sales = good)
4. Listing health (strong ratings/reviews = good)
5. Price volatility (stable prices = good)

Format your response as:
- Brief analysis (2-3 sentences)
- Recommendation: BUY / REVIEW / AVOID
- Key risk or opportunity (1 sentence)

Be direct and business-focused.`;
    }

    /**
     * Analyze product suitability for reselling
     * Uses rule-based analysis (no API required) or optional LLM if API key provided
     * @param {object} product - Product information
     * @param {object} analytics - Amazon analytics data
     * @returns {Promise<object>} Analysis and recommendation
     */
    async analyzeProductSuitability(product, analytics) {
        if (!this.apiKey) {
            return this.getRuleBasedAnalysis(product, analytics);
        }

        try {
            const productData = this.formatProductData(product, analytics);
            const response = await this.callLLM(productData);
            return this.parseResponse(response);
        } catch (error) {
            console.error('LLM API error, falling back to rule-based analysis:', error);
            return this.getRuleBasedAnalysis(product, analytics);
        }
    }

    /**
     * Format product and analytics data for LLM
     */
    formatProductData(product, analytics) {
        const roi = this.calculateROI(product, analytics);
        const salesData = analytics.salesData || {};
        const logistics = analytics.logistics || {};

        return `Product: ${product.title}
Retail Price: $${product.price}
Amazon Buy Box Price: $${logistics.buyBoxPrice || 'Unknown'}
Estimated ROI: ${roi}%

Sales Data:
- Monthly Sales: ${salesData.monthlySales ?? 'Unknown'} units
- Sales Rank: ${salesData.salesRank ?? 'Unknown'}
- Category: ${salesData.category || 'Unknown'}

Listing Signals:
- Rating: ${logistics.rating ?? 'Unknown'}
- Reviews: ${logistics.reviews ?? 'Unknown'}

Price History (360 days):
- Average Price: $${salesData.avgPrice360Days ?? 'Unknown'}
- Lowest: $${salesData.lowestPrice360Days ?? 'Unknown'}
- Highest: $${salesData.highestPrice360Days ?? 'Unknown'}
- Price Drops: ${salesData.priceDrops ?? 'Unknown'}

IP Complaints: ${analytics.complaints?.hasComplaints === null ? 'Unknown' : analytics.complaints?.hasComplaints ? `YES (${analytics.complaints.count} complaints)` : 'None'}
${analytics.complaints?.details?.length ? `Details: ${analytics.complaints.details.join(', ')}` : ''}

Analyze this product for resale suitability.`;
    }

    /**
     * Call LLM API
     */
    async callLLM(productData) {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Retail Arbitrage Scraper'
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'user', content: productData }
                ],
                temperature: 0.7,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Parse LLM response
     */
    parseResponse(responseText) {
        let recommendation = 'REVIEW';
        if (responseText.toUpperCase().includes('RECOMMENDATION: BUY')) {
            recommendation = 'BUY';
        } else if (responseText.toUpperCase().includes('RECOMMENDATION: AVOID')) {
            recommendation = 'AVOID';
        } else if (responseText.toUpperCase().includes('RECOMMENDATION: REVIEW')) {
            recommendation = 'REVIEW';
        }

        return {
            analysis: responseText,
            recommendation: recommendation,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Rule-based analysis - FREE, no API required
     * Provides intelligent recommendations based on market data
     */
    getRuleBasedAnalysis(product, analytics) {
        const roi = this.calculateROI(product, analytics);
        const sales = analytics.salesData?.monthlySales ?? null;
        const rating = analytics.logistics?.rating ?? null;
        const reviews = analytics.logistics?.reviews ?? null;
        const hasIPComplaints = analytics.complaints?.hasComplaints;

        let recommendation = 'REVIEW';
        let analysis = '';

        const hasUnknowns =
            sales === null ||
            hasIPComplaints === null ||
            analytics.logistics?.buyBoxPrice === null ||
            analytics.logistics?.buyBoxPrice === 0;

        if (hasIPComplaints === true) {
            recommendation = 'AVOID';
            analysis = `This product has IP complaints, which poses significant legal risk. The ${roi}% ROI is not worth the potential account suspension. Recommendation: AVOID\n\nKey Risk: IP complaints could result in Amazon account suspension and inventory seizure.`;
        } else if (roi < 20 && analytics.logistics?.buyBoxPrice > 0) {
            recommendation = 'AVOID';
            analysis = `Low profit margin of ${roi}% ROI makes this product financially unviable. Recommendation: AVOID\n\nKey Risk: Insufficient profit margin may lead to losses.`;
        } else if (hasUnknowns) {
            recommendation = 'REVIEW';
            analysis = `Limited Amazon data available for this product. Estimated ROI is ${roi}%. Recommendation: REVIEW\n\nKey Consideration: Validate listing quality, sales velocity, and IP status before purchasing.`;
        } else if (roi >= 30 && (rating === null || rating >= 4.2) && (reviews === null || reviews >= 50)) {
            recommendation = 'BUY';
            analysis = `Strong opportunity with ${roi}% ROI and healthy Amazon listing signals. Recommendation: BUY\n\nKey Opportunity: High ROI with solid ratings/reviews and stable demand.`;
        } else if (sales !== null && sales < 150) {
            recommendation = 'REVIEW';
            analysis = `Moderate ROI of ${roi}% but low monthly sales (${sales}). Recommendation: REVIEW\n\nKey Consideration: Sales velocity may not justify inventory risk.`;
        } else {
            recommendation = 'REVIEW';
            analysis = `Decent ${roi}% ROI with limited signals. Recommendation: REVIEW\n\nKey Consideration: Verify buy box stability and listing health before buying.`;
        }

        return {
            analysis: analysis,
            recommendation: recommendation,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Calculate ROI percentage
     */
    calculateROI(product, analytics) {
        const buyPrice = product.price || 0;
        const sellPrice = analytics.logistics?.buyBoxPrice || 0;
        const fees = sellPrice * 0.15; // Estimate 15% fees
        const profit = sellPrice - buyPrice - fees;
        if (buyPrice <= 0) return 0;
        const roi = (profit / buyPrice) * 100;
        return Math.round(roi * 10) / 10;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LLMAnalyzer;
}
