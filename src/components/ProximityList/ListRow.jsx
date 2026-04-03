import { getThreatLevel } from '../../hooks/useColorCode';
import { formatLd } from '../../constants/conversions';
import ComparisonPanel from './ComparisonPanel';

function formatSize(m) {
  if (m == null) return '—';
  if (m < 1) return `${(m * 100).toFixed(1)} cm`;
  if (m < 1000) return `${m.toFixed(0)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function formatDate(cd) {
  if (!cd) return '—';
  return new Date(cd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ListRow({ object, expanded, onToggle, onWatchOnGlobe }) {
  const threat = getThreatLevel(object.distLd);

  return (
    <div className="border-b border-gray-800 last:border-0">
      <button
        onClick={onToggle}
        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-800/50 transition-colors ${expanded ? 'bg-gray-800/30' : ''}`}
        aria-expanded={expanded}
      >
        {/* Rank */}
        <div className="w-7 text-right text-gray-600 text-xs font-mono shrink-0">{object.rank}</div>

        {/* Distance pill */}
        <div
          className="px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap shrink-0 min-w-[60px] text-center text-white"
          style={{ backgroundColor: threat.color }}
        >
          {object.distLd != null ? `${formatLd(object.distLd)} LD` : 'Tracked'}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {object.name && object.name !== object.des ? object.name : object.des}
          </div>
          {object.name && object.name !== object.des && (
            <div className="text-xs text-gray-500 font-mono truncate">{object.des}</div>
          )}
        </div>

        {/* Date */}
        <div className="text-xs text-gray-400 shrink-0 hidden sm:block">{formatDate(object.cd)}</div>

        {/* Velocity */}
        <div className="text-xs text-gray-300 font-mono shrink-0 hidden md:block">
          {object.v_rel != null ? `${object.v_rel.toFixed(1)} km/s` : '—'}
        </div>

        {/* Size */}
        <div className="text-xs text-gray-400 shrink-0 hidden lg:block">{formatSize(object.diameterM)}</div>

        {/* Sentry icon */}
        {object.sentry && (
          <span className="text-red-400 text-sm shrink-0" title="On NASA Sentry watch list">⚠</span>
        )}

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {expanded && (
        <ComparisonPanel object={object} onWatchOnGlobe={onWatchOnGlobe} />
      )}
    </div>
  );
}
