'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Layout handled by parent
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Order } from '@smart-bazar/shared/types/firestore';
import { ORDER_STATUSES } from '@smart-bazar/shared/lib/constants';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import SwipeSlider from '@smart-bazar/shared/components/ui/SwipeSlider';

export default function DeliveryOrdersPage() {
  const { userData } = useAuthStore();
  const { addToast } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'delivery' | 'completed' | 'all'>('delivery');
  const [transitioningOrderId, setTransitioningOrderId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!userData) return;
    const unsub = orderService.subscribeToOrdersByDelivery(userData.id, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, [userData]);

  const filteredOrders = orders.filter(o => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

  const handleMarkDelivered = async (orderId: string) => {
    setProcessing(orderId);
    try {
      // Delay for slider completion checkmark animation
      await new Promise(resolve => setTimeout(resolve, 800));
      // Set transition state to trigger card fade/shrink
      setTransitioningOrderId(orderId);
      // Wait for card fade/shrink animation to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      await orderService.markDelivered(orderId);
      addToast('Delivered! ₹30 earned 🎉', 'success');
    } catch {
      addToast('Update failed', 'error');
    } finally {
      setProcessing(null);
      setTransitioningOrderId(null);
    }
  };

  const tabs: Array<{ key: typeof filter; label: string; color: string }> = [
    { key: 'delivery',  label: 'To Deliver', color: '#f97316' },
    { key: 'completed', label: 'Delivered',   color: '#22c55e' },
    { key: 'all',       label: 'All',         color: '#6b7280' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto py-6">
      <div className="animate-fadeIn">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900">My Orders</h1>
          <p className="text-sm text-slate-500">{orders.length} total assigned orders</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === tab.key ? 'text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
              }`}
              style={filter === tab.key ? { background: tab.color } : {}}>
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                filter === tab.key ? 'bg-white/30' : 'bg-slate-100 text-slate-500'
              }`}>
                {orders.filter(o => tab.key === 'all' ? true : o.status === tab.key).length}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="h-4 w-48 bg-slate-100 rounded mb-3" />
                <div className="h-3 w-32 bg-slate-100 rounded mb-4" />
                <div className="h-10 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center py-16 bg-white rounded-3xl border border-slate-100">
            <p className="text-4xl mb-3">🛵</p>
            <p className="font-bold text-slate-400">No orders in this filter</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => {
              const statusCfg = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES];
              const addr = order.deliveryAddress;
              const isActive = order.status === 'delivery';

              const isTransitioning = transitioningOrderId === order.id;

              return (
                <div key={order.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                    isTransitioning ? 'animate-fadeOutShrink' : 'animate-fadeInUp'
                  } ${isActive ? 'border-orange-200' : 'border-slate-100'}`}
                  style={isActive ? { borderLeft: '4px solid #f97316' } : {}}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {mounted ? new Date(order.createdAt).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          }) : ''}
                        </p>
                        {order.deliverySlot && (
                          <p className="text-[10px] font-bold text-emerald-600 mt-0.5" title="Delivery Slot">
                            ⏱️ {order.deliverySlot}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">₹{order.totalAmount}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: statusCfg?.bg, color: statusCfg?.color }}>
                          {statusCfg?.icon} {statusCfg?.label}
                        </span>
                      </div>
                    </div>

                    {/* Address */}
                    {addr && (
                      <div className="flex items-start gap-2 bg-slate-50 rounded-xl px-3 py-2 mb-3 text-xs">
                        <span className="shrink-0">📍</span>
                        <span className="text-slate-700 font-medium">
                          {addr.street}, {addr.city}{addr.pincode ? ` - ${addr.pincode}` : ''}
                        </span>
                      </div>
                    )}

                    {isActive && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => router.push(
                            `/dashboard/delivery/map?orderId=${order.id}&lat=${addr?.latitude || ''}&lng=${addr?.longitude || ''}`
                          )}
                          className="w-full py-2.5 rounded-xl border-2 border-orange-200 text-orange-600 text-xs font-bold hover:bg-orange-50 transition-all flex items-center justify-center gap-1.5"
                        >
                          🗺️ View Map
                        </button>
                        <SwipeSlider
                          onComplete={() => handleMarkDelivered(order.id)}
                          isLoading={processing === order.id}
                          disabled={processing !== null}
                          text="Swipe to Deliver"
                        />
                      </div>
                    )}

                    {order.status === 'completed' && order.deliveredAt && (
                      <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                        <span className="text-green-600 text-sm">✅</span>
                        <div>
                          <p className="text-[10px] font-bold text-green-700">Delivered</p>
                          <p className="text-[10px] text-green-500">
                            {mounted ? new Date(order.deliveredAt).toLocaleString('en-IN', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                            }) : ''}
                          </p>
                        </div>
                        <span className="ml-auto text-sm font-black text-green-600">+₹30</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
