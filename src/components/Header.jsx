import { useEffect, useState } from 'react';

export default function Header({ activeTab, onTabChange, updatedAt, usingCache, onRefresh, loading }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    if (!updatedAt) return;
    const fmt = () => setTimeStr(updatedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    fmt();
    const t = setInterval(fmt, 30000);
    return () => clearInterval(t);
  }, [updatedAt]);

  return (
    <header className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center gap-4 flex-wrap">
      {/* Logo */}
      <div className="flex items-center gap-2 font-bold text-white text-lg mr-2">
        <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <ellipse cx="12" cy="12" rx="10" ry="4" strokeLinecap="round" />
          <ellipse cx="12" cy="12" rx="10" ry="4" strokeLinecap="round" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" strokeLinecap="round" transform="rotate(-60 12 12)" />
        </svg>
        <span>NEO Sentinel</span>
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 flex-wrap">
        {[
          { id: 'globe',        label: '🌍 All Time' },
          { id: 'current',      label: '⚡ Current' },
          { id: 'list',         label: '📋 All Time List' },
          { id: 'list-current', label: '📋 Current List' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Status */}
      <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
        {usingCache && (
          <span className="text-amber-400 bg-amber-900/40 px-2 py-1 rounded">Using cached data</span>
        )}
        {updatedAt && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live · Updated {timeStr}
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
          aria-label="Refresh data"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Refresh
        </button>
      </div>
    </header>
  );
}
