/**
 * Real Map Services for Civic Portal:
 * - Geocoding via OpenStreetMap Nominatim
 * - Driving directions and route calculation via OSRM
 *
 * Strictly NO fake coordinates, NO fake lines, NO simulated distances.
 * Strictly client-side: NO permanent storage of search or route history.
 */

export interface LocationSearchResult {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
}

export interface RouteResult {
  success: boolean;
  distanceMeters: number;
  distanceKm: string;
  durationSeconds: number;
  durationFormatted: string;
  coordinates: [number, number][]; // [lat, lng] array formatted for Leaflet polyline
  summary?: string;
  errorType?: 'INVALID_COORDS' | 'NO_ROUTE' | 'SERVICE_UNAVAILABLE' | 'NETWORK_ERROR' | 'UNKNOWN';
  errorMessage?: string;
}

// Coordinate validation: -90 <= lat <= 90, -180 <= lng <= 180
export function isValidLatLng(lat: any, lng: any): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// 1. Search real locations and addresses in Tamil Nadu / India
export async function searchLocation(query: string): Promise<LocationSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const encoded = encodeURIComponent(query.trim());
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=in&limit=6&addressdetails=1`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en,ta',
        'User-Agent': 'CivicsPlus-TamilNadu-Civic-Portal/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .map((item: any) => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (!isValidLatLng(lat, lng)) return null;

        const parts = (item.display_name || '').split(',');
        const primaryName = parts[0]?.trim() || item.name || 'Location';
        const secondaryName = parts.slice(1, 4).join(',').trim();

        return {
          id: String(item.place_id || item.osm_id || `${lat}-${lng}`),
          name: primaryName,
          displayName: secondaryName ? `${primaryName} (${secondaryName})` : primaryName,
          lat,
          lng,
        };
      })
      .filter((item): item is LocationSearchResult => item !== null);
  } catch (err) {
    if (import.meta.env?.DEV) {
      console.warn('[Geocoding Warning] Search request failed:', err);
    }
    return [];
  }
}

// 2. Fetch real driving route with dual-provider fallback
export async function fetchRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteResult> {
  // Step A: Validate input coordinates
  if (!isValidLatLng(fromLat, fromLng) || !isValidLatLng(toLat, toLng)) {
    if (import.meta.env?.DEV) {
      console.error('[Routing Error] Invalid coordinates supplied:', { from: [fromLat, fromLng], to: [toLat, toLng] });
    }
    return {
      success: false,
      distanceMeters: 0,
      distanceKm: '0 km',
      durationSeconds: 0,
      durationFormatted: '0 mins',
      coordinates: [],
      errorType: 'INVALID_COORDS',
      errorMessage: 'Please select valid From and To coordinates.',
    };
  }

  // Two independent reliable routing endpoints
  const endpoints = [
    `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`,
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`,
  ];

  let lastErrorType: RouteResult['errorType'] = 'UNKNOWN';
  let lastErrorMessage = 'Unable to calculate driving route.';

  for (let i = 0; i < endpoints.length; i++) {
    const url = endpoints[i];
    const isPrimary = i === 0;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7500);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 429 || res.status >= 500) {
          lastErrorType = 'SERVICE_UNAVAILABLE';
          lastErrorMessage = 'Route service is temporarily busy. Trying alternative provider...';
          continue; // Try secondary endpoint
        }
        lastErrorType = 'UNKNOWN';
        continue;
      }

      const data = await res.json();

      if (data.code === 'NoRoute' || !data.routes || data.routes.length === 0) {
        lastErrorType = 'NO_ROUTE';
        lastErrorMessage = 'No drivable route was found between these locations.';
        // If impossible road connection, secondary will also fail, but try anyway
        continue;
      }

      const route = data.routes[0];
      const distanceMeters = Math.round(route.distance || 0);
      const distanceKm = (distanceMeters / 1000).toFixed(1) + ' km';

      const durationSeconds = Math.round(route.duration || 0);
      let durationFormatted = '';
      const mins = Math.round(durationSeconds / 60);
      if (mins < 60) {
        durationFormatted = `${mins} min${mins === 1 ? '' : 's'}`;
      } else {
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        durationFormatted = `${hrs} hr${hrs === 1 ? '' : 's'}${remMins > 0 ? ` ${remMins} min` : ''}`;
      }

      // GeoJSON [lon, lat] -> Leaflet [lat, lon]
      const rawCoords = route.geometry?.coordinates || [];
      const coordinates: [number, number][] = rawCoords
        .map(([lon, lat]: [number, number]) => [lat, lon] as [number, number])
        .filter(([lat, lon]: [number, number]) => isValidLatLng(lat, lon));

      if (coordinates.length < 2) {
        lastErrorType = 'NO_ROUTE';
        lastErrorMessage = 'No valid road geometry found.';
        continue;
      }

      if (import.meta.env?.DEV) {
        console.log(`[Routing Success] Provider ${isPrimary ? 'Primary' : 'Fallback'} returned ${coordinates.length} waypoints, ${distanceKm}, ${durationFormatted}`);
      }

      return {
        success: true,
        distanceMeters,
        distanceKm,
        durationSeconds,
        durationFormatted,
        coordinates,
        summary: route.legs?.[0]?.summary || undefined,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        lastErrorType = 'NETWORK_ERROR';
        lastErrorMessage = 'Routing request timed out. Please check your network connection.';
      } else {
        lastErrorType = 'NETWORK_ERROR';
        lastErrorMessage = 'Unable to connect to the route service. Check your internet connection.';
      }

      if (import.meta.env?.DEV) {
        console.warn(`[Routing Warning] Endpoint ${i + 1} failed:`, err.message);
      }
    }
  }

  // If both endpoints failed, return structured diagnostic result
  return {
    success: false,
    distanceMeters: 0,
    distanceKm: '0 km',
    durationSeconds: 0,
    durationFormatted: '0 mins',
    coordinates: [],
    errorType: lastErrorType,
    errorMessage: lastErrorMessage,
  };
}

// 3. Precise Point-to-Polyline Corridor Distance (in Meters)
export function getDistanceFromPointToPolylineMeters(
  point: { lat: number; lng: number },
  polyline: [number, number][]
): number {
  if (!polyline || polyline.length === 0) return Infinity;
  if (polyline.length === 1) {
    // Single point fallback using Haversine
    const rad = Math.PI / 180;
    const dLat = (polyline[0][0] - point.lat) * rad;
    const dLng = (polyline[0][1] - point.lng) * rad;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point.lat * rad) *
        Math.cos(polyline[0][0] * rad) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371000 * c;
  }

  let minDistance = Infinity;
  const rad = Math.PI / 180;
  const cosLat = Math.cos(point.lat * rad);
  const mPerDegLat = 111139; // meters per degree latitude
  const mPerDegLng = 111139 * cosLat; // meters per degree longitude

  for (let i = 0; i < polyline.length - 1; i++) {
    const [lat1, lng1] = polyline[i];
    const [lat2, lng2] = polyline[i + 1];

    // Local coordinates in meters relative to point 1
    const dx = (lng2 - lng1) * mPerDegLng;
    const dy = (lat2 - lat1) * mPerDegLat;

    const px = (point.lng - lng1) * mPerDegLng;
    const py = (point.lat - lat1) * mPerDegLat;

    const segLenSq = dx * dx + dy * dy;
    let dist = 0;
    if (segLenSq === 0) {
      dist = Math.hypot(px, py);
    } else {
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / segLenSq));
      dist = Math.hypot(px - t * dx, py - t * dy);
    }

    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance;
}

export interface RouteComplaintMatch {
  complaint: any;
  distanceMeters: number;
  distanceFormatted: string;
}

// 4. Filter Civic Complaints inside the Route Geographic Corridor
export function filterReportsAlongRoute(
  complaints: any[],
  polyline: [number, number][],
  corridorMeters: number = 500
): RouteComplaintMatch[] {
  if (!polyline || polyline.length === 0 || !complaints || complaints.length === 0) {
    return [];
  }

  const matches: RouteComplaintMatch[] = [];

  for (const c of complaints) {
    if (c.latitude === undefined || c.longitude === undefined || c.latitude === null || c.longitude === null) {
      continue;
    }

    const lat = Number(c.latitude);
    const lng = Number(c.longitude);
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) continue;

    const dist = getDistanceFromPointToPolylineMeters({ lat, lng }, polyline);

    if (dist <= corridorMeters) {
      const distanceFormatted =
        dist < 1000
          ? `${Math.round(dist)}m from route`
          : `${(dist / 1000).toFixed(1)}km from route`;

      matches.push({
        complaint: c,
        distanceMeters: Math.round(dist),
        distanceFormatted,
      });
    }
  }

  // Sort by closest to route line
  return matches.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

