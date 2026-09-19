import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { STATUS_INFO, CATEGORY_INFO } from '../lib/utils';
import { isValidLatLng } from '../lib/mapService';

export interface MapComplaint {
  id: string;
  complaintId: string;
  category: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  status: string;
  priority?: string;
  photos?: { url: string; type: string }[];
}

export interface UserLiveLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
}

export interface MapPlacePoint {
  lat: number;
  lng: number;
  name: string;
}

interface LeafletMapProps {
  complaints?: MapComplaint[];
  center?: [number, number];
  zoom?: number;
  interactivePicker?: boolean;
  selectedCoord?: [number, number] | null;
  onLocationSelect?: (coord: { lat: number; lng: number }) => void;
  className?: string;
  height?: string;
  userLocation?: UserLiveLocation | null;
  flyToUserLocationTrigger?: number;
  onUserPanned?: () => void;
  mapType?: 'streets' | 'satellite';
  routeGeometry?: [number, number][] | null;
  fromLocation?: MapPlacePoint | null;
  destinationLocation?: MapPlacePoint | null;
  fitRouteTrigger?: number;
  onComplaintSelect?: (complaint: MapComplaint) => void;
  selectedComplaintId?: string | null;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  complaints = [],
  center = [8.7139, 77.7567], // Default to Tirunelveli, Tamil Nadu
  zoom = 12,
  interactivePicker = false,
  selectedCoord = null,
  onLocationSelect,
  className = '',
  height = '100%',
  userLocation = null,
  flyToUserLocationTrigger = 0,
  onUserPanned,
  mapType = 'streets',
  routeGeometry = null,
  fromLocation = null,
  destinationLocation = null,
  fitRouteTrigger = 0,
  onComplaintSelect,
  selectedComplaintId = null,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLabelsLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const complaintMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  // Initialize map safely with container validation & ResizeObserver
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Prevent Leaflet error "Map container is already initialized"
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id;
    }
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        console.warn('Map cleanup notice:', e);
      }
      mapInstanceRef.current = null;
    }

    const safeCenter: [number, number] =
      center && isValidLatLng(center[0], center[1]) ? center : [8.7139, 77.7567];

    let map: L.Map;
    try {
      map = L.map(container, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView(safeCenter, zoom);
    } catch (err) {
      console.error('Error initializing Leaflet map:', err);
      return;
    }

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    const userLocationLayer = L.layerGroup().addTo(map);
    userLocationLayerRef.current = userLocationLayer;

    const routeLayer = L.layerGroup().addTo(map);
    routeLayerRef.current = routeLayer;

    mapInstanceRef.current = map;

    // Track user drag to prevent forcing center if user panned away
    map.on('dragstart', () => {
      if (onUserPanned) {
        onUserPanned();
      }
    });

    // Click handler for location picker
    if (interactivePicker && onLocationSelect) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (isValidLatLng(lat, lng)) {
          onLocationSelect({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
        }
      });
    }

    // Invalidate size on container layout changes (crucial for mobile orientation, drawer expansion, and flex layouts)
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      resizeObserver = new ResizeObserver(() => {
        try {
          map.invalidateSize();
        } catch (e) {
          // Ignore
        }
      });
      resizeObserver.observe(container);
    }

    // Secondary timers to guarantee full rendering after CSS animations / paint
    const t1 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 150);
    const t2 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      try {
        map.remove();
      } catch (e) {
        console.warn('Map removal error:', e);
      }
      mapInstanceRef.current = null;
      if (container && (container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }
    };
  }, []);

  // Update Tile Layer dynamically on mapType switch without page reload
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    try {
      if (baseTileLayerRef.current) {
        map.removeLayer(baseTileLayerRef.current);
        baseTileLayerRef.current = null;
      }
      if (satelliteLabelsLayerRef.current) {
        map.removeLayer(satelliteLabelsLayerRef.current);
        satelliteLabelsLayerRef.current = null;
      }

      if (mapType === 'satellite') {
        // Real ESRI World Imagery (High-Resolution Satellite)
        const satTile = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution:
              'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 19,
          }
        );
        satTile.on('tileerror', () => {
          // Soft error handler
        });
        satTile.addTo(map);
        baseTileLayerRef.current = satTile;

        // Real Reference Labels & Borders Layer
        const labelTile = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
          }
        );
        labelTile.on('tileerror', () => {});
        labelTile.addTo(map);
        satelliteLabelsLayerRef.current = labelTile;
      } else {
        // Real Standard OpenStreetMap Street Tiles
        const streetTile = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }
        );
        streetTile.on('tileerror', () => {});
        streetTile.addTo(map);
        baseTileLayerRef.current = streetTile;
      }
    } catch (err) {
      console.warn('Error updating map tile layers:', err);
    }
  }, [mapType]);

  // Update center & zoom if changed
  useEffect(() => {
    if (mapInstanceRef.current && center && isValidLatLng(center[0], center[1])) {
      try {
        mapInstanceRef.current.setView(center, zoom);
      } catch (err) {
        console.warn('Error setting map view:', err);
      }
    }
  }, [center[0], center[1], zoom]);

  // Update complaints markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    try {
      markersLayerRef.current.clearLayers();
      complaintMarkersRef.current.clear();

      complaints.forEach((c) => {
        if (!c.latitude || !c.longitude || !isValidLatLng(c.latitude, c.longitude)) return;

        const status = STATUS_INFO[c.status] || STATUS_INFO.SUBMITTED;
        const cat = CATEGORY_INFO[c.category] || CATEGORY_INFO.ROAD_DAMAGE;
        const color = status.pinColor;

        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="
              width: 32px;
              height: 32px;
              background-color: ${color};
              border: 2px solid white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              cursor: pointer;
            ">
              <span class="material-symbols-outlined" style="
                transform: rotate(45deg);
                font-size: 16px;
                color: white;
              ">${cat.icon}</span>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });

        const marker = L.marker([c.latitude, c.longitude], { icon: customIcon });

        const photoHtml =
          c.photos && c.photos.length > 0
            ? `<img src="${c.photos[0].url}" style="width:100%; height:80px; object-fit:cover; border-radius:8px; margin-bottom:8px;" />`
            : '';

        const popupContent = `
          <div style="font-family: inherit; font-size: 13px; max-width: 220px; line-height: 1.4;">
            ${photoHtml}
            <div style="font-weight: 700; color: #0b1c30; font-size: 14px; margin-bottom: 2px;">
              ${c.complaintId}
            </div>
            <div style="font-size: 11px; font-weight: 600; color: ${color}; text-transform: uppercase; margin-bottom: 6px;">
              ● ${status.labelEn} (${cat.labelEn})
            </div>
            <div style="color: #434655; font-size: 12px; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${c.description}
            </div>
            <div style="font-size: 11px; color: #737686; margin-bottom: 8px;">
              📍 ${c.location}
            </div>
            <a href="/citizen/complaints/${c.id}" style="
              display: block;
              text-align: center;
              background-color: #004ac6;
              color: white;
              padding: 6px 12px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
              font-size: 12px;
            ">
              View Case Details
            </a>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('click', () => {
          if (onComplaintSelect) {
            onComplaintSelect(c);
          }
        });

        complaintMarkersRef.current.set(c.id, marker);
        markersLayerRef.current!.addLayer(marker);
      });
    } catch (err) {
      console.warn('Error updating complaint markers:', err);
    }
  }, [complaints, onComplaintSelect]);

  // Handle programmatic selection / panning to a complaint
  useEffect(() => {
    if (!selectedComplaintId || !mapInstanceRef.current) return;
    try {
      const marker = complaintMarkersRef.current.get(selectedComplaintId);
      if (marker) {
        marker.openPopup();
        mapInstanceRef.current.panTo(marker.getLatLng(), { animate: true });
      }
    } catch (err) {
      console.warn('Error focusing on complaint marker:', err);
    }
  }, [selectedComplaintId]);

  // Update interactive location picker marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    try {
      if (
        selectedCoord &&
        typeof selectedCoord[0] === 'number' &&
        typeof selectedCoord[1] === 'number' &&
        isValidLatLng(selectedCoord[0], selectedCoord[1])
      ) {
        const pickerIcon = L.divIcon({
          className: 'picker-marker',
          html: `
            <div style="
              width: 38px;
              height: 38px;
              background: radial-gradient(circle, #2563eb 40%, rgba(37, 99, 235, 0.3) 100%);
              border: 3px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(37,99,235,0.6);
              animation: pulse 2s infinite;
            ">
              <span class="material-symbols-outlined" style="color: white; font-size: 20px;">my_location</span>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        if (pickerMarkerRef.current) {
          pickerMarkerRef.current.setLatLng(selectedCoord);
        } else {
          pickerMarkerRef.current = L.marker(selectedCoord, { icon: pickerIcon }).addTo(
            mapInstanceRef.current
          );
        }
      } else if (pickerMarkerRef.current) {
        pickerMarkerRef.current.remove();
        pickerMarkerRef.current = null;
      }
    } catch (err) {
      console.warn('Error updating picker marker:', err);
    }
  }, [selectedCoord]);

  // Update real user live location marker & accuracy circle
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocationLayerRef.current) return;

    try {
      userLocationLayerRef.current.clearLayers();

      if (
        userLocation &&
        typeof userLocation.lat === 'number' &&
        typeof userLocation.lng === 'number' &&
        isValidLatLng(userLocation.lat, userLocation.lng)
      ) {
        // 1. Accuracy Circle
        if (userLocation.accuracy && userLocation.accuracy > 5 && userLocation.accuracy < 100000) {
          const accuracyCircle = L.circle([userLocation.lat, userLocation.lng], {
            radius: userLocation.accuracy,
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
            weight: 1.5,
            dashArray: '4, 4',
          });
          userLocationLayerRef.current.addLayer(accuracyCircle);
        }

        // 2. Real Live Pin with Pulsing Beacon and "You are here" label
        const livePinIcon = L.divIcon({
          className: 'user-live-location-container',
          html: `
            <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
              <div class="user-live-location-pin" style="
                width: 20px;
                height: 20px;
                background: #2563eb;
                border: 3.5px solid white;
                border-radius: 50%;
                box-shadow: 0 0 14px rgba(37, 99, 235, 0.9), 0 2px 6px rgba(0,0,0,0.35);
              "></div>
              <div style="
                position: absolute;
                top: -24px;
                background: #0b1c30;
                color: white;
                font-size: 11px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 9999px;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.25);
                pointer-events: none;
                display: flex;
                align-items: center;
                gap: 4px;
              ">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #22c55e;"></span>
                <span>You are here</span>
              </div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          popupAnchor: [0, -22],
        });

        const userMarker = L.marker([userLocation.lat, userLocation.lng], {
          icon: livePinIcon,
          zIndexOffset: 1000,
        });

        const accuracyNotice = userLocation.accuracy
          ? `<div style="font-size: 11px; color: #2563eb; font-weight: 600; margin-bottom: 4px;">Accuracy: ~${Math.round(userLocation.accuracy)} meters</div>`
          : '';

        const popupHtml = `
          <div style="font-family: inherit; font-size: 13px; min-width: 190px; line-height: 1.4;">
            <div style="font-weight: 700; color: #0b1c30; font-size: 14px; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
              <span>📍</span> <span>You are here</span>
            </div>
            <div style="font-size: 11px; color: #16a34a; font-weight: 600; margin-bottom: 4px;">
              ● Real Device Location Verified
            </div>
            ${accuracyNotice}
            <div style="font-size: 11px; color: #737686; font-family: monospace; background: #f1f5f9; padding: 4px 6px; border-radius: 6px;">
              ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}
            </div>
          </div>
        `;

        userMarker.bindPopup(popupHtml);
        userLocationLayerRef.current.addLayer(userMarker);
      }
    } catch (err) {
      console.warn('Error updating user location marker:', err);
    }
  }, [userLocation]);

  // Smooth flyTo animation when flyToUserLocationTrigger changes
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    if (flyToUserLocationTrigger > 0 && isValidLatLng(userLocation.lat, userLocation.lng)) {
      try {
        mapInstanceRef.current.flyTo(
          [userLocation.lat, userLocation.lng],
          Math.max(mapInstanceRef.current.getZoom(), 15),
          {
            animate: true,
            duration: 1.2,
          }
        );
      } catch (err) {
        console.warn('Error flying to user location:', err);
      }
    }
  }, [flyToUserLocationTrigger]);

  // Update Route Polyline & Destination/Origin Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;

    try {
      routeLayerRef.current.clearLayers();

      // 1. Draw Real Road Route Polyline if present
      if (routeGeometry && routeGeometry.length > 0) {
        const validPoints = routeGeometry.filter((p) => isValidLatLng(p[0], p[1]));
        if (validPoints.length > 1) {
          const casing = L.polyline(validPoints, {
            color: '#1e3a8a',
            weight: 8,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          });
          const line = L.polyline(validPoints, {
            color: '#3b82f6',
            weight: 5,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
          });
          routeLayerRef.current.addLayer(casing);
          routeLayerRef.current.addLayer(line);
        }
      }

      // 2. From / Origin Marker
      if (
        fromLocation &&
        isValidLatLng(fromLocation.lat, fromLocation.lng) &&
        (!userLocation ||
          Math.abs(fromLocation.lat - userLocation.lat) > 0.0001 ||
          Math.abs(fromLocation.lng - userLocation.lng) > 0.0001)
      ) {
        const fromIcon = L.divIcon({
          className: 'user-live-location-container',
          html: `
            <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
              <div style="
                width: 28px;
                height: 28px;
                background-color: #16a34a;
                border: 2px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 10px rgba(22,163,74,0.5);
              ">
                <span class="material-symbols-outlined" style="transform: rotate(45deg); font-size: 16px; color: white;">trip_origin</span>
              </div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
        });
        const originMarker = L.marker([fromLocation.lat, fromLocation.lng], {
          icon: fromIcon,
          zIndexOffset: 900,
        });
        originMarker.bindPopup(`<strong>📍 Origin:</strong><br/>${fromLocation.name}`);
        routeLayerRef.current.addLayer(originMarker);
      }

      // 3. Destination Marker (Red pin with flag)
      if (destinationLocation && isValidLatLng(destinationLocation.lat, destinationLocation.lng)) {
        const destIcon = L.divIcon({
          className: 'user-live-location-container',
          html: `
            <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
              <div style="
                width: 32px;
                height: 32px;
                background-color: #dc2626;
                border: 2px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(220,38,38,0.55);
              ">
                <span class="material-symbols-outlined" style="transform: rotate(45deg); font-size: 18px; color: white;">flag</span>
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40],
        });
        const destMarker = L.marker([destinationLocation.lat, destinationLocation.lng], {
          icon: destIcon,
          zIndexOffset: 950,
        });
        destMarker.bindPopup(`<strong>🏁 Destination:</strong><br/>${destinationLocation.name}`);
        routeLayerRef.current.addLayer(destMarker);
      }
    } catch (err) {
      console.warn('Error updating route layer elements:', err);
    }
  }, [routeGeometry, fromLocation, destinationLocation, userLocation]);

  // Fit bounds when fitRouteTrigger fires
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (fitRouteTrigger && fitRouteTrigger > 0) {
      try {
        const points: [number, number][] = [];
        if (routeGeometry && routeGeometry.length > 0) {
          routeGeometry.forEach((p) => {
            if (isValidLatLng(p[0], p[1])) points.push(p);
          });
        } else {
          if (fromLocation && isValidLatLng(fromLocation.lat, fromLocation.lng)) {
            points.push([fromLocation.lat, fromLocation.lng]);
          }
          if (destinationLocation && isValidLatLng(destinationLocation.lat, destinationLocation.lng)) {
            points.push([destinationLocation.lat, destinationLocation.lng]);
          }
        }
        if (points.length > 0) {
          const bounds = L.latLngBounds(points);
          mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
        }
      } catch (err) {
        console.warn('Error fitting map bounds:', err);
      }
    }
  }, [fitRouteTrigger]);

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-surface-container-high shadow-sm ${className}`}
      style={{ height }}
    >
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
