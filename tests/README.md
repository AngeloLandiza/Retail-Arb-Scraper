# Test Suite Documentation

This document describes the test suite for the Retail Arbitrage Scraper application.

## Overview

The test suite is built using **Jest** and **Supertest** to ensure the application works correctly. It includes unit tests for core modules and integration tests for the server API.

## Test Coverage

### Test Suites
- **server.test.js** - API endpoint integration tests
- **amazon-analyzer.test.js** - Amazon analysis module tests
- **llm-analyzer.test.js** - LLM analysis module tests
- **scraper.test.js** - Retail scraper functionality tests
- **search-integration.test.js** - End-to-end search workflow tests
- **realtime-update.test.js** - Real-time product update functionality tests

### Total Tests: 69 passing

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

## Test Details

### Server API Tests (6 tests)
Tests the Express server API endpoints:

#### GET /api/amazon/:asin
- ✅ Returns product data for valid ASIN
- ✅ Returns 400 for invalid ASIN format
- ✅ Rejects ASIN with special characters

#### POST /api/scrape
- ✅ Returns products for valid retailer
- ✅ Returns 400 for invalid retailer
- ✅ Accepts all valid retailers (walmart, walgreens, target)

### Amazon Analyzer Tests (10 tests)
Tests the Amazon analysis functionality:

#### Product Logistics
- ✅ Returns logistics data for known ASIN
- ✅ Returns default data for unknown ASIN

#### Sales Data
- ✅ Returns sales data for known ASIN
- ✅ Returns default data for unknown ASIN

#### IP Complaints
- ✅ Returns no complaints by default

#### Score Calculation
- ✅ Calculates high score for good product with low competition and good sales
- ✅ Reduces score for products with complaints
- ✅ Reduces score for high competition
- ✅ Reduces score for low sales

#### Full Analysis
- ✅ Returns complete analysis for ASIN
- ✅ Calculates score correctly

### LLM Analyzer Tests (12 tests)
Tests the LLM analysis and rule-based recommendation engine:

#### ROI Calculation
- ✅ Calculates positive ROI correctly including shipping
- ✅ Calculates negative ROI for unprofitable products
- ✅ Handles edge case prices

#### Rule-Based Analysis
- ✅ Recommends AVOID for products with IP complaints
- ✅ Recommends BUY for high ROI, low competition products
- ✅ Recommends AVOID for low ROI
- ✅ Recommends REVIEW for moderate metrics
- ✅ Includes recommendation in analysis text
- ✅ Includes timestamp

#### Product Suitability Analysis
- ✅ Uses rule-based analysis when no API key
- ✅ Returns complete analysis object

## Test Framework

### Jest Configuration
```json
{
  "testEnvironment": "node",
  "coveragePathIgnorePatterns": ["/node_modules/"],
  "testMatch": ["**/tests/**/*.test.js"]
}
```

### Dependencies
- **jest** - Testing framework
- **supertest** - HTTP assertions for API testing

## Continuous Integration

These tests can be integrated into CI/CD pipelines to ensure code quality:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test

- name: Generate coverage report
  run: npm run test:coverage
```

## Test Results

All 28 tests are passing ✅

```
Test Suites: 3 passed, 3 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        ~4s
```

## Adding New Tests

To add new tests:

1. Create a new file in the `tests/` directory with the `.test.js` extension
2. Import necessary dependencies (Jest is available globally)
3. Write your test cases using `describe()` and `test()` blocks
4. Run `npm test` to verify

Example:
```javascript
describe('My New Feature', () => {
    test('should do something', () => {
        expect(true).toBe(true);
    });
});
```

## Troubleshooting

### Tests Failing
- Ensure all dependencies are installed: `npm install`
- Check that Node.js version is v18 or higher
- Verify no port conflicts (tests use ephemeral ports)

### Coverage Not Generating
- Ensure Jest is properly installed: `npm install --save-dev jest`
- Check that the `coverage/` directory is in `.gitignore`

## Future Improvements

Potential test enhancements:
- [ ] Add end-to-end tests with Playwright/Puppeteer
- [ ] Add performance benchmarks
- [ ] Add security vulnerability scanning

## New Test Suites

### Scraper Tests (scraper.test.js)
Tests the RetailScraper class functionality:
- ✅ Initializes with correct retailers
- ✅ Returns products for each retailer (walmart, walgreens, target)
- ✅ Filters products by search query
- ✅ Validates product data structure
- ✅ Handles case-insensitive searches
- ✅ Validates ASIN format
- ✅ Ensures clearance products are marked correctly

### Search Integration Tests (search-integration.test.js)
End-to-end tests for the complete search workflow:
- ✅ Scrapes products from all retailers
- ✅ Validates retailer names
- ✅ Fetches Amazon data for products
- ✅ Handles invalid ASINs
- ✅ Completes full search workflow (scrape → analyze)
- ✅ Handles concurrent Amazon requests
- ✅ Validates response times
- ✅ Tests search with no results

### Real-time Update Tests (realtime-update.test.js)
Tests for progressive product display functionality:
- ✅ Displays products progressively (not all at once)
- ✅ Shows/hides loading indicator correctly
- ✅ Clears previous results before new search
- ✅ Prevents concurrent searches
- ✅ Allows new search after previous completes
- ✅ Refreshes search results at intervals
- ✅ Creates product cards with all required elements
- ✅ Applies correct CSS classes based on recommendations
- ✅ Continues displaying products even if one fails
- ✅ Displays error messages appropriately

**Key Fix:** Products now display in real-time as they are analyzed, rather than waiting for all products to complete analysis. This provides better user experience and feedback during the search process.
- [ ] Add integration tests with real API calls (mocked)
- [ ] Increase test coverage for edge cases
