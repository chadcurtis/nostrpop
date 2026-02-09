import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { FundraiserData } from '@/lib/fundraiserTypes';

/**
 * Hook to fetch all active fundraisers
 */
export function useFundraisers() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['fundraisers'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ kinds: [38178], '#t': ['fundraiser'], limit: 50 }],
        { signal }
      );

      // Transform events to FundraiserData
      const fundraisers: FundraiserData[] = events.map(event => {
        const content = JSON.parse(event.content);
        const dTag = event.tags.find(t => t[0] === 'd')?.[1] || '';
        const title = event.tags.find(t => t[0] === 'title')?.[1] || content.title || 'Untitled';
        const goalTag = event.tags.find(t => t[0] === 'goal')?.[1];
        const goal_sats = goalTag ? parseInt(goalTag) : content.goal_sats || 0;
        const thumbnail = event.tags.find(t => t[0] === 'image')?.[1] || content.thumbnail || '';
        const deadline = event.tags.find(t => t[0] === 'deadline')?.[1] || content.deadline;
        const statusTag = event.tags.find(t => t[0] === 'status')?.[1] || content.status || 'active';

        return {
          id: dTag,
          event,
          title,
          description: content.description || '',
          goal_sats,
          thumbnail,
          author_pubkey: event.pubkey,
          created_at: new Date(event.created_at * 1000).toISOString(),
          deadline,
          status: statusTag as 'active' | 'completed' | 'cancelled',
        };
      });

      // Sort by created_at (newest first)
      return fundraisers.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });
}

/**
 * Hook to fetch contributions for a specific fundraiser
 */
export function useFundraiserContributions(fundraiserId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['fundraiser-contributions', fundraiserId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ kinds: [38179], '#f': [fundraiserId], limit: 200 }],
        { signal }
      );

      // Transform events to contribution data
      const contributions = events.map(event => {
        const content = JSON.parse(event.content);
        const amountTag = event.tags.find(t => t[0] === 'amount')?.[1];
        const amount_sats = amountTag ? parseInt(amountTag) : content.amount_sats || 0;

        return {
          fundraiser_id: fundraiserId,
          contributor_npub: event.pubkey,
          contributor_name: content.contributor_name,
          amount_sats,
          message: content.message,
          payment_proof: content.payment_proof,
          contributed_at: new Date(event.created_at * 1000).toISOString(),
          event,
        };
      });

      // Sort by amount (highest first)
      return contributions.sort((a, b) => b.amount_sats - a.amount_sats);
    },
    enabled: !!fundraiserId,
  });
}
