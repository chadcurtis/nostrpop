import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/hooks/usePayment';
import { useLivePrice } from '@/hooks/useLivePrice';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { ShareToNostrButton } from '@/components/ShareToNostrButton';
import { ClawstrShare } from '@/components/ClawstrShare';
import { PaymentDialog } from './PaymentDialog';
import { ProductDetailsDialog } from './ProductDetailsDialog';
import { ImageGallery } from './ImageGallery';
import {
  ShoppingCart,
  Package,
  Download,
  Eye,
  Truck,
  Zap,
  Share2
} from 'lucide-react';
import type { NostrEvent } from '@nostrify/nostrify';

interface MarketplaceProduct {
  id: string;
  event?: NostrEvent; // NostrEvent - optional for sample data
  name: string;
  description: string;
  images: string[];
  currency: string;
  price: number;
  quantity?: number;
  category: string;
  type: 'physical' | 'digital';
  specs?: Array<[string, string]>;
  shipping?: Array<{ id: string; cost: number }>;
  digital_files?: string[];
  product_url?: string; // URL for physical products
  contact_url?: string; // URL for contacting seller
  stall_id: string;
  created_at: string;
}

interface ProductCardProps {
  product: MarketplaceProduct;
  onViewDetails?: (product: MarketplaceProduct) => void;
}

export function ProductCard({ product, onViewDetails }: ProductCardProps) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  // Fetch live price from source URL if available
  const { data: livePrice, isLoading: priceLoading } = useLivePrice(
    product.contact_url || product.product_url,
    product.price,
    product.currency
  );

  const displayPrice = livePrice?.price ?? product.price;
  const displayCurrency = livePrice?.currency ?? product.currency;
  const displayPriceInSats = livePrice?.priceInSats;

  const isOutOfStock = product.quantity !== undefined && product.quantity <= 0;
  const hasShipping = product.shipping && product.shipping.length > 0;
  const shippingCost = hasShipping ? product.shipping![0].cost : 0;

  const handleBuyNow = () => {
    if (product.type === 'physical') {
      // For physical products, navigate to the internal product page
      navigate(`/shop/${product.id}`);
    } else if (product.type === 'digital') {
      // For digital products, open payment dialog
      setPaymentDialogOpen(true);
    }
  };

  const handleViewDetails = () => {
    setDetailsDialogOpen(true);
    if (onViewDetails) {
      onViewDetails(product);
    }
  };

  const handleImageClick = () => {
    // Same behavior as "Buy Now" button
    if (product.type === 'physical') {
      // For physical products, navigate to the internal product page
      navigate(`/shop/${product.id}`);
    } else if (product.type === 'digital') {
      // For digital products, open payment dialog
      setPaymentDialogOpen(true);
    }
  };

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        {/* Product Image */}
        <div className="relative">
          <ImageGallery
            images={product.images}
            productName={product.name}
            showThumbnails={false}
            aspectRatio="square"
            onClick={handleImageClick}
            enableFullscreen={false}
          />

          {/* Product type badge */}
          <div className="absolute top-2 left-2 z-10">
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

          {/* Stock status */}
          {isOutOfStock && (
            <div className="absolute top-2 right-2 z-10">
              <Badge variant="destructive" className="text-xs">
                Out of Stock
              </Badge>
            </div>
          )}
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate group-hover:text-purple-600 transition-colors">
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
            {isAdmin && product.event && (
              <div className="flex gap-1">
                <ShareToNostrButton
                  url={`/shop/${product.id}`}
                  title={product.name}
                  description={product.description}
                  image={product.images[0]}
                  variant="ghost"
                  size="icon"
                />
                <ClawstrShare
                  event={product.event}
                  contentType="product"
                  trigger={
                    <Button variant="ghost" size="icon">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <CardDescription className="text-sm line-clamp-2 mb-3">
            {product.description}
          </CardDescription>

          {/* Shipping info for physical products */}
          {product.type === 'physical' && hasShipping && (
            <div className="flex items-center text-xs text-muted-foreground mb-3">
              <Truck className="w-3 h-3 mr-1" />
              <span>Shipping: {formatCurrency(shippingCost, product.currency)}</span>
            </div>
          )}

          {/* Price and actions */}
          <div className="flex items-center justify-between">
            <div>
              {priceLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(displayPrice, displayCurrency)}
                  </div>
                  {displayPriceInSats && (
                    <div className="flex items-center text-xs text-orange-600 dark:text-orange-400 mt-1">
                      <Zap className="w-3 h-3 mr-1" />
                      <span>{displayPriceInSats.toLocaleString()} sats</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex space-x-2">
              {product.type === 'digital' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewDetails}
                  className="flex items-center space-x-1"
                >
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                {isOutOfStock ? 'Sold Out' : (product.type === 'physical' ? 'View Product' : 'Buy Now')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Details Dialog */}
      <ProductDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        product={product}
      />

      {/* Payment Dialog - Only for digital products */}
      {product.type === 'digital' && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          product={product}
        />
      )}
    </>
  );
}