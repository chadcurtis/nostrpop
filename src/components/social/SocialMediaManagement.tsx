import { useState } from 'react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useSocialMediaLinks } from '@/hooks/usePages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, X, Edit, Trash2 } from 'lucide-react';
import type { SocialMediaLink } from '@/lib/pageTypes';

const SOCIAL_PLATFORMS = [
  { name: 'Twitter/X', icon: '𝕏', placeholder: 'https://twitter.com/username' },
  { name: 'Instagram', icon: '📷', placeholder: 'https://instagram.com/username' },
  { name: 'Facebook', icon: '📘', placeholder: 'https://facebook.com/username' },
  { name: 'YouTube', icon: '▶️', placeholder: 'https://youtube.com/@username' },
  { name: 'Nostr', icon: '⚡', placeholder: 'npub1...' },
  { name: 'GitHub', icon: '💻', placeholder: 'https://github.com/username' },
  { name: 'LinkedIn', icon: '💼', placeholder: 'https://linkedin.com/in/username' },
  { name: 'TikTok', icon: '🎵', placeholder: 'https://tiktok.com/@username' },
  { name: 'Pinterest', icon: '📌', placeholder: 'https://pinterest.com/username' },
  { name: 'Custom', icon: '🔗', placeholder: 'https://example.com' },
];

export function SocialMediaManagement() {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { data: socialLinks, isLoading } = useSocialMediaLinks();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingLink, setEditingLink] = useState<SocialMediaLink | null>(null);
  
  // Form state
  const [platform, setPlatform] = useState('');
  const [customIcon, setCustomIcon] = useState('');
  const [url, setUrl] = useState('');
  const [order, setOrder] = useState('');
  
  const resetForm = () => {
    setPlatform('');
    setCustomIcon('');
    setUrl('');
    setOrder('');
    setEditingLink(null);
    setIsCreating(false);
  };

  const handleEdit = (link: SocialMediaLink) => {
    setEditingLink(link);
    setPlatform(link.platform);
    setCustomIcon(link.icon);
    setUrl(link.url);
    setOrder(link.order?.toString() || '');
    setIsCreating(true);
  };

  const handleSubmit = () => {
    if (!user || !platform.trim() || !url.trim()) return;

    const selectedPlatform = SOCIAL_PLATFORMS.find(p => p.name === platform);
    const icon = customIcon || selectedPlatform?.icon || '🔗';
    const linkId = editingLink?.id || platform.toLowerCase().replace(/[^a-z0-9]/g, '-');

    createEvent({
      kind: 38176,
      content: JSON.stringify({}),
      tags: [
        ['d', linkId],
        ['platform', platform.trim()],
        ['icon', icon],
        ['r', url.trim()],
        ['t', 'social-media'],
        ...(order ? [['order', order]] : []),
      ],
    });

    resetForm();
  };

  const handleDelete = (link: SocialMediaLink) => {
    if (!user) return;
    
    // To delete, publish the same event with empty/deleted status
    // Or in Nostr, you typically just publish a newer version with empty content
    createEvent({
      kind: 38176,
      content: JSON.stringify({ deleted: true }),
      tags: [
        ['d', link.id],
        ['t', 'social-media-deleted'],
      ],
    });
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>Please log in to manage social media links</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const selectedPlatform = SOCIAL_PLATFORMS.find(p => p.name === platform);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>Manage social media icons in the footer</CardDescription>
            </div>
            <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "outline" : "default"}>
              {isCreating ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Link
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>{editingLink ? 'Edit' : 'Add'} Social Media Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Platform Selection */}
            <div className="space-y-2">
              <Label htmlFor="platform">Platform *</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {SOCIAL_PLATFORMS.map((p) => (
                  <Button
                    key={p.name}
                    variant={platform === p.name ? "default" : "outline"}
                    className="justify-start gap-2"
                    onClick={() => {
                      setPlatform(p.name);
                      setCustomIcon(p.icon);
                      if (!url) setUrl(p.placeholder);
                    }}
                  >
                    <span>{p.icon}</span>
                    <span className="text-xs">{p.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Icon (editable) */}
            <div className="space-y-2">
              <Label htmlFor="icon">Icon (emoji or text)</Label>
              <Input
                id="icon"
                value={customIcon}
                onChange={(e) => setCustomIcon(e.target.value)}
                placeholder="🔗"
                maxLength={4}
              />
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={selectedPlatform?.placeholder || 'https://example.com'}
              />
            </div>

            {/* Order */}
            <div className="space-y-2">
              <Label htmlFor="order">Display Order (optional)</Label>
              <Input
                id="order"
                type="number"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                placeholder="1"
                min="1"
              />
              <p className="text-sm text-muted-foreground">
                Lower numbers appear first in footer
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={!platform.trim() || !url.trim()}
              >
                {editingLink ? 'Update' : 'Add'} Link
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Social Links List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Social Media Links</CardTitle>
          <CardDescription>Links displayed in footer</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : socialLinks && socialLinks.length > 0 ? (
            <div className="space-y-3">
              {socialLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="text-3xl">{link.icon}</div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold">{link.platform}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {link.url}
                    </p>
                    <div className="flex items-center gap-2">
                      {link.order && (
                        <Badge variant="outline" className="text-xs">
                          Order: {link.order}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(link)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(link)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No social media links yet. Add your first link!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
