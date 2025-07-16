import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { Share2, Loader2, Sparkles } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';

interface CardData {
  title: string;
  description: string;
  category: string;
  pricing: string;
  images: string[];
  created_at: string;
}

interface ShareToNostrDialogProps {
  cardEvent: NostrEvent;
  cardData: CardData;
  children: React.ReactNode;
}

export function ShareToNostrDialog({ cardEvent, cardData, children }: ShareToNostrDialogProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const [shareMessage, setShareMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const shareToNostr = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to share to Nostr.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get the d-tag from the card event
      const dTag = cardEvent.tags.find(([name]) => name === 'd')?.[1];
      if (!dTag) {
        throw new Error('Card missing identifier');
      }

      // Generate naddr for the card
      const naddr = nip19.naddrEncode({
        identifier: dTag,
        pubkey: cardEvent.pubkey,
        kind: cardEvent.kind,
      });

      // Create the card URL
      const cardUrl = `${window.location.origin}/card/${naddr}`;

      // Create share message
      const customMessage = shareMessage.trim();
      const isOwnCard = cardEvent.pubkey === user.pubkey;

      let shareContent: string;
      if (customMessage) {
        shareContent = `${customMessage}\n\n🎨 "${cardData.title}"\n${cardUrl}\n\n#ecard #${cardData.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      } else if (isOwnCard) {
        shareContent = `Check out my beautiful ${cardData.category} ecard! 🎨\n\n"${cardData.title}"\n\n${cardUrl}\n\n#ecard #${cardData.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      } else {
        shareContent = `Found this amazing ${cardData.category} ecard! 🎨\n\n"${cardData.title}"\n\n${cardUrl}\n\n#ecard #${cardData.category.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      }

      // Create kind 1 note to share the card
      createEvent({
        kind: 1,
        content: shareContent,
        tags: [
          ['t', 'ecard'],
          ['t', cardData.category.toLowerCase().replace(/[^a-z0-9]/g, '')],
          ['e', cardEvent.id, '', 'mention'], // Reference the card event
          ['a', `${cardEvent.kind}:${cardEvent.pubkey}:${dTag}`, '', 'mention'], // Reference the addressable event
        ]
      }, {
        onSuccess: () => {
          toast({
            title: "Shared to Nostr! 📢",
            description: "The ecard has been shared with the Nostr community.",
          });
          setShareMessage('');
          setIsOpen(false);
        },
        onError: (error) => {
          console.error('Share to Nostr error:', error);
          toast({
            title: "Share Failed",
            description: "Failed to share to Nostr. Please try again.",
            variant: "destructive"
          });
        }
      });
    } catch (error) {
      console.error('Error generating share content:', error);
      toast({
        title: "Share Failed",
        description: "Failed to generate share content. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        {children || (
          <Button>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share to Nostr
          </DialogTitle>
          <DialogDescription>
            Share "{cardData.title}" with the Nostr community as a public note.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Share with Community
            </CardTitle>
            <CardDescription>
              Post this beautiful ecard to your Nostr feed for everyone to see and enjoy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-message">Custom Message (optional)</Label>
              <Textarea
                id="share-message"
                placeholder="Add a personal message when sharing this card... (leave empty for default message)"
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                If left empty, we'll create a nice default message for you.
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
              <p className="text-sm text-purple-800 dark:text-purple-200">
                <strong>📢 Public Share:</strong> This will create a public note on Nostr that all your followers can see, helping to spread joy and showcase beautiful ecards!
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={shareToNostr}
                disabled={isPending || !user}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share to Nostr
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>

            {!user && (
              <p className="text-sm text-muted-foreground text-center">
                Please log in to share to Nostr
              </p>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}