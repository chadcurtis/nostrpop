import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RelaySelector } from '@/components/RelaySelector';
import { LoginArea } from '@/components/auth/LoginArea';
import { CardItem } from './CardItem';
import { Sparkles } from 'lucide-react';

interface CardData {
  title: string;
  description: string;
  category: string;
  pricing: string;
  images: string[];
  created_at: string;
}

interface CardListProps {
  showMyCards?: boolean;
}

export function CardList({ showMyCards = false }: CardListProps) {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();

  const { data: allCards, isLoading, refetch } = useQuery({
    queryKey: ['all-cards'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
      const events = await nostr.query([
        {
          kinds: [30402],
          '#t': ['ecard'],
          limit: 100
        }
      ], { signal });

      return events
        .map(event => {
          try {
            const content = JSON.parse(event.content) as CardData;
            // For addressable events, use the d tag as the identifier
            const dTag = event.tags.find(([name]) => name === 'd')?.[1];
            return {
              id: dTag || event.id, // Use d tag if available, fallback to event id
              ...content,
              event
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b!.created_at).getTime() - new Date(a!.created_at).getTime());
    },
  });

  // Filter cards based on the view mode
  const cards = showMyCards && user
    ? allCards?.filter(card => card?.event.pubkey === user.pubkey)
    : allCards;



  if (showMyCards && !user) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <Sparkles className="h-12 w-12 mx-auto text-purple-500" />
            <div>
              <h3 className="text-lg font-semibold mb-2">View Your Cards</h3>
              <p className="text-muted-foreground">
                Log in to see all the beautiful cards you've created.
              </p>
            </div>
            <LoginArea className="w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-video">
              <Skeleton className="w-full h-full" />
            </div>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!cards) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <p className="text-muted-foreground">
              Failed to load your cards. Try another relay?
            </p>
            <RelaySelector className="w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cards && cards.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <div className="max-w-sm mx-auto space-y-6">
            <Sparkles className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {showMyCards ? "No Cards Yet" : "No Cards Found"}
              </h3>
              <p className="text-muted-foreground">
                {showMyCards
                  ? "You haven't created any cards yet. Start by creating your first beautiful POP card!"
                  : "No cards have been created yet. Be the first to create a beautiful POP card!"
                }
              </p>
            </div>
            {!showMyCards && (
              <RelaySelector className="w-full" />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {showMyCards ? `My Cards (${cards.length})` : `All Cards (${cards.length})`}
        </h2>
        {!showMyCards && (
          <RelaySelector />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <CardItem
            key={card!.id}
            card={card!}
            showAuthor={!showMyCards}
            onRefetch={refetch}
          />
        ))}
      </div>
    </div>
  );
}