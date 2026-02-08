import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { BadgeData, BadgePurchase } from '@/lib/badgeTypes';

const ADMIN_PUBKEY = '7d33ba57d8a6e8869a1f1d5215254597594ac0dbfeb01b690def8c461b82db35';

/**
 * Fetch all active badges
 */
export function useBadges() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['badges'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query(
        [{ kinds: [38173], authors: [ADMIN_PUBKEY], limit: 50 }],
        { signal }
      );

      const badges: BadgeData[] = events
        .map((event): BadgeData | null => {
          try {
            const content = JSON.parse(event.content);
            const id = event.tags.find(t => t[0] === 'd')?.[1];
            const title = event.tags.find(t => t[0] === 'title')?.[1];
            const status = event.tags.find(t => t[0] === 'status')?.[1] as 'active' | 'sold_out' | 'archived' || 'active';
            const price = event.tags.find(t => t[0] === 'price')?.[1];
            const imageUrl = event.tags.find(t => t[0] === 'image')?.[1];
            const featured = event.tags.find(t => t[0] === 'featured')?.[1] === 'true';
            
            if (!id || !title || !imageUrl) return null;

            return {
              id,
              event,
              title,
              description: content.description,
              image_url: imageUrl,
              price_sats: price ? parseInt(price) : 0,
              author_pubkey: event.pubkey,
              created_at: new Date(event.created_at * 1000).toISOString(),
              status,
              featured,
            };
          } catch {
            return null;
          }
        })
        .filter((b): b is BadgeData => b !== null && b.status === 'active')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return badges;
    },
  });
}

/**
 * Fetch a single badge by ID
 */
export function useBadge(badgeId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['badge', badgeId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query(
        [{ kinds: [38173], authors: [ADMIN_PUBKEY], '#d': [badgeId], limit: 1 }],
        { signal }
      );

      if (events.length === 0) return null;

      const event = events[0];
      try {
        const content = JSON.parse(event.content);
        const id = event.tags.find(t => t[0] === 'd')?.[1];
        const title = event.tags.find(t => t[0] === 'title')?.[1];
        const status = event.tags.find(t => t[0] === 'status')?.[1] as 'active' | 'sold_out' | 'archived' || 'active';
        const price = event.tags.find(t => t[0] === 'price')?.[1];
        const imageUrl = event.tags.find(t => t[0] === 'image')?.[1];

        if (!id || !title || !imageUrl) return null;

        return {
          id,
          event,
          title,
          description: content.description,
          image_url: imageUrl,
          price_sats: price ? parseInt(price) : 0,
          author_pubkey: event.pubkey,
          created_at: new Date(event.created_at * 1000).toISOString(),
          status,
        } as BadgeData;
      } catch {
        return null;
      }
    },
  });
}

/**
 * Fetch purchases for a badge
 */
export function useBadgePurchases(badgeId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['badge-purchases', badgeId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query(
        [{ kinds: [38174], '#b': [badgeId], limit: 500 }],
        { signal }
      );

      const purchases: BadgePurchase[] = events
        .map((event): BadgePurchase | null => {
          try {
            const content = JSON.parse(event.content);
            const badgeIdTag = event.tags.find(t => t[0] === 'b')?.[1];
            const npub = event.tags.find(t => t[0] === 'npub')?.[1];

            if (!badgeIdTag || !npub) return null;

            return {
              badge_id: badgeIdTag,
              buyer_npub: npub,
              payment_proof: content.payment_proof,
              purchased_at: new Date(event.created_at * 1000).toISOString(),
              event,
            };
          } catch {
            return null;
          }
        })
        .filter((p): p is BadgePurchase => p !== null)
        .sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime());

      return purchases;
    },
  });
}
