/**
 * ============================================================================
 * BACKEND SERVER: Smart Search API
 * ============================================================================
 * Features:
 * - Express.js web server with CORS support
 * - Deliberate ~800ms artificial latency to demonstrate async race conditions
 * - In-memory JavaScript Map cache with TTL (Time-To-Live)
 * - Headers and JSON response reporting HIT or MISS
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS so the React frontend (running on port 5173 or 3000) can make requests
app.use(cors({
  exposedHeaders: ['X-Cache']
}));
app.use(express.json());

// ----------------------------------------------------------------------------
// 1. DATASET: 24 Popular Technologies
// ----------------------------------------------------------------------------
const technologies = [
  'React',
  'React Native',
  'React Router',
  'React Query',
  'Node.js',
  'Express.js',
  'MongoDB',
  'JavaScript',
  'TypeScript',
  'Next.js',
  'Vite',
  'Tailwind CSS',
  'HTML',
  'CSS',
  'Git',
  'GitHub',
  'Python',
  'Django',
  'Angular',
  'Vue.js',
  'GraphQL',
  'Docker',
  'Redis',
  'PostgreSQL'
];

// ----------------------------------------------------------------------------
// 2. SERVER CACHE: In-Memory Map with TTL
// ----------------------------------------------------------------------------
// JavaScript Map stores key-value pairs where:
// key: lowercase query string (e.g. "react")
// value: { results: [...], timestamp: Date.now() }
const cache = new Map();

// Time-to-live for cache entries: 60,000 milliseconds (60 seconds)
const CACHE_TTL = 60 * 1000;

/**
 * Helper to retrieve an entry from the cache.
 * If the entry exists and has not expired, returns it.
 * If the entry has expired, it deletes it from the Map and returns null.
 */
function getCachedEntry(key) {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  const now = Date.now();
  const isExpired = now - entry.timestamp > CACHE_TTL;

  if (isExpired) {
    console.log(`[CACHE EVICT] Key "${key}" expired after ${CACHE_TTL / 1000}s`);
    cache.delete(key);
    return null;
  }

  return entry;
}

// ----------------------------------------------------------------------------
// 3. API ROUTE: GET /search?q=query
// ----------------------------------------------------------------------------
app.get('/search', async (req, res) => {
  // 1. Read query parameter
  const rawQuery = req.query.q || '';
  // 2. Convert to lowercase and trim spaces
  const query = rawQuery.trim().toLowerCase();

  console.log(`\n[INCOMING REQUEST] Query: "${rawQuery}" (Normalized: "${query}")`);

  // If the search query is empty, return an empty array immediately
  if (!query) {
    res.set('X-Cache', 'MISS');
    return res.json({
      results: [],
      cache: 'MISS'
    });
  }

  // 3. Check the in-memory cache
  const cachedEntry = getCachedEntry(query);

  // 4. If found in cache -> Cache HIT:
  if (cachedEntry) {
    console.log(`⚡ [CACHE HIT] Returning cached results immediately for "${query}"`);
    res.set('X-Cache', 'HIT');
    return res.json({
      results: cachedEntry.results,
      cache: 'HIT'
    });
  }

  // 5. If not found in cache -> Cache MISS:
  console.log(`⏳ [CACHE MISS] Waiting ~800ms intentional delay for "${query}"...`);

  // Intentionally wait approximately 800 ms to simulate network/database latency
  // This latency exposes the asynchronous race condition when typing quickly!
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Search the dataset (case-insensitive substring match)
  const results = technologies.filter((item) =>
    item.toLowerCase().includes(query)
  );

  // Store the calculated result in the cache with the current timestamp
  cache.set(query, {
    results: results,
    timestamp: Date.now()
  });

  console.log(`✅ [CACHE STORED] Saved "${query}" to cache (${results.length} results)`);

  res.set('X-Cache', 'MISS');
  return res.json({
    results: results,
    cache: 'MISS'
  });
});

// Diagnostic route to view currently cached keys in your browser or terminal
app.get('/cache', (req, res) => {
  const currentEntries = [];
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    currentEntries.push({
      key: key,
      resultCount: value.results.length,
      ageSeconds: Math.round((now - value.timestamp) / 1000),
      ttlRemainingSeconds: Math.max(0, Math.round((CACHE_TTL - (now - value.timestamp)) / 1000))
    });
  }
  res.json({
    totalKeys: cache.size,
    ttlSeconds: CACHE_TTL / 1000,
    entries: currentEntries
  });
});

// ----------------------------------------------------------------------------
// 4. START SERVER
// ----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 Smart Search Backend is running on:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Endpoint: GET http://localhost:${PORT}/search?q=react`);
  console.log(`   Cache Inspector: GET http://localhost:${PORT}/cache`);
  console.log('====================================================');
});
