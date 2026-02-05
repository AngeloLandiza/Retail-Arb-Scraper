const DEFAULT_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Dest': 'document'
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}) {
    const timeoutMs = options.timeoutMs || 12000;
    const retries = options.retries || 0;
    const retryDelayMs = options.retryDelayMs || 500;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...DEFAULT_HEADERS,
                ...(options.headers || {})
            },
            signal: controller.signal
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchText(url, options = {}) {
    let attempt = 0;
    while (true) {
        try {
            const response = await fetchWithTimeout(url, options);
            if (!response.ok) {
                const error = new Error(`Request failed: ${response.status} ${response.statusText}`);
                error.status = response.status;
                throw error;
            }
            return response.text();
        } catch (error) {
            if (attempt >= (options.retries || 0)) {
                throw error;
            }
            attempt += 1;
            await sleep(options.retryDelayMs || 500);
        }
    }
}

async function fetchJson(url, options = {}) {
    let attempt = 0;
    while (true) {
        try {
            const response = await fetchWithTimeout(url, options);
            if (!response.ok) {
                const error = new Error(`Request failed: ${response.status} ${response.statusText}`);
                error.status = response.status;
                throw error;
            }
            return response.json();
        } catch (error) {
            if (attempt >= (options.retries || 0)) {
                throw error;
            }
            attempt += 1;
            await sleep(options.retryDelayMs || 500);
        }
    }
}

module.exports = {
    DEFAULT_HEADERS,
    fetchText,
    fetchJson,
    fetchWithTimeout,
    sleep
};
