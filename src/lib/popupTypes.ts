/**
 * PopUp event types and utilities
 */

import type { NostrEvent } from '@nostrify/nostrify';

export type PopUpType = 'art' | 'shop' | 'event';

export type PopUpStatus = 'confirmed' | 'option';

export interface PopUpEventData {
  id: string;
  title: string;
  description: string;
  type: PopUpType;
  status: PopUpStatus;
  location: string;
  latitude: number;
  longitude: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  image?: string;
  link?: string;
  event?: NostrEvent;
}

export const POPUP_TYPE_CONFIG: Record<PopUpType, { 
  label: string; 
  color: string;
  bgColor: string;
  icon: string;
}> = {
  art: {
    label: 'Art Exhibition',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
    icon: '🎨',
  },
  shop: {
    label: 'Pop-Up Shop',
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700',
    icon: '🛍️',
  },
  event: {
    label: 'Event',
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700',
    icon: '📅',
  },
};

export const POPUP_STATUS_CONFIG: Record<PopUpStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  confirmed: {
    label: 'Confirmed',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
  },
  option: {
    label: 'Option',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
  },
};

/**
 * Calculate geohash from coordinates (simple implementation)
 */
export function coordinatesToGeohash(lat: number, lon: number, precision: number = 7): string {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let isEven = true;
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;
  let geohash = '';
  let bit = 0;
  let ch = 0;

  while (geohash.length < precision) {
    if (isEven) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon > lonMid) {
        ch |= (1 << (4 - bit));
        lonMin = lonMid;
      } else {
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat > latMid) {
        ch |= (1 << (4 - bit));
        latMin = latMid;
      } else {
        latMax = latMid;
      }
    }
    isEven = !isEven;

    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
