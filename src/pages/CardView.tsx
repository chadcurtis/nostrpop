import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { ZapButton } from '@/components/cards/ZapButton';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { genUserName } from '@/lib/genUserName';
import { RelaySelector } from '@/components/RelaySelector';
import {
  ArrowLeft,
  Calendar,
  Share2,
  Zap,
  Heart,
  Download,
  Edit,
  Trash2,
  User,
  Sparkles,
  Gift,
  Eye,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import type { NostrEvent, NostrFilter } from '@nostrify/nostrify';

interface CardData {
  title: string;
  description: string;
  category: string;
  pricing: string;
  images: string[];
  created_at: string;
}

const CardView = () => {
  // All hooks must be called at the top level
  const { nip19: nip19Param } = useParams<{ nip19: string }>();
  const navigate = useNavigate();
  const { nostr } = useNostr();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  // Debug: Always log when component renders
  console.log('🎯 CardView component rendered with param:', nip19Param);

  const { data: cardEvent, isLoading, error, refetch } = useQuery({
    queryKey: ['card', nip19Param, config.relayUrl],
    queryFn: async (c) => {
      if (!nip19Param) return null;

      console.log('🔍 CardView: Starting query for:', nip19Param);
      console.log('🔗 Current relay:', config.relayUrl);
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);

      try {
        let events: NostrEvent[] = [];
        let queryFilter: NostrFilter | null = null;

        // Try to decode as NIP-19 identifier first
        if (nip19Param.startsWith('naddr')) {
          console.log('📝 Decoding naddr...');
          const decoded = nip19.decode(nip19Param);
          console.log('📝 Decoded naddr:', decoded);

          if (decoded.type === 'naddr') {
            const naddr = decoded.data;
            queryFilter = {
              kinds: [naddr.kind],
              authors: [naddr.pubkey],
              '#d': [naddr.identifier],
              limit: 1
            };
            console.log('🔍 Querying with naddr filter:', queryFilter);
            events = await nostr.query([queryFilter], { signal });
            console.log('📦 Found events for naddr:', events.length, events);

            // If not found on current relay, try a broader search
            if (events.length === 0) {
              console.log('🔍 Trying broader search for this author...');
              const broaderFilter = {
                kinds: [30402],
                authors: [naddr.pubkey],
                '#t': ['ecard'],
                limit: 50
              };
              console.log('🔍 Broader filter:', broaderFilter);
              const allEvents = await nostr.query([broaderFilter], { signal });
              console.log('📦 Found all events from author:', allEvents.length);

              // Look for the specific d-tag in the results
              events = allEvents.filter(event => {
                const dTag = event.tags.find(([name]) => name === 'd')?.[1];
                return dTag === naddr.identifier;
              });
              console.log('📦 Filtered events with matching d-tag:', events.length);
            }
          }
        } else if (nip19Param.startsWith('nevent')) {
          console.log('📝 Decoding nevent...');
          const decoded = nip19.decode(nip19Param);
          console.log('📝 Decoded nevent:', decoded);
          if (decoded.type === 'nevent') {
            const nevent = decoded.data;
            queryFilter = {
              ids: [nevent.id],
              kinds: [30402],
              limit: 1
            };
            console.log('🔍 Querying with nevent filter:', queryFilter);
            events = await nostr.query([queryFilter], { signal });
            console.log('📦 Found events for nevent:', events.length, events);
          }
        } else if (nip19Param.startsWith('note')) {
          console.log('📝 Decoding note...');
          const decoded = nip19.decode(nip19Param);
          console.log('📝 Decoded note:', decoded);
          if (decoded.type === 'note') {
            const noteId = decoded.data;
            queryFilter = {
              ids: [noteId],
              kinds: [30402],
              limit: 1
            };
            console.log('🔍 Querying with note filter:', queryFilter);
            events = await nostr.query([queryFilter], { signal });
            console.log('📦 Found events for note:', events.length, events);
          }
        } else {
          // Try as event ID first
          console.log('🔍 Trying as event ID...');
          queryFilter = {
            ids: [nip19Param],
            kinds: [30402],
            limit: 1
          };
          console.log('🔍 Querying with event ID filter:', queryFilter);
          events = await nostr.query([queryFilter], { signal });
          console.log('📦 Found events for event ID:', events.length, events);

          // If not found, try as d-tag
          if (events.length === 0) {
            console.log('🔍 Trying as d-tag...');
            queryFilter = {
              kinds: [30402],
              '#d': [nip19Param],
              '#t': ['ecard'],
              limit: 1
            };
            console.log('🔍 Querying with d-tag filter:', queryFilter);
            events = await nostr.query([queryFilter], { signal });
            console.log('📦 Found events for d-tag:', events.length, events);
          }
        }

        console.log('✅ Final result:', events[0] || 'No event found');
        return events[0] || null;

      } catch (error) {
        console.error('❌ Error fetching card:', error);
        throw error;
      }
    },
    enabled: !!nip19Param,
    retry: 2,
    retryDelay: 1000,
  });

  // All hooks must be at top level
  const author = useAuthor(cardEvent?.pubkey);

  const cardData: CardData | null = cardEvent ? (() => {
    try {
      return JSON.parse(cardEvent.content) as CardData;
    } catch {
      return null;
    }
  })() : null;

  const authorName = author.data?.metadata?.name ?? genUserName(cardEvent?.pubkey || '');
  const authorAvatar = author.data?.metadata?.picture;

  useSeoMeta({
    title: cardData ? `${cardData.title} - POP Cards by BitPopArt` : 'Card - POP Cards',
    description: cardData?.description || 'Beautiful digital card created with POP Cards by BitPopArt',
  });

  const downloadCard = async () => {
    if (!cardData?.images || cardData.images.length === 0) {
      toast({
        title: "No Image Available",
        description: "This card doesn't have any images to download.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(cardData.images[0]);
      if (!response.ok) throw new Error('Failed to fetch image');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ecard-${cardData.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Downloaded! 📥",
        description: "Card image downloaded successfully.",
      });
    } catch {
      toast({
        title: "Download Failed",
        description: "Failed to download card image. Please try again.",
        variant: "destructive"
      });
    }
  };

  const likeCard = () => {
    toast({
      title: "Liked! ❤️",
      description: "Thanks for the love! Feature coming soon.",
    });
  };

  // Handle missing parameter
  if (!nip19Param) {
    console.error('❌ No nip19 parameter provided to CardView');
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4 text-red-600">
              No Card ID Provided
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              The URL is missing a card identifier.
            </p>
            <Button onClick={() => navigate('/cards')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cards
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-10 w-32 mb-8" />

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Card Image */}
              <div className="lg:col-span-2">
                <Card className="overflow-hidden shadow-xl">
                  <Skeleton className="aspect-[4/3] w-full" />
                </Card>
              </div>

              {/* Card Details */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-6 w-20" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <div className="grid grid-cols-2 gap-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/cards')}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cards
            </Button>

            <div className="mb-8">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <h1 className="text-3xl font-bold mb-4 text-red-600">
                Error Loading Card
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                There was an error loading the card. This could be due to network issues or the card may not exist.
              </p>

              <div className="space-x-4">
                <Button
                  size="lg"
                  onClick={() => refetch()}
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  size="lg"
                  onClick={() => navigate('/cards')}
                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Cards
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Card not found state
  if (!cardEvent || !cardData) {
    // Try to decode the nip19 param for debug info
    let debugInfo: { kind?: number; pubkey?: string; identifier?: string } | null = null;
    try {
      if (nip19Param?.startsWith('naddr')) {
        const decoded = nip19.decode(nip19Param);
        if (decoded.type === 'naddr') {
          debugInfo = decoded.data;
        }
      }
    } catch {
      // Ignore decode errors for debug
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <Button
              variant="ghost"
              onClick={() => navigate('/cards')}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cards
            </Button>

            <div className="mb-8">
              <div className="text-8xl mb-6">🎨</div>
              <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Card Not Found
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                The card you're looking for doesn't exist or couldn't be loaded.
              </p>

              {/* Debug Information */}
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6 text-left max-w-2xl mx-auto">
                <h3 className="font-semibold mb-3 text-center">Debug Information</h3>
                <div className="text-sm space-y-2">
                  <div><strong>Parameter:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{nip19Param}</code></div>
                  <div><strong>Current URL:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{window.location.href}</code></div>
                  <div><strong>Current Relay:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{config.relayUrl}</code></div>
                  <div><strong>User logged in:</strong> {user ? 'Yes' : 'No'}</div>
                  {debugInfo && (
                    <>
                      <div><strong>Decoded naddr:</strong></div>
                      <div className="ml-4 space-y-1">
                        <div>Kind: {debugInfo?.kind}</div>
                        <div>Author: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">{debugInfo?.pubkey}</code></div>
                        <div>Identifier: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{debugInfo?.identifier}</code></div>
                      </div>
                    </>
                  )}
                  <div className="pt-2 border-t">
                    <strong>Possible issues:</strong>
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                      <li>Card may be on a different relay</li>
                      <li>Card may not exist in our current relay</li>
                      <li>Network connectivity issues</li>
                      <li>Card may be from a different application</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  The card might be on a different relay. Try switching relays below or create a card first.
                </p>

                <div className="max-w-sm mx-auto">
                  <label className="block text-sm font-medium mb-2">Try a different relay:</label>
                  <RelaySelector className="w-full" />
                </div>

                <div className="space-x-4">
                  <Button
                    size="lg"
                    onClick={() => navigate('/cards')}
                    className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Cards
                  </Button>

                  <Button
                    size="lg"
                    onClick={() => refetch()}
                    variant="outline"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state - show the card
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/cards')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cards
            </Button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>Viewing Card</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Card Display */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                {/* Card Image */}
                {cardData.images && cardData.images.length > 0 ? (
                  <div className="relative">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={cardData.images[0]}
                        alt={cardData.title}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement?.classList.add('bg-gradient-to-br', 'from-purple-100', 'via-pink-100', 'to-indigo-100', 'dark:from-purple-900/30', 'dark:via-pink-900/30', 'dark:to-indigo-900/30', 'flex', 'items-center', 'justify-center');
                          target.parentElement!.innerHTML = '<div class="text-center"><div class="text-8xl mb-6">🎨</div><h3 class="text-2xl font-semibold text-muted-foreground mb-2">Beautiful POP Card</h3><p class="text-muted-foreground">Created with love by BitPopArt</p></div>';
                        }}
                      />
                    </div>
                    {cardData.images.length > 1 && (
                      <Badge className="absolute top-4 right-4 bg-black/70 text-white border-0">
                        <Sparkles className="mr-1 h-3 w-3" />
                        +{cardData.images.length - 1} more
                      </Badge>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-gradient-to-br from-purple-100 via-pink-100 to-indigo-100 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-8xl mb-6">🎨</div>
                      <h3 className="text-2xl font-semibold text-muted-foreground mb-2">Beautiful POP Card</h3>
                      <p className="text-muted-foreground">Created with love by BitPopArt</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Card Details Sidebar */}
            <div className="space-y-6">
              {/* Card Info */}
              <Card className="shadow-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-3">
                    <Badge
                      variant="secondary"
                      className="shrink-0 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 text-pink-700 dark:text-pink-300 border-0"
                    >
                      {cardData.category}
                    </Badge>
                    <div className="flex-1">
                      <CardTitle className="text-2xl leading-tight mb-3 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        {cardData.title}
                      </CardTitle>
                      <CardDescription className="text-base leading-relaxed">
                        {cardData.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Creator Info */}
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50">
                    <Avatar className="h-12 w-12 ring-2 ring-purple-200 dark:ring-purple-800">
                      <AvatarImage src={authorAvatar} alt={authorName} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Created by</p>
                      <p className="font-semibold text-foreground">{authorName}</p>
                    </div>
                  </div>

                  {/* Card Meta */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Created</span>
                      </div>
                      <span className="text-sm font-medium">
                        {new Date(cardData.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Gift className="h-4 w-4" />
                        <span>Pricing</span>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 dark:bg-green-900/20">
                        Free
                      </Badge>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-4 border-t">
                    {/* Owner Actions */}
                    {user && cardEvent.pubkey === user.pubkey && (
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800"
                          onClick={() => {
                            // Use a simple alert for now, or implement inline editing
                            alert('Edit functionality would open here');
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                          Edit Card
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 border-red-200 dark:border-red-800"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this card?')) {
                              // Handle delete
                              alert('Delete functionality would be implemented here');
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4 text-red-600 dark:text-red-400" />
                          Delete Card
                        </Button>
                      </div>
                    )}

                    {/* Public Actions */}
                    <div className="space-y-2">
                      <Button className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600">
                        <Share2 className="mr-2 h-4 w-4" />
                        Share Card
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 border-purple-200 dark:border-purple-800"
                        onClick={() => {
                          // Share to Nostr functionality
                          const dTag = cardEvent.tags.find(([name]) => name === 'd')?.[1];
                          if (dTag) {
                            const naddr = nip19.naddrEncode({
                              identifier: dTag,
                              pubkey: cardEvent.pubkey,
                              kind: cardEvent.kind,
                            });
                            const shareUrl = `${window.location.origin}/card/${naddr}`;
                            const shareText = `Check out this beautiful ${cardData.category} ecard: "${cardData.title}"\n\n${shareUrl}\n\n#ecard #${cardData.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

                            if (navigator.share) {
                              navigator.share({
                                title: `Beautiful Ecard: ${cardData.title}`,
                                text: shareText,
                                url: shareUrl
                              });
                            } else {
                              navigator.clipboard.writeText(shareText);
                              alert('Share text copied to clipboard!');
                            }
                          }
                        }}
                      >
                        <Share2 className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                        Share to Nostr
                      </Button>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={likeCard}
                          className="bg-pink-50 hover:bg-pink-100 dark:bg-pink-900/20 dark:hover:bg-pink-900/30 border-pink-200 dark:border-pink-800"
                        >
                          <Heart className="mr-2 h-4 w-4 text-pink-600 dark:text-pink-400" />
                          Like
                        </Button>

                        <Button
                          variant="outline"
                          onClick={downloadCard}
                          className="bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 border-green-200 dark:border-green-800"
                        >
                          <Download className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                          Download
                        </Button>
                      </div>

                      <ZapButton
                        recipientPubkey={cardEvent.pubkey}
                        eventId={cardEvent.id}
                        eventTitle={cardData.title}
                        variant="outline"
                        className="w-full bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800"
                      >
                        <Zap className="mr-2 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        Zap Creator
                      </ZapButton>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* BitPopArt Branding */}
              <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">✨</div>
                  <h3 className="font-semibold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Good Vibes cards by BitPopArt
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Spreading joy, one card at a time
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardView;