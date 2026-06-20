'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { Order, UserData, OrderStatus } from '@smart-bazar/shared/types/firestore';
import { ORDER_STATUSES } from '@smart-bazar/shared/lib/constants';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import Skeleton from '@smart-bazar/shared/components/ui/Skeleton';

// ─── Greeting helper ─────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Time-since helper ────────────────────────────────────────────────────────
function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Status config map (mirrors constants, kept local for safety) ─────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:   { label: 'Unassigned',        color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
  manager:   { label: 'Assigned to Mgr',   color: '#1e40af', bg: '#dbeafe', dot: '#3b82f6' },
  store:     { label: 'Assigned to Store', color: '#5b21b6', bg: '#ede9fe', dot: '#8b5cf6' },
  packed:    { label: 'Being Packed',      color: '#155e75', bg: '#cffafe', dot: '#06b6d4' },
  delivery:  { label: 'Out for Delivery',  color: '#9a3412', bg: '#ffedd5', dot: '#f97316' },
  completed: { label: 'Delivered',         color: '#14532d', bg: '#dcfce7', dot: '#22c55e' },
  cancelled: { label: 'Cancelled',         color: '#7f1d1d', bg: '#fee2e2', dot: '#ef4444' },
};

// ─── DeliveryStatusBadge ──────────────────────────────────────────────────────
function DeliveryStatusBadge({ status }: { status?: string }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
        Online
      </span>
    );
  }
  if (status === 'inactive') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
        Offline
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
      Idle
    </span>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon, color,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-white/60 shadow-sm flex flex-col gap-3 hover:shadow-md transition-all duration-200 overflow-hidden group">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top right, ${color}08 0%, transparent 70%)` }} />
      <div className="flex items-center justify-between relative z-10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ backgroundColor: `${color}18` }}
        >
          {icon}
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${color}14`, color }}
        >
          LIVE
        </span>
      </div>
      <div className="relative z-10">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <h3 className="text-3xl font-black text-slate-900 leading-none tabular-nums">{value}</h3>
      </div>
      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 relative z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
        {sub}
      </p>
    </div>
  );
}

// ─── OrderStatusPill ──────────────────────────────────────────────────────────
function OrderStatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: '#475569', bg: '#f1f5f9', dot: '#94a3b8' };
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ─── OrderQueueCard ───────────────────────────────────────────────────────────
function OrderQueueCard({
  order,
  deliveryBoys,
  onAssignDelivery,
}: {
  order: Order;
  deliveryBoys: UserData[];
  onAssignDelivery: (order: Order) => void;
}) {
  const itemSummary = order.items.slice(0, 2).map(i => `${i.name} ×${i.quantity}`).join(', ') +
    (order.items.length > 2 ? ` +${order.items.length - 2} more` : '');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 p-4 flex flex-col gap-3 group">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-sm flex-shrink-0">
            🛍️
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-900 font-mono">
              #{order.id.slice(-8).toUpperCase()}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{timeSince(order.createdAt)}</p>
          </div>
        </div>
        <OrderStatusPill status={order.status} />
      </div>

      {/* Customer + Items */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-slate-800 truncate">
          👤 {order.customerName || 'Unknown Customer'}
        </p>
        <p className="text-[11px] text-slate-500 truncate">📦 {itemSummary}</p>
        {order.deliverySlot && (
          <p className="text-[10px] font-bold text-emerald-600">⏱ Slot: {order.deliverySlot}</p>
        )}
      </div>

      {/* Footer: Amount + Action */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-50">
        <span className="text-sm font-black text-slate-900">₹{order.totalAmount.toLocaleString('en-IN')}</span>
        {order.status === 'packed' && (
          <button
            onClick={() => onAssignDelivery(order)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all hover:opacity-90 active:scale-95 press-effect"
            style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
          >
            🛵 Assign Delivery
          </button>
        )}
        {order.status === 'pending' && (
          <Link
            href="/dashboard/manager/orders"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all active:scale-95 border border-amber-100"
          >
            ⚡ Approve
          </Link>
        )}
        {['store', 'manager'].includes(order.status) && (
          <span className="text-[10px] text-slate-400 italic">In progress…</span>
        )}
        {order.status === 'delivery' && (
          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
            🛵 On the way
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Assign Delivery Modal ────────────────────────────────────────────────────
function AssignDeliveryModal({
  order,
  deliveryBoys,
  onClose,
  onAssigned,
}: {
  order: Order;
  deliveryBoys: UserData[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { addToast } = useToast();
  const [selectedId, setSelectedId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  const availableBoys = useMemo(
    () => deliveryBoys.filter(d => d.status === 'active' || d.status === undefined),
    [deliveryBoys]
  );

  const handleAssign = useCallback(async () => {
    if (!selectedId) return;
    setAssigning(true);
    try {
      await orderService.assignDelivery(order.id, selectedId);
      addToast('Delivery partner assigned! ✅', 'success');
      onAssigned();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Assignment failed';
      addToast(msg, 'error');
    } finally {
      setAssigning(false);
    }
  }, [selectedId, order.id, addToast, onAssigned]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-scaleIn">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-black text-slate-900">Assign Delivery Partner</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Order <span className="font-mono font-bold">#{order.id.slice(-8).toUpperCase()}</span>
              &nbsp;·&nbsp;₹{order.totalAmount.toLocaleString('en-IN')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors text-xs"
          >
            ✕
          </button>
        </div>

        {/* Order summary */}
        <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Items</p>
          <p className="text-xs text-slate-700">
            {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
          </p>
          {order.deliveryAddress && (
            <p className="text-[10px] text-slate-500 mt-1">
              📍 {[order.deliveryAddress.street, order.deliveryAddress.city].filter(Boolean).join(', ')}
            </p>
          )}
        </div>

        {/* Delivery boys list */}
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Available Partners ({availableBoys.length})
        </p>
        <div className="space-y-2 max-h-52 overflow-y-auto mb-5 pr-1">
          {availableBoys.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-2xl mb-2">😴</p>
              <p className="text-sm font-semibold text-slate-500">No online delivery partners</p>
              <p className="text-xs text-slate-400 mt-1">Ask your team to come online</p>
            </div>
          ) : (
            availableBoys.map(boy => (
              <button
                key={boy.id}
                onClick={() => setSelectedId(boy.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                  selectedId === boy.id
                    ? 'border-cyan-500 bg-cyan-50/60 shadow-sm'
                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center text-sm font-black text-cyan-700 flex-shrink-0">
                  {boy.name[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{boy.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{boy.phone || boy.email}</p>
                </div>
                <DeliveryStatusBadge status={boy.status} />
                {selectedId === boy.id && (
                  <span className="text-cyan-600 text-sm font-black flex-shrink-0">✓</span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedId || assigning || availableBoys.length === 0}
            className="flex-1 py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90 active:scale-95 press-effect"
            style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
          >
            {assigning ? 'Assigning…' : '🛵 Assign Delivery'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const { userData } = useAuthStore();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<UserData[]>([]);
  const [stores, setStores] = useState<UserData[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assignModalOrder, setAssignModalOrder] = useState<Order | null>(null);

  // Queue filter: which status to display in the live queue
  const [queueFilter, setQueueFilter] = useState<'all' | OrderStatus>('all');

  useEffect(() => { setMounted(true); }, []);

  // ── Real-time subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    if (!userData) return;

    let ordersOk = false;
    let deliveryOk = false;
    let storesOk = false;

    const tryDone = () => {
      if (ordersOk && deliveryOk && storesOk) setLoading(false);
    };

    const unsubOrders = orderService.subscribeToAllOrders((all) => {
      const cats = userData.assignedCategories;
      const filtered = cats && cats.length > 0
        ? all.filter(o => !o.category || cats.includes(o.category as string))
        : all;
      // Client-side sort — avoids composite index errors
      setOrders([...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      ordersOk = true;
      tryDone();
    });

    const unsubDelivery = userService.subscribeToUsersByRole('delivery', (users) => {
      setDeliveryBoys(users);
      deliveryOk = true;
      tryDone();
    });

    const unsubStores = userService.subscribeToUsersByRole('store', (users) => {
      setStores(users);
      storesOk = true;
      tryDone();
    });

    return () => {
      unsubOrders();
      unsubDelivery();
      unsubStores();
    };
  }, [userData]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const today = useMemo(() => new Date().toDateString(), []);

  const stats = useMemo(() => {
    const activeOrderStatuses: OrderStatus[] = ['pending', 'manager', 'store', 'packed', 'delivery'];

    // Active stores: those that have at least one order in store/packed status
    const vendorIdsWithOrders = new Set(
      orders
        .filter(o => ['store', 'packed'].includes(o.status) && o.assignedVendorId)
        .map(o => o.assignedVendorId!)
    );

    // Active delivery boys: those currently delivering
    const deliveringBoyIds = new Set(
      orders
        .filter(o => o.status === 'delivery' && o.assignedDeliveryBoyId)
        .map(o => o.assignedDeliveryBoyId!)
    );

    // Today's completed
    const todayCompleted = orders.filter(
      o => o.status === 'completed' && new Date(o.createdAt).toDateString() === today
    );

    // Average delivery time (minutes) for orders that have both createdAt and deliveredAt
    const deliveredWithTimes = orders.filter(o => o.status === 'completed' && o.deliveredAt);
    const avgDeliveryMins = deliveredWithTimes.length > 0
      ? Math.round(
          deliveredWithTimes.reduce((sum, o) => {
            const created = new Date(o.createdAt).getTime();
            const delivered = new Date(o.deliveredAt!).getTime();
            return sum + (delivered - created) / 60000;
          }, 0) / deliveredWithTimes.length
        )
      : 0;

    return {
      liveQueueCount: orders.filter(o => activeOrderStatuses.includes(o.status)).length,
      activeStores: vendorIdsWithOrders.size,
      activeDelivery: deliveringBoyIds.size,
      todayCompleted: todayCompleted.length,
      avgDeliveryMins,
      packedOrders: orders.filter(o => o.status === 'packed').length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      onlineDelivery: deliveryBoys.filter(d => d.status === 'active').length,
    };
  }, [orders, deliveryBoys, today]);

  // ── Live queue (active, non-terminal orders) ──────────────────────────────
  const liveQueue = useMemo(() => {
    const active = orders.filter(o =>
      !['completed', 'cancelled'].includes(o.status)
    );
    if (queueFilter === 'all') return active;
    return active.filter(o => o.status === queueFilter);
  }, [orders, queueFilter]);

  // Quick-assign toast handler (for non-packed orders redirected to orders page)
  const handleAssignDeliveryOpened = useCallback((order: Order) => {
    if (order.status !== 'packed') {
      addToast('Only packed orders can be assigned to delivery.', 'warning');
      return;
    }
    setAssignModalOrder(order);
  }, [addToast]);

  if (!mounted) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fadeIn pb-8">

      {/* ══════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xl">👋</span>
            <p className="text-sm text-slate-500 font-medium">{getGreeting()},</p>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {userData?.name?.split(' ')[0] || 'Manager'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Here&apos;s what&apos;s happening with your operations right now.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/dashboard/manager/orders"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 press-effect shadow-sm"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            📋 Manage Orders
          </Link>
          <Link
            href="/dashboard/manager/team/delivery"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all active:scale-95"
          >
            🛵 Delivery Team
          </Link>
          <Link
            href="/dashboard/manager/applications"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all active:scale-95"
          >
            📥 Applications
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          LIVE MONITORING CARDS (4 KPIs)
      ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`stat-sk-${i}`} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <Skeleton width="40px" height="40px" className="rounded-xl" />
                <Skeleton width="40px" height="16px" className="rounded-full" />
              </div>
              <div className="space-y-1.5 mt-2">
                <Skeleton width="60%" height="11px" className="rounded" />
                <Skeleton width="40%" height="28px" className="rounded" />
              </div>
              <Skeleton width="75%" height="11px" className="rounded mt-1" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Active Stores"
              value={stats.activeStores}
              sub="Stores with open orders"
              icon="🏪"
              color="#10b981"
            />
            <StatCard
              label="Active Delivery"
              value={stats.activeDelivery}
              sub="Currently delivering"
              icon="🛵"
              color="#f97316"
            />
            <StatCard
              label="Completed Today"
              value={stats.todayCompleted}
              sub="Orders delivered today"
              icon="✅"
              color="#8b5cf6"
            />
            <StatCard
              label="Avg Delivery Time"
              value={stats.avgDeliveryMins > 0 ? `${stats.avgDeliveryMins}m` : '—'}
              sub={stats.avgDeliveryMins > 0 ? 'Per order end-to-end' : 'No data yet'}
              icon="⏱️"
              color="#06b6d4"
            />
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          MAIN GRID: Queue (left) + Assignment + Team (right)
      ══════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* ── LEFT: Live Order Queue (spans 2 cols) ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Queue header + filter tabs */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-sm">📡</div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Live Order Queue</h2>
                  <p className="text-[10px] text-slate-400">
                    {loading ? '—' : `${liveQueue.length} active order${liveQueue.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/manager/orders"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                View all →
              </Link>
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-2 px-5 py-3 border-b border-slate-50 overflow-x-auto hide-scrollbar">
              {(
                [
                  { key: 'all',      label: 'All Active', count: stats.liveQueueCount },
                  { key: 'pending',  label: '⏳ Pending',  count: stats.pendingOrders },
                  { key: 'store',    label: '🏪 At Store', count: orders.filter(o => o.status === 'store').length },
                  { key: 'packed',   label: '📦 Packed',   count: stats.packedOrders },
                  { key: 'delivery', label: '🛵 Delivery', count: orders.filter(o => o.status === 'delivery').length },
                ] as const
              ).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setQueueFilter(tab.key as typeof queueFilter)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                    queueFilter === tab.key
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`min-w-[18px] h-4 px-1 rounded-full text-[10px] flex items-center justify-center font-black ${
                      queueFilter === tab.key ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Queue list */}
            <div className="p-4">
              {loading ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`qsk-${i}`} className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-3 border border-slate-100">
                      <div className="flex justify-between">
                        <div className="flex gap-2 items-center">
                          <Skeleton width="32px" height="32px" className="rounded-xl flex-shrink-0" />
                          <div className="space-y-1.5">
                            <Skeleton width="80px" height="12px" className="rounded" />
                            <Skeleton width="50px" height="10px" className="rounded" />
                          </div>
                        </div>
                        <Skeleton width="70px" height="20px" className="rounded-full" />
                      </div>
                      <Skeleton width="100%" height="10px" className="rounded" />
                      <Skeleton width="70%" height="10px" className="rounded" />
                      <div className="flex justify-between pt-1 border-t border-slate-100">
                        <Skeleton width="50px" height="14px" className="rounded" />
                        <Skeleton width="90px" height="28px" className="rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : liveQueue.length === 0 ? (
                <div className="py-14 flex flex-col items-center gap-3 text-slate-400">
                  <span className="text-4xl">✅</span>
                  <p className="text-sm font-semibold text-slate-500">
                    {queueFilter === 'all' ? 'No active orders right now' : `No orders with status "${queueFilter}"`}
                  </p>
                  <p className="text-xs text-slate-400">All caught up! Orders will appear here in real-time.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {liveQueue.map(order => (
                    <OrderQueueCard
                      key={order.id}
                      order={order}
                      deliveryBoys={deliveryBoys}
                      onAssignDelivery={handleAssignDeliveryOpened}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Delivery Assignment + Operations ── */}
        <div className="flex flex-col gap-4">

          {/* Delivery Assignment Widget */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-sm">📦</div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Delivery Assignment</h3>
                <p className="text-[10px] text-slate-400">Packed orders awaiting dispatch</p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {loading ? (
                <>
                  <Skeleton width="100%" height="72px" className="rounded-xl" />
                  <Skeleton width="100%" height="72px" className="rounded-xl" />
                </>
              ) : (
                <>
                  {/* Packed orders ready to assign */}
                  {orders.filter(o => o.status === 'packed').length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-2xl mb-1.5">😌</p>
                      <p className="text-xs font-semibold text-slate-500">No packed orders</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Packed orders will appear here ready for dispatch
                      </p>
                    </div>
                  ) : (
                    orders
                      .filter(o => o.status === 'packed')
                      .slice(0, 4)
                      .map(order => {
                        const onlineBoys = deliveryBoys.filter(d => d.status === 'active');
                        return (
                          <div
                            key={order.id}
                            className="flex items-center justify-between gap-2 p-3 rounded-xl bg-cyan-50/60 border border-cyan-100"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 font-mono">
                                #{order.id.slice(-6).toUpperCase()}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate max-w-[120px]">
                                {order.customerName || 'Customer'} · ₹{order.totalAmount}
                              </p>
                            </div>
                            <button
                              onClick={() => setAssignModalOrder(order)}
                              disabled={onlineBoys.length === 0}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all hover:opacity-90 active:scale-95 press-effect disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
                              title={onlineBoys.length === 0 ? 'No online delivery partners' : 'Assign to delivery'}
                            >
                              🛵 Assign
                            </button>
                          </div>
                        );
                      })
                  )}

                  {orders.filter(o => o.status === 'packed').length > 4 && (
                    <Link
                      href="/dashboard/manager/orders"
                      className="block text-center text-xs font-bold text-cyan-600 hover:text-cyan-700 py-2 transition-colors"
                    >
                      +{orders.filter(o => o.status === 'packed').length - 4} more packed orders →
                    </Link>
                  )}

                  {/* Available delivery boys summary */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Online Partners</p>
                      <span className="text-[10px] font-bold text-emerald-600">
                        {stats.onlineDelivery}/{deliveryBoys.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {deliveryBoys.filter(d => d.status === 'active').slice(0, 6).map(boy => (
                        <div
                          key={boy.id}
                          className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg"
                          title={boy.name}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                          <span className="text-[10px] font-bold text-emerald-700 max-w-[60px] truncate">{boy.name.split(' ')[0]}</span>
                        </div>
                      ))}
                      {stats.onlineDelivery === 0 && (
                        <p className="text-[10px] text-slate-400 italic">No one online</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Operations Hub */}
          <div className="bg-slate-900 rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 pointer-events-none" style={{ background: '#10b981' }} />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-5 pointer-events-none" style={{ background: '#10b981' }} />
            <div className="relative z-10">
              <div className="text-2xl mb-2">🚀</div>
              <h3 className="text-sm font-bold mb-1">Operations Hub</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Assign orders to stores and delivery partners instantly.
              </p>
              <div className="space-y-2">
                <Link
                  href="/dashboard/manager/orders"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-bold text-slate-900 transition-all hover:opacity-90 active:scale-95 press-effect"
                  style={{ background: '#10b981' }}
                >
                  📋 Manage Live Orders →
                </Link>
                <Link
                  href="/dashboard/manager/applications"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all active:scale-95"
                >
                  📥 Review Applications
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Nav */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Access</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Orders',      href: '/dashboard/manager/orders',        icon: '📋', color: '#10b981' },
                { label: 'Categories',  href: '/dashboard/manager/categories',     icon: '🗂️', color: '#3b82f6' },
                { label: 'Stores',      href: '/dashboard/manager/team/stores',    icon: '🏪', color: '#f59e0b' },
                { label: 'Pre-Orders',  href: '/dashboard/manager/preorders',      icon: '⭐', color: '#8b5cf6' },
              ].map(link => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 hover:border-slate-200"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ backgroundColor: `${link.color}18` }}
                  >
                    {link.icon}
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          TEAM STATUS TABLE
      ══════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-sm">👥</div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Delivery Team Status</h2>
              <p className="text-[10px] text-slate-400">
                {loading ? '—' : `${deliveryBoys.length} total · ${stats.onlineDelivery} online · ${stats.activeDelivery} delivering`}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/manager/team/delivery"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Manage Team →
          </Link>
        </div>

        {/* Table */}
        {loading ? (
          <div className="divide-y divide-slate-50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`tsk-${i}`} className="flex items-center gap-4 px-5 py-3.5">
                <Skeleton width="36px" height="36px" className="rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton width="120px" height="12px" className="rounded" />
                  <Skeleton width="80px" height="10px" className="rounded" />
                </div>
                <Skeleton width="60px" height="20px" className="rounded-full" />
                <Skeleton width="80px" height="20px" className="rounded-full" />
              </div>
            ))}
          </div>
        ) : deliveryBoys.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2 text-slate-400">
            <span className="text-3xl">🛵</span>
            <p className="text-sm font-semibold text-slate-500">No delivery partners yet</p>
            <p className="text-xs text-slate-400">Approve delivery applications to build your team.</p>
            <Link
              href="/dashboard/manager/applications"
              className="mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 underline transition-colors"
            >
              Review Applications →
            </Link>
          </div>
        ) : (
          <div className="glass-table-container" style={{ borderRadius: 0, border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th className="text-left">Partner</th>
                  <th className="text-left">Contact</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Delivering</th>
                  <th className="text-left">All-time</th>
                </tr>
              </thead>
              <tbody>
                {deliveryBoys
                  .sort((a, b) => {
                    // Sort: active first, then by name
                    const scoreA = a.status === 'active' ? 0 : 1;
                    const scoreB = b.status === 'active' ? 0 : 1;
                    return scoreA - scoreB || a.name.localeCompare(b.name);
                  })
                  .map(boy => {
                    const currentOrders = orders.filter(
                      o => o.status === 'delivery' && o.assignedDeliveryBoyId === boy.id
                    );
                    const completedAll = orders.filter(
                      o => o.status === 'completed' && o.assignedDeliveryBoyId === boy.id
                    ).length;

                    return (
                      <tr key={boy.id} className="group">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-black text-slate-600 flex-shrink-0">
                              {boy.name[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{boy.name}</p>
                              <p className="text-[10px] text-slate-400">Delivery Partner</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p className="text-xs text-slate-600">{boy.phone || '—'}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{boy.email}</p>
                        </td>
                        <td>
                          <DeliveryStatusBadge status={boy.status} />
                        </td>
                        <td>
                          {currentOrders.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                              🛵 {currentOrders.length} order{currentOrders.length > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">—</span>
                          )}
                        </td>
                        <td>
                          <span className="text-xs font-bold text-slate-700 tabular-nums">
                            {completedAll} delivered
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Store team summary at the bottom */}
        {stores.length > 0 && (
          <div className="px-5 py-3.5 border-t border-slate-50 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">🏪</span>
                <p className="text-xs font-bold text-slate-700">
                  {stores.length} Store Partner{stores.length !== 1 ? 's' : ''} registered
                </p>
                <span className="text-slate-300">·</span>
                <p className="text-xs text-slate-500">
                  {stats.activeStores} currently active
                </p>
              </div>
              <Link
                href="/dashboard/manager/team/stores"
                className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                View Stores →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Delivery Assignment Modal */}
      {assignModalOrder && (
        <AssignDeliveryModal
          order={assignModalOrder}
          deliveryBoys={deliveryBoys}
          onClose={() => setAssignModalOrder(null)}
          onAssigned={() => {
            setAssignModalOrder(null);
          }}
        />
      )}
    </div>
  );
}