import React from 'react';
import { Search, X, Loader2 } from 'lucide-react';

/**
 * SearchBox Component
 *
 * Clean, modern search input bar with search icon, loading spinner,
 * and quick-search technology tags for easy testing.
 */
export default function SearchBox({ value, onChange, onClear, isLoading }) {
  const sampleSearches = ['react', 'node', 'type', 'git', 'sql', 'python'];

  return (
    <div className="w-full space-y-3">
      <div className="relative flex items-center">
        {/* Search Icon */}
        <div className="absolute left-4 pointer-events-none text-slate-400">
          <Search className="w-5 h-5" />
        </div>

        {/* Input Field */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search technologies (e.g. react, node, python)..."
          className="w-full pl-12 pr-24 py-3.5 bg-white text-slate-900 border border-slate-300 rounded-xl shadow-sm text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          autoFocus
        />

        {/* Right Action Icons: Spinner & Clear */}
        <div className="absolute right-3 flex items-center gap-2">
          {isLoading && (
            <div className="flex items-center text-blue-600 animate-spin">
              <Loader2 className="w-5 h-5" />
            </div>
          )}

          {value && (
            <button
              type="button"
              onClick={onClear}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Test Tags */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        <span className="font-medium text-slate-400">Quick test:</span>
        {sampleSearches.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onChange(term)}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono transition"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}
