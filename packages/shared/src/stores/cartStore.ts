import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@smart-bazar/shared/types/firestore';
// Fallback defaults (overridden by live AppConfig at runtime)
const DEFAULT_FREE_DELIVERY_MIN = 199;
const DEFAULT_DELIVERY_CHARGE   = 20;

export interface CartItem {
  product: Product;
  quantity: number;
  variantId?: string;    // which variant was selected
  variantName?: string;  // display label e.g. "125g"
  variantPrice?: number; // override price from variant
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, variant?: { id: string; name: string; price: number }) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  /**
   * Pass live config values from useAppConfig() for real-time pricing.
   * Falls back to hardcoded defaults if not passed.
   */
  getDeliveryCharge: (freeMin?: number, charge?: number) => number;
  getTotal: (freeMin?: number, charge?: number) => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, variant) => {
        set((state) => {
          // Match on product id + variant id (so same product, different variant = separate entry)
          const existing = state.items.find(
            (i) => i.product.id === product.id && i.variantId === variant?.id
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id && i.variantId === variant?.id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                product,
                quantity: 1,
                variantId: variant?.id,
                variantName: variant?.name,
                variantPrice: variant?.price,
              },
            ],
          };
        });
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.product.id === productId && i.variantId === variantId)
          ),
        }));
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId && i.variantId === variantId
              ? { ...i, quantity }
              : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getSubtotal: () =>
        get().items.reduce(
          (sum, i) => sum + (i.variantPrice ?? i.product.price) * i.quantity,
          0
        ),

      getDeliveryCharge: (freeMin = DEFAULT_FREE_DELIVERY_MIN, charge = DEFAULT_DELIVERY_CHARGE) => {
        const subtotal = get().getSubtotal();
        return subtotal >= freeMin ? 0 : charge;
      },

      getTotal: (freeMin = DEFAULT_FREE_DELIVERY_MIN, charge = DEFAULT_DELIVERY_CHARGE) =>
        get().getSubtotal() + get().getDeliveryCharge(freeMin, charge),
    }),
    {
      name: 'smart-bazar-cart',
    }
  )
);
