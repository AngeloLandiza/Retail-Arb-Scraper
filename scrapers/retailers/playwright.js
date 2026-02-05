const os = require('os');
const path = require('path');
const fs = require('fs');

function getUserDataDir() {
    const dir = path.join(os.tmpdir(), 'retail-arb-playwright');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

async function fetchWithPlaywright(url, {
    headless = true,
    referer,
    waitForSelector,
    waitForFunction
} = {}) {
    let playwright;
    const useStealth = process.env.PLAYWRIGHT_STEALTH === 'true';
    if (useStealth) {
        try {
            const playwrightExtra = require('playwright-extra');
            const stealthPlugin = require('puppeteer-extra-plugin-stealth')();
            playwrightExtra.use(stealthPlugin);
            playwright = playwrightExtra;
        } catch (error) {
            // fallback to vanilla Playwright
            try {
                playwright = require('playwright');
            } catch (err) {
                return null;
            }
        }
    } else {
        try {
            playwright = require('playwright');
        } catch (error) {
            return null;
        }
    }

    const args = [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
    ];

    const userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

    const usePersistent = process.env.PLAYWRIGHT_PERSISTENT === 'true';
    let browser;
    let context;

    if (usePersistent) {
        context = await playwright.chromium.launchPersistentContext(getUserDataDir(), {
            headless,
            args,
            viewport: { width: 1280, height: 800 },
            locale: 'en-US',
            timezoneId: 'America/New_York',
            userAgent
        });
    } else {
        browser = await playwright.chromium.launch({ headless, args });
        context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
            locale: 'en-US',
            timezoneId: 'America/New_York',
            userAgent
        });
    }

    const page = await context.newPage();
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        window.chrome = { runtime: {} };
    });

    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        ...(referer ? { Referer: referer } : {})
    });

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        if (waitForSelector) {
            await page.waitForSelector(waitForSelector, { timeout: 120000 });
        }
        if (waitForFunction) {
            await page.waitForFunction(waitForFunction, { timeout: 120000 });
        }
        // allow hydration
        await page.waitForTimeout(1500);
        const html = await page.content();

        await context.close();
        if (browser) await browser.close();
        return html;
    } catch (error) {
        await context.close();
        if (browser) await browser.close();
        throw error;
    }
}

module.exports = { fetchWithPlaywright };
