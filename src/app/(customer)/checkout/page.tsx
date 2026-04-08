'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { orderService } from '@/lib/services/orderService';
import { useToast } from '@/contexts/ui/ToastContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';

export default function CheckoutPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { items, getSubtotal, getDeliveryCharge, getTotal, clearCart } = useCartStore();
  const { user, userData } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [specialInstructions, setSpecialInstructions] = useState('');

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🛒"
        title="Your cart is empty"
        description="Add products before checkout"
        action={{ label: 'Browse Products', onClick: () => router.push('/home') }}
      />
    );
  }

  if (!user) {
    return (
      <EmptyState
        icon="🔐"
        title="Please login to checkout"
        description="You need an account to place orders"
        action={{ label: 'Login', onClick: () => router.push('/') }}
      />
    );
  }

  const handlePlaceOrder = async () => {
    if (!address.street || !address.city || !address.pincode) {
      addToast('Please fill in your delivery address', 'error');
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
        deliveryAddress: address,
        specialInstructions: specialInstructions || undefined,
        createdAt: new Date().toISOString(),
      });

      clearCart();
      addToast('Order placed successfully!', 'success');
      router.push(`/orders/${orderId}`);
    } catch {
      addToast('Failed to place order. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold mb-6">Checkout</h1>

      {/* Delivery Address */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-4">
        <h3 className="font-semibold mb-3">Delivery Address</h3>
        <Input
          label="Street / Area"
          value={address.street}
          onChange={(v) => setAddress((a) => ({ ...a, street: v }))}
          placeholder="House no, Street, Area"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="City"
            value={address.city}
            onChange={(v) => setAddress((a) => ({ ...a, city: v }))}
            placeholder="City"
            required
          />
          <Input
            label="Pincode"
            value={address.pincode}
            onChange={(v) => setAddress((a) => ({ ...a, pincode: v }))}
            placeholder="Pincode"
            required
          />
        </div>
        <Input
          label="State"
          value={address.state}
          onChange={(v) => setAddress((a) => ({ ...a, state: v }))}
          placeholder="State"
        />
        <Input
          label="Special Instructions (optional)"
          value={specialInstructions}
          onChange={setSpecialInstructions}
          placeholder="Any special instructions for delivery"
        />
      </div>

      {/* Order Items */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-4">
        <h3 className="font-semibold mb-3">Order Items ({items.length})</h3>
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.product.id} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{i.product.name} × {i.quantity}</span>
              <span className="font-medium">₹{i.product.price * i.quantity}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span className={`font-medium ${getDeliveryCharge() === 0 ? 'text-success' : ''}`}>
              {getDeliveryCharge() === 0 ? 'FREE' : `₹${getDeliveryCharge()}`}
            </span>
          </div>
          <div className="flex justify-between text-base">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-primary">₹{getTotal()}</span>
          </div>
        </div>
      </div>

      <Button variant="primary" block size="lg" onClick={handlePlaceOrder} loading={loading}>
        Place Order — ₹{getTotal()}
      </Button>
    </div>
  );
}
