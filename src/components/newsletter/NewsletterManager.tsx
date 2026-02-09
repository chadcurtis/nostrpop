import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Send, Loader2 } from 'lucide-react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { format } from 'date-fns';

const _ADMIN_PUBKEY = '7d33ba57d8a6e8869a1f1d5215254597594ac0dbfeb01b690def8c461b82db35';

interface NewsletterSubscriber {
  email: string;
  npub?: string;
  subscribedAt: number;
}

export function NewsletterManager() {
  const { nostr } = useNostr();
  const { mutate: publishEvent } = useNostrPublish();
  const { toast } = useToast();
  
  const [customText, setCustomText] = useState('');
  const [customLinks, setCustomLinks] = useState<{ title: string; url: string }[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Fetch newsletter subscribers
  const { data: subscribers = [], isLoading: loadingSubscribers } = useQuery({
    queryKey: ['newsletter-subscribers'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query(
        [{ kinds: [38177], limit: 500 }],
        { signal }
      );

      const subs: NewsletterSubscriber[] = events
        .map((event): NewsletterSubscriber | null => {
          try {
            const email = event.tags.find(t => t[0] === 'email')?.[1];
            const npub = event.tags.find(t => t[0] === 'npub')?.[1];
            
            if (!email) return null;

            return {
              email,
              npub,
              subscribedAt: event.created_at,
            };
          } catch {
            return null;
          }
        })
        .filter((s): s is NewsletterSubscriber => s !== null)
        .sort((a, b) => b.subscribedAt - a.subscribedAt);

      // Deduplicate by email
      const uniqueSubscribers = subs.filter((sub, index, self) => 
        index === self.findIndex(s => s.email === sub.email)
      );

      return uniqueSubscribers;
    },
  });

  const addLink = () => {
    if (!newLinkTitle || !newLinkUrl) return;
    
    setCustomLinks(prev => [...prev, { title: newLinkTitle, url: newLinkUrl }]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const removeLink = (index: number) => {
    setCustomLinks(prev => prev.filter((_, i) => i !== index));
  };

  const generateEmailHTML = () => {
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BitPopArt Newsletter</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #6366f1 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">🎨 BitPopArt Newsletter</h1>
    <p style="margin: 10px 0 0; opacity: 0.9;">Good Vibes, Bitcoin Art & Nostr Projects</p>
  </div>
  
  <div style="background: white; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none;">
`;

    if (customText) {
      html += `
    <div style="background: #fdf2f8; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #ec4899;">
      <p style="margin: 0; white-space: pre-wrap;">${customText}</p>
    </div>
`;
    }

    // Custom links
    if (customLinks.length > 0) {
      html += `
    <div style="margin: 30px 0; padding: 20px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 15px; color: #92400e;">🔗 Featured Links</h3>
`;
      customLinks.forEach(link => {
        html += `
      <div style="margin: 10px 0;">
        <a href="${link.url}" style="color: #8b5cf6; text-decoration: none; font-weight: 500;">${link.title} →</a>
      </div>
`;
      });
      html += `
    </div>
`;
    }

    html += `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
      <p>You're receiving this because you subscribed to BitPopArt newsletter.</p>
      <p style="margin: 10px 0;">
        <a href="https://bitpopart.github.io/nostrpop/" style="color: #8b5cf6; text-decoration: none;">Visit BitPopArt</a>
      </p>
      <p style="margin: 10px 0 0;">🎨 Good Vibes, Love, Freedom & Joy ⚡</p>
    </div>
  </div>
</body>
</html>
`;
    
    return html;
  };

  const handleSendNewsletter = async () => {
    if (subscribers.length === 0) {
      toast({
        title: 'No subscribers',
        description: 'No newsletter subscribers yet.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      const emailHTML = generateEmailHTML();
      const nostrContent = `📬 BitPopArt Newsletter - ${format(new Date(), 'MMMM d, yyyy')}

${customText || 'Latest updates from BitPopArt!'}

${customLinks.length > 0 ? '\n🔗 FEATURED LINKS\n' + customLinks.map(link => `• ${link.title}: ${link.url}`).join('\n') : ''}

🎨 Visit BitPopArt: https://bitpopart.github.io/nostrpop/

#bitpopart #newsletter #bitcoin #art #nostr`;
      
      // Log email list and HTML for manual sending
      console.log('📧 Newsletter Recipients:', subscribers.map(s => s.email));
      console.log('📧 Email HTML:', emailHTML);
      
      // Publish to Nostr
      publishEvent({
        kind: 1,
        content: nostrContent,
        tags: [
          ['t', 'newsletter'],
          ['t', 'bitpopart'],
          ['t', 'bitcoin'],
          ['t', 'art'],
          ['subject', `BitPopArt Newsletter - ${format(new Date(), 'MMMM d, yyyy')}`],
        ],
      });
      
      toast({
        title: 'Newsletter published!',
        description: `Published to Nostr. Email HTML copied to console for manual sending to ${subscribers.length} subscribers.`,
      });
      
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 5000);
    } catch (error) {
      console.error('Error sending newsletter:', error);
      toast({
        title: 'Failed to publish',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const copyEmailHTML = () => {
    const html = generateEmailHTML();
    navigator.clipboard.writeText(html);
    toast({
      title: 'HTML copied!',
      description: 'Email HTML copied to clipboard. Paste into your email service.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Newsletter Manager</CardTitle>
              <CardDescription>
                Compose and send newsletters to {subscribers.length} subscribers
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="compose" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compose">Compose Newsletter</TabsTrigger>
          <TabsTrigger value="subscribers">
            Subscribers ({subscribers.length})
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-6">
          {/* Custom Text */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Introduction Text</CardTitle>
              <CardDescription>Add your message at the top of the newsletter</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Share updates, announcements, or a personal message..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={6}
              />
            </CardContent>
          </Card>

          {/* Custom Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Featured Links</CardTitle>
              <CardDescription>Add important links to feature in the newsletter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {customLinks.length > 0 && (
                <div className="space-y-2">
                  {customLinks.map((link, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{link.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLink(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Link title"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                  />
                  <Input
                    placeholder="https://..."
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                  />
                </div>
                <Button onClick={addLink} disabled={!newLinkTitle || !newLinkUrl}>
                  Add Link
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Newsletter
              </CardTitle>
              <CardDescription>
                Will send to {subscribers.length} subscribers and publish to Nostr
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sendSuccess && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600 dark:text-green-400">
                    ✅ Newsletter published to Nostr! Email HTML is in browser console.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSendNewsletter}
                  disabled={isSending || (!customText && customLinks.length === 0)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Newsletter
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={copyEmailHTML}
                  variant="outline"
                  disabled={!customText && customLinks.length === 0}
                >
                  📋 Copy Email HTML
                </Button>
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Note:</strong> Email sending requires a backend service. For now, the newsletter will be:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Published as a Nostr note (kind 1)</li>
                    <li>Email HTML copied to console (for manual sending via Mailchimp, SendGrid, etc.)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Newsletter Subscribers ({subscribers.length})</span>
                {loadingSubscribers && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </CardTitle>
              <CardDescription>
                Subscribers are stored as Nostr kind 38177 events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscribers.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No subscribers yet. Users can subscribe via the footer newsletter form.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {subscribers.map((sub, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{sub.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(sub.subscribedAt * 1000), 'MMM d, yyyy')}
                          </Badge>
                          {sub.npub && (
                            <Badge variant="secondary" className="text-xs">
                              Nostr: {sub.npub.slice(0, 10)}...
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
