import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketplaceProduct, useDeleteProduct } from '@/hooks/useMarketplaceProducts';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AlertCircle, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function DeleteProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { data: product, isLoading } = useMarketplaceProduct(productId || '');
  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct();

  useEffect(() => {
    if (!isLoading && !product) {
      // Product not found, redirect to shop
      navigate('/shop');
    }
  }, [product, isLoading, navigate]);

  // Check if user owns this product
  const isOwner = user && product?.event && product.event.pubkey === user.pubkey;

  const handleDelete = () => {
    if (!productId) return;
    
    deleteProduct(productId, {
      onSuccess: () => {
        // Navigate back to shop or admin after successful deletion
        navigate('/admin');
      }
    });
  };

  const handleCancel = () => {
    navigate(`/shop/${productId}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <div className="flex space-x-3">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!product) {
    return null; // Will redirect in useEffect
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please log in to delete products.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/shop')}>
                Back to Shop
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Permission Denied</CardTitle>
              <CardDescription>
                You don't have permission to delete this product.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/shop')}>
                Back to Shop
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="mb-6 hover:bg-purple-100 dark:hover:bg-purple-900/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-red-900 dark:text-red-100">
                    Delete Product
                  </CardTitle>
                  <CardDescription className="text-red-700 dark:text-red-300">
                    This action cannot be undone
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Are you sure you want to delete "{product.name}"? This will publish a deletion event to the Nostr network and cannot be undone.
                </AlertDescription>
              </Alert>

              {/* Product Preview */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                <div className="flex items-start space-x-4">
                  {product.images && product.images.length > 0 && (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Product
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
