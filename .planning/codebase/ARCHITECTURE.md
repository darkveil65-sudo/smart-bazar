# ARCHITECTURE.md — Smart Bazar System Architecture
_Last mapped: 2026-04-18_

## Pattern
**Multi-tenant monorepo with shared library core**

Six separate Next.js apps share a single `packages/shared` library. Each app targets a distinct user role. All apps talk directly to Firebase (no intermediate API server).

```
Firebase (Auth + Firestore + Storage)
         ↑               ↑
    [Shared Library]  [Firebase Admin scripts]
         ↓
  ┌──────┴──────────────────────────────────────────┐
  │              npm workspaces monorepo             │
  │  apps/customer   apps/admin    apps/co-admin     │
  │  apps/manager    apps/store    apps/delivery     │
  └──────────────────────────────────────────────────┘
```

## Layers

### 1. Presentation Layer (per-app `src/app/`)
- Next.js App Router pages (`page.tsx`) and layouts (`layout.tsx`)
- All pages are `'use client'` — SSR is not significantly used
- Route groups: `(authenticated)/` for protected routes (customer auth guard)
- Dashboard panels use nested `layout.tsx` with role-specific navigation

### 2. State Layer (`packages/shared/src/stores/`)
- **`useAuthStore`** — global auth state (Firebase user + Firestore UserData + localStorage cache)
- **`useCartStore`** — cart state (persisted to localStorage via zustand/persist)
- Consumed via named hooks in any component

### 3. Context Layer (`packages/shared/src/contexts/`)
- **`AuthContext.tsx`** — wraps `useAuthStore.init()` in a React Provider so Firebase listener starts on mount
- **`AppConfigContext.tsx`** — streams live app config from Firestore `config/app` (delivery fees, min order, delivery slots)
- **`ToastContext.tsx`** — imperative toast queue (accessed via `useToast()` hook)
- Provider stack in `layout.tsx`: `AppConfigProvider > ToastProvider > AuthProvider`

### 4. Service Layer (`packages/shared/src/lib/services/`)
All services are plain TypeScript objects with async methods and real-time subscription methods.

| Service | File | Purpose |
|---------|------|---------|
| `productService` | `productService.ts` | CRUD + image upload + product subscriptions |
| `orderService` | `orderService.ts` | Full order lifecycle + real-time subscriptions |
| `userService` | `userService.ts` | User CRUD, role assignment, team queries |
| `storeService` | `storeService.ts` | Store CRUD + image upload + real-time subscription |
| `categoryService` | `categoryService.ts` | Category management |
| `applicationService` | `applicationService.ts` | Staff onboarding application review |
| `heroBannerService` | `heroBannerService.ts` | Homepage banner management |
| `configService` | `configService.ts` | Remote app config read/write |

### 5. Data Layer (Firestore)
- Schema types centralized in `packages/shared/src/types/firestore.ts`
- Security rules in `firebase/firestore.rules` — role determined by reading `users/{uid}.role` at request time
- No server-side Firestore Admin usage in app runtime (only in standalone scripts)

## App-to-Role Mapping

| App | Port | Role | Dashboard root |
|-----|------|------|----------------|
| `customer` | 3001 | `customer` | `/home` |
| `admin` | 3002 | `admin` | `/dashboard/admin` |
| `co-admin` | 3003 | `co-admin` | `/dashboard/admin` (shared route prefix) |
| `manager` | 3004 | `manager` | `/dashboard/manager` |
| `store` | 3005 | `store` | `/dashboard/store` |
| `delivery` | 3006 | `delivery` | `/dashboard/delivery` |

## Order Lifecycle (State Machine)

```
pending → manager → store → packed → delivery → completed
                                               ↘ cancelled (customer or admin)
```

Assignment chain:
1. Customer creates order (`pending`)
2. Manager assigns to store vendor (`manager` → `store`)
3. Store vendor packs order (`packed`)
4. Manager assigns delivery agent (`delivery`)
5. Delivery agent marks delivered (`completed`)

## Authentication Flow
1. User logs in via Firebase Auth (email + password)
2. `onAuthStateChanged` fires → Firestore `users/{uid}` doc fetched
3. `userRole` cookie set (used for middleware/redirects)
4. `sb_userData` localStorage cache written for zero-flicker reload
5. Role-gated UI renders based on `userData.role`

## Cross-App Navigation
- `packages/shared/src/lib/urls.ts` → `getAppUrl(app)` returns correct URL by environment
- Dev: `http://{hostname}:{port}` (dynamic hostname for LAN testing)
- Prod: `https://smart-bazar-{app}.vercel.app`
