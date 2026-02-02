import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import { getProductsByCategory, getProductById } from '@/lib/sampleProducts';
import { useCurrentUser } from './useCurrentUser';
import { useToast } from './useToast';

// Local storage for deleted products (prevents them from reappearing)
const DELETED_PRODUCTS_KEY = 'nostrpop_deleted_products';

function getDeletedProducts(): Set<string> {
  try {
    const stored = localStorage.getItem(DELETED_PRODUCTS_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

function addDeletedProduct(productAddress: string) {
  const deleted = getDeletedProducts();
  deleted.add(productAddress);
  localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(Array.from(deleted)));
  console.log(`📝 Stored deletion locally: ${productAddress}`);
}

interface MarketplaceProduct {
  id: string;
  event?: NostrEvent;
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
  product_url?: string;
  contact_url?: string;
  stall_id: string;
  created_at: string;
}

export function useMarketplaceProducts(category?: string) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  return useQuery({
    queryKey: ['marketplace-products', category],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      // Query for NIP-15 product events (kind 30018) and deletion events (kind 5)
      const [productEvents, deletionEvents] = await Promise.all([
        nostr.query([
          {
            kinds: [30018], // NIP-15 product events
            limit: 100,
            ...(category && { '#t': [category.toLowerCase()] })
          }
        ], { signal }),
        nostr.query([
          {
            kinds: [5], // Deletion events
            limit: 1000,
          }
        ], { signal })
      ]);

      console.log(`Found ${productEvents.length} products and ${deletionEvents.length} deletion events`);

      // Build set of deleted product addresses from ALL deletion events
      const deletedAddresses = new Set<string>();
      
      // Add deletions from Nostr events
      deletionEvents.forEach(delEvent => {
        const aTags = delEvent.tags.filter(([name]) => name === 'a');
        aTags.forEach(([, address]) => {
          if (address && address.startsWith('30018:')) {
            deletedAddresses.add(address);
            console.log(`Found deletion event for: ${address}`);
          }
        });
      });

      // Add locally stored deletions (prevents deleted products from reappearing)
      const locallyDeleted = getDeletedProducts();
      locallyDeleted.forEach(address => deletedAddresses.add(address));

      console.log(`Total deleted addresses: ${deletedAddresses.size} (${locallyDeleted.size} local + ${deletedAddresses.size - locallyDeleted.size} from network)`);

      // Process and validate product events, filtering out deleted ones
      const products = productEvents
        .map(event => {
          try {
            const content = JSON.parse(event.content);
            const dTag = event.tags.find(([name]) => name === 'd')?.[1];
            const titleTag = event.tags.find(([name]) => name === 'title')?.[1];
            const categoryTags = event.tags.filter(([name]) => name === 't').map(([, value]) => value);

            // Basic validation
            if (!dTag || !titleTag || !content.name || !content.price) {
              return null;
            }

            // Check if this product has been deleted
            const productAddress = `30018:${event.pubkey}:${dTag}`;
            if (deletedAddresses.has(productAddress)) {
              console.log(`✗ Filtering out deleted product: ${productAddress}`);
              return null;
            }
            
            console.log(`✓ Keeping product: ${productAddress}`);

            // Determine product type
            const isDigital = categoryTags.includes('digital');
            const isPhysical = categoryTags.includes('physical');
            const type = isDigital ? 'digital' : isPhysical ? 'physical' : 'physical';

            // Get main category (exclude type tags)
            const mainCategory = categoryTags.find(tag => !['digital', 'physical'].includes(tag)) || 'Other';

            return {
              id: dTag,
              event,
              name: content.name,
              description: content.description || '',
              images: content.images || [],
              currency: content.currency || 'USD',
              price: content.price,
              quantity: content.quantity,
              category: mainCategory,
              type,
              specs: content.specs || [],
              shipping: content.shipping || [],
              digital_files: content.digital_files || [],
              digital_file_names: content.digital_file_names || [],
              product_url: content.product_url,
              contact_url: content.contact_url,
              stall_id: content.stall_id || 'default',
              created_at: new Date(event.created_at * 1000).toISOString()
            } as MarketplaceProduct;
          } catch (error) {
            console.warn('Failed to parse product event:', error);
            return null;
          }
        })
        .filter(Boolean) as MarketplaceProduct[];

      // Sort by creation date (newest first)
      const sortedProducts = products.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return sortedProducts;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useMarketplaceProduct(productId: string) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['marketplace-product', productId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const [events, deletionEvents] = await Promise.all([
        nostr.query([
          {
            kinds: [30018],
            '#d': [productId],
            limit: 1
          }
        ], { signal }),
        nostr.query([
          {
            kinds: [5], // Deletion events
            limit: 500,
          }
        ], { signal })
      ]);

      if (events.length === 0) {
        throw new Error('Product not found');
      }

      const event = events[0];
      
      // Check if this product has been deleted
      const productAddress = `30018:${event.pubkey}:${productId}`;
      
      // Check local deletions first
      const locallyDeleted = getDeletedProducts();
      if (locallyDeleted.has(productAddress)) {
        console.log(`Product ${productAddress} is locally deleted`);
        throw new Error('Product has been deleted');
      }
      
      // Check deletion events from network
      const isDeleted = deletionEvents.some(delEvent => 
        delEvent.tags.some(([name, value]) => name === 'a' && value === productAddress)
      );

      if (isDeleted) {
        console.log(`Product ${productAddress} has deletion event on network`);
        throw new Error('Product has been deleted');
      }

      const content = JSON.parse(event.content);
      const categoryTags = event.tags.filter(([name]) => name === 't').map(([, value]) => value);

      const isDigital = categoryTags.includes('digital');
      const isPhysical = categoryTags.includes('physical');
      const type = isDigital ? 'digital' : isPhysical ? 'physical' : 'physical';
      const mainCategory = categoryTags.find(tag => !['digital', 'physical'].includes(tag)) || 'Other';

      return {
        id: productId,
        event,
        name: content.name,
        description: content.description || '',
        images: content.images || [],
        currency: content.currency || 'USD',
        price: content.price,
        quantity: content.quantity,
        category: mainCategory,
        type,
        specs: content.specs || [],
        shipping: content.shipping || [],
        digital_files: content.digital_files || [],
        digital_file_names: content.digital_file_names || [],
        product_url: content.product_url,
        contact_url: content.contact_url,
        stall_id: content.stall_id || 'default',
        created_at: new Date(event.created_at * 1000).toISOString()
      } as MarketplaceProduct;
    },
    enabled: !!productId,
    staleTime: 30000,
  });
}

export function useDeleteProduct() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!user) {
        throw new Error('User must be logged in to delete products');
      }

      const productAddress = `30018:${user.pubkey}:${productId}`;
      console.log(`🗑️ Deleting product: ${productAddress}`);

      // Create a deletion event (kind 5) for the product
      const deletionEvent = {
        kind: 5,
        content: 'Product deleted',
        tags: [
          ['a', productAddress] // Reference to the addressable event
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      const signedEvent = await user.signer.signEvent(deletionEvent);
      console.log('📤 Publishing deletion event:', signedEvent);
      
      await nostr.event(signedEvent, { signal: AbortSignal.timeout(5000) });
      
      console.log('✓ Deletion event published to relay');

      // Store deletion locally so it persists across refreshes
      addDeletedProduct(productAddress);

      return { productId, productAddress, deletionEvent: signedEvent };
    },
    onSuccess: (data) => {
      console.log(`✓ Deletion handler completed for: ${data.productAddress}`);
      
      toast({
        title: "Product Deleted",
        description: "The product has been permanently deleted.",
      });

      // HARD DELETE: Remove from ALL cached queries immediately
      queryClient.setQueriesData(
        { queryKey: ['marketplace-products'] }, 
        (oldData: any) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          const filtered = oldData.filter((product: any) => {
            const productAddress = `30018:${product.event?.pubkey}:${product.id}`;
            return productAddress !== data.productAddress;
          });
          console.log(`Cache update: ${oldData.length} -> ${filtered.length} products`);
          return filtered;
        }
      );

      // Remove specific product query
      queryClient.removeQueries({ queryKey: ['marketplace-product', data.productId] });

      // Cancel any in-flight queries
      queryClient.cancelQueries({ queryKey: ['marketplace-products'] });
      
      console.log('✓ Cache cleared, product removed');
    },
    onError: (error) => {
      console.error('Failed to delete product:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the product. Please try again.",
        variant: "destructive"
      });
    },
  });
}