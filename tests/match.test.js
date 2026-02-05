const { pickBestMatch } = require('../scrapers/match');

describe('Amazon Match Scoring', () => {
    test('should avoid console bundle when target is a game with lower price', () => {
        const target = {
            title: "Marvel's Spider-Man 2 - PlayStation 5",
            price: 69.99
        };

        const candidates = [
            {
                title: 'PlayStation 5 Console - Marvel’s Spider-Man 2 Bundle',
                price: 499.99,
                asin: 'BUNDLE123'
            },
            {
                title: "Marvel's Spider-Man 2 - PlayStation 5",
                price: 69.99,
                asin: 'GAME123'
            }
        ];

        const best = pickBestMatch(candidates, target, 0.2);
        expect(best).not.toBeNull();
        expect(best.asin).toBe('GAME123');
    });

    test('should fall back to best text match when price is missing', () => {
        const target = {
            title: 'DualSense Wireless Controller - PS5',
            price: null
        };

        const candidates = [
            {
                title: 'DualSense Wireless Controller for PlayStation 5',
                price: 69.99,
                asin: 'CTRL123'
            },
            {
                title: 'PlayStation 5 Console',
                price: 499.99,
                asin: 'CONSOLE123'
            }
        ];

        const best = pickBestMatch(candidates, target, 0.2);
        expect(best).not.toBeNull();
        expect(best.asin).toBe('CTRL123');
    });
});
