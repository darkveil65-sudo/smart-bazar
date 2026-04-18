# TESTING.md — Smart Bazar Testing Practices
_Last mapped: 2026-04-18_

## Current State: No Automated Testing
The project currently has **no test files or test framework configured**.

### What's absent
- No `*.test.ts`, `*.spec.ts`, or `*.test.tsx` files anywhere in the repository
- No Jest, Vitest, Playwright, or Cypress configuration
- No `@testing-library/react` dependency
- No CI pipeline configured (no `.github/workflows/` directory)

## Manual Verification Approach
The team currently relies on manual, script-assisted verification:

### Standalone Node Scripts (at workspace root)
These scripts use `firebase-admin` SDK to interact with Firestore directly:

| Script | Purpose |
|--------|---------|
| `seed_products.js` | Seed test product data into Firestore |
| `sync_categories.js / .ts` | Sync category data across stores |
| `sync_categories_admin.js` | Sync categories from admin perspective |
| `gen_staff_logins.js` | Generate staff account credentials |
| `create_admin.js` | Bootstrap first admin account |
| `test_login.js` | Quick login verification script |
| `update_product_units.js` | Batch update product unit fields |
| `fix_*.js` | One-off bug fix scripts |

### Dev Environment Validation
- Run `npm run dev:all` → manually test each panel in browser
- Access at `localhost:3001` (customer) through `localhost:3006` (delivery)

## Testing Infrastructure Recommendations (Future)

### Unit Testing Candidates
- `packages/shared/src/lib/services/*.ts` — pure async functions, easy to mock Firebase
- `packages/shared/src/stores/cartStore.ts` — pure state logic
- `packages/shared/src/lib/constants.ts` — `getDeliverySlot()` function

### Integration Testing Candidates
- Checkout flow (cart → order creation)
- Order status transitions
- Auth flow (login → role redirect)

### Recommended Stack (if added)
```
Unit tests: Vitest (fast, compatible with ESModules + TypeScript)
Component tests: @testing-library/react
E2E tests: Playwright (supports multi-app testing)
Firebase mocking: firebase-emulator-suite or firebase-jest-mock
```

### Vitest Setup (minimal)
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'jsdom', globals: true },
});
```

## Build Verification
- **TypeScript compilation**: `tsc --noEmit` (validates types across workspace)
- **ESLint**: `eslint` (configured via `eslint.config.mjs`)
- Neither is run in a CI gate currently
