import { useState } from 'react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePages } from '@/hooks/usePages';
import { useUploadFile } from '@/hooks/useUploadFile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Upload, FileText, Edit, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { generateSlug } from '@/lib/pageTypes';
import type { PageData } from '@/lib/pageTypes';

export function PageManagement() {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { data: pages, isLoading } = usePages();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingPage, setEditingPage] = useState<PageData | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [headerImage, setHeaderImage] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [externalUrl, setExternalUrl] = useState('');
  const [showInFooter, setShowInFooter] = useState(false);
  const [order, setOrder] = useState('');
  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setHeaderImage('');
    setGalleryImages([]);
    setExternalUrl('');
    setShowInFooter(false);
    setOrder('');
    setEditingPage(null);
    setIsCreating(false);
  };

  const handleEdit = (page: PageData) => {
    setEditingPage(page);
    setTitle(page.title);
    setDescription(page.description);
    setHeaderImage(page.header_image || '');
    setGalleryImages(page.gallery_images);
    setExternalUrl(page.external_url || '');
    setShowInFooter(page.show_in_footer);
    setOrder(page.order?.toString() || '');
    setIsCreating(true);
  };

  const handleHeaderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const tags = await uploadFile(file);
      const url = tags[0][1];
      setHeaderImage(url);
    } catch (error) {
      console.error('Failed to upload header image:', error);
    }
  };

  const handleGalleryImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const tags = await uploadFile(file);
        const imageUrl = tags[0][1];
        setGalleryImages(prev => [...prev, imageUrl]);
      } catch (error) {
        console.error('Failed to upload gallery image:', error);
      }
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!user || !title.trim() || !description.trim()) return;

    const pageSlug = editingPage?.id || generateSlug(title);

    createEvent({
      kind: 38175,
      content: JSON.stringify({
        description: description.trim(),
        gallery_images: galleryImages,
      }),
      tags: [
        ['d', pageSlug],
        ['title', title.trim()],
        ['t', 'custom-page'],
        ...(headerImage ? [['header', headerImage]] : []),
        ...(externalUrl ? [['r', externalUrl]] : []),
        ...(showInFooter ? [['footer', 'true']] : []),
        ...(order ? [['order', order]] : []),
        ...galleryImages.map((img, i) => ['image', img, i.toString()]),
      ],
    });

    resetForm();
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>Please log in to manage pages</CardDescription>
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
              <CardTitle>Page Management</CardTitle>
              <CardDescription>Create custom pages with galleries and external links</CardDescription>
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
                  Create Page
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
            <CardTitle>{editingPage ? 'Edit' : 'Create New'} Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Page Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="About Us, Contact, Privacy Policy..."
              />
              <p className="text-sm text-muted-foreground">
                URL will be: /page/{editingPage?.id || generateSlug(title) || 'page-slug'}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Page content and description"
                rows={6}
              />
            </div>

            {/* Header Image */}
            <div className="space-y-2">
              <Label>Header Image (optional)</Label>
              {headerImage ? (
                <div className="relative inline-block">
                  <img
                    src={headerImage}
                    alt="Header"
                    className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-purple-200"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={() => setHeaderImage('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="w-full max-w-md h-48 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors">
                  <div className="text-center">
                    {isUploading ? (
                      <div className="animate-spin text-2xl">⏳</div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <span className="text-sm text-gray-500">Upload Header Image</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleHeaderImageUpload}
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>

            {/* Gallery Images */}
            <div className="space-y-2">
              <Label>Gallery Images (optional)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {galleryImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeGalleryImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <label className="w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors">
                  <div className="text-center">
                    {isUploading ? (
                      <div className="animate-spin">⏳</div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <span className="text-sm text-gray-500">Add Images</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleGalleryImagesUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload multiple images to create a photo gallery
              </p>
            </div>

            {/* External URL */}
            <div className="space-y-2">
              <Label htmlFor="url">External URL (optional)</Label>
              <Input
                id="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://example.com"
              />
              <p className="text-sm text-muted-foreground">
                Link to external website or resource
              </p>
            </div>

            {/* Footer Display */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="footer"
                checked={showInFooter}
                onCheckedChange={(checked) => setShowInFooter(checked as boolean)}
              />
              <Label htmlFor="footer" className="text-sm font-medium">
                Show link in footer
              </Label>
            </div>

            {/* Order */}
            {showInFooter && (
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
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || !description.trim()}
              >
                {editingPage ? 'Update' : 'Create'} Page
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pages List */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Pages</CardTitle>
          <CardDescription>All custom pages</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-20 w-32 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : pages && pages.length > 0 ? (
            <div className="space-y-4">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  {page.header_image || page.gallery_images.length > 0 ? (
                    <img
                      src={page.header_image || page.gallery_images[0]}
                      alt=""
                      className="w-32 h-20 object-cover rounded"
                    />
                  ) : (
                    <div className="w-32 h-20 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded flex items-center justify-center">
                      <FileText className="h-8 w-8 text-purple-400" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold">{page.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {page.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        /page/{page.id}
                      </Badge>
                      {page.show_in_footer && (
                        <Badge variant="secondary" className="text-xs">
                          In Footer
                        </Badge>
                      )}
                      {page.gallery_images.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          {page.gallery_images.length} images
                        </Badge>
                      )}
                      {page.external_url && (
                        <Badge variant="outline" className="text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          External
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(page)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No pages yet. Create your first custom page!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
