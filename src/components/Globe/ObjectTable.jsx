import { useState } from 'react';
import { getThreatLevel } from '../../hooks/useColorCode';
import { formatLd } from '../../constants/conversions';

function formatDate(cd) {
  if (!cd) return '—';
  return new Date(cd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSize(m) {
  if (m == null) return '—';
  if (m < 1) return `${(m * 100).toFixed(1)} cm`;
  if (m < 1000) return `${m.toFixed(0)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

const COLUMNS = [
  { key: 'dist',  label: 'Distance' },
  { key: 'cd',    label: 'Date' },
  { key: 'v_rel', label: 'Velocity' },
  { key: 'size',  label: 'Est. Size' },
];

export default function ObjectTable({ objects, selectedObject, onSelect }) {
  const [sortBy, setSortBy] = useState('dist');
  const [search, setSearch] = useState('');

  const filtered = [...objects]
    .filter((o) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return o.des?.toLowerCase().includes(q) || o.name?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'dist') {
        const ad = a.distLd ?? a.displayDistLd ?? Infinity;
        const bd = b.distLd ?? b.displayDistLd ?? Infinity;
        return ad - bd;
      }
      if (sortBy === 'cd') {
        if (!a.cd && !b.cd) return 0;
        if (!a.cd) return 1;
        if (!b.cd) return -1;
        return new Date(a.cd) - new Date(b.cd);
      }
      if (sortBy === 'v_rel') return (b.v_rel ?? 0) - (a.v_rel ?? 0);
      if (sortBy === 'size')  return (b.diameterM ?? 0) - (a.diameterM ?? 0);
      return 0;
    });

  return (
    <div className="flex flex-col h-full bg-gray-950 border-l border-gray-800">
      {/* Toolbar */}
      <div className="px-3 py-2 border-b border-gray-800 space-y-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-full bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-1 flex-wrap">
          {COLUMNS.map((col) => (
            <button
              key={col.key}
              onClick={() => setSortBy(col.key)}
              className={`px-2 py-1 rounded text-[11px] transition-colors ${
                sortBy === col.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {col.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-gray-900 z-10">
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left px-3 py-2 font-medium">Object</th>
              <th className="text-right px-2 py-2 font-medium">Dist.</th>
              <th className="text-right px-2 py-2 font-medium hidden sm:table-cell">Date</th>
              <th className="text-right px-3 py-2 font-medium hidden md:table-cell">km/s</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((obj) => {
              const threat = getThreatLevel(obj.distLd);
              const isSelected = selectedObject?.des === obj.des;
              return (
                <tr
                  key={obj.des}
                  onClick={() => onSelect(obj)}
                  className={`border-b border-gray-800/60 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-900/30 border-blue-800'
                      : 'hover:bg-gray-800/50'
                  }`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: threat.color }} />
                      <span className="text-gray-200 font-mono truncate max-w-[100px]" title={obj.des}>
                        {obj.name && obj.name !== obj.des ? obj.name : obj.des}
                      </span>
                      {obj.sentry && <span className="text-red-400 text-[10px]">⚠</span>}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-mono">
                    {obj.distLd != null ? (
                      <span style={{ color: threat.color }}>{formatLd(obj.distLd)} LD</span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-400 hidden sm:table-cell">
                    {formatDate(obj.cd)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-400 font-mono hidden md:table-cell">
                    {obj.v_rel != null ? `${obj.v_rel.toFixed(1)}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-xs">No matches</div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-gray-800 text-[11px] text-gray-600">
        {filtered.length} of {objects.length} objects
      </div>
    </div>
  );
}
