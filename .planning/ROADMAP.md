# Smart Bazar — Roadmap

## Phase 1: Stabilization & Fixes [Current]
**Goal**: Make the app reliable. Fix data pipeline issues, correct field mismatches, and trap crashes. Without this, no features matter.

- **Plan 1.1**: Fix Database Schema & Rules Mismatch
  - Audit `products/vendorId` and `orders/assignedVendorId` vs live rules/queries.
  - Update `firebase/firestore.rules` and `orderService/productService`.
- **Plan 1.2**: Implement Global Error Boundaries
  - Apply `ErrorBoundary` layout wrapper across all 6 applications.
  - Replace unhandled throws with safe UI fallbacks.
- **Plan 1.3**: Strict Auth Guard and Data Validation
  - Standardize route protection: boot unauthorized roles instantly without blinking white screens.
  - Add Cart validation on checkout: verify prices against DB before order creation.
- **Plan 1.4**: UI Polish & Loading States
  - Add `Skeleton` components to dashboard data fetching.

**Phase 1 Verification**: 
- Manager assigns order to store → store vendor actually sees it.
- Store vendor updates product → it actually writes to DB.
- Invalid URL/role → instant redirect without crash.

## Phase 2: UPI QR Payment Integration
**Goal**: Provide a safe, low-friction payment method (Google Pay/UPI) natively within the checkout flow.

- **Plan 2.1**: Admin QR Management
  - Add system config for Admin to upload the central merchant UPI QR code.
- **Plan 2.2**: Checkout Payment UI
  - Modify `apps/customer/.../checkout/page.tsx` to display QR step.
  - Add file upload logic for payment screenshot.
- **Plan 2.3**: Verification UI for Staff
  - Update Manager & Store dashboards to display the payment screenshot on the order details screen.

**Phase 2 Verification**: 
- Customer checkout flow incorporates QR scan + screenshot upload.
- Admin/Manager can verify screenshot in order details.

## Phase 3: Real-Time Notifications
**Goal**: Reduce order processing latency by actively pinging roles when tasks await them.

- **Plan 3.1**: Shared Notification System
  - Create Firestore `notifications` collection and service.
  - Build shared Notification bell UI component.
- **Plan 3.2**: Event Triggers
  - Hook into `orderService` state changes to generate notifications.
- **Plan 3.3**: Customer Alerts
  - Build UI for customer to see status alerts.

**Phase 3 Verification**: 
- Order moves from Manager -> Store; Store gets a notification immediately.

## Phase 4: Product Search & Filtering
**Goal**: Modernize customer shopping experience with basic search and subcategory filters.

- **Plan 4.1**: Global Search
  - Build search component in Header.
  - Connect to `productService` for client-side text filtering.
- **Plan 4.2**: Category Filtering
  - Hook existing subcategories into the UI sidebar/filter bar.

## Phase 5: Analytics Dashboards
**Goal**: Expose business health metrics to Admin, Manager, and Store roles.

- **Plan 5.1**: Data Aggregation Scripts/Service
  - Create lightweight analytics fetchers (Count orders, Sum revenue).
- **Plan 5.2**: Dashboard UI
  - Implement top-line metrics cards.

## Future / Backlog
- Phase 6: Delivery agent live tracking map integration.
- Phase 7: Promo code engine and discount applications.
- Phase 8: Ratings and reviews.
