import type { NostrEvent } from '@nostrify/nostrify';

/**
 * POP Badge - Single badge that people can purchase
 * Kind: 38173 (addressable) - simplified from Nostr Projects
 */
export interface BadgeData {
  id: string; // d tag identifier
  event?: NostrEvent;
  title: string;
  description?: string; // Optional description
  image_url: string; // Single badge image
  price_sats: number; // Price in sats to purchase
  author_pubkey: string;
  created_at: string;
  status: 'active' | 'sold_out' | 'archived';
  featured?: boolean; // Show on homepage
}

/**
 * Badge Purchase - Someone who bought a badge
 * Kind: 38174 (regular)
 */
export interface BadgePurchase {
  badge_id: string; // References the badge d tag
  buyer_npub: string; // Buyer's npub
  payment_proof?: string; // Lightning invoice/payment proof
  purchased_at: string;
  event?: NostrEvent;
}

/**
 * Generate UUID v4
 */
export function generateBadgeUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
