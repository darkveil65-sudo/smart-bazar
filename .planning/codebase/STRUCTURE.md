# STRUCTURE.md — Smart Bazar Directory Structure
_Last mapped: 2026-04-18_

## Root Layout
```
smart bazar/
├── apps/                      # 6 Next.js app workspaces
│   ├── customer/              # Customer shopping app (port 3001)
│   ├── admin/                 # Super Admin panel (port 3002)
│   ├── co-admin/              # Co-Admin panel (port 3003)
│   ├── manager/               # Area Manager panel (port 3004)
│   ├── store/                 # Vendor/Store panel (port 3005)
│   └── delivery/              # Delivery agent panel (port 3006)
├── packages/
│   └── shared/                # Shared library (imported as @smart-bazar/shared/*)
├── firebase/
│   └── firestore.rules        # Firestore security rules
├── .planning/                 # GSD planning artifacts
│   └── codebase/              # This map
├── package.json               # Workspace root + shared deps
├── tsconfig.json              # Root TypeScript config with path aliases
├── firebase.json              # Firebase project configuration
├── .env.local                 # Local environment variables
├── .env.example               # Environment template
├── dev_all.js                 # Spawns all 6 dev servers concurrently
├── deploy_all.js              # Deploys all 6 apps to Vercel
├── seed_products.js           # Firestore product seeding script
├── sync_categories.js         # Category sync script
├── gen_staff_logins.js        # Staff account generation script
└── create_admin.js            # Admin account setup script
```

## Per-App Structure (all apps follow the same pattern)
```
apps/{app}/
├── src/
│   └── app/                   # Next.js App Router
│       ├── layout.tsx          # Root layout (providers + fonts)
│       ├── page.tsx            # Root page (login/redirect)
│       ├── globals.css         # App-specific CSS (design tokens + utilities)
│       └── dashboard/          # Protected dashboard routes
│           ├── layout.tsx      # Dashboard layout (sidebar + nav)
│           └── {role}/         # Role-specific pages
│               ├── page.tsx    # Overview
│               ├── orders/
│               │   └── page.tsx
│               └── ...
├── next.config.ts              # Per-app Next.js config (image domains etc.)
└── package.json                # App workspace package
```

### Customer App (additional routes)
```
apps/customer/src/app/
├── layout.tsx                  # Root layout with providers
├── page.tsx                    # Login / landing page
├── register/                   # Registration flow
│   └── page.tsx
└── (authenticated)/            # Route group — auth protected
    ├── layout.tsx              # Auth guard layout
    ├── home/                   # Main shopping page
    │   └── page.tsx
    ├── category/               # Category browser
    │   └── page.tsx
    ├── product/                # Product detail
    │   └── [id]/page.tsx
    ├── cart/                   # Shopping cart
    │   └── page.tsx
    ├── checkout/               # Order checkout
    │   └── page.tsx
    ├── orders/                 # Order history + tracking
    │   └── page.tsx
    ├── profile/                # User profile
    │   └── page.tsx
    ├── dashboard/              # Customer dashboard
    │   └── page.tsx
    └── partner-application/    # Apply to be store/delivery partner
        └── page.tsx
```

## Shared Package Structure
```
packages/shared/src/
├── types/
│   └── firestore.ts           # All Firestore data model types
├── lib/
│   ├── firebase.ts            # Firebase app init + re-exported helpers
│   ├── constants.ts           # CATEGORIES, ORDER_STATUSES, ROLES, NAV configs, business rules
│   ├── urls.ts                # getAppUrl() for cross-app navigation
│   └── services/
│       ├── productService.ts   # Product CRUD + image upload + subscriptions
│       ├── orderService.ts     # Order lifecycle + subscriptions
│       ├── userService.ts      # User CRUD + role management
│       ├── storeService.ts     # Store CRUD + image upload
│       ├── categoryService.ts  # Category management
│       ├── applicationService.ts  # Staff applications
│       ├── heroBannerService.ts   # Hero banner management
│       └── configService.ts       # Remote app config
├── stores/
│   ├── authStore.ts           # Zustand auth store (Firebase auth + Firestore user)
│   └── cartStore.ts           # Zustand cart store (persisted)
├── contexts/
│   ├── AuthContext.tsx         # Initializes auth listener
│   ├── AppConfigContext.tsx    # Streams live Firestore app config
│   └── ui/
│       └── ToastContext.tsx    # Toast notification queue
└── components/
    ├── ErrorBoundary.tsx
    ├── layout/
    └── ui/
        ├── Badge.tsx
        ├── Button.tsx
        ├── Card.tsx
        ├── EmptyState.tsx
        ├── Input.tsx
        ├── Modal.tsx
        ├── Select.tsx
        ├── Skeleton.tsx
        ├── Spinner.tsx
        ├── Toast.tsx
        └── ToastContainer.tsx
```

## Naming Conventions
- **Files**: `camelCase.ts/tsx` for services and stores; `PascalCase.tsx` for components
- **Firestore collections**: `camelCase` (e.g. `products`, `orders`, `heroBanners`)
- **CSS custom properties**: `--color-name` pattern (Tailwind CSS 4 convention)
- **Import alias**: `@smart-bazar/shared/` for all cross-package imports

## Key File Locations
| Purpose | File |
|---------|------|
| All data types | `packages/shared/src/types/firestore.ts` |
| Firebase init | `packages/shared/src/lib/firebase.ts` |
| Business constants | `packages/shared/src/lib/constants.ts` |
| Auth state | `packages/shared/src/stores/authStore.ts` |
| Cart state | `packages/shared/src/stores/cartStore.ts` |
| Cross-app URLs | `packages/shared/src/lib/urls.ts` |
| Firestore rules | `firebase/firestore.rules` |
| Dev runner | `dev_all.js` |
