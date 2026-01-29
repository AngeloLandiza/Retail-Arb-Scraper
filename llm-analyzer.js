// llm-analyzer.js - LLM-based product analysis using free API

class LLMAnalyzer {
    constructor(apiKey = null) {
        // Using OpenRouter which provides access to free models
        this.apiKey = apiKey;
        this.apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'meta-llama/llama-3.2-3b-instruct:free'; // Free model
        
        this.systemPrompt = `You are an expert retail arbitrage analyst specializing in evaluating products for resale potential on Amazon. 

Your role is to analyze product data including:
- Pricing information (retail vs Amazon)
- Sales velocity and demand
- Competition levels (number of sellers)
- Price history and trends
- IP/trademark complaints
- Profit margins and ROI

Provide concise, actionable recommendations on whether a product is suitable for resale. Consider:
1. Profit potential and ROI
2. Market saturation (too many sellers = avoid)
3. Legal/IP risks (complaints = avoid)
4. Demand stability (consistent sales = good)
5. Price volatility (stable prices = good)

Format your response as:
- Brief analysis (2-3 sentences)
- Recommendation: BUY / REVIEW / AVOID
- Key risk or opportunity (1 sentence)

Be direct and business-focused.`;
    }

    /**
     * Analyze product suitability for reselling using LLM
     * @param {object} product - Product information
     * @param {object} analytics - Amazon analytics data
     * @returns {Promise<object>} LLM analysis and recommendation
     */
    async analyzeProductSuitability(product, analytics) {
        // If no API key, return mock analysis
        if (!this.apiKey) {
            return this.getMockAnalysis(product, analytics);
        }

        try {
            const productData = this.formatProductData(product, analytics);
            const response = await this.callLLM(productData);
            return this.parseResponse(response);
        } catch (error) {
            console.error('LLM API error:', error);
            return this.getMockAnalysis(product, analytics);
        }
    }

    /**
     * Format product and analytics data for LLM
     */
    formatProductData(product, analytics) {
        const roi = this.calculateROI(product, analytics);
        
        return `Product: ${product.title}
Retail Price: $${product.price}
Amazon Buy Box Price: $${analytics.logistics.buyBoxPrice}
Estimated ROI: ${roi}%

Sales Data:
- Monthly Sales: ${analytics.salesData.monthlySales} units
- Sales Rank: ${analytics.salesData.salesRank}
- Category: ${analytics.salesData.category}

Competition:
- Total Sellers: ${analytics.logistics.sellers}
- FBA Sellers: ${analytics.logistics.fbaOffers}

Price History (360 days):
- Average Price: $${analytics.salesData.avgPrice360Days}
- Lowest: $${analytics.salesData.lowestPrice360Days}
- Highest: $${analytics.salesData.highestPrice360Days}
- Price Drops: ${analytics.salesData.priceDrops}

IP Complaints: ${analytics.complaints.hasComplaints ? `YES (${analytics.complaints.count} complaints)` : 'None'}
${analytics.complaints.details.length > 0 ? `Details: ${analytics.complaints.details.join(', ')}` : ''}

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
        // Extract recommendation
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
     * Mock LLM analysis when no API key is provided
     */
    getMockAnalysis(product, analytics) {
        const roi = this.calculateROI(product, analytics);
        const hasIPComplaints = analytics.complaints.hasComplaints;
        const highCompetition = analytics.logistics.sellers > 15;
        const lowSales = analytics.salesData.monthlySales < 150;
        
        let recommendation = 'BUY';
        let analysis = '';

        if (hasIPComplaints) {
            recommendation = 'AVOID';
            analysis = `This product has ${analytics.complaints.count} IP complaint(s), which poses significant legal risk. The ${roi}% ROI is not worth the potential account suspension. Even with ${analytics.salesData.monthlySales} monthly sales, intellectual property issues make this unsuitable for resale.

Recommendation: AVOID

Key Risk: IP complaints could result in Amazon account suspension and inventory seizure.`;
        } else if (roi < 20) {
            recommendation = 'AVOID';
            analysis = `Low profit margin of ${roi}% ROI makes this product financially unviable. With ${analytics.logistics.sellers} sellers competing and only ${analytics.salesData.monthlySales} monthly sales, the market is saturated. Price volatility (${analytics.salesData.priceDrops} drops in 360 days) adds additional risk.

Recommendation: AVOID

Key Risk: Insufficient profit margin with high competition may lead to losses.`;
        } else if (highCompetition && lowSales) {
            recommendation = 'REVIEW';
            analysis = `Moderate ROI of ${roi}% but concerning competition levels (${analytics.logistics.sellers} sellers). Monthly sales of ${analytics.salesData.monthlySales} units may not support all sellers. Price has been relatively stable, which is positive. Consider if you can win the buy box.

Recommendation: REVIEW

Key Consideration: High seller count may make it difficult to maintain consistent sales velocity.`;
        } else if (roi >= 30 && !highCompetition) {
            recommendation = 'BUY';
            analysis = `Strong opportunity with ${roi}% ROI and manageable competition (${analytics.logistics.sellers} sellers). Healthy monthly sales of ${analytics.salesData.monthlySales} units indicate consistent demand. Price stability over 360 days suggests predictable margins. Good FBA seller ratio indicates successful FBA model.

Recommendation: BUY

Key Opportunity: High ROI with low competition and stable demand makes this an excellent arbitrage opportunity.`;
        } else {
            recommendation = 'REVIEW';
            analysis = `Decent ${roi}% ROI with ${analytics.salesData.monthlySales} monthly sales. Competition level of ${analytics.logistics.sellers} sellers is moderate. Price history shows ${analytics.salesData.priceDrops} drops, suggesting some volatility. Worth deeper analysis of buy box dynamics.

Recommendation: REVIEW

Key Consideration: Moderate metrics suggest potential but requires careful inventory management and pricing strategy.`;
        }

        return {
            analysis: analysis,
            recommendation: recommendation,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Calculate ROI
     */
    calculateROI(product, analytics) {
        const buyPrice = product.price;
        const sellPrice = analytics.logistics.buyBoxPrice;
        const fees = sellPrice * 0.15; // Estimate 15% Amazon fees
        const shipping = 3.00; // Estimate shipping cost
        const profit = sellPrice - buyPrice - fees - shipping;
        const roi = (profit / buyPrice) * 100;
        return Math.round(roi * 10) / 10;
    }

    /**
     * Batch analyze multiple products
     */
    async batchAnalyze(productsWithAnalytics) {
        const results = [];
        
        // Process in batches to avoid rate limits
        for (const item of productsWithAnalytics) {
            const analysis = await this.analyzeProductSuitability(item.product, item.analytics);
            results.push({
                product: item.product,
                analytics: item.analytics,
                llmAnalysis: analysis
            });
            
            // Add delay to respect rate limits
            await this.delay(500);
        }
        
        return results;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LLMAnalyzer;
}
