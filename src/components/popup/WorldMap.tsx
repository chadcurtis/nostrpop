import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { POPUP_TYPE_CONFIG, type PopUpEventData } from '@/lib/popupTypes';
import { format } from 'date-fns';

interface WorldMapProps {
  events: PopUpEventData[];
}

export function WorldMap({ events }: WorldMapProps) {
  const [hoveredEvent, setHoveredEvent] = useState<PopUpEventData | null>(null);

  // Convert lat/lon to SVG coordinates
  // SVG viewBox: 0 0 1000 500 (representing -180 to 180 lon, 85 to -85 lat)
  const latLonToSVG = (lat: number, lon: number) => {
    const x = ((lon + 180) / 360) * 1000;
    const y = ((85 - lat) / 170) * 500;
    return { x, y };
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
      <svg
        viewBox="0 0 1000 500"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* World map background with grid */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="rgba(99, 102, 241, 0.1)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        {/* Grid background */}
        <rect width="1000" height="500" fill="url(#grid)" />

        {/* Simplified world map outline */}
        <path
          d="M 50 150 Q 100 100 200 120 T 400 100 Q 500 80 600 100 T 800 120 Q 900 140 950 150 L 950 350 Q 900 360 800 340 T 600 360 Q 500 380 400 360 T 200 340 Q 100 360 50 350 Z M 200 200 Q 220 180 250 190 L 280 200 Q 300 210 280 230 L 250 240 Q 220 250 200 240 Z M 700 180 Q 750 160 800 170 L 850 190 Q 870 210 850 240 L 800 260 Q 750 270 700 250 Z"
          fill="rgba(99, 102, 241, 0.15)"
          stroke="rgba(99, 102, 241, 0.3)"
          strokeWidth="1"
        />

        {/* Equator line */}
        <line
          x1="0"
          y1="250"
          x2="1000"
          y2="250"
          stroke="rgba(99, 102, 241, 0.2)"
          strokeWidth="1"
          strokeDasharray="5,5"
        />

        {/* Prime meridian */}
        <line
          x1="500"
          y1="0"
          x2="500"
          y2="500"
          stroke="rgba(99, 102, 241, 0.2)"
          strokeWidth="1"
          strokeDasharray="5,5"
        />

        {/* Event markers */}
        {events.map((event) => {
          const { x, y } = latLonToSVG(event.latitude, event.longitude);
          const typeConfig = POPUP_TYPE_CONFIG[event.type];
          
          // Determine marker color based on type
          const markerColor = event.type === 'art' 
            ? '#a855f7' 
            : event.type === 'shop' 
            ? '#ec4899' 
            : '#6366f1';

          return (
            <g
              key={event.id}
              onMouseEnter={() => setHoveredEvent(event)}
              onMouseLeave={() => setHoveredEvent(null)}
              className="cursor-pointer"
            >
              {/* Marker pin */}
              <circle
                cx={x}
                cy={y}
                r="8"
                fill={markerColor}
                stroke="white"
                strokeWidth="2"
                className="transition-all duration-200 hover:r-12"
                style={{
                  filter: hoveredEvent?.id === event.id ? 'drop-shadow(0 0 8px rgba(0,0,0,0.5))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  transform: hoveredEvent?.id === event.id ? 'scale(1.3)' : 'scale(1)',
                  transformOrigin: `${x}px ${y}px`,
                }}
              />
              {/* Pulse animation for hovered marker */}
              {hoveredEvent?.id === event.id && (
                <circle
                  cx={x}
                  cy={y}
                  r="8"
                  fill="none"
                  stroke={markerColor}
                  strokeWidth="2"
                  opacity="0.6"
                >
                  <animate
                    attributeName="r"
                    from="8"
                    to="20"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.6"
                    to="0"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredEvent && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
          <Card className="p-4 shadow-2xl max-w-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={`${POPUP_TYPE_CONFIG[hoveredEvent.type].bgColor} ${POPUP_TYPE_CONFIG[hoveredEvent.type].color} border`}>
                  {POPUP_TYPE_CONFIG[hoveredEvent.type].icon} {POPUP_TYPE_CONFIG[hoveredEvent.type].label}
                </Badge>
              </div>
              <h3 className="font-bold text-lg">{hoveredEvent.title}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{hoveredEvent.location}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(hoveredEvent.startDate), 'MMM d, yyyy')}
                {hoveredEvent.endDate && ` - ${format(new Date(hoveredEvent.endDate), 'MMM d, yyyy')}`}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-2">
        <h3 className="font-semibold text-sm mb-2">Event Types</h3>
        {Object.entries(POPUP_TYPE_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <div 
              className="w-4 h-4 rounded-full border-2 border-white"
              style={{ 
                backgroundColor: key === 'art' ? '#a855f7' : key === 'shop' ? '#ec4899' : '#6366f1' 
              }}
            />
            <span>{config.icon} {config.label}</span>
          </div>
        ))}
      </div>

      {/* Coordinates info */}
      <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-gray-800/90 rounded px-3 py-1 text-xs text-muted-foreground">
        {events.length} event{events.length !== 1 ? 's' : ''} worldwide
      </div>
    </div>
  );
}
