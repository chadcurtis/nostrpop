import { useState, useRef } from 'react';
import { useNostr } from '@nostrify/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Target,
  Plus,
  Loader2,
  Trash2,
  Edit,
  X,
  Upload,
  Image as ImageIcon,
  Calendar,
} from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';
import { generateFundraiserUUID, formatSats } from '@/lib/fundraiserTypes';

interface FundraiserFormData {
  title: string;
  description: string;
  thumbnail: string;
  goal_sats: string;
  deadline: string;
  status: 'active' | 'completed' | 'cancelled';
}

export function FundraiserManagement() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { mutateAsync: uploadFile } = useUploadFile();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [editingFundraiser, setEditingFundraiser] = useState<NostrEvent | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<FundraiserFormData>({
    title: '',
    description: '',
    thumbnail: '',
    goal_sats: '',
    deadline: '',
    status: 'active',
  });

  // Fetch user's fundraisers (kind 38178)
  const { data: fundraisers = [], isLoading } = useQuery({
    queryKey: ['fundraisers-admin', user?.pubkey],
    queryFn: async (c) => {
      if (!user?.pubkey) return [];
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ kinds: [38178], authors: [user.pubkey], limit: 100 }],
        { signal }
      );
      return events.sort((a, b) => b.created_at - a.created_at);
    },
    enabled: !!user?.pubkey,
  });

  const handleInputChange = (field: keyof FundraiserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File is larger than 10MB. Please choose a smaller file.');
      return;
    }

    setIsUploading(true);
    try {
      const tags = await uploadFile(file);
      const imageUrl = tags[0][1];
      setFormData(prev => ({ ...prev, thumbnail: imageUrl }));
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, thumbnail: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter a fundraiser title');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    if (!formData.goal_sats || parseInt(formData.goal_sats) <= 0) {
      toast.error('Please enter a valid fundraising goal');
      return;
    }

    const fundraiserId = editingFundraiser?.tags.find(t => t[0] === 'd')?.[1] || generateFundraiserUUID();

    const tags: string[][] = [
      ['d', fundraiserId],
      ['title', formData.title],
      ['goal', formData.goal_sats],
      ['status', formData.status],
      ['t', 'fundraiser'],
    ];

    if (formData.thumbnail) {
      tags.push(['image', formData.thumbnail]);
    }
    if (formData.deadline) {
      tags.push(['deadline', formData.deadline]);
    }

    const contentData = {
      title: formData.title,
      description: formData.description,
      thumbnail: formData.thumbnail,
      goal_sats: parseInt(formData.goal_sats),
      deadline: formData.deadline,
      status: formData.status,
    };

    createEvent(
      {
        kind: 38178,
        content: JSON.stringify(contentData),
        tags,
      },
      {
        onSuccess: () => {
          toast.success(editingFundraiser ? 'Fundraiser updated!' : 'Fundraiser created!');
          setIsCreating(false);
          setEditingFundraiser(null);
          setFormData({
            title: '',
            description: '',
            thumbnail: '',
            goal_sats: '',
            deadline: '',
            status: 'active',
          });
          queryClient.invalidateQueries({ queryKey: ['fundraisers'] });
          queryClient.invalidateQueries({ queryKey: ['fundraisers-admin'] });
        },
        onError: (error) => {
          console.error('Publish error:', error);
          toast.error('Failed to save fundraiser');
        },
      }
    );
  };

  const handleEdit = (event: NostrEvent) => {
    const content = JSON.parse(event.content);
    const titleTag = event.tags.find(t => t[0] === 'title')?.[1];
    const imageTag = event.tags.find(t => t[0] === 'image')?.[1];
    const goalTag = event.tags.find(t => t[0] === 'goal')?.[1];
    const deadlineTag = event.tags.find(t => t[0] === 'deadline')?.[1];
    const statusTag = event.tags.find(t => t[0] === 'status')?.[1] as 'active' | 'completed' | 'cancelled' || 'active';

    setFormData({
      title: titleTag || content.title || '',
      description: content.description || '',
      thumbnail: imageTag || content.thumbnail || '',
      goal_sats: goalTag || content.goal_sats?.toString() || '',
      deadline: deadlineTag || content.deadline || '',
      status: statusTag,
    });
    setEditingFundraiser(event);
    setIsCreating(true);
  };

  const handleDelete = (event: NostrEvent) => {
    const fundraiserId = event.tags.find(t => t[0] === 'd')?.[1];
    if (!fundraiserId) return;

    if (confirm('Are you sure you want to delete this fundraiser?')) {
      createEvent(
        {
          kind: 5,
          content: 'Deleted fundraiser',
          tags: [['a', `38178:${event.pubkey}:${fundraiserId}`]],
        },
        {
          onSuccess: () => {
            toast.success('Fundraiser deleted');
            queryClient.invalidateQueries({ queryKey: ['fundraisers'] });
            queryClient.invalidateQueries({ queryKey: ['fundraisers-admin'] });
          },
        }
      );
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingFundraiser(null);
    setFormData({
      title: '',
      description: '',
      thumbnail: '',
      goal_sats: '',
      deadline: '',
      status: 'active',
    });
  };

  return (
    <div className="space-y-6">
      {/* Create/Edit Form */}
      {isCreating ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                {editingFundraiser ? 'Edit Fundraiser' : 'Create New Fundraiser'}
              </span>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              Create a crowdfunding campaign for your art project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  placeholder="My Amazing Art Project"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your project and what you're raising funds for..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal_sats">Fundraising Goal (in sats) *</Label>
                <Input
                  id="goal_sats"
                  type="number"
                  placeholder="1000000"
                  value={formData.goal_sats}
                  onChange={(e) => handleInputChange('goal_sats', e.target.value)}
                  required
                  min="1"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.goal_sats && parseInt(formData.goal_sats) > 0 
                    ? `Goal: ${formatSats(parseInt(formData.goal_sats))} sats`
                    : 'Enter amount in satoshis (1 BTC = 100,000,000 sats)'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="thumbnail">Project Image</Label>
                
                {formData.thumbnail ? (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                      <img
                        src={formData.thumbnail}
                        alt="Fundraiser thumbnail"
                        className="w-full h-48 object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      type="url"
                      placeholder="Or paste image URL"
                      value={formData.thumbnail}
                      onChange={(e) => handleInputChange('thumbnail', e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      id="thumbnail-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Image
                        </>
                      )}
                    </Button>
                    <Input
                      type="url"
                      placeholder="Or paste image URL"
                      value={formData.thumbnail}
                      onChange={(e) => handleInputChange('thumbnail', e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline (optional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => handleInputChange('deadline', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: 'active' | 'completed' | 'cancelled') => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  {editingFundraiser ? 'Update Fundraiser' : 'Create Fundraiser'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-6">
          <Button onClick={() => setIsCreating(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Add New Fundraiser
          </Button>
        </div>
      )}

      <Separator />

      {/* Fundraiser List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Your Fundraisers
          </CardTitle>
          <CardDescription>
            Manage your crowdfunding campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : fundraisers.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No fundraisers yet. Create your first one above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fundraisers.map((event) => {
                const content = JSON.parse(event.content);
                const title = event.tags.find(t => t[0] === 'title')?.[1] || content.title || 'Untitled';
                const thumbnail = event.tags.find(t => t[0] === 'image')?.[1] || content.thumbnail;
                const goalTag = event.tags.find(t => t[0] === 'goal')?.[1];
                const goal = goalTag ? parseInt(goalTag) : content.goal_sats || 0;
                const deadline = event.tags.find(t => t[0] === 'deadline')?.[1] || content.deadline;
                const statusTag = event.tags.find(t => t[0] === 'status')?.[1] || content.status || 'active';

                return (
                  <Card key={event.id} className="overflow-hidden">
                    <div className="flex gap-4">
                      {thumbnail ? (
                        <div className="w-32 h-24 flex-shrink-0">
                          <img
                            src={thumbnail}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-32 h-24 flex-shrink-0 bg-gradient-to-br from-purple-200 via-pink-200 to-indigo-200 dark:from-purple-800 dark:via-pink-800 dark:to-indigo-800 flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-white opacity-50" />
                        </div>
                      )}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="font-semibold text-lg">{title}</h3>
                              <Badge variant={statusTag === 'active' ? 'default' : statusTag === 'completed' ? 'secondary' : 'destructive'} className="text-xs">
                                {statusTag}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {content.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                Goal: {formatSats(goal)} sats
                              </span>
                              {deadline && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(deadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(event)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(event)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
