import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useZap } from '@/hooks/useZap';
import { useToast } from '@/hooks/useToast';
import { Share2, Send, Mail, Zap, Copy, Loader2 } from 'lucide-react';
import { nip19 } from 'nostr-tools';

interface ShareCardDialogProps {
  cardId: string;
  cardTitle: string;
  cardAuthor: string;
  cardUrl?: string;
  children: React.ReactNode;
}

export function ShareCardDialog({ cardId, cardTitle, cardAuthor, cardUrl, children }: ShareCardDialogProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();

  // LNURL integration for zaps
  const lightningAddress = 'bitpopart@getalby.com';
  const { sendZap, isZapping, supportsZaps, canZap } = useZap(lightningAddress);

  const [dmRecipient, setDmRecipient] = useState('');
  const [dmMessage, setDmMessage] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [zapAmount, setZapAmount] = useState('1000'); // Default 1000 sats
  const [zapMessage, setZapMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const shareUrl = cardUrl || `${window.location.origin}/card/${cardId}`;

  const sendDirectMessage = async () => {
    if (!user || !dmRecipient.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a recipient's npub or pubkey.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Decode npub if provided, otherwise assume it's a hex pubkey
      let recipientPubkey = dmRecipient.trim();
      if (recipientPubkey.startsWith('npub')) {
        const decoded = nip19.decode(recipientPubkey);
        if (decoded.type !== 'npub') {
          throw new Error('Invalid npub format');
        }
        recipientPubkey = decoded.data;
      }

      // Validate hex pubkey format
      if (!/^[0-9a-f]{64}$/i.test(recipientPubkey)) {
        throw new Error('Invalid pubkey format');
      }

      const messageContent = dmMessage.trim() || `Check out this beautiful POP card: "${cardTitle}"`;
      const fullMessage = `${messageContent}\n\n🎨 ${shareUrl}`;

      // Check if signer supports NIP-44 encryption
      if (!user.signer.nip44) {
        toast({
          title: "Encryption Not Supported",
          description: "Please upgrade your signer extension to support NIP-44 encryption for direct messages.",
          variant: "destructive"
        });
        return;
      }

      // Encrypt the message using NIP-44
      const encryptedContent = await user.signer.nip44.encrypt(recipientPubkey, fullMessage);

      // Create NIP-17 style DM (kind 14) - this would need to be wrapped in gift wrap
      // For simplicity, we'll use the older NIP-04 style for now
      createEvent({
        kind: 4,
        content: encryptedContent,
        tags: [
          ['p', recipientPubkey]
        ]
      }, {
        onSuccess: () => {
          toast({
            title: "Message Sent! 📨",
            description: "Your card has been shared via direct message.",
          });
          setDmRecipient('');
          setDmMessage('');
          setIsOpen(false);
        },
        onError: (error) => {
          console.error('DM send error:', error);
          toast({
            title: "Send Failed",
            description: "Failed to send direct message. Please try again.",
            variant: "destructive"
          });
        }
      });
    } catch (error) {
      console.error('DM preparation error:', error);
      toast({
        title: "Invalid Recipient",
        description: "Please enter a valid npub or hex pubkey.",
        variant: "destructive"
      });
    }
  };

  const sendEmail = () => {
    if (!emailRecipient.trim()) {
      toast({
        title: "Missing Email",
        description: "Please enter an email address.",
        variant: "destructive"
      });
      return;
    }

    const subject = encodeURIComponent(`Check out this beautiful POP card: "${cardTitle}"`);
    const body = encodeURIComponent(
      `${emailMessage.trim() || 'I wanted to share this beautiful POP card with you!'}\n\n` +
      `🎨 Card: "${cardTitle}"\n` +
      `🔗 View it here: ${shareUrl}\n\n` +
      `Created with POP Cards`
    );

    const mailtoUrl = `mailto:${emailRecipient}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');

    toast({
      title: "Email Client Opened! 📧",
      description: "Your email client should open with the card link.",
    });

    setEmailRecipient('');
    setEmailMessage('');
  };

  const handleZap = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to send zaps.",
        variant: "destructive"
      });
      return;
    }

    const amount = parseInt(zapAmount);
    if (isNaN(amount) || amount < 1) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid zap amount in sats.",
        variant: "destructive"
      });
      return;
    }

    const zapContent = zapMessage.trim() || `Zap for your amazing POP card: "${cardTitle}"! ⚡`;

    const success = await sendZap({
      recipientPubkey: cardAuthor,
      amount,
      comment: zapContent,
      eventId: cardId,
      relays: ['wss://relay.nostr.band']
    });

    if (success) {
      setZapAmount('1000');
      setZapMessage('');
      setIsOpen(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied! 📋",
        description: "Card link copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard.",
        variant: "destructive"
      });
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Beautiful Ecard: ${cardTitle}`,
          text: 'Check out this amazing POP card!',
          url: shareUrl
        });
      } catch {
        // User cancelled sharing
      }
    } else {
      copyToClipboard();
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Card
          </DialogTitle>
          <DialogDescription>
            Share "{cardTitle}" with friends and family, or show appreciation to the creator.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="dm">DM</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="zap">Zap</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Share Link</CardTitle>
                <CardDescription>
                  Copy the link or use native sharing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1"
                  />
                  <Button onClick={copyToClipboard} variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={shareNative} className="flex-1">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  <Button onClick={copyToClipboard} variant="outline" className="flex-1">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dm" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Send Direct Message</CardTitle>
                <CardDescription>
                  Send this card privately via Nostr DM
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dm-recipient">Recipient (npub or pubkey)</Label>
                  <Input
                    id="dm-recipient"
                    placeholder="npub1... or hex pubkey"
                    value={dmRecipient}
                    onChange={(e) => setDmRecipient(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dm-message">Message (optional)</Label>
                  <Textarea
                    id="dm-message"
                    placeholder="Add a personal message..."
                    value={dmMessage}
                    onChange={(e) => setDmMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={sendDirectMessage}
                  disabled={isPending || !user}
                  className="w-full"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send DM
                    </>
                  )}
                </Button>
                {!user && (
                  <p className="text-sm text-muted-foreground text-center">
                    Please log in to send direct messages
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Share via Email</CardTitle>
                <CardDescription>
                  Send this card link via email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-recipient">Email Address</Label>
                  <Input
                    id="email-recipient"
                    type="email"
                    placeholder="friend@example.com"
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-message">Message (optional)</Label>
                  <Textarea
                    id="email-message"
                    placeholder="Add a personal message..."
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={sendEmail} className="w-full">
                  <Mail className="mr-2 h-4 w-4" />
                  Open Email Client
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="zap" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Zap the Creator</CardTitle>
                <CardDescription>
                  Show appreciation with a lightning tip
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="zap-amount">Amount (sats)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="zap-amount"
                      type="number"
                      placeholder="1000"
                      value={zapAmount}
                      onChange={(e) => setZapAmount(e.target.value)}
                      min="1"
                    />
                    <div className="flex gap-1">
                      {['100', '1000', '5000'].map((amount) => (
                        <Button
                          key={amount}
                          variant="outline"
                          size="sm"
                          onClick={() => setZapAmount(amount)}
                        >
                          {amount}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zap-message">Message (optional)</Label>
                  <Textarea
                    id="zap-message"
                    placeholder="Great card! ⚡"
                    value={zapMessage}
                    onChange={(e) => setZapMessage(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>⚡ Lightning Zaps Enabled!</strong> This will send a real lightning payment to <code className="bg-green-100 dark:bg-green-800 px-1 rounded">{lightningAddress}</code>
                    {supportsZaps ? ' with Nostr zap receipt.' : '.'}
                  </p>
                </div>
                <Button
                  onClick={handleZap}
                  disabled={isZapping || !canZap}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  {isZapping ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Zap...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Send Lightning Zap ⚡
                    </>
                  )}
                </Button>
                {!canZap && (
                  <p className="text-sm text-muted-foreground text-center">
                    {!user ? 'Please log in to send zaps' : 'Lightning wallet not available'}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}