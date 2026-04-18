# CONVENTIONS.md — Smart Bazar Coding Conventions
_Last mapped: 2026-04-18_

## Language & Syntax
- **TypeScript strict mode** — `"strict": true` in `tsconfig.json`
- All component files use `.tsx`; logic files use `.ts`
- `'use client'` directive required at top of all interactive components (App Router convention)
- Arrow functions preferred for components and callbacks
- `async/await` pattern throughout services (no `.then()` chains)

## Component Patterns

### Page Components
- Default export, no explicit typing of props (pages receive `params` / `searchParams` from Next.js)
- Loading/error states handled inline with conditional rendering
- All pages begin with data fetch in `useEffect` or subscribe with real-time listeners on mount
- Cleanup returned from `useEffect` always unsubscribes (`return unsubscribe`)

```tsx
'use client';

export default function SomePage() {
  const [data, setData] = useState<Type[]>([]);

  useEffect(() => {
    const unsubscribe = someService.subscribe(setData);
    return unsubscribe;
  }, []);

  return <div>...</div>;
}
```

### Service Objects
Services are **plain objects** (not classes) with typed async methods and subscription methods:

```ts
export const someService = {
  async getSomething(id: string): Promise<Type | null> { ... },
  async updateSomething(id: string, data: Partial<Type>): Promise<void> { ... },
  subscribeToSomething(callback: (items: Type[]) => void) {
    return onSnapshot(..., callback);
  },
};
```

### Real-time Subscriptions Pattern
- `subscribeToX(callback)` → always returns an unsubscribe function
- Naming: `subscribeToX`, `subscribeToXByY`, `subscribeToXByZ`
- Components always cleanup: `useEffect(() => { const unsub = ...; return unsub; }, [])`

## State Management
- **Auth state**: always consumed from `useAuthStore()` (never local state)
- **Cart state**: always consumed from `useCartStore()`
- Component-local state: `useState` for UI-only state (modals, form inputs, loading flags)
- No Redux or other state libraries

## Naming Conventions

### Files
| Type | Convention | Example |
|------|-----------|---------|
| React components | `PascalCase.tsx` | `ProductCard.tsx` |
| Services | `camelCaseService.ts` | `productService.ts` |
| Zustand stores | `camelCaseStore.ts` | `authStore.ts` |
| Hooks | `camelCase.ts` | `useAuth.ts` |
| Context | `PascalCaseContext.tsx` | `AuthContext.tsx` |

### Variables & Functions
- React state: `[value, setValue]` → `[loading, setLoading]`
- Boolean flags: `is*` or `has*` prefix → `isLoading`, `hasError`
- Event handlers: `handle*` prefix → `handlePlaceOrder`
- Services: singular noun → `productService`, `orderService`

### Firestore
- Collection names: plural, camelCase → `products`, `orders`, `heroBanners`
- Document ID fields: always `id: string` in TypeScript types
- Timestamps: ISO string (`new Date().toISOString()`) for `createdAt`, `updatedAt`

## Error Handling
- Service errors: `try/catch` with `console.error()` logging
- User-facing errors: `addToast('message', 'error')` via `useToast()`
- No global error boundary actively catching most errors (only `ErrorBoundary.tsx` exists but is not widely used)
- Firestore subscription errors: logged but don't crash the listener

## CSS / Styling Conventions
- **Tailwind CSS 4 utility classes** throughout (no CSS modules, no inline `style={{}}` except for gradient/shadow overrides)
- Design tokens defined as CSS custom properties in each app's `globals.css`
- Responsive design: mobile-first (`px-4` default, breakpoints as needed)
- Common utility classes defined per app (e.g. `press-effect`, `animate-fadeIn`)
- No `className` logic libraries (no `clsx`, `cn` helper) — template literals used for conditional classes

```tsx
// Conditional className pattern used project-wide
className={`base-class ${condition ? 'active-class' : 'inactive-class'}`}
```

## Import Patterns
```ts
// Shared library
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import type { Product } from '@smart-bazar/shared/types/firestore';

// Next.js
import { useRouter } from 'next/navigation';
import Image from 'next/image';
```

## Form Patterns
- Controlled inputs with local `useState`
- No form libraries (no react-hook-form, formik)
- Validation inline before submission
- Submit handlers are `async` functions attached to button `onClick`

## Authentication Guard
- Each staff app root `page.tsx` checks role and redirects if wrong role (client-side guard)
- Customer app uses route group `(authenticated)/layout.tsx` for auth guard
- Role stored in cookie (`userRole`) for fast non-hydrated checks
