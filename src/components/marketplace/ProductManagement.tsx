import { useState } from 'react';
import { useMarketplaceProducts, useDeleteProduct } from '@/hooks/useMarketplaceProducts';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CreateProductForm } from './CreateProductForm';
import { EditProductForm } from './EditProductForm';
import { AddProductByUrl } from './AddProductByUrl';
import { LightningAddressDebugger } from './LightningAddressDebugger';
import { CategoryManagement } from './CategoryManagement';
import { formatCurrency } from '@/hooks/usePayment';
import { useToast } from '@/hooks/useToast';
import type { MarketplaceProduct } from '@/lib/sampleProducts';
import {
  Plus,
  Edit,
  Trash2,
  Package,
  Download,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Link2
} from 'lucide-react';

import { useCategories } from '@/hooks/useCategories';

export function ProductManagement() {
  const [activeTab, setActiveTab] = useState('products');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null);
  const [importedProductData, setImportedProductData] = useState<any>(null);

  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { categoryNames } = useCategories();
  const { data: products, isLoading, refetch } = useMarketplaceProducts(
    selectedCategory === 'All Categories' ? undefined : selectedCategory
  );
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();

  // Filter products by search query
  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Calculate stats
  const totalProducts = products?.length || 0;
  const totalValue = products?.reduce((sum, product) => sum + product.price, 0) || 0;
  const outOfStockProducts = products?.filter(product =>
    product.quantity !== undefined && product.quantity <= 0
  ).length || 0;

  const handleCreateSuccess = () => {
    setActiveTab('products');
    refetch();
  };

  const handleEditSuccess = () => {
    setEditingProduct(null);
    setActiveTab('products');
    refetch();
  };

  const handleDeleteProduct = (productId: string) => {
    deleteProduct(productId);
  };

  if (!user) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>
            Please log in to manage marketplace products.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Product Management</h1>
          <p className="text-muted-foreground">
            Manage your marketplace products and inventory
          </p>
        </div>
        <Button
          onClick={() => setActiveTab('create')}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold">{outOfStockProducts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{new Set(products?.map(p => p.category)).size || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 max-w-4xl">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="create">Create</TabsTrigger>
          <TabsTrigger value="import">Import URL</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Categories">All Categories</SelectItem>
                      {categoryNames.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
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
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-6">
                  <ShoppingCart className="h-12 w-12 mx-auto text-gray-400" />
                  <div>
                    <CardTitle className="mb-2">No Products Found</CardTitle>
                    <CardDescription>
                      {searchQuery || selectedCategory !== 'All Categories'
                        ? "No products match your current filters. Try adjusting your search or category filter."
                        : "You haven't created any products yet. Start by adding your first product to the marketplace."
                      }
                    </CardDescription>
                  </div>
                  <Button onClick={() => setActiveTab('create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Product
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="group hover:shadow-lg transition-all duration-300">
                  {/* Product Image */}
                  <div className="relative aspect-square overflow-hidden">
                    {product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                        {product.type === 'digital' ? (
                          <Download className="w-12 h-12 text-gray-400" />
                        ) : (
                          <Package className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                    )}

                    {/* Product Type Badge */}
                    <div className="absolute top-2 left-2">
                      <Badge variant={product.type === 'digital' ? 'default' : 'secondary'} className="text-xs">
                        {product.type === 'digital' ? (
                          <>
                            <Download className="w-3 h-3 mr-1" />
                            Digital
                          </>
                        ) : (
                          <>
                            <Package className="w-3 h-3 mr-1" />
                            Physical
                          </>
                        )}
                      </Badge>
                    </div>

                    {/* Stock Status */}
                    {product.quantity !== undefined && product.quantity <= 0 && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="destructive" className="text-xs">
                          Out of Stock
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold truncate">
                          {product.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                          {product.quantity !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {product.quantity} available
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <CardDescription className="text-sm line-clamp-2 mb-3">
                      {product.description}
                    </CardDescription>

                    <div className="flex items-center justify-between">
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(product.price, product.currency)}
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProduct(product)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isDeleting}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Product</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{product.name}"? This action will publish a deletion event to the Nostr network and cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteProduct(product.id)}
                                disabled={isDeleting}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create">
          <CreateProductForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setActiveTab('products')}
            initialData={importedProductData}
          />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <AddProductByUrl 
            onProductScraped={(data) => {
              setImportedProductData(data);
              setActiveTab('create');
              toast({
                title: "Product Data Imported",
                description: `Loaded "${data.name}". Review and publish to your shop.`,
              });
            }}
          />
        </TabsContent>

        <TabsContent value="categories">
          <CategoryManagement />
        </TabsContent>



        <TabsContent value="debug">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Lightning Address Debugging</CardTitle>
                <CardDescription>
                  Debug the Lightning address integration to identify and fix payment issues.
                  This tool tests the LNURL endpoint and invoice generation process.
                </CardDescription>
              </CardHeader>
            </Card>
            <LightningAddressDebugger />
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <EditProductForm
              product={editingProduct}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingProduct(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}