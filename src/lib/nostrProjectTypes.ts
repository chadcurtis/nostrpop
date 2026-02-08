import type { NostrEvent } from '@nostrify/nostrify';

/**
 * Nostr Project - Collaborative art project where people can join
 * Kind: 38171 (addressable)
 */
export interface NostrProjectData {
  id: string; // d tag identifier
  event?: NostrEvent;
  title: string;
  description: string;
  images: string[]; // Array of artwork image URLs
  price_sats: number; // Price in sats to join
  author_pubkey: string;
  author_handle?: string; // Nostr handle of creator
  created_at: string;
  participant_count?: number; // How many people joined
  status: 'active' | 'completed' | 'archived';
}

/**
 * Nostr Project Participant - Someone who joined a project
 * Kind: 38172 (regular)
 */
export interface NostrProjectParticipant {
  project_id: string; // References the project d tag
  participant_npub: string; // Participant's npub
  participant_handle?: string; // Participant's Nostr handle
  selected_image_url: string; // Which image they selected
  payment_proof?: string; // Lightning invoice/payment proof
  joined_at: string;
  event?: NostrEvent;
}

/**
 * Generate UUID v4
 */
export function generateNostrProjectUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
