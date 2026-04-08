'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Order } from '@smart-bazar/shared/types/firestore';
import { OrderStatusBadge } from '@smart-bazar/shared/components/ui/Badge';
import EmptyState from '@smart-bazar/shared/components/ui/EmptyState';
import Skeleton from '@smart-bazar/shared/components/ui/Skeleton';

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    orderService.getOrdersByCustomer(user.uid).then((o) => {
      setOrders(o);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <EmptyState
        icon="🔐"
        title="Please login"
        description="Login to view your orders"
        action={{ label: 'Login', onClick: () => router.push('/') }}
      />
    );
  }

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold mb-6">My Orders</h1>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4">
              <Skeleton height="16px" width="60%" className="mb-2" />
              <Skeleton height="14px" width="40%" className="mb-2" />
              <Skeleton height="14px" width="30%" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders yet"
          description="Place your first order from our amazing products"
          action={{ label: 'Shop Now', onClick: () => router.push('/home') }}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => router.push(`/orders/${order.id}`)}
              className="w-full text-left bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8)}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="text-sm font-medium">{order.items.length} item{order.items.length > 1 ? 's' : ''}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-bold text-primary">₹{order.totalAmount}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
