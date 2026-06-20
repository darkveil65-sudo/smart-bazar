'use client';

import { useState, useEffect } from 'react';
// Layout handled by parent
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { Order } from '@smart-bazar/shared/types/firestore';
import { ORDER_STATUSES } from '@smart-bazar/shared/lib/constants';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { useRouter } from 'next/navigation';
import { SwipeSlider } from '../../components/SwipeSlider';

export default function DeliveryDashboard() {
  const { userData, setUserData } = useAuthStore();
  const { addToast } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    if (!userData) return;
    const unsub = orderService.subscribeToOrdersByDelivery(userData.id, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, [userData]);

  const activeOrders = orders.filter(o => o.status === 'delivery');
  const completedToday = orders.filter(o =>
    o.status === 'completed' &&
    new Date(o.deliveredAt || o.updatedAt || '').toDateString() === new Date().toDateString()
  );
  const totalEarnings = orders.filter(o => o.status === 'completed').length * 30; // ₹30 per delivery

  const handleMarkDelivered = async (orderId: string) => {
    setProcessing(orderId);
    try {
      await orderService.markDelivered(orderId);
      addToast('Order delivered! Payment received 🎉', 'success');
    } catch {
      addToast('Update failed', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleAvailability = async () => {
    if (!userData) return;
    setTogglingStatus(true);
    const newStatus = userData.status === 'active' ? 'inactive' : 'active';
    try {
      await userService.toggleStatus(userData.id, newStatus);
      setUserData({ ...userData, status: newStatus });
      addToast(`Status set to ${newStatus === 'active' ? 'Online' : 'Offline'}`, 'success');
    } catch {
      addToast('Failed to update status', 'error');
    } finally {
      setTogglingStatus(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-6">
      <div className="animate-fadeIn">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Hey, {userData?.name?.split(' ')[0] || 'Partner'} 👋
            </h1>
            <p className="text-sm text-slate-500">Ready to deliver? Your orders are below</p>
          </div>
          <button 
            onClick={handleToggleAvailability}
            disabled={togglingStatus}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all disabled:opacity-50 ${
              userData?.status === 'active' 
                ? 'bg-green-100 border-green-200 hover:bg-green-200' 
                : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${userData?.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className={`text-xs font-bold ${userData?.status === 'active' ? 'text-green-700' : 'text-slate-600'}`}>
              {userData?.status === 'active' ? 'Online' : 'Offline'}
            </span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Active', value: activeOrders.length, icon: '🛵', color: '#f97316', bg: '#ffedd5' },
            { label: 'Today', value: completedToday.length, icon: '✅', color: '#22c55e', bg: '#dcfce7' },
            { label: 'Earnings', value: `₹${totalEarnings}`, icon: '💰', color: '#8b5cf6', bg: '#ede9fe' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm animate-fadeInUp">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl mx-auto mb-2"
                style={{ background: s.bg }}>
                {s.icon}
              </div>
              <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Active Deliveries */}
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Active Deliveries</h2>
          {activeOrders.length > 0 && (
            <span className="text-xs font-bold px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full">
              {activeOrders.length} pending
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                    <div className="h-3 w-48 bg-slate-100 rounded" />
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="flex flex-col items-center py-16 bg-white rounded-3xl border border-slate-100">
            <p className="text-5xl mb-4">💤</p>
            <p className="font-bold text-slate-400 text-lg">No active deliveries</p>
            <p className="text-sm text-slate-400 mt-1">Waiting for manager to assign orders to you</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeOrders.map(order => {
              const statusCfg = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES];
              const addr = order.deliveryAddress;

              return (
                <div key={order.id}
                  className="bg-white rounded-2xl border border-orange-100 shadow-md overflow-hidden animate-scaleIn"
                  style={{ borderLeft: '4px solid #f97316' }}>
                  <div className="p-5">
                    {/* Order header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <p className="text-base font-black text-slate-900">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {order.items.length} item{order.items.length > 1 ? 's' : ''} • ₹{order.totalAmount}
                        </p>
                        {order.deliverySlot && (
                          <p className="text-[10px] font-bold text-emerald-600 mt-0.5" title="Delivery Slot">
                            ⏱️ {order.deliverySlot}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                        style={{ background: statusCfg?.bg, color: statusCfg?.color }}>
                        {statusCfg?.icon} {statusCfg?.label}
                      </span>
                    </div>

                    {/* Delivery address */}
                    {addr && (
                      <div className="flex items-start gap-2 bg-orange-50 rounded-xl px-3 py-2.5 mb-4">
                        <span className="text-lg mt-0.5 shrink-0">📍</span>
                        <div>
                          <p className="text-[10px] font-bold text-orange-500 uppercase mb-0.5">Deliver to</p>
                          <p className="text-xs font-semibold text-slate-800">
                            {addr.street}, {addr.city}
                            {addr.pincode ? ` - ${addr.pincode}` : ''}
                          </p>
                          {addr.state && <p className="text-[10px] text-slate-500">{addr.state}</p>}
                        </div>
                      </div>
                    )}

                    {/* Items summary */}
                    <div className="text-xs text-slate-500 mb-4 line-clamp-1">
                      {order.items.map(i => `${i.emoji || ''}${i.name} ×${i.quantity}`).join(' · ')}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => router.push(`/dashboard/delivery/map?orderId=${order.id}&lat=${addr?.latitude || ''}&lng=${addr?.longitude || ''}`)}
                        className="flex-1 py-3 rounded-2xl border-2 border-orange-200 text-orange-600 text-sm font-bold hover:bg-orange-50 transition-all"
                      >
                        🗺️ View Map
                      </button>
                      <div className="flex-1">
                        <SwipeSlider
                          onComplete={() => handleMarkDelivered(order.id)}
                          isLoading={processing === order.id}
                          text="Swipe to Deliver"
                          completedText="Delivered 🎉"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent completed */}
        {completedToday.length > 0 && (
          <div className="mt-6">
            <h2 className="text-base font-bold text-slate-900 mb-3">Today Delivered</h2>
            <div className="space-y-2">
              {completedToday.map(order => (
                <div key={order.id}
                  className="flex items-center justify-between bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">✅</span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-[10px] text-slate-400">₹{order.totalAmount}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-green-600">+₹30</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}