const walmart = require('./walmart');
const target = require('./target');
const walgreens = require('./walgreens');
const amazon = require('./amazon');
const { pickBestMatch } = require('../match');

const RETAILERS = {
    walmart,
    target,
    walgreens
};

function isUrl(input) {
    return /^https?:\/\//i.test(input || '');
}

function inferRetailerFromUrl(url) {
    if (!url) return null;
    if (url.includes('walmart.com')) return 'walmart';
    if (url.includes('target.com')) return 'target';
    if (url.includes('walgreens.com')) return 'walgreens';
    return null;
}

async function scrapeRetailer(retailer, query, options = {}) {
    const handler = RETAILERS[retailer];
    if (!handler) throw new Error(`Unsupported retailer: ${retailer}`);

    if (isUrl(query)) {
        const inferred = inferRetailerFromUrl(query);
        if (inferred === retailer && handler.scrapeProduct) {
            return handler.scrapeProduct(query);
        }
    }

    return handler.search(query, options);
}

async function lookupAmazon({ query, asin, price, limit = 6 }) {
    if (asin) {
        return amazon.lookupByAsin(asin);
    }
    if (!query) return null;

    const results = await amazon.search(query, { limit });
    const best = pickBestMatch(
        results,
        { title: query, price: typeof price === 'number' ? price : null },
        0.2
    ) || results[0];
    if (!best) return null;

    // If the best match lacks price, try a product page lookup
    if (!best.price && best.asin) {
        const lookup = await amazon.lookupByAsin(best.asin);
        return { ...best, ...lookup };
    }

    return best;
}

module.exports = {
    scrapeRetailer,
    lookupAmazon,
    inferRetailerFromUrl
};
