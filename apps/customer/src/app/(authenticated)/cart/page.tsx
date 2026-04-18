'use client';

import { useRouter } from 'next/navigation';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';
import { FREE_DELIVERY_MIN, DELIVERY_CHARGE, CATEGORIES } from '@smart-bazar/shared/lib/constants';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, getSubtotal, getDeliveryCharge, getTotal, clearCart } = useCartStore();

  const subtotal = getSubtotal();
  const deliveryCharge = getDeliveryCharge();
  const total = getTotal();
  const freeDeliveryRemaining = FREE_DELIVERY_MIN - subtotal;

  const getCategoryIcon = (categoryId: string) =>
    CATEGORIES.find((c) => c.id === categoryId)?.icon || '📦';
  const getCategoryColor = (categoryId: string) =>
    CATEGORIES.find((c) => c.id === categoryId)?.color || '#059669';

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-fadeIn">
        <div className="text-7xl mb-5 animate-bounce-subtle">🛒</div>
        <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">Add some fresh groceries to get started</p>
        <button
          onClick={() => router.push('/home')}
          className="px-6 py-3 rounded-xl text-white font-semibold press-effect"
          style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
        >
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold">My Cart</h1>
          <p className="text-xs text-muted-foreground">{items.length} item{items.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-destructive hover:bg-destructive/5 px-2.5 py-1.5 rounded-lg font-medium transition-colors press-effect"
        >
          Clear all
        </button>
      </div>

      {/* Free delivery progress */}
      {freeDeliveryRemaining > 0 && (
        <div className="bg-warning/8 border border-warning/20 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
          <span className="text-xl">🚚</span>
          <div className="flex-1">
            <p className="text-xs font-semibold text-warning-700" style={{ color: '#92400e' }}>
              Add ₹{freeDeliveryRemaining} more for FREE delivery!
            </p>
            <div className="mt-1.5 h-1.5 bg-warning/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  width: `${Math.min((subtotal / FREE_DELIVERY_MIN) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
      {freeDeliveryRemaining <= 0 && (
        <div className="bg-success/8 border border-success/20 rounded-2xl px-4 py-3 mb-5 flex items-center gap-2">
          <span className="text-xl">🎉</span>
          <p className="text-xs font-semibold" style={{ color: '#166534' }}>You got FREE delivery!</p>
        </div>
      )}

      {/* Cart Items */}
      <div className="space-y-3 mb-5">
        {items.map((item) => {
          const catIcon = getCategoryIcon(item.product.category);
          const catColor = getCategoryColor(item.product.category);
          return (
            <div
              key={item.product.id}
              className="flex items-center gap-3 bg-card rounded-2xl border border-border p-3 animate-fadeInUp"
            >
              {/* Product icon */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: `${catColor}15` }}
              >
                {catIcon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold truncate">{item.product.name}</h4>
                <p className="text-xs font-bold text-primary mt-0.5">₹{item.product.price} each</p>
              </div>

              {/* Quantity controls */}
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-sm font-bold hover:bg-border transition-colors press-effect"
                  >−</button>
                  <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg text-white flex items-center justify-center text-sm font-bold press-effect"
                    style={{ background: 'var(--primary)' }}
                  >+</button>
                </div>
                <span className="text-xs font-bold text-foreground">
                  ₹{item.product.price * item.quantity}
                </span>
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeItem(item.product.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors press-effect"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.75 3.5h10.5M5.25 3.5V2.333a.583.583 0 01.583-.583h2.334a.583.583 0 01.583.583V3.5M11.083 3.5l-.583 7.584a1.167 1.167 0 01-1.167 1.083H4.667A1.167 1.167 0 013.5 11.084L2.917 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Order Summary */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-5">
        <h3 className="font-bold mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
            <span className="font-medium">₹{subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery fee</span>
            <span className={`font-semibold ${deliveryCharge === 0 ? 'text-success' : ''}`}>
              {deliveryCharge === 0 ? '🎉 FREE' : `₹${deliveryCharge}`}
            </span>
          </div>
          <div className="border-t border-border pt-2.5 flex justify-between items-center">
            <span className="font-bold">Total Amount</span>
            <span className="font-extrabold text-primary text-lg">₹{total}</span>
          </div>
        </div>
      </div>

      {/* Checkout CTA */}
      <button
        onClick={() => router.push('/checkout')}
        className="w-full py-4 rounded-2xl text-white font-bold text-base press-effect transition-all"
        style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 8px 24px rgba(5,150,105,0.3)' }}
      >
        Proceed to Checkout — ₹{total}
      </button>
    </div>
  );
}
