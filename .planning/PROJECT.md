# Smart Bazar — Project

## What This Is

Smart Bazar is a multi-panel grocery/retail delivery platform for the Indian market. Customers browse stores, add products to cart, and place orders. The order flows through a management chain: Admin → Manager → Store Vendor → Delivery Agent. Six separate Next.js apps (monorepo) serve each role, all backed by Firebase (Auth, Firestore, Storage).

**This is a live production business with real users and real money involved.**

## Core Value

Get orders from customers to delivery agents, reliably, fast, without data corruption — and give every role in the chain a clear, working interface to do their job.

## Context

- **Stack**: Next.js 16 monorepo, React 19, TypeScript 5, Firebase 12, Tailwind CSS 4, Zustand 5
- **Apps**: customer (3001), admin (3002), co-admin (3003), manager (3004), store (3005), delivery (3006)
- **Deployment**: Vercel (6 separate project deployments)
- **Backend**: Firebase Auth + Firestore + Storage (no server-side rendering, all client-side)
- **Market**: India — UPI payments, local delivery model
- **State**: Deployed but broken/incomplete. Real users experiencing issues.
- **Payment**: Google Pay UPI QR code (merchant QR shown at checkout, customer scans)

## Requirements

### Validated (Already Built)

- ✓ Customer: Browse stores → view products by category → add to cart
- ✓ Customer: Checkout with delivery address + COD payment option
- ✓ Customer: Order tracking page with status updates
- ✓ Admin: User management (all roles)
- ✓ Admin: Store management (add/edit/delete stores)
- ✓ Admin: Hero banner management
- ✓ Admin: Product inventory management
- ✓ Admin: Order overview
- ✓ Manager: Order assignment pipeline (pending → manager → store → packed → delivery → completed)
- ✓ Manager: Team management (store vendors + delivery agents under manager)
- ✓ Store: View and update assigned orders
- ✓ Store: Product inventory management
- ✓ Delivery: View and update assigned delivery orders
- ✓ Shared auth store (Zustand) with localStorage cache
- ✓ Shared cart store (Zustand, persisted)
- ✓ Shared services layer (product, order, user, store, category, application, config)
- ✓ Live app config from Firestore (delivery fees, min order, delivery slots)
- ✓ Firebase Storage image uploads (WebP, 1920px max)

### Active (Must Build)

**P0 — Critical Fixes (App is broken without these)**
- [ ] REQ-001: Fix Firestore security rules — replace `storeId` with `vendorId` in product write rules
- [x] REQ-002: Fix orderService field mismatch — align `assignedStoreId` → `assignedVendorId` across queries and type
- [ ] REQ-003: Add error boundaries to all apps — Firebase errors must not silently crash pages
- [ ] REQ-004: Fix auth role guard on all staff apps — wrong-role users must be redirected instantly
- [ ] REQ-005: Add consistent loading states across all pages (skeleton/spinner)
- [ ] REQ-006: Fix cart stale data — validate cart items against Firestore on checkout

**P1 — Payment**
- [ ] REQ-007: Google Pay UPI QR payment at checkout — display merchant QR image, customer confirms payment
- [ ] REQ-008: Order records payment method used (UPI screenshot upload or manual confirmation)

**P1 — Real-time Notifications**
- [ ] REQ-009: In-app notification bell for all staff panels — alerts for new orders, status changes
- [ ] REQ-010: Customer gets real-time status update notifications when their order moves through the pipeline

**P1 — Product Search & Filters**
- [ ] REQ-011: Customer search bar — search products by name across all stores
- [ ] REQ-012: Customer category page — filter by subcategory
- [ ] REQ-013: Customer product page — filter by price range, availability

**P1 — Analytics**
- [ ] REQ-014: Admin/Manager analytics dashboard — real revenue, order counts, top products, top stores
- [ ] REQ-015: Store analytics — revenue, top-selling products, order fulfillment rate

**P2 — Delivery Tracking**
- [ ] REQ-016: Delivery agent shares live location (browser Geolocation API)
- [ ] REQ-017: Customer sees delivery agent on map (Google Maps / Leaflet)

**P2 — Promo Codes & Discounts**
- [ ] REQ-018: Admin creates promo codes (% or flat discount, per-user or global)
- [ ] REQ-019: Customer applies promo code at checkout — cart total updated

**P2 — Ratings & Reviews**
- [ ] REQ-020: Customer rates delivered orders (1-5 stars + optional comment)
- [ ] REQ-021: Store sees their average rating on dashboard

### Out of Scope (v1)

- Third-party payment gateway (Razorpay/Stripe) — UPI QR is sufficient for now
- Native mobile apps (iOS/Android) — web apps only
- Multiple delivery agents per order — single agent assignment only
- Inventory management automation (auto-reorder) — manual only
- Multi-language support (i18n) — Hindi/English mixed UI is fine

## Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| UPI QR code for payment | No gateway fees, works for all UPI apps in India, simple to implement | ✅ Decided |
| Fix field naming bugs before adding features | Broken core = lost revenue; stability first | ✅ Decided |
| Client-side only (no API routes) | Firebase handles auth/security via rules | ✅ Existing |
| Vercel deployment (6 separate projects) | One app per role, independent deployments | ✅ Existing |
| Shared `packages/shared` library | DRY — services, types, stores shared across all apps | ✅ Existing |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase:** Update Validated/Active requirement lists and log decisions.
**After milestone:** Full review — is Core Value still the right priority?

---
*Last updated: 2026-04-19 after initialization*
