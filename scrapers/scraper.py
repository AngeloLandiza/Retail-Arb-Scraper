#!/usr/bin/env python3
"""
Retail scraper using requests and BeautifulSoup
Scrapes Walmart, Target, Walgreens, and Amazon for product data
"""

import requests
import json
import time
import sqlite3
from datetime import datetime
from typing import List, Dict
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

class RetailScraper:
    """Main scraper class for multiple retailers"""
    
    def __init__(self, db_path: str = 'products.db'):
        self.db_path = db_path
        self.session = self._get_session()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        self._init_db()
    
    def _get_session(self) -> requests.Session:
        """Create session with retry strategy"""
        session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        return session
    
    def _init_db(self):
        """Initialize SQLite database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Products table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asin TEXT UNIQUE,
                title TEXT NOT NULL,
                retailer TEXT NOT NULL,
                price REAL,
                original_price REAL,
                url TEXT,
                image_url TEXT,
                stock_status TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Amazon prices table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS amazon_prices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asin TEXT UNIQUE,
                price REAL,
                sellers INTEGER,
                fba_sellers INTEGER,
                buy_box_price REAL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Search history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT,
                retailer TEXT,
                results_count INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def scrape_walmart(self, query: str) -> List[Dict]:
        """Scrape Walmart search results"""
        products = []
        try:
            # Using Walmart search API
            url = f"https://www.walmart.com/search?q={query}"
            
            response = self.session.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find product tiles (Walmart structure varies, using generic selectors)
            product_tiles = soup.find_all('div', {'data-item-id': True})[:10]
            
            for tile in product_tiles:
                try:
                    title = tile.find('span', {'class': 'lh-copy'})
                    price = tile.find('div', {'class': 'lh-copy'})
                    link = tile.find('a', {'class': 'absolute'})
                    
                    if title and price:
                        product = {
                            'title': title.get_text(strip=True),
                            'retailer': 'walmart',
                            'price': float(price.get_text(strip=True).replace('$', '').split()[0]) if price else 0,
                            'original_price': float(price.get_text(strip=True).replace('$', '').split()[0]) if price else 0,
                            'url': f"https://www.walmart.com{link['href']}" if link else '',
                            'image_url': '',
                            'asin': f"WALMART_{hash(title.get_text(strip=True))}"
                        }
                        products.append(product)
                except:
                    continue
        
        except requests.RequestException as e:
            print(f"Error scraping Walmart: {e}")
        
        time.sleep(2)  # Rate limiting
        return products
    
    def scrape_target(self, query: str) -> List[Dict]:
        """Scrape Target search results"""
        products = []
        try:
            url = f"https://www.target.com/s?searchTerm={query}"
            
            response = self.session.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Target uses different structure
            product_cards = soup.find_all('div', {'data-test': 'ProductCard'})[:10]
            
            for card in product_cards:
                try:
                    title_elem = card.find('a', {'class': 'Link'})
                    price_elem = card.find('span', {'class': 'h-text-bold'})
                    
                    if title_elem and price_elem:
                        product = {
                            'title': title_elem.get_text(strip=True),
                            'retailer': 'target',
                            'price': float(price_elem.get_text(strip=True).replace('$', '').split()[0]) if price_elem else 0,
                            'original_price': float(price_elem.get_text(strip=True).replace('$', '').split()[0]) if price_elem else 0,
                            'url': f"https://www.target.com{title_elem['href']}" if title_elem else '',
                            'image_url': '',
                            'asin': f"TARGET_{hash(title_elem.get_text(strip=True))}"
                        }
                        products.append(product)
                except:
                    continue
        
        except requests.RequestException as e:
            print(f"Error scraping Target: {e}")
        
        time.sleep(2)  # Rate limiting
        return products
    
    def scrape_walgreens(self, query: str) -> List[Dict]:
        """Scrape Walgreens search results"""
        products = []
        try:
            url = f"https://www.walgreens.com/search/results?q={query}"
            
            response = self.session.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Walgreens product structure
            product_items = soup.find_all('div', {'class': 'css-product-card'})[:10]
            
            for item in product_items:
                try:
                    title = item.find('h2')
                    price = item.find('div', {'class': 'css-product-price'})
                    link = item.find('a')
                    
                    if title and price:
                        product = {
                            'title': title.get_text(strip=True),
                            'retailer': 'walgreens',
                            'price': float(price.get_text(strip=True).replace('$', '').split()[0]) if price else 0,
                            'original_price': float(price.get_text(strip=True).replace('$', '').split()[0]) if price else 0,
                            'url': f"https://www.walgreens.com{link['href']}" if link else '',
                            'image_url': '',
                            'asin': f"WALGREENS_{hash(title.get_text(strip=True))}"
                        }
                        products.append(product)
                except:
                    continue
        
        except requests.RequestException as e:
            print(f"Error scraping Walgreens: {e}")
        
        time.sleep(2)  # Rate limiting
        return products
    
    def scrape_amazon(self, query: str) -> List[Dict]:
        """Scrape Amazon search results"""
        products = []
        try:
            url = f"https://www.amazon.com/s?k={query}"
            
            response = self.session.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Amazon product structure
            product_divs = soup.find_all('div', {'data-component-type': 's-search-result'})[:10]
            
            for div in product_divs:
                try:
                    title = div.find('h2')
                    price = div.find('span', {'class': 'a-price-whole'})
                    asin = div.get('data-asin')
                    link = div.find('a', {'class': 's-link'})
                    
                    if title and asin:
                        product = {
                            'title': title.get_text(strip=True),
                            'retailer': 'amazon',
                            'price': float(price.get_text(strip=True).replace('$', '').replace(',', '')) if price else 0,
                            'original_price': 0,
                            'url': f"https://www.amazon.com/dp/{asin}" if asin else '',
                            'image_url': '',
                            'asin': asin
                        }
                        products.append(product)
                except:
                    continue
        
        except requests.RequestException as e:
            print(f"Error scraping Amazon: {e}")
        
        time.sleep(2)  # Rate limiting
    
    def scrape(self, query: str, retailer: str = None) -> List[Dict]:
        """Scrape products from specified retailer"""
        products = []
        
        if retailer == 'walmart':
            products = self.scrape_walmart(query)
        elif retailer == 'target':
            products = self.scrape_target(query)
        elif retailer == 'walgreens':
            products = self.scrape_walgreens(query)
        elif retailer == 'amazon':
            products = self.scrape_amazon(query)
        
        # Save to database
        self._save_products(products)
        
        # Log search
        self._log_search(query, retailer, len(products))
        
        
        return products
    
    def _save_products(self, products: List[Dict]):
        """Save products to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for product in products:
                cursor.execute('''
                    INSERT OR REPLACE INTO products 
                    (asin, title, retailer, price, original_price, url, image_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    product.get('asin'),
                    product.get('title'),
                    product.get('retailer'),
                    product.get('price'),
                    product.get('original_price'),
                    product.get('url'),
                    product.get('image_url')
                ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error saving products: {e}")
    
    def _log_search(self, query: str, retailer: str, results_count: int):
        """Log search to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO search_history (query, retailer, results_count)
                VALUES (?, ?, ?)
            ''', (query, retailer, results_count))
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error logging search: {e}")


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 2:
        retailer = sys.argv[1]
        query = sys.argv[2]
        
        scraper = RetailScraper()
        products = scraper.scrape(query, retailer)
        
        # Output as JSON for Node.js to parse
        print(json.dumps(products))
    else:
        # Test mode
        scraper = RetailScraper()
        print("Testing scraper...")
        products = scraper.scrape('yoga mat', 'walmart')
        print(f"Found {len(products)} products on Walmart")
        print(json.dumps(products[:2], indent=2))
