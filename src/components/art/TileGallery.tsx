import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ArtworkData } from '@/lib/artTypes';
import { Eye, ShoppingCart, Gavel } from 'lucide-react';
import { POPUP_TYPE_CONFIG } from '@/lib/popupTypes';

interface TileGalleryProps {
  artworks: ArtworkData[];
  onViewDetails: (artwork: ArtworkData) => void;
  onBuy?: (artwork: ArtworkData) => void;
  onBid?: (artwork: ArtworkData) => void;
}

export function TileGallery({ artworks, onViewDetails, onBuy, onBid }: TileGalleryProps) {
  if (artworks.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
        Featured Gallery
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {artworks.map((artwork) => (
          <Card
            key={artwork.id}
            className="group overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 bg-white dark:bg-gray-800"
            onClick={() => onViewDetails(artwork)}
          >
            <div className="relative aspect-square overflow-hidden">
              {artwork.images && artwork.images.length > 0 ? (
                <img
                  src={artwork.images[0]}
                  alt={artwork.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-100 via-pink-100 to-indigo-100 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-indigo-900/20 flex items-center justify-center">
                  <span className="text-4xl md:text-6xl opacity-40">🎨</span>
                </div>
              )}
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 md:p-4">
                <h3 className="text-white font-bold text-sm md:text-base mb-1 line-clamp-2">
                  {artwork.title}
                </h3>
                
                <div className="flex items-center justify-between gap-2">
                  {artwork.sale_type === 'fixed' && artwork.price && (
                    <Badge className="bg-green-500 text-white text-xs">
                      {artwork.price.toLocaleString()} {artwork.currency}
                    </Badge>
                  )}
                  {artwork.sale_type === 'auction' && (
                    <Badge className="bg-red-500 text-white text-xs">
                      Auction
                    </Badge>
                  )}
                  {artwork.sale_type === 'sold' && (
                    <Badge className="bg-gray-500 text-white text-xs">
                      Sold
                    </Badge>
                  )}
                  
                  <div className="flex gap-1">
                    {artwork.sale_type === 'fixed' && onBuy && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBuy(artwork);
                        }}
                      >
                        <ShoppingCart className="h-3 w-3" />
                      </Button>
                    )}
                    {artwork.sale_type === 'auction' && onBid && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBid(artwork);
                        }}
                      >
                        <Gavel className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(artwork);
                      }}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
