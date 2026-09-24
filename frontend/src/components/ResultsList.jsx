import React from 'react';
import { Sparkles, SearchX, Terminal } from 'lucide-react';

/**
 * ResultsList Component
 *
 * Renders search results with match highlights, count, empty state,
 * and initial helper instructions.
 */
export default function ResultsList({ query, results, isLoading, hasSearched }) {
  // 1. Initial State: No search has been performed yet
  if (!query && !hasSearched) {
    return (
      <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-white/50">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
          <Terminal className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700">Ready to search</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          Type any tech keyword (e.g. <span className="font-semibold text-slate-700">"react"</span>)
          to see debouncing, request cancellation, and server-side Map caching in action.
        </p>
      </div>
    );
  }

  // 2. Loading placeholder when searching for the first time
  if (isLoading && results.length === 0) {
    return (
      <div className="py-10 text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium animate-pulse">
          <span>Fetching from backend (waiting ~800ms)...</span>
        </div>
      </div>
    );
  }

  // 3. No Results Found State
  if (hasSearched && results.length === 0 && !isLoading) {
    return (
      <div className="text-center py-10 px-4 border border-slate-200 rounded-2xl bg-white shadow-sm">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">No matching technologies</h3>
        <p className="text-xs text-slate-500 mt-1">
          No items in our 24-item dataset matched <span className="font-mono font-medium text-slate-700">"{query}"</span>.
        </p>
      </div>
    );
  }

  // Helper to highlight matching characters
  const highlightMatch = (text, keyword) => {
    if (!keyword) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <span key={index} className="bg-yellow-200 text-slate-900 font-semibold px-0.5 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // 4. Results List
  return (
    <div className="space-y-3">
      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">Results</span>
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-200 text-slate-700">
            {results.length} {results.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        {query && (
          <span className="text-xs text-slate-400">
            Query: <code className="font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded">"{query}"</code>
          </span>
        )}
      </div>

      {/* Results Items */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
        {results.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm font-medium text-slate-900">
                {highlightMatch(item, query)}
              </span>
            </div>
            <Sparkles className="w-4 h-4 text-slate-300" />
          </div>
        ))}
      </div>
    </div>
  );
}
