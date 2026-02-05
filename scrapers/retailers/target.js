const cheerio = require('cheerio');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { fetchText, fetchJson, sleep } = require('../http');
const { fetchWithPlaywright } = require('./playwright');
const {
    extractNextData,
    extractLdJson,
    collectByPredicate,
    normalizeRetailProduct,
    safeNumber,
    dedupeBy
} = require('../parse');

// fetchWithPlaywright now shared in ./playwright

const TARGET_API_ENDPOINT =
    'https://redsky.target.com/redsky_aggregations/v1/web/plp_search_v2';
const TARGET_PDP_ENDPOINT =
    'https://redsky.target.com/redsky_aggregations/v1/web/pdp_client_v1';
const TARGET_API_KEY =
    process.env.TARGET_API_KEY || '9f36aeafbe60771e321a7cc95a78140772ab3e96';
const DEFAULT_PRICING_STORE_ID = process.env.TARGET_PRICING_STORE_ID || '3991';

function randomVisitorId() {
    return `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function normalizeTargetUrl(urlPath) {
    if (!urlPath) return '';
    if (urlPath.startsWith('http')) return urlPath;
    return `https://www.target.com${urlPath}`;
}

function parseTargetRedirect(redirectUrl) {
    if (!redirectUrl) return null;
    try {
        const parsed = new URL(redirectUrl, 'https://www.target.com');
        const match = parsed.pathname.match(/\/N-([a-z0-9]+)/i);
        if (!match) return null;
        return { category: match[1], page: parsed.pathname };
    } catch (error) {
        return null;
    }
}

function mapFromTargetApi(products = []) {
    if (!Array.isArray(products)) return [];
    return products.map((product) => {
        const item = product.item || {};
        const description = item.product_description || {};
        const enrichment = item.enrichment || {};
        const images = enrichment.images || {};
        const priceInfo = product.price || item.price || {};

        const title = description.title || product.title || product.name;
        const price =
            priceInfo.current_retail ??
            priceInfo.formatted_current_price ??
            product.offer_price ??
            product.current_retail ??
            product.reg_retail ??
            null;
        const original = priceInfo.reg_retail ?? product.reg_retail ?? price;
        const urlPath =
            enrichment.buy_url ||
            enrichment.url ||
            product.url ||
            product.canonical_url ||
            product.pdp_url ||
            '';
        const image =
            images.primary_image_url ||
            images.primary_image_url_large ||
            images.primary_image_url_small ||
            images.primary_image_url_medium ||
            images.primary_image_url_xlarge ||
            product.primary_image_url ||
            product.image_url ||
            '';

        return normalizeRetailProduct({
            id: product.tcin || item.tcin || product.parent_tcin || item.parent_tcin,
            title,
            retailer: 'target',
            price: safeNumber(price),
            originalPrice: safeNumber(original),
            url: normalizeTargetUrl(urlPath),
            image,
            stock: product.availability_status || item.availability_status || 'Unknown',
            upc: item.upc || null
        });
    });
}

function mapFromTargetPdp(data) {
    const product = data?.data?.product;
    if (!product) return null;
    const item = product.item || {};
    const description = item.product_description || {};
    const enrichment = item.enrichment || {};
    const images = enrichment.images || {};
    const priceInfo = product.price || item.price || {};

    const title = description.title || item.title || product.title;
    const urlPath = enrichment.buy_url || item.buy_url || '';
    const image =
        images.primary_image_url ||
        images.primary_image_url_large ||
        images.primary_image_url_medium ||
        images.primary_image_url_small ||
        images.primary_image_url_xlarge ||
        '';

    return normalizeRetailProduct({
        id: item.tcin || product.tcin,
        title,
        retailer: 'target',
        price: safeNumber(priceInfo.current_retail ?? priceInfo.formatted_current_price),
        originalPrice: safeNumber(priceInfo.reg_retail ?? priceInfo.formatted_regular_price),
        url: normalizeTargetUrl(urlPath || item.website_url || ''),
        image,
        stock: product.fulfillment?.shipping_options?.[0]?.availability_status || 'Unknown',
        upc: item.upc || null
    });
}

async function fetchTargetPdp(tcin) {
    const storeId = DEFAULT_PRICING_STORE_ID;
    const params = new URLSearchParams({
        key: TARGET_API_KEY,
        tcin,
        store_id: storeId,
        pricing_store_id: storeId
    });
    const url = `${TARGET_PDP_ENDPOINT}?${params.toString()}`;
    return fetchJson(url, {
        timeoutMs: 15000,
        headers: {
            Accept: 'application/json, text/plain, */*',
            Referer: 'https://www.target.com/'
        }
    });
}

async function searchTargetViaJina(query, { limit = 24 } = {}) {
    const jinaUrl = `https://r.jina.ai/http://https://www.target.com/s?searchTerm=${encodeURIComponent(
        query
    )}`;
    const markdown = await fetchText(jinaUrl, { timeoutMs: 20000 });
    const matches = [];
    const regex =
        /\[!\[Image\s+\d+:\s+([^\]]+?)\]\([^\)]*\)\]\((https:\/\/www\.target\.com\/p\/[^\)]+)\)/gi;
    let match;
    while ((match = regex.exec(markdown)) && matches.length < limit * 2) {
        const title = match[1].trim();
        const url = match[2];
        const tcinMatch = url.match(/\/A-(\d+)/i);
        if (!tcinMatch) continue;
        matches.push({ title, url, tcin: tcinMatch[1] });
    }

    const unique = [];
    const seen = new Set();
    for (const item of matches) {
        if (seen.has(item.tcin)) continue;
        seen.add(item.tcin);
        unique.push(item);
        if (unique.length >= limit) break;
    }

    const results = [];
    let index = 0;
    const workers = Array.from({ length: Math.min(4, unique.length) }, async () => {
        while (index < unique.length) {
            const current = unique[index++];
            try {
                const data = await fetchTargetPdp(current.tcin);
                const product = mapFromTargetPdp(data);
                if (product) results.push(product);
            } catch (error) {
                // ignore individual failures
            }
        }
    });
    await Promise.all(workers);
    return results.slice(0, limit);
}

async function fetchTargetApi(params) {
    const url = `${TARGET_API_ENDPOINT}?${params.toString()}`;
    return fetchJson(url, {
        timeoutMs: 15000,
        headers: {
            Accept: 'application/json, text/plain, */*',
            Referer: 'https://www.target.com/'
        }
    });
}

async function searchTargetApi(query, { limit = 24 } = {}) {
    const visitorId = randomVisitorId();
    const storeId = DEFAULT_PRICING_STORE_ID;
    const baseParams = {
        key: TARGET_API_KEY,
        channel: 'WEB',
        pricing_store_id: storeId,
        visitor_id: visitorId
    };

    const keywordParams = new URLSearchParams({
        ...baseParams,
        keyword: query,
        page: `/s/${query}`
    });

    const data = await fetchTargetApi(keywordParams);
    const products = mapFromTargetApi(data?.data?.search?.products || data?.search?.products || []);
    if (products.length > 0) {
        return products.slice(0, limit);
    }

    const redirectUrl =
        data?.data?.search?.search_recommendations?.redirect_url ||
        data?.data?.search?.search_recommendations?.redirects?.[0]?.url ||
        data?.search?.search_recommendations?.redirect_url;
    const redirect = parseTargetRedirect(redirectUrl);
    if (!redirect?.category) return [];

    const categoryParams = new URLSearchParams({
        ...baseParams,
        category: redirect.category,
        page: redirect.page
    });
    const categoryData = await fetchTargetApi(categoryParams);
    return mapFromTargetApi(
        categoryData?.data?.search?.products || categoryData?.search?.products || []
    ).slice(0, limit);
}

function mapFromNextData(data) {
    if (!data) return [];
    const candidates = collectByPredicate(
        data,
        (node) =>
            node &&
            typeof node === 'object' &&
            (node.title || node.name) &&
            (node.price || node.offer_price || node.current_retail) &&
            (node.url || node.tcin || node.canonical_url || node.parent_tcin),
        60
    );

    return candidates.map((item) => {
        const title = item.title || item.name;
        const price =
            item.price?.current_retail ??
            item.price?.formatted_current_price ??
            item.offer_price ??
            item.current_retail ??
            item.reg_retail ??
            null;
        const original = item.price?.reg_retail ?? item.reg_retail ?? item.list_price ?? null;
        const urlPath = item.url || item.canonical_url || item.pdp_url || '';
        const url = urlPath.startsWith('http')
            ? urlPath
            : `https://www.target.com${urlPath}`;
        const image =
            item.images?.primary?.url ||
            item.images?.[0]?.url ||
            item.primary_image_url ||
            '';
        return normalizeRetailProduct({
            id: item.tcin || item.parent_tcin || item.id,
            title,
            retailer: 'target',
            price: safeNumber(price),
            originalPrice: safeNumber(original),
            url,
            image,
            stock: item.availability_status || 'Unknown',
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
                            retailer: 'target',
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

    $('[data-test="product-title"]').each((_, el) => {
        const card = $(el).closest('[data-test="product-card"]');
        const title = $(el).text().trim();
        const priceText = card.find('[data-test="product-price"] span').first().text().trim();
        const url = card.find('a').first().attr('href');
        const image = card.find('img').first().attr('src');
        if (!title) return;
        products.push(
            normalizeRetailProduct({
                title,
                retailer: 'target',
                price: safeNumber(priceText),
                originalPrice: safeNumber(priceText),
                url: url ? `https://www.target.com${url}` : '',
                image
            })
        );
    });

    return products;
}

async function search(query, { limit = 24, delayMs = 750 } = {}) {
    try {
        const apiProducts = await searchTargetApi(query, { limit });
        if (apiProducts.length > 0) {
            if (delayMs) await sleep(delayMs);
            return apiProducts.slice(0, limit);
        }
    } catch (error) {
        if (process.env.SCRAPER_DEBUG === 'true') {
            console.warn(`[DEBUG] Target API search failed: ${error.message}`);
        }
    }

    try {
        const jinaProducts = await searchTargetViaJina(query, { limit });
        if (jinaProducts.length > 0) {
            if (delayMs) await sleep(delayMs);
            return jinaProducts.slice(0, limit);
        }
    } catch (error) {
        if (process.env.SCRAPER_DEBUG === 'true') {
            console.warn(`[DEBUG] Target Jina fallback failed: ${error.message}`);
        }
    }

    const url = `https://www.target.com/s?searchTerm=${encodeURIComponent(query)}`;
    let html = await fetchText(url, {
        timeoutMs: 30000,
        retries: 2,
        retryDelayMs: 800,
        headers: {
            Referer: 'https://www.target.com/'
        }
    });

    if (/verify you are human|captcha|robot|access denied/i.test(html)) {
        const usePlaywright =
            process.env.TARGET_USE_PLAYWRIGHT === 'true' ||
            process.env.USE_PLAYWRIGHT === 'true';
        if (usePlaywright) {
            const headlessEnv =
                process.env.TARGET_PLAYWRIGHT_HEADLESS ?? process.env.PLAYWRIGHT_HEADLESS;
            const headless = headlessEnv === undefined ? true : headlessEnv !== 'false';
            const fallbackHtml = await fetchWithPlaywright(url, {
                headless,
                referer: 'https://www.target.com/',
                waitForSelector: '[data-test="product-title"]'
            });
            if (fallbackHtml) {
                html = fallbackHtml;
            } else {
                throw new Error('Target blocked the request. Playwright not installed for fallback.');
            }
        } else {
            throw new Error('Target blocked the request (captcha/anti-bot). Set USE_PLAYWRIGHT=true (or TARGET_USE_PLAYWRIGHT=true) to use browser fallback. For manual captcha solving, set PLAYWRIGHT_HEADLESS=false.');
        }
    }

    if (process.env.SCRAPER_DEBUG === 'true') {
        const dir = path.join(os.tmpdir(), 'retail-arb-scraper');
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `target-search-${Date.now()}.html`);
        fs.writeFileSync(file, html, 'utf8');
        console.log(`[DEBUG] Target HTML saved to ${file}`);
    }

    const nextData = extractNextData(html);
    const nextProducts = mapFromNextData(nextData);

    const ldProducts = mapFromLdJson(extractLdJson(html));
    const htmlProducts = mapFromHtml(html);

    const merged = dedupeBy(
        [...nextProducts, ...ldProducts, ...htmlProducts],
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
