'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Order, OrderStatus } from '@smart-bazar/shared/types/firestore';
import { OrderStatusBadge } from '@smart-bazar/shared/components/ui/Badge';
import Modal from '@smart-bazar/shared/components/ui/Modal';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { ORDER_STATUSES } from '@smart-bazar/shared/lib/constants';

// ─── Types ───────────────────────────────────────────────────────────────────

type ViewMode = 'table' | 'card';
type FilterStatus = 'all' | 'pending' | 'active' | 'completed' | 'cancelled';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isActiveStatus(status: OrderStatus): boolean {
  return ['manager', 'store', 'packed', 'delivery'].includes(status);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function OrderDetailPanel({
  order,
  onClose,
  onCancel,
}: {
  order: Order;
  onClose: () => void;
  onCancel: (order: Order) => void;
}) {
  const canCancel = !['completed', 'cancelled'].includes(order.status);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-border pb-4">
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Order ID</p>
          <p className="text-sm font-extrabold text-foreground font-mono uppercase">
            #{order.id}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Placed: {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <OrderStatusBadge status={order.status} />
          {order.isPreorder && (
            <span className="text-[9px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full uppercase">
              ★ Pre-Order
            </span>
          )}
        </div>
      </div>

      {/* Customer + Address */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-muted/30 rounded-2xl p-4 border border-border">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">👤 Customer</p>
          <p className="text-sm font-bold text-foreground">{order.customerName || '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">📞 {order.customerPhone || '—'}</p>
        </div>
        <div className="bg-muted/30 rounded-2xl p-4 border border-border">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">📍 Delivery Address</p>
          <p className="text-xs font-bold text-foreground">
            {order.deliveryAddress?.customerName || order.customerName}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-snug">
            {order.deliveryAddress
              ? [
                  order.deliveryAddress.street,
                  order.deliveryAddress.city,
                  order.deliveryAddress.pincode,
                ]
                  .filter(Boolean)
                  .join(', ')
              : '—'}
          </p>
          {order.deliverySlot && (
            <p className="text-[10px] font-bold text-emerald-400 mt-2">⏱ Slot: {order.deliverySlot}</p>
          )}
        </div>
      </div>

      {/* Payment */}
      <div className="bg-muted/30 rounded-2xl p-4 border border-border space-y-2">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-3">💰 Payment</p>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Method:</span>
          <span className="font-bold text-foreground uppercase">
            {order.paymentMethod === 'upi' ? '📱 UPI / Wallet' : '💵 Cash on Delivery'}
          </span>
        </div>
        {order.paymentMethod === 'upi' && (
          <>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">TXN ID:</span>
              <span className="font-bold text-foreground font-mono break-all text-right max-w-[60%]">
                {order.upiTransactionId || 'Not entered'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Verified:</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                  order.paymentProofVerified
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {order.paymentProofVerified ? '✓ Verified' : '⚠ Pending'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Items */}
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">📦 Items Ordered</p>
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center text-xs py-2 px-3 bg-muted/20 rounded-xl border border-border font-medium"
            >
              <span className="text-foreground truncate pr-4">
                {item.name}{' '}
                <span className="text-muted-foreground">× {item.quantity}</span>
              </span>
              <span className="font-bold text-primary shrink-0">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Totals + Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-border pt-4">
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Order Total</p>
          <p className="text-xl font-black text-foreground">{formatCurrency(order.totalAmount)}</p>
          {(order.discountAmount ?? 0) > 0 && (
            <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
              − {formatCurrency(order.discountAmount ?? 0)} discount applied
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {canCancel && (
            <button
              onClick={() => onCancel(order)}
              className="px-4 py-2 bg-destructive/10 text-destructive text-xs font-bold rounded-xl hover:bg-destructive/20 transition-colors press-effect border border-destructive/20"
            >
              ✕ Cancel Order
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border text-muted-foreground rounded-xl text-xs font-bold hover:bg-muted/40 transition-colors press-effect"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelConfirmModal({
  order,
  onConfirm,
  onClose,
}: {
  order: Order | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (!order) return null;

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    await onConfirm(reason.trim());
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl">
        <span className="text-2xl">⚠️</span>
        <div>
          <p className="text-sm font-bold text-foreground">Cancel Order #{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
          Cancellation Reason <span className="text-destructive">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for cancellation..."
          rows={3}
          className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-destructive/30 focus:border-destructive/50 resize-none"
        />
        {reason.length === 0 && (
          <p className="text-[10px] text-destructive mt-1">A reason is required to cancel.</p>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-border text-muted-foreground rounded-xl text-xs font-bold hover:bg-muted/40 transition-colors press-effect"
        >
          Keep Order
        </button>
        <button
          onClick={handleConfirm}
          disabled={!reason.trim() || busy}
          className="px-4 py-2 bg-destructive text-white text-xs font-bold rounded-xl hover:bg-destructive/90 transition-colors press-effect disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {busy ? 'Cancelling...' : 'Confirm Cancel'}
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="py-3 px-4">
              <div className="h-4 bg-muted/40 rounded animate-shimmer" style={{ width: `${60 + Math.random() * 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function CardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card-admin p-5 animate-shimmer h-44" />
      ))}
    </div>
  );
}

// ─── Filter tab config ────────────────────────────────────────────────────────

const FILTER_TABS: { key: FilterStatus; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'pending', label: 'Pending', icon: '⏳' },
  { key: 'active', label: 'Active', icon: '🔄' },
  { key: 'completed', label: 'Completed', icon: '✅' },
  { key: 'cancelled', label: 'Cancelled', icon: '❌' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const { userData } = useAuthStore();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Real-time subscription to all orders
  useEffect(() => {
    if (!userData || (userData.role !== 'admin' && userData.role !== 'co-admin')) return;
    const unsub = orderService.subscribeToAllOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, [userData]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'pending').length;
    const active = orders.filter((o) => isActiveStatus(o.status)).length;
    const completed = orders.filter((o) => o.status === 'completed').length;
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;
    const revenue = orders
      .filter((o) => o.status === 'completed')
      .reduce((s, o) => s + o.totalAmount, 0);
    return { pending, active, completed, cancelled, revenue, total: orders.length };
  }, [orders]);

  // ── Filtered + searched orders ────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      if (statusFilter === 'pending' && o.status !== 'pending') return false;
      if (statusFilter === 'active' && !isActiveStatus(o.status)) return false;
      if (statusFilter === 'completed' && o.status !== 'completed') return false;
      if (statusFilter === 'cancelled' && o.status !== 'cancelled') return false;

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchId = o.id.toLowerCase().includes(q);
        const matchName = (o.customerName ?? '').toLowerCase().includes(q);
        const matchPhone = (o.customerPhone ?? '').toLowerCase().includes(q);
        if (!matchId && !matchName && !matchPhone) return false;
      }

      return true;
    });
  }, [orders, statusFilter, search]);

  // ── Cancel handler ────────────────────────────────────────────────────────
  const handleCancel = useCallback(
    async (reason: string) => {
      if (!cancelTarget) return;
      try {
        await orderService.cancelOrder(cancelTarget.id, reason);
        addToast('Order cancelled successfully.', 'success');
      } catch {
        addToast('Failed to cancel order.', 'error');
      } finally {
        setCancelTarget(null);
        setSelectedOrder(null);
      }
    },
    [cancelTarget, addToast],
  );

  // ── Row expand toggle ─────────────────────────────────────────────────────
  const toggleRow = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="animate-fadeIn max-w-7xl mx-auto space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Orders Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time order tracking, search, and lifecycle control
          </p>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 p-1 bg-muted/20 rounded-xl border border-border w-fit">
          {(['table', 'card'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 press-effect ${
                viewMode === m
                  ? 'bg-card text-primary border border-border shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'table' ? '☰ Table' : '⊞ Cards'}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, color: '#94a3b8' },
          { label: 'Pending', value: stats.pending, color: '#f97316' },
          { label: 'Active', value: stats.active, color: '#06b6d4' },
          { label: 'Completed', value: stats.completed, color: '#14b8a6' },
          { label: 'Cancelled', value: stats.cancelled, color: '#ef4444' },
          { label: 'Revenue', value: `₹${stats.revenue.toLocaleString('en-IN')}`, color: '#14b8a6' },
        ].map((kpi) => (
          <div key={kpi.label} className="card-admin p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
              {kpi.label}
            </p>
            <p className="text-xl font-black" style={{ color: kpi.color }}>
              {loading ? (
                <span className="inline-block h-6 w-12 bg-muted/40 rounded animate-shimmer" />
              ) : (
                kpi.value
              )}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs + Search ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status tabs */}
        <div className="flex gap-1 p-1 bg-muted/20 rounded-xl border border-border overflow-x-auto hide-scrollbar">
          {FILTER_TABS.map((tab) => {
            const count =
              tab.key === 'all'
                ? orders.length
                : tab.key === 'active'
                ? stats.active
                : orders.filter((o) => o.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 press-effect ${
                  statusFilter === tab.key
                    ? 'bg-card text-primary border border-border shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {!loading && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      statusFilter === tab.key ? 'bg-primary/15 text-primary' : 'bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID, customer name or phone…"
            className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Results count ── */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          Showing <span className="text-foreground font-bold">{filteredOrders.length}</span> of{' '}
          <span className="text-foreground font-bold">{orders.length}</span> orders
        </p>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TABLE VIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'table' && (
        <div className="card-admin overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton />
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-4xl">📭</span>
                        <p className="text-muted-foreground font-medium text-sm">No orders found</p>
                        {search && (
                          <button
                            onClick={() => setSearch('')}
                            className="text-primary text-xs font-bold hover:underline"
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isExpanded = expandedRow === order.id;
                    const statusMeta =
                      ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES];
                    return (
                      <>
                        <tr
                          key={order.id}
                          className="cursor-pointer"
                          onClick={() => toggleRow(order.id)}
                        >
                          <td>
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-[11px] font-bold text-foreground">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </span>
                              {order.isPreorder && (
                                <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full w-fit">
                                  ★ PRE
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {order.customerName || '—'}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {order.customerPhone || ''}
                              </p>
                            </div>
                          </td>
                          <td>
                            <div className="text-xs text-muted-foreground">
                              <span className="text-foreground font-bold">{order.items.length}</span>{' '}
                              item{order.items.length !== 1 ? 's' : ''}
                              <p className="text-[10px] truncate max-w-[120px]">
                                {order.items[0]?.name}
                                {order.items.length > 1 && ` +${order.items.length - 1}`}
                              </p>
                            </div>
                          </td>
                          <td>
                            <span className="font-bold text-primary">
                              {formatCurrency(order.totalAmount)}
                            </span>
                            {(order.discountAmount ?? 0) > 0 && (
                              <p className="text-[10px] text-emerald-400">
                                −{formatCurrency(order.discountAmount ?? 0)}
                              </p>
                            )}
                          </td>
                          <td>
                            <OrderStatusBadge status={order.status} />
                            {order.deliverySlot && (
                              <p className="text-[10px] text-emerald-400 mt-1">
                                ⏱ {order.deliverySlot}
                              </p>
                            )}
                          </td>
                          <td className="text-muted-foreground text-[11px]">
                            {formatDate(order.createdAt)}
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                }}
                                className="text-[10px] font-bold text-primary hover:underline press-effect"
                              >
                                Details
                              </button>
                              {!['completed', 'cancelled'].includes(order.status) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCancelTarget(order);
                                  }}
                                  className="text-[10px] font-bold text-destructive hover:underline press-effect"
                                >
                                  Cancel
                                </button>
                              )}
                              <span
                                className={`text-muted-foreground text-xs transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              >
                                ▾
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Inline expanded row */}
                        {isExpanded && (
                          <tr key={`${order.id}-expand`}>
                            <td colSpan={7} className="bg-muted/10 px-6 py-4 border-t border-border/50">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn text-xs">
                                {/* Items list */}
                                <div className="md:col-span-2">
                                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">
                                    📦 Items
                                  </p>
                                  <div className="space-y-1">
                                    {order.items.map((item, idx) => (
                                      <div
                                        key={idx}
                                        className="flex justify-between items-center py-1.5 px-3 bg-muted/20 rounded-lg border border-border"
                                      >
                                        <span className="text-foreground">
                                          {item.name}{' '}
                                          <span className="text-muted-foreground">× {item.quantity}</span>
                                        </span>
                                        <span className="font-bold text-primary">
                                          {formatCurrency(item.price * item.quantity)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Address + payment summary */}
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">
                                      📍 Address
                                    </p>
                                    <p className="text-foreground leading-snug">
                                      {order.deliveryAddress
                                        ? [
                                            order.deliveryAddress.street,
                                            order.deliveryAddress.city,
                                            order.deliveryAddress.pincode,
                                          ]
                                            .filter(Boolean)
                                            .join(', ')
                                        : '—'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">
                                      💰 Payment
                                    </p>
                                    <p className="text-foreground uppercase font-bold">
                                      {order.paymentMethod === 'upi'
                                        ? '📱 UPI'
                                        : '💵 COD'}
                                    </p>
                                  </div>
                                  {order.specialInstructions && (
                                    <div>
                                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">
                                        📝 Instructions
                                      </p>
                                      <p className="text-foreground italic">
                                        &ldquo;{order.specialInstructions}&rdquo;
                                      </p>
                                    </div>
                                  )}
                                  {statusMeta && (
                                    <div
                                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg border w-fit"
                                      style={{
                                        backgroundColor: `${statusMeta.color}10`,
                                        color: statusMeta.color,
                                        borderColor: `${statusMeta.color}30`,
                                      }}
                                    >
                                      {statusMeta.icon} {statusMeta.label}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          CARD VIEW
      ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'card' && (
        <>
          {loading ? (
            <CardSkeleton />
          ) : filteredOrders.length === 0 ? (
            <div className="py-24 text-center card-admin">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-bold text-foreground mb-2">No orders found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or search query.
              </p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="mt-3 text-primary text-sm font-bold hover:underline press-effect"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="card-admin p-5 cursor-pointer hover:scale-[1.01] hover:border-primary/30 transition-all duration-200 relative overflow-hidden group"
                >
                  {/* Glow accent */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl rounded-bl-full group-hover:bg-primary/10 transition-colors pointer-events-none" />

                  {/* Top row */}
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-bold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg font-mono">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      {order.isPreorder && (
                        <span className="text-[9px] font-bold bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-400/20 w-fit">
                          ★ PRE-ORDER
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <OrderStatusBadge status={order.status} />
                      {order.deliverySlot && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                          ⏱ {order.deliverySlot}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer */}
                  {order.customerName && (
                    <p className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5 relative z-10">
                      <span className="w-5 h-5 bg-muted/40 rounded-full flex items-center justify-center text-[10px]">
                        👤
                      </span>
                      {order.customerName}
                    </p>
                  )}

                  {/* Address */}
                  {order.deliveryAddress && (
                    <p className="text-[10px] text-muted-foreground mb-3 relative z-10 leading-tight">
                      📍{' '}
                      {[
                        order.deliveryAddress.street,
                        order.deliveryAddress.city,
                        order.deliveryAddress.pincode,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}

                  {/* Items preview */}
                  <div className="space-y-1 mb-3 relative z-10">
                    {order.items.slice(0, 2).map((item, idx) => (
                      <p
                        key={idx}
                        className="text-xs flex justify-between text-muted-foreground"
                      >
                        <span className="truncate pr-4 text-foreground">{item.name}</span>
                        <span className="shrink-0 font-bold">× {item.quantity}</span>
                      </p>
                    ))}
                    {order.items.length > 2 && (
                      <p className="text-[10px] text-primary font-bold bg-primary/10 w-fit px-2 py-0.5 rounded-md">
                        +{order.items.length - 2} more
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-end pt-3 border-t border-border relative z-10">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                        Total
                      </p>
                      <span className="text-lg font-black text-primary">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </span>
                      {!['completed', 'cancelled'].includes(order.status) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCancelTarget(order);
                          }}
                          className="text-[10px] font-bold text-destructive hover:underline press-effect"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Order Detail Modal ── */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
        size="lg"
      >
        {selectedOrder && (
          <OrderDetailPanel
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onCancel={(o) => {
              setCancelTarget(o);
              setSelectedOrder(null);
            }}
          />
        )}
      </Modal>

      {/* ── Cancel Confirmation Modal ── */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Order"
        size="sm"
      >
        <CancelConfirmModal
          order={cancelTarget}
          onConfirm={handleCancel}
          onClose={() => setCancelTarget(null)}
        />
      </Modal>
    </div>
  );
}
