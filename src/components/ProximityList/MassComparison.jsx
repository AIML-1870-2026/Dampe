import { MASS_REFERENCES } from '../../constants/references';
import { formatMassScientific } from '../../api/utils';

export default function MassComparison({ massKg }) {
  if (massKg == null) return <div className="text-gray-500 text-sm">Mass unknown</div>;

  const mass = formatMassScientific(massKg);

  // Find closest two references
  const sorted = [...MASS_REFERENCES].sort((a, b) => {
    const ra = Math.abs(Math.log10(a.mass) - Math.log10(massKg));
    const rb = Math.abs(Math.log10(b.mass) - Math.log10(massKg));
    return ra - rb;
  });
  const top2 = sorted.slice(0, 2);

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-300">
        Estimated mass: <span className="font-mono text-white">{mass.coeff} × 10<sup>{mass.exp}</sup> kg</span>
      </div>

      {top2.map(ref => {
        const count = massKg / ref.mass;
        const countFmt = count >= 1000
          ? count.toExponential(1)
          : count < 0.01
          ? count.toExponential(1)
          : count >= 100
          ? Math.round(count).toLocaleString()
          : count.toFixed(1);

        return (
          <div key={ref.label} className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">{ref.label}</div>
            <div className="text-sm text-white">
              {count >= 1 ? (
                <>≈ <span className="font-bold text-blue-400">{countFmt}</span> × {ref.label.toLowerCase()}{count >= 2 ? 's' : ''}</>
              ) : (
                <>≈ <span className="font-bold text-blue-400">{(1 / count).toFixed(0)}</span>th of one {ref.label.toLowerCase()}</>
              )}
            </div>
            <MassBar ratio={Math.min(count, 100000)} />
          </div>
        );
      })}

      <div className="space-y-1.5">
        {MASS_REFERENCES.map(ref => {
          const ratio = massKg / ref.mass;
          const pct = Math.min(100, Math.max(2, Math.log10(ratio + 0.0001) * 20 + 50));
          return (
            <div key={ref.label} className="flex items-center gap-2 text-xs">
              <div className="w-28 text-gray-400 truncate">{ref.label}</div>
              <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: ratio >= 1 ? '#3b82f6' : '#6b7280' }}
                />
              </div>
              <div className="w-20 text-right text-gray-400 font-mono">
                {ratio >= 1 ? `${ratio >= 1000 ? ratio.toExponential(0) : Math.round(ratio).toLocaleString()}×` : `÷${Math.round(1/ratio).toLocaleString()}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MassBar({ ratio }) {
  const pct = Math.min(100, Math.log10(ratio + 1) * 25);
  return (
    <div className="mt-2 bg-gray-700 rounded-full h-1.5">
      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
