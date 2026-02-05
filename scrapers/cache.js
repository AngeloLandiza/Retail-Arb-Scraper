class TTLCache {
    constructor({ ttlMs = 5 * 60 * 1000, max = 200 } = {}) {
        this.ttlMs = ttlMs;
        this.max = max;
        this.store = new Map();
    }

    get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        const now = Date.now();
        if (now - entry.timestamp > this.ttlMs) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }

    set(key, value) {
        if (this.store.size >= this.max) {
            const oldestKey = this.store.keys().next().value;
            if (oldestKey !== undefined) this.store.delete(oldestKey);
        }
        this.store.set(key, { value, timestamp: Date.now() });
    }

    clear() {
        this.store.clear();
    }
}

module.exports = { TTLCache };
