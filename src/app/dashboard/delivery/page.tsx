'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuthStore } from '@/stores/authStore';
import { orderService } from '@/lib/services/orderService';
import { Order } from '@/types/firestore';
import { OrderStatusBadge } from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/contexts/ui/ToastContext';

const deliveryNav = [
  { label: 'Dashboard', href: '/dashboard/delivery', icon: '🚚' },
];

export default function DeliveryDashboard() {
  const { addToast } = useToast();
  const { userData } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  useEffect(() => {
    if (!userData) return;
    const unsub = orderService.subscribeToOrders((allOrders) => {
      setOrders(allOrders.filter((o) => o.assignedDeliveryBoyId === userData.id));
    });
    return () => unsub();
  }, [userData]);

  const activeOrders = orders.filter((o) => o.status === 'delivery');
  const completedOrders = orders.filter((o) => o.status === 'completed');

  const handlePickUp = async (orderId: string) => {
    try {
      await orderService.updateOrderStatus(orderId, 'delivery');
      addToast('Order picked up', 'success');
    } catch { addToast('Failed', 'error'); }
  };

  const handleDeliver = async (orderId: string) => {
    try {
      await orderService.updateOrderStatus(orderId, 'completed');
      addToast('Order delivered!', 'success');
    } catch { addToast('Failed', 'error'); }
  };

  const stats = {
    active: activeOrders.length,
    completed: completedOrders.length,
    total: orders.length,
    earnings: completedOrders.reduce((s, o) => s + Math.min(o.totalAmount * 0.1, 50), 0),
  };

  return (
    <DashboardLayout title="Delivery Dashboard" navItems={deliveryNav}>
      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Card><div className="text-center"><p className="text-2xl font-bold text-warning">{stats.active}</p><p className="text-xs text-muted-foreground">Active</p></div></Card>
        <Card><div className="text-center"><p className="text-2xl font-bold text-success">{stats.completed}</p><p className="text-xs text-muted-foreground">Completed</p></div></Card>
        <Card><div className="text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></div></Card>
        <Card><div className="text-center"><p className="text-2xl font-bold text-primary">₹{Math.round(stats.earnings)}</p><p className="text-xs text-muted-foreground">Earnings</p></div></Card>
      </div>

      <div className="flex gap-2 mb-6">
        {(['active', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize
              ${activeTab === tab ? 'bg-primary text-white' : 'bg-card border border-border text-muted-foreground'}`}
          >
            {tab === 'active' ? `🚚 Active (${activeOrders.length})` : `✅ History (${completedOrders.length})`}
          </button>
        ))}
      </div>

      {/* Active deliveries */}
      {activeTab === 'active' && (
        <div className="animate-fadeIn space-y-3">
          {activeOrders.length === 0 ? (
            <EmptyState icon="🚚" title="No active deliveries" description="Deliveries assigned to you will appear here" />
          ) : (
            activeOrders.map((order) => (
              <Card key={order.id}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-medium">#{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{order.items.length} items • ₹{order.totalAmount}</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                {order.deliveryAddress && (
                  <div className="bg-muted/50 rounded-xl p-3 mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">📍 Delivery Address</p>
                    <p className="text-sm">{order.deliveryAddress.street}, {order.deliveryAddress.city}</p>
                    {order.deliveryAddress.pincode && <p className="text-xs text-muted-foreground">PIN: {order.deliveryAddress.pincode}</p>}
                    {order.deliveryAddress.latitude && order.deliveryAddress.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${order.deliveryAddress.latitude},${order.deliveryAddress.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-primary font-medium hover:underline"
                      >
                        📍 Open in Maps
                      </a>
                    )}
                  </div>
                )}

                {order.specialInstructions && (
                  <p className="text-xs text-muted-foreground mb-3">📝 {order.specialInstructions}</p>
                )}

                <Button size="sm" block onClick={() => handleDeliver(order.id)}>
                  ✅ Mark as Delivered
                </Button>
              </Card>
            ))
          )}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="animate-fadeIn space-y-3">
          {completedOrders.length === 0 ? (
            <EmptyState icon="📦" title="No deliveries yet" />
          ) : (
            completedOrders.map((order) => (
              <Card key={order.id}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">#{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{order.items.length} items</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">₹{order.totalAmount}</p>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </DashboardLayout>
  );
}