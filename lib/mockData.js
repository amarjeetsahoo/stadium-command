// lib/mockData.js
// Deterministic crowd simulation for 8 gates at Narendra Modi Stadium, Ahmedabad.
// Uses sine-wave cycling so data looks live without real sensors.

export const STADIUM_CENTER = { lat: 23.0925, lng: 72.5946 };

export const GATES = [
  { id: 'G1', name: 'Gate 1 — North Entry',  lat: 23.0960, lng: 72.5946 },
  { id: 'G2', name: 'Gate 2 — NE Entry',     lat: 23.0949, lng: 72.5975 },
  { id: 'G3', name: 'Gate 3 — East Entry',   lat: 23.0925, lng: 72.5990 },
  { id: 'G4', name: 'Gate 4 — SE Entry',     lat: 23.0901, lng: 72.5975 },
  { id: 'G5', name: 'Gate 5 — South Entry',  lat: 23.0890, lng: 72.5946 },
  { id: 'G6', name: 'Gate 6 — SW Entry',     lat: 23.0901, lng: 72.5917 },
  { id: 'G7', name: 'Gate 7 — West Entry',   lat: 23.0925, lng: 72.5902 },
  { id: 'G8', name: 'Gate 8 — NW Entry',     lat: 23.0949, lng: 72.5917 },
];

/**
 * Generates deterministic but time-varying gate crowd data.
 * Each gate has a phase offset so they don't all peak at the same time.
 * @returns {Array} gate data objects
 */
export function generateCrowdData() {
  const now = Date.now();

  return GATES.map((gate, i) => {
    // Each gate cycles with a 60-second period, offset by gate index
    const phase = (i / GATES.length) * Math.PI * 2;
    const wave = Math.sin((now / 60000) * Math.PI * 2 + phase);

    // Base congestion spreads gates across 25–85% range
    const base = 25 + i * 8;
    const congestion = Math.min(98, Math.max(5, Math.round(base + wave * 25)));

    const capacity = 5000;
    const occupancy = Math.round((congestion / 100) * capacity);
    const waitTime = Math.round((congestion / 100) * 18); // max 18 min wait

    let status = 'green';
    if (congestion >= 80) status = 'red';
    else if (congestion >= 50) status = 'amber';

    return {
      ...gate,
      congestion,
      occupancy,
      capacity,
      waitTime,
      status,
      locked: false,
      redirect: false,
    };
  });
}

/**
 * Generates heatmap weight points from gate data for Google Maps HeatmapLayer.
 * Scatters weighted points around each gate position.
 * NOTE: Uses Math.random — only call on server-side or accept non-determinism client-side.
 * @param {Array} gateData - output of generateCrowdData()
 * @returns {Array} { lat, lng, weight }
 */
export function toHeatmapPoints(gateData) {
  return gateData.flatMap((gate) => {
    const pointCount = Math.ceil((gate.congestion / 100) * 15); // up to 15 points per gate
    return Array.from({ length: pointCount }, () => ({
      lat: gate.lat + (Math.random() - 0.5) * 0.003,
      lng: gate.lng + (Math.random() - 0.5) * 0.003,
      weight: gate.congestion / 100,
    }));
  });
}
