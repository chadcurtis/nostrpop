import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useZap } from '@/hooks/useZap';
import { useToast } from '@/hooks/useToast';
import { Zap, Loader2 } from 'lucide-react';

interface ZapButtonProps {
  recipientPubkey: string;
  eventId?: string;
  eventTitle?: string;
  className?: string;
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function ZapButton({
  recipientPubkey,
  eventId,
  eventTitle,
  className,
  children,
  variant = 'outline',
  size = 'default'
}: ZapButtonProps) {
  const { user } = useCurrentUser();
  const { toast } = useToast();

  // LNURL integration for zaps
  const lightningAddress = 'bitpopart@getalby.com';
  const { sendZap, isZapping, supportsZaps, canZap } = useZap(lightningAddress);

  const [isOpen, setIsOpen] = useState(false);
  const [zapAmount, setZapAmount] = useState('1000');
  const [zapMessage, setZapMessage] = useState('');

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

    const zapContent = zapMessage.trim() || (eventTitle ? `Zap for "${eventTitle}"! ⚡` : 'Great POP card! ⚡');

    const success = await sendZap({
      recipientPubkey,
      amount,
      comment: zapContent,
      eventId,
      relays: ['wss://relay.nostr.band']
    });

    if (success) {
      setZapAmount('1000');
      setZapMessage('');
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        {children || (
          <Button
            variant={variant}
            size={size}
            className={className}
          >
            <Zap className="h-4 w-4 mr-2" />
            Zap
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Send Lightning Zap
          </DialogTitle>
          <DialogDescription>
            Send a lightning tip{eventTitle ? ` for "${eventTitle}"` : ''} to show appreciation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount Input */}
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
                className="flex-1"
              />
              <div className="flex gap-1">
                {['100', '1000', '5000', '10000'].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setZapAmount(amount)}
                    className="px-2"
                  >
                    {amount}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <Label htmlFor="zap-message">Message (optional)</Label>
            <Textarea
              id="zap-message"
              placeholder="Great work! ⚡"
              value={zapMessage}
              onChange={(e) => setZapMessage(e.target.value)}
              rows={2}
            />
          </div>

          {/* Lightning Address Info */}
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>⚡ Lightning Zaps Enabled!</strong>
              <br />
              Sending to: <code className="bg-green-100 dark:bg-green-800 px-1 rounded">{lightningAddress}</code>
              {supportsZaps && <><br />✅ Nostr zap receipts supported</>}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleZap}
              disabled={isZapping || !canZap}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              {isZapping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Send {zapAmount} sats
                </>
              )}
            </Button>
          </div>

          {!canZap && (
            <p className="text-sm text-muted-foreground text-center">
              {!user ? 'Please log in to send zaps' : 'Lightning wallet not available'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}