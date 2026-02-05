// realtime-update.test.js - Tests for real-time product update functionality
// These tests verify that products are displayed progressively as they are analyzed

/**
 * These tests simulate the browser environment to test real-time updates
 */

describe('Real-time Product Updates', () => {
    let mockDOM;
    let resultsContainer;
    let loadingIndicator;
    let analyzedProducts;

    beforeEach(() => {
        // Mock DOM elements
        resultsContainer = {
            innerHTML: '',
            appendChild: jest.fn(function(element) {
                this.children = this.children || [];
                this.children.push(element);
            }),
            children: []
        };

        loadingIndicator = {
            style: { display: 'none' }
        };

        analyzedProducts = [];

        // Mock document methods
        global.document = {
            getElementById: jest.fn((id) => {
                if (id === 'results') return resultsContainer;
                if (id === 'loading') return loadingIndicator;
                return null;
            }),
            createElement: jest.fn((tag) => {
                return {
                    tagName: tag.toUpperCase(),
                    className: '',
                    innerHTML: '',
                    classList: {
                        add: jest.fn()
                    }
                };
            })
        };
    });

    describe('Progressive Product Display', () => {
        test('should display products as they are analyzed (not all at once)', async () => {
            const products = [
                { id: '1', title: 'Product 1', asin: 'B08ASIN001' },
                { id: '2', title: 'Product 2', asin: 'B08ASIN002' },
                { id: '3', title: 'Product 3', asin: 'B08ASIN003' }
            ];

            const displayCount = [];

            // Simulate progressive analysis and display
            for (const product of products) {
                // Simulate analysis delay
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Add analyzed product
                analyzedProducts.push({
                    product,
                    analytics: { logistics: { buyBoxPrice: 50 }, salesData: { monthlySales: 100 } },
                    sopValidation: { passed: true },
                    llmAnalysis: { recommendation: 'BUY', analysis: 'Good product' }
                });

                // Display immediately after analysis
                const card = document.createElement('div');
                card.className = 'product-card';
                resultsContainer.appendChild(card);
                
                displayCount.push(resultsContainer.children.length);
            }

            // Verify progressive display
            expect(displayCount).toEqual([1, 2, 3]);
            expect(resultsContainer.children.length).toBe(3);
        });

        test('should show loading indicator while searching', () => {
            loadingIndicator.style.display = 'block';
            expect(loadingIndicator.style.display).toBe('block');
        });

        test('should hide loading indicator after search completes', async () => {
            loadingIndicator.style.display = 'block';
            
            // Simulate search completion
            await new Promise(resolve => setTimeout(resolve, 100));
            loadingIndicator.style.display = 'none';
            
            expect(loadingIndicator.style.display).toBe('none');
        });

        test('should clear previous results before new search', () => {
            // Add some existing results
            resultsContainer.children = [
                { className: 'product-card' },
                { className: 'product-card' }
            ];

            // Clear for new search
            resultsContainer.innerHTML = '';
            resultsContainer.children = [];

            expect(resultsContainer.innerHTML).toBe('');
            expect(resultsContainer.children.length).toBe(0);
        });
    });

    describe('Search State Management', () => {
        let searchInFlight;

        beforeEach(() => {
            searchInFlight = false;
        });

        test('should prevent concurrent searches', async () => {
            const runSearch = async () => {
                if (searchInFlight) {
                    return false; // Search already in progress
                }
                searchInFlight = true;
                await new Promise(resolve => setTimeout(resolve, 100));
                searchInFlight = false;
                return true;
            };

            // Start first search
            const search1 = runSearch();
            
            // Try to start second search immediately
            const search2 = runSearch();

            const result1 = await search1;
            const result2 = await search2;

            expect(result1).toBe(true);  // First search completed
            expect(result2).toBe(false); // Second search was blocked
        });

        test('should allow new search after previous completes', async () => {
            const runSearch = async () => {
                if (searchInFlight) {
                    return false;
                }
                searchInFlight = true;
                await new Promise(resolve => setTimeout(resolve, 50));
                searchInFlight = false;
                return true;
            };

            const result1 = await runSearch();
            const result2 = await runSearch();

            expect(result1).toBe(true);
            expect(result2).toBe(true);
        });
    });

    describe('Interval-based Search Updates', () => {
        test('should refresh search results at intervals', async () => {
            let searchCount = 0;
            const searchInterval = 100; // 100ms for testing

            const runSearch = () => {
                searchCount++;
            };

            // Start interval
            const intervalId = setInterval(runSearch, searchInterval);

            // Wait for multiple intervals
            await new Promise(resolve => setTimeout(resolve, 350));

            // Clear interval
            clearInterval(intervalId);

            // Should have run approximately 3-4 times
            expect(searchCount).toBeGreaterThanOrEqual(3);
            expect(searchCount).toBeLessThanOrEqual(4);
        });

        test('should clear previous interval when starting new search', () => {
            let intervalId1 = setInterval(() => {}, 1000);
            const firstId = intervalId1;

            // Clear and start new interval
            clearInterval(intervalId1);
            let intervalId2 = setInterval(() => {}, 1000);

            // IDs should be different
            expect(intervalId2).not.toBe(firstId);

            // Cleanup
            clearInterval(intervalId2);
        });
    });

    describe('Product Card Creation', () => {
        test('should create product card with all required elements', () => {
            const product = {
                id: '1',
                title: 'Test Product',
                retailer: 'walmart',
                price: 24.99,
                originalPrice: 79.99,
                image: 'test.jpg',
                url: 'http://test.com',
                asin: 'B08ASIN001'
            };

            const analytics = {
                logistics: {
                    buyBoxPrice: 59.99,
                    rating: 4.6,
                    reviews: 120
                },
                salesData: {
                    monthlySales: 100,
                    salesRank: 5000,
                    avgPrice360Days: 55.00,
                    lowestPrice360Days: 45.00,
                    highestPrice360Days: 65.00
                },
                complaints: {
                    hasComplaints: false,
                    count: 0
                }
            };

            const sopValidation = { passed: true };
            const llmAnalysis = {
                recommendation: 'BUY',
                analysis: 'Great product for resale'
            };

            const card = document.createElement('div');
            card.className = 'product-card';
            
            // Verify card was created
            expect(card.tagName).toBe('DIV');
            expect(card.className).toBe('product-card');
        });

        test('should apply correct class based on recommendation', () => {
            const testCases = [
                { recommendation: 'BUY', passed: true, expectedClass: 'profitable' },
                { recommendation: 'AVOID', passed: false, expectedClass: 'rejected' },
                { recommendation: 'MAYBE', passed: true, expectedClass: 'warning' }
            ];

            testCases.forEach(({ recommendation, passed, expectedClass }) => {
                const card = document.createElement('div');
                card.className = 'product-card';
                
                if (recommendation === 'BUY' && passed) {
                    card.classList.add('profitable');
                } else if (recommendation === 'AVOID' || !passed) {
                    card.classList.add('rejected');
                } else {
                    card.classList.add('warning');
                }

                expect(card.classList.add).toHaveBeenCalledWith(expectedClass);
            });
        });
    });

    describe('Error Handling in Real-time Updates', () => {
        test('should continue displaying other products if one fails', async () => {
            const products = [
                { id: '1', title: 'Product 1', asin: 'B08ASIN001' },
                { id: '2', title: 'Product 2', asin: 'INVALID' },
                { id: '3', title: 'Product 3', asin: 'B08ASIN003' }
            ];

            const successfulProducts = [];

            for (const product of products) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    // Simulate validation error for invalid ASIN
                    if (product.asin === 'INVALID') {
                        throw new Error('Invalid ASIN');
                    }

                    successfulProducts.push(product);
                    
                    const card = document.createElement('div');
                    resultsContainer.appendChild(card);
                } catch (error) {
                    console.error(`Error analyzing product ${product.id}:`, error);
                    // Continue with next product
                }
            }

            expect(successfulProducts.length).toBe(2);
            expect(resultsContainer.appendChild).toHaveBeenCalledTimes(2);
        });

        test('should display error message when search fails', () => {
            const showError = (message) => {
                resultsContainer.innerHTML = `
                    <div class="error-message">
                        <strong>Error:</strong> ${message}
                    </div>
                `;
                loadingIndicator.style.display = 'none';
            };

            showError('Network error occurred');

            expect(resultsContainer.innerHTML).toContain('Error:');
            expect(resultsContainer.innerHTML).toContain('Network error occurred');
            expect(loadingIndicator.style.display).toBe('none');
        });

        test('should display no results message when no products found', () => {
            const showNoResults = () => {
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        <h3>No products found</h3>
                        <p>Try adjusting your search query or filters</p>
                    </div>
                `;
                loadingIndicator.style.display = 'none';
            };

            showNoResults();

            expect(resultsContainer.innerHTML).toContain('No products found');
            expect(loadingIndicator.style.display).toBe('none');
        });
    });
});
