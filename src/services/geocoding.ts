/**
 * Geocoding service using Nominatim (OpenStreetMap).
 * Searches for places in Bari, Italy with disambiguation.
 */
import { GeoLocation } from '../types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// Bari bounding box (SW corner, NE corner)
const BARI_VIEWBOX = '16.72,41.02,17.08,41.17';
const BARI_LAT_MIN = 41.02;
const BARI_LAT_MAX = 41.17;
const BARI_LON_MIN = 16.72;
const BARI_LON_MAX = 17.08;

function isInBari(lat: number, lon: number): boolean {
  return lat >= BARI_LAT_MIN && lat <= BARI_LAT_MAX &&
         lon >= BARI_LON_MIN && lon <= BARI_LON_MAX;
}

/**
 * Search for locations in Bari matching the query.
 * Returns up to `limit` results with disambiguation.
 */
export async function geocodeSearch(query: string, limit: number = 5): Promise<GeoLocation[]> {
  if (!query || query.trim().length < 2) return [];

  const searchQuery = query.includes('Bari') ? query : `${query}, Bari`;

  const params = new URLSearchParams({
    q: searchQuery,
    format: 'json',
    addressdetails: '1',
    limit: String(limit + 3), // request extra to filter
    viewbox: BARI_VIEWBOX,
    bounded: '1',
    'accept-language': 'it',
    countrycodes: 'it',
  });

  try {
    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        'User-Agent': 'ImOnBus-SafeStep/1.0 (university-project)',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status}`);
    }

    const results = await response.json();

    const locations: GeoLocation[] = [];
    for (const r of results) {
      const lat = parseFloat(r.lat);
      const lon = parseFloat(r.lon);

      if (!isInBari(lat, lon)) continue;

      // Build a clean display name
      const addr = r.address || {};
      const parts: string[] = [];
      if (r.name && !r.display_name.startsWith(r.name)) {
        parts.push(r.name);
      }
      // Short display name
      const shortName = r.name || addr.road || addr.suburb || query;
      const displayParts = [
        r.name,
        addr.road && addr.road !== r.name ? addr.road : null,
        addr.house_number,
        addr.suburb || addr.neighbourhood,
      ].filter(Boolean);

      locations.push({
        lat,
        lon,
        name: shortName,
        displayName: displayParts.join(', ') || r.display_name.split(',').slice(0, 3).join(','),
      });

      if (locations.length >= limit) break;
    }

    return locations;
  } catch (err) {
    console.error('Geocoding error:', err);
    return [];
  }
}

/**
 * Reverse geocode: get place name from coordinates.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'json',
      'accept-language': 'it',
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { 'User-Agent': 'ImOnBus-SafeStep/1.0 (university-project)' },
    });

    const data = await response.json();
    return data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}
