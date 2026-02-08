import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useBadges, useBadge, useBadgePurchases } from '@/hooks/useBadges';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Award, Zap, Users, Check, X as CloseIcon } from 'lucide-react';
import { nip19 } from 'nostr-tools';

export default function Badges() {
  const { data: badges, isLoading } = useBadges();
  const { mutate: createEvent } = useNostrPublish();
  
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [npub, setNpub] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const selectedBadge = badges?.find(b => b.id === selectedBadgeId);
  const { data: purchases = [] } = useBadgePurchases(selectedBadgeId || '');

  useSeoMeta({
    title: 'POP Badges - BitPopArt',
    description: 'Collect exclusive POP badges by BitPopArt. Purchase badges with Bitcoin Lightning.',
  });

  const handlePurchase = () => {
    if (!selectedBadge || !npub.trim()) {
      setError('Please provide your npub');
      return;
    }

    // Validate npub format
    try {
      const decoded = nip19.decode(npub.trim());
      if (decoded.type !== 'npub') {
        setError('Invalid npub format. Please provide a valid Nostr npub.');
        return;
      }
    } catch (e) {
      setError('Invalid npub format. Please provide a valid Nostr npub.');
      return;
    }

    setError('');

    // Create purchase event
    createEvent({
      kind: 38174,
      content: JSON.stringify({
        payment_proof: 'pending', // In a real app, this would include Lightning payment proof
      }),
      tags: [
        ['b', selectedBadge.id], // Reference to badge
        ['npub', npub.trim()],
        ['t', 'badge-purchase'],
      ],
    });

    setShowSuccess(true);
    setSelectedBadgeId(null);
    setNpub('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Award className="h-10 w-10 text-purple-600 mr-3" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              POP Badges
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Collect exclusive badges by BitPopArt. Buy with sats and add to your Nostr profile.
          </p>
        </div>

        {/* Badges Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : badges && badges.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {badges.map((badge) => (
              <Card
                key={badge.id}
                className="group overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-800"
                onClick={() => setSelectedBadgeId(badge.id)}
              >
                {/* Badge Image */}
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
                  <img
                    src={badge.image_url}
                    alt={badge.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button variant="secondary" size="sm">
                      Buy Badge
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg group-hover:text-purple-600 transition-colors truncate">
                    {badge.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="default" className="gap-1">
                      <Zap className="h-3 w-3" />
                      {badge.price_sats.toLocaleString()}
                    </Badge>
                    {badge.featured && (
                      <Badge variant="outline" className="text-xs">
                        <Award className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  {badge.description && (
                    <CardDescription className="line-clamp-2 text-sm">
                      {badge.description}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Badges Available</h3>
              <p className="text-muted-foreground">
                Check back soon for new badges!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Purchase Dialog */}
        <Dialog open={!!selectedBadgeId && !showSuccess} onOpenChange={(open) => !open && setSelectedBadgeId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Buy Badge</DialogTitle>
              <DialogDescription>
                Enter your Nostr npub and pay to receive this badge
              </DialogDescription>
            </DialogHeader>

            {selectedBadge && (
              <div className="space-y-4">
                {/* Badge Preview */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-accent/50">
                  <img
                    src={selectedBadge.image_url}
                    alt={selectedBadge.title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{selectedBadge.title}</h3>
                    <Badge variant="default" className="gap-1 mt-1">
                      <Zap className="h-3 w-3" />
                      {selectedBadge.price_sats.toLocaleString()} sats
                    </Badge>
                  </div>
                </div>

                {/* Npub Input */}
                <div className="space-y-2">
                  <Label htmlFor="npub">Your Npub *</Label>
                  <Input
                    id="npub"
                    value={npub}
                    onChange={(e) => setNpub(e.target.value)}
                    placeholder="npub1..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Your Nostr public key (npub format)
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Purchase Stats */}
                {purchases.length > 0 && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {purchases.length} {purchases.length === 1 ? 'person has' : 'people have'} purchased this badge
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handlePurchase}
                    disabled={!npub.trim()}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Pay & Buy Badge
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedBadgeId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Success Dialog */}
        <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                Thank You!
              </DialogTitle>
              <DialogDescription className="space-y-4 pt-4">
                <p className="text-base">
                  Thanks for purchasing this badge! I will process your order and you'll receive your badge soon.
                </p>
                
                <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="py-4">
                    <p className="text-sm font-semibold mb-2">Follow @BitPopArt</p>
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      npub1gwa27rpgum8mr9d30msg8cv7kwj2lhav2nvmdwh3wqnsa5vnudxqlta2sz
                    </p>
                  </CardContent>
                </Card>

                <Button className="w-full" onClick={() => setShowSuccess(false)}>
                  Close
                </Button>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>Inspired by <a href="https://badges.page/" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-600">badges.page</a> • Powered by Nostr & Bitcoin Lightning ⚡</p>
        </div>
      </div>
    </div>
  );
}
