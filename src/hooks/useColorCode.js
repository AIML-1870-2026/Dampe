export const THREAT_LEVELS = {
  CRITICAL: { label: 'Critical', color: '#E24B4A', bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500', threshold: 1 },
  WATCH:    { label: 'Watch',    color: '#EF9F27', bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500', threshold: 5 },
  CAUTION:  { label: 'Caution', color: '#FAC775', bg: 'bg-yellow-400', text: 'text-yellow-400', border: 'border-yellow-400', threshold: 10 },
  SAFE:     { label: 'Safe',    color: '#639922', bg: 'bg-green-600', text: 'text-green-400', border: 'border-green-600', threshold: Infinity },
};

export const THREAT_LEVELS_UNKNOWN = {
  label: 'Tracked', color: '#6b7280', bg: 'bg-gray-600', text: 'text-gray-400', border: 'border-gray-600',
};

export function getThreatLevel(distLd) {
  if (distLd == null) return THREAT_LEVELS_UNKNOWN;
  if (distLd < 1) return THREAT_LEVELS.CRITICAL;
  if (distLd < 5) return THREAT_LEVELS.WATCH;
  if (distLd < 10) return THREAT_LEVELS.CAUTION;
  return THREAT_LEVELS.SAFE;
}

export function useColorCode() {
  return { getThreatLevel, THREAT_LEVELS };
}
