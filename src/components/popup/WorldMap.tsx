import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { POPUP_TYPE_CONFIG, type PopUpEventData } from '@/lib/popupTypes';
import { format } from 'date-fns';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface WorldMapProps {
  events: PopUpEventData[];
}

// Fix default marker icon issue with Leaflet
const fixLeafletIcons = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
};

export function WorldMap({ events }: WorldMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [hoveredEvent, setHoveredEvent] = useState<PopUpEventData | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Fix icon paths
    fixLeafletIcons();

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: true,
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when events change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    events.forEach((event) => {
      const markerColor = event.type === 'art' 
        ? '#a855f7' 
        : event.type === 'shop' 
        ? '#ec4899' 
        : '#6366f1';

      // Create custom icon
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: 24px;
            height: 24px;
            background-color: ${markerColor};
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            position: relative;
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 8px;
              height: 8px;
              background-color: white;
              border-radius: 50%;
            "></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([event.latitude, event.longitude], {
        icon: customIcon,
        title: event.title,
      });

      // Create popup
      const typeConfig = POPUP_TYPE_CONFIG[event.type];
      const popupContent = `
        <div style="min-width: 200px; font-family: system-ui;">
          <div style="margin-bottom: 8px;">
            <span style="
              display: inline-block;
              padding: 4px 8px;
              border-radius: 6px;
              background-color: ${event.type === 'art' ? '#f3e8ff' : event.type === 'shop' ? '#fce7f3' : '#e0e7ff'};
              color: ${event.type === 'art' ? '#7e22ce' : event.type === 'shop' ? '#be185d' : '#4338ca'};
              font-size: 12px;
              font-weight: 600;
            ">
              ${typeConfig.icon} ${typeConfig.label}
            </span>
          </div>
          <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">${event.title}</h3>
          <p style="font-size: 13px; color: #6b7280; margin-bottom: 4px;">
            📍 ${event.location}
          </p>
          <p style="font-size: 12px; color: #9ca3af;">
            ${format(new Date(event.startDate), 'MMM d, yyyy')}${event.endDate ? ` - ${format(new Date(event.endDate), 'MMM d, yyyy')}` : ''}
          </p>
          ${event.description ? `<p style="font-size: 13px; margin-top: 8px; color: #374151;">${event.description}</p>` : ''}
          ${event.link ? `<a href="${event.link}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 8px; color: #7c3aed; font-size: 13px; font-weight: 600; text-decoration: none;">Learn more →</a>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup',
      });

      marker.addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (events.length > 0 && mapInstanceRef.current) {
      const bounds = events.map(e => [e.latitude, e.longitude] as [number, number]);
      if (bounds.length === 1) {
        mapInstanceRef.current.setView(bounds[0], 10);
      } else {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [events]);

  return (
    <div className="relative w-full h-full">
      {/* Leaflet map container */}
      <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden" />

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-xl p-4 space-y-3 backdrop-blur-sm border border-gray-200 dark:border-gray-700 z-[1000]">
        <h3 className="font-bold text-base mb-2 flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Event Types
        </h3>
        {Object.entries(POPUP_TYPE_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-3 text-sm">
            <div 
              className="w-5 h-5 rounded-full border-2 border-white shadow-md flex-shrink-0"
              style={{ 
                backgroundColor: key === 'art' ? '#a855f7' : key === 'shop' ? '#ec4899' : '#6366f1' 
              }}
            />
            <span className="font-medium">{config.icon} {config.label}</span>
          </div>
        ))}
      </div>

      {/* Event counter */}
      <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-gray-200 dark:border-gray-700 z-[1000]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-sm font-semibold whitespace-nowrap">{events.length} event{events.length !== 1 ? 's' : ''} worldwide</span>
        </div>
      </div>

      <style>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        
        .leaflet-popup-tip {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
}
