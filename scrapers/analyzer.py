#!/usr/bin/env python3
"""
LLM-based product analyzer using Mistral 7B
Provides profit analysis, intelligent search, and query expansion using open-source LLM
"""

import requests
import json
import sqlite3
from datetime import datetime
from typing import Dict, List
from difflib import SequenceMatcher

class Mistral7BAnalyzer:
    """Product analyzer using Mistral 7B via Ollama"""
    
    def __init__(self, ollama_url: str = "http://localhost:11434"):
        self.ollama_url = ollama_url
        self.model = "mistral"  # Ollama will use Mistral 7B if installed
        self.db_path = 'products.db'
    
    def analyze_product(self, product: Dict, amazon_price: float) -> Dict:
        """
        Analyze product profitability using Mistral 7B
        
        Args:
            product: Product data from scraper
            amazon_price: Current Amazon price
        
        Returns:
            Analysis with recommendation
        """
        
        retailer_price = product.get('price', 0)
        profit = amazon_price - retailer_price - 15  # Fees + shipping
        roi = (profit / retailer_price * 100) if retailer_price > 0 else 0
        
        prompt = f"""
Analyze this retail arbitrage opportunity:

Product: {product.get('title', 'Unknown')}
Retailer: {product.get('retailer', 'Unknown').upper()}
Buy Price: ${retailer_price:.2f}
Amazon Price: ${amazon_price:.2f}
Est. Profit: ${profit:.2f}
ROI: {roi:.1f}%

Based on this data, provide a brief analysis (2-3 sentences) and recommend BUY, AVOID, or REVIEW.
Format: "Recommendation: [BUY/AVOID/REVIEW]. Analysis: ..."
"""
        
        try:
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": 0.7
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                analysis_text = result.get('response', 'Unable to analyze')
                
                # Parse recommendation
                recommendation = 'REVIEW'
                if 'BUY' in analysis_text.upper():
                    recommendation = 'BUY'
                elif 'AVOID' in analysis_text.upper():
                    recommendation = 'AVOID'
                
                return {
                    'recommendation': recommendation,
                    'analysis': analysis_text.strip(),
                    'profit': profit,
                    'roi': roi,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return self._fallback_analysis(product, amazon_price, retailer_price)
        
        except requests.ConnectionError:
            print("Ollama not running. Using fallback analysis.")
            return self._fallback_analysis(product, amazon_price, retailer_price)
        except Exception as e:
            print(f"Error analyzing with Mistral: {e}")
            return self._fallback_analysis(product, amazon_price, retailer_price)
    
    def _fallback_analysis(self, product: Dict, amazon_price: float, retailer_price: float) -> Dict:
        """Fallback analysis when Ollama is unavailable"""
        
        profit = amazon_price - retailer_price - 15
        roi = (profit / retailer_price * 100) if retailer_price > 0 else 0
        
        # Simple rule-based fallback
        if roi >= 40:
            recommendation = 'BUY'
            analysis = f"High profit opportunity with {roi:.1f}% ROI. Strong demand expected."
        elif roi >= 25:
            recommendation = 'REVIEW'
            analysis = f"Moderate profit with {roi:.1f}% ROI. Check competition first."
        else:
            recommendation = 'AVOID'
            analysis = f"Low profit margin ({roi:.1f}% ROI). Not recommended."
        
        return {
            'recommendation': recommendation,
            'analysis': analysis,
            'profit': profit,
            'roi': roi,
            'timestamp': datetime.now().isoformat(),
            'using_fallback': True
        }
    
    def batch_analyze(self, products: list, amazon_prices: Dict) -> list:
        """Analyze multiple products"""
        results = []
        
        for product in products:
            asin = product.get('asin', '')
            amazon_price = amazon_prices.get(asin, product.get('price', 0) * 1.5)
            
            analysis = self.analyze_product(product, amazon_price)
            analysis['product'] = product
            results.append(analysis)
        
        return results
    
    def save_analysis(self, product_asin: str, analysis: Dict):
        """Save analysis to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create analysis table if not exists
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS analyses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    asin TEXT,
                    recommendation TEXT,
                    analysis TEXT,
                    profit REAL,
                    roi REAL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            cursor.execute('''
                INSERT INTO analyses (asin, recommendation, analysis, profit, roi)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                product_asin,
                analysis.get('recommendation'),
                analysis.get('analysis'),
                analysis.get('profit'),
                analysis.get('roi')
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error saving analysis: {e}")
    
    def expand_query(self, query: str) -> List[str]:
        """
        Use Mistral 7B to expand user search query
        E.g., "electronics" -> ["televisions", "smart phones", "gaming consoles", "smart watches"]
        
        Args:
            query: User search query
        
        Returns:
            List of expanded search queries
        """
        
        prompt = f"""You are a shopping search expert. The user searched for: "{query}"
        
Generate 4-6 specific product categories or items related to this search term. 
Return ONLY a JSON array of search terms, nothing else.
Example: If user searches "electronics", return ["televisions", "smart phones", "gaming consoles", "smart watches", "laptops"]

Return only the JSON array, no explanations."""
        
        try:
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": 0.7
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                response_text = result.get('response', '[]').strip()
                
                # Try to parse JSON
                try:
                    expanded_queries = json.loads(response_text)
                    if isinstance(expanded_queries, list):
                        return [query] + expanded_queries  # Include original query
                except json.JSONDecodeError:
                    pass
            
            # Fallback: return just the original query
            return [query]
        
        except Exception as e:
            print(f"Error expanding query with LLM: {e}")
            return [query]
    
    def fuzzy_search_products(self, products: List[Dict], query: str, threshold: float = 0.6) -> List[Dict]:
        """
        Fuzzy search products using similarity matching
        Handles typos and partial matches
        
        Args:
            products: List of products to search
            query: Search query (user input)
            threshold: Similarity threshold (0-1, default 0.6)
        
        Returns:
            Sorted list of matching products
        """
        
        query_lower = query.lower()
        matches = []
        
        for product in products:
            title_lower = product.get('title', '').lower()
            retailer_lower = product.get('retailer', '').lower()
            
            # Calculate similarity scores
            title_similarity = SequenceMatcher(None, query_lower, title_lower).ratio()
            retailer_similarity = SequenceMatcher(None, query_lower, retailer_lower).ratio()
            
            # Check for substring matches (higher priority)
            contains_query = query_lower in title_lower
            
            # Highest score wins
            if contains_query:
                similarity = 0.95
            else:
                similarity = max(title_similarity, retailer_similarity)
            
            if similarity >= threshold:
                matches.append({
                    'product': product,
                    'similarity': similarity
                })
        
        # Sort by similarity (descending)
        matches.sort(key=lambda x: x['similarity'], reverse=True)
        
        return [m['product'] for m in matches]
    
    def intelligent_search(self, products: List[Dict], query: str, use_expansion: bool = True) -> List[Dict]:
        """
        Intelligent search combining fuzzy matching and LLM query expansion
        
        Args:
            products: List of products to search
            query: User search query
            use_expansion: Whether to use LLM query expansion
        
        Returns:
            Ranked list of products matching the query
        """
        
        # Step 1: Try fuzzy search on original query
        results = self.fuzzy_search_products(products, query, threshold=0.5)
        
        if len(results) > 0:
            return results
        
        # Step 2: If no results, try LLM-based query expansion
        if use_expansion:
            expanded_queries = self.expand_query(query)
            all_results = []
            
            for expanded_query in expanded_queries:
                expanded_results = self.fuzzy_search_products(products, expanded_query, threshold=0.5)
                all_results.extend(expanded_results)
            
            # Remove duplicates while preserving order
            seen = set()
            unique_results = []
            for product in all_results:
                asin = product.get('asin')
                if asin not in seen:
                    seen.add(asin)
                    unique_results.append(product)
            
            return unique_results
        
        return results


if __name__ == '__main__':
    analyzer = Mistral7BAnalyzer()
    
    test_product = {
        'title': 'Wireless Headphones',
        'retailer': 'walmart',
        'price': 24.99,
        'asin': 'B08ASIN001'
    }
    
    print("Testing Mistral 7B analysis...")
    result = analyzer.analyze_product(test_product, 59.99)
    print(json.dumps(result, indent=2))
