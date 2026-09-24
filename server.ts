import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable CORS for all origins (allows frontend to call from any port if running separately)
app.use(cors({
  exposedHeaders: ['X-Cache', 'X-Response-Time-Ms']
}));
app.use(express.json());

// -------------------------------------------------------------
// 1. DATASET: 24 Modern Technology items with metadata
// -------------------------------------------------------------
interface TechItem {
  name: string;
  category: string;
  description: string;
}

const TECHNOLOGIES: TechItem[] = [
  { name: 'React', category: 'Frontend Library', description: 'A declarative, component-based library for building user interfaces.' },
  { name: 'React Native', category: 'Mobile Framework', description: 'Build native iOS and Android apps using React and JavaScript.' },
  { name: 'React Router', category: 'Routing', description: 'Standard routing solution for client-side navigation in React.' },
  { name: 'React Query', category: 'State Management', description: 'Asynchronous server-state management, caching, and data synchronization.' },
  { name: 'Node.js', category: 'Runtime', description: 'JavaScript runtime built on Chrome\'s V8 engine for building server applications.' },
  { name: 'Express.js', category: 'Backend Framework', description: 'Fast, unopinionated, minimalist web framework for Node.js.' },
  { name: 'MongoDB', category: 'Database', description: 'Document-oriented NoSQL database storing JSON-like documents.' },
  { name: 'JavaScript', category: 'Language', description: 'The dynamic scripting language powering the modern web and Node.js.' },
  { name: 'TypeScript', category: 'Language', description: 'Typed superset of JavaScript that compiles to plain JavaScript.' },
  { name: 'Next.js', category: 'Full-Stack Framework', description: 'The React framework for the web with SSR, SSG, and server actions.' },
  { name: 'Vite', category: 'Build Tool', description: 'Next-generation frontend tooling offering fast HMR and instant startup.' },
  { name: 'Tailwind CSS', category: 'Styling', description: 'Utility-first CSS framework for rapid modern UI development.' },
  { name: 'HTML', category: 'Markup', description: 'HyperText Markup Language, the standard markup language for documents on the web.' },
  { name: 'CSS', category: 'Styling', description: 'Cascading Style Sheets for describing presentation of HTML documents.' },
  { name: 'Git', category: 'Version Control', description: 'Distributed version control system for tracking source code changes.' },
  { name: 'GitHub', category: 'DevOps & Git', description: 'Cloud-based hosting service for Git repositories and collaboration.' },
  { name: 'Python', category: 'Language', description: 'High-level programming language known for readability, AI, and web development.' },
  { name: 'Django', category: 'Backend Framework', description: 'High-level Python web framework encouraging rapid development and clean design.' },
  { name: 'Angular', category: 'Frontend Framework', description: 'TypeScript-based framework for scalable enterprise web applications.' },
  { name: 'Vue.js', category: 'Frontend Framework', description: 'Progressive framework for building user interfaces and single-page applications.' },
  { name: 'GraphQL', category: 'API Query Language', description: 'Query language for APIs and runtime for fulfilling queries with data.' },
  { name: 'Docker', category: 'Containerization', description: 'Platform for developing, shipping, and running applications inside containers.' },
  { name: 'Redis', category: 'In-Memory Store', description: 'In-memory data structure store used as a database, cache, and message broker.' },
  { name: 'PostgreSQL', category: 'Database', description: 'Powerful, open-source object-relational database system.' }
];

// -------------------------------------------------------------
// 2. SERVER CACHE: In-Memory Map with TTL (Time To Live)
// -------------------------------------------------------------
interface CacheEntry {
  data: string[];
  items: TechItem[];
  timestamp: number;
}

// In-memory JavaScript Map for caching search results
const searchCache = new Map<string, CacheEntry>();

// Cache TTL (Time to Live) in milliseconds - 60 seconds
const CACHE_TTL_MS = 60 * 1000;

// Helper to check and retrieve valid unexpired cache entry
function getValidCache(key: string): CacheEntry | null {
  const entry = searchCache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    // Expired TTL - evict
    searchCache.delete(key);
    return null;
  }
  return entry;
}

// -------------------------------------------------------------
// 3. SEARCH HANDLER: GET /search and GET /api/search
// -------------------------------------------------------------
const handleSearch = async (req: Request, res: Response) => {
  const startTime = Date.now();
  const rawQuery = (req.query.q as string) || '';
  const query = rawQuery.trim().toLowerCase();

  // If query is blank, return empty results immediately
  if (!query) {
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Response-Time-Ms', String(Date.now() - startTime));
    res.json({
      query: '',
      results: [],
      items: [],
      cache: 'MISS',
      durationMs: Date.now() - startTime,
      totalAvailable: TECHNOLOGIES.length
    });
    return;
  }

  // 1. Check in-memory cache
  const cached = getValidCache(query);
  if (cached) {
    const elapsed = Date.now() - startTime;
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('X-Response-Time-Ms', String(elapsed));
    res.json({
      query,
      results: cached.data,
      items: cached.items,
      cache: 'HIT',
      durationMs: elapsed,
      cachedAt: new Date(cached.timestamp).toISOString(),
      expiresInSeconds: Math.round((CACHE_TTL_MS - (Date.now() - cached.timestamp)) / 1000)
    });
    return;
  }

  // 2. Cache MISS: Simulate intentional latency of ~800ms
  // Allows testing custom delay if passed in query param ?delay=...
  const delayMs = req.query.delay ? Math.max(0, parseInt(req.query.delay as string, 10)) : 800;

  // Listen to client disconnect / abort to optimize server resources
  let isAborted = false;
  req.on('close', () => {
    isAborted = true;
  });

  await new Promise((resolve) => setTimeout(resolve, delayMs));

  // If client disconnected while waiting, don't crash
  if (isAborted && res.writableEnded) {
    return;
  }

  // 3. Search dataset (case-insensitive substring match)
  const matchedTech = TECHNOLOGIES.filter((item) =>
    item.name.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query)
  );

  const matchedNames = matchedTech.map((item) => item.name);

  // 4. Store in cache
  searchCache.set(query, {
    data: matchedNames,
    items: matchedTech,
    timestamp: Date.now()
  });

  const elapsed = Date.now() - startTime;
  res.setHeader('X-Cache', 'MISS');
  res.setHeader('X-Response-Time-Ms', String(elapsed));

  res.json({
    query,
    results: matchedNames,
    items: matchedTech,
    cache: 'MISS',
    durationMs: elapsed,
    expiresInSeconds: Math.round(CACHE_TTL_MS / 1000)
  });
};

// Mount both /search and /api/search
app.get('/search', handleSearch);
app.get('/api/search', handleSearch);

// Cache inspection & clear endpoints for demo
app.get('/api/cache-info', (_req: Request, res: Response) => {
  const now = Date.now();
  const entries = Array.from(searchCache.entries()).map(([key, value]) => ({
    query: key,
    resultCount: value.data.length,
    results: value.data,
    ageSeconds: Math.round((now - value.timestamp) / 1000),
    ttlRemainingSeconds: Math.max(0, Math.round((CACHE_TTL_MS - (now - value.timestamp)) / 1000))
  }));

  res.json({
    size: searchCache.size,
    ttlConfigMs: CACHE_TTL_MS,
    entries
  });
});

app.post('/api/cache-clear', (_req: Request, res: Response) => {
  const previousSize = searchCache.size;
  searchCache.clear();
  res.json({
    message: 'Cache successfully cleared',
    clearedEntries: previousSize
  });
});

// -------------------------------------------------------------
// 4. VITE DEV MIDDLEWARE OR STATIC SERVING
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
