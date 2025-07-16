// Configuration for allowed card creators
// Only these npubs/pubkeys can create, edit, and delete cards

export const ALLOWED_CREATORS = {
  // bitpopart's authorized credentials
  npub: 'npub1gwa27rpgum8mr9d30msg8cv7kwj2lhav2nvmdwh3wqnsa5vnudxqlta2sz',
  pubkey: '43baaf0c28e6cfb195b17ee083e19eb3a4afdfac54d9b6baf170270ed193e34c', // Hex equivalent
};

// Helper function to check if a user is allowed to create cards
export function isAllowedCreator(userPubkey: string): boolean {
  return userPubkey === ALLOWED_CREATORS.npub || userPubkey === ALLOWED_CREATORS.pubkey;
}

// Helper function to get the creator info
export function getCreatorInfo() {
  return {
    npub: ALLOWED_CREATORS.npub,
    pubkey: ALLOWED_CREATORS.pubkey,
  };
}