import { useState, useEffect } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useArtworks } from '@/hooks/useArtworks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoginArea } from '@/components/auth/LoginArea';
import { RelaySelector } from '@/components/RelaySelector';
import { ArtworkThumbnail } from '@/components/art/ArtworkThumbnail';
import { TileGallery } from '@/components/art/TileGallery';
import { CreateArtworkForm } from '@/components/art/CreateArtworkForm';
import { EditArtworkForm } from '@/components/art/EditArtworkForm';
import { PaymentDialog } from '@/components/marketplace/PaymentDialog';
import { Label } from '@/components/ui/label';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useToast } from '@/hooks/useToast';
import type { ArtworkData, ArtworkFilter } from '@/lib/artTypes';
import {
  Palette,
  Plus,
  Filter,
  Grid3X3,
  List,
  Gavel,
  ShoppingCart,
  Eye,
  CheckCircle
} from 'lucide-react';
import { nip19 } from 'nostr-tools';

const Art = () => {
  const { user } = useCurrentUser();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Check if current user is admin
  const isAdmin = useIsAdmin();

  // Get initial tab from URL params
  const initialTab = searchParams.get('tab') === 'admin' && isAdmin ? 'admin' : 'gallery';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Get initial filter from URL params
  const initialFilter = (searchParams.get('filter') as ArtworkFilter) || 'all';
  const [selectedFilter, setSelectedFilter] = useState<ArtworkFilter>(initialFilter);

  // Update tab when URL params change
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'admin' && isAdmin) {
      setActiveTab('admin');
    } else {
      setActiveTab('gallery');
    }
  }, [searchParams, isAdmin]);

  // Update filter when URL params change
  useEffect(() => {
    const filterParam = searchParams.get('filter') as ArtworkFilter;
    if (filterParam && ['all', 'for_sale', 'auction', 'sold'].includes(filterParam)) {
      setSelectedFilter(filterParam);
    } else {
      setSelectedFilter('all');
    }
  }, [searchParams]);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editingArtwork, setEditingArtwork] = useState<ArtworkData | null>(null);
  const [buyingArtwork, setBuyingArtwork] = useState<ArtworkData | null>(null);

  // Fetch artworks
  const { data: artworks, isLoading: artworksLoading, error: artworksError } = useArtworks(selectedFilter);
  
  // Get featured artworks for tile gallery
  const featuredArtworks = artworks?.filter(artwork => artwork.featured) || [];

  useSeoMeta({
    title: 'Art Gallery - BitPop Cards',
    description: 'Discover and collect unique digital artworks. Browse our gallery, participate in auctions, and purchase exclusive pieces.',
  });

  const handleViewDetails = (artwork: ArtworkData) => {
    // Navigate to artwork detail page
    const naddr = nip19.naddrEncode({
      identifier: artwork.id,
      pubkey: artwork.artist_pubkey,
      kind: 30023,
    });
    window.location.href = `/art/${naddr}`;
  };

  const handleBuy = (artwork: ArtworkData) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to purchase artwork.",
        variant: "destructive"
      });
      return;
    }

    setBuyingArtwork(artwork);
  };

  const handleBid = (_artwork: ArtworkData) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to place bids.",
        variant: "destructive"
      });
      return;
    }

    // TODO: Implement bidding flow
    toast({
      title: "Bidding Feature",
      description: "Bidding functionality will be implemented soon.",
    });
  };

  const handleEdit = (artwork: ArtworkData) => {
    if (!user || !isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only admins can edit artworks.",
        variant: "destructive"
      });
      return;
    }

    setEditingArtwork(artwork);
  };

  const handleEditSuccess = () => {
    setEditingArtwork(null);
    toast({
      title: "Artwork Updated",
      description: "Your artwork has been updated successfully.",
    });
  };

  const handleEditCancel = () => {
    setEditingArtwork(null);
  };

  // Convert artwork to marketplace product format for payment
  const convertArtworkToProduct = (artwork: ArtworkData) => {
    return {
      id: artwork.id,
      name: artwork.title,
      description: artwork.description,
      images: artwork.images || [],
      currency: artwork.currency || 'SAT',
      price: artwork.price || 0,
      category: 'Artwork',
      type: 'digital' as const, // Artworks are treated as digital products
      stall_id: 'art-gallery',
      created_at: artwork.created_at,
      digital_files: artwork.images || [], // Use artwork images as digital files
      digital_file_names: artwork.images?.map((_, index) => `${artwork.title}_${index + 1}.jpg`) || []
    };
  };

  const getFilterStats = () => {
    if (!artworks) return { total: 0, forSale: 0, auction: 0, sold: 0 };

    return {
      total: artworks.length,
      forSale: artworks.filter(a => a.sale_type === 'fixed').length,
      auction: artworks.filter(a => a.sale_type === 'auction').length,
      sold: artworks.filter(a => a.sale_type === 'sold').length,
    };
  };

  const stats = getFilterStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Palette className="h-8 w-8 text-purple-600 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
              Art Gallery
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover and collect unique digital artworks on the Nostr network
          </p>
          {user && isAdmin && (
            <Badge className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              Admin Access • Art Gallery Management
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-6xl mx-auto">
          {isAdmin ? (
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="admin">Create Art</TabsTrigger>
            </TabsList>
          ) : (
            <div className="mb-8" />
          )}

          <TabsContent value="gallery">
            <div className="space-y-6">
              {/* Featured Tile Gallery */}
              {featuredArtworks.length > 0 && !artworksLoading && (
                <TileGallery
                  artworks={featuredArtworks}
                  onViewDetails={handleViewDetails}
                  onBuy={handleBuy}
                  onBid={handleBid}
                />
              )}

              {/* Login Prompt for Non-Logged-In Users */}
              {!user && (
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-center sm:text-left">
                        <h3 className="font-semibold text-purple-700 dark:text-purple-300 mb-1">
                          Ready to Collect Art?
                        </h3>
                        <p className="text-sm text-purple-600 dark:text-purple-400">
                          Log in with your Nostr account to purchase artwork and participate in auctions
                        </p>
                      </div>
                      <LoginArea className="max-w-48" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Gallery Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Art Gallery</h2>
                  <p className="text-muted-foreground">
                    Explore artworks from BitPopArt
                    {!user && " • Login required for purchases"}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {user && isAdmin && (
                    <Button
                      onClick={() => setActiveTab('admin')}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Artwork
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  >
                    {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Eye className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total Artworks</div>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <ShoppingCart className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{stats.forSale}</div>
                    <div className="text-xs text-muted-foreground">For Sale</div>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Gavel className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold text-red-600">{stats.auction}</div>
                    <div className="text-xs text-muted-foreground">Live Auctions</div>
                  </CardContent>
                </Card>

                <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-600">{stats.sold}</div>
                    <div className="text-xs text-muted-foreground">Sold</div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">Filter artworks:</Label>
                    </div>

                    <div className="flex-1">
                      <Select value={selectedFilter} onValueChange={(value: ArtworkFilter) => setSelectedFilter(value)}>
                        <SelectTrigger className="w-full sm:w-64">
                          <SelectValue placeholder="All artworks" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All artworks ({stats.total})</SelectItem>
                          <SelectItem value="for_sale">For sale ({stats.forSale})</SelectItem>
                          <SelectItem value="auction">Live auctions ({stats.auction})</SelectItem>
                          <SelectItem value="sold">Sold ({stats.sold})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <RelaySelector />
                  </div>
                </CardContent>
              </Card>

              {/* Artworks Display */}
              {artworksLoading && (
                <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="aspect-square">
                        <Skeleton className="w-full h-full" />
                      </div>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                          <div className="flex justify-between items-center pt-2">
                            <Skeleton className="h-6 w-20" />
                            <Skeleton className="h-8 w-16" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {artworksError && (
                <Card className="border-dashed border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
                  <CardContent className="py-12 px-8 text-center">
                    <div className="max-w-sm mx-auto space-y-6">
                      <Palette className="h-12 w-12 mx-auto text-red-500" />
                      <div>
                        <CardTitle className="text-red-600 dark:text-red-400 mb-2">
                          Failed to Load Artworks
                        </CardTitle>
                        <CardDescription>
                          Unable to fetch artworks. Try switching to a different relay.
                        </CardDescription>
                      </div>
                      <RelaySelector className="w-full" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {artworks && artworks.length === 0 && !artworksLoading && (
                <Card className="border-dashed">
                  <CardContent className="py-12 px-8 text-center">
                    <div className="max-w-sm mx-auto space-y-6">
                      <Palette className="h-12 w-12 mx-auto text-gray-400" />
                      <div>
                        <CardTitle className="mb-2">No Artworks Found</CardTitle>
                        <CardDescription>
                          {selectedFilter !== 'all'
                            ? `No artworks found with the "${selectedFilter}" filter. Try a different filter or relay.`
                            : "No artworks have been added yet. Try switching to a different relay or be the first to add artwork!"
                          }
                        </CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <RelaySelector className="flex-1" />
                        {user && isAdmin && (
                          <Button size="sm" onClick={() => setActiveTab('admin')}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Artwork
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {artworks && artworks.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {artworks.length} artwork{artworks.length !== 1 ? 's' : ''} found
                      {selectedFilter !== 'all' && ` with "${selectedFilter}" filter`}
                    </p>
                  </div>

                  <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {artworks.map((artwork) => (
                      <ArtworkThumbnail
                        key={artwork.id}
                        artwork={artwork}
                        onViewDetails={handleViewDetails}
                        onBuy={handleBuy}
                        onBid={handleBid}
                        onEdit={user && isAdmin ? handleEdit : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {user && isAdmin && (
            <TabsContent value="admin">
              <CreateArtworkForm
                onSuccess={() => {
                  setActiveTab('gallery');
                  toast({
                    title: "Artwork Created",
                    description: "Your artwork has been added to the gallery.",
                  });
                }}
                onCancel={() => setActiveTab('gallery')}
              />
            </TabsContent>
          )}
        </Tabs>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>Nostr & BitPopArt {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Edit Artwork Dialog */}
      <Dialog open={!!editingArtwork} onOpenChange={(open) => !open && setEditingArtwork(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Artwork</DialogTitle>
          </DialogHeader>
          {editingArtwork && (
            <EditArtworkForm
              artwork={editingArtwork}
              onSuccess={handleEditSuccess}
              onCancel={handleEditCancel}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      {buyingArtwork && (
        <PaymentDialog
          open={!!buyingArtwork}
          onOpenChange={(open) => !open && setBuyingArtwork(null)}
          product={convertArtworkToProduct(buyingArtwork)}
        />
      )}
    </div>
  );
};

export default Art;