import { useState, useEffect } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMarketplaceProducts } from '@/hooks/useMarketplaceProducts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LoginArea } from '@/components/auth/LoginArea';
import { RelaySelector } from '@/components/RelaySelector';
import { ProductCard } from '@/components/marketplace/ProductCard';
import { ProductManagement } from '@/components/marketplace/ProductManagement';
import { LightningStatusIndicator } from '@/components/marketplace/LightningStatusIndicator';
import { FundraiserCard } from '@/components/fundraiser/FundraiserCard';
import { FundraiserManagement } from '@/components/fundraiser/FundraiserManagement';
import { useFundraisers } from '@/hooks/useFundraisers';
import { Label } from '@/components/ui/label';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import {
  ShoppingCart,
  Plus,
  Filter,
  Grid3X3,
  List,
  Zap,
  Target
} from 'lucide-react';

import { useCategories } from '@/hooks/useCategories';

const Shop = () => {
  const { user } = useCurrentUser();
  const [searchParams] = useSearchParams();

  // Check if current user is admin
  const isAdmin = useIsAdmin();

  // Get categories
  const { categoryNames } = useCategories();

  // Get initial tab from URL params
  const getInitialTab = () => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'admin' && isAdmin) return 'admin';
    if (tabParam === 'fundraiser-admin' && isAdmin) return 'fundraiser-admin';
    if (tabParam === 'fundraisers') return 'fundraisers';
    return 'marketplace';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab());

  // Get initial category from URL params
  const initialCategory = searchParams.get('category') || 'all';
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);

  // Update tab when URL params change
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'admin' && isAdmin) {
      setActiveTab('admin');
    } else if (tabParam === 'fundraiser-admin' && isAdmin) {
      setActiveTab('fundraiser-admin');
    } else if (tabParam === 'fundraisers') {
      setActiveTab('fundraisers');
    } else {
      setActiveTab('marketplace');
    }
  }, [searchParams, isAdmin]);

  // Update category when URL params change
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    } else {
      setSelectedCategory('all');
    }
  }, [searchParams]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch marketplace products
  const { data: products, isLoading: productsLoading, error: productsError } = useMarketplaceProducts(selectedCategory === 'all' ? undefined : selectedCategory);

  // Fetch fundraisers
  const { data: fundraisers = [], isLoading: fundraisersLoading } = useFundraisers();

  useSeoMeta({
    title: 'Shop - BitPop Cards Marketplace',
    description: 'Nostr-powered marketplace for physical and digital products. Create listings, manage inventory, and trade with Bitcoin.',
  });

  // Everyone can browse the marketplace, but login is required for purchases

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <ShoppingCart className="h-8 w-8 text-purple-600 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              BitPop Marketplace
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Discover and purchase amazing products on the Nostr network
          </p>
          <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Lightning payments to: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">bitpopart@walletofsatoshi.com</code></span>
            </div>
            <LightningStatusIndicator />
          </div>
          {user && isAdmin && (
            <Badge className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
              Admin Access • NIP-15 Marketplace
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-6xl mx-auto">
          {isAdmin ? (
            <TabsList className="grid w-full grid-cols-4 max-w-3xl mx-auto mb-8">
              <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
              <TabsTrigger value="fundraisers">Fundraisers</TabsTrigger>
              <TabsTrigger value="admin">Products</TabsTrigger>
              <TabsTrigger value="fundraiser-admin">Fundraiser Admin</TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
              <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
              <TabsTrigger value="fundraisers">Fundraisers</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="marketplace">
            <div className="space-y-6">
              {/* Login Prompt for Non-Logged-In Users */}
              {!user && (
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-center sm:text-left">
                        <h3 className="font-semibold text-purple-700 dark:text-purple-300 mb-1">
                          Ready to Purchase?
                        </h3>
                        <p className="text-sm text-purple-600 dark:text-purple-400">
                          Log in with your Nostr account to buy products and access all marketplace features
                        </p>
                      </div>
                      <LoginArea className="max-w-48" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Marketplace Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Marketplace</h2>
                  <p className="text-muted-foreground">
                    Discover products on the Nostr network
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
                      Add Product
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



              {/* Filters */}
              <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">Filter by category:</Label>
                    </div>

                    <div className="flex-1">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full sm:w-64">
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All categories</SelectItem>
                          {categoryNames.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <RelaySelector />
                  </div>
                </CardContent>
              </Card>

              {/* Products Display */}
              {productsLoading && (
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

              {productsError && (
                <Card className="border-dashed border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
                  <CardContent className="py-12 px-8 text-center">
                    <div className="max-w-sm mx-auto space-y-6">
                      <ShoppingCart className="h-12 w-12 mx-auto text-red-500" />
                      <div>
                        <CardTitle className="text-red-600 dark:text-red-400 mb-2">
                          Failed to Load Products
                        </CardTitle>
                        <CardDescription>
                          Unable to fetch marketplace products. Try switching to a different relay.
                        </CardDescription>
                      </div>
                      <RelaySelector className="w-full" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {products && products.length === 0 && !productsLoading && (
                <Card className="border-dashed">
                  <CardContent className="py-12 px-8 text-center">
                    <div className="max-w-sm mx-auto space-y-6">
                      <ShoppingCart className="h-12 w-12 mx-auto text-gray-400" />
                      <div>
                        <CardTitle className="mb-2">No Products Found</CardTitle>
                        <CardDescription>
                          {selectedCategory && selectedCategory !== 'all'
                            ? `No products found in the "${selectedCategory}" category. Try a different category or relay.`
                            : "No products have been listed yet. Try switching to a different relay or be the first to list a product!"
                          }
                        </CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <RelaySelector className="flex-1" />
                        {user && isAdmin && (
                          <Button size="sm" onClick={() => setActiveTab('admin')}>
                            <Plus className="mr-2 h-4 w-4" />
                            List Product
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {products && products.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {products.length} product{products.length !== 1 ? 's' : ''} found
                      {selectedCategory && selectedCategory !== 'all' && ` in "${selectedCategory}"`}
                    </p>
                  </div>

                  <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onViewDetails={(product) => {
                          console.log('Viewing product details:', product);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="fundraisers">
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <Target className="h-8 w-8 text-purple-600 mr-3" />
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Fundraising Campaigns
                  </h2>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Support new art projects and creative ventures with Bitcoin
                </p>
              </div>

              {/* Fundraisers Display */}
              {fundraisersLoading && (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="aspect-video">
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
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {fundraisers.length === 0 && !fundraisersLoading && (
                <Card className="border-dashed">
                  <CardContent className="py-12 px-8 text-center">
                    <div className="max-w-sm mx-auto space-y-6">
                      <Target className="h-12 w-12 mx-auto text-gray-400" />
                      <div>
                        <CardTitle className="mb-2">No Fundraisers Yet</CardTitle>
                        <CardDescription>
                          Check back soon for new crowdfunding campaigns, or try a different relay.
                        </CardDescription>
                      </div>
                      <RelaySelector className="w-full" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {fundraisers.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    {fundraisers.length} active campaign{fundraisers.length !== 1 ? 's' : ''}
                  </p>
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                    {fundraisers.map((fundraiser) => (
                      <FundraiserCard key={fundraiser.id} fundraiser={fundraiser} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {user && isAdmin && (
            <>
              <TabsContent value="admin">
                <ProductManagement />
              </TabsContent>

              <TabsContent value="fundraiser-admin">
                <FundraiserManagement />
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Footer */}
        <div className="text-center mt-16 text-sm text-gray-500 dark:text-gray-400">
          <p>Nostr & BitPopArt {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
};

export default Shop;