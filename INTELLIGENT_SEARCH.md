# Intelligent Search (Lightweight)

## Overview

The app now uses a lightweight, free ranking step to sort results by relevance. It does **not** require any paid APIs or local LLMs.

## How It Works

1. Scrape products from the selected retailer.
2. If no results, scrape all retailers.
3. Rank products by token overlap with the query (server-side).
4. Return the ranked list to the UI.

## Endpoint

`POST /api/intelligent-search`

Request:
```json
{
  "products": [...],
  "query": "electronics"
}
```

Response:
```json
{
  "products": [...]  // Sorted by relevance
}
```

## Notes

- This ranking is intentionally simple and fast.
- It can be upgraded later (e.g., fuzzy matching or embeddings) without changing the UI contract.
