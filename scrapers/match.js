function normalizeText(text) {
    return (text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const STOPWORDS = new Set([
    'the',
    'and',
    'or',
    'for',
    'with',
    'a',
    'an',
    'of',
    'to',
    'in',
    'on',
    'at',
    'by',
    'from',
    'edition',
    'standard',
    'deluxe',
    'ultimate',
    'bundle',
    'new',
    'sale'
]);

const PLATFORM_KEYWORDS = [
    'ps5',
    'playstation 5',
    'playstation5',
    'ps4',
    'playstation 4',
    'xbox',
    'xbox series',
    'nintendo switch',
    'switch'
];

const CONSOLE_KEYWORDS = [
    'console',
    'system',
    'digital edition',
    'disc edition'
];

const ACCESSORY_KEYWORDS = [
    'controller',
    'headset',
    'charging',
    'dock',
    'stand',
    'case',
    'cover',
    'skin',
    'cable',
    'adapter',
    'remote',
    'camera'
];

const SUBSCRIPTION_KEYWORDS = [
    'subscription',
    'membership',
    'game pass',
    'playstation plus',
    'ps plus'
];

const GIFTCARD_KEYWORDS = [
    'gift card',
    'giftcard',
    'digital code',
    'download code'
];

function tokenSet(text) {
    return new Set(
        normalizeText(text)
            .split(' ')
            .filter(token => token && !STOPWORDS.has(token))
    );
}

function jaccardSimilarity(a, b) {
    const setA = tokenSet(a);
    const setB = tokenSet(b);
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const token of setA) {
        if (setB.has(token)) intersection += 1;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

function bigramSet(text) {
    const tokens = Array.from(tokenSet(text));
    const grams = new Set();
    for (let i = 0; i < tokens.length - 1; i += 1) {
        grams.add(`${tokens[i]} ${tokens[i + 1]}`);
    }
    return grams;
}

function jaccardFromSets(setA, setB) {
    if (!setA.size || !setB.size) return 0;
    let intersection = 0;
    for (const token of setA) {
        if (setB.has(token)) intersection += 1;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
}

function textSimilarity(a, b) {
    const tokenScore = jaccardSimilarity(a, b);
    const bigramScore = jaccardFromSets(bigramSet(a), bigramSet(b));
    return (tokenScore * 0.7) + (bigramScore * 0.3);
}

function hasKeyword(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
}

function classifyTitle(title) {
    const normalized = normalizeText(title);
    const isBundle = normalized.includes('bundle');
    const isConsole =
        hasKeyword(normalized, CONSOLE_KEYWORDS) ||
        (isBundle && hasKeyword(normalized, PLATFORM_KEYWORDS));
    const isAccessory = hasKeyword(normalized, ACCESSORY_KEYWORDS);
    const isGiftCard = hasKeyword(normalized, GIFTCARD_KEYWORDS);
    const isSubscription = hasKeyword(normalized, SUBSCRIPTION_KEYWORDS);
    const isGame =
        (!isConsole && !isAccessory && !isGiftCard && !isSubscription) &&
        (normalized.includes('game') ||
            normalized.includes('edition') ||
            hasKeyword(normalized, PLATFORM_KEYWORDS));

    return {
        isBundle,
        isConsole,
        isAccessory,
        isGiftCard,
        isSubscription,
        isGame
    };
}

function typeMatchFactor(targetTitle, candidateTitle) {
    const target = classifyTitle(targetTitle);
    const candidate = classifyTitle(candidateTitle);

    let factor = 1;
    if (target.isGiftCard && !candidate.isGiftCard) factor *= 0.2;
    if (target.isSubscription && !candidate.isSubscription) factor *= 0.2;

    if (target.isGame && (candidate.isConsole || candidate.isBundle)) factor *= 0.3;
    if (target.isConsole && candidate.isGame) factor *= 0.3;
    if (target.isAccessory && (candidate.isConsole || candidate.isBundle)) factor *= 0.3;
    if (target.isAccessory && candidate.isGame) factor *= 0.6;

    if (!target.isBundle && candidate.isBundle) factor *= 0.5;
    if (target.isBundle && !candidate.isBundle) factor *= 0.7;

    const sameType =
        (target.isConsole && candidate.isConsole) ||
        (target.isGame && candidate.isGame) ||
        (target.isAccessory && candidate.isAccessory) ||
        (target.isGiftCard && candidate.isGiftCard) ||
        (target.isSubscription && candidate.isSubscription);
    if (sameType) factor *= 1.1;

    return factor;
}

function priceScore(targetPrice, candidatePrice, minRatio, maxRatio) {
    if (typeof targetPrice !== 'number' || typeof candidatePrice !== 'number') return 0.5;
    if (targetPrice <= 0 || candidatePrice <= 0) return 0.5;

    const ratio = candidatePrice / targetPrice;
    if (!Number.isFinite(ratio) || ratio <= 0) return 0;
    if (ratio < minRatio || ratio > maxRatio) return -1;

    const maxLog = Math.abs(Math.log(maxRatio));
    if (!maxLog) return 1;
    const diff = Math.abs(Math.log(ratio));
    return Math.max(0, 1 - diff / maxLog);
}

function pickBestMatch(candidates, target, minScore = 0.2, options = {}) {
    const targetObj = typeof target === 'string' ? { title: target } : (target || {});
    const title = targetObj.title || '';
    const targetPrice = typeof targetObj.price === 'number' ? targetObj.price : null;

    const envMin = Number(process.env.MATCH_PRICE_MIN_RATIO);
    const envMax = Number(process.env.MATCH_PRICE_MAX_RATIO);
    const minRatio = options.minPriceRatio ?? (Number.isFinite(envMin) ? envMin : 0.4);
    const maxRatio = options.maxPriceRatio ?? (Number.isFinite(envMax) ? envMax : 3.0);
    const strictPrice = options.strictPrice ?? (typeof targetPrice === 'number');

    let best = null;
    let bestScore = minScore;
    for (const candidate of candidates) {
        const candidateTitle = candidate.title || '';
        const baseScore = textSimilarity(candidateTitle, title);
        const price = priceScore(targetPrice, candidate.price, minRatio, maxRatio);
        if (price === -1 && strictPrice) {
            continue;
        }

        const typeFactor = typeMatchFactor(title, candidateTitle);
        const blended = (baseScore * 0.7) + (price * 0.3);
        const score = blended * typeFactor;
        if (score > bestScore) {
            bestScore = score;
            best = { ...candidate, score };
        }
    }
    return best;
}

module.exports = {
    normalizeText,
    jaccardSimilarity,
    pickBestMatch
};
