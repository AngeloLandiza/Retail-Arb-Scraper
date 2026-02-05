const cheerio = require('cheerio');
const { fetchText, sleep } = require('../http');
const { extractLdJson, normalizeAmazonResult, safeNumber, dedupeBy } = require('../parse');

const AMAZON_MOBILE_UA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

function parsePrice(whole, fraction) {
    if (!whole && !fraction) return null;
    const wholeClean = (whole || '').replace(/[^0-9]/g, '');
    const fractionClean = (fraction || '').replace(/[^0-9]/g, '');
    if (!wholeClean) return null;
    const amount = `${wholeClean}.${fractionClean || '00'}`;
    return safeNumber(amount);
}

function parseCompactNumber(text) {
    if (!text) return null;
    const cleaned = String(text).toLowerCase().replace(/,/g, '').trim();
    const match = cleaned.match(/([0-9.]+)\s*([km])?/i);
    if (!match) return safeNumber(cleaned);
    const value = parseFloat(match[1]);
    if (!Number.isFinite(value)) return null;
    const suffix = match[2];
    if (suffix === 'k') return Math.round(value * 1000);
    if (suffix === 'm') return Math.round(value * 1000000);
    return Math.round(value);
}

function parseRatingReviews(label) {
    if (!label) return { rating: null, reviews: null };
    const ratingMatch = label.match(/([0-9.]+)\s*out of 5/i);
    const reviewMatch = label.match(/([0-9.,]+)\s*review/i);
    return {
        rating: ratingMatch ? safeNumber(ratingMatch[1]) : null,
        reviews: reviewMatch ? parseCompactNumber(reviewMatch[1]) : null
    };
}

function normalizeAmazonImage(url) {
    if (!url) return '';
    if (url.startsWith('//')) return `https:${url}`;
    return url;
}

function isAmazonBlocked(html) {
    return /captcha|robot check|enter the characters/i.test(html || '');
}

async function fetchAmazonHtml(url, { timeoutMs = 15000 } = {}) {
    return fetchText(url, {
        timeoutMs,
        headers: {
            'User-Agent': AMAZON_MOBILE_UA,
            'Accept-Language': 'en-US,en;q=0.9',
            Referer: 'https://www.amazon.com/'
        }
    });
}

function extractSearchTitle($el) {
    const selectors = [
        'h2 span',
        'span.a-size-base-plus',
        'span.a-size-medium',
        'span.a-color-base.a-text-normal'
    ];
    for (const selector of selectors) {
        const text = $el.find(selector).first().text().trim();
        if (text) return text;
    }

    const aria = $el.find('a[aria-label*="detail page"]').first().attr('aria-label') || '';
    if (!aria) return '';
    return aria
        .replace(/^Go to detail page for\s+\"?/i, '')
        .replace(/\"?\s*Eligible.*$/i, '')
        .trim();
}

function extractSearchPrice($el) {
    const offscreen = $el.find('span.a-price > span.a-offscreen').first().text().trim();
    if (offscreen) return safeNumber(offscreen);
    const whole = $el.find('span.a-price-whole').first().text();
    const fraction = $el.find('span.a-price-fraction').first().text();
    return parsePrice(whole, fraction);
}

function extractSearchImage($el) {
    const imageCandidates = $el
        .find('img')
        .toArray()
        .map((img) => (img.attribs ? img.attribs.src : ''))
        .filter(Boolean);

    const preferred = imageCandidates.find((src) => /images\/I\//.test(src));
    return normalizeAmazonImage(preferred || imageCandidates[0] || '');
}

function extractSearchRating($el) {
    const label =
        $el.find('[aria-label*="out of 5 stars"]').first().attr('aria-label') || '';
    const parsed = parseRatingReviews(label);
    const ratingText = $el.find('span.a-icon-alt').first().text().trim();
    const rating = parsed.rating ?? (ratingText ? safeNumber(ratingText.split(' ')[0]) : null);
    return {
        rating,
        reviews: parsed.reviews
    };
}

function mapSearchResults(html) {
    const $ = cheerio.load(html);
    const results = [];

    $('[data-asin]').each((_, el) => {
        const asin = $(el).attr('data-asin');
        if (!asin) return;
        const $el = $(el);

        const title = extractSearchTitle($el);
        if (!title) return;

        const price = extractSearchPrice($el);
        const image = extractSearchImage($el);
        const { rating, reviews } = extractSearchRating($el);

        results.push(
            normalizeAmazonResult({
                asin,
                title,
                price,
                url: `https://www.amazon.com/dp/${asin}`,
                image,
                rating,
                reviews
            })
        );
    });

    return results;
}

function mapFromLdJson(ldBlocks) {
    const products = [];
    ldBlocks.forEach((block) => {
        if (!block) return;
        if (block['@type'] === 'Product') {
            products.push(
                normalizeAmazonResult({
                    asin: block.sku,
                    title: block.name,
                    price: block.offers?.price,
                    url: block.offers?.url || block.url,
                    image: Array.isArray(block.image) ? block.image[0] : block.image,
                    rating: block.aggregateRating?.ratingValue,
                    reviews: block.aggregateRating?.reviewCount
                })
            );
        }
        if (block['@type'] === 'ItemList' && Array.isArray(block.itemListElement)) {
            block.itemListElement.forEach((entry) => {
                const product = entry.item || entry;
                if (product && product.name) {
                    products.push(
                        normalizeAmazonResult({
                            asin: product.sku,
                            title: product.name,
                            price: product.offers?.price,
                            url: product.url,
                            image: Array.isArray(product.image) ? product.image[0] : product.image,
                            rating: product.aggregateRating?.ratingValue,
                            reviews: product.aggregateRating?.reviewCount
                        })
                    );
                }
            });
        }
    });
    return products;
}

function parseDynamicImage(value) {
    if (!value) return null;
    try {
        const parsed = JSON.parse(value);
        const urls = Object.keys(parsed || {});
        return urls.length > 0 ? urls[0] : null;
    } catch (error) {
        return null;
    }
}

function parseAmazonProductPage(html, asin, url) {
    const $ = cheerio.load(html);

    const title =
        $('#productTitle').text().trim() ||
        $('#title').text().trim() ||
        $('h1').first().text().trim();

    const price =
        safeNumber($('#priceblock_ourprice').text()) ||
        safeNumber($('#priceblock_dealprice').text()) ||
        safeNumber($('#priceblock_saleprice').text()) ||
        safeNumber($('span.a-price > span.a-offscreen').first().text()) ||
        safeNumber($('#price').text()) ||
        null;

    const image =
        normalizeAmazonImage($('#main-image').attr('src')) ||
        normalizeAmazonImage($('#landingImage').attr('src')) ||
        normalizeAmazonImage($('img[data-old-hires]').attr('data-old-hires')) ||
        normalizeAmazonImage(parseDynamicImage($('img[data-a-dynamic-image]').attr('data-a-dynamic-image'))) ||
        normalizeAmazonImage($('meta[property="og:image"]').attr('content')) ||
        normalizeAmazonImage($('img').first().attr('src')) ||
        '';

    const ratingText = $('span.a-icon-alt').first().text().trim();
    const rating = ratingText ? safeNumber(ratingText.split(' ')[0]) : null;

    const reviewText =
        $('#acrCustomerReviewText').text().trim() ||
        $('a[href*="#customerReviews"]').first().text().trim() ||
        '';
    const reviewParen = reviewText.match(/\(([^)]+)\)/);
    const reviews = reviewParen ? parseCompactNumber(reviewParen[1]) : parseCompactNumber(reviewText);

    return normalizeAmazonResult({
        asin,
        title,
        price,
        url,
        image,
        rating,
        reviews
    });
}

async function search(query, { limit = 10, delayMs = 600 } = {}) {
    const url = `https://www.amazon.com/gp/aw/s?k=${encodeURIComponent(query)}`;
    const html = await fetchAmazonHtml(url, { timeoutMs: 20000 });

    if (isAmazonBlocked(html)) {
        throw new Error('Amazon blocked the request (captcha/anti-bot). Try again later.');
    }

    const htmlResults = mapSearchResults(html);
    const ldResults = mapFromLdJson(extractLdJson(html));

    const merged = dedupeBy([...htmlResults, ...ldResults], (item) => item.asin || item.url);

    if (delayMs) await sleep(delayMs);

    return merged.slice(0, limit);
}

async function lookupByAsin(asin, { delayMs = 400 } = {}) {
    const url = `https://www.amazon.com/dp/${asin}`;
    const html = await fetchAmazonHtml(url, { timeoutMs: 20000 });

    if (isAmazonBlocked(html)) {
        throw new Error('Amazon blocked the request (captcha/anti-bot). Try again later.');
    }

    const ldResults = mapFromLdJson(extractLdJson(html));
    const ldProduct = ldResults.find(item => item.asin || item.title) || null;
    if (ldProduct) {
        if (delayMs) await sleep(delayMs);
        return normalizeAmazonResult({
            asin: ldProduct.asin || asin,
            title: ldProduct.title,
            price: ldProduct.price,
            url: ldProduct.url || url,
            image: ldProduct.image,
            rating: ldProduct.rating,
            reviews: ldProduct.reviews,
            salesRank: ldProduct.salesRank
        });
    }

    const parsed = parseAmazonProductPage(html, asin, url);
    if (delayMs) await sleep(delayMs);
    return parsed.title ? parsed : normalizeAmazonResult({ asin, url });
}

module.exports = {
    search,
    lookupByAsin
};
