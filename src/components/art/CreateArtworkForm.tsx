import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCreateArtwork } from '@/hooks/useArtworks';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { nip19 } from 'nostr-tools';
import {
  Palette,
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
  Share2
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
  saleType: z.enum(['not_for_sale', 'fixed', 'auction']),
  price: z.number().min(1, 'Price must be greater than 0').optional(),
  currency: z.string().optional(),
  startingBid: z.number().min(1, 'Starting bid must be greater than 0').optional(),
  auctionDuration: z.number().min(1, 'Auction must be at least 1 hour').max(168, 'Auction cannot exceed 1 week').optional(),
  // Shipping fields
  localCountries: z.string().optional(),
  localShippingCost: z.number().min(0, 'Local shipping cost must be 0 or greater').optional(),
  internationalShippingCost: z.number().min(0, 'International shipping cost must be 0 or greater').optional(),
  // Share to Nostr fields
  shareToNostr: z.boolean().optional(),
  shareMessage: z.string().optional(),
  // Gallery display
  featured: z.boolean().optional(),
});

type ArtworkFormData = z.infer<typeof artworkSchema>;

interface CreateArtworkFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateArtworkForm({ onSuccess, onCancel }: CreateArtworkFormProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const { user } = useCurrentUser();
  const { mutate: createArtwork, isPending: isCreating } = useCreateArtwork();
  const { mutate: createEvent } = useNostrPublish();
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
      saleType: 'not_for_sale',
      currency: 'SAT',
      auctionDuration: 24,
      shareToNostr: true, // Default to sharing
      shareMessage: ''
    }
  });

  const saleType = watch('saleType');
  const watchedShareToNostr = watch('shareToNostr');
  const isForSale = saleType === 'fixed';
  const isAuction = saleType === 'auction';

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

  const shareArtworkToNostr = (artworkEvent: { id: string; tags: string[][] }, formData: ArtworkFormData) => {
    console.log('🚀 shareArtworkToNostr called with:', { artworkEvent, formData });

    if (!user) {
      console.log('❌ No user found for sharing');
      return;
    }

    setIsSharing(true);

    try {
      // Get the d-tag from the artwork event
      const dTag = artworkEvent.tags.find(([name]: [string, string]) => name === 'd')?.[1];
      if (!dTag) {
        throw new Error('No d-tag found in artwork event');
      }

      // Generate naddr for the artwork
      const naddr = nip19.naddrEncode({
        identifier: dTag,
        pubkey: user.pubkey,
        kind: 30023, // Artwork uses kind 30023
      });

      // Create the artwork URL
      const artworkUrl = `${window.location.origin}/art/${naddr}`;

      // Create share message with image link after text, before hashtags
      const customMessage = formData.shareMessage?.trim();
      let shareContent = customMessage
        ? `${customMessage}\n\n🎨 "${formData.title}"\n${artworkUrl}`
        : `Just created a beautiful new artwork! 🎨\n\n"${formData.title}"\n\n${artworkUrl}`;

      // Add the artwork image link after the text content, before hashtags
      if (images && images.length > 0) {
        shareContent += `\n\n${images[0]}`;
      }

      // Add hashtags at the end
      shareContent += `\n\n#artwork #art #nostr`;

      // Add medium-specific hashtag if available
      if (formData.medium) {
        const mediumTag = formData.medium.toLowerCase().replace(/[^a-z0-9]/g, '');
        shareContent += ` #${mediumTag}`;
      }

      // Add sale type hashtag
      if (formData.saleType !== 'not_for_sale') {
        shareContent += ` #${formData.saleType}`;
      }

      // Prepare tags array
      const shareTags = [
        ['t', 'artwork'],
        ['t', 'art'],
        ['t', 'nostr'],
        ['e', artworkEvent.id, '', 'mention'], // Reference the artwork event
        ['a', `30023:${user.pubkey}:${dTag}`, '', 'mention'], // Reference the addressable event
      ];

      // Add medium tag if available
      if (formData.medium) {
        shareTags.push(['t', formData.medium.toLowerCase().replace(/[^a-z0-9]/g, '')]);
      }

      // Add sale type tag
      if (formData.saleType !== 'not_for_sale') {
        shareTags.push(['t', formData.saleType]);
      }

      // Add custom tags from artwork
      if (tags && tags.length > 0) {
        tags.forEach(tag => {
          shareTags.push(['t', tag.toLowerCase()]);
        });
      }

      // Add image-related tags for maximum compatibility
      if (images && images.length > 0) {
        const imageUrl = images[0];

        // Method 1: Simple image tag (widely supported)
        shareTags.push(['image', imageUrl]);

        // Method 2: NIP-92 imeta tag (newer clients)
        shareTags.push([
          'imeta',
          `url ${imageUrl}`,
          'm image/jpeg',
          `alt Preview image for "${formData.title}" artwork`,
          `fallback ${artworkUrl}`
        ]);

        // Method 3: Add r tag for reference (some clients use this)
        shareTags.push(['r', imageUrl]);

        // Method 4: Add url tag (alternative approach some clients check)
        shareTags.push(['url', imageUrl]);
      }

      // Create kind 1 note to share the artwork
      createEvent({
        kind: 1,
        content: shareContent,
        tags: shareTags
      }, {
        onSuccess: () => {
          console.log('✅ Successfully shared to Nostr');
          toast({
            title: "Shared to Nostr! 🎨",
            description: "Your new artwork has been shared with the Nostr community.",
          });
          setIsSharing(false);
        },
        onError: (error) => {
          console.error('Share to Nostr error:', error);
          toast({
            title: "Share Failed",
            description: "Artwork was created but sharing to Nostr failed. You can share it manually later.",
            variant: "destructive"
          });
          setIsSharing(false);
        }
      });
    } catch (error) {
      console.error('Error generating share content:', error);
      toast({
        title: "Share Failed",
        description: "Failed to generate share content. You can share the artwork manually later.",
        variant: "destructive"
      });
      setIsSharing(false);
    }
  };

  const onSubmit = async (data: ArtworkFormData) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create artwork.",
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

      createArtwork({
        title: data.title,
        description: data.description,
        images,
        saleType: data.saleType,
        price: isForSale ? data.price : undefined,
        currency: (isForSale || isAuction) ? data.currency : undefined,
        startingBid: isAuction ? data.startingBid : undefined,
        auctionStart,
        auctionEnd,
        medium: data.medium,
        dimensions: data.dimensions,
        year: data.year,
        tags: tags.length > 0 ? tags : undefined,
        edition: data.edition,
        certificateUrl: data.certificateUrl,
        featured: data.featured,
        shipping: (data.localCountries || data.localShippingCost || data.internationalShippingCost) ? {
          localCountries: data.localCountries,
          localShippingCost: data.localShippingCost,
          internationalShippingCost: data.internationalShippingCost
        } : undefined
      }, {
        onSuccess: (result) => {
          console.log('✅ Artwork created successfully:', result);
          toast({
            title: "Artwork Created! 🎨",
            description: "Your beautiful artwork has been created successfully.",
          });

          // Share to Nostr if requested
          if (data.shareToNostr) {
            console.log('📢 Sharing to Nostr...', { shareToNostr: data.shareToNostr, shareMessage: data.shareMessage });
            shareArtworkToNostr(result.event, data);
          } else {
            console.log('❌ Not sharing to Nostr (shareToNostr is false)');
          }

          if (onSuccess) {
            onSuccess();
          }
        },
        onError: (error) => {
          toast({
            title: "Creation Failed",
            description: "Failed to create artwork. Please try again.",
            variant: "destructive"
          });
          console.error('Artwork creation error:', error);
        }
      });
    } catch (error) {
      console.error('Artwork creation error:', error);
    }
  };

  if (!user) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>
            Please log in to create artwork.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Palette className="w-5 h-5" />
          <span>Create Artwork</span>
        </CardTitle>
        <CardDescription>
          Add a new piece to your art gallery
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                <Select onValueChange={(value) => setValue('medium', value)}>
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
                  placeholder="e.g., 1920x1080"
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                </div>
              </div>

              {(isForSale || isAuction) && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select onValueChange={(value) => setValue('currency', value)} defaultValue="BTC">
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

          {/* Share to Nostr Option */}
          <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="shareToNostr"
                checked={watchedShareToNostr}
                onCheckedChange={(checked) => setValue('shareToNostr', !!checked, { shouldValidate: true })}
              />
              <input
                type="hidden"
                {...register('shareToNostr')}
              />
              <Label htmlFor="shareToNostr" className="text-base font-medium flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Share to Nostr Community
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically share your new artwork with the Nostr community to showcase your creation and connect with art lovers.
            </p>

            {watchedShareToNostr && (
              <div className="space-y-2">
                <Label htmlFor="shareMessage" className="text-sm font-medium">
                  Custom Share Message (optional)
                </Label>
                <Textarea
                  id="shareMessage"
                  placeholder="Add a personal message when sharing your artwork... (leave empty for default message)"
                  rows={3}
                  {...register('shareMessage')}
                  className="text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  If left empty, we'll create a nice default message for you.
                </p>
              </div>
            )}
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
              disabled={!isValid || isCreating || isSharing || images.length === 0}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Artwork...
                </>
              ) : isSharing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sharing to Nostr...
                </>
              ) : (
                <>
                  <Palette className="w-4 h-4 mr-2" />
                  Create Artwork
                </>
              )}
            </Button>

            {watchedShareToNostr && !isCreating && !isSharing && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Your artwork will be created and then shared to the Nostr community
              </p>
            )}

            {(isCreating || isSharing) && watchedShareToNostr && (
              <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isCreating ? 'Creating your beautiful artwork...' : 'Sharing to Nostr community...'}
                </div>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}