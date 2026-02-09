import { useState } from 'react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useBadges } from '@/hooks/useBadges';
import { useUploadFile } from '@/hooks/useUploadFile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Upload, Award, Edit } from 'lucide-react';
import { generateBadgeUUID } from '@/lib/badgeTypes';
import type { BadgeData } from '@/lib/badgeTypes';

export function BadgeManagement() {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { data: badges, isLoading } = useBadges();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeData | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priceSats, setPriceSats] = useState('');
  const [status, setStatus] = useState<'active' | 'sold_out' | 'archived'>('active');
  const [featured, setFeatured] = useState(false);
  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImageUrl('');
    setPriceSats('');
    setStatus('active');
    setFeatured(false);
    setEditingBadge(null);
    setIsCreating(false);
  };

  const handleEdit = (badge: BadgeData) => {
    setEditingBadge(badge);
    setTitle(badge.title);
    setDescription(badge.description || '');
    setImageUrl(badge.image_url);
    setPriceSats(badge.price_sats.toString());
    setStatus(badge.status);
    setFeatured(badge.featured || false);
    setIsCreating(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const tags = await uploadFile(file);
      const url = tags[0][1]; // First tag contains the URL
      setImageUrl(url);
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  };

  const handleSubmit = () => {
    if (!user || !title.trim() || !imageUrl || !priceSats) return;

    const badgeId = editingBadge?.id || generateBadgeUUID();

    createEvent({
      kind: 38173,
      content: JSON.stringify({
        description: description.trim() || undefined,
      }),
      tags: [
        ['d', badgeId],
        ['title', title.trim()],
        ['image', imageUrl],
        ['price', priceSats],
        ['status', status],
        ['t', 'pop-badge'],
        ...(featured ? [['featured', 'true']] : []),
      ],
    });

    resetForm();
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>Please log in to manage POP badges</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>POP Badge Management</CardTitle>
              <CardDescription>Create badges that people can purchase - inspired by badges.page</CardDescription>
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
                  Create Badge
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
            <CardTitle>{editingBadge ? 'Edit' : 'Create New'} Badge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Badge Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Early Supporter, VIP Member"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of what this badge represents"
                rows={3}
              />
            </div>

            {/* Image */}
            <div className="space-y-2">
              <Label>Badge Image *</Label>
              {imageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={imageUrl}
                    alt="Badge"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-purple-200"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2"
                    onClick={() => setImageUrl('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors">
                  <div className="text-center">
                    {isUploading ? (
                      <div className="animate-spin text-2xl">⏳</div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <span className="text-sm text-gray-500">Upload</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              )}
              <p className="text-sm text-muted-foreground">
                Upload the badge image (recommended: square, 512x512px)
              </p>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Price in Sats *</Label>
              <Input
                id="price"
                type="number"
                value={priceSats}
                onChange={(e) => setPriceSats(e.target.value)}
                placeholder="21000"
                min="0"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'active' | 'sold_out' | 'archived')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="sold_out">Sold Out</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Featured */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={featured}
                onCheckedChange={(checked) => setFeatured(checked as boolean)}
              />
              <Label htmlFor="featured" className="text-sm font-medium">
                Feature on homepage and projects page
              </Label>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || !imageUrl || !priceSats}
              >
                {editingBadge ? 'Update' : 'Create'} Badge
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badges List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing POP Badges</CardTitle>
          <CardDescription>All available badges for purchase</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-32 w-full rounded" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : badges && badges.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="group relative rounded-lg border hover:shadow-lg transition-all p-4 space-y-2"
                >
                  <div className="aspect-square relative overflow-hidden rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
                    <img
                      src={badge.image_url}
                      alt={badge.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm truncate">{badge.title}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {badge.price_sats.toLocaleString()} sats
                      </Badge>
                      <Badge variant={badge.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {badge.status}
                      </Badge>
                      {badge.featured && (
                        <Badge variant="outline" className="text-xs">
                          <Award className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleEdit(badge)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No badges yet. Create your first POP badge!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
