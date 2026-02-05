// scraper.js - Retail store scraping functionality (frontend)
// Uses backend API for live data. No mock data.

class RetailScraper {
    constructor() {
        this.retailers = {
            walmart: 'https://www.walmart.com',
            walgreens: 'https://www.walgreens.com',
            target: 'https://www.target.com'
        };
    }

    /**
     * Scrape products from retailer via backend API
     * @param {string} retailer - The retailer name
     * @param {string} query - Search query or URL
     * @returns {Promise<Array>} Array of product objects
     */
    async scrapeProducts(retailer, query) {
        console.log(`Scraping ${retailer} for: ${query}`);

        const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ retailer, query })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Scrape failed (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log(`Found ${data.products.length} products`);
        return data.products;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RetailScraper;
}
