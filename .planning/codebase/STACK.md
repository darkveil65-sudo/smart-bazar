# STACK.md — Smart Bazar Technology Stack
_Last mapped: 2026-04-18_

## Runtime & Language
- **Language**: TypeScript 5 (strict mode)
- **Runtime**: Node.js (Next.js server-side), Browser (client-side)
- **Module system**: ESModules (bundler resolution via tsconfig)

## Framework
- **Next.js 16.2.2** — App Router (file-based routing under `src/app/`)
- **React 19.2.4** and **react-dom 19.2.4**
- All apps use the same Next.js version pinned at root workspace

## Package Manager & Monorepo
- **npm workspaces** — defined in root `package.json`
  - `apps/*` — 6 Next.js application workspaces
  - `packages/*` — 1 shared library workspace
- Root `package-lock.json` owns all dependency resolution
- Cross-workspace import alias: `@smart-bazar/shared/*` → `packages/shared/src/*` (via `tsconfig.json` paths)

## Styling
- **Tailwind CSS 4** with `@tailwindcss/postcss` plugin
- Each app has its own `globals.css` with custom CSS variables (design tokens)
- Custom CSS animations defined inline in `globals.css` files
- `postcss.config.mjs` at root

## State Management
- **Zustand 5.0.12** — two shared stores in `packages/shared/src/stores/`
  - `authStore.ts` — Firebase auth + Firestore user doc + localStorage cache
  - `cartStore.ts` — cart items with `zustand/middleware/persist` (localStorage key: `smart-bazar-cart`)

## Backend / Database
- **Firebase 12.11.0** (client SDK)
- **firebase-admin 13.8.0** (server-side scripts only, not in Next.js apps)
- Services used:
  - **Firestore** (primary database)
  - **Firebase Auth** (email/password authentication)
  - **Firebase Storage** (product & store images, WebP 1920px max)

## Key Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `firebase` | ^12.11.0 | Client SDK (Auth, Firestore, Storage) |
| `firebase-admin` | ^13.8.0 | Admin scripts only |
| `next` | 16.2.2 | App framework |
| `react` | 19.2.4 | UI library |
| `react-firebase-hooks` | ^5.1.1 | React hooks for Firebase |
| `zustand` | ^5.0.12 | Global state management |
| `tailwindcss` | ^4 | Styling |
| `typescript` | ^5 | Type safety |

## Dev Scripts (root `package.json`)
```bash
npm run dev             # starts customer app only (port 3001)
npm run dev:all         # node dev_all.js (spawns all 6 apps)
npm run dev:customer    # port 3001
npm run dev:admin       # port 3002
npm run dev:co-admin    # port 3003
npm run dev:manager     # port 3004
npm run dev:store       # port 3005
npm run dev:delivery    # port 3006
```

## TypeScript Config (`tsconfig.json`)
```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@smart-bazar/shared/*": ["./packages/shared/src/*"]
  }
}
```

## Environment Variables (`.env.local`)
All prefixed `NEXT_PUBLIC_FIREBASE_*`:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)

Validated at startup (only in dev, to avoid prod error leakage) in `packages/shared/src/lib/firebase.ts`.
