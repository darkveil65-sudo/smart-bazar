'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@smart-bazar/shared/components/layout/DashboardLayout';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Order } from '@smart-bazar/shared/types/firestore';
import { OrderStatusBadge } from '@smart-bazar/shared/components/ui/Badge';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

const deliveryNav = [
  { label: 'Deliveries', href: '/dashboard/delivery', icon: '🛵' },
  { label: 'Earning History', href: '/dashboard/delivery/earnings', icon: '💰' },
  { label: 'Profile', href: '/dashboard/delivery/settings', icon: '👤' },
];

export default function DeliveryDashboard() {
  const { addToast } = useToast();
  const { userData } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;
    const unsub = orderService.subscribeToOrders((data) => {
      // Filter for orders that are 'shipped' or assigned to this delivery boy
      setOrders(data.filter(o => o.status === 'shipped' || o.status === 'out-for-delivery'));
      setLoading(false);
    });
    return unsub;
  }, [userData]);

  const handleStatusUpdate = async (id: string, status: Order['status']) => {
    try {
      await orderService.updateOrderStatus(id, status);
      addToast(`Order marked as ${status}`, 'success');
     } catch (error) {
       console.error('Status update failed:', error);
       addToast('Status update failed', 'error');
     }
  };

  return (
    <DashboardLayout title="Delivery Hub" navItems={deliveryNav} accentColor="#10b981">
      <div className="animate-fadeIn">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-1">
            <h1 className="text-2xl font-black text-slate-900">Delivery Dashboard</h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full border border-green-200">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-extrabold text-green-700 uppercase tracking-wider">Online</span>
            </div>
          </div>
          <p className="text-sm text-slate-500">Ready to deliver groceries?</p>
        </div>

        {/* Deliveries List */}
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 animate-scaleIn">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">📦</span>
                    <h3 className="text-lg font-black text-slate-900">Order #{order.id.slice(0, 8).toUpperCase()}</h3>
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">Customer Address</p>
                  <p className="text-sm text-slate-700 mt-1 font-medium">{order.shippingAddress?.address || 'Standard Delivery'}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-500">Earnings for this trip</span>
                  <span className="text-lg font-black text-[#10b981]">₹45.00</span>
                </div>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                      <span>{item.name} x {item.quantity}</span>
                      <span className="font-bold">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {order.status === 'shipped' && (
                  <button 
                    onClick={() => handleStatusUpdate(order.id, 'out-for-delivery')}
                    className="col-span-2 py-3.5 bg-[#10b981] text-white font-bold text-sm rounded-xl shadow-lg shadow-green-200 press-effect"
                  >
                    🚀 Pick Up Order
                  </button>
                )}
                {order.status === 'out-for-delivery' && (
                  <button 
                    onClick={() => handleStatusUpdate(order.id, 'completed')}
                    className="col-span-2 py-3.5 bg-slate-900 text-white font-bold text-sm rounded-xl shadow-xl press-effect"
                  >
                    ✅ Mark as Delivered
                  </button>
                )}
              </div>
            </div>
          ))}

          {orders.length === 0 && !loading && (
            <div className="py-24 text-center">
              <div className="text-6xl mb-6">💤</div>
              <h3 className="text-xl font-bold text-slate-900">Wait for new orders</h3>
              <p className="text-sm text-slate-500 mt-1">Orders ready for delivery will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}