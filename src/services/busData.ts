/**
 * AMTAB Bari bus data.
 * Key bus stops and lines for multimodal routing.
 */
import { BusStop } from '../types';

// Major AMTAB bus stops in Bari with line information
export const AMTAB_STOPS: BusStop[] = [
  // ── Centro / Stazione ──
  { id: 'st01', name: 'Stazione Centrale (Piazza Aldo Moro)', lat: 41.1175, lon: 16.8697, lines: ['1', '2', '3', '5', '6', '10', '12', '16', '27'] },
  { id: 'st02', name: 'Piazza Umberto I', lat: 41.1249, lon: 16.8699, lines: ['1', '2', '5', '12'] },
  { id: 'st03', name: 'Piazza Garibaldi', lat: 41.1263, lon: 16.8650, lines: ['2', '5', '12'] },
  { id: 'st04', name: 'Corso Cavour / Teatro Petruzzelli', lat: 41.1258, lon: 16.8720, lines: ['1', '12'] },
  { id: 'st05', name: 'Via Sparano / Piazza Moro', lat: 41.1210, lon: 16.8690, lines: ['2', '5', '6'] },

  // ── Libertà / Madonnella ──
  { id: 'st06', name: 'Largo Ciaia (Libertà)', lat: 41.1270, lon: 16.8620, lines: ['2', '5'] },
  { id: 'st07', name: 'Via Crisanzio / Libertà', lat: 41.1260, lon: 16.8595, lines: ['2', '10'] },
  { id: 'st08', name: 'Lungomare N. Sauro (Madonnella)', lat: 41.1215, lon: 16.8830, lines: ['12', '27'] },

  // ── Carrassi / Picone / San Pasquale ──
  { id: 'st09', name: 'Via Re David (Picone)', lat: 41.1120, lon: 16.8620, lines: ['6', '10'] },
  { id: 'st10', name: 'Via Fanelli (Carrassi)', lat: 41.1050, lon: 16.8600, lines: ['6', '16'] },
  { id: 'st11', name: 'Via Omodeo (San Pasquale)', lat: 41.1100, lon: 16.8740, lines: ['3', '10'] },

  // ── Poggiofranco ──
  { id: 'st12', name: 'Viale della Repubblica (Poggiofranco)', lat: 41.1020, lon: 16.8510, lines: ['6', '16'] },
  { id: 'st13', name: 'Ospedale Di Venere', lat: 41.0860, lon: 16.8480, lines: ['6'] },

  // ── San Paolo ──
  { id: 'st14', name: 'Via Napoli (San Paolo)', lat: 41.1095, lon: 16.8410, lines: ['5', '10'] },
  { id: 'st15', name: 'Piazza San Paolo', lat: 41.1120, lon: 16.8360, lines: ['5'] },

  // ── Japigia ──
  { id: 'st16', name: 'Via Gentile (Japigia)', lat: 41.0980, lon: 16.8870, lines: ['3', '12'] },
  { id: 'st17', name: 'Viale Japigia', lat: 41.0950, lon: 16.8900, lines: ['3'] },

  // ── San Girolamo / Fesca ──
  { id: 'st18', name: 'Via San Girolamo', lat: 41.1310, lon: 16.8350, lines: ['2'] },
  { id: 'st19', name: 'Fesca', lat: 41.1380, lon: 16.8300, lines: ['2'] },

  // ── Palese / Santo Spirito ──
  { id: 'st20', name: 'Via Modugno (Palese)', lat: 41.1440, lon: 16.7900, lines: ['1'] },
  { id: 'st21', name: 'Palese Centro', lat: 41.1460, lon: 16.7880, lines: ['1'] },
  { id: 'st22', name: 'Santo Spirito Centro', lat: 41.1530, lon: 16.7770, lines: ['1'] },

  // ── Carbonara / Ceglie / Loseto ──
  { id: 'st23', name: 'Carbonara Centro', lat: 41.0740, lon: 16.9200, lines: ['16'] },
  { id: 'st24', name: 'Ceglie del Campo', lat: 41.0830, lon: 16.9280, lines: ['16'] },
  { id: 'st25', name: 'Loseto', lat: 41.0640, lon: 16.8950, lines: ['16'] },

  // ── Torre a Mare ──
  { id: 'st26', name: 'Torre a Mare', lat: 41.0570, lon: 16.9230, lines: ['12'] },

  // ── Mungivacca ──
  { id: 'st27', name: 'Mungivacca', lat: 41.0920, lon: 16.8770, lines: ['3', '6'] },
];

// Bus line definitions with approximate colors
export const AMTAB_LINES: Record<string, { name: string; color: string; description: string }> = {
  '1':  { name: 'Linea 1',  color: '#e53e3e', description: 'Palese / Santo Spirito ↔ Stazione Centrale' },
  '2':  { name: 'Linea 2',  color: '#3182ce', description: 'Fesca / S. Girolamo ↔ Centro ↔ Libertà' },
  '3':  { name: 'Linea 3',  color: '#38a169', description: 'Japigia ↔ Stazione ↔ Mungivacca' },
  '5':  { name: 'Linea 5',  color: '#d69e2e', description: 'San Paolo ↔ Centro' },
  '6':  { name: 'Linea 6',  color: '#805ad5', description: 'Poggiofranco ↔ Stazione ↔ Carrassi' },
  '10': { name: 'Linea 10', color: '#dd6b20', description: 'San Pasquale ↔ Picone ↔ San Paolo' },
  '12': { name: 'Linea 12', color: '#e53e3e', description: 'Circolare: Centro ↔ Lungomare ↔ Japigia ↔ Torre a Mare' },
  '16': { name: 'Linea 16', color: '#319795', description: 'Carbonara / Loseto ↔ Stazione ↔ Poggiofranco' },
  '27': { name: 'Linea 27', color: '#b83280', description: 'Stazione ↔ Madonnella ↔ Lungomare' },
};

/**
 * Find bus stops near a given location.
 */
export function findNearbyStops(lat: number, lon: number, radiusKm: number = 0.8): BusStop[] {
  const radiusDeg = radiusKm / 111; // rough conversion
  return AMTAB_STOPS.filter(stop => {
    const dlat = stop.lat - lat;
    const dlon = stop.lon - lon;
    return Math.sqrt(dlat * dlat + dlon * dlon) <= radiusDeg;
  }).sort((a, b) => {
    const dA = Math.sqrt((a.lat - lat) ** 2 + (a.lon - lon) ** 2);
    const dB = Math.sqrt((b.lat - lat) ** 2 + (b.lon - lon) ** 2);
    return dA - dB;
  });
}

/**
 * Find common bus lines between two sets of stops.
 */
export function findCommonLines(stopsA: BusStop[], stopsB: BusStop[]): {
  line: string;
  fromStop: BusStop;
  toStop: BusStop;
}[] {
  const results: { line: string; fromStop: BusStop; toStop: BusStop }[] = [];
  const seen = new Set<string>();

  for (const a of stopsA) {
    for (const b of stopsB) {
      if (a.id === b.id) continue;
      for (const line of a.lines) {
        if (b.lines.includes(line) && !seen.has(line)) {
          seen.add(line);
          results.push({ line, fromStop: a, toStop: b });
        }
      }
    }
  }

  return results;
}

/**
 * Estimate bus travel time between two stops (rough estimate).
 */
export function estimateBusDuration(fromStop: BusStop, toStop: BusStop): number {
  const dlat = fromStop.lat - toStop.lat;
  const dlon = fromStop.lon - toStop.lon;
  const distKm = Math.sqrt(dlat * dlat + dlon * dlon) * 111;
  // Average bus speed in urban area: ~15 km/h + 30sec per stop
  return (distKm / 15) * 3600 + 120; // seconds, plus wait time
}
