import { useState, useRef, useEffect } from 'react';

const DEFINITIONS = {
  AU: 'Astronomical Unit — the average distance between Earth and the Sun (about 150 million km).',
  LD: 'Lunar Distance — the average distance from Earth to the Moon (384,400 km). Used as a more relatable unit for close approaches.',
  'Torino Scale': 'A 0–10 scale for rating the impact hazard of near-Earth objects. 0 = no risk, 10 = certain global catastrophe.',
  'Palermo Scale': 'A logarithmic hazard index comparing the impact probability against background risk. Values above 0 are considered noteworthy.',
  'Absolute magnitude': 'A measure of an asteroid\'s intrinsic brightness. Lower H values mean brighter (and usually larger) objects.',
  Albedo: 'The fraction of light an object reflects. A value of 0 is perfectly dark; 1 is a perfect mirror. Used to estimate asteroid size from brightness.',
  v_rel: 'Relative velocity — the speed of the asteroid relative to Earth at the moment of closest approach.',
  'Palermo Technical Scale': 'A logarithmic hazard rating. Values above -2 merit monitoring; values above 0 are considered threatening.',
};

export default function Tooltip({ term, children }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setVisible(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const definition = DEFINITIONS[term] || children;
  if (!definition) return null;

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="ml-1 w-4 h-4 rounded-full bg-gray-600 text-gray-300 text-[10px] font-bold leading-none inline-flex items-center justify-center hover:bg-gray-500 cursor-pointer"
        aria-label={`Explain ${term}`}
      >
        ?
      </button>
      {visible && (
        <div className="absolute z-50 bottom-6 left-1/2 -translate-x-1/2 w-64 bg-gray-800 border border-gray-600 rounded-lg p-3 text-xs text-gray-200 shadow-xl">
          <div className="font-semibold text-white mb-1">{term}</div>
          <div>{definition}</div>
          <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-800 border-r border-b border-gray-600 rotate-45" />
        </div>
      )}
    </span>
  );
}
