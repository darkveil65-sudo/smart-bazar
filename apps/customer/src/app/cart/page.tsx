'use client';

import { useRouter } from 'next/navigation';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';
import { FREE_DELIVERY_MIN, DELIVERY_CHARGE } from '@smart-bazar/shared/lib/constants';
import Button from '@smart-bazar/shared/components/ui/Button';
import EmptyState from '@smart-bazar/shared/components/ui/EmptyState';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, getSubtotal, getDeliveryCharge, getTotal, clearCart } = useCartStore();

  const subtotal = getSubtotal();
  const deliveryCharge = getDeliveryCharge();
  const total = getTotal();

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🛒"
        title="Your cart is empty"
        description="Add some products from our categories to get started"
        action={{ label: 'Browse Products', onClick: () => router.push('/home') }}
      />
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Your Cart</h1>
        <button onClick={clearCart} className="text-xs text-destructive hover:underline">Clear all</button>
      </div>

      {/* Cart items */}
      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <div key={item.product.id} className="flex items-center gap-3 bg-card rounded-2xl border border-border p-3">
            <div className="w-16 h-16 rounded-xl bg-gradient-card flex items-center justify-center text-2xl shrink-0">
              📦
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium truncate">{item.product.name}</h4>
              <p className="text-sm font-bold text-primary mt-0.5">₹{item.product.price}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold hover:bg-muted/80 transition-colors"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-sm font-bold hover:bg-primary-dark transition-colors"
              >
                +
              </button>
            </div>
            <button
              onClick={() => removeItem(item.product.id)}
              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4H14M5.33 4V2.67a1.33 1.33 0 011.33-1.33h2.67a1.33 1.33 0 011.33 1.33V4M12.67 4V13.33a1.33 1.33 0 01-1.33 1.33H4.67a1.33 1.33 0 01-1.33-1.33V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Order Summary */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-4">
        <h3 className="font-semibold mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">₹{subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span className={`font-medium ${deliveryCharge === 0 ? 'text-success' : ''}`}>
              {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
            </span>
          </div>
          {deliveryCharge > 0 && (
            <p className="text-xs text-muted-foreground">
              Add ₹{FREE_DELIVERY_MIN - subtotal} more for free delivery
            </p>
          )}
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-primary text-lg">₹{total}</span>
          </div>
        </div>
      </div>

      <Button variant="primary" block size="lg" onClick={() => router.push('/checkout')}>
        Proceed to Checkout
      </Button>
    </div>
  );
}
