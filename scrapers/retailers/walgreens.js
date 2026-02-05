const cheerio = require('cheerio');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fetchText, fetchJson, sleep } = require('../http');
const { fetchWithPlaywright } = require('./playwright');
const {
    extractNextData,
    extractWindowState,
    extractLdJson,
    collectByPredicate,
    normalizeRetailProduct,
    safeNumber,
    dedupeBy
} = require('../parse');

// fetchWithPlaywright now shared in ./playwright

const WALGREENS_SEARCH_ENDPOINT =
    'https://www.walgreens.com/productsearch/v1/products/search';
const DEFAULT_STORE_ID = process.env.WALGREENS_STORE_ID || '15196';

function normalizeWalgreensUrl(urlPath) {
    if (!urlPath) return '';
    if (urlPath.startsWith('http')) return urlPath;
    if (urlPath.startsWith('//')) return `https:${urlPath}`;
    return `https://www.walgreens.com${urlPath}`;
}

function mapFromApiProducts(data) {
    if (!data || !data.products) return [];
    const entries = Array.isArray(data.products)
        ? data.products
        : Object.values(data.products);

    return entries.map((entry) => {
        const info = entry.productInfo || entry;
        const title = info.productDisplayName || info.productName || info.name || info.title;
        const priceInfo = info.priceInfo || {};
        const price =
            priceInfo.salePrice ||
            priceInfo.singleUnitSalePrice ||
            priceInfo.regularPrice ||
            priceInfo.originalPrice ||
            null;
        const original =
            priceInfo.regularPrice ||
            priceInfo.originalPrice ||
            priceInfo.salePrice ||
            price;
        const url = normalizeWalgreensUrl(info.productURL || info.productUrl || info.url || '');
        const image = normalizeWalgreensUrl(
            info.imageUrl || info.imageURL || info.imageUrl450 || info.imageUrl50 || ''
        );

        return normalizeRetailProduct({
            id: info.prodId || info.productId || info.skuId || info.articleId,
            title,
            retailer: 'walgreens',
            price: safeNumber(price),
            originalPrice: safeNumber(original),
            url,
            image,
            stock:
                info.inventoryText ||
                info.storeInventoryStatus ||
                info.storeInv ||
                info.availability ||
                'Unknown',
            upc: info.upc || info.storeUPC || null
        });
    });
}

function mapFromState(state) {
    if (!state) return [];
    const candidates = collectByPredicate(
        state,
        (node) =>
            node &&
            typeof node === 'object' &&
            (node.productName || node.name || node.title) &&
            (node.price || node.salePrice || node.regularPrice || node.currentPrice) &&
            (node.url || node.productUrl || node.productId),
        60
    );

    return candidates.map((item) => {
        const title = item.productName || item.name || item.title;
        const price = item.salePrice || item.price || item.currentPrice || item.regularPrice;
        const original = item.regularPrice || item.originalPrice || price;
        const urlPath = item.productUrl || item.url || '';
        const url = urlPath.startsWith('http')
            ? urlPath
            : `https://www.walgreens.com${urlPath}`;
        const image = item.imageUrl || item.thumbnail || item.image || '';
        return normalizeRetailProduct({
            id: item.productId || item.id,
            title,
            retailer: 'walgreens',
            price: safeNumber(price),
            originalPrice: safeNumber(original),
            url,
            image,
            stock: item.availability || 'Unknown',
            upc: item.upc || null
        });
    });
}

function mapFromLdJson(ldBlocks) {
    const products = [];
    ldBlocks.forEach((block) => {
        if (!block) return;
        if (block['@type'] === 'ItemList' && Array.isArray(block.itemListElement)) {
            block.itemListElement.forEach((entry) => {
                const product = entry.item || entry;
                if (product && product.name) {
                    products.push(
                        normalizeRetailProduct({
                            id: product.sku,
                            title: product.name,
                            retailer: 'walgreens',
                            price: product.offers?.price,
                            originalPrice: product.offers?.price,
                            url: product.url,
                            image: Array.isArray(product.image) ? product.image[0] : product.image,
                            stock: product.offers?.availability || 'Unknown'
                        })
                    );
                }
            });
        }
    });
    return products;
}

function mapFromHtml(html) {
    const $ = cheerio.load(html);
    const products = [];

    $('[data-testid="product-card"]').each((_, el) => {
        const title = $(el).find('h2').first().text().trim();
        const priceText = $(el).find('[data-testid="price"]').first().text().trim();
        const url = $(el).find('a').first().attr('href');
        const image = $(el).find('img').first().attr('src');
        if (!title) return;
        products.push(
            normalizeRetailProduct({
                title,
                retailer: 'walgreens',
                price: safeNumber(priceText),
                originalPrice: safeNumber(priceText),
                url: url ? `https://www.walgreens.com${url}` : '',
                image
            })
        );
    });

    return products;
}

async function search(query, { limit = 24, delayMs = 750 } = {}) {
    try {
        const pageSize = Math.min(Math.max(limit, 1), 72);
        const payload = {
            p: 1,
            s: pageSize,
            q: query,
            searchTerm: query,
            requestType: 'search',
            sort: 'relevance',
            storeId: DEFAULT_STORE_ID
        };

        const apiData = await fetchJson(WALGREENS_SEARCH_ENDPOINT, {
            method: 'POST',
            timeoutMs: 20000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                'Origin': 'https://www.walgreens.com',
                'Referer': `https://www.walgreens.com/search/results?Ntt=${encodeURIComponent(
                    query
                )}`
            },
            body: JSON.stringify(payload)
        });

        const apiProducts = mapFromApiProducts(apiData).filter(
            item => item.title && item.price > 0
        );
        if (apiProducts.length > 0) {
            if (delayMs) await sleep(delayMs);
            return apiProducts.slice(0, limit);
        }
    } catch (error) {
        if (process.env.SCRAPER_DEBUG === 'true') {
            console.warn(`[DEBUG] Walgreens API search failed: ${error.message}`);
        }
    }

    const url = `https://www.walgreens.com/search/results?Ntt=${encodeURIComponent(query)}`;
    let html;
    try {
        html = await fetchText(url, {
            timeoutMs: 30000,
            retries: 2,
            retryDelayMs: 800,
            headers: {
                Referer: 'https://www.walgreens.com/'
            }
        });
    } catch (error) {
        const usePlaywright =
            process.env.WALGREENS_USE_PLAYWRIGHT === 'true' ||
            process.env.USE_PLAYWRIGHT === 'true';
        if (usePlaywright) {
            const headlessEnv =
                process.env.WALGREENS_PLAYWRIGHT_HEADLESS ?? process.env.PLAYWRIGHT_HEADLESS;
            const headless = headlessEnv === undefined ? true : headlessEnv !== 'false';
            const fallbackHtml = await fetchWithPlaywright(url, {
                headless,
                referer: 'https://www.walgreens.com/',
                waitForSelector: '[data-testid="product-card"]'
            });
            if (fallbackHtml) {
                html = fallbackHtml;
            } else {
                throw new Error('Walgreens blocked the request. Playwright not installed for fallback.');
            }
        } else {
            throw error;
        }
    }

    if (/verify you are human|captcha|robot|access denied/i.test(html)) {
        const usePlaywright =
            process.env.WALGREENS_USE_PLAYWRIGHT === 'true' ||
            process.env.USE_PLAYWRIGHT === 'true';
        if (usePlaywright) {
            const headlessEnv =
                process.env.WALGREENS_PLAYWRIGHT_HEADLESS ?? process.env.PLAYWRIGHT_HEADLESS;
            const headless = headlessEnv === undefined ? true : headlessEnv !== 'false';
            const fallbackHtml = await fetchWithPlaywright(url, {
                headless,
                referer: 'https://www.walgreens.com/',
                waitForSelector: '[data-testid="product-card"]'
            });
            if (fallbackHtml) {
                html = fallbackHtml;
            } else {
                throw new Error('Walgreens blocked the request. Playwright not installed for fallback.');
            }
        } else {
            throw new Error('Walgreens blocked the request (captcha/anti-bot). Set USE_PLAYWRIGHT=true (or WALGREENS_USE_PLAYWRIGHT=true) to use browser fallback. For manual captcha solving, set PLAYWRIGHT_HEADLESS=false.');
        }
    }

    if (process.env.SCRAPER_DEBUG === 'true') {
        const dir = path.join(os.tmpdir(), 'retail-arb-scraper');
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `walgreens-search-${Date.now()}.html`);
        fs.writeFileSync(file, html, 'utf8');
        console.log(`[DEBUG] Walgreens HTML saved to ${file}`);
    }

    const nextData = extractNextData(html);
    const windowState =
        extractWindowState(html, 'window.__PRELOADED_STATE__') ||
        extractWindowState(html, 'window.__INITIAL_STATE__') ||
        extractWindowState(html, '__APP_INITIAL_STATE__');

    const stateProducts = mapFromState(nextData || windowState);
    const ldProducts = mapFromLdJson(extractLdJson(html));
    const htmlProducts = mapFromHtml(html);

    const merged = dedupeBy(
        [...stateProducts, ...ldProducts, ...htmlProducts],
        (item) => item.url || item.id
    ).filter(item => item.title && item.price > 0);

    if (delayMs) await sleep(delayMs);

    return merged.slice(0, limit);
}

async function scrapeProduct(url) {
    const html = await fetchText(url, { timeoutMs: 15000 });
    const ldProducts = mapFromLdJson(extractLdJson(html));
    if (ldProducts.length > 0) return ldProducts.slice(0, 1);
    const nextData = extractNextData(html);
    const windowState =
        extractWindowState(html, 'window.__PRELOADED_STATE__') ||
        extractWindowState(html, 'window.__INITIAL_STATE__');
    const stateProducts = mapFromState(nextData || windowState);
    return stateProducts.slice(0, 1);
}

module.exports = {
    search,
    scrapeProduct
};
