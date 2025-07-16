# Creator Configuration

This POP Cards application restricts card creation to authorized users only. To configure who can create cards, you need to update the creator configuration.

## Configuration File

Edit `src/config/creators.ts` and replace the placeholder values with your actual Nostr credentials:

```typescript
export const ALLOWED_CREATORS = {
  // Replace with your actual npub and hex pubkey
  npub: 'npub1your_actual_npub_here', // Your npub here
  pubkey: 'your_actual_hex_pubkey_here', // Your hex pubkey here
};
```

## How to Get Your Credentials

### 1. Get Your npub (Nostr Public Key - Bech32 format)
- Your npub starts with `npub1` and looks like: `npub1abc123...`
- You can find this in your Nostr client settings
- Or use a tool like [nostr.guru](https://nostr.guru) to convert between formats

### 2. Get Your Hex Pubkey
- Your hex pubkey is a 64-character hexadecimal string
- You can convert your npub to hex using tools like [nostr.guru](https://nostr.guru)
- Or find it in your Nostr client's advanced settings

## Example Configuration

```typescript
export const ALLOWED_CREATORS = {
  npub: 'npub1bitpopart123abc456def789ghi012jkl345mno678pqr901stu234vwx567yz8',
  pubkey: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
};
```

## Security Notes

- Keep your private key (nsec) secret - never put it in this configuration
- Only the public keys (npub/pubkey) are used for access control
- The configuration is client-side only - consider server-side validation for production
- Users can still view, share, like, download, and zap all cards regardless of creator restrictions

## Testing

After updating the configuration:
1. Save the file
2. Restart the development server
3. Log in with your Nostr account
4. You should now be able to create POP cards
5. Other users will see an "Access Restricted" message when trying to create cards