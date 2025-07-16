import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
// import { useNostrPublish } from '@/hooks/useNostrPublish';
// import { useZap } from '@/hooks/useZap';
import { useAppContext } from '@/hooks/useAppContext';
import { genUserName } from '@/lib/genUserName';
import {
  ArrowLeft,
  Share2,
  Heart,
  Download,
  User,
  Sparkles,
  Copy,
  MessageSquare,
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

const CardPreview = () => {
  const { nip19: nip19Param } = useParams<{ nip19: string }>();
  const navigate = useNavigate();
  const { nostr } = useNostr();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  // const { mutate: createEvent, isPending: isPublishing } = useNostrPublish();

  // Debug: Log the parameter
  console.log('CardPreview received param:', nip19Param);

  // Personal message state
  const [personalMessage, setPersonalMessage] = useState('');
  const [recipientName, setRecipientName] = useState('');

  // Sharing states (unused for now)
  // const [dmRecipient, setDmRecipient] = useState('');
  // const [emailRecipient, setEmailRecipient] = useState('');
  // const [zapAmount, setZapAmount] = useState('1000');
  // const [zapMessage, setZapMessage] = useState('');

  const { data: cardEvent, isLoading, error, refetch } = useQuery({
    queryKey: ['card-preview', nip19Param, config.relayUrl],
    queryFn: async (c) => {
      if (!nip19Param) {
        console.log('No nip19Param provided');
        return null;
      }

      console.log('Fetching card with param:', nip19Param);
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(15000)]);

      try {
        let events: NostrEvent[] = [];
        let queryFilter: NostrFilter | null = null;

        if (nip19Param.startsWith('naddr')) {
          console.log('Decoding naddr...');
          const decoded = nip19.decode(nip19Param);
          console.log('Decoded:', decoded);

          if (decoded.type === 'naddr') {
            const naddr = decoded.data;
            queryFilter = {
              kinds: [naddr.kind],
              authors: [naddr.pubkey],
              '#d': [naddr.identifier],
              limit: 1
            };
            console.log('Querying with filter:', queryFilter);
            events = await nostr.query([queryFilter], { signal });
            console.log('Found events:', events.length);

            if (events.length === 0) {
              console.log('No events found, trying broader search...');
              const broaderFilter = {
                kinds: [30402],
                authors: [naddr.pubkey],
                '#t': ['ecard'],
                limit: 50
              };
              console.log('Broader filter:', broaderFilter);
              const allEvents = await nostr.query([broaderFilter], { signal });
              console.log('All events from author:', allEvents.length);
              events = allEvents.filter(event => {
                const dTag = event.tags.find(([name]) => name === 'd')?.[1];
                return dTag === naddr.identifier;
              });
              console.log('Filtered events:', events.length);
            }
          }
        } else if (nip19Param.startsWith('nevent')) {
          console.log('Decoding nevent...');
          const decoded = nip19.decode(nip19Param);
          if (decoded.type === 'nevent') {
            const nevent = decoded.data;
            queryFilter = {
              ids: [nevent.id],
              kinds: [30402],
              limit: 1
            };
            events = await nostr.query([queryFilter], { signal });
          }
        } else if (nip19Param.startsWith('note')) {
          console.log('Decoding note...');
          const decoded = nip19.decode(nip19Param);
          if (decoded.type === 'note') {
            const noteId = decoded.data;
            queryFilter = {
              ids: [noteId],
              kinds: [30402],
              limit: 1
            };
            events = await nostr.query([queryFilter], { signal });
          }
        } else {
          console.log('Trying as event ID...');
          queryFilter = {
            ids: [nip19Param],
            kinds: [30402],
            limit: 1
          };
          events = await nostr.query([queryFilter], { signal });

          if (events.length === 0) {
            console.log('Trying as d-tag...');
            queryFilter = {
              kinds: [30402],
              '#d': [nip19Param],
              '#t': ['ecard'],
              limit: 1
            };
            events = await nostr.query([queryFilter], { signal });
          }
        }

        console.log('Final result:', events[0] || 'No event found');
        return events[0] || null;

      } catch (error) {
        console.error('Error fetching card:', error);
        throw error;
      }
    },
    enabled: !!nip19Param,
    retry: 2,
    retryDelay: 1000,
  });

  const cardData: CardData | null = cardEvent ? (() => {
    try {
      const parsed = JSON.parse(cardEvent.content) as CardData;
      console.log('Parsed card data:', parsed);
      return parsed;
    } catch (e) {
      console.error('Error parsing card content:', e);
      return null;
    }
  })() : null;

  const author = useAuthor(cardEvent?.pubkey);
  const authorName = author.data?.metadata?.name ?? genUserName(cardEvent?.pubkey || '');
  const authorAvatar = author.data?.metadata?.picture;

  // LNURL integration for zaps (unused for now)
  // const lightningAddress = 'bitpopart@getalby.com';
  // const { sendZap, isZapping, supportsZaps, canZap } = useZap(lightningAddress);

  useSeoMeta({
    title: cardData ? `${cardData.title} - Share POP Card` : 'Share Card - POP Cards',
    description: cardData?.description || 'Share this beautiful digital card created with POP Cards by BitPopArt',
  });

  const shareUrl = `${window.location.origin}/card/${nip19Param}`;
  const fullMessage = personalMessage.trim()
    ? `${personalMessage}\n\n🎨 ${cardData?.title}\n${shareUrl}`
    : `Check out this beautiful POP card: "${cardData?.title}"\n\n🎨 ${shareUrl}`;

  // Debug logging
  console.log('CardPreview state:', {
    nip19Param,
    isLoading,
    error,
    cardEvent: !!cardEvent,
    cardData: !!cardData,
    user: !!user
  });

  // Always render something - even if just for debugging
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
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
              <Share2 className="h-4 w-4" />
              <span>Share Card</span>
            </div>
          </div>

          {/* Debug Info */}
          <Card className="mb-8 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Parameter:</strong> {nip19Param || 'undefined'}</p>
                <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
                <p><strong>Error:</strong> {error ? error.message : 'None'}</p>
                <p><strong>Card Event:</strong> {cardEvent ? 'Found' : 'Not found'}</p>
                <p><strong>Card Data:</strong> {cardData ? 'Parsed' : 'Not parsed'}</p>
                <p><strong>Current Relay:</strong> {config.relayUrl}</p>
              </div>
            </CardContent>
          </Card>

          {/* Loading state */}
          {isLoading && (
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Card>
                  <Skeleton className="aspect-[4/3] w-full" />
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="text-center">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <h1 className="text-3xl font-bold mb-4 text-red-600">
                Error Loading Card
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                {error.message}
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
          )}

          {/* Card not found state */}
          {!isLoading && !error && (!cardEvent || !cardData) && (
            <div className="text-center">
              <div className="text-8xl mb-6">🎨</div>
              <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Card Not Found
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                The card you're looking for doesn't exist or couldn't be loaded.
              </p>

              <Button
                size="lg"
                onClick={() => navigate('/cards')}
                className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Cards
              </Button>
            </div>
          )}

          {/* Success state - show the card */}
          {!isLoading && !error && cardEvent && cardData && (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Side - Card Preview */}
              <div className="space-y-6">
                {/* Large Card Display */}
                <Card className="overflow-hidden shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                  {cardData.images && cardData.images.length > 0 ? (
                    <div className="relative">
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={cardData.images[0]}
                          alt={cardData.title}
                          className="w-full h-full object-cover"
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

                  <CardContent>
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
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(cardData.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Side - Personal Message & Sharing Options */}
              <div className="space-y-6">
                {/* Personal Message */}
                <Card className="shadow-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Add Personal Message
                    </CardTitle>
                    <CardDescription>
                      Customize your message before sharing this beautiful card
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipient-name">Recipient Name (optional)</Label>
                      <Input
                        id="recipient-name"
                        placeholder="e.g., Mom, John, Sarah..."
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="personal-message">Your Message (optional)</Label>
                      <Textarea
                        id="personal-message"
                        placeholder="Add a personal touch to your card..."
                        value={personalMessage}
                        onChange={(e) => setPersonalMessage(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    {/* Message Preview */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                      <p className="text-sm text-muted-foreground mb-1">Preview:</p>
                      <p className="text-sm whitespace-pre-wrap">{fullMessage}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="shadow-lg border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Share2 className="h-5 w-5" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={async () => {
                          if (navigator.share) {
                            try {
                              await navigator.share({
                                title: `Beautiful POP Card: ${cardData.title}`,
                                text: fullMessage,
                                url: shareUrl
                              });
                            } catch {
                              // User cancelled
                            }
                          } else {
                            try {
                              await navigator.clipboard.writeText(fullMessage);
                              toast({
                                title: "Message Copied! 📋",
                                description: "Card message copied to clipboard.",
                              });
                            } catch {
                              toast({
                                title: "Copy Failed",
                                description: "Failed to copy message.",
                                variant: "destructive"
                              });
                            }
                          }
                        }}
                        className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600"
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(fullMessage);
                            toast({
                              title: "Message Copied! 📋",
                              description: "Card message copied to clipboard.",
                            });
                          } catch {
                            toast({
                              title: "Copy Failed",
                              description: "Failed to copy message.",
                              variant: "destructive"
                            });
                          }
                        }}
                        variant="outline"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </Button>
                      <Button
                        onClick={() => navigate(`/card/${nip19Param}`)}
                        variant="outline"
                      >
                        <Heart className="mr-2 h-4 w-4" />
                        View Full
                      </Button>
                      <Button
                        onClick={async () => {
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
                              description: "Failed to download card image.",
                              variant: "destructive"
                            });
                          }
                        }}
                        variant="outline"
                        className="bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 border-green-200 dark:border-green-800"
                      >
                        <Download className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                        Download
                      </Button>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default CardPreview;