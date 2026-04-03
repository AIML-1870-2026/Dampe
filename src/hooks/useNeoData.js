import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCAD } from '../api/cad';
import { fetchSentry } from '../api/sentry';
import { estimateDiameterM, estimateMassKg } from '../api/utils';
import { auToLd, auToKm } from '../constants/conversions';

const REFRESH_INTERVAL = 10 * 60 * 1000;

function enrichCAD(cadData, sentryMap) {
  return cadData.map((neo, idx) => {
    const sentry = sentryMap[neo.des] || null;
    const diameterM = neo.h != null ? estimateDiameterM(neo.h) : null;
    const massKg = diameterM != null ? estimateMassKg(diameterM) : null;
    const distLd = auToLd(neo.dist);
    const distKm = auToKm(neo.dist);
    const distMinKm = auToKm(neo.dist_min);
    const distMaxKm = auToKm(neo.dist_max);
    return {
      ...neo,
      rank: idx + 1,
      sentry,
      diameterM,
      massKg,
      distLd,
      distKm,
      distMinKm,
      distMaxKm,
      uncertaintyKm: distMaxKm - distMinKm,
      displayDistLd: distLd,
    };
  });
}

// Build the "Current" list: top-50 Sentry objects by impact probability,
// enriched with CAD close-approach data wherever available.
function buildSentryObjects(sentryMap, cadByDes) {
  const sorted = Object.values(sentryMap)
    .filter((s) => s.ip != null)
    .sort((a, b) => b.ip - a.ip)
    .slice(0, 50);

  return sorted.map((s, idx) => {
    const cad = cadByDes[s.des] || null;
    const hVal = cad?.h ?? (s.h != null ? parseFloat(s.h) : null);
    const diameterM = hVal != null ? estimateDiameterM(hVal) : null;
    const massKg = diameterM != null ? estimateMassKg(diameterM) : null;

    // Spread Sentry-only objects visually across 18–55 LD on the globe
    const nominalDistLd = 18 + (idx / 50) * 37;

    if (cad) {
      return {
        ...cad,
        rank: idx + 1,
        sentry: s,
        diameterM,
        massKg,
        distLd: cad.distLd,
        distKm: cad.distKm,
        distMinKm: cad.distMinKm,
        distMaxKm: cad.distMaxKm,
        uncertaintyKm: cad.uncertaintyKm,
        displayDistLd: cad.distLd,
      };
    }

    return {
      des: s.des,
      name: null,
      cd: null,
      dist: null,
      dist_min: null,
      dist_max: null,
      v_rel: null,
      v_inf: null,
      h: hVal,
      rank: idx + 1,
      sentry: s,
      diameterM,
      massKg,
      distLd: null,
      distKm: null,
      distMinKm: null,
      distMaxKm: null,
      uncertaintyKm: null,
      displayDistLd: nominalDistLd,
    };
  });
}

export function useNeoData() {
  const [objects, setObjects] = useState([]);
  const [sentryObjects, setSentryObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [usingCache, setUsingCache] = useState(false);
  const intervalRef = useRef(null);

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      sessionStorage.removeItem('neo_cad_cache');
      sessionStorage.removeItem('neo_sentry_cache');
    }
    setLoading(true);
    setError(null);
    setUsingCache(false);
    try {
      const [cadData, sentryMap] = await Promise.all([fetchCAD(), fetchSentry()]);
      const joined = enrichCAD(cadData, sentryMap);
      const cadByDes = Object.fromEntries(joined.map((o) => [o.des, o]));
      setObjects(joined);
      setSentryObjects(buildSentryObjects(sentryMap, cadByDes));
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err.message);
      try {
        const rawCad = sessionStorage.getItem('neo_cad_cache');
        const rawSentry = sessionStorage.getItem('neo_sentry_cache');
        if (rawCad && rawSentry) {
          const cad = JSON.parse(rawCad).data;
          const sentry = JSON.parse(rawSentry).data;
          if (cad && sentry) {
            const joined = enrichCAD(cad, sentry);
            const cadByDes = Object.fromEntries(joined.map((o) => [o.des, o]));
            setObjects(joined);
            setSentryObjects(buildSentryObjects(sentry, cadByDes));
            setUsingCache(true);
          }
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => load(), REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { objects, sentryObjects, loading, error, updatedAt, usingCache, refresh };
}
