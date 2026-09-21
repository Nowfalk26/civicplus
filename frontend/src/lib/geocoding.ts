import { TN_DISTRICTS } from './utils';

export interface ReverseGeocodeResult {
  success: boolean;
  lat: number;
  lng: number;
  formattedAddress: string;
  road?: string;
  locality?: string;
  district?: string;
  postcode?: string;
  error?: string;
}

// In-memory cache for reverse geocoding to prevent repetitive queries for exact points
const geocodeCache = new Map<string, ReverseGeocodeResult>();

/**
 * Normalizes an arbitrary district/county string from geocoding providers to the standard Tamil Nadu district list
 */
export function matchTamilNaduDistrict(rawText?: string): string | undefined {
  if (!rawText) return undefined;
  const clean = rawText.toLowerCase().replace(/district|taluk|division/gi, '').trim();

  // Exact or partial match in TN_DISTRICTS
  for (const dist of TN_DISTRICTS) {
    const dLower = dist.toLowerCase();
    if (clean === dLower || clean.includes(dLower) || dLower.includes(clean)) {
      return dist;
    }
  }
  return undefined;
}

/**
 * Real Reverse Geocoding using OpenStreetMap Nominatim with caching and error handling
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number,
  signal?: AbortSignal
): Promise<ReverseGeocodeResult> {
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    // 1. Query OpenStreetMap Nominatim
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivicsPlus-TN-Municipal/2.0 (Tamil Nadu Civic Redressal)',
      },
    });

    if (!res.ok) {
      throw new Error(`Geocoding service returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.address) {
      throw new Error('No address details returned');
    }

    const addr = data.address;
    const road = addr.road || addr.street || addr.neighbourhood || addr.pedestrian || '';
    const locality = addr.suburb || addr.village || addr.town || addr.hamlet || addr.quarter || addr.city_district || '';
    const county = addr.county || addr.state_district || addr.city || '';
    const postcode = addr.postcode || '';
    const state = addr.state || 'Tamil Nadu';

    // Determine district from raw address components
    const district =
      matchTamilNaduDistrict(addr.state_district) ||
      matchTamilNaduDistrict(addr.county) ||
      matchTamilNaduDistrict(addr.city) ||
      matchTamilNaduDistrict(locality) ||
      (county ? county.replace(/district/i, '').trim() : undefined);

    // Build clear human-readable street/area address
    const parts = [road, locality, county, district, state, postcode].filter(Boolean);
    // Deduplicate consecutive identical items
    const uniqueParts = parts.filter((item, index) => parts.indexOf(item) === index);
    const formattedAddress = uniqueParts.join(', ') || `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    const result: ReverseGeocodeResult = {
      success: true,
      lat,
      lng,
      formattedAddress,
      road: road || undefined,
      locality: locality || undefined,
      district: district || undefined,
      postcode: postcode || undefined,
    };

    geocodeCache.set(cacheKey, result);
    return result;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err; // Let caller ignore aborted queries
    }

    return {
      success: false,
      lat,
      lng,
      formattedAddress: '',
      error: 'Unable to determine the address for this location. Please try again or select another location.',
    };
  }
}
