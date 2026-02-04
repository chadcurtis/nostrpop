import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { getArtworksByFilter, getArtworkById, type ArtworkData, type ArtworkFilter } from '@/lib/artTypes';
import { useCurrentUser } from './useCurrentUser';
import { useToast } from './useToast';

export function useArtworks(filter: ArtworkFilter = 'all') {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['artworks', filter],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Query for artwork events (kind 30023 - Long-form content for art)
      const filters = [
        {
          kinds: [30023], // NIP-23 long-form content adapted for artwork
          '#t': ['artwork'], // Tag to identify artwork posts
          limit: 50,
        }
      ];

      const events = await nostr.query(filters, { signal });

      // Process and validate artwork events
      const artworks = events
        .map(event => {
          try {
            const content = JSON.parse(event.content);
            const dTag = event.tags.find(([name]) => name === 'd')?.[1];
            const titleTag = event.tags.find(([name]) => name === 'title')?.[1];
            const saleTags = event.tags.filter(([name]) => name === 'sale').map(([, value]) => value);
            const featured = event.tags.find(([name]) => name === 'featured')?.[1] === 'true';

            // Basic validation
            if (!dTag || !titleTag || !content.title || !content.images?.length) {
              return null;
            }

            // Determine sale type
            let saleType: ArtworkData['sale_type'] = 'not_for_sale';
            let price: number | undefined;
            let currency: string | undefined;
            let auctionStart: string | undefined;
            let auctionEnd: string | undefined;
            let startingBid: number | undefined;
            let currentBid: number | undefined;

            if (saleTags.includes('fixed') && content.price) {
              saleType = 'fixed';
              price = content.price;
              currency = content.currency || 'BTC';
            } else if (saleTags.includes('auction')) {
              saleType = 'auction';
              startingBid = content.starting_bid;
              currentBid = content.current_bid || content.starting_bid;
              currency = content.currency || 'BTC';
              auctionStart = content.auction_start;
              auctionEnd = content.auction_end;
            } else if (saleTags.includes('sold')) {
              saleType = 'sold';
              price = content.price;
              currency = content.currency || 'BTC';
            }

            return {
              id: dTag,
              event,
              title: content.title,
              description: content.description || '',
              images: content.images || [],
              artist_pubkey: event.pubkey,
              created_at: new Date(event.created_at * 1000).toISOString(),
              sale_type: saleType,
              price,
              currency,
              auction_start: auctionStart,
              auction_end: auctionEnd,
              starting_bid: startingBid,
              current_bid: currentBid,
              shipping: content.shipping ? {
                local_countries: content.shipping.local_countries,
                local_cost: content.shipping.local_cost,
                international_cost: content.shipping.international_cost
              } : undefined,
              medium: content.medium,
              dimensions: content.dimensions,
              year: content.year,
              tags: content.tags || [],
              edition: content.edition,
              certificate_url: content.certificate_url,
              featured
            } as ArtworkData;
          } catch (error) {
            console.warn('Failed to parse artwork event:', error);
            return null;
          }
        })
        .filter(Boolean) as ArtworkData[];

      // Sort by creation date (newest first)
      const sortedArtworks = artworks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // If no artworks found from Nostr events, return sample data for demonstration
      if (sortedArtworks.length === 0) {
        return getArtworksByFilter(filter);
      }

      // Apply filter to Nostr data
      if (filter === 'all') {
        return sortedArtworks;
      }

      return sortedArtworks.filter(artwork => {
        switch (filter) {
          case 'for_sale':
            return artwork.sale_type === 'fixed';
          case 'auction':
            return artwork.sale_type === 'auction';
          case 'sold':
            return artwork.sale_type === 'sold';
          default:
            return true;
        }
      });
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useArtwork(artworkId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['artwork', artworkId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query([
        {
          kinds: [30023],
          '#d': [artworkId],
          '#t': ['artwork'],
          limit: 1
        }
      ], { signal });

      if (events.length === 0) {
        // If no Nostr event found, try sample data
        const sampleArtwork = getArtworkById(artworkId);
        if (!sampleArtwork) {
          throw new Error('Artwork not found');
        }
        return sampleArtwork;
      }

      const event = events[0];
      const content = JSON.parse(event.content);
      const saleTags = event.tags.filter(([name]) => name === 'sale').map(([, value]) => value);

      // Process sale type and pricing
      let saleType: ArtworkData['sale_type'] = 'not_for_sale';
      let price: number | undefined;
      let currency: string | undefined;
      let auctionStart: string | undefined;
      let auctionEnd: string | undefined;
      let startingBid: number | undefined;
      let currentBid: number | undefined;

      if (saleTags.includes('fixed') && content.price) {
        saleType = 'fixed';
        price = content.price;
        currency = content.currency || 'BTC';
      } else if (saleTags.includes('auction')) {
        saleType = 'auction';
        startingBid = content.starting_bid;
        currentBid = content.current_bid || content.starting_bid;
        currency = content.currency || 'BTC';
        auctionStart = content.auction_start;
        auctionEnd = content.auction_end;
      } else if (saleTags.includes('sold')) {
        saleType = 'sold';
        price = content.price;
        currency = content.currency || 'BTC';
      }

      return {
        id: artworkId,
        event,
        title: content.title,
        description: content.description || '',
        images: content.images || [],
        artist_pubkey: event.pubkey,
        created_at: new Date(event.created_at * 1000).toISOString(),
        sale_type: saleType,
        price,
        currency,
        auction_start: auctionStart,
        auction_end: auctionEnd,
        starting_bid: startingBid,
        current_bid: currentBid,
        shipping: content.shipping ? {
          local_countries: content.shipping.local_countries,
          local_cost: content.shipping.local_cost,
          international_cost: content.shipping.international_cost
        } : undefined,
        medium: content.medium,
        dimensions: content.dimensions,
        year: content.year,
        tags: content.tags || [],
        edition: content.edition,
        certificate_url: content.certificate_url
      } as ArtworkData;
    },
    enabled: !!artworkId,
    staleTime: 30000,
  });
}

export function useCreateArtwork() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (artworkData: {
      title: string;
      description: string;
      images: string[];
      saleType: ArtworkData['sale_type'];
      price?: number;
      currency?: string;
      auctionStart?: string;
      auctionEnd?: string;
      startingBid?: number;
      medium?: string;
      dimensions?: string;
      year?: string;
      tags?: string[];
      edition?: string;
      certificateUrl?: string;
      featured?: boolean;
      shipping?: {
        localCountries?: string;
        localShippingCost?: number;
        internationalShippingCost?: number;
      };
    }) => {
      if (!user) {
        throw new Error('User must be logged in to create artwork');
      }

      // Create artwork content
      const content = {
        title: artworkData.title,
        description: artworkData.description,
        images: artworkData.images,
        medium: artworkData.medium,
        dimensions: artworkData.dimensions,
        year: artworkData.year,
        tags: artworkData.tags,
        edition: artworkData.edition,
        certificate_url: artworkData.certificateUrl,
        shipping: artworkData.shipping ? {
          local_countries: artworkData.shipping.localCountries,
          local_cost: artworkData.shipping.localShippingCost,
          international_cost: artworkData.shipping.internationalShippingCost
        } : undefined,
        ...(artworkData.saleType === 'fixed' && {
          price: artworkData.price,
          currency: artworkData.currency
        }),
        ...(artworkData.saleType === 'auction' && {
          starting_bid: artworkData.startingBid,
          current_bid: artworkData.startingBid,
          currency: artworkData.currency,
          auction_start: artworkData.auctionStart,
          auction_end: artworkData.auctionEnd
        })
      };

      // Create tags
      const tags = [
        ['d', `artwork-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`],
        ['title', artworkData.title],
        ['t', 'artwork'],
        ['t', 'art'],
        ...(artworkData.saleType !== 'not_for_sale' ? [['sale', artworkData.saleType]] : []),
        ...(artworkData.featured ? [['featured', 'true']] : []),
        ...(artworkData.tags?.map(tag => ['t', tag.toLowerCase()]) || [])
      ];

      // Add price tags if applicable
      if (artworkData.price && artworkData.currency) {
        tags.push(['price', artworkData.price.toString()]);
        tags.push(['currency', artworkData.currency]);
      }

      const artworkEvent = {
        kind: 30023,
        content: JSON.stringify(content),
        tags,
        created_at: Math.floor(Date.now() / 1000),
      };

      const signedEvent = await user.signer.signEvent(artworkEvent);
      await nostr.event(signedEvent, { signal: AbortSignal.timeout(5000) });

      return { artwork: artworkData, event: signedEvent };
    },
    onSuccess: (data) => {
      toast({
        title: "Artwork Created",
        description: `"${data.artwork.title}" has been added to the gallery.`,
      });

      // Invalidate and refetch artworks
      queryClient.invalidateQueries({ queryKey: ['artworks'] });
    },
    onError: (error) => {
      console.error('Failed to create artwork:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create artwork. Please try again.",
        variant: "destructive"
      });
    },
  });
}

export function useDeleteArtwork() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (artworkId: string) => {
      if (!user) {
        throw new Error('User must be logged in to delete artwork');
      }

      // Create a deletion event (kind 5) for the artwork
      const deletionEvent = {
        kind: 5,
        content: 'Artwork deleted',
        tags: [
          ['a', `30023:${user.pubkey}:${artworkId}`] // Reference to the addressable event
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      const signedEvent = await user.signer.signEvent(deletionEvent);
      await nostr.event(signedEvent, { signal: AbortSignal.timeout(5000) });

      return { artworkId, deletionEvent: signedEvent };
    },
    onSuccess: (data) => {
      toast({
        title: "Artwork Deleted",
        description: "The artwork has been successfully removed from the gallery.",
      });

      // Invalidate and refetch artworks
      queryClient.invalidateQueries({ queryKey: ['artworks'] });
      queryClient.invalidateQueries({ queryKey: ['artwork', data.artworkId] });
    },
    onError: (error) => {
      console.error('Failed to delete artwork:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the artwork. Please try again.",
        variant: "destructive"
      });
    },
  });
}