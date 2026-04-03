import SizeChart from './SizeChart';
import MassComparison from './MassComparison';

export default function ComparisonPanel({ object, onWatchOnGlobe }) {
  return (
    <div className="border-t border-gray-700 bg-gray-900/50 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Size comparison */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Size Comparison</div>
          <SizeChart diameterM={object.diameterM} />
        </div>

        {/* Mass comparison */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Mass Comparison</div>
          <MassComparison massKg={object.massKg} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-800 text-xs">
        <a
          href={`https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(object.des)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          View on NASA JPL →
        </a>
        <button
          onClick={() => onWatchOnGlobe(object)}
          className="text-blue-400 hover:text-blue-300 underline"
        >
          Watch on Globe →
        </button>
      </div>
    </div>
  );
}
