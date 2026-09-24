import React from 'react';

/**
 * CacheBadge Component
 *
 * Displays whether the search result was served from the backend's
 * in-memory Map cache (HIT) or required a fresh lookup with 800ms delay (MISS).
 */
export default function CacheBadge({ status }) {
  if (!status) return null;

  const isHit = status === 'HIT';

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border shadow-sm transition-all duration-200">
      <span
        className={`w-2 h-2 rounded-full ${
          isHit ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
        }`}
      />
      <span className="text-slate-500 uppercase">Cache:</span>
      <span
        className={`font-bold ${
          isHit
            ? 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200'
            : 'text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200'
        }`}
      >
        {status}
      </span>
      <span className="text-[11px] text-slate-400 ml-1">
        {isHit ? '(Instant ~2ms from RAM)' : '(800ms delay + saved to Map)'}
      </span>
    </div>
  );
}
