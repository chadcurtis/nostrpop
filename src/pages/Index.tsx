import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuthor } from '@/hooks/useAuthor';
import { useLatestAdminNotes } from '@/hooks/useAdminNotes';
import { useLatestCards } from '@/hooks/useLatestCards';
import { useArtworks } from '@/hooks/useArtworks';
import { genUserName } from '@/lib/genUserName';
import { RelaySelector } from '@/components/RelaySelector';
import { getFirstImage, stripImagesFromContent } from '@/lib/extractImages';
import { formatPrice } from '@/lib/artTypes';
import {
  MessageSquare,
  Calendar,
  ArrowRight,
  Sparkles,
  Gift,
  Rss,
  CreditCard,
  Palette,
  ShoppingCart,
  Eye
} from 'lucide-react';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import type { ArtworkData } from '@/lib/artTypes';
import { nip19 } from 'nostr-tools';

const ADMIN_NPUB = 'npub1gwa27rpgum8mr9d30msg8cv7kwj2lhav2nvmdwh3wqnsa5vnudxqlta2sz';
const ADMIN_HEX = nip19.decode(ADMIN_NPUB).data as string;

function NoteThumbnail({ event }: { event: NostrEvent }) {
  const author = useAuthor(event.pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  const displayName = metadata?.name ?? genUserName(event.pubkey);
  const profileImage = metadata?.picture;
  const createdAt = new Date(event.created_at * 1000);

  // Extract first image from the note
  const firstImage = getFirstImage(event.content, event.tags);

  // Get clean text content without images
  const cleanContent = stripImagesFromContent(event.content);
  const preview = cleanContent.length > 100
    ? cleanContent.substring(0, 100) + '...'
    : cleanContent;

  return (
    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm group overflow-hidden">
      {/* Note Image Thumbnail */}
      {firstImage && (
        <div className="aspect-video relative overflow-hidden">
          <img
            src={firstImage.url}
            alt={firstImage.alt || 'Note image'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Hide image if it fails to load
              const container = e.currentTarget.parentElement;
              if (container) {
                container.style.display = 'none';
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {profileImage ? (
              <img
                src={profileImage}
                alt={displayName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-sm font-semibold truncate">
                {displayName}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                Admin
              </Badge>
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{createdAt.toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {preview && (
          <div className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-3">
            {preview}
          </div>
        )}
        <div className="flex items-center text-purple-600 group-hover:text-purple-700 transition-colors">
          <span className="text-xs font-medium">Read more</span>
          <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
}



interface CardData {
  id: string;
  title: string;
  description: string;
  category: string;
  images?: string[];
  created_at: string;
  event: NostrEvent;
}

function CardThumbnail({ card }: { card: CardData }) {
  const createdAt = new Date(card.created_at);

  return (
    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm group overflow-hidden">
      {/* Card Image */}
      {card.images && card.images.length > 0 ? (
        <div className="aspect-video relative overflow-hidden">
          <img
            src={card.images[0]}
            alt={card.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Show placeholder if image fails to load
              const placeholder = e.currentTarget.parentElement!.querySelector('.image-placeholder');
              if (placeholder) {
                e.currentTarget.style.display = 'none';
                (placeholder as HTMLElement).style.display = 'flex';
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {/* Fallback placeholder (hidden by default) */}
          <div className="image-placeholder absolute inset-0 bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 dark:from-pink-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 hidden items-center justify-center">
            <CreditCard className="h-12 w-12 text-pink-400 dark:text-pink-500" />
          </div>
        </div>
      ) : (
        <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 dark:from-pink-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 flex items-center justify-center">
          <CreditCard className="h-12 w-12 text-pink-400 dark:text-pink-500" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <CreditCard className="h-4 w-4 text-pink-600" />
          <CardTitle className="text-sm font-semibold truncate">
            {card.title}
          </CardTitle>
          {card.category && (
            <Badge variant="outline" className="text-xs">
              {card.category}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{createdAt.toLocaleDateString()}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {card.description.substring(0, 80)}...
        </div>
        <div className="flex items-center text-pink-600 group-hover:text-pink-700 transition-colors">
          <span className="text-xs font-medium">View card</span>
          <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
}

function ArtworkThumbnail({ artwork }: { artwork: ArtworkData }) {
  const author = useAuthor(artwork.artist_pubkey);
  const metadata: NostrMetadata | undefined = author.data?.metadata;
  const artistName = metadata?.name ?? genUserName(artwork.artist_pubkey);

  const isForSale = artwork.sale_type === 'fixed';
  const isAuction = artwork.sale_type === 'auction';
  const isSold = artwork.sale_type === 'sold';

  const getSaleInfo = () => {
    if (isSold) return { label: 'Sold', color: 'text-green-600', icon: Eye };
    if (isForSale) return { label: 'For Sale', color: 'text-blue-600', icon: ShoppingCart };
    if (isAuction) return { label: 'Auction', color: 'text-red-600', icon: ShoppingCart };
    return { label: 'View', color: 'text-purple-600', icon: Eye };
  };

  const saleInfo = getSaleInfo();
  const SaleIcon = saleInfo.icon;

  return (
    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm group overflow-hidden">
      {/* Artwork Image */}
      {artwork.images && artwork.images.length > 0 ? (
        <div className="aspect-square relative overflow-hidden">
          <img
            src={artwork.images[0]}
            alt={artwork.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Show placeholder if image fails to load
              const placeholder = e.currentTarget.parentElement!.querySelector('.image-placeholder');
              if (placeholder) {
                e.currentTarget.style.display = 'none';
                (placeholder as HTMLElement).style.display = 'flex';
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {/* Sale Type Badge */}
          <div className="absolute top-3 left-3">
            <Badge variant={isSold ? "secondary" : isForSale ? "default" : isAuction ? "destructive" : "outline"} className="flex items-center space-x-1">
              <SaleIcon className="w-3 h-3" />
              <span className="text-xs font-medium">{saleInfo.label}</span>
            </Badge>
          </div>
          {/* Fallback placeholder (hidden by default) */}
          <div className="image-placeholder absolute inset-0 bg-gradient-to-br from-purple-100 via-pink-100 to-indigo-100 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-indigo-900/20 hidden items-center justify-center">
            <Palette className="h-12 w-12 text-purple-400 dark:text-purple-500" />
          </div>
        </div>
      ) : (
        <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-purple-100 via-pink-100 to-indigo-100 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-indigo-900/20 flex items-center justify-center">
          <Palette className="h-12 w-12 text-purple-400 dark:text-purple-500" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Palette className="h-4 w-4 text-purple-600" />
          <CardTitle className="text-sm font-semibold truncate">
            {artwork.title}
          </CardTitle>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <span>by {artistName}</span>
          </div>
          {artwork.price && artwork.currency && (
            <div className="text-xs font-medium">
              {formatPrice(artwork.price, artwork.currency)}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
          {artwork.description.substring(0, 80)}...
        </div>
        <div className={`flex items-center ${saleInfo.color} group-hover:opacity-80 transition-colors`}>
          <span className="text-xs font-medium">{saleInfo.label === 'View' ? 'View artwork' : saleInfo.label}</span>
          <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
}

function ThumbnailSkeleton() {
  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
      {/* Potential image area */}
      <div className="aspect-video">
        <Skeleton className="w-full h-full" />
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </CardContent>
    </Card>
  );
}



const Index = () => {
  const { data: adminNotes, isLoading: notesLoading, error: notesError } = useLatestAdminNotes(3);
  const { data: latestCards, isLoading: cardsLoading, error: cardsError } = useLatestCards(3);
  const { data: featuredArtworks, isLoading: artworksLoading, error: artworksError } = useArtworks('all');
  const author = useAuthor(ADMIN_HEX);
  const metadata: NostrMetadata | undefined = author.data?.metadata;

  const displayName = metadata?.name ?? genUserName(ADMIN_HEX);

  // Get first 3 artworks for featured section
  const featuredArtworksList = featuredArtworks?.slice(0, 3) || [];

  useSeoMeta({
    title: 'BitPopArt - Good Vibes Digital Cards',
    description: 'Create and share beautiful digital cards for any occasion. Discover the latest updates and featured cards from BitPopArt.',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Link to="/canvas">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Painting
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full">
              <Link to="/shop">
                <Gift className="mr-2 h-5 w-5" />
                Visit Shop
              </Link>
            </Button>
          </div>
        </div>

        {/* Featured Art Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Art</h2>
              <p className="text-gray-600 dark:text-gray-300">
                By BitPopArt
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/art" className="flex items-center space-x-2">
                <Palette className="h-4 w-4" />
                <span>Browse Gallery</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {artworksError && (
            <Card className="border-dashed border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
              <CardContent className="py-8 px-6 text-center">
                <div className="max-w-sm mx-auto space-y-4">
                  <Palette className="h-8 w-8 mx-auto text-purple-500" />
                  <div>
                    <CardTitle className="text-purple-600 dark:text-purple-400 mb-2 text-lg">
                      Unable to Load Artworks
                    </CardTitle>
                    <CardDescription>
                      Try switching to a different relay to discover artworks.
                    </CardDescription>
                  </div>
                  <RelaySelector className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {artworksLoading && (
            <div className="grid md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <ThumbnailSkeleton key={i} />
              ))}
            </div>
          )}

          {featuredArtworksList.length === 0 && !artworksLoading && !artworksError && (
            <Card className="border-dashed">
              <CardContent className="py-8 px-6 text-center">
                <div className="max-w-sm mx-auto space-y-4">
                  <Palette className="h-8 w-8 mx-auto text-gray-400" />
                  <div>
                    <CardTitle className="mb-2">No Artworks Found</CardTitle>
                    <CardDescription>
                      No artworks found yet. Try switching to a different relay or explore the art gallery!
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <RelaySelector className="flex-1" />
                    <Button size="sm" asChild>
                      <Link to="/art">Browse Gallery</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {featuredArtworksList.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6">
              {featuredArtworksList.map((artwork, index) => {
                const naddr = nip19.naddrEncode({
                  identifier: artwork.id,
                  pubkey: artwork.artist_pubkey,
                  kind: 30023,
                });

                return (
                  <Link
                    key={artwork.id}
                    to={`/art/${naddr}`}
                    className="block animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ArtworkThumbnail artwork={artwork} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Latest Cards Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Cards</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Send a positive vibe to someone
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/cards" className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Browse All</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {cardsError && (
            <Card className="border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
              <CardContent className="py-8 px-6 text-center">
                <div className="max-w-sm mx-auto space-y-4">
                  <CreditCard className="h-8 w-8 mx-auto text-blue-500" />
                  <div>
                    <CardTitle className="text-blue-600 dark:text-blue-400 mb-2 text-lg">
                      Unable to Load Cards
                    </CardTitle>
                    <CardDescription>
                      Try switching to a different relay to discover cards.
                    </CardDescription>
                  </div>
                  <RelaySelector className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {cardsLoading && (
            <div className="grid md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <ThumbnailSkeleton key={i} />
              ))}
            </div>
          )}

          {latestCards && latestCards.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 px-6 text-center">
                <div className="max-w-sm mx-auto space-y-4">
                  <CreditCard className="h-8 w-8 mx-auto text-gray-400" />
                  <div>
                    <CardTitle className="mb-2">No Cards Found</CardTitle>
                    <CardDescription>
                      No cards found yet. Try switching to a different relay or create the first card!
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <RelaySelector className="flex-1" />
                    <Button size="sm" asChild>
                      <Link to="/cards">Send Card</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {latestCards && latestCards.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6">
              {latestCards.map((card, index) => {
                const naddr = nip19.naddrEncode({
                  identifier: card.id,
                  pubkey: card.event.pubkey,
                  kind: card.event.kind,
                });

                return (
                  <Link
                    key={card.id}
                    to={`/card/${naddr}`}
                    className="block animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardThumbnail card={card} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Latest Updates Section */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Nostr News</h2>
              <p className="text-gray-600 dark:text-gray-300">
                From BitPopArt
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/feed" className="flex items-center space-x-2">
                <Rss className="h-4 w-4" />
                <span>View All</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {notesError && (
            <Card className="border-dashed border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
              <CardContent className="py-8 px-6 text-center">
                <div className="max-w-sm mx-auto space-y-4">
                  <MessageSquare className="h-8 w-8 mx-auto text-orange-500" />
                  <div>
                    <CardTitle className="text-orange-600 dark:text-orange-400 mb-2 text-lg">
                      Unable to Load Updates
                    </CardTitle>
                    <CardDescription>
                      Try switching to a different relay to see the latest updates.
                    </CardDescription>
                  </div>
                  <RelaySelector className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {notesLoading && (
            <div className="grid md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <ThumbnailSkeleton key={i} />
              ))}
            </div>
          )}

          {adminNotes && adminNotes.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 px-6 text-center">
                <div className="max-w-sm mx-auto space-y-4">
                  <MessageSquare className="h-8 w-8 mx-auto text-gray-400" />
                  <div>
                    <CardTitle className="mb-2">No Updates Found</CardTitle>
                    <CardDescription>
                      No recent updates found. Try switching to a different relay.
                    </CardDescription>
                  </div>
                  <RelaySelector className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {adminNotes && adminNotes.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6">
              {adminNotes.map((note, index) => (
                <Link
                  key={note.id}
                  to="/feed"
                  className="block animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <NoteThumbnail event={note} />
                </Link>
              ))}
            </div>
          )}
        </div>



        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>Good Vibes cards by BitPopArt</p>
          <p className="mt-2">
            Vibed with <a href="https://soapbox.pub/mkstack" className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">MKStack</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;