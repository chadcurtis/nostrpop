import { useSeoMeta } from '@unhead/react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Calendar, ExternalLink, Globe } from 'lucide-react';
import { format } from 'date-fns';
import type { NostrEvent } from '@nostrify/nostrify';
import { POPUP_TYPE_CONFIG, type PopUpType, type PopUpEventData } from '@/lib/popupTypes';
import { WorldMap } from '@/components/popup/WorldMap';

export default function PopUp() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  useSeoMeta({
    title: 'PopUp Events - BitPopArt',
    description: 'Discover BitPopArt exhibitions, pop-up shops, and events around the world',
  });

  // Fetch all PopUp events (kind 31922)
  const { data: popupEvents = [], isLoading } = useQuery({
    queryKey: ['popup-events-public', user?.pubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // If user is logged in, show their events, otherwise show from specific authors
      const filters = user?.pubkey
        ? [{ kinds: [31922], authors: [user.pubkey], '#t': ['bitpopart-popup'], limit: 100 }]
        : [{ kinds: [31922], '#t': ['bitpopart-popup'], limit: 100 }];

      const events = await nostr.query(filters, { signal });
      
      // Parse events into PopUpEventData
      const parsedEvents: PopUpEventData[] = events
        .map((event): PopUpEventData | null => {
          const id = event.tags.find(t => t[0] === 'd')?.[1] || event.id;
          const title = event.tags.find(t => t[0] === 'title')?.[1] || 'Untitled';
          const location = event.tags.find(t => t[0] === 'location')?.[1] || '';
          const startDate = event.tags.find(t => t[0] === 'start')?.[1] || '';
          const endDate = event.tags.find(t => t[0] === 'end')?.[1];
          const image = event.tags.find(t => t[0] === 'image')?.[1];
          const link = event.tags.find(t => t[0] === 'r')?.[1];
          const type = event.tags.find(t => t[0] === 't' && ['art', 'shop', 'event'].includes(t[1]))?.[1] as PopUpType || 'art';

          let description = '';
          let latitude = 0;
          let longitude = 0;

          try {
            const contentData = JSON.parse(event.content);
            description = contentData.description || '';
            latitude = contentData.coordinates?.lat || 0;
            longitude = contentData.coordinates?.lon || 0;
          } catch {
            description = event.content;
          }

          if (!latitude || !longitude) return null;

          return {
            id,
            title,
            description,
            type,
            location,
            latitude,
            longitude,
            startDate,
            endDate,
            image,
            link,
          };
        })
        .filter((e): e is PopUpEventData => e !== null)
        .sort((a, b) => b.startDate.localeCompare(a.startDate));

      return parsedEvents;
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Globe className="h-10 w-10 text-purple-600 mr-3" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              PopUp Events
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover BitPopArt exhibitions, pop-up shops, and events happening around the world
          </p>
        </div>

        {/* World Map */}
        <Card className="mb-12 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              World Tour Map
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <Skeleton className="h-[500px] w-full" />
            ) : popupEvents.length === 0 ? (
              <div className="h-[500px] flex items-center justify-center text-muted-foreground bg-gray-100 dark:bg-gray-800">
                <div className="text-center">
                  <Globe className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No PopUp events scheduled yet</p>
                </div>
              </div>
            ) : (
              <div className="h-[500px] w-full">
                <WorldMap events={popupEvents} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Schedule */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center mb-8">Event Schedule</h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-48 w-full rounded-t-lg" />
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : popupEvents.length === 0 ? (
            <Card className="max-w-md mx-auto">
              <CardContent className="py-12 text-center">
                <Globe className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Events Yet</h3>
                <p className="text-muted-foreground">
                  Check back soon for upcoming PopUp events!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popupEvents.map((event) => {
                const typeConfig = POPUP_TYPE_CONFIG[event.type];

                return (
                  <Card key={event.id} className="h-full hover:shadow-xl transition-all duration-300 overflow-hidden group bg-white dark:bg-gray-800">
                    {event.image ? (
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={event.image}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        <Badge className={`absolute top-3 right-3 ${typeConfig.bgColor} ${typeConfig.color} border shadow-lg`}>
                          {typeConfig.icon} {typeConfig.label}
                        </Badge>
                      </div>
                    ) : (
                      <div className="relative h-56 bg-gradient-to-br from-purple-100 via-pink-100 to-indigo-100 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-indigo-900/20 flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-6xl opacity-40">{typeConfig.icon}</span>
                        </div>
                        <Badge className={`absolute top-3 right-3 ${typeConfig.bgColor} ${typeConfig.color} border`}>
                          {typeConfig.label}
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="space-y-3">
                      <h3 className="text-2xl font-bold group-hover:text-purple-600 transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-muted-foreground line-clamp-3 text-sm">
                          {event.description}
                        </p>
                      )}
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="line-clamp-1 font-medium">{event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium">
                            {format(new Date(event.startDate), 'MMM d, yyyy')}
                            {event.endDate && ` - ${format(new Date(event.endDate), 'MMM d, yyyy')}`}
                          </span>
                        </div>
                      </div>
                      {event.link && (
                        <a
                          href={event.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-purple-600 hover:text-purple-700 transition-colors pt-2 font-medium"
                        >
                          <span className="text-sm">Learn more</span>
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      )}
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
