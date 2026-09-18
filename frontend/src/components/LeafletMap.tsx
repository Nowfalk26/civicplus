import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { STATUS_INFO, CATEGORY_INFO } from '../lib/utils';
import { Link } from 'react-router-dom';

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

interface LeafletMapProps {
  complaints?: MapComplaint[];
  center?: [number, number];
  zoom?: number;
  interactivePicker?: boolean;
  selectedCoord?: [number, number] | null;
  onLocationSelect?: (coord: { lat: number; lng: number }) => void;
  className?: string;
  height?: string;
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
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Click handler for location picker
    if (interactivePicker && onLocationSelect) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onLocationSelect({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
      });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update center & zoom if changed
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center[0], center[1], zoom]);

  // Update complaints markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // Custom pins for each complaint
    complaints.forEach((c) => {
      if (!c.latitude || !c.longitude) return;

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
      markersLayerRef.current!.addLayer(marker);
    });
  }, [complaints]);

  // Update interactive location picker marker
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (selectedCoord && selectedCoord[0] && selectedCoord[1]) {
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
  }, [selectedCoord]);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-surface-container-high shadow-sm ${className}`} style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
