import { useState, useMemo } from 'react';
import ListRow from './ListRow';

const SORT_OPTIONS = [
  { value: 'dist',  label: 'Distance' },
  { value: 'cd',    label: 'Approach Date' },
  { value: 'size',  label: 'Size' },
  { value: 'v_rel', label: 'Velocity' },
];

const FILTER_OPTIONS = [
  { value: 'all',    label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'watch',  label: 'Watch' },
  { value: 'sentry', label: 'Sentry Only' },
];

export default function ProximityList({ objects, onWatchOnGlobe, footerText }) {
  const [expandedDes, setExpandedDes] = useState(null);
  const [sortBy, setSortBy] = useState('dist');
  const [filterBy, setFilterBy] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = [...objects];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.des?.toLowerCase().includes(q) || o.name?.toLowerCase().includes(q)
      );
    }

    if (filterBy === 'critical') list = list.filter(o => o.distLd != null && o.distLd < 1);
    else if (filterBy === 'watch') list = list.filter(o => o.distLd != null && o.distLd >= 1 && o.distLd < 5);
    else if (filterBy === 'sentry') list = list.filter(o => o.sentry);

    list.sort((a, b) => {
      if (sortBy === 'dist') {
        // Null distances sort to the end
        if (a.distLd == null && b.distLd == null) return 0;
        if (a.distLd == null) return 1;
        if (b.distLd == null) return -1;
        return a.distLd - b.distLd;
      }
      if (sortBy === 'cd') {
        // Null dates sort to the end
        if (!a.cd && !b.cd) return 0;
        if (!a.cd) return 1;
        if (!b.cd) return -1;
        return new Date(a.cd) - new Date(b.cd);
      }
      if (sortBy === 'size')  return (b.diameterM ?? 0) - (a.diameterM ?? 0);
      if (sortBy === 'v_rel') return (b.v_rel ?? 0) - (a.v_rel ?? 0);
      return 0;
    });

    return list;
  }, [objects, sortBy, filterBy, search]);

  function handleToggle(des) {
    setExpandedDes(prev => prev === des ? null : des);
  }

  const counts = useMemo(() => ({
    critical: objects.filter(o => o.distLd != null && o.distLd < 1).length,
    watch:    objects.filter(o => o.distLd != null && o.distLd >= 1 && o.distLd < 5).length,
    caution:  objects.filter(o => o.distLd != null && o.distLd >= 5 && o.distLd < 10).length,
    safe:     objects.filter(o => o.distLd != null && o.distLd >= 10).length,
    sentry:   objects.filter(o => o.sentry).length,
    noApproach: objects.filter(o => o.distLd == null).length,
  }), [objects]);

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-gray-800 space-y-3">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {[
            { label: 'Critical', color: '#E24B4A', count: counts.critical },
            { label: 'Watch',    color: '#EF9F27', count: counts.watch },
            { label: 'Caution',  color: '#FAC775', count: counts.caution },
            { label: 'Safe',     color: '#639922', count: counts.safe },
          ].map(({ label, color, count }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-gray-400">{label}</span>
              <span className="text-gray-600">({count})</span>
            </div>
          ))}
          {counts.sentry > 0 && (
            <div className="flex items-center gap-1 text-red-400 text-xs">
              <span>⚠</span>
              <span>{counts.sentry} on Sentry watch list</span>
            </div>
          )}
          {counts.noApproach > 0 && (
            <div className="flex items-center gap-1 text-gray-500 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
              <span>{counts.noApproach} no upcoming approach</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or designation…"
            className="flex-1 min-w-40 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
          </select>
          <div className="flex rounded overflow-hidden border border-gray-700">
            {FILTER_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setFilterBy(o.value)}
                className={`px-3 py-1.5 text-xs transition-colors ${filterBy === o.value ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div className="px-4 py-2 flex items-center gap-3 text-xs text-gray-600 border-b border-gray-800">
        <div className="w-7 text-right">#</div>
        <div className="w-[80px]">Distance</div>
        <div className="flex-1">Object</div>
        <div className="hidden sm:block w-24">Date</div>
        <div className="hidden md:block w-20">Velocity</div>
        <div className="hidden lg:block w-16">Est. Size</div>
        <div className="w-12" />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No objects match your filters.</div>
        ) : (
          filtered.map(obj => (
            <ListRow
              key={obj.des}
              object={obj}
              expanded={expandedDes === obj.des}
              onToggle={() => handleToggle(obj.des)}
              onWatchOnGlobe={onWatchOnGlobe}
            />
          ))
        )}
      </div>

      <div className="px-4 py-2 text-xs text-gray-600 border-t border-gray-800">
        Showing {filtered.length} of {objects.length} objects
        {footerText && <span className="ml-2 text-gray-700">· {footerText}</span>}
      </div>
    </div>
  );
}
