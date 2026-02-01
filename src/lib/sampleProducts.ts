// Sample marketplace products for demonstration

export interface MarketplaceProduct {
  id: string;
  event?: unknown; // NostrEvent - optional for sample data
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
  digital_file_names?: string[];
  product_url?: string; // URL for physical products - opens in same site
  contact_url?: string; // URL for contacting the seller
  stall_id: string;
  created_at: string;
}

export const sampleProducts: MarketplaceProduct[] = [
  {
    id: 'vintage-camera-001',
    name: 'Vintage Film Camera',
    description: 'Beautiful vintage 35mm film camera in excellent working condition. Perfect for photography enthusiasts who love the analog experience. Includes original leather case and manual.',
    images: [],
    currency: 'USD',
    price: 250,
    quantity: 1,
    category: 'Electronics',
    type: 'physical',
    specs: [
      ['Brand', 'Canon'],
      ['Model', 'AE-1'],
      ['Film Format', '35mm'],
      ['Condition', 'Excellent'],
      ['Year', '1976']
    ],
    shipping: [{ id: 'standard', cost: 15 }],
    contact_url: 'https://example.com/contact/vintage-electronics',
    stall_id: 'vintage-electronics',
    created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
  },
  {
    id: 'bitcoin-ebook-001',
    name: 'The Bitcoin Standard - Digital Edition',
    description: 'Comprehensive guide to understanding Bitcoin and its economic implications. This digital edition includes bonus chapters and updated content for 2024.',
    images: [],
    currency: 'USD',
    price: 19.99,
    category: 'Digital Downloads',
    type: 'digital',
    specs: [
      ['Format', 'PDF, EPUB'],
      ['Pages', '320'],
      ['Language', 'English'],
      ['Updated', '2024']
    ],
    digital_files: ['https://example.com/bitcoin-standard-2024.pdf', 'https://example.com/bitcoin-standard-2024.epub'],
    digital_file_names: ['bitcoin-standard-2024.pdf', 'bitcoin-standard-2024.epub'],
    stall_id: 'crypto-books',
    created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
  },
  {
    id: 'handmade-wallet-001',
    name: 'Handcrafted Leather Bitcoin Wallet',
    description: 'Premium handcrafted leather wallet designed specifically for Bitcoin enthusiasts. Features RFID blocking technology and a hidden compartment for seed phrase storage.',
    images: [],
    currency: 'USD',
    price: 89.99,
    quantity: 5,
    category: 'Keychains',
    type: 'physical',
    specs: [
      ['Material', 'Genuine Leather'],
      ['Color', 'Brown'],
      ['RFID Blocking', 'Yes'],
      ['Dimensions', '4.5" x 3.5" x 0.5"'],
      ['Handmade', 'Yes']
    ],
    shipping: [{ id: 'standard', cost: 8.99 }],
    contact_url: 'https://example.com/contact/leather-goods',
    stall_id: 'leather-goods',
    created_at: new Date(Date.now() - 259200000).toISOString() // 3 days ago
  },
  {
    id: 'nostr-stickers-001',
    name: 'Nostr Protocol Sticker Pack',
    description: 'Show your support for the Nostr protocol with this awesome sticker pack! Includes 10 unique designs featuring Nostr logos, memes, and slogans.',
    images: [],
    currency: 'USD',
    price: 12.99,
    quantity: 50,
    category: 'Keychains',
    type: 'physical',
    specs: [
      ['Quantity', '10 stickers'],
      ['Material', 'Vinyl'],
      ['Size', '2-4 inches'],
      ['Waterproof', 'Yes'],
      ['UV Resistant', 'Yes']
    ],
    shipping: [{ id: 'standard', cost: 3.99 }],
    contact_url: 'https://example.com/contact/nostr-merch',
    stall_id: 'nostr-merch',
    created_at: new Date(Date.now() - 345600000).toISOString() // 4 days ago
  },
  {
    id: 'lightning-course-001',
    name: 'Lightning Network Development Course',
    description: 'Complete video course on Lightning Network development. Learn to build Lightning applications from scratch with hands-on projects and real-world examples.',
    images: [],
    currency: 'USD',
    price: 149.99,
    category: 'Digital Downloads',
    type: 'digital',
    specs: [
      ['Duration', '12 hours'],
      ['Modules', '8'],
      ['Projects', '5'],
      ['Level', 'Intermediate'],
      ['Access', 'Lifetime']
    ],
    digital_files: ['https://example.com/course-videos.zip', 'https://example.com/source-code.zip', 'https://example.com/resources.pdf'],
    digital_file_names: ['course-videos.zip', 'source-code.zip', 'resources.pdf'],
    stall_id: 'dev-courses',
    created_at: new Date(Date.now() - 432000000).toISOString() // 5 days ago
  },
  {
    id: 'bitcoin-art-001',
    name: 'Bitcoin Digital Art Collection',
    description: 'Exclusive collection of 5 high-resolution Bitcoin-themed digital artworks. Perfect for printing or using as desktop wallpapers.',
    images: [],
    currency: 'USD',
    price: 29.99,
    category: 'Art',
    type: 'digital',
    specs: [
      ['Resolution', '4K (3840x2160)'],
      ['Format', 'PNG, JPG, SVG'],
      ['Pieces', '5 artworks + vector logo'],
      ['License', 'Personal Use'],
      ['DPI', '300']
    ],
    digital_files: ['https://example.com/bitcoin-art-collection.zip', 'https://example.com/bitcoin-logo.svg', 'https://example.com/wallpaper-4k.png'],
    digital_file_names: ['bitcoin-art-collection.zip', 'bitcoin-logo.svg', 'wallpaper-4k.png'],
    stall_id: 'crypto-art',
    created_at: new Date(Date.now() - 518400000).toISOString() // 6 days ago
  },
  {
    id: 'hardware-wallet-001',
    name: 'Secure Hardware Wallet',
    description: 'State-of-the-art hardware wallet for secure Bitcoin storage. Features air-gapped signing, secure element chip, and open-source firmware.',
    images: [],
    currency: 'USD',
    price: 199.99,
    quantity: 3,
    category: 'Art',
    type: 'physical',
    specs: [
      ['Connectivity', 'USB-C'],
      ['Display', 'OLED'],
      ['Security', 'Secure Element'],
      ['Firmware', 'Open Source'],
      ['Warranty', '2 Years']
    ],
    shipping: [{ id: 'express', cost: 25 }],
    contact_url: 'https://example.com/contact/security-devices',
    stall_id: 'security-devices',
    created_at: new Date(Date.now() - 604800000).toISOString() // 7 days ago
  },
  {
    id: 'coffee-beans-001',
    name: 'Bitcoin Coffee - Premium Blend',
    description: 'Ethically sourced premium coffee beans roasted to perfection. Each bag sold helps support Bitcoin education in developing countries.',
    images: [],
    currency: 'USD',
    price: 24.99,
    quantity: 20,
    category: 'T-shirts',
    type: 'physical',
    specs: [
      ['Weight', '12 oz (340g)'],
      ['Roast', 'Medium'],
      ['Origin', 'Colombia'],
      ['Fair Trade', 'Yes'],
      ['Organic', 'Yes']
    ],
    shipping: [{ id: 'standard', cost: 6.99 }],
    contact_url: 'https://example.com/contact/bitcoin-coffee',
    stall_id: 'bitcoin-coffee',
    created_at: new Date(Date.now() - 691200000).toISOString() // 8 days ago
  }
];

// Function to get products by category
export function getProductsByCategory(category?: string): MarketplaceProduct[] {
  if (!category || category === 'all') {
    return sampleProducts;
  }
  return sampleProducts.filter(product =>
    product.category.toLowerCase() === category.toLowerCase()
  );
}

// Function to get a single product by ID
export function getProductById(id: string): MarketplaceProduct | undefined {
  return sampleProducts.find(product => product.id === id);
}