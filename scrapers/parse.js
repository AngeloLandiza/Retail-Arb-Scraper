const cheerio = require('cheerio');

function extractScriptJson(html, matcher) {
    if (!html) return null;
    const match = html.match(matcher);
    if (!match || !match[1]) return null;
    try {
        return JSON.parse(match[1]);
    } catch (error) {
        return null;
    }
}

function extractNextData(html) {
    return extractScriptJson(
        html,
        /<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s
    );
}

function extractWindowState(html, varName) {
    const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matcher = new RegExp(
        `(?:window\\.)?${escaped}\\s*=\\s*(\\{.*?\\})\\s*(?:;|<\\/script>)`,
        's'
    );
    return extractScriptJson(html, matcher);
}

function extractLdJson(html) {
    if (!html) return [];
    const $ = cheerio.load(html);
    const results = [];
    $('script[type="application/ld+json"]').each((_, el) => {
        const text = $(el).text();
        if (!text) return;
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                parsed.forEach(item => results.push(item));
            } else {
                results.push(parsed);
            }
        } catch (error) {
            // Ignore malformed JSON-LD blocks
        }
    });
    return results;
}

function walkObject(node, visitor) {
    if (!node || typeof node !== 'object') return;
    visitor(node);
    if (Array.isArray(node)) {
        node.forEach(child => walkObject(child, visitor));
        return;
    }
    Object.values(node).forEach(child => walkObject(child, visitor));
}

function collectByPredicate(data, predicate, limit = 50) {
    const results = [];
    walkObject(data, (node) => {
        if (results.length >= limit) return;
        if (predicate(node)) {
            results.push(node);
        }
    });
    return results;
}

function safeText(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    return String(value).trim();
}

function safeNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const cleaned = String(value).replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRetailProduct({
    id,
    title,
    retailer,
    price,
    originalPrice,
    url,
    image,
    clearance = false,
    stock = 'Unknown',
    upc = null
}) {
    const normalizedPrice = safeNumber(price) ?? 0;
    const normalizedOriginal = safeNumber(originalPrice) ?? normalizedPrice;
    return {
        id: id || `${retailer}-${Buffer.from((title || '').slice(0, 32)).toString('hex')}`,
        title: safeText(title),
        retailer,
        price: normalizedPrice,
        originalPrice: normalizedOriginal,
        url: safeText(url),
        image: safeText(image),
        clearance: Boolean(clearance || (normalizedOriginal > normalizedPrice)),
        stock: stock || 'Unknown',
        upc: upc || null
    };
}

function normalizeAmazonResult({
    asin,
    title,
    price,
    url,
    image,
    rating,
    reviews,
    salesRank
}) {
    return {
        asin: safeText(asin),
        title: safeText(title),
        price: safeNumber(price),
        url: safeText(url),
        image: safeText(image),
        rating: safeNumber(rating),
        reviews: safeNumber(reviews),
        salesRank: safeNumber(salesRank)
    };
}

function dedupeBy(items, keyFn) {
    const seen = new Set();
    const results = [];
    for (const item of items) {
        const key = keyFn(item);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        results.push(item);
    }
    return results;
}

module.exports = {
    extractNextData,
    extractWindowState,
    extractLdJson,
    collectByPredicate,
    safeNumber,
    safeText,
    normalizeRetailProduct,
    normalizeAmazonResult,
    dedupeBy
};
