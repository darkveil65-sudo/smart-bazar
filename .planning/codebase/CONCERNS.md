# CONCERNS.md — Smart Bazar Technical Debt & Known Issues
_Last mapped: 2026-04-18_

## 🔴 Critical Issues

### 1. No Payment Gateway Integration
- **File**: `apps/customer/src/app/(authenticated)/checkout/page.tsx`
- Payment methods (UPI, COD) are shown in the UI but **no real payment processing occurs**
- Orders are created and fulfilled without monetary verification
- **Risk**: Cannot launch commercially without this

### 2. Firestore Security Rule Inconsistencies
- **File**: `firebase/firestore.rules`
- Line 107: `resource.data.storeId == request.auth.uid` but `Product` type uses field `vendorId` (not `storeId`) — **stale rule, won't work**
- Line 146: `request.auth.uid == resource.data.assignedStoreId` — Store role is a USER (person), not a store entity. Should be `assignedVendorId`
- Orders collection has broad read rules for `isStore()` and `isDelivery()` (no scoping to assigned orders)
- Lines 179-182: Duplicate `categories` match block at bottom of rules file will cause a rule conflict

### 3. `orderService.ts` Uses Inconsistent Field Names
- **File**: `packages/shared/src/lib/services/orderService.ts`
- Functions `getOrdersByStore` and `subscribeToOrdersByStore` query `assignedStoreId` (lines 42, 136)
- But `Order` type in `firestore.ts` uses `assignedVendorId` (line 107)
- This means store-vendor order filtering queries may return **no results** in production data

## 🟠 High Priority

### 4. No Real-time Store-Product Filtering
- **File**: `packages/shared/src/lib/services/productService.ts`
- `getProductsByStore` queries `where('store', '==', storeId)` — correct
- `getProductsByVendor` queries `where('vendorId', '==', vendorId)` — also correct
- But legacy products seeded before field standardization may have neither field set correctly
- Multiple syncing scripts exist (`sync_categories.js`, `sync_categories_admin.js`) indicating past data migration pain

### 5. Large Monolithic Page Files
- Several `page.tsx` files are extremely large (600-1000+ lines) combining data fetching, business logic, and rendering
- Examples: `apps/customer/src/app/page.tsx` (25996 bytes), `apps/manager/src/app/page.tsx` (19536 bytes)
- **Risk**: Difficult to maintain, test, and extend; no component extraction or reuse

### 6. No Server-Side Rendering / API Routes
- All pages use `'use client'` — the entire app runs client-side
- Firebase API keys are exposed via `NEXT_PUBLIC_*` env vars (unavoidable for client firebase, but means no server-side data hiding)
- No Next.js API routes (`/api/`) or Server Components used
- **Risk**: Poor SEO for customer-facing product pages; no server-side access control enforcement

### 7. Base64 Image Fallback in Storage
- **Files**: `storeService.ts` lines 75-82, `storeService.ts` lines 116-122
- If Firebase Storage upload fails, images are saved as raw Base64 strings in Firestore documents
- Firestore documents have **1MB max size** — large Base64 images can exceed this limit
- **Risk**: Firestore errors for large images; slow read performance for image-heavy lists

## 🟡 Medium Priority

### 8. Auth Role Reads Firestore at Every Security Rule Check
- **File**: `firebase/firestore.rules` — `getUserRole()` function reads `users/{uid}` doc on every request
- Each Firestore read operation triggers an additional document read for role verification
- **Risk**: Doubled read costs; Firebase billing impact under heavy traffic

### 9. No Loading Skeletons Consistency
- Some pages show loading spinners, others show nothing during fetch
- `Skeleton.tsx` component exists in shared UI but is inconsistently adopted
- User experience is inconsistent across the 6 apps

### 10. Missing Subcategory Integration in Customer App
- `subcategories` Firestore collection and `categoryService.ts` exist
- Admin panel can manage subcategories
- But customer-facing category/product pages don't yet use subcategories for filtering
- **Risk**: Feature gap between admin capability and customer experience

### 11. Multiple One-Off Fix Scripts at Root
- 10+ one-off scripts at workspace root (`fix_*.js`, `update_*.js`, `sync_*.js`)
- These are not organized, not documented, and contain hardcoded logic
- **Risk**: Confusion about what's safe to rerun; no cleanup of these artifacts

### 12. No Error Boundaries in Use
- `ErrorBoundary.tsx` component exists but is not used anywhere in the app
- Firebase errors (timeouts, permission denied) bubble up and crash the app silently

## 🟢 Low Priority / Tech Debt

### 13. App Config Has No Validation
- `configService.ts` reads `config/app` from Firestore
- If the document doesn't exist or has wrong shape, `AppConfigContext` falls back to `DEFAULT_APP_CONFIG`
- No schema validation or migration logic if config shape changes

### 14. No Logging or Monitoring
- Only `console.error()` and `console.log()` used throughout
- No structured logging (no Sentry, Datadog, Firebase Crashlytics)
- Errors in production will be invisible

### 15. Dev Server Coordination is a Custom Script
- `dev_all.js` spawns all 6 servers using `child_process.spawn`
- If one server crashes, the others keep running without notification
- No process manager (PM2, Foreman) or Turborepo used

### 16. Cart Persists Across Sessions Without Expiry
- `useCartStore` persisted to localStorage with no TTL
- Old cart items (stale prices, deleted products) persist indefinitely
- **Risk**: Customer could checkout a product that no longer exists or has changed price

### 17. Staff App Layouts Partially Duplicated
- Each staff app (`admin`, `co-admin`, `manager`, `store`, `delivery`) has near-identical `page.tsx` login pages (17-20KB each)
- Dashboard layouts are similar across apps but not shared
- **Risk**: Bug fixes need to be applied 5-6x across apps manually
