'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { useAppConfig } from '@smart-bazar/shared/contexts/AppConfigContext';
import { Order, UserData } from '@smart-bazar/shared/types/firestore';
import { ORDER_STATUSES, CATEGORY_MAP } from '@smart-bazar/shared/lib/constants';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import Modal from '@smart-bazar/shared/components/ui/Modal';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const normalise = (s: string) => s.trim().toLowerCase();

function getOrderArea(order: Order): string {
  const addr = order.deliveryAddress;
  if (!addr) return 'Unknown Area';
  return addr.city?.trim() || addr.state?.trim() || 'Unknown Area';
}

function getOrderCategory(order: Order): string {
  return order.store || order.category || 'General';
}

// ─── Colour palette for area cards ───────────────────────────────────────────
const AREA_GRADIENTS = [
  'from-emerald-600 to-teal-800',
  'from-cyan-600 to-teal-800',
  'from-amber-500 to-yellow-600',
  'from-teal-600 to-cyan-800',
  'from-emerald-500 to-cyan-600',
  'from-yellow-600 to-amber-800',
  'from-emerald-700 to-emerald-950',
  'from-cyan-500 to-sky-700',
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function ManagerOrdersPage() {
  const { userData }  = useAuthStore();
  const { addToast }  = useToast();
  const { config }    = useAppConfig();

  const [orders, setOrders]           = useState<Order[]>([]);
  const [stores, setStores]           = useState<UserData[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<UserData[]>([]);
  const [loading, setLoading]         = useState(true);

  // Area-view state
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  // Table view filter inside an area
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'store' | 'packed' | 'delivery'>('all');
  const [search, setSearch]             = useState('');

  // Modals
  const [assigningOrder, setAssigningOrder]   = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<string>('');
  const [modalOrder, setModalOrder]           = useState<Order | null>(null);
  const [actionType, setActionType]           = useState<'delivery' | 'preorder' | null>(null);
  const [preorderTime, setPreorderTime]       = useState<string>('');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  // ── Subscriptions ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userData) return;
    const unsub = orderService.subscribeToAllOrders((all) => {
      const cats = userData.assignedCategories;
      const filtered = cats && cats.length > 0
        ? all.filter(o => !o.category || cats.includes(o.category as any))
        : all;
      setOrders(filtered);
      setLoading(false);
    });
    const unsubStores   = userService.subscribeToUsersByRole('store', setStores);
    const unsubDelivery = userService.subscribeToUsersByRole('delivery', setDeliveryBoys);
    return () => { unsub(); unsubStores(); unsubDelivery(); };
  }, [userData]);

  // ── Configured delivery areas ─────────────────────────────────────────────
  const configuredAreas: string[] = useMemo(
    () => config.deliveryAreas?.length ? config.deliveryAreas : [],
    [config.deliveryAreas],
  );

  // ── Group ALL orders by area ──────────────────────────────────────────────
  const ordersByArea = useMemo(() => {
    const map = new Map<string, Order[]>();
    orders.forEach(o => {
      const key = getOrderArea(o);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    return map;
  }, [orders]);

  // Configured areas first, then any extra found in orders
  const areaList = useMemo(() => {
    const extra = [...ordersByArea.keys()].filter(
      a => !configuredAreas.some(ca => normalise(ca) === normalise(a)),
    );
    return [...configuredAreas, ...extra];
  }, [configuredAreas, ordersByArea]);

  // ── Orders for selected area, with status + search filters ────────────────
  const areaOrders = useMemo(() => {
    if (!selectedArea) return [];
    const raw = orders.filter(o => normalise(getOrderArea(o)) === normalise(selectedArea));
    return raw
      .filter(o => statusFilter === 'all' ? !['completed','cancelled'].includes(o.status) : o.status === statusFilter)
      .filter(o => {
        if (!search) return true;
        const q = search.toLowerCase();
        return o.id.toLowerCase().includes(q) ||
          (o.customerName || '').toLowerCase().includes(q) ||
          o.status.toLowerCase().includes(q);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [selectedArea, orders, statusFilter, search]);

  // Group area-orders by store/category
  const ordersByCategory = useMemo(() => {
    const map = new Map<string, Order[]>();
    areaOrders.forEach(o => {
      const cat = getOrderCategory(o);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(o);
    });
    return map;
  }, [areaOrders]);

  // ── Status counts for tab pills ───────────────────────────────────────────
  const areaStatusCounts = useMemo(() => {
    if (!selectedArea) return {} as Record<string, number>;
    const raw = orders.filter(o => normalise(getOrderArea(o)) === normalise(selectedArea));
    return {
      pending:  raw.filter(o => o.status === 'pending').length,
      store:    raw.filter(o => o.status === 'store').length,
      packed:   raw.filter(o => o.status === 'packed').length,
      delivery: raw.filter(o => o.status === 'delivery').length,
    };
  }, [selectedArea, orders]);

  // ── Action handlers (unchanged logic) ────────────────────────────────────
  const handleAcceptOrder = async (order: Order) => {
    if (order.paymentMethod === 'upi' && !order.paymentProofVerified) {
      addToast('Cannot approve order: UPI payment proof is not verified.', 'error');
      return;
    }
    if (!order.category) { addToast('Order has no category', 'error'); return; }
    const matchingStores = stores.filter(s => s.status !== 'inactive' && s.vendorStore === order.category);
    if (matchingStores.length === 0) {
      addToast(`No active store for category: ${order.category}`, 'error'); return;
    }
    setAssigningOrder(order.id);
    try {
      await orderService.assignStore(order.id, matchingStores[0].id!);
      addToast(`Approved & sent to ${matchingStores[0].name} ✅`, 'success');
    } catch { addToast('Failed to accept order', 'error'); }
    finally   { setAssigningOrder(null); }
  };

  const handleAssignDelivery = async () => {
    if (!modalOrder || !selectedDelivery) return;
    setAssigningOrder(modalOrder.id);
    try {
      await orderService.assignDelivery(modalOrder.id, selectedDelivery);
      addToast('Assigned to delivery boy ✅', 'success');
      setModalOrder(null);
    } catch { addToast('Assignment failed', 'error'); }
    finally   { setAssigningOrder(null); }
  };

  const handleSetPreorderTime = async () => {
    if (!modalOrder || !preorderTime.trim()) return;
    setAssigningOrder(modalOrder.id);
    try {
      await orderService.setPreorderDeliveryTime(modalOrder.id, preorderTime);
      addToast('Pre-order time confirmed ✅', 'success');
      setModalOrder(null);
    } catch { addToast('Failed to set time', 'error'); }
    finally   { setAssigningOrder(null); }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('Cancel this order?')) return;
    try {
      await orderService.cancelOrder(orderId, 'Cancelled by manager');
      addToast('Order cancelled', 'info');
    } catch { addToast('Could not cancel', 'error'); }
  };

  const openAssignDelivery = (order: Order) => { setModalOrder(order); setActionType('delivery'); setSelectedDelivery(''); };
  const openPreorderModal  = (order: Order) => { setModalOrder(order); setActionType('preorder'); setPreorderTime(order.preorderDeliveryTime || ''); };

  const totalPending = orders.filter(o => o.status === 'pending').length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-7xl mx-auto animate-fadeIn">

      {/* ── Header ── */}
      <div className="mb-8 p-7 rounded-3xl text-white shadow-xl overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #0d9488 50%, #022c22 100%)' }}>
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-400/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-cyan-400/10 blur-[70px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            {selectedArea && (
              <button
                onClick={() => { setSelectedArea(null); setStatusFilter('all'); setSearch(''); }}
                className="flex items-center gap-2 text-cyan-300 hover:text-white text-sm font-bold mb-3 transition-colors"
              >
                ← Back to Areas
              </button>
            )}
            <h1 className="text-2xl font-black tracking-tight text-white mb-1">
              {selectedArea ? `📍 ${selectedArea}` : '🗺️ Orders by Area'}
            </h1>
            <p className="text-emerald-200 text-sm font-medium">
              {selectedArea
                ? `${areaOrders.length} active orders in this area`
                : `${orders.length} total orders · ${areaList.length} delivery areas`}
            </p>
          </div>
          {/* KPIs */}
          <div className="flex gap-3 flex-wrap">
            <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl px-5 py-3 text-center">
              <p className="text-cyan-200 text-[10px] font-bold uppercase tracking-wider mb-0.5">Total</p>
              <p className="text-2xl font-black text-white leading-none">{orders.length}</p>
            </div>
            <div className="bg-amber-500/20 backdrop-blur border border-amber-400/30 rounded-2xl px-5 py-3 text-center">
              <p className="text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-0.5">Pending</p>
              <p className="text-2xl font-black text-amber-300 leading-none">{totalPending}</p>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/15 rounded-2xl px-5 py-3 text-center">
              <p className="text-cyan-200 text-[10px] font-bold uppercase tracking-wider mb-0.5">Areas</p>
              <p className="text-2xl font-black text-white leading-none">{areaList.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW A: Area cards (default view)
      ══════════════════════════════════════════════════════════════════════ */}
      {!selectedArea && (
        <>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {[1,2,3,4].map(i => <div key={i} className="h-44 bg-slate-100 rounded-3xl animate-pulse" />)}
            </div>
          ) : areaList.length === 0 ? (
            <div className="py-24 text-center bg-white border border-slate-200 rounded-3xl border-dashed">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">📍</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Delivery Areas</h3>
              <p className="text-slate-500">Ask your Admin to configure delivery areas in Settings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {areaList.map((area, idx) => {
                const areaOrderList = ordersByArea.get(area) ||
                  orders.filter(o => normalise(getOrderArea(o)) === normalise(area));
                const pendingCount  = areaOrderList.filter(o => o.status === 'pending').length;
                const activeCount   = areaOrderList.filter(o => !['completed','cancelled'].includes(o.status)).length;
                const grad          = AREA_GRADIENTS[idx % AREA_GRADIENTS.length];
                const hasOrders     = areaOrderList.length > 0;

                return (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={`relative text-left rounded-3xl overflow-hidden p-6 transition-all duration-300 group
                      ${hasOrders ? 'hover:scale-[1.03] hover:shadow-2xl shadow-lg cursor-pointer' : 'opacity-60 shadow-sm cursor-pointer hover:opacity-80'}
                    `}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors" />
                    <div className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                      }}
                    />
                    <div className="relative z-10">
                      <div className="w-11 h-11 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-xl mb-4 border border-white/30 group-hover:scale-110 transition-transform">
                        📍
                      </div>
                      <h3 className="font-black text-white text-base leading-tight mb-1 truncate">{area}</h3>
                      <p className="text-white/70 text-xs font-medium mb-3">
                        {areaOrderList.length} total · {activeCount} active
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {pendingCount > 0 && (
                          <span className="bg-amber-400/30 border border-amber-300/40 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                            ⏳ {pendingCount} pending
                          </span>
                        )}
                        {activeCount > 0 && (
                          <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                            🔄 {activeCount} ongoing
                          </span>
                        )}
                        {areaOrderList.length === 0 && (
                          <span className="bg-white/10 border border-white/20 text-white/60 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            No orders
                          </span>
                        )}
                      </div>
                    </div>
                    {hasOrders && (
                      <div className="absolute bottom-5 right-5 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-sm group-hover:bg-white/30 transition-colors">
                        →
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW B: Orders inside selected area, grouped by category
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedArea && (
        <>
          {/* Status filter tabs + search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search order ID, customer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all shadow-sm"
              />
            </div>
            {/* Status tabs */}
            <div className="flex gap-2 flex-wrap">
              {([
                { key: 'all',      label: 'Active',   color: '#059669' },
                { key: 'pending',  label: 'Pending',  color: '#d97706', count: areaStatusCounts.pending },
                { key: 'store',    label: 'At Store', color: '#7c3aed', count: areaStatusCounts.store },
                { key: 'packed',   label: 'Packed',   color: '#0891b2', count: areaStatusCounts.packed },
                { key: 'delivery', label: 'Delivery', color: '#0d9488', count: areaStatusCounts.delivery },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === tab.key ? 'text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                  }`}
                  style={statusFilter === tab.key ? { background: tab.color } : {}}
                >
                  {tab.label}
                  {('count' in tab) && tab.count > 0 && (
                    <span className={`min-w-[18px] h-4 px-1 rounded-full text-[10px] flex items-center justify-center ${
                      statusFilter === tab.key ? 'bg-white/30' : 'bg-red-100 text-red-600'
                    }`}>{tab.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Empty */}
          {areaOrders.length === 0 && (
            <div className="py-20 text-center bg-white border border-slate-200 rounded-3xl border-dashed">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-bold text-slate-400">No orders for this filter</p>
            </div>
          )}

          {/* Category sections */}
          {[...ordersByCategory.entries()].map(([category, catOrders]) => {
            const catCfg = CATEGORY_MAP[category as keyof typeof CATEGORY_MAP];
            return (
              <div key={category} className="mb-8">
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: catCfg?.bg || '#f1f5f9', color: catCfg?.color || '#64748b' }}>
                    {catCfg?.icon || '🏪'}
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 text-sm leading-tight capitalize">{catCfg?.name || category}</h2>
                    <p className="text-xs text-slate-500">{catOrders.length} order{catOrders.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex-1 h-px bg-slate-100 ml-2" />
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    {catOrders.length}
                  </span>
                </div>

                {/* Orders table */}
                <div className="glass-table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer / Address</th>
                        <th>Items</th>
                        <th>Status</th>
                        <th>Amount</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catOrders.map(order => {
                        const statusCfg = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES];
                        return (
                          <tr key={order.id} className="group">
                            <td className="cursor-pointer" onClick={() => setSelectedOrderDetail(order)}>
                              <p className="text-xs font-bold text-slate-900 hover:text-cyan-600 transition-colors">#{order.id.slice(0,8).toUpperCase()}</p>
                              {order.isPreorder && (
                                <span className="block mt-1 w-max text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">★ PRE-ORDER</span>
                              )}
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {order.deliverySlot && (
                                <p className="text-[10px] font-bold text-emerald-600 mt-0.5">⏱ {order.deliverySlot}</p>
                              )}
                              {order.paymentMethod === 'upi' && (
                                <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  order.paymentProofVerified
                                    ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                                    : 'bg-amber-50 border border-amber-100 text-amber-700'
                                }`}>
                                  {order.paymentProofVerified ? '✓ Paid' : '⚠️ Unverified'}
                                </span>
                              )}
                            </td>
                            <td>
                              <p className="text-xs font-bold text-slate-800">{order.customerName || '—'}</p>
                              {order.deliveryAddress && (
                                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug max-w-[180px]">
                                  {[order.deliveryAddress.street, order.deliveryAddress.city, order.deliveryAddress.pincode].filter(Boolean).join(', ')}
                                </p>
                              )}
                            </td>
                            <td>
                              <p className="text-xs font-semibold text-slate-700">{order.items.length} item{order.items.length > 1 ? 's' : ''}</p>
                              <p className="text-[10px] text-slate-400 line-clamp-1">
                                {order.items.slice(0,2).map(i => i.name).join(', ')}{order.items.length > 2 ? ` +${order.items.length-2}` : ''}
                              </p>
                            </td>
                            <td>
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
                                style={{ background: statusCfg?.bg, color: statusCfg?.color }}>
                                {statusCfg?.icon} {statusCfg?.label}
                              </span>
                            </td>
                            <td>
                              <p className="text-sm font-bold text-slate-900">₹{order.totalAmount}</p>
                            </td>
                            <td>
                              <div className="flex gap-2 flex-wrap">
                                {order.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleAcceptOrder(order)}
                                      disabled={assigningOrder === order.id}
                                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-all"
                                    >
                                      {assigningOrder === order.id ? 'Approving...' : '✓ Approve'}
                                    </button>
                                    {order.isPreorder && (
                                      <button
                                        onClick={() => openPreorderModal(order)}
                                        className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-cyan-700 bg-cyan-100 hover:bg-cyan-200 transition-all"
                                      >
                                        🕒 Set Time
                                      </button>
                                    )}
                                  </>
                                )}
                                {order.status === 'packed' && (
                                  <button
                                    onClick={() => openAssignDelivery(order)}
                                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white transition-all hover:opacity-90"
                                    style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
                                  >
                                    → Delivery
                                  </button>
                                )}
                                {(order.status === 'pending' || order.status === 'store') && (
                                  <button
                                    onClick={() => handleCancel(order.id)}
                                    className="text-[10px] font-bold px-2 py-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                                  >
                                    Cancel
                                  </button>
                                )}
                                {['manager','store','delivery','completed'].includes(order.status) && order.status !== 'packed' && order.status !== 'pending' && (
                                  <span className="text-[10px] text-slate-400">In progress</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── Assign Delivery Modal ── */}
      {modalOrder && actionType === 'delivery' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOrder(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-bold mb-1">Assign to Delivery Boy</h2>
            <p className="text-xs text-slate-500 mb-5">Order #{modalOrder.id.slice(0,8).toUpperCase()} · Ready 📦</p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-5">
              {deliveryBoys.filter(d => d.status === 'active').map(boy => (
                <button
                  key={boy.id}
                  onClick={() => setSelectedDelivery(boy.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                    selectedDelivery === boy.id ? 'border-cyan-500 bg-cyan-50/50' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center text-sm font-bold text-cyan-600">
                    {boy.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{boy.name}</p>
                    <p className="text-[10px] text-slate-400">{boy.phone || boy.email}</p>
                  </div>
                  {selectedDelivery === boy.id && <span className="ml-auto text-cyan-500">✓</span>}
                </button>
              ))}
              {deliveryBoys.filter(d => d.status === 'active').length === 0 && (
                <p className="text-center py-6 text-slate-400 text-sm">No active online delivery partners available</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalOrder(null)} className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleAssignDelivery}
                disabled={!selectedDelivery || assigningOrder === modalOrder.id}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
              >
                {assigningOrder === modalOrder.id ? 'Assigning...' : 'Assign Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preorder Modal ── */}
      {modalOrder && actionType === 'preorder' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOrder(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-bold mb-1">Set Pre-Order Delivery Time</h2>
            <p className="text-xs text-slate-500 mb-5">Order #{modalOrder.id.slice(0,8).toUpperCase()} · Pre-order</p>
            <label className="block text-sm font-semibold mb-2">Delivery Time Guarantee</label>
            <input
              type="text"
              placeholder="e.g., Tomorrow by 5 PM"
              value={preorderTime}
              onChange={e => setPreorderTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 mb-5 focus:outline-none focus:border-emerald-500"
            />
            <div className="flex gap-3">
              <button onClick={() => setModalOrder(null)} className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleSetPreorderTime}
                disabled={!preorderTime.trim() || assigningOrder === modalOrder.id}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
              >
                {assigningOrder === modalOrder.id ? 'Saving...' : 'Confirm Time'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order Details / Verification Modal ── */}
      <Modal
        isOpen={!!selectedOrderDetail}
        onClose={() => setSelectedOrderDetail(null)}
        title="Order Details"
        size="lg"
      >
        {selectedOrderDetail && (
          <div className="space-y-5 animate-fadeIn">
            {/* Header / ID */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs text-slate-400 font-bold">ORDER ID</p>
                <p className="text-sm font-extrabold text-slate-900 font-mono uppercase">#{selectedOrderDetail.id}</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Placed: {new Date(selectedOrderDetail.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: ORDER_STATUSES[selectedOrderDetail.status as keyof typeof ORDER_STATUSES]?.bg,
                    color: ORDER_STATUSES[selectedOrderDetail.status as keyof typeof ORDER_STATUSES]?.color
                  }}>
                  {ORDER_STATUSES[selectedOrderDetail.status as keyof typeof ORDER_STATUSES]?.icon} {ORDER_STATUSES[selectedOrderDetail.status as keyof typeof ORDER_STATUSES]?.label}
                </span>
                {selectedOrderDetail.isPreorder && (
                  <span className="block mt-1 text-[9px] font-black text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full uppercase">
                    ★ Pre-Order
                  </span>
                )}
              </div>
            </div>

            {/* Customer & Delivery details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">👤 Customer Details</p>
                <p className="text-xs font-bold text-slate-800">{selectedOrderDetail.customerName || '—'}</p>
                <p className="text-xs text-slate-500 font-medium mt-1">📞 {selectedOrderDetail.customerPhone || '—'}</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">📍 Delivery Address</p>
                <p className="text-xs font-bold text-slate-800">
                  {selectedOrderDetail.deliveryAddress?.customerName || selectedOrderDetail.customerName}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">
                  {selectedOrderDetail.deliveryAddress ? (
                    [selectedOrderDetail.deliveryAddress.street, selectedOrderDetail.deliveryAddress.city, selectedOrderDetail.deliveryAddress.pincode].filter(Boolean).join(', ')
                  ) : '—'}
                </p>
                {selectedOrderDetail.deliverySlot && (
                  <p className="text-[10px] font-bold text-emerald-600 mt-2">⏱ Delivery Slot: {selectedOrderDetail.deliverySlot}</p>
                )}
              </div>
            </div>

            {/* Payment Details Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">💰 Payment Information</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Payment Method:</span>
                  <span className="font-bold text-slate-900 uppercase">
                    {selectedOrderDetail.paymentMethod === 'upi' ? '📱 UPI / Wallet' : '💵 Cash on Delivery'}
                  </span>
                </div>

                {selectedOrderDetail.paymentMethod === 'upi' ? (
                  <>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start sm:items-center gap-1.5 sm:gap-2">
                      <span className="text-slate-500 font-medium">UPI Transaction ID:</span>
                      <span className="font-bold text-slate-900 font-mono break-all">{selectedOrderDetail.upiTransactionId || 'Not entered'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start sm:items-center gap-1.5 sm:gap-2">
                      <span className="text-slate-500 font-medium">Verification Status:</span>
                      <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] w-fit whitespace-nowrap ${selectedOrderDetail.paymentProofVerified ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                        {selectedOrderDetail.paymentProofVerified ? '✓ Verified' : '⚠️ Pending Verification'}
                      </span>
                    </div>

                    {selectedOrderDetail.paymentProofVerifiedBy && (
                      <div className="bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-800 rounded-xl p-2.5 mt-2">
                        <strong>Verified By:</strong> {selectedOrderDetail.paymentProofVerifiedBy} <br/>
                        <strong>Date:</strong> {selectedOrderDetail.paymentProofVerifiedAt ? new Date(selectedOrderDetail.paymentProofVerifiedAt).toLocaleString('en-IN') : 'N/A'}
                      </div>
                    )}

                    {selectedOrderDetail.paymentProofImage ? (
                      <div className="mt-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Screenshot Proof:</p>
                        <a href={selectedOrderDetail.paymentProofImage} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-xl border border-slate-200 bg-white max-w-sm mx-auto">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={selectedOrderDetail.paymentProofImage} alt="UPI Payment Proof" className="max-h-60 mx-auto object-contain p-2 group-hover:scale-102 transition-transform" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
                            🔍 Open Image in New Tab
                          </div>
                        </a>
                      </div>
                    ) : (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-600 font-bold mt-2">
                        ⚠️ No screenshot uploaded
                      </div>
                    )}

                    {!selectedOrderDetail.paymentProofVerified && (
                      <button
                        onClick={async () => {
                          try {
                            await orderService.verifyPaymentProof(selectedOrderDetail.id, userData?.name || userData?.email || 'Manager');
                            addToast('Payment verified successfully! ✅', 'success');
                            setSelectedOrderDetail(prev => prev ? { ...prev, paymentProofVerified: true, paymentProofVerifiedBy: userData?.name || userData?.email || 'Manager', paymentProofVerifiedAt: new Date().toISOString() } : null);
                          } catch {
                            addToast('Failed to verify payment', 'error');
                          }
                        }}
                        className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                      >
                        ✓ Verify & Approve Payment
                      </button>
                    )}
                  </>
                ) : (
                  <div className="p-2.5 bg-blue-50 border border-blue-100 text-blue-800 rounded-xl text-[10px] font-bold">
                    💵 Payment will be collected in cash upon delivery.
                  </div>
                )}
              </div>
            </div>

            {/* Items List */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">📦 Items Ordered</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {selectedOrderDetail.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-2 px-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-700">{item.name} <span className="text-slate-400">× {item.quantity}</span></span>
                    <span className="font-bold text-slate-900">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Footer */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-3">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Order Total</p>
                <p className="text-lg font-black text-slate-950">₹{selectedOrderDetail.totalAmount}</p>
              </div>
              <div className="flex gap-2">
                {selectedOrderDetail.status === 'pending' && (
                  <button
                    onClick={() => {
                      handleAcceptOrder(selectedOrderDetail);
                      setSelectedOrderDetail(null);
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors"
                  >
                    Approve Order
                  </button>
                )}
                <button
                  onClick={() => setSelectedOrderDetail(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
