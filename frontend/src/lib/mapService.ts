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
}

// 1. Search real locations and addresses in Tamil Nadu / India
export async function searchLocation(query: string): Promise<LocationSearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const encoded = encodeURIComponent(query.trim());
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=in&limit=5&addressdetails=1`;
    
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en,ta',
        'User-Agent': 'CivicsPlus-TamilNadu-Civic-Portal/1.0',
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      // Create clean primary name (first part of display_name)
      const parts = (item.display_name || '').split(',');
      const primaryName = parts[0]?.trim() || item.name || 'Location';
      const secondaryName = parts.slice(1, 4).join(',').trim();

      return {
        id: String(item.place_id || item.osm_id || `${item.lat}-${item.lon}`),
        name: primaryName,
        displayName: secondaryName ? `${primaryName} (${secondaryName})` : primaryName,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      };
    });
  } catch (err) {
    console.warn('Geocoding search failed:', err);
    return [];
  }
}

// 2. Fetch real driving route from OSRM
export async function fetchRoute(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    const distanceMeters = route.distance || 0;
    const distanceKm = (distanceMeters / 1000).toFixed(1) + ' km';

    const durationSeconds = route.duration || 0;
    let durationFormatted = '';
    const mins = Math.round(durationSeconds / 60);
    if (mins < 60) {
      durationFormatted = `${mins} min${mins === 1 ? '' : 's'}`;
    } else {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      durationFormatted = `${hrs} hr${hrs === 1 ? '' : 's'}${remMins > 0 ? ` ${remMins} min` : ''}`;
    }

    // Convert GeoJSON [lon, lat] coordinates to Leaflet [lat, lon]
    const coordinates: [number, number][] = (route.geometry?.coordinates || []).map(
      ([lon, lat]: [number, number]) => [lat, lon]
    );

    return {
      success: true,
      distanceMeters,
      distanceKm,
      durationSeconds,
      durationFormatted,
      coordinates,
      summary: route.legs?.[0]?.summary || undefined,
    };
  } catch (err) {
    console.error('OSRM route fetch failed:', err);
    return null;
  }
}
