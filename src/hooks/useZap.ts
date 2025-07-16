import { useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useLNURL } from '@/hooks/useLNURL';
import { useToast } from '@/hooks/useToast';

interface ZapOptions {
  recipientPubkey: string;
  amount: number; // in sats
  comment?: string;
  eventId?: string; // For zapping specific events
  relays?: string[];
}

export function useZap(lightningAddress?: string) {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { lnurlData, supportsZaps, getZapInvoice, payInvoice, isProcessing } = useLNURL(lightningAddress);
  const { toast } = useToast();
  const [isZapping, setIsZapping] = useState(false);

  const sendZap = async (options: ZapOptions): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send zaps.",
        variant: "destructive"
      });
      return false;
    }

    if (!lightningAddress) {
      toast({
        title: "No Lightning Address",
        description: "Recipient doesn't have a lightning address configured.",
        variant: "destructive"
      });
      return false;
    }

    if (!lnurlData) {
      toast({
        title: "LNURL Not Available",
        description: "Could not load lightning payment data.",
        variant: "destructive"
      });
      return false;
    }

    setIsZapping(true);

    try {
      let zapRequest: string | undefined;

      // Create zap request if Nostr zaps are supported
      if (supportsZaps && lnurlData.nostrPubkey) {
        const zapRequestEvent = {
          kind: 9734,
          content: options.comment || '',
          tags: [
            ['relays', ...(options.relays || ['wss://relay.nostr.band'])],
            ['amount', (options.amount * 1000).toString()], // Convert to millisats
            ['lnurl', lightningAddress],
            ['p', options.recipientPubkey],
          ],
          pubkey: user.pubkey,
          created_at: Math.floor(Date.now() / 1000),
        };

        // Add event reference if zapping a specific event
        if (options.eventId) {
          zapRequestEvent.tags.push(['e', options.eventId]);
        }

        // Sign the zap request
        const signedZapRequest = await user.signer.signEvent(zapRequestEvent);
        zapRequest = JSON.stringify(signedZapRequest);

        console.log('Created zap request:', signedZapRequest);
      }

      // Get invoice from LNURL
      const invoice = await getZapInvoice(options.amount, zapRequest);
      
      if (!invoice) {
        return false;
      }

      console.log('Generated invoice:', invoice);

      // Pay the invoice
      await payInvoice(invoice);

      // If we get here, payment was initiated successfully
      toast({
        title: "Zap Sent! ⚡",
        description: `${options.amount} sats zapped successfully!`,
      });

      return true;

    } catch (error) {
      console.error('Zap failed:', error);
      toast({
        title: "Zap Failed",
        description: error instanceof Error ? error.message : "Failed to send zap.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsZapping(false);
    }
  };

  // Create a simple zap request event (for display purposes)
  const createZapRequest = async (options: ZapOptions) => {
    if (!user) return;

    createEvent({
      kind: 9734,
      content: options.comment || `Zap for ${options.amount} sats! ⚡`,
      tags: [
        ['p', options.recipientPubkey],
        ['amount', (options.amount * 1000).toString()],
        ['relays', 'wss://relay.nostr.band'],
        ...(options.eventId ? [['e', options.eventId]] : [])
      ]
    }, {
      onSuccess: () => {
        toast({
          title: "Zap Request Created! ⚡",
          description: `Zap request for ${options.amount} sats created.`,
        });
      },
      onError: (error) => {
        console.error('Zap request error:', error);
        toast({
          title: "Zap Request Failed",
          description: "Failed to create zap request.",
          variant: "destructive"
        });
      }
    });
  };

  return {
    sendZap,
    createZapRequest,
    isZapping: isZapping || isProcessing,
    supportsZaps,
    lnurlData,
    canZap: !!user && !!lightningAddress && !!lnurlData,
  };
}