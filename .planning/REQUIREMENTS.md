# Smart Bazar — Requirements

## Philosophy

This document bounds the scope of what we are building. The goal is a deployable, high-quality V1 product. Everything else is Out of Scope.

## Must-Have (V1)

**Stability & Core Fixes (Phase 1)**
- [ ] Firestore rules fixed: secure product creation/updates by vendor ID
- [ ] Order service fields fixed: `assignedStoreId` corrected to `assignedVendorId`
- [ ] Error boundary layout deployed across all apps to trap Firebase crashes
- [ ] Auth guards audited: unauthorized roles bounce immediately to correct app
- [ ] Skeleton loaders on all dashboards and customer views
- [ ] Checkout validation: refresh cart item prices against Firestore before creating order

**Payment System (Phase 2)**
- [ ] Customer Checkout: Show Google Pay UPI QR code (configurable from Admin)
- [ ] Customer Checkout: Upload UPI transaction screenshot or input transaction ID
- [ ] Manager/Store Dashboard: View payment screenshot before fulfilling order

**Real-Time Notifications (Phase 3)**
- [ ] Shared UI: Notification dropdown/bell component
- [ ] Staff Apps: Ping on new order assignment
- [ ] Customer App: Ping on order status change (packed, out for delivery)

**Search & Filtering (Phase 4)**
- [ ] Customer Top Nav: Global search bar for products
- [ ] Category View: Filter buttons for subcategories
- [ ] Product List: Sort by Price (Low/High)

**Reporting & Analytics (Phase 5)**
- [ ] Admin Dashboard: High-level metrics (Total Revenue, Active Orders, Store count)
- [ ] Manager Dashboard: Area-specific metrics
- [ ] Store Dashboard: Vendor-specific revenue and top products

## Should-Have (V1.5)

- [ ] Delivery Agent live map tracking (customer view)
- [ ] Promo codes (percentage and flat discounts)
- [ ] Product ratings and reviews (1-5 stars)
- [ ] Automated SMS/WhatsApp notifications (Twilio/Firebase Extensions)

## Won't-Have / Out of Scope

**(Explicitly excluding these to ship faster)**

- Third-party payment gateway integration (Razorpay/Stripe)
- Native mobile apps (React Native/Flutter)
- Multi-store assignments for a single order
- Automated inventory reordering
- Multi-language support
- Complex multi-tier role permissions (sticking to the 6 fixed roles)

---
*Last updated: 2026-04-19*
