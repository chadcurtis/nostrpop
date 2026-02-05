import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { ProjectData } from '@/lib/projectTypes';

const ADMIN_PUBKEY = '7d33ba57d8a6e8869a1f1d5215254597594ac0dbfeb01b690def8c461b82db35';

export function useFeaturedProjects() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['projects-featured'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query(
        [{ kinds: [36171], authors: [ADMIN_PUBKEY], '#t': ['bitpopart-project'], '#featured': ['true'], limit: 3 }],
        { signal }
      );

      const projects: ProjectData[] = events
        .map((event): ProjectData | null => {
          try {
            const content = JSON.parse(event.content);
            const id = event.tags.find(t => t[0] === 'd')?.[1];
            const name = event.tags.find(t => t[0] === 'name')?.[1] || content.name;
            const thumbnail = event.tags.find(t => t[0] === 'image')?.[1] || content.thumbnail;
            const url = event.tags.find(t => t[0] === 'r')?.[1] || content.url;
            const order = event.tags.find(t => t[0] === 'order')?.[1];
            const featured = event.tags.find(t => t[0] === 'featured')?.[1] === 'true';

            if (!id || !name || !featured) return null;

            return {
              id,
              event,
              name,
              description: content.description || '',
              thumbnail: thumbnail || '',
              url,
              author_pubkey: event.pubkey,
              created_at: new Date(event.created_at * 1000).toISOString(),
              order: order ? parseInt(order) : undefined,
              featured,
            };
          } catch {
            return null;
          }
        })
        .filter((p): p is ProjectData => p !== null)
        .sort((a, b) => (a.order || 999) - (b.order || 999))
        .slice(0, 3); // Only take first 3

      return projects;
    },
  });
}
