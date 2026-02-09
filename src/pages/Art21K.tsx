import { useState, useRef } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { useUploadFile } from '@/hooks/useUploadFile';
import { LoginArea } from '@/components/auth/LoginArea';
import { 
  TrendingUp, 
  Upload, 
  Image as ImageIcon, 
  DollarSign, 
  Bitcoin,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';

// Event kind for 21K Art entries
const ART_21K_KIND = 30421;

interface Art21KEntry {
  id: string;
  date: string;
  satPrice: number;
  usdPrice: number;
  imageUrl: string;
  artworkNumber: number;
  timestamp: number;
}

function Art21K() {
  const { user } = useCurrentUser();
  const { nostr } = useNostr();
  const { toast } = useToast();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    satPrice: '21000',
    usdPrice: '',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all 21K art entries
  const { data: artworks, isLoading, refetch } = useQuery({
    queryKey: ['21k-artworks'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);
      
      const events = await nostr.query([
        {
          kinds: [ART_21K_KIND],
          limit: 100
        }
      ], { signal });

      const entries: Art21KEntry[] = events
        .map((event, index) => {
          try {
            const content = JSON.parse(event.content);
            const dTag = event.tags.find(([name]) => name === 'd')?.[1];
            const dateTag = event.tags.find(([name]) => name === 'date')?.[1];
            const satPriceTag = event.tags.find(([name]) => name === 'sat_price')?.[1];
            const usdPriceTag = event.tags.find(([name]) => name === 'usd_price')?.[1];
            const imageTag = event.tags.find(([name]) => name === 'image')?.[1];

            if (!dTag || !dateTag || !satPriceTag || !usdPriceTag || !imageTag) return null;

            return {
              id: dTag,
              date: dateTag,
              satPrice: parseInt(satPriceTag),
              usdPrice: parseFloat(usdPriceTag),
              imageUrl: imageTag,
              artworkNumber: content.artwork_number || index + 1,
              timestamp: event.created_at
            };
          } catch (error) {
            console.warn('Failed to parse 21K art entry:', error);
            return null;
          }
        })
        .filter(Boolean) as Art21KEntry[];

      return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive"
      });
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to add artwork.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedImage) {
      toast({
        title: "Image Required",
        description: "Please select an artwork image.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload image
      const [[_, imageUrl]] = await uploadFile(selectedImage);

      // Create artwork entry
      const artworkNumber = (artworks?.length || 0) + 1;
      const entryId = `21k-${Date.now()}`;

      const event = {
        kind: ART_21K_KIND,
        content: JSON.stringify({
          artwork_number: artworkNumber,
        }),
        tags: [
          ['d', entryId],
          ['date', formData.date],
          ['sat_price', formData.satPrice],
          ['usd_price', formData.usdPrice],
          ['image', imageUrl],
          ['t', '21k-sats-art'],
          ['alt', `21K Sats Art #${artworkNumber} - Sold for ${formData.satPrice} sats ($${formData.usdPrice}) on ${formData.date}`]
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      const signedEvent = await user.signer.signEvent(event);
      await nostr.event(signedEvent, { signal: AbortSignal.timeout(5000) });

      toast({
        title: "Artwork Added! ⚡",
        description: `21K Sats Art #${artworkNumber} has been added to the collection.`,
      });

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        satPrice: '21000',
        usdPrice: '',
      });
      setSelectedImage(null);
      setPreviewUrl('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      refetch();
    } catch (error) {
      console.error('Failed to add artwork:', error);
      toast({
        title: "Failed to Add Artwork",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useSeoMeta({
    title: '21K Sats Art - Bitcoin Art Value Experiment',
    description: 'Exploring art value through Bitcoin. Each unique artwork sold for 21,000 sats. Track how USD value changes over time.',
  });

  // Calculate graph data
  const graphData = artworks?.map(art => ({
    date: new Date(art.date),
    usdPrice: art.usdPrice,
    artwork: art
  })) || [];

  const maxPrice = Math.max(...(graphData.map(d => d.usdPrice) || [0]), 100);
  const minPrice = Math.min(...(graphData.map(d => d.usdPrice) || [0]), 0);
  const priceRange = maxPrice - minPrice || 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50 dark:from-gray-900 dark:via-orange-900/20 dark:to-yellow-900/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Bitcoin className="h-12 w-12 text-orange-600 mr-4" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 via-yellow-600 to-orange-600 bg-clip-text text-transparent">
              21K Sats Art
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-6">
            A Bitcoin art value experiment. Each unique artwork sold for 21,000 satoshis.
          </p>
          
          <Badge variant="secondary" className="text-base px-4 py-2">
            <Bitcoin className="w-4 h-4 mr-2 text-orange-500" />
            Fixed price: 21,000 sats
          </Badge>
        </div>

        {/* Login Prompt */}
        {!user && (
          <Card className="mb-6 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h3 className="font-semibold text-orange-700 dark:text-orange-300 mb-1">
                    Add Your Artwork
                  </h3>
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    Log in to upload and track your 21K sats artwork sales
                  </p>
                </div>
                <LoginArea className="max-w-48" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Form */}
          <div className="lg:col-span-1">
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2" />
                  Add Artwork Sale
                </CardTitle>
                <CardDescription>
                  Upload a sold artwork and record the sale
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="image">Artwork Image *</Label>
                    <input
                      ref={fileInputRef}
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      disabled={!user || isSubmitting}
                      className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:file:bg-orange-900/20 dark:file:text-orange-300"
                    />
                    {previewUrl && (
                      <div className="mt-2 border-2 border-orange-200 rounded-lg overflow-hidden">
                        <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="date">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Sale Date *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      disabled={!user || isSubmitting}
                      required
                    />
                  </div>

                  {/* Sat Price */}
                  <div className="space-y-2">
                    <Label htmlFor="satPrice">
                      <Bitcoin className="w-4 h-4 inline mr-1 text-orange-500" />
                      Price in Sats *
                    </Label>
                    <Input
                      id="satPrice"
                      type="number"
                      value={formData.satPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, satPrice: e.target.value }))}
                      disabled={!user || isSubmitting}
                      placeholder="21000"
                      required
                    />
                  </div>

                  {/* USD Price */}
                  <div className="space-y-2">
                    <Label htmlFor="usdPrice">
                      <DollarSign className="w-4 h-4 inline mr-1 text-green-500" />
                      USD Price on Sale Date *
                    </Label>
                    <Input
                      id="usdPrice"
                      type="number"
                      step="0.01"
                      value={formData.usdPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, usdPrice: e.target.value }))}
                      disabled={!user || isSubmitting}
                      placeholder="15.50"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
                    disabled={!user || isSubmitting || isUploading || !selectedImage}
                  >
                    {isSubmitting || isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Add to Collection
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Stats */}
            {artworks && artworks.length > 0 && (
              <Card className="mt-6 border-orange-200 dark:border-orange-800">
                <CardHeader>
                  <CardTitle className="text-lg">Collection Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Artworks</span>
                    <span className="font-bold">{artworks.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg USD Price</span>
                    <span className="font-bold text-green-600">
                      ${(artworks.reduce((sum, a) => sum + a.usdPrice, 0) / artworks.length).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Price Range</span>
                    <span className="font-bold">
                      ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Graph and Gallery */}
          <div className="lg:col-span-2 space-y-6">
            {/* Line Graph */}
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-orange-600" />
                  USD Value Over Time
                </CardTitle>
                <CardDescription>
                  21,000 sats converted to USD on each sale date
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="w-full h-80" />
                ) : artworks && artworks.length > 0 ? (
                  <div className="relative w-full h-80 bg-white dark:bg-gray-800 rounded-lg p-4">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-muted-foreground py-4">
                      <span>${maxPrice.toFixed(0)}</span>
                      <span>${((maxPrice + minPrice) / 2).toFixed(0)}</span>
                      <span>${minPrice.toFixed(0)}</span>
                    </div>

                    {/* Graph area */}
                    <div className="ml-12 h-full relative">
                      <svg className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
                        {/* Grid lines */}
                        <line x1="0" y1="0" x2="1000" y2="0" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-gray-700" />
                        <line x1="0" y1="150" x2="1000" y2="150" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-gray-700" strokeDasharray="5,5" />
                        <line x1="0" y1="300" x2="1000" y2="300" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-gray-700" />

                        {/* Orange line graph */}
                        {graphData.length > 1 && (
                          <polyline
                            points={graphData.map((point, index) => {
                              const x = (index / (graphData.length - 1)) * 1000;
                              const y = 300 - ((point.usdPrice - minPrice) / priceRange) * 300;
                              return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#f97316"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Data points */}
                        {graphData.map((point, index) => {
                          const x = graphData.length > 1 ? (index / (graphData.length - 1)) * 1000 : 500;
                          const y = 300 - ((point.usdPrice - minPrice) / priceRange) * 300;
                          return (
                            <circle
                              key={index}
                              cx={x}
                              cy={y}
                              r="6"
                              fill="#f97316"
                              className="cursor-pointer hover:r-8 transition-all"
                            />
                          );
                        })}
                      </svg>

                      {/* Artwork thumbnails positioned on graph */}
                      <div className="absolute inset-0">
                        {graphData.map((point, index) => {
                          const x = graphData.length > 1 ? (index / (graphData.length - 1)) * 100 : 50;
                          const y = 100 - ((point.usdPrice - minPrice) / priceRange) * 100;
                          return (
                            <div
                              key={index}
                              className="absolute"
                              style={{
                                left: `${x}%`,
                                top: `${y}%`,
                                transform: 'translate(-50%, -100%)',
                              }}
                            >
                              <div className="relative group">
                                <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-orange-500 bg-white shadow-lg">
                                  <img
                                    src={point.artwork.imageUrl}
                                    alt={`Artwork #${point.artwork.artworkNumber}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
                                  <div className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                                    ${point.usdPrice.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {point.artwork.satPrice.toLocaleString()} sats
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(point.date).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ImageIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-muted-foreground">No artworks yet. Add your first sale above!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gallery */}
            {artworks && artworks.length > 0 && (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ImageIcon className="h-5 w-5 mr-2" />
                    Collection Gallery ({artworks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {artworks.map((artwork) => (
                      <div key={artwork.id} className="space-y-2">
                        <div className="aspect-square rounded-lg overflow-hidden border-2 border-orange-200 dark:border-orange-800">
                          <img
                            src={artwork.imageUrl}
                            alt={`Artwork #${artwork.artworkNumber}`}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="text-center">
                          <Badge variant="outline" className="mb-1">
                            #{artwork.artworkNumber}
                          </Badge>
                          <div className="text-sm font-semibold text-green-600">
                            ${artwork.usdPrice.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {artwork.satPrice.toLocaleString()} sats
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(artwork.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* About Section */}
        <Card className="max-w-4xl mx-auto mt-16 border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50/50 to-yellow-50/50 dark:from-orange-900/10 dark:to-yellow-900/10">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-700 dark:text-orange-300">
              <Info className="w-5 h-5 mr-2" />
              About This Project
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-600 dark:text-orange-400 leading-relaxed">
              This project explores the value of art in a new way. I will sell my unique small artworks for 21,000 Satoshis, a fraction of a Bitcoin. If you prefer to pay in your local currency, the price will equal the value of 21,000 sats on the day of purchase. I believe that over time, these artworks will grow in value compared to dollars, euros, or other fiat currencies, and that's the idea I want to highlight through this project. Each artwork will be a 1/1 digital print, framed with a one-of-a-kind painted frame. The pieces will be numbered, so you'll know exactly which one you own in the collection.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>Nostr & BitPopArt {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
}

export default Art21K;
