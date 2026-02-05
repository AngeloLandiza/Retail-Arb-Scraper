const cheerio = require('cheerio');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fetchText, sleep } = require('../http');
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

function mapItemToProduct(item) {
    const price =
        item?.priceInfo?.currentPrice?.price ??
        item?.priceInfo?.currentPrice ??
        item?.priceInfo?.price?.price ??
        item?.priceInfo?.price?.value ??
        item?.priceInfo?.price ??
        item?.price?.price ??
        item?.price?.currentPrice ??
        item?.currentPrice ??
        item?.price ??
        null;

    const original =
        item?.priceInfo?.wasPrice?.price ??
        item?.priceInfo?.wasPrice ??
        item?.priceInfo?.listPrice?.price ??
        item?.priceInfo?.listPrice ??
        item?.priceInfo?.originalPrice ??
        item?.priceInfo?.price?.price ??
        item?.priceInfo?.price ??
        item?.price ??
        null;

    const urlPath =
        item.canonicalUrl ||
        item.productPageUrl ||
        item.productUrl ||
        item.url ||
        item.seoUrl ||
        '';

    const url = urlPath.startsWith('http')
        ? urlPath
        : urlPath
            ? `https://www.walmart.com${urlPath}`
            : '';

    const image =
        item.imageInfo?.thumbnailUrl ||
        item.imageInfo?.thumbnail ||
        item.imageInfo?.allImages?.[0]?.url ||
        item.image ||
        item.primaryImageUrl ||
        '';

    return normalizeRetailProduct({
        id: item.usItemId || item.id,
        title: item.name,
        retailer: 'walmart',
        price,
        originalPrice: original,
        url,
        image,
        stock: item.availabilityStatus || 'Unknown',
        upc: item.upc || null
    });
}

function extractStackItems(data) {
    if (!data) return [];
    const stackNodes = collectByPredicate(
        data,
        (node) => node && typeof node === 'object' && Array.isArray(node.itemStacks),
        10
    );
    const stacks = stackNodes.flatMap(node => node.itemStacks || []);
    const items = stacks.flatMap(stack => stack.items || []);
    return items;
}

function mapFromNextData(data) {
    if (!data) return [];
    const stackItems = extractStackItems(data).map(mapItemToProduct);
    const candidates = collectByPredicate(
        data,
        (node) =>
            node &&
            typeof node === 'object' &&
            node.name &&
            (node.priceInfo || node.price || node.currentPrice) &&
            (node.canonicalUrl || node.productPageUrl || node.productUrl || node.usItemId),
        60
    ).map(mapItemToProduct);

    return [...stackItems, ...candidates];
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
                            retailer: 'walmart',
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

    $('[data-item-id]').each((_, el) => {
        const title = $(el).find('span.lh-copy').first().text().trim();
        const priceText = $(el).find('span[class*="price"] span').first().text().trim();
        const url = $(el).find('a').first().attr('href');
        const image = $(el).find('img').first().attr('src');
        if (!title) return;
        products.push(
            normalizeRetailProduct({
                id: $(el).attr('data-item-id'),
                title,
                retailer: 'walmart',
                price: safeNumber(priceText),
                originalPrice: safeNumber(priceText),
                url: url ? `https://www.walmart.com${url}` : '',
                image
            })
        );
    });

    return products;
}

async function search(query, { limit = 24, delayMs = 750 } = {}) {
    const url = `https://www.walmart.com/search?q=${encodeURIComponent(query)}`;
    let html = await fetchText(url, {
        timeoutMs: 30000,
        retries: 2,
        retryDelayMs: 800,
        headers: {
            Referer: 'https://www.walmart.com/'
        }
    });

    if (/verify you are human|captcha|px-captcha|robot/i.test(html)) {
        const usePlaywright =
            process.env.WALMART_USE_PLAYWRIGHT === 'true' ||
            process.env.USE_PLAYWRIGHT === 'true';
        if (usePlaywright) {
            const headlessEnv =
                process.env.WALMART_PLAYWRIGHT_HEADLESS ?? process.env.PLAYWRIGHT_HEADLESS;
            const headless = headlessEnv === undefined ? true : headlessEnv !== 'false';
            const fallbackHtml = await fetchWithPlaywright(url, {
                headless,
                referer: 'https://www.walmart.com/',
                waitForFunction: () =>
                    !!document.querySelector('script#__NEXT_DATA__') ||
                    !!document.querySelector('[data-item-id]') ||
                    document.documentElement.innerHTML.includes('itemStacks')
            });
            if (fallbackHtml) {
                html = fallbackHtml;
            } else {
                throw new Error('Walmart blocked the request. Playwright not installed for fallback.');
            }
        } else {
            throw new Error('Walmart blocked the request (captcha/anti-bot). Set USE_PLAYWRIGHT=true (or WALMART_USE_PLAYWRIGHT=true) to use browser fallback. For manual captcha solving, set PLAYWRIGHT_HEADLESS=false.');
        }
    }

    if (process.env.SCRAPER_DEBUG === 'true') {
        const dir = path.join(os.tmpdir(), 'retail-arb-scraper');
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `walmart-search-${Date.now()}.html`);
        fs.writeFileSync(file, html, 'utf8');
        console.log(`[DEBUG] Walmart HTML saved to ${file}`);
    }

    const nextData = extractNextData(html);
    const reduxState =
        extractWindowState(html, 'window.__WML_REDUX_INITIAL_STATE__') ||
        extractWindowState(html, 'window.__PRELOADED_STATE__') ||
        extractWindowState(html, 'window.__INITIAL_STATE__');
    const nextProducts = mapFromNextData(nextData);
    const reduxProducts = mapFromNextData(reduxState);

    const ldProducts = mapFromLdJson(extractLdJson(html));
    const htmlProducts = mapFromHtml(html);

    const merged = dedupeBy(
        [...nextProducts, ...reduxProducts, ...ldProducts, ...htmlProducts],
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
    const nextProducts = mapFromNextData(nextData);
    return nextProducts.slice(0, 1);
}

module.exports = {
    search,
    scrapeProduct
};
