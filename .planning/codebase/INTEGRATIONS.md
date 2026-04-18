# INTEGRATIONS.md — Smart Bazar External Integrations
_Last mapped: 2026-04-18_

## Firebase Platform (Primary Backend)

### Firebase Authentication
- **Provider**: Email + Password only
- **SDK**: `firebase/auth` from client-side `packages/shared/src/lib/firebase.ts`
- **Methods used**: `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`, `onAuthStateChanged`, `sendPasswordResetEmail`
- **Role storage**: User role stored in Firestore `users/{uid}.role`, NOT in Firebase custom claims (cookie `userRole` is used as a lightweight hint on client)
- **Session cache**: `localStorage` key `sb_userData` caches full `UserData` to avoid auth flicker on page load
- **Safety timeout**: 4s fallback in `authStore.ts` if Firebase auth hangs

### Firestore (Database)
- **SDK**: `firebase/firestore`
- **Collections**:

| Collection | Description | Access |
|------------|-------------|--------|
| `users/{uid}` | Customer & staff user profiles | Role-gated, self-read |
| `products/{id}` | Product catalog | Public read, role-gated write |
| `orders/{id}` | Orders with full lifecycle | Customer create, role-gated read/update |
| `stores/{id}` | Store/category entities | Public read, admin-only write |
| `categories/{id}` | Product categories per store | Public read, admin-only write |
| `subcategories/{id}` | Sub-categories | Public read, admin-only write |
| `applications/{id}` | Staff onboarding applications | User self-read/create, admin/manager update |
| `config/app` | Remote app config (fees, slots) | Public read, admin-only write |
| `heroBanners/{id}` | Homepage hero banners | Public read, admin-only write |

- **Real-time subscriptions**: All key entities use `onSnapshot()` for live updates
- **Security Rules**: `firebase/firestore.rules` — role-based, reads user doc to determine role at request time
- **Batch writes**: `writeBatch` used for bulk operations (seeding, syncing)

### Firebase Storage
- **SDK**: `firebase/storage`
- **Buckets used**:
  - `products/{timestamp}_{filename}` — product images (WebP, max 1920px, quality 0.95)
  - `stores/{storeId}/{filename}` — store banner images
- **Fallback**: If Storage upload fails (timeout/rules), falls back to Base64 DataURL stored directly in Firestore (legacy path)
- **Next.js image domain**: Firebase Storage domain is whitelisted in `next.config.ts` for `<Image />` component

## Vercel (Deployment)
- **Target**: Each app deploys as a separate Vercel project
- **URL pattern**: `https://smart-bazar-{app}.vercel.app`
  - `smart-bazar-customer.vercel.app`
  - `smart-bazar-admin.vercel.app`
  - `smart-bazar-co-admin.vercel.app`
  - `smart-bazar-manager.vercel.app`
  - `smart-bazar-store.vercel.app`
  - `smart-bazar-delivery.vercel.app`
- **Deploy script**: `deploy_all.js` at workspace root

## Google Fonts (Typography)
- Loaded via `next/font/google` in each app's `layout.tsx`
- Fonts used in customer app: `Inter`, `Poppins`, `Geist_Mono`
- Font variables exposed as CSS custom properties: `--font-inter`, `--font-poppins`, `--font-geist-mono`

## Unsplash (Placeholder Images)
- Used in `CATEGORIES` constant (`packages/shared/src/lib/constants.ts`) as default store `imageUrl` values
- Pattern: `https://images.unsplash.com/photo-{id}?auto=format&fit=crop&w=300&q=80`
- Not a runtime API dependency — hardcoded fallback only

## Payment (Placeholder / Mock)
- UPI / Wallet and Cash on Delivery shown as options in checkout UI
- **No real payment gateway integrated** — payment processing is not yet implemented
- Orders are placed and tracked without payment verification
