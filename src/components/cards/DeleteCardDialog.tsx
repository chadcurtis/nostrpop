import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { isAllowedCreator } from '@/config/creators';
import { Trash2, Loader2 } from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';



interface DeleteCardDialogProps {
  cardEvent: NostrEvent;
  cardTitle: string;
  onCardDeleted?: () => void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteCardDialog({ cardEvent, cardTitle, onCardDeleted, children, open, onOpenChange }: DeleteCardDialogProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  // Check if current user is allowed to delete cards
  const canDeleteCards = user && isAllowedCreator(user.pubkey);

  const deleteCard = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to delete cards.",
        variant: "destructive"
      });
      return;
    }

    // Check if user owns this card and is allowed to delete
    if (cardEvent.pubkey !== user.pubkey) {
      toast({
        title: "Permission Denied",
        description: "You can only delete your own cards.",
        variant: "destructive"
      });
      return;
    }

    if (!canDeleteCards) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to delete cards.",
        variant: "destructive"
      });
      return;
    }

    // Get the original 'd' tag value
    const dTag = cardEvent.tags.find(([name]) => name === 'd')?.[1];
    if (!dTag) {
      toast({
        title: "Error",
        description: "Card identifier not found.",
        variant: "destructive"
      });
      return;
    }

    // Create a deletion event (kind 5) according to NIP-09
    createEvent({
      kind: 5,
      content: 'Card deleted by user',
      tags: [
        ['e', cardEvent.id], // Reference to the event being deleted
        ['a', `30402:${cardEvent.pubkey}:${dTag}`] // Reference to addressable event
      ]
    }, {
      onSuccess: () => {
        toast({
          title: "Card Deleted! 🗑️",
          description: "Your card has been successfully deleted.",
        });
        setIsOpen(false);
        onCardDeleted?.();
      },
      onError: (error) => {
        toast({
          title: "Delete Failed",
          description: "Failed to delete card. Please try again.",
          variant: "destructive"
        });
        console.error('Card deletion error:', error);
      }
    });
  };

  // Only show delete option if user owns the card and is allowed to delete
  if (!user || cardEvent.pubkey !== user.pubkey || !canDeleteCards) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger>
        {children || (
          <Button>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Delete Card
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{cardTitle}"? This action cannot be undone and will permanently remove your card from the network.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={deleteCard}
            disabled={isPending}
            className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Card
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}