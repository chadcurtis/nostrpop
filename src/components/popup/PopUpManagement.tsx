import { useState } from 'react';
import { useNostr } from '@nostrify/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  MapPin,
  Plus,
  Calendar,
  Loader2,
  Trash2,
  Edit,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import type { NostrEvent } from '@nostrify/nostrify';
import { POPUP_TYPE_CONFIG, coordinatesToGeohash, generateUUID, type PopUpType } from '@/lib/popupTypes';

interface PopUpFormData {
  title: string;
  description: string;
  type: PopUpType;
  location: string;
  latitude: string;
  longitude: string;
  startDate: string;
  endDate: string;
  image: string;
  link: string;
}

export function PopUpManagement() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [editingEvent, setEditingEvent] = useState<NostrEvent | null>(null);
  const [formData, setFormData] = useState<PopUpFormData>({
    title: '',
    description: '',
    type: 'art',
    location: '',
    latitude: '',
    longitude: '',
    startDate: '',
    endDate: '',
    image: '',
    link: '',
  });

  // Fetch user's PopUp events (kind 31922)
  const { data: popupEvents = [], isLoading } = useQuery({
    queryKey: ['popup-events', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ kinds: [31922], authors: [user.pubkey], '#t': ['bitpopart-popup'], limit: 100 }],
        { signal }
      );
      return events.sort((a, b) => {
        const aStart = a.tags.find(t => t[0] === 'start')?.[1] || '';
        const bStart = b.tags.find(t => t[0] === 'start')?.[1] || '';
        return bStart.localeCompare(aStart);
      });
    },
    enabled: !!user?.pubkey,
  });

  const handleInputChange = (field: keyof PopUpFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!formData.location.trim()) {
      toast.error('Please enter a location');
      return;
    }
    if (!formData.latitude || !formData.longitude) {
      toast.error('Please enter coordinates');
      return;
    }
    if (!formData.startDate) {
      toast.error('Please enter a start date');
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lon = parseFloat(formData.longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      toast.error('Latitude must be between -90 and 90');
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      toast.error('Longitude must be between -180 and 180');
      return;
    }

    const eventId = editingEvent?.tags.find(t => t[0] === 'd')?.[1] || generateUUID();
    const geohash = coordinatesToGeohash(lat, lon);

    const tags: string[][] = [
      ['d', eventId],
      ['title', formData.title],
      ['start', formData.startDate],
      ['location', formData.location],
      ['g', geohash],
      ['t', 'bitpopart-popup'],
      ['t', formData.type],
    ];

    if (formData.endDate) {
      tags.push(['end', formData.endDate]);
    }
    if (formData.image) {
      tags.push(['image', formData.image]);
    }
    if (formData.link) {
      tags.push(['r', formData.link]);
    }

    // Store coordinates in content as JSON for easy retrieval
    const contentData = {
      description: formData.description,
      coordinates: { lat, lon },
    };

    createEvent(
      {
        kind: 31922,
        content: JSON.stringify(contentData),
        tags,
      },
      {
        onSuccess: () => {
          toast.success(editingEvent ? 'PopUp event updated!' : 'PopUp event created!');
          setIsCreating(false);
          setEditingEvent(null);
          setFormData({
            title: '',
            description: '',
            type: 'art',
            location: '',
            latitude: '',
            longitude: '',
            startDate: '',
            endDate: '',
            image: '',
            link: '',
          });
          queryClient.invalidateQueries({ queryKey: ['popup-events'] });
        },
        onError: (error) => {
          console.error('Publish error:', error);
          toast.error('Failed to save PopUp event');
        },
      }
    );
  };

  const handleEdit = (event: NostrEvent) => {
    const title = event.tags.find(t => t[0] === 'title')?.[1] || '';
    const location = event.tags.find(t => t[0] === 'location')?.[1] || '';
    const startDate = event.tags.find(t => t[0] === 'start')?.[1] || '';
    const endDate = event.tags.find(t => t[0] === 'end')?.[1] || '';
    const image = event.tags.find(t => t[0] === 'image')?.[1] || '';
    const link = event.tags.find(t => t[0] === 'r')?.[1] || '';
    const type = event.tags.find(t => t[0] === 't' && ['art', 'shop', 'event'].includes(t[1]))?.[1] as PopUpType || 'art';

    let description = '';
    let lat = '';
    let lon = '';

    try {
      const contentData = JSON.parse(event.content);
      description = contentData.description || '';
      lat = contentData.coordinates?.lat?.toString() || '';
      lon = contentData.coordinates?.lon?.toString() || '';
    } catch {
      description = event.content;
    }

    setFormData({
      title,
      description,
      type,
      location,
      latitude: lat,
      longitude: lon,
      startDate,
      endDate,
      image,
      link,
    });
    setEditingEvent(event);
    setIsCreating(true);
  };

  const handleDelete = (event: NostrEvent) => {
    const eventId = event.tags.find(t => t[0] === 'd')?.[1];
    if (!eventId) return;

    if (confirm('Are you sure you want to delete this PopUp event?')) {
      createEvent(
        {
          kind: 5,
          content: 'Deleted PopUp event',
          tags: [['a', `31922:${event.pubkey}:${eventId}`]],
        },
        {
          onSuccess: () => {
            toast.success('PopUp event deleted');
            queryClient.invalidateQueries({ queryKey: ['popup-events'] });
          },
        }
      );
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingEvent(null);
    setFormData({
      title: '',
      description: '',
      type: 'art',
      location: '',
      latitude: '',
      longitude: '',
      startDate: '',
      endDate: '',
      image: '',
      link: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Create/Edit Form */}
      {isCreating ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                {editingEvent ? 'Edit PopUp Event' : 'Create PopUp Event'}
              </span>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              Add a new PopUp event location to appear on the world map
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    placeholder="BitPopArt Exhibition Amsterdam"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Event Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleInputChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(POPUP_TYPE_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.icon} {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Join us for an exciting pop-up exhibition..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="Amsterdam, Netherlands"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude * (-90 to 90)</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="52.3676"
                    value={formData.latitude}
                    onChange={(e) => handleInputChange('latitude', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude * (-180 to 180)</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="4.9041"
                    value={formData.longitude}
                    onChange={(e) => handleInputChange('longitude', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Event Image URL (optional)</Label>
                <Input
                  id="image"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.image}
                  onChange={(e) => handleInputChange('image', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="link">Event Link (optional)</Label>
                <Input
                  id="link"
                  type="url"
                  placeholder="https://example.com/event"
                  value={formData.link}
                  onChange={(e) => handleInputChange('link', e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-6">
          <Button onClick={() => setIsCreating(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Add PopUp Event
          </Button>
        </div>
      )}

      <Separator />

      {/* Event List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Your PopUp Events
          </CardTitle>
          <CardDescription>
            Manage your worldwide PopUp schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : popupEvents.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No PopUp events yet. Create your first one above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {popupEvents.map((event) => {
                const title = event.tags.find(t => t[0] === 'title')?.[1] || 'Untitled';
                const location = event.tags.find(t => t[0] === 'location')?.[1] || '';
                const startDate = event.tags.find(t => t[0] === 'start')?.[1] || '';
                const endDate = event.tags.find(t => t[0] === 'end')?.[1];
                const image = event.tags.find(t => t[0] === 'image')?.[1];
                const type = event.tags.find(t => t[0] === 't' && ['art', 'shop', 'event'].includes(t[1]))?.[1] as PopUpType || 'art';
                const typeConfig = POPUP_TYPE_CONFIG[type];

                return (
                  <Card key={event.id} className="overflow-hidden">
                    <div className="flex gap-4">
                      {image && (
                        <div className="w-32 h-24 flex-shrink-0">
                          <img
                            src={image}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{title}</h3>
                              <Badge className={`${typeConfig.bgColor} ${typeConfig.color} border`}>
                                {typeConfig.icon} {typeConfig.label}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(startDate), 'MMM d, yyyy')}
                                {endDate && ` - ${format(new Date(endDate), 'MMM d, yyyy')}`}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(event)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(event)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
