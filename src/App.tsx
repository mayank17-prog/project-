import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Clock,
  Database,
  Terminal,
  Activity,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Copy,
  BookOpen,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface TechItem {
  name: string;
  category: string;
  description: string;
}

interface LogEntry {
  id: number;
  query: string;
  mode: 'Protected' | 'Naive';
  status: 'pending' | 'finished' | 'aborted' | 'error';
  cache?: 'HIT' | 'MISS';
  durationMs?: number;
  timestamp: string;
}

interface CacheItemInfo {
  query: string;
  resultCount: number;
  results: string[];
  ageSeconds: number;
  ttlRemainingSeconds: number;
}

// Reusable debounce hook implementation
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'app' | 'cache' | 'code' | 'guide'>('app');

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [isProtectedMode, setIsProtectedMode] = useState(true);
  const [results, setResults] = useState<string[]>([]);
  const [itemDetails, setItemDetails] = useState<TechItem[]>([]);
  const [cacheStatus, setCacheStatus] = useState<'HIT' | 'MISS' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Network Logs
  const [networkLogs, setNetworkLogs] = useState<LogEntry[]>([]);
  const requestCounter = useRef(0);

  // Server Cache Inspection State
  const [cachedEntries, setCachedEntries] = useState<CacheItemInfo[]>([]);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);

  // Active code snippet viewer
  const [selectedFile, setSelectedFile] = useState<'backend' | 'debounce' | 'app' | 'readme'>('backend');
  const [copied, setCopied] = useState(false);

  // Debounced term for Protected Mode (400ms delay)
  const debouncedTerm = useDebounce(searchTerm, isProtectedMode ? 400 : 0);
  const effectiveQuery = isProtectedMode ? debouncedTerm : searchTerm;

  // Fetch cache inspector details
  const fetchCacheInfo = async () => {
    setIsRefreshingCache(true);
    try {
      const res = await fetch('/api/cache-info');
      if (res.ok) {
        const data = await res.json();
        setCachedEntries(data.entries || []);
      }
    } catch {
      // Ignored in preview
    } finally {
      setIsRefreshingCache(false);
    }
  };

  // Clear server cache
  const handleClearCache = async () => {
    try {
      await fetch('/api/cache-clear', { method: 'POST' });
      fetchCacheInfo();
      setCacheStatus(null);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchCacheInfo();
  }, [cacheStatus]);

  // Main Search Effect with AbortController
  useEffect(() => {
    const trimmed = effectiveQuery.trim();

    if (!trimmed) {
      setResults([]);
      setItemDetails([]);
      setCacheStatus(null);
      setIsLoading(false);
      setResponseTime(null);
      setError(null);
      return;
    }

    const currentReqId = ++requestCounter.current;
    const startTime = performance.now();

    // AbortController setup
    const controller = new AbortController();
    const signal = isProtectedMode ? controller.signal : undefined;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    const logEntry: LogEntry = {
      id: currentReqId,
      query: trimmed,
      mode: isProtectedMode ? 'Protected' : 'Naive',
      status: 'pending',
      timestamp: new Date().toLocaleTimeString()
    };

    setNetworkLogs((prev) => [logEntry, ...prev.slice(0, 14)]);

    fetch(`/search?q=${encodeURIComponent(trimmed)}`, { signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const elapsed = Math.round(performance.now() - startTime);

        setResults(data.results || []);
        setItemDetails(data.items || []);
        setCacheStatus(data.cache || 'MISS');
        setResponseTime(elapsed);
        setIsLoading(false);

        setNetworkLogs((prev) =>
          prev.map((item) =>
            item.id === currentReqId
              ? {
                  ...item,
                  status: 'finished',
                  cache: data.cache,
                  durationMs: elapsed
                }
              : item
          )
        );
        fetchCacheInfo();
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') {
          setNetworkLogs((prev) =>
            prev.map((item) =>
              item.id === currentReqId
                ? { ...item, status: 'aborted' }
                : item
            )
          );
          return;
        }

        setError(err.message || 'Failed to search');
        setIsLoading(false);
        setNetworkLogs((prev) =>
          prev.map((item) =>
            item.id === currentReqId ? { ...item, status: 'error' } : item
          )
        );
      });

    // Cleanup function: aborts when query changes or mode switches
    return () => {
      if (isProtectedMode) {
        controller.abort();
      }
    };
  }, [effectiveQuery, isProtectedMode]);

  // Simulate out-of-order race condition for demonstration
  const simulateRaceCondition = () => {
    setIsProtectedMode(false);
    setSearchTerm('');
    setNetworkLogs([]);

    // Step 1: User types "rea" (slow request: 1200ms)
    setTimeout(() => {
      setSearchTerm('rea');
      const req1Id = ++requestCounter.current;
      setNetworkLogs((prev) => [
        {
          id: req1Id,
          query: 'rea',
          mode: 'Naive',
          status: 'pending',
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ]);

      // Step 2: 150ms later, user types "react" (fast request: 250ms)
      setTimeout(() => {
        setSearchTerm('react');
        const req2Id = ++requestCounter.current;
        setNetworkLogs((prev) => [
          {
            id: req2Id,
            query: 'react',
            mode: 'Naive',
            status: 'pending',
            timestamp: new Date().toLocaleTimeString()
          },
          ...prev
        ]);

        // Request 2 finishes FIRST (at 400ms total)
        setTimeout(() => {
          setResults(['React', 'React Native', 'React Router', 'React Query']);
          setCacheStatus('MISS');
          setResponseTime(250);
          setNetworkLogs((prev) =>
            prev.map((l) =>
              l.id === req2Id
                ? { ...l, status: 'finished', cache: 'MISS', durationMs: 250 }
                : l
            )
          );

          // Request 1 arrives LATER (at 850ms total) and OVERWRITES the correct "react" results!
          setTimeout(() => {
            setResults([
              'React',
              'React Native',
              'React Router',
              'React Query'
              // Out of order: older request overwrites with stale data!
            ]);
            setCacheStatus('MISS');
            setResponseTime(1200);
            setNetworkLogs((prev) =>
              prev.map((l) =>
                l.id === req1Id
                  ? { ...l, status: 'finished', cache: 'MISS', durationMs: 1200 }
                  : l
              )
            );
          }, 450);
        }, 250);
      }, 150);
    }, 50);
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={index}
          className="bg-yellow-200 text-slate-900 font-semibold px-0.5 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const quickSamples = ['react', 'node', 'type', 'git', 'sql', 'python', 'mongo'];

  // Code snippets for viewer
  const fileContents = {
    backend: `// backend/server.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ exposedHeaders: ['X-Cache'] }));
app.use(express.json());

const technologies = [
  'React', 'React Native', 'React Router', 'React Query',
  'Node.js', 'Express.js', 'MongoDB', 'JavaScript',
  'TypeScript', 'Next.js', 'Vite', 'Tailwind CSS',
  'HTML', 'CSS', 'Git', 'GitHub', 'Python', 'Django',
  'Angular', 'Vue.js', 'GraphQL', 'Docker', 'Redis', 'PostgreSQL'
];

// In-Memory Map Cache with 60-second TTL
const cache = new Map();
const CACHE_TTL = 60 * 1000;

function getCachedEntry(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry;
}

app.get('/search', async (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();

  if (!query) {
    res.set('X-Cache', 'MISS');
    return res.json({ results: [], cache: 'MISS' });
  }

  // Check Cache
  const cached = getCachedEntry(query);
  if (cached) {
    res.set('X-Cache', 'HIT');
    return res.json({ results: cached.results, cache: 'HIT' });
  }

  // Artificial ~800ms delay to expose race conditions
  await new Promise(resolve => setTimeout(resolve, 800));

  const results = technologies.filter(item =>
    item.toLowerCase().includes(query)
  );

  cache.set(query, { results, timestamp: Date.now() });

  res.set('X-Cache', 'MISS');
  res.json({ results, cache: 'MISS' });
});

app.listen(PORT, () => {
  console.log(\`Backend running at http://localhost:\${PORT}\`);
});`,
    debounce: `// frontend/src/hooks/useDebounce.js
import { useState, useEffect } from 'react';

/**
 * useDebounce Hook
 * Delays updating the debounced value until 'delay' ms have elapsed
 * without any new keystrokes.
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Schedule timer
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // CLEANUP: Resets the countdown if user types again before delay finishes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}`,
    app: `// frontend/src/App.jsx (Core AbortController Effect)
useEffect(() => {
  if (!debouncedQuery.trim()) {
    setResults([]);
    return;
  }

  // 1. Create AbortController instance
  const controller = new AbortController();
  setIsLoading(true);

  // 2. Pass signal into fetch
  fetch(\`http://localhost:5000/search?q=\${encodeURIComponent(debouncedQuery)}\`, {
    signal: controller.signal
  })
    .then(res => res.json())
    .then(data => {
      setResults(data.results);
      setCacheStatus(data.cache);
      setIsLoading(false);
    })
    .catch(err => {
      // 3. Gracefully handle AbortError without treating it as a user error
      if (err.name === 'AbortError') {
        console.log('Request successfully cancelled via AbortController');
        return;
      }
      setError(err.message);
      setIsLoading(false);
    });

  // 4. CLEANUP FUNCTION: Aborts previous in-flight request when query changes!
  return () => {
    controller.abort();
  };
}, [debouncedQuery]);`,
    readme: `# Quick Start in VS Code:
1. Terminal 1 (Backend):
   cd backend
   npm install
   node server.js
   -> http://localhost:5000

2. Terminal 2 (Frontend):
   cd frontend
   npm install
   npm run dev
   -> http://localhost:5173`
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* NAVIGATION BAR */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">Smart Search</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Full-Stack Lab
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Debounce · AbortController · In-Memory Map Server Cache
              </p>
            </div>
          </div>

          {/* Navigation Pills */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('app')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'app'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Search Lab</span>
            </button>

            <button
              onClick={() => setActiveTab('cache')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'cache'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Server Cache ({cachedEntries.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'code'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Project Files</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'guide'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>College Guide</span>
            </button>
          </nav>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* TAB 1: SEARCH LAB APPLICATION */}
        {activeTab === 'app' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* LEFT / MAIN COLUMN (7 cols) */}
            <div className="lg:col-span-7 space-y-6">

              {/* MODE CONTROL BANNER */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl transition ${
                        isProtectedMode
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isProtectedMode ? (
                        <ShieldCheck className="w-6 h-6" />
                      ) : (
                        <AlertTriangle className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900">
                          {isProtectedMode
                            ? 'Protected Mode (Fixed)'
                            : 'Naive Mode (Race Condition Demo)'}
                        </h2>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isProtectedMode
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isProtectedMode ? 'Protected' : 'Vulnerable'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isProtectedMode
                          ? '400ms Debounce + AbortController cancel previous pending requests.'
                          : 'Sends fetch on every keystroke without aborting. Out-of-order responses can overwrite results!'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsProtectedMode(!isProtectedMode)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                        isProtectedMode
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent shadow'
                      }`}
                    >
                      {isProtectedMode ? 'Switch to Naive' : 'Switch to Protected'}
                    </button>
                  </div>
                </div>

                {!isProtectedMode && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Want to see the race condition happen automatically?
                    </span>
                    <button
                      onClick={simulateRaceCondition}
                      className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition"
                    >
                      Trigger "rea" vs "react" Race
                    </button>
                  </div>
                )}
              </div>

              {/* SEARCH INPUT CARD */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="space-y-3">
                  <div className="relative flex items-center">
                    <Search className="w-5 h-5 absolute left-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search 24 technologies (e.g. react, node, python)..."
                      className="w-full pl-12 pr-24 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-base text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-inner"
                    />
                    <div className="absolute right-3 flex items-center gap-1.5">
                      {isLoading && (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-1" />
                      )}
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                          title="Clear search"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sample Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-medium">Quick test:</span>
                    {quickSamples.map((pill) => (
                      <button
                        key={pill}
                        onClick={() => setSearchTerm(pill)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono transition"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* STATUS BAR: Cache status, response latency, active query */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    {cacheStatus ? (
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                          cacheStatus === 'HIT'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            cacheStatus === 'HIT'
                              ? 'bg-emerald-500 animate-ping'
                              : 'bg-amber-500'
                          }`}
                        />
                        <span>Cache: {cacheStatus}</span>
                        <span className="text-[11px] font-normal text-slate-500">
                          {cacheStatus === 'HIT'
                            ? '(Instant ~2ms from RAM)'
                            : '(800ms artificial delay)'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Type a keyword to query server
                      </span>
                    )}
                  </div>

                  {responseTime !== null && (
                    <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{responseTime}ms</span>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                    <p className="font-semibold">Error:</p>
                    <p>{error}</p>
                  </div>
                )}

                {/* RESULTS SECTION */}
                <div>
                  {!searchTerm && !hasSearched ? (
                    <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <Terminal className="w-8 h-8 text-blue-500 mx-auto mb-2 opacity-80" />
                      <h4 className="text-sm font-semibold text-slate-800">
                        Smart Search Ready
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Try typing <code className="text-blue-600 font-bold">react</code> slowly
                        or quickly. Watch how debounce holds requests until typing pauses!
                      </p>
                    </div>
                  ) : isLoading && results.length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Querying server with intentional ~800ms latency...</span>
                      </div>
                    </div>
                  ) : hasSearched && results.length === 0 && !isLoading ? (
                    <div className="text-center py-10 px-4 border border-slate-200 rounded-xl bg-white">
                      <p className="text-sm font-semibold text-slate-700">
                        No matches found for "{searchTerm}"
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Try searching for React, Node, Python, Git, or SQL.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                        <span className="font-bold text-slate-800">
                          {results.length} {results.length === 1 ? 'Match' : 'Matches'}
                        </span>
                        <span>
                          Current query: <code className="font-mono text-blue-600 font-semibold">"{searchTerm}"</code>
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                        {itemDetails.length > 0
                          ? itemDetails.map((item, idx) => (
                              <div
                                key={idx}
                                className="p-3.5 hover:bg-slate-50/80 transition flex items-start justify-between gap-3"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900 text-sm">
                                      {highlightMatch(item.name, searchTerm)}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                      {item.category}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 leading-relaxed">
                                    {item.description}
                                  </p>
                                </div>
                                <Sparkles className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                              </div>
                            ))
                          : results.map((name, idx) => (
                              <div
                                key={idx}
                                className="px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                              >
                                <span className="text-sm font-medium text-slate-900">
                                  {highlightMatch(name, searchTerm)}
                                </span>
                                <span className="text-xs text-slate-400">Technology</span>
                              </div>
                            ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* RIGHT COLUMN: LIVE CONCURRENCY & NETWORK INSPECTOR (5 cols) */}
            <div className="lg:col-span-5 space-y-6">

              {/* DevTools Visualizer Panel */}
              <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-white tracking-wide uppercase">
                      Network Tab Inspector
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Chrome DevTools Simulation
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Shows outgoing HTTP requests in real-time. Notice how in{' '}
                    <span className="text-emerald-400 font-semibold">Protected Mode</span>{' '}
                    unneeded requests are immediately marked as{' '}
                    <span className="text-rose-400 font-semibold font-mono">Cancelled (Aborted)</span>.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="pb-2">#</th>
                          <th className="pb-2">Query</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {networkLogs.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-500">
                              No requests sent yet. Type in search bar to watch!
                            </td>
                          </tr>
                        ) : (
                          networkLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-800/40">
                              <td className="py-2 text-slate-500">#{log.id}</td>
                              <td className="py-2 font-bold text-slate-200">"{log.query}"</td>
                              <td className="py-2">
                                {log.status === 'pending' ? (
                                  <span className="text-amber-400 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Waiting...</span>
                                  </span>
                                ) : log.status === 'aborted' ? (
                                  <span className="text-rose-400 font-semibold">
                                    🛑 (canceled)
                                  </span>
                                ) : log.status === 'finished' ? (
                                  <span
                                    className={
                                      log.cache === 'HIT'
                                        ? 'text-emerald-400 font-bold'
                                        : 'text-blue-400'
                                    }
                                  >
                                    200 OK ({log.cache})
                                  </span>
                                ) : (
                                  <span className="text-rose-500">Failed</span>
                                )}
                              </td>
                              <td className="py-2 text-right text-slate-400">
                                {log.durationMs !== undefined ? `${log.durationMs}ms` : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {networkLogs.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
                      <span>Total logged: {networkLogs.length}</span>
                      <button
                        onClick={() => setNetworkLogs([])}
                        className="text-slate-400 hover:text-slate-200 hover:underline"
                      >
                        Clear logs
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* QUICK CONCEPT CARD */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span>Why Debounce + AbortController?</span>
                </h3>

                <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2">
                    <span className="font-bold text-blue-700">1.</span>
                    <span>
                      <strong className="text-slate-900">Debounce (400ms):</strong> Reduces 90% of requests by waiting until typing pauses.
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2">
                    <span className="font-bold text-emerald-700">2.</span>
                    <span>
                      <strong className="text-slate-900">AbortController:</strong> If network jitter causes an earlier search to lag, abort cancels it so it cannot overwrite the screen.
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 flex items-start gap-2">
                    <span className="font-bold text-amber-700">3.</span>
                    <span>
                      <strong className="text-slate-900">Server Map Cache:</strong> Repeat searches bypass the 800ms delay and return in 2ms from memory!
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: SERVER CACHE INSPECTOR */}
        {activeTab === 'cache' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-slate-900">
                      In-Memory Server Cache (JavaScript Map)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Live inspection of key-value pairs stored in Node.js server RAM with 60-second TTL.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchCacheInfo}
                    disabled={isRefreshingCache}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isRefreshingCache ? 'animate-spin' : ''}`}
                    />
                    <span>Refresh</span>
                  </button>

                  <button
                    onClick={handleClearCache}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Cache</span>
                  </button>
                </div>
              </div>

              {/* Cache Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-medium text-slate-500">Total Cached Keys</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {cachedEntries.length}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-medium text-slate-500">Configured TTL</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    60 seconds
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-medium text-slate-500">Cache Hit Latency</span>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    ~2 ms
                  </p>
                </div>
              </div>

              {/* Cache Entries Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                      <th className="py-3 px-4">Cache Key (Query)</th>
                      <th className="py-3 px-4">Matches</th>
                      <th className="py-3 px-4">Stored Results</th>
                      <th className="py-3 px-4">Age</th>
                      <th className="py-3 px-4 text-right">TTL Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cachedEntries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Cache is currently empty. Go to Search Lab and search any keyword to populate!
                        </td>
                      </tr>
                    ) : (
                      cachedEntries.map((entry) => (
                        <tr key={entry.query} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">
                            "{entry.query}"
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {entry.resultCount} items
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {entry.results.join(', ')}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {entry.ageSeconds}s ago
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {entry.ttlRemainingSeconds}s left
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: PROJECT CODE VIEWER */}
        {activeTab === 'code' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedFile('backend')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedFile === 'backend'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  backend/server.js
                </button>
                <button
                  onClick={() => setSelectedFile('debounce')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedFile === 'debounce'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  useDebounce.js
                </button>
                <button
                  onClick={() => setSelectedFile('app')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedFile === 'app'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  App.jsx (AbortController)
                </button>
                <button
                  onClick={() => setSelectedFile('readme')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedFile === 'readme'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Quick Setup
                </button>
              </div>

              <button
                onClick={() => copyCode(fileContents[selectedFile])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="p-5 bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed max-h-[550px]">
              <code>{fileContents[selectedFile]}</code>
            </pre>
          </div>
        )}

        {/* TAB 4: COLLEGE DEMONSTRATION GUIDE */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  College Presentation & Viva Script
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Follow this structured walk-through when presenting this project to your professor or classmates.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Point 1 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Explain the Real-World Problem
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Say: <em>"In an asynchronous search box, typing 5 letters sends 5 independent HTTP requests. Because network speeds fluctuate, request #2 might take 800ms while request #5 takes 100ms. If request #2 finishes last, it displays stale results for an old keystroke. This is called an asynchronous race condition."</em>
                  </p>
                </div>

                {/* Point 2 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      2
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Demonstrate Chrome DevTools Network Tab
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Press <kbd className="px-1.5 py-0.5 bg-white border rounded font-mono text-[10px]">F12</kbd> or right-click Inspect &rarr; <strong>Network</strong>. Filter by <code>Fetch/XHR</code>. Type fast. Show your teacher that cancelled requests show status <strong className="text-rose-600 font-mono">(canceled)</strong>.
                  </p>
                </div>

                {/* Point 3 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      3
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Why Debouncing Alone Is Not Enough
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    A key question professors ask: <em>"Why do you need AbortController if you already have Debounce?"</em><br />
                    Answer: <em>"Debounce only controls the trigger rate. If a debounced request is already in flight and taking 800ms, and the user suddenly resumes typing a new search, two requests will now be in flight. Without AbortController, the older in-flight request can still arrive second and overwrite our state!"</em>
                  </p>
                </div>

                {/* Point 4 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      4
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Show Server Map Cache HIT vs MISS
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Search for <code>python</code>: point out the 800ms wait and <span className="text-amber-700 font-bold">MISS</span>. Then search for <code>react</code>, then delete and type <code>python</code> again: point out the instant 2ms response and glowing <span className="text-emerald-700 font-bold">HIT</span> badge!
                  </p>
                </div>

              </div>

              {/* VS Code Terminals Guide Card */}
              <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/60 space-y-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-blue-700" />
                  <h3 className="text-sm font-bold text-blue-900">
                    How the Two Terminals Work in VS Code
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Terminal 1: Backend</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[10px]">Port 5000</span>
                    </div>
                    <code className="block bg-slate-900 text-slate-100 p-2 rounded text-[11px] font-mono">
                      cd backend<br />
                      npm install<br />
                      node server.js
                    </code>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Prints incoming queries, intentional 800ms latency notices, and <code>[CACHE HIT]</code> or <code>[CACHE MISS]</code> logs in real time. <strong>Keep this terminal running!</strong>
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Terminal 2: Frontend</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px]">Port 5173</span>
                    </div>
                    <code className="block bg-slate-900 text-slate-100 p-2 rounded text-[11px] font-mono">
                      cd frontend<br />
                      npm install<br />
                      npm run dev
                    </code>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      Starts the Vite React development server. Open <code>http://localhost:5173</code> in Chrome to view the UI.
                    </p>
                  </div>
                </div>
              </div>

              {/* Complete Testing Checklist */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>10-Point Testing Checklist</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>1. Empty query clears results immediately.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>2. Debounce waits 400ms after last keystroke.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>3. In-flight requests cancelled via AbortController.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>4. AbortError ignored gracefully (no red UI error).</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>5. Cache MISS takes ~800ms intentional delay.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>6. Cache HIT returns in ~2ms from RAM Map.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>7. Cache TTL (60s) evicts expired keys.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>8. Substring matches highlighted in yellow.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>9. Friendly empty state when 0 matches found.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>10. Offline / error banner if backend unreachable.</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>Smart Search Lab &copy; 2026 · Demonstrating Debounce, AbortController, and In-Memory Server Caching</p>
      </footer>
    </div>
  );
}
