'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Order } from '@smart-bazar/shared/types/firestore';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { OrderStatusBadge } from '@smart-bazar/shared/components/ui/Badge';
import Skeleton from '@smart-bazar/shared/components/ui/Skeleton';

type FilterStatus = 'all' | 'pending' | 'manager' | 'store' | 'packed' | 'delivery' | 'completed' | 'cancelled';

function getOrderArea(order: Order): string {
  const addr = order.deliveryAddress;
  if (!addr) return 'Unknown Area';
  return addr.city?.trim() || addr.state?.trim() || 'Unknown Area';
}

export default function ManagerPreOrdersPage() {
  const { userData }  = useAuthStore();
  const { addToast }  = useToast();

  const [allOrders, setAllOrders]   = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [search, setSearch]         = useState('');

  // Preorder time modal
  const [modalOrder, setModalOrder]     = useState<Order | null>(null);
  const [preorderTime, setPreorderTime] = useState('');
  const [saving, setSaving]             = useState(false);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!userData) return;
    const unsub = orderService.subscribeToAllOrders((all) => {
      const cats = userData.assignedCategories;
      const managerOrders = cats && cats.length > 0
        ? all.filter(o => !o.category || cats.includes(o.category as any))
        : all;
      setAllOrders(managerOrders);
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

  const awaitingTimeCount = preOrders.filter(
    o => !o.preorderDeliveryTime && !['completed','cancelled'].includes(o.status)
  ).length;

  const handleSetTime = async () => {
    if (!modalOrder || !preorderTime.trim()) return;
    setSaving(true);
    try {
      await orderService.setPreorderDeliveryTime(modalOrder.id, preorderTime);
      addToast('✅ Delivery time confirmed! Customer will be notified.', 'success');
      setModalOrder(null);
    } catch {
      addToast('Failed to set delivery time', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openModal = (order: Order) => {
    setModalOrder(order);
    setPreorderTime(order.preorderDeliveryTime || '');
  };

  const STATUS_TABS: { key: FilterStatus; label: string; color: string }[] = [
    { key: 'all',       label: 'All',       color: '#6b7280' },
    { key: 'pending',   label: 'Pending',   color: '#f59e0b' },
    { key: 'store',     label: 'At Store',  color: '#8b5cf6' },
    { key: 'packed',    label: 'Packed',    color: '#06b6d4' },
    { key: 'delivery',  label: 'Delivery',  color: '#f97316' },
    { key: 'completed', label: 'Completed', color: '#22c55e' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto animate-fadeIn">

      <div className="mb-8 p-7 rounded-3xl text-white shadow-xl overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #d97706 50%, #022c22 100%)' }}>
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-400/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute right-8 top-6 text-5xl opacity-20 select-none">⭐</div>

        {/* Urgent attention chip */}
        {awaitingTimeCount > 0 && (
          <div className="absolute top-5 right-5 flex items-center gap-2 bg-red-500/30 border border-red-400/40 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-red-200">{awaitingTimeCount} need time confirmation</span>
          </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 pr-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-amber-500/30 border border-amber-400/40 rounded-xl flex items-center justify-center text-xl">⭐</div>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">Special Orders</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1">Pre-Orders</h1>
            <p className="text-amber-200/70 text-sm">
              Confirm delivery time once out-of-stock items become available.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl px-5 py-3 text-center">
              <p className="text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-0.5">Total</p>
              <p className="text-2xl font-black text-white leading-none">{preOrders.length}</p>
            </div>
            <div className={`border rounded-2xl px-5 py-3 text-center ${awaitingTimeCount > 0 ? 'bg-red-500/20 border-red-400/30' : 'bg-white/10 border-white/15'}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-red-200">Need Action</p>
              <p className={`text-2xl font-black leading-none ${awaitingTimeCount > 0 ? 'text-red-300' : 'text-white'}`}>{awaitingTimeCount}</p>
            </div>
            <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-2xl px-5 py-3 text-center">
              <p className="text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-0.5">Time Set</p>
              <p className="text-2xl font-black text-emerald-300 leading-none">
                {preOrders.filter(o => !!o.preorderDeliveryTime).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
                  statusFilter === tab.key ? 'bg-white/30' : 'bg-amber-100 text-amber-700'
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
            {preOrders.length === 0 ? 'Pre-orders will appear here automatically.' : 'Try a different filter.'}
          </p>
        </div>
      ) : null}

      {/* ── Pre-Order Cards ── */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(order => {
            const hasTime = !!order.preorderDeliveryTime;
            const needsAction = !hasTime && !['completed','cancelled'].includes(order.status);

            return (
              <div
                key={order.id}
                className={`relative bg-white rounded-3xl p-6 border shadow-sm hover:shadow-lg transition-all group overflow-hidden
                  ${needsAction ? 'border-red-200 hover:border-orange-400' : 'border-slate-200 hover:border-slate-300'}
                `}
              >
                {/* Urgent glow */}
                {needsAction && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-t-3xl" />
                )}
                <div className="absolute top-0 right-0 w-28 h-28 blur-[50px] rounded-bl-full pointer-events-none bg-amber-400/10 group-hover:bg-amber-400/20 transition-colors" />

                {/* Status badge top-right */}
                <div className="absolute top-5 right-5 flex flex-col items-end gap-1.5">
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                    ⭐ PRE-ORDER
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Order ID */}
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg font-mono block w-fit mb-3">
                  #{order.id.slice(0, 8).toUpperCase()}
                </span>

                {/* Customer */}
                {order.customerName && (
                  <p className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] shrink-0">👤</span>
                    {order.customerName}
                  </p>
                )}
                <p className="text-xs text-slate-400 font-medium mb-3 flex items-center gap-1">
                  <span>📍</span>
                  {getOrderArea(order)}
                  {order.deliverySlot && <span className="ml-1 font-bold text-emerald-600">· ⏱ {order.deliverySlot}</span>}
                </p>

                {/* Items */}
                <div className="space-y-1 mb-4">
                  {order.items.slice(0, 2).map((item, idx) => (
                    <p key={idx} className="text-xs flex justify-between text-slate-700 font-medium">
                      <span className="truncate pr-4">{item.name}</span>
                      <span className="text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded shrink-0">×{item.quantity}</span>
                    </p>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-[10px] text-amber-600 font-bold bg-amber-50 w-fit px-2 py-0.5 rounded-md">
                      +{order.items.length - 2} more items
                    </p>
                  )}
                </div>

                {/* Delivery time status box */}
                <div className={`rounded-2xl p-3 mb-4 ${
                  hasTime
                    ? 'bg-emerald-50 border border-emerald-100'
                    : needsAction
                    ? 'bg-red-50 border border-red-200 border-dashed'
                    : 'bg-slate-50 border border-slate-100'
                }`}>
                  {hasTime ? (
                    <>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">✅ Delivery Time</p>
                      <p className="text-sm font-black text-emerald-700">{order.preorderDeliveryTime}</p>
                    </>
                  ) : needsAction ? (
                    <>
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">⚠️ Action Required</p>
                      <p className="text-xs text-red-500 font-medium">Confirm delivery time for this pre-order</p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">No delivery time set</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <span className="text-xl font-black text-slate-900">₹{order.totalAmount}</span>

                  {/* Action button */}
                  {!['completed','cancelled'].includes(order.status) && (
                    <button
                      onClick={() => openModal(order)}
                      className={`text-xs font-bold px-4 py-2 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                        hasTime
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'text-white shadow-md'
                      }`}
                      style={!hasTime ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)' } : {}}
                    >
                      {hasTime ? '✏️ Edit Time' : '🕒 Set Time'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Set Delivery Time Modal ── */}
      {modalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOrder(null)} />
          <div className="relative bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-xl">⭐</div>
              <div>
                <h2 className="text-base font-black text-slate-900">Set Delivery Time</h2>
                <p className="text-xs text-slate-500">Pre-Order #{modalOrder.id.slice(0,8).toUpperCase()}</p>
              </div>
            </div>

            {/* Order summary */}
            <div className="bg-slate-50 rounded-2xl p-4 mb-5 text-sm space-y-2">
              {modalOrder.customerName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer</span>
                  <span className="font-bold text-slate-900">{modalOrder.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Area</span>
                <span className="font-bold text-slate-900">{getOrderArea(modalOrder)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-bold text-slate-900">₹{modalOrder.totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Items</span>
                <span className="font-bold text-slate-900">{modalOrder.items.length}</span>
              </div>
            </div>

            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Delivery Time / Date
            </label>
            <input
              type="text"
              value={preorderTime}
              onChange={e => setPreorderTime(e.target.value)}
              placeholder="e.g., Tomorrow by 5 PM, 22 Apr 6–7pm..."
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium mb-2 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all"
              autoFocus
            />
            <p className="text-xs text-slate-400 mb-6">This will be shown to the customer in their order tracking.</p>

            <div className="flex gap-3">
              <button
                onClick={() => setModalOrder(null)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSetTime}
                disabled={!preorderTime.trim() || saving}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                {saving ? '⏳ Saving...' : '✅ Confirm Time'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
