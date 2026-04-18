'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Order } from '@smart-bazar/shared/types/firestore';
import { ORDER_STATUSES } from '@smart-bazar/shared/lib/constants';

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    orderService.getOrdersByCustomer(user.uid).then((o) => {
      setOrders(o);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Done' },
  ] as const;

  const filteredOrders = orders.filter((o) => {
    if (filter === 'active') return !['completed', 'cancelled'].includes(o.status);
    if (filter === 'completed') return ['completed', 'cancelled'].includes(o.status);
    return true;
  });

  const getStatusConfig = (status: string) => {
    return ORDER_STATUSES[status as keyof typeof ORDER_STATUSES] || { label: status, color: '#64748b', bg: '#f1f5f9' };
  };

  const getStatusEmoji = (status: string) => {
    const map: Record<string, string> = {
      pending: '⏳',
      manager: '👨‍💼',
      store: '🏪',
      packed: '📦',
      delivery: '🛵',
      completed: '✅',
      cancelled: '❌',
    };
    return map[status] || '📋';
  };

  if (loading) {
    return (
      <div className="px-4 py-5">
        <div className="h-8 w-32 rounded animate-shimmer mb-2" />
        <div className="h-4 w-20 rounded animate-shimmer mb-5" />
        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex justify-between mb-2">
                <div className="h-4 w-24 rounded animate-shimmer" />
                <div className="h-6 w-20 rounded-full animate-shimmer" />
              </div>
              <div className="h-3.5 w-32 rounded animate-shimmer mb-1" />
              <div className="flex justify-between mt-2">
                <div className="h-4 w-16 rounded animate-shimmer" />
                <div className="h-3.5 w-20 rounded animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 animate-fadeIn">
      {/* Header */}
      <h1 className="text-xl font-extrabold mb-1">My Orders</h1>
      <p className="text-sm text-muted-foreground mb-4">{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 p-1 bg-muted rounded-xl">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 press-effect ${
              filter === opt.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-6xl mb-4">📦</p>
          <h3 className="font-bold text-lg mb-2">
            {filter === 'active' ? 'No active orders' : filter === 'completed' ? 'No completed orders' : 'No orders yet'}
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            {filter === 'all' ? 'Place your first order and get fresh groceries delivered!' : 'Switch to "All" to see all orders'}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => router.push('/home')}
              className="px-6 py-3 rounded-xl text-white font-semibold press-effect"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
            >
              Shop Now
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {filteredOrders.map((order, i) => {
            const statusConfig = getStatusConfig(order.status);
            const isActive = !['completed', 'cancelled'].includes(order.status);
            return (
              <button
                key={order.id}
                onClick={() => router.push(`/orders/${order.id}`)}
                className="w-full text-left bg-card rounded-2xl border border-border p-4 card-hover press-effect animate-fadeInUp"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <span className="text-xs font-mono text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                    {isActive && (
                      <span className="ml-2 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <span
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: statusConfig.bg, color: statusConfig.color }}
                  >
                    {getStatusEmoji(order.status)} {statusConfig.label}
                  </span>
                </div>

                {/* Items preview */}
                <p className="text-sm font-medium mb-0.5">
                  {order.items[0]?.name}
                  {order.items.length > 1 && (
                    <span className="text-muted-foreground font-normal"> +{order.items.length - 1} more</span>
                  )}
                </p>

                <div className="flex justify-between items-center mt-2.5">
                  <span className="text-base font-extrabold text-primary">₹{order.totalAmount}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted-foreground">
                      <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
