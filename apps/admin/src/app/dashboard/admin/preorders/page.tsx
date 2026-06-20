'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Order } from '@smart-bazar/shared/types/firestore';
import { OrderStatusBadge } from '@smart-bazar/shared/components/ui/Badge';
import Skeleton from '@smart-bazar/shared/components/ui/Skeleton';

type FilterStatus = 'all' | 'pending' | 'manager' | 'store' | 'packed' | 'delivery' | 'completed' | 'cancelled';

function getOrderArea(order: Order): string {
  const addr = order.deliveryAddress;
  if (!addr) return 'Unknown Area';
  return addr.city?.trim() || addr.state?.trim() || 'Unknown Area';
}

export default function AdminPreOrdersPage() {
  const { userData } = useAuthStore();
  const [allOrders, setAllOrders]     = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [search, setSearch]           = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!userData || (userData.role !== 'admin' && userData.role !== 'co-admin')) return;
    const unsub = orderService.subscribeToAllOrders((data) => {
      setAllOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, [userData]);

  const preOrders = useMemo(() =>
    allOrders.filter(o => o.isPreorder === true),
  [allOrders]);

  const filtered = useMemo(() => {
    return preOrders
      .filter(o => statusFilter === 'all' || o.status === statusFilter)
      .filter(o => {
        if (!search) return true;
        const q = search.toLowerCase();
        return o.id.toLowerCase().includes(q) ||
          (o.customerName || '').toLowerCase().includes(q) ||
          getOrderArea(o).toLowerCase().includes(q);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [preOrders, statusFilter, search]);

  // Status pill counts
  const counts = useMemo(() => ({
    all:       preOrders.length,
    pending:   preOrders.filter(o => o.status === 'pending').length,
    manager:   preOrders.filter(o => o.status === 'manager').length,
    store:     preOrders.filter(o => o.status === 'store').length,
    packed:    preOrders.filter(o => o.status === 'packed').length,
    delivery:  preOrders.filter(o => o.status === 'delivery').length,
    completed: preOrders.filter(o => o.status === 'completed').length,
    cancelled: preOrders.filter(o => o.status === 'cancelled').length,
  }), [preOrders]);

  const STATUS_TABS: { key: FilterStatus; label: string; color: string }[] = [
    { key: 'all',       label: 'All',        color: '#6b7280' },
    { key: 'pending',   label: 'Pending',    color: '#f59e0b' },
    { key: 'manager',   label: 'Manager',    color: '#3b82f6' },
    { key: 'store',     label: 'At Store',   color: '#8b5cf6' },
    { key: 'packed',    label: 'Packed',     color: '#06b6d4' },
    { key: 'delivery',  label: 'Delivery',   color: '#f97316' },
    { key: 'completed', label: 'Completed',  color: '#22c55e' },
    { key: 'cancelled', label: 'Cancelled',  color: '#ef4444' },
  ];

  return (
    <div className="animate-fadeIn max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-8 p-8 rounded-3xl text-white shadow-xl overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1c1917 0%, #78350f 50%, #1c1917 100%)' }}>
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-orange-400/10 blur-[80px] rounded-full pointer-events-none" />

        {/* Star icons deco */}
        <div className="absolute right-8 top-6 text-5xl opacity-20 select-none">⭐</div>
        <div className="absolute right-24 bottom-4 text-2xl opacity-10 select-none">⭐</div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-500/30 border border-amber-400/40 rounded-2xl flex items-center justify-center text-2xl">⭐</div>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">Special Orders</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-1">Pre-Order Management</h1>
            <p className="text-amber-200/70 text-sm font-medium">
              Items placed for out-of-stock products — set delivery time once stock arrives.
            </p>
          </div>

          {/* KPI chips */}
          <div className="flex gap-3 flex-wrap">
            <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl px-5 py-4 text-center">
              <p className="text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1">Total Pre-Orders</p>
              <p className="text-3xl font-black text-white leading-none">{preOrders.length}</p>
            </div>
            <div className="bg-amber-500/20 border border-amber-400/30 rounded-2xl px-5 py-4 text-center">
              <p className="text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-1">Awaiting Time</p>
              <p className="text-3xl font-black text-amber-300 leading-none">
                {preOrders.filter(o => !o.preorderDeliveryTime && !['completed','cancelled'].includes(o.status)).length}
              </p>
            </div>
            <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-2xl px-5 py-4 text-center">
              <p className="text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1">Time Set</p>
              <p className="text-3xl font-black text-emerald-300 leading-none">
                {preOrders.filter(o => !!o.preorderDeliveryTime).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            placeholder="Search order ID, customer, area..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 transition-all shadow-sm"
          />
        </div>
        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.filter(t => counts[t.key] > 0 || t.key === 'all').map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === tab.key ? 'text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
              }`}
              style={statusFilter === tab.key ? { background: tab.color } : {}}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center ${
                  statusFilter === tab.key ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'
                }`}>{counts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Skeletons / Empty ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`pre-skel-${i}`} className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <Skeleton width="100px" height="14px" className="rounded" />
                  <Skeleton width="120px" height="10px" className="rounded" />
                </div>
                <Skeleton width="70px" height="20px" className="rounded-full" />
              </div>
              <div className="space-y-2 border-t border-b border-slate-50 py-3 my-1">
                <div className="flex justify-between"><Skeleton width="60px" height="12px" /> <Skeleton width="30px" height="12px" /></div>
                <div className="flex justify-between"><Skeleton width="100px" height="12px" /> <Skeleton width="40px" height="12px" /></div>
              </div>
              <div className="flex justify-between items-center mt-auto">
                <Skeleton width="80px" height="20px" className="rounded" />
                <Skeleton width="90px" height="32px" className="rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center bg-white border border-slate-200 rounded-3xl border-dashed">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">⭐</div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {preOrders.length === 0 ? 'No Pre-Orders Yet' : 'No matches found'}
          </h3>
          <p className="text-slate-500 font-medium">
            {preOrders.length === 0
              ? 'Pre-orders will appear here when customers order out-of-stock items.'
              : 'Try changing your filter or search query.'}
          </p>
        </div>
      ) : null}

      {/* ── Pre-order cards grid ── */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(order => {
            const hasTime = !!order.preorderDeliveryTime;
            const awaitingTime = !hasTime && !['completed','cancelled'].includes(order.status);

            return (
              <div
                key={order.id}
                className={`relative bg-white rounded-3xl p-6 border shadow-sm hover:shadow-lg transition-all group overflow-hidden cursor-pointer
                  ${awaitingTime ? 'border-amber-200 hover:border-amber-400' : 'border-slate-200 hover:border-slate-300'}
                `}
                onClick={() => setSelectedOrder(order)}
              >
                {/* Glow */}
                <div className={`absolute top-0 right-0 w-28 h-28 blur-[50px] rounded-bl-full pointer-events-none transition-colors
                  ${awaitingTime ? 'bg-amber-400/10 group-hover:bg-amber-400/20' : 'bg-slate-100/80'}
                `} />

                {/* ⭐ badge */}
                <div className="absolute top-4 right-4">
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                    ⭐ PRE-ORDER
                  </span>
                </div>

                {/* Header */}
                <div className="mb-4 relative z-10 pr-28">
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg font-mono block w-fit mb-2">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Customer + area */}
                {order.customerName && (
                  <p className="text-sm font-bold text-slate-800 mb-1 relative z-10 flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] shrink-0">👤</span>
                    {order.customerName}
                  </p>
                )}
                <p className="text-xs text-slate-400 font-medium mb-3 relative z-10 flex items-center gap-1">
                  <span>📍</span>
                  {getOrderArea(order)}
                  {order.deliveryAddress?.pincode ? ` — ${order.deliveryAddress.pincode}` : ''}
                </p>

                {/* Items */}
                <div className="space-y-1 mb-4 relative z-10">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <p key={idx} className="text-xs font-medium flex justify-between text-slate-700">
                      <span className="truncate pr-4">{item.name}</span>
                      <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded font-bold shrink-0">×{item.quantity}</span>
                    </p>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-[10px] text-amber-600 font-bold bg-amber-50 w-fit px-2 py-0.5 rounded-md">
                      +{order.items.length - 2} more items
                    </p>
                  )}
                </div>

                {/* Delivery time box */}
                <div className={`rounded-2xl p-3 mb-4 relative z-10 ${
                  hasTime
                    ? 'bg-emerald-50 border border-emerald-100'
                    : awaitingTime
                    ? 'bg-amber-50 border border-amber-200 border-dashed'
                    : 'bg-slate-50 border border-slate-100'
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1 ${hasTime ? 'text-emerald-600' : 'text-amber-600'}">
                    {hasTime ? '✅ Delivery Time Set' : awaitingTime ? '⏳ Delivery Time Not Set Yet' : '—'}
                  </p>
                  {hasTime && (
                    <p className="text-sm font-black text-emerald-700">{order.preorderDeliveryTime}</p>
                  )}
                  {awaitingTime && (
                    <p className="text-xs text-amber-500 font-medium">Manager needs to confirm delivery time</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-100 relative z-10">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Order Total</p>
                    <span className="text-xl font-black text-slate-900">₹{order.totalAmount}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium text-right">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-white rounded-3xl p-7 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200 mb-2 inline-block">⭐ PRE-ORDER</span>
                <h2 className="text-base font-black text-slate-900">
                  #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </h2>
              </div>
              <button onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Status */}
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Status</span>
                <OrderStatusBadge status={selectedOrder.status} />
              </div>

              {/* Customer */}
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Customer</span>
                <span className="font-bold text-slate-900">{selectedOrder.customerName || '—'}</span>
              </div>

              {/* Phone */}
              {selectedOrder.customerPhone && (
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Phone</span>
                  <span className="font-bold text-slate-900">{selectedOrder.customerPhone}</span>
                </div>
              )}

              {/* Delivery Address */}
              <div className="py-3 border-b border-slate-100">
                <p className="text-slate-500 font-medium mb-1">Delivery Address</p>
                <p className="font-medium text-slate-800 leading-relaxed">
                  {[
                    selectedOrder.deliveryAddress?.street,
                    selectedOrder.deliveryAddress?.city,
                    selectedOrder.deliveryAddress?.state,
                    selectedOrder.deliveryAddress?.pincode,
                  ].filter(Boolean).join(', ')}
                </p>
              </div>

              {/* Items */}
              <div className="py-3 border-b border-slate-100">
                <p className="text-slate-500 font-medium mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-slate-800 font-medium">{item.name}</span>
                      <span className="text-slate-500">×{item.quantity} · ₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Order Total</span>
                <span className="font-black text-slate-900 text-lg">₹{selectedOrder.totalAmount}</span>
              </div>

              {/* Delivery Time */}
              <div className={`rounded-2xl p-4 ${selectedOrder.preorderDeliveryTime ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-200'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 mb-1">
                  {selectedOrder.preorderDeliveryTime ? '✅ Delivery Time Confirmed' : '⏳ Awaiting Delivery Time'}
                </p>
                {selectedOrder.preorderDeliveryTime ? (
                  <p className="font-black text-emerald-700">{selectedOrder.preorderDeliveryTime}</p>
                ) : (
                  <p className="text-xs text-amber-600">Manager/Admin needs to set the delivery time for this pre-order.</p>
                )}
              </div>

              {/* Order placed on */}
              <p className="text-xs text-slate-400 text-center pt-2">
                Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
