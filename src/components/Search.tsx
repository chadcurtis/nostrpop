import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search as SearchIcon, Loader2, CreditCard, Palette, FileText, Award, Users } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

interface SearchResult {
  type: 'card' | 'artwork' | 'blog' | 'badge' | 'nostr-project';
  title: string;
  description: string;
  url: string;
  event: NostrEvent;
}

const ADMIN_PUBKEY = '7d33ba57d8a6e8869a1f1d5215254597594ac0dbfeb01b690def8c461b82db35';

export function Search({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const { nostr } = useNostr();
  const [query, setQuery] = useState('');

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: async (c) => {
      if (!query.trim()) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const searchTerm = query.toLowerCase();

      // Search across multiple event kinds
      const events = await nostr.query(
        [
          { kinds: [30311], authors: [ADMIN_PUBKEY], limit: 20 }, // Cards
          { kinds: [30023], authors: [ADMIN_PUBKEY], limit: 20 }, // Artwork & Blog
          { kinds: [38173], authors: [ADMIN_PUBKEY], limit: 20 }, // Badges
          { kinds: [38171], authors: [ADMIN_PUBKEY], limit: 20 }, // Nostr Projects
        ],
        { signal }
      );

      const searchResults: SearchResult[] = events
        .map((event): SearchResult | null => {
          try {
            const content = event.content ? JSON.parse(event.content) : {};
            const title = event.tags.find(t => t[0] === 'title')?.[1] || '';
            const description = content.description || content.message || event.content || '';
            const dTag = event.tags.find(t => t[0] === 'd')?.[1];

            // Filter by search term
            if (!title.toLowerCase().includes(searchTerm) && 
                !description.toLowerCase().includes(searchTerm)) {
              return null;
            }

            // Determine type and URL
            let type: SearchResult['type'];
            let url: string;

            if (event.kind === 30311) {
              type = 'card';
              const naddr = nip19.naddrEncode({
                identifier: dTag || '',
                pubkey: event.pubkey,
                kind: event.kind,
              });
              url = `/card/${naddr}`;
            } else if (event.kind === 30023) {
              const isArtwork = event.tags.some(t => t[0] === 't' && t[1] === 'artwork');
              if (isArtwork) {
                type = 'artwork';
                const naddr = nip19.naddrEncode({
                  identifier: dTag || '',
                  pubkey: event.pubkey,
                  kind: event.kind,
                });
                url = `/art/${naddr}`;
              } else {
                type = 'blog';
                url = `/blog/${dTag}`;
              }
            } else if (event.kind === 38173) {
              type = 'badge';
              url = `/badges#${dTag}`;
            } else if (event.kind === 38171) {
              type = 'nostr-project';
              url = `/nostr-projects/${dTag}`;
            } else {
              return null;
            }

            return {
              type,
              title,
              description: description.substring(0, 150),
              url,
              event,
            };
          } catch {
            return null;
          }
        })
        .filter((r): r is SearchResult => r !== null);

      return searchResults;
    },
    enabled: query.trim().length > 0,
  });

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    onOpenChange(false);
    setQuery('');
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'card': return CreditCard;
      case 'artwork': return Palette;
      case 'blog': return FileText;
      case 'badge': return Award;
      case 'nostr-project': return Users;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'card': return 'Card';
      case 'artwork': return 'Artwork';
      case 'blog': return 'Blog';
      case 'badge': return 'Badge';
      case 'nostr-project': return 'Project';
    }
  };

  const getTypeBadgeVariant = (type: SearchResult['type']) => {
    switch (type) {
      case 'card': return 'default';
      case 'artwork': return 'secondary';
      case 'blog': return 'outline';
      case 'badge': return 'default';
      case 'nostr-project': return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>
            Search cards, artworks, badges, projects, and blog posts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Results */}
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : query.trim() && results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No results found for "{query}"</p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2">
                {results.map((result, index) => {
                  const Icon = getTypeIcon(result.type);
                  return (
                    <Card
                      key={index}
                      className="cursor-pointer hover:bg-accent transition-colors p-4"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                          <Icon className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{result.title}</h3>
                            <Badge variant={getTypeBadgeVariant(result.type)} className="text-xs shrink-0">
                              {getTypeLabel(result.type)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {result.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Start typing to search...</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
