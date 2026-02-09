import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Share2, ExternalLink, Sparkles, Check } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import type { NostrEvent } from '@nostrify/nostrify';
import {
  CLAWSTR_SUBCLAWS,
  formatArtworkForClawstr,
  formatProjectForClawstr,
  formatFundraiserForClawstr,
  formatPopupForClawstr,
  formatProductForClawstr,
  createCustomClawstrPost,
} from '@/lib/clawstr';

interface ClawstrShareProps {
  event: NostrEvent;
  contentType: 'artwork' | 'project' | 'fundraiser' | 'popup' | 'product' | 'custom';
  defaultContent?: string;
  trigger?: React.ReactNode;
}

export function ClawstrShare({ event, contentType, defaultContent, trigger }: ClawstrShareProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSubclaw, setSelectedSubclaw] = useState<string>('art');
  const [customContent, setCustomContent] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [publishedEventId, setPublishedEventId] = useState<string | null>(null);
  
  const { user } = useCurrentUser();
  const { mutate: publishEvent, isPending } = useNostrPublish();

  // Get formatted content for preview
  const getFormattedContent = () => {
    if (customContent) return customContent;
    
    switch (contentType) {
      case 'artwork':
        return formatArtworkForClawstr(event, selectedSubclaw).content || '';
      case 'project':
        return formatProjectForClawstr(event, selectedSubclaw).content || '';
      case 'fundraiser':
        return formatFundraiserForClawstr(event, selectedSubclaw).content || '';
      case 'popup':
        return formatPopupForClawstr(event, selectedSubclaw).content || '';
      case 'product':
        return formatProductForClawstr(event, selectedSubclaw).content || '';
      case 'custom':
        return defaultContent || '';
      default:
        return '';
    }
  };

  const handleShare = () => {
    if (!user) {
      alert('Please login to share to Clawstr');
      return;
    }

    let clawstrEvent: Partial<NostrEvent>;

    if (customContent) {
      clawstrEvent = createCustomClawstrPost(
        customContent,
        selectedSubclaw,
        ['bitpopart']
      );
    } else {
      switch (contentType) {
        case 'artwork':
          clawstrEvent = formatArtworkForClawstr(event, selectedSubclaw);
          break;
        case 'project':
          clawstrEvent = formatProjectForClawstr(event, selectedSubclaw);
          break;
        case 'fundraiser':
          clawstrEvent = formatFundraiserForClawstr(event, selectedSubclaw);
          break;
        case 'popup':
          clawstrEvent = formatPopupForClawstr(event, selectedSubclaw);
          break;
        case 'product':
          clawstrEvent = formatProductForClawstr(event, selectedSubclaw);
          break;
        case 'custom':
          clawstrEvent = createCustomClawstrPost(
            defaultContent || '',
            selectedSubclaw,
            ['bitpopart']
          );
          break;
        default:
          return;
      }
    }

    publishEvent(clawstrEvent, {
      onSuccess: (publishedEvent) => {
        console.log('✅ Published to Clawstr:', publishedEvent);
        setIsSuccess(true);
        setPublishedEventId(publishedEvent.id);
      },
      onError: (error) => {
        console.error('Failed to share to Clawstr:', error);
        alert('Failed to share to Clawstr. Please try again.');
      },
    });
  };

  const selectedSubclawData = CLAWSTR_SUBCLAWS.find(s => s.id === selectedSubclaw);
  const previewContent = getFormattedContent();
  
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setIsSuccess(false);
      setPublishedEventId(null);
      setCustomContent('');
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Sparkles className="mr-2 h-4 w-4" />
            Share to Clawstr
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            {isSuccess ? 'Successfully Shared!' : 'Share to Clawstr'}
          </DialogTitle>
          <DialogDescription>
            {isSuccess 
              ? 'Your post has been published to Clawstr'
              : `Share this ${contentType} with the Clawstr AI agent community`
            }
          </DialogDescription>
        </DialogHeader>

        {!user && !isSuccess && (
          <Alert>
            <AlertDescription>
              Please login with Nostr to share to Clawstr
            </AlertDescription>
          </Alert>
        )}

        {isSuccess && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600 dark:text-green-400">
              <div className="space-y-3">
                <p className="font-semibold">Successfully shared to Clawstr!</p>
                <div className="flex flex-col gap-2">
                  <a
                    href={selectedSubclawData?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View in {selectedSubclawData?.icon} {selectedSubclawData?.name} subclaw
                  </a>
                  {publishedEventId && user?.pubkey && (
                    <a
                      href={`https://snort.social/e/${publishedEventId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Nostr (Snort)
                    </a>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {isSuccess && (
            <div className="flex gap-2 pt-2">
              <Button onClick={handleClose} className="flex-1">
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSuccess(false);
                  setPublishedEventId(null);
                  setSelectedSubclaw('art');
                  setCustomContent('');
                }}
              >
                Share Another
              </Button>
            </div>
          )}

          {!isSuccess && (
          <>
          <div>
            <Label htmlFor="subclaw">Select Subclaw</Label>
            <Select value={selectedSubclaw} onValueChange={setSelectedSubclaw}>
              <SelectTrigger id="subclaw" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLAWSTR_SUBCLAWS.map((subclaw) => (
                  <SelectItem key={subclaw.id} value={subclaw.id}>
                    <div className="flex items-center gap-2">
                      <span>{subclaw.icon}</span>
                      <div>
                        <div className="font-medium">{subclaw.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {subclaw.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSubclawData && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {selectedSubclawData.icon} /c/{selectedSubclawData.id}
                </Badge>
                <a
                  href={selectedSubclawData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:underline flex items-center gap-1"
                >
                  View subclaw
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="content">Post Content</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              Edit the content below or use the auto-generated version
            </p>
            <Textarea
              id="content"
              value={customContent || previewContent}
              onChange={(e) => setCustomContent(e.target.value)}
              rows={12}
              className="font-mono text-sm"
              placeholder="Post content..."
            />
            {customContent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCustomContent('')}
                className="mt-2"
              >
                Reset to auto-generated
              </Button>
            )}
          </div>

          <div className="bg-muted p-3 rounded-lg space-y-2 text-xs">
            <div className="font-semibold">Post Metadata:</div>
            <div>
              <span className="text-muted-foreground">Kind:</span> 1111 (Clawstr post)
            </div>
            <div>
              <span className="text-muted-foreground">Subclaw:</span> {selectedSubclawData?.name}
            </div>
            <div>
              <span className="text-muted-foreground">Tags:</span> AI agent, BitPopArt, {contentType}
            </div>
            <div>
              <span className="text-muted-foreground">References:</span> Original event ID
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleShare}
              disabled={isPending || !user || isSuccess}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isPending ? (
                'Sharing...'
              ) : isSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Shared!
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share to Clawstr
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

          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            <p>
              Powered by{' '}
              <a
                href="https://clawstr.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 hover:underline"
              >
                Clawstr
              </a>
              {' '}• Social network for AI agents on Nostr
            </p>
          </div>
          </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
