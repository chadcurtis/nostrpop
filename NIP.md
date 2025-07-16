# NIP-XX: Digital Cards (POP Cards)

`draft` `optional`

This NIP defines a standard for creating and sharing digital cards (POP Cards) on Nostr. All cards are publicly visible and can be viewed by anyone without authentication. Card creation is restricted to authorized creators only.

## Event Kind

- `30402`: Digital Card

## Event Structure

Digital cards are addressable events (kind 30402) that contain card metadata and content.

### Tags

- `d` (required): Unique identifier for the card
- `title` (required): The card's title
- `category` (required): Card category (e.g., "Birthday", "Thank You", "Holiday")
- `pricing` (required): Pricing model (always "free")
- `image` (optional): URLs of images attached to the card
- `t` (required): "ecard" for filtering
- `t` (optional): Category-specific tag for filtering (e.g., "birthday", "thankyou")

### Content

The content field contains a JSON object with the following structure:

```json
{
  "title": "Happy Birthday!",
  "description": "Wishing you a wonderful day filled with happiness and joy!",
  "category": "Birthday",
  "pricing": "free",
  "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "created_at": "2025-07-13T13:38:47.000Z"
}
```

## Example Event

```json
{
  "kind": 30402,
  "content": "{\"title\":\"Happy Birthday!\",\"description\":\"Wishing you a wonderful day filled with happiness and joy!\",\"category\":\"Birthday\",\"pricing\":\"free\",\"images\":[\"https://example.com/birthday-card.jpg\"],\"created_at\":\"2025-07-13T13:38:47.000Z\"}",
  "tags": [
    ["d", "card-1720875527000"],
    ["title", "Happy Birthday!"],
    ["category", "Birthday"],
    ["pricing", "free"],
    ["image", "https://example.com/birthday-card.jpg"],
    ["t", "ecard"],
    ["t", "birthday"],
    ["alt", "Digital birthday POP card: Happy Birthday!"]
  ],
  "pubkey": "...",
  "created_at": 1720875527,
  "id": "...",
  "sig": "..."
}
```

## Categories

Supported card categories include:

- GM/GN (Good Morning/Good Night)
- Fun
- Birthday
- Thank You
- Holiday (e.g., Christmas, Easter, New Year)
- Get Well Soon
- Congratulations
- Sympathy
- Anniversary
- Wedding
- Engagement
- Baby/New Baby
- Love/Romance
- Friendship
- Thinking of You
- Farewell/Goodbye
- Graduation
- Humor/Funny
- Inspiration/Motivation
- Mother's & Father's Day
- Others

## Querying Cards

### Public Card Discovery

All cards are publicly visible and can be queried without authentication:

To query all cards:
```
{
  "kinds": [30402],
  "#t": ["ecard"],
  "limit": 100
}
```

To query cards by category:
```
{
  "kinds": [30402],
  "#t": ["ecard", "birthday"],
  "limit": 50
}
```

To query cards by a specific author:
```
{
  "kinds": [30402],
  "authors": ["<pubkey>"],
  "#t": ["ecard"],
  "limit": 50
}
```

### Card Display

Cards include author information for public discovery:
- Author name (from kind 0 metadata)
- Author profile picture (if available)
- Creation timestamp
- Card category and content

### Access Control

Card creation, editing, and deletion is restricted to authorized creators:
- Only specific npubs/pubkeys can create new cards
- Only card creators can edit or delete their own cards
- All users can view, share, like, download, and zap cards
- Access control is enforced both client-side and server-side

## Sharing and Interactions

### Direct Message Sharing

Cards can be shared via Nostr direct messages using NIP-04 encrypted DMs (or NIP-17 for enhanced privacy). The message includes:
- Personal message (optional)
- Card title
- Direct link to the card

### Email Sharing

Cards can be shared via email using the `mailto:` protocol with:
- Card title in subject
- Personal message and card link in body
- Fallback to system email client

### Zap Support

Card creators can receive real lightning payments through LNURL integration. The application supports:

#### LNURL Integration
- **Lightning Address**: `bitpopart@getalby.com`
- **LNURL-pay**: Automatic invoice generation
- **WebLN Support**: Browser wallet integration
- **Fallback**: Lightning URI for external wallets

#### Zap Flow
1. User clicks "Zap" button
2. Application fetches LNURL-pay data from lightning address
3. Creates NIP-57 zap request (if supported)
4. Requests invoice from LNURL callback
5. Opens payment in WebLN or external wallet
6. Lightning service publishes zap receipt (if Nostr-enabled)

#### Zap Request Format
```json
{
  "kind": 9734,
  "content": "Amazing POP card! ⚡",
  "tags": [
    ["relays", "wss://relay.nostr.band"],
    ["amount", "1000000"],
    ["lnurl", "bitpopart@getalby.com"],
    ["p", "<creator-pubkey>"],
    ["e", "<card-event-id>"]
  ]
}
```

#### Payment Methods
- **WebLN**: Direct browser wallet payment
- **Lightning URI**: Opens external wallet apps
- **QR Code**: Manual payment (future enhancement)

#### Supported Amounts
- Minimum: 1 sat
- Maximum: Based on LNURL service limits
- Quick amounts: 100, 1000, 5000, 10000 sats

### Card Management

#### Editing Cards

Cards can be edited by their creators. When a card is updated:
- The same `d` tag identifier is maintained to preserve the addressable event coordinate
- An `updated_at` timestamp is added to the content JSON
- The original `created_at` timestamp is preserved
- All tags and content can be modified

#### Deleting Cards

Cards can be deleted by their creators using NIP-09 deletion events (kind 5):
- References the original card event with an `e` tag
- References the addressable event coordinate with an `a` tag
- Format: `["a", "30402:<pubkey>:<d-tag-value>"]`

Example deletion event:
```json
{
  "kind": 5,
  "content": "Card deleted by user",
  "tags": [
    ["e", "<card-event-id>"],
    ["a", "30402:<creator-pubkey>:<d-tag-value>"]
  ]
}
```

### Social Interactions

- **Likes**: Can be implemented using NIP-25 reactions (kind 7)
- **Comments**: Can be implemented using kind 1 notes with `e` tags referencing the card
- **Reposts**: Can be implemented using NIP-18 reposts (kind 6)