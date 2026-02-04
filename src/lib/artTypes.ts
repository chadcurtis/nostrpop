import type { NostrEvent } from '@nostrify/nostrify';

export interface ArtworkData {
  id: string;
  event?: NostrEvent;
  title: string;
  description: string;
  images: string[];
  artist_pubkey: string;
  created_at: string;

  // Marketplace data
  sale_type: 'fixed' | 'auction' | 'sold' | 'not_for_sale';
  price?: number;
  currency?: string;

  // Auction data (if sale_type is 'auction')
  auction_start?: string;
  auction_end?: string;
  starting_bid?: number;
  current_bid?: number;
  highest_bidder?: string;

  // Shipping information (for physical artworks)
  shipping?: {
    local_countries?: string; // comma-separated list
    local_cost?: number; // in sats
    international_cost?: number; // in sats
  };

  // Additional metadata
  medium?: string;
  dimensions?: string;
  year?: string;
  tags?: string[];
  edition?: string;
  certificate_url?: string;
  
  // Gallery display
  featured?: boolean; // Shows in tile gallery
}

export interface ArtworkBid {
  id: string;
  artwork_id: string;
  bidder_pubkey: string;
  amount: number;
  currency: string;
  timestamp: string;
  event?: NostrEvent;
}

export type ArtworkFilter = 'all' | 'for_sale' | 'auction' | 'sold';

// Sample artwork data for demonstration
export const SAMPLE_ARTWORKS: ArtworkData[] = [
  {
    id: 'art-1',
    title: 'Digital Sunset',
    description: 'A vibrant digital painting capturing the essence of a perfect sunset over the mountains.',
    images: [],
    artist_pubkey: '43baaf0c8c5a7b6b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    sale_type: 'fixed',
    price: 100000,
    currency: 'SAT',
    shipping: {
      local_countries: 'US, CA, MX',
      local_cost: 5000,
      international_cost: 15000
    },
    medium: 'Digital Print on Canvas',
    dimensions: '24x18 inches',
    year: '2024',
    tags: ['landscape', 'sunset', 'digital', 'canvas']
  },
  {
    id: 'art-2',
    title: 'Abstract Emotions',
    description: 'An abstract piece exploring the complexity of human emotions through color and form.',
    images: [],
    artist_pubkey: '43baaf0c8c5a7b6b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    sale_type: 'auction',
    starting_bid: 50000,
    current_bid: 120000,
    currency: 'SAT',
    auction_start: new Date(Date.now() - 86400000).toISOString(),
    auction_end: new Date(Date.now() + 86400000 * 2).toISOString(),
    shipping: {
      local_countries: 'US, CA',
      local_cost: 8000,
      international_cost: 25000
    },
    medium: 'Acrylic on Canvas',
    dimensions: '30x24 inches',
    year: '2024',
    tags: ['abstract', 'emotions', 'colorful', 'acrylic']
  },
  {
    id: 'art-3',
    title: 'Geometric Dreams',
    description: 'A minimalist geometric composition that plays with perspective and depth.',
    images: [],
    artist_pubkey: '43baaf0c8c5a7b6b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    sale_type: 'sold',
    price: 0.002,
    currency: 'BTC',
    medium: 'Digital Art',
    dimensions: '1080x1080',
    year: '2024',
    tags: ['geometric', 'minimal', 'perspective']
  },
  {
    id: 'art-4',
    title: 'Nature\'s Symphony',
    description: 'A detailed illustration of forest life, showcasing the harmony between different elements of nature.',
    images: [],
    artist_pubkey: '43baaf0c8c5a7b6b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b',
    created_at: new Date(Date.now() - 345600000).toISOString(),
    sale_type: 'not_for_sale',
    medium: 'Digital Illustration',
    dimensions: '1600x1200',
    year: '2024',
    tags: ['nature', 'forest', 'illustration']
  },
  {
    id: 'art-5',
    title: 'Cyber Cityscape',
    description: 'A futuristic vision of urban life with neon lights and towering structures.',
    images: [],
    artist_pubkey: '43baaf0c8c5a7b6b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b',
    created_at: new Date(Date.now() - 432000000).toISOString(),
    sale_type: 'auction',
    starting_bid: 0.001,
    current_bid: 0.0015,
    currency: 'BTC',
    auction_start: new Date(Date.now() - 172800000).toISOString(),
    auction_end: new Date(Date.now() + 86400000).toISOString(),
    medium: 'Digital Art',
    dimensions: '2560x1440',
    year: '2024',
    tags: ['cyberpunk', 'city', 'futuristic']
  },
  {
    id: 'art-6',
    title: 'Ocean Waves',
    description: 'A serene depiction of ocean waves with incredible detail and movement.',
    images: [],
    artist_pubkey: '43baaf0c8c5a7b6b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b8b9b',
    created_at: new Date(Date.now() - 518400000).toISOString(),
    sale_type: 'fixed',
    price: 80000,
    currency: 'SAT',
    shipping: {
      local_countries: 'US, CA, MX',
      local_cost: 6000,
      international_cost: 18000
    },
    medium: 'Oil on Canvas',
    dimensions: '20x16 inches',
    year: '2024',
    tags: ['ocean', 'waves', 'seascape', 'oil']
  }
];

export function getArtworksByFilter(filter: ArtworkFilter): ArtworkData[] {
  if (filter === 'all') {
    return SAMPLE_ARTWORKS;
  }

  return SAMPLE_ARTWORKS.filter(artwork => {
    switch (filter) {
      case 'for_sale':
        return artwork.sale_type === 'fixed';
      case 'auction':
        return artwork.sale_type === 'auction';
      case 'sold':
        return artwork.sale_type === 'sold';
      default:
        return true;
    }
  });
}

export function getArtworkById(id: string): ArtworkData | undefined {
  return SAMPLE_ARTWORKS.find(artwork => artwork.id === id);
}

export function formatPrice(amount: number, currency: string): string {
  if (currency === 'BTC') {
    return `₿${amount.toFixed(6)}`;
  }
  if (currency === 'SAT') {
    return `${amount.toLocaleString()} sats`;
  }
  return `${amount.toFixed(2)} ${currency}`;
}

export function isAuctionActive(artwork: ArtworkData): boolean {
  if (artwork.sale_type !== 'auction' || !artwork.auction_end) {
    return false;
  }

  return new Date(artwork.auction_end) > new Date();
}

export function getTimeRemaining(endTime: string): string {
  const now = new Date().getTime();
  const end = new Date(endTime).getTime();
  const diff = end - now;

  if (diff <= 0) {
    return 'Auction ended';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}