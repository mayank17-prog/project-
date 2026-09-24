import React, { useState, useEffect, useRef } from 'react';
import { useDebounce } from './hooks/useDebounce';
import SearchBox from './components/SearchBox';
import CacheBadge from './components/CacheBadge';
import ResultsList from './components/ResultsList';
import { AlertCircle, ShieldCheck, Zap, HelpCircle } from 'lucide-react';

// Backend server URL (Defaults to localhost:5000 for local standalone run, or window.location.origin)
const BACKEND_URL =
  typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:5000'
    : '';

export default function App() {
  // 1. STATE VARIABLES
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [cacheStatus, setCacheStatus] = useState(null); // 'HIT' | 'MISS' | null
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [responseTime, setResponseTime] = useState(null);

  // Demonstration Mode:
  // - 'protected': uses useDebounce + AbortController + cleanup (Fixes race condition)
  // - 'naive': fires on every keystroke with no aborting (Causes race condition!)
  const [isProtectedMode, setIsProtectedMode] = useState(true);

  // Network logs for educational inspection
  const [networkLogs, setNetworkLogs] = useState([]);
  const requestSeq = useRef(0);

  // 2. DEBOUNCE HOOK (Only active in Protected Mode)
  // In Protected Mode, wait 400ms after user stops typing
  const debouncedSearchTerm = useDebounce(searchTerm, isProtectedMode ? 400 : 0);

  // Active query to search: debounced value in protected mode, immediate value in naive mode
  const activeQuery = isProtectedMode ? debouncedSearchTerm : searchTerm;

  // 3. SEARCH EFFECT WITH ABORTCONTROLLER AND CLEANUP
  useEffect(() => {
    // If the input is blank, reset results and stop
    if (!activeQuery.trim()) {
      setResults([]);
      setCacheStatus(null);
      setIsLoading(false);
      setError(null);
      setResponseTime(null);
      return;
    }

    // CREATE ABORT CONTROLLER (Only in protected mode)
    // AbortController allows us to cancel an ongoing HTTP fetch if a new query arrives
    const controller = new AbortController();
    const currentSignal = isProtectedMode ? controller.signal : undefined;

    const currentReqId = ++requestSeq.current;
    const startTime = performance.now();

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    // Add entry to visual log
    const logItem = {
      id: currentReqId,
      query: activeQuery,
      status: 'pending',
      timestamp: new Date().toLocaleTimeString(),
      mode: isProtectedMode ? 'Protected' : 'Naive'
    };
    setNetworkLogs((prev) => [logItem, ...prev.slice(0, 9)]);

    console.log(`[REQUEST #${currentReqId} SENT] Query: "${activeQuery}"`);

    // Perform Fetch
    fetch(`${BACKEND_URL}/search?q=${encodeURIComponent(activeQuery)}`, {
      signal: currentSignal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const elapsed = Math.round(performance.now() - startTime);
        console.log(`[REQUEST #${currentReqId} FINISHED] in ${elapsed}ms:`, data);

        // Update UI state with search results
        setResults(data.results || []);
        setCacheStatus(data.cache || 'MISS');
        setResponseTime(elapsed);
        setIsLoading(false);

        // Update log
        setNetworkLogs((prev) =>
          prev.map((log) =>
            log.id === currentReqId
              ? { ...log, status: `Finished (${data.cache})`, duration: `${elapsed}ms` }
              : log
          )
        );
      })
      .catch((err) => {
        // IMPORTANT: Check if the error was caused by AbortController
        if (err.name === 'AbortError') {
          console.log(`🛑 [REQUEST #${currentReqId} ABORTED] Cancelled previous search for "${activeQuery}"`);

          // Update log to show cancellation
          setNetworkLogs((prev) =>
            prev.map((log) =>
              log.id === currentReqId
                ? { ...log, status: 'Cancelled (Aborted)', duration: 'Aborted' }
                : log
            )
          );
          // Do NOT display aborts as red user errors; it is normal behavior!
          return;
        }

        console.error(`[REQUEST #${currentReqId} ERROR]`, err);
        setError(`Failed to connect to backend: ${err.message}. Is your Node server running on port 5000?`);
        setIsLoading(false);
      });

    // -------------------------------------------------------------
    // 4. REACT CLEANUP FUNCTION:
    // -------------------------------------------------------------
    // When the user types a new character or unmounts, this cleanup runs FIRST.
    // In Protected Mode, controller.abort() signals fetch() to cancel immediately!
    return () => {
      if (isProtectedMode) {
        console.log(`[CLEANUP] Aborting in-flight request #${currentReqId} for "${activeQuery}"`);
        controller.abort();
      }
    };
  }, [activeQuery, isProtectedMode]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Full-Stack Concurrency Lab</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Smart Search
          </h1>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            React + Node.js Search with <span className="font-semibold text-slate-700">Debounce</span>,{' '}
            <span className="font-semibold text-slate-700">AbortController</span>, and{' '}
            <span className="font-semibold text-slate-700">Server Cache</span>.
          </p>
        </div>

        {/* MODE TOGGLE CARD (FOR COLLEGE DEMO) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isProtectedMode
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              {isProtectedMode ? <ShieldCheck className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {isProtectedMode ? 'Protected Mode (Fixed)' : 'Naive Mode (Race Condition Prone)'}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                    isProtectedMode
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isProtectedMode ? 'Active' : 'Broken'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isProtectedMode
                  ? '400ms Debounce + AbortController cancels in-flight requests on keystroke.'
                  : 'Fires fetch immediately on every key without aborting. Older requests can overwrite newer results!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsProtectedMode(!isProtectedMode)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition shadow-sm ${
                isProtectedMode
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent'
              }`}
            >
              {isProtectedMode ? 'Switch to Naive Mode' : 'Switch to Protected Mode'}
            </button>
          </div>
        </div>

        {/* MAIN SEARCH INTERFACE CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">

          {/* Search Input Bar */}
          <SearchBox
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
            onClear={() => setSearchTerm('')}
            isLoading={isLoading}
          />

          {/* Status Bar: Cache Indicator & Response Time */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <CacheBadge status={cacheStatus} />
            </div>

            {responseTime !== null && (
              <div className="text-xs text-slate-400 font-mono">
                Latency: <span className="font-semibold text-slate-600">{responseTime}ms</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Connection Error</p>
                <p className="text-xs mt-0.5 text-rose-600">{error}</p>
              </div>
            </div>
          )}

          {/* Search Results Component */}
          <ResultsList
            query={searchTerm}
            results={results}
            isLoading={isLoading}
            hasSearched={hasSearched}
          />
        </div>

        {/* EDUCATIONAL INSPECTOR PANEL (DevTools Visualizer) */}
        <div className="bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="text-sm font-bold text-white tracking-wide">
                Live Network & Concurrency Inspector
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Simulated Server Delay: ~800ms
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Watch how requests behave when you type quickly in the search box above.
            In <span className="text-emerald-400 font-semibold">Protected Mode</span>, previous requests are aborted before a new one completes.
            In <span className="text-rose-400 font-semibold">Naive Mode</span>, all requests execute and compete to overwrite state!
          </p>

          {/* Request Log Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Query</th>
                  <th className="pb-2">Mode</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {networkLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500">
                      No network requests sent yet. Start typing above!
                    </td>
                  </tr>
                ) : (
                  networkLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="py-2 text-slate-400">#{log.id}</td>
                      <td className="py-2 text-white font-semibold">"{log.query}"</td>
                      <td className="py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            log.mode === 'Protected'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {log.mode}
                        </span>
                      </td>
                      <td className="py-2">
                        {log.status === 'pending' ? (
                          <span className="text-amber-400 animate-pulse">In-flight (800ms)...</span>
                        ) : log.status.includes('Aborted') ? (
                          <span className="text-rose-400 font-bold">Cancelled (Aborted)</span>
                        ) : (
                          <span className="text-emerald-400 font-medium">{log.status}</span>
                        )}
                      </td>
                      <td className="py-2 text-right text-slate-400">
                        {log.duration || '...'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
