'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Order } from '@smart-bazar/shared/types/firestore';

export default function DeliveryEarningsPage() {
  const { userData } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
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

  const deliveredOrders = orders.filter(o => o.status === 'completed').sort((a, b) => {
    const timeA = new Date(a.deliveredAt || a.updatedAt || 0).getTime();
    const timeB = new Date(b.deliveredAt || b.updatedAt || 0).getTime();
    return timeB - timeA;
  });

  const now = new Date();
  
  const todayEarnings = deliveredOrders.filter(o => {
    const d = new Date(o.deliveredAt || o.updatedAt || 0);
    return d.toDateString() === now.toDateString();
  }).length * 30;

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).setHours(0,0,0,0);
  };
  
  const startOfWeek = getStartOfWeek(now);
  
  const weekEarnings = deliveredOrders.filter(o => {
    const d = new Date(o.deliveredAt || o.updatedAt || 0).getTime();
    return d >= startOfWeek;
  }).length * 30;

  const totalEarnings = deliveredOrders.length * 30;

  return (
    <div className="w-full max-w-7xl mx-auto py-6 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Your Earnings</h1>
        <p className="text-sm text-slate-500">Track your payouts and delivery history</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20 text-6xl">💰</div>
          <p className="text-green-100 font-bold mb-1">Today</p>
          <h2 className="text-4xl font-black">₹{todayEarnings}</h2>
        </div>
        
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <p className="text-slate-400 font-bold mb-1">This Week</p>
          <h2 className="text-3xl font-black text-slate-800">₹{weekEarnings}</h2>
        </div>
        
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <p className="text-slate-400 font-bold mb-1">Total All Time</p>
          <h2 className="text-3xl font-black text-slate-800">₹{totalEarnings}</h2>
        </div>
      </div>

      <h2 className="text-lg font-bold text-slate-900 mb-4">Payout History</h2>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-slate-100 rounded" />
                  <div className="h-3 w-48 bg-slate-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : deliveredOrders.length === 0 ? (
        <div className="flex flex-col items-center py-20 bg-white rounded-3xl border border-slate-100">
          <p className="text-5xl mb-4">💳</p>
          <p className="font-bold text-slate-400 text-lg">No earnings yet</p>
          <p className="text-sm text-slate-400 mt-1">Complete deliveries to start earning!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveredOrders.map(order => (
            <div key={order.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-green-200 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center text-xl">
                  ✓
                </div>
                <div>
                  <p className="font-bold text-slate-900 mb-0.5">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-slate-500">
                    {mounted ? new Date(order.deliveredAt || order.updatedAt || '').toLocaleString('en-IN', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-green-600">+₹30</p>
                <p className="text-[10px] uppercase font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full inline-block mt-1">Paid</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
