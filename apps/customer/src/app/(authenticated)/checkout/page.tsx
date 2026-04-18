'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

const paymentMethods = [
  { id: 'cod', label: 'Cash on Delivery', icon: '💵', desc: 'Pay when we deliver' },
  { id: 'upi', label: 'UPI / Wallet', icon: '📱', desc: 'PhonePe, Gpay, Paytm' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { items, getSubtotal, getDeliveryCharge, getTotal, clearCart } = useCartStore();
  const { user, userData } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(true);
  const [address, setAddress] = useState({ street: '', city: '', state: '', pincode: '' });
  const [specialInstructions, setSpecialInstructions] = useState('');

  const savedAddresses = userData?.addresses || [];

  const getActiveAddress = () => {
    if (!useNewAddress && selectedAddressIndex !== null) {
      return savedAddresses[selectedAddressIndex];
    }
    return address;
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 animate-fadeIn">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-xl font-bold mb-2">Cart is empty</h2>
        <button onClick={() => router.push('/home')} className="text-primary font-semibold text-sm hover:underline">
          Browse Products →
        </button>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    const activeAddress = getActiveAddress();
    if (!activeAddress.street || !activeAddress.city || !activeAddress.pincode) {
      addToast('Please add a delivery address', 'error');
      return;
    }
    if (!user) {
      addToast('Please login to place order', 'error');
      return;
    }

    setLoading(true);
    try {
      const orderId = await orderService.createOrder({
        customerId: user.uid,
        items: items.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
        })),
        totalAmount: getTotal(),
        status: 'pending',
        deliveryAddress: activeAddress,
        specialInstructions: specialInstructions || undefined,
        createdAt: new Date().toISOString(),
      });
      clearCart();
      addToast('Order placed successfully! 🎉', 'success');
      router.push(`/orders/${orderId}`);
     } catch (error) {
       console.error('Failed to place order:', error);
       addToast('Failed to place order. Please try again.', 'error');
     }
  };

  const fieldClass = "w-full px-3.5 py-3 bg-muted rounded-xl text-sm border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-all";
  const labelClass = "block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide";

  return (
    <div className="px-4 py-5 pb-8 animate-fadeIn">
      {/* Header with back */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-muted transition-colors press-effect">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="text-xl font-extrabold">Checkout</h1>
      </div>

      {/* ===== DELIVERY ADDRESS ===== */}
      <section className="mb-5">
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
          Delivery Address
        </h2>

        {/* Saved addresses */}
        {savedAddresses.length > 0 && (
          <div className="space-y-2 mb-3">
            {savedAddresses.map((addr, i) => (
              <button
                key={i}
                onClick={() => { setSelectedAddressIndex(i); setUseNewAddress(false); }}
                className={`w-full text-left flex items-start gap-3 p-3.5 rounded-2xl border transition-all press-effect ${
                  !useNewAddress && selectedAddressIndex === i
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-border-light'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                  !useNewAddress && selectedAddressIndex === i ? 'border-primary' : 'border-muted-foreground'
                }`}>
                  {!useNewAddress && selectedAddressIndex === i && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">📍 {addr.street}</p>
                  <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                </div>
              </button>
            ))}
            <button
              onClick={() => { setUseNewAddress(true); setSelectedAddressIndex(null); }}
              className={`w-full text-left flex items-center gap-3 p-3.5 rounded-2xl border transition-all press-effect ${
                useNewAddress ? 'border-primary bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${useNewAddress ? 'border-primary' : 'border-muted-foreground'}`}>
                {useNewAddress && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <span className="text-sm font-medium text-primary">+ Add new address</span>
            </button>
          </div>
        )}

        {/* New address form */}
        {(useNewAddress || savedAddresses.length === 0) && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div>
              <label className={labelClass}>Street / Area *</label>
              <input type="text" value={address.street} onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))} placeholder="House no, Street, Area" className={fieldClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>City *</label>
                <input type="text" value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} placeholder="City" className={fieldClass} />
              </div>
              <div>
                <label className={labelClass}>Pincode *</label>
                <input type="text" inputMode="numeric" maxLength={6} value={address.pincode} onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value }))} placeholder="Pincode" className={fieldClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input type="text" value={address.state} onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))} placeholder="State" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Special Instructions</label>
              <textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} rows={2} placeholder="Any notes for delivery (optional)" className={fieldClass + ' resize-none'} />
            </div>
          </div>
        )}
      </section>

      {/* ===== PAYMENT METHOD ===== */}
      <section className="mb-5">
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
          Payment Method
        </h2>
        <div className="space-y-2">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => setPaymentMethod(method.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all press-effect ${
                paymentMethod === method.id ? 'border-primary bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <span className="text-2xl">{method.icon}</span>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">{method.label}</p>
                <p className="text-xs text-muted-foreground">{method.desc}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                paymentMethod === method.id ? 'border-primary' : 'border-muted-foreground'
              }`}>
                {paymentMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ===== ORDER SUMMARY ===== */}
      <section className="mb-6">
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
          Order Summary
        </h2>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="space-y-2 text-sm">
            {items.map((i) => (
              <div key={i.product.id} className="flex justify-between">
                <span className="text-muted-foreground">{i.product.name} × {i.quantity}</span>
                <span className="font-medium">₹{i.product.price * i.quantity}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span className={`font-semibold ${getDeliveryCharge() === 0 ? 'text-success' : ''}`}>
                {getDeliveryCharge() === 0 ? '🎉 FREE' : `₹${getDeliveryCharge()}`}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="font-bold">Total</span>
              <span className="font-extrabold text-primary text-lg">₹{getTotal()}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PLACE ORDER CTA ===== */}
      <button
        onClick={handlePlaceOrder}
        disabled={loading}
        className="w-full py-4 rounded-2xl text-white font-bold text-base press-effect disabled:opacity-60 transition-all"
        style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 8px 24px rgba(5,150,105,0.3)' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
              <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            Placing order...
          </span>
        ) : (
          `Place Order — ₹${getTotal()}`
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground mt-3">
        🔒 Your data is safe and encrypted
      </p>
    </div>
  );
}
