import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFooterPages, useSocialMediaLinks } from '@/hooks/usePages';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, Send } from 'lucide-react';
import BitPopArtLogo from '@/assets/bitpopart-logo.png';

export function Footer() {
  const { data: footerPages = [] } = useFooterPages();
  const { data: socialLinks = [] } = useSocialMediaLinks();
  const { mutate: createEvent } = useNostrPublish();
  
  const [email, setEmail] = useState('');
  const [npub, setNpub] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Publish newsletter subscription event
    createEvent({
      kind: 38177,
      content: JSON.stringify({
        email: email.trim(),
      }),
      tags: [
        ['email', email.trim()],
        ...(npub.trim() ? [['npub', npub.trim()]] : []),
        ['t', 'newsletter-subscription'],
        ['alt', `Newsletter subscription: ${email}`],
      ],
    });

    setSubscribed(true);
    setEmail('');
    setNpub('');
    
    // Reset after 3 seconds
    setTimeout(() => setSubscribed(false), 3000);
  };

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <img src={BitPopArtLogo} alt="BitPopArt" className="h-10 w-10 rounded-lg" />
              <span className="font-bold text-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                BitPopArt
              </span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Good Vibes Digital Cards & Art on Nostr
            </p>
            
            {/* Social Media Links */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3 flex-wrap">
                {socialLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xl hover:scale-110 transition-transform"
                    title={link.platform}
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="md:col-span-1">
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/art" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Art Gallery
                </Link>
              </li>
              <li>
                <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Projects
                </Link>
              </li>
              <li>
                <Link to="/badges" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  POP Badges
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  News
                </Link>
              </li>
            </ul>
          </div>

          {/* Custom Pages */}
          {footerPages.length > 0 && (
            <div className="md:col-span-1">
              <h3 className="font-semibold mb-4">More</h3>
              <ul className="space-y-2">
                {footerPages.map((page) => (
                  <li key={page.id}>
                    <Link
                      to={`/page/${page.id}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Newsletter */}
          <div className="md:col-span-1">
            <h3 className="font-semibold mb-4">Newsletter</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Subscribe for updates & new releases
            </p>
            {subscribed ? (
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="py-4 text-center">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    ✓ Subscribed! Check your email.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1"
                    required
                  />
                  <Button type="submit" size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  type="text"
                  value={npub}
                  onChange={(e) => setNpub(e.target.value)}
                  placeholder="npub1... (optional)"
                  className="text-xs"
                />
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} BitPopArt. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Powered by Nostr & Bitcoin ⚡</span>
              <a
                href="https://shakespeare.diy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Vibed with Shakespeare
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
