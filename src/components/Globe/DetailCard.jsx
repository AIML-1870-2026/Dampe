import { useEffect } from 'react';
import { getThreatLevel } from '../../hooks/useColorCode';
import { formatLd, formatKm } from '../../constants/conversions';
import { formatCountdown, velocityToBullets, formatMassScientific } from '../../api/utils';
import { TORINO_DESCRIPTIONS } from '../../constants/references';
import Tooltip from '../Tooltip';

export default function DetailCard({ object, onClose }) {
  const threat = getThreatLevel(object.distLd);
  const countdown = object.cd ? formatCountdown(object.cd) : null;
  const approachDate = object.cd ? new Date(object.cd) : null;
  const daysUntil = approachDate ? Math.ceil((approachDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const mass = object.massKg ? formatMassScientific(object.massKg) : null;

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop (mobile) */}
      <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />

      {/* Card */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 z-40 bg-gray-900 border-l border-gray-700 overflow-y-auto shadow-2xl flex flex-col
                      lg:absolute animate-slide-in">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-white">{object.des}</div>
            {object.name && object.name !== object.des && (
              <div className="text-sm text-gray-400">{object.name}</div>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className="px-2 py-0.5 rounded text-xs font-bold text-white"
                style={{ backgroundColor: threat.color }}
              >
                {threat.label}
              </span>
              {object.sentry && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-900 text-red-300 border border-red-700">
                  ⚠ On NASA Impact Watch List
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-5 flex-1">
          {/* Approach Details */}
          <Section title="Approach Details">
            <Row label="Closest approach">
              {approachDate ? (
                <>
                  <span className="text-white">{approachDate.toUTCString().replace(' GMT', ' UTC')}</span>
                  {daysUntil <= 7 && countdown && (
                    <span className="ml-2 text-xs text-amber-400 font-mono">T-{countdown}</span>
                  )}
                </>
              ) : (
                <span className="text-gray-500">No upcoming approach on record</span>
              )}
            </Row>
            <Row label={<>Nominal distance <Tooltip term="LD" /> <Tooltip term="AU" /></>}>
              {object.distLd != null ? (
                <>
                  <span className="text-white font-mono">{formatLd(object.distLd)} LD</span>
                  <span className="text-gray-400 ml-2 text-xs">{formatKm(object.distKm)} km</span>
                </>
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </Row>
            <Row label="Distance uncertainty">
              {object.uncertaintyKm != null ? (
                <span className="text-white font-mono">±{formatKm(object.uncertaintyKm / 2)} km</span>
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </Row>
            <Row label={<>Relative velocity <Tooltip term="v_rel" /></>}>
              {object.v_rel != null ? (
                <>
                  <span className="text-white font-mono">{object.v_rel.toFixed(1)} km/s</span>
                  <span className="text-gray-400 ml-2 text-xs">~{velocityToBullets(object.v_rel)}× speed of a bullet</span>
                </>
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </Row>
          </Section>

          {/* Physical Characteristics */}
          <Section title="Physical Characteristics">
            <Row label={<>Estimated diameter <InfoIcon /></>}>
              {object.diameterM != null ? (
                <span className="text-white font-mono">{formatSize(object.diameterM)}</span>
              ) : (
                <span className="text-gray-500">Unknown</span>
              )}
            </Row>
            <Row label={<>Estimated mass <InfoIcon /></>}>
              {mass ? (
                <span className="text-white font-mono">{mass.coeff} × 10<sup>{mass.exp}</sup> kg</span>
              ) : (
                <span className="text-gray-500">Unknown</span>
              )}
            </Row>
            <Row label={<>Absolute magnitude (H) <Tooltip term="Absolute magnitude" /></>}>
              <span className="text-white font-mono">{object.h?.toFixed(1) ?? '—'}</span>
            </Row>
            <Row label={<>Albedo assumed <Tooltip term="Albedo" /></>}>
              <span className="text-gray-400 font-mono">0.154 (average)</span>
            </Row>
          </Section>

          {/* Impact Risk */}
          {object.sentry && (
            <Section title="Impact Risk">
              <TorinoBar ts={object.sentry.ts} />
              <Row label={<>Palermo Scale <Tooltip term="Palermo Scale" /></>}>
                <span className="text-white font-mono">{object.sentry.ps?.toFixed(2) ?? '—'}</span>
              </Row>
              <Row label="Impact probability">
                {object.sentry.ip != null ? (
                  <span className="text-white font-mono">
                    1 in {Math.round(1 / object.sentry.ip).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </Row>
              <Row label="Potential impact solutions">
                <span className="text-white font-mono">{object.sentry.n_imp ?? '—'}</span>
              </Row>
              {object.sentry.ts != null && (
                <p className="text-xs text-gray-400 mt-2 p-2 bg-gray-800 rounded">
                  {TORINO_DESCRIPTIONS[Math.min(object.sentry.ts, 10)]}
                </p>
              )}
              <a
                href={`https://cneos.jpl.nasa.gov/sentry/details.html#?des=${encodeURIComponent(object.des)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline mt-1 block"
              >
                View on NASA Sentry →
              </a>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 text-center">
          <a
            href={`https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(object.des)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 underline"
          >
            View full data on NASA JPL →
          </a>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-2 text-sm">
      <div className="text-gray-400 flex-shrink-0">{label}</div>
      <div className="text-right">{children}</div>
    </div>
  );
}

function InfoIcon() {
  return (
    <span className="ml-1 w-4 h-4 rounded-full bg-gray-600 text-gray-300 text-[10px] font-bold leading-none inline-flex items-center justify-center cursor-help" title="Derived from absolute magnitude. Actual size may vary significantly.">
      i
    </span>
  );
}

function TorinoBar({ ts }) {
  const val = ts ?? 0;
  const colors = ['#6b7280','#4ade80','#84cc16','#eab308','#f97316','#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d','#450a0a'];
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Torino Scale <Tooltip term="Torino Scale" /></span>
        <span className="font-bold text-white">{val} / 10</span>
      </div>
      <div className="flex gap-0.5 h-3">
        {colors.map((c, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{ backgroundColor: i <= val ? c : '#374151' }} />
        ))}
      </div>
    </div>
  );
}

function formatSize(m) {
  if (m < 1) return `${(m * 100).toFixed(1)} cm`;
  if (m < 1000) return `${m.toFixed(0)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}
