import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useToast } from '@/hooks/useToast';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import type { ArtworkData } from '@/lib/artTypes';
import {
  Upload,
  X,
  Plus,
  DollarSign,
  Tag,
  FileText,
  Loader2,
  Image as ImageIcon,
  Gavel,
  ShoppingCart,
  Eye,
  Truck,
  Save,
  CheckCircle
} from 'lucide-react';

const CURRENCIES = [
  { value: 'SAT', label: 'Satoshis (sats)' },
  { value: 'BTC', label: 'BTC (₿)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' }
];

const MEDIUMS = [
  'Digital Art',
  'Digital Painting',
  'Digital Illustration',
  'Photography',
  'Mixed Media',
  'AI Generated',
  'Pixel Art',
  'Vector Art',
  'Oil on Canvas',
  'Acrylic on Canvas',
  'Watercolor',
  'Other'
];

const artworkSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description too long'),
  medium: z.string().optional(),
  dimensions: z.string().optional(),
  year: z.string().optional(),
  edition: z.string().optional(),
  certificateUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  saleType: z.enum(['not_for_sale', 'fixed', 'auction', 'sold']),
  price: z.number().min(1, 'Price must be greater than 0').optional(),
  currency: z.string().optional(),
  startingBid: z.number().min(1, 'Starting bid must be greater than 0').optional(),
  auctionDuration: z.number().min(1, 'Auction must be at least 1 hour').max(168, 'Auction cannot exceed 1 week').optional(),
  // Shipping fields
  localCountries: z.string().optional(),
  localShippingCost: z.number().min(0, 'Local shipping cost must be 0 or greater').optional(),
  internationalShippingCost: z.number().min(0, 'International shipping cost must be 0 or greater').optional(),
  // Gallery display
  featured: z.boolean().optional(),
});

type ArtworkFormData = z.infer<typeof artworkSchema>;

interface EditArtworkFormProps {
  artwork: ArtworkData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditArtworkForm({ artwork, onSuccess, onCancel }: EditArtworkFormProps) {
  const [images, setImages] = useState<string[]>(artwork.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [tags, setTags] = useState<string[]>(artwork.tags || []);
  const [newTag, setNewTag] = useState('');

  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending: isUpdating } = useNostrPublish();
  const { mutateAsync: uploadFile } = useUploadFile();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<ArtworkFormData>({
    resolver: zodResolver(artworkSchema),
    defaultValues: {
      title: artwork.title,
      description: artwork.description,
      medium: artwork.medium,
      dimensions: artwork.dimensions,
      year: artwork.year,
      edition: artwork.edition,
      certificateUrl: artwork.certificate_url,
      saleType: artwork.sale_type,
      price: artwork.price,
      currency: artwork.currency || 'SAT',
      startingBid: artwork.starting_bid,
      localCountries: artwork.shipping?.local_countries,
      localShippingCost: artwork.shipping?.local_cost,
      internationalShippingCost: artwork.shipping?.international_cost,
      featured: artwork.featured || false,
    }
  });

  const saleType = watch('saleType');
  const isForSale = saleType === 'fixed';
  const isAuction = saleType === 'auction';
  const isSold = saleType === 'sold';

  // Set initial form values
  useEffect(() => {
    setValue('title', artwork.title);
    setValue('description', artwork.description);
    setValue('medium', artwork.medium || '');
    setValue('dimensions', artwork.dimensions || '');
    setValue('year', artwork.year || '');
    setValue('edition', artwork.edition || '');
    setValue('certificateUrl', artwork.certificate_url || '');
    setValue('saleType', artwork.sale_type);
    setValue('price', artwork.price);
    setValue('currency', artwork.currency || 'SAT');
    setValue('startingBid', artwork.starting_bid);
    setValue('localCountries', artwork.shipping?.local_countries || '');
    setValue('localShippingCost', artwork.shipping?.local_cost);
    setValue('internationalShippingCost', artwork.shipping?.international_cost);
    setValue('featured', artwork.featured || false);
  }, [artwork, setValue]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles = Array.from(files).filter(file => {
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 10MB. Please choose a smaller file.`,
          variant: "destructive"
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = validFiles.map(async (file) => {
        const tags = await uploadFile(file);
        return tags[0][1]; // Get the URL from the first tag
      });

      const urls = await Promise.all(uploadPromises);
      setImages(prev => [...prev, ...urls]);

      toast({
        title: "Images Uploaded",
        description: `${urls.length} image(s) uploaded successfully.`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim().toLowerCase())) {
      setTags(prev => [...prev, newTag.trim().toLowerCase()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = async (data: ArtworkFormData) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to edit artwork.",
        variant: "destructive"
      });
      return;
    }

    if (images.length === 0) {
      toast({
        title: "Images Required",
        description: "Please upload at least one image for your artwork.",
        variant: "destructive"
      });
      return;
    }

    try {
      let auctionStart: string | undefined;
      let auctionEnd: string | undefined;

      if (isAuction && data.auctionDuration) {
        auctionStart = new Date().toISOString();
        auctionEnd = new Date(Date.now() + data.auctionDuration * 60 * 60 * 1000).toISOString();
      }

      // Create updated artwork content
      const content = {
        title: data.title,
        description: data.description,
        images,
        medium: data.medium,
        dimensions: data.dimensions,
        year: data.year,
        tags: tags.length > 0 ? tags : undefined,
        edition: data.edition,
        certificate_url: data.certificateUrl,
        shipping: (data.localCountries || data.localShippingCost || data.internationalShippingCost) ? {
          local_countries: data.localCountries,
          local_cost: data.localShippingCost,
          international_cost: data.internationalShippingCost
        } : undefined,
        ...(data.saleType === 'fixed' && {
          price: data.price,
          currency: data.currency
        }),
        ...(data.saleType === 'auction' && {
          starting_bid: data.startingBid,
          current_bid: data.startingBid,
          currency: data.currency,
          auction_start: auctionStart,
          auction_end: auctionEnd
        })
      };

      // Create tags (use existing artwork ID for updates)
      const eventTags = [
        ['d', artwork.id], // Keep the same identifier for updates
        ['title', data.title],
        ['t', 'artwork'],
        ['t', 'art'],
        ...(data.saleType !== 'not_for_sale' ? [['sale', data.saleType]] : []),
        ...(data.featured ? [['featured', 'true']] : []),
        ...(tags.map(tag => ['t', tag.toLowerCase()]))
      ];

      // Add price tags if applicable
      if (data.price && data.currency) {
        eventTags.push(['price', data.price.toString()]);
        eventTags.push(['currency', data.currency]);
      }

      // Publish as updated artwork event (kind 30023)
      createEvent({
        kind: 30023,
        content: JSON.stringify(content),
        tags: eventTags
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Artwork update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update artwork. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
        <p className="text-muted-foreground">
          Please log in to edit artwork.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <Save className="w-5 h-5 mr-2" />
          Update your artwork information
        </h3>
      </div>
      <div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Artwork Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Artwork Title *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Enter artwork title"
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="medium">Medium</Label>
                <Select onValueChange={(value) => setValue('medium', value)} value={watch('medium')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select medium" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDIUMS.map((medium) => (
                      <SelectItem key={medium} value={medium}>
                        {medium}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe your artwork..."
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input
                  id="dimensions"
                  {...register('dimensions')}
                  placeholder="e.g., 24x18 inches"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  {...register('year')}
                  placeholder="e.g., 2024"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edition">Edition</Label>
                <Input
                  id="edition"
                  {...register('edition')}
                  placeholder="e.g., 1/10, Unique"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="certificateUrl">Certificate URL</Label>
              <Input
                id="certificateUrl"
                {...register('certificateUrl')}
                placeholder="https://example.com/certificate"
              />
              {errors.certificateUrl && (
                <p className="text-sm text-red-500">{errors.certificateUrl.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <ImageIcon className="w-4 h-4 mr-2" />
              Artwork Images *
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Label htmlFor="images" className="cursor-pointer">
                  <div className="flex items-center space-x-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Upload Images</span>
                  </div>
                  <Input
                    id="images"
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </Label>
                {isUploading && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                PNG, JPG, GIF up to 10MB each. First image will be used as the main thumbnail.
              </p>

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Artwork image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {index === 0 && (
                        <Badge className="absolute bottom-2 left-2 text-xs">
                          Main
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Tag className="w-4 h-4 mr-2" />
              Tags
            </h3>

            <div className="flex items-center space-x-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Sale Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Sale Options
            </h3>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Sale Type</Label>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card
                    className={`cursor-pointer transition-all ${saleType === 'not_for_sale' ? 'ring-2 ring-purple-500' : ''}`}
                    onClick={() => setValue('saleType', 'not_for_sale')}
                  >
                    <CardContent className="p-4 text-center">
                      <Eye className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                      <h4 className="font-medium">Display Only</h4>
                      <p className="text-xs text-muted-foreground">Not for sale</p>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all ${saleType === 'fixed' ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => setValue('saleType', 'fixed')}
                  >
                    <CardContent className="p-4 text-center">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                      <h4 className="font-medium">Fixed Price</h4>
                      <p className="text-xs text-muted-foreground">Set a buy-now price</p>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all ${saleType === 'auction' ? 'ring-2 ring-red-500' : ''}`}
                    onClick={() => setValue('saleType', 'auction')}
                  >
                    <CardContent className="p-4 text-center">
                      <Gavel className="w-8 h-8 mx-auto mb-2 text-red-500" />
                      <h4 className="font-medium">Auction</h4>
                      <p className="text-xs text-muted-foreground">Let buyers bid</p>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all ${saleType === 'sold' ? 'ring-2 ring-green-500' : ''}`}
                    onClick={() => setValue('saleType', 'sold')}
                  >
                    <CardContent className="p-4 text-center">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <h4 className="font-medium">Sold</h4>
                      <p className="text-xs text-muted-foreground">Mark as sold</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {(isForSale || isAuction || isSold) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select onValueChange={(value) => setValue('currency', value)} value={watch('currency')}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {isForSale && (
                      <div className="space-y-2">
                        <Label htmlFor="price">Price *</Label>
                        <Input
                          id="price"
                          type="number"
                          step="1"
                          {...register('price', { valueAsNumber: true })}
                          placeholder="100000"
                        />
                        {errors.price && (
                          <p className="text-sm text-red-500">{errors.price.message}</p>
                        )}
                      </div>
                    )}

                    {isAuction && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="startingBid">Starting Bid *</Label>
                          <Input
                            id="startingBid"
                            type="number"
                            step="1"
                            {...register('startingBid', { valueAsNumber: true })}
                            placeholder="50000"
                          />
                          {errors.startingBid && (
                            <p className="text-sm text-red-500">{errors.startingBid.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="auctionDuration">Duration (hours) *</Label>
                          <Input
                            id="auctionDuration"
                            type="number"
                            min="1"
                            max="168"
                            {...register('auctionDuration', { valueAsNumber: true })}
                            placeholder="24"
                          />
                          {errors.auctionDuration && (
                            <p className="text-sm text-red-500">{errors.auctionDuration.message}</p>
                          )}
                        </div>
                      </>
                    )}

                    {isSold && (
                      <div className="space-y-2">
                        <Label htmlFor="price">Sold Price *</Label>
                        <Input
                          id="price"
                          type="number"
                          step="1"
                          {...register('price', { valueAsNumber: true })}
                          placeholder="100000"
                        />
                        {errors.price && (
                          <p className="text-sm text-red-500">{errors.price.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Shipping Information */}
          {(isForSale || isAuction) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Truck className="w-4 h-4 mr-2" />
                Shipping Information
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure shipping costs for physical artwork delivery. Leave blank if shipping is not applicable.
              </p>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="localCountries">Local Countries</Label>
                  <Input
                    id="localCountries"
                    {...register('localCountries')}
                    placeholder="US, CA, MX"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of countries for local shipping rates
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="localShippingCost">Local Shipping Cost (sats)</Label>
                    <Input
                      id="localShippingCost"
                      type="number"
                      step="1"
                      min="0"
                      {...register('localShippingCost', { valueAsNumber: true })}
                      placeholder="5000"
                    />
                    {errors.localShippingCost && (
                      <p className="text-sm text-red-500">{errors.localShippingCost.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="internationalShippingCost">International Shipping Cost (sats)</Label>
                    <Input
                      id="internationalShippingCost"
                      type="number"
                      step="1"
                      min="0"
                      {...register('internationalShippingCost', { valueAsNumber: true })}
                      placeholder="15000"
                    />
                    {errors.internationalShippingCost && (
                      <p className="text-sm text-red-500">{errors.internationalShippingCost.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Featured in Tile Gallery */}
          <div className="space-y-2 p-4 border rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={watch('featured')}
                onCheckedChange={(checked) => setValue('featured', !!checked)}
              />
              <input
                type="hidden"
                {...register('featured')}
              />
              <Label htmlFor="featured" className="text-base font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Feature in Tile Gallery
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Display this artwork in the featured tile gallery at the top of the Art page for maximum visibility.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={!isValid || isUpdating || images.length === 0}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Artwork
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}