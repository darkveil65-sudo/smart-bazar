'use client';

import { useState, useEffect } from 'react';
// Layout handled by parent
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Order } from '@smart-bazar/shared/types/firestore';
import { ORDER_STATUSES, CATEGORY_MAP } from '@smart-bazar/shared/lib/constants';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

export default function StoreOrdersPage() {
  const { userData } = useAuthStore();
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'store' | 'packed' | 'all'>('store');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheckItem = (itemKey: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemKey]: !prev[itemKey]
    }));
  };

  useEffect(() => {
    if (!userData) return;
    const unsub = orderService.subscribeToOrdersByStore(userData.id, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, [userData]);

  const filteredOrders = orders.filter(o => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

  const handleMarkPacked = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order && order.paymentMethod === 'upi' && !order.paymentProofVerified) {
      addToast('Cannot mark as packed: UPI payment proof is not verified.', 'error');
      return;
    }
    setProcessing(orderId);
    try {
      await orderService.markPacked(orderId);
      addToast('Order marked as packed! 📦', 'success');
    } catch {
      addToast('Update failed', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const storeCount = orders.filter(o => o.status === 'store').length;
  const packedCount = orders.filter(o => o.status === 'packed').length;

  const tabs: Array<{ key: typeof filter; label: string; count?: number; color: string }> = [
    { key: 'store',  label: 'New Orders', count: storeCount,  color: '#d97706' },
    { key: 'packed', label: 'Packed',     count: packedCount, color: '#f59e0b' },
    { key: 'all',    label: 'All Orders', color: '#6b7280' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto animate-fadeIn">
      <div>
        {/* Header with mini-stats strip */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Order Processing</h1>
              <p className="text-sm text-slate-500">{orders.length} total orders assigned to your store</p>
            </div>
            {storeCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-xl text-xs font-bold animate-pulse-slow shadow-lg shadow-violet-200">
                📥 {storeCount} to Pack
              </div>
            )}
          </div>

          {/* Mini-stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'New Orders',  count: storeCount,  bg: '#ede9fe', color: '#7c3aed', icon: '📥' },
              { label: 'Packed',      count: packedCount, bg: '#cffafe', color: '#0e7490', icon: '📦' },
              { label: 'All Orders',  count: orders.length, bg: '#f1f5f9', color: '#475569', icon: '📋' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center border" style={{ background: s.bg, borderColor: s.bg }}>
                <p className="text-lg">{s.icon}</p>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.count}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === tab.key ? 'text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
              }`}
              style={filter === tab.key ? { background: tab.color } : {}}>
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`min-w-[20px] h-4 px-1 rounded-full text-[10px] flex items-center justify-center ${
                  filter === tab.key ? 'bg-white/30' : 'bg-red-100 text-red-600'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Orders */}
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                    <div className="h-3 w-48 bg-slate-100 rounded" />
                  </div>
                  <div className="w-24 h-8 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center py-20 bg-white rounded-3xl border border-slate-100">
            <p className="text-4xl mb-3">📦</p>
            <p className="font-bold text-slate-400">
              {filter === 'store' ? 'No new orders assigned' : 'No orders here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => {
              const statusCfg = ORDER_STATUSES[order.status as keyof typeof ORDER_STATUSES];
              const catCfg = order.category ? CATEGORY_MAP[order.category] : null;
              const isExpanded = expandedOrder === order.id;
              const allChecked = order.items.every((_, idx) => checkedItems[`${order.id}-${idx}`]);

              return (
                <div key={order.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fadeInUp">
                  {/* Order Header */}
                  <div
                    className="p-5 flex items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    {/* Status icon */}
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: statusCfg?.bg }}>
                      {statusCfg?.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: statusCfg?.bg, color: statusCfg?.color }}>
                          {statusCfg?.label}
                        </span>
                        {catCfg && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: catCfg.bg, color: catCfg.color }}>
                            {catCfg.icon} {catCfg.name}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {order.items.length} item{order.items.length > 1 ? 's' : ''} •{' '}
                        {new Date(order.createdAt).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {order.deliverySlot && (
                        <p className="text-[10px] font-bold text-emerald-600 mt-0.5" title="Delivery Slot">
                          ⏱️ {order.deliverySlot}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-slate-900">₹{order.totalAmount}</p>
                      <p className="text-[10px] text-slate-400">
                        {isExpanded ? '▲ Hide' : '▼ Details'}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-50 px-5 pb-5 pt-4 space-y-4 animate-fadeIn">
                      {/* Items list */}
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Items to Pack Checklist</p>
                        <div className="space-y-2">
                          {order.items.map((item, i) => {
                            const itemKey = `${order.id}-${i}`;
                            const isChecked = order.status !== 'store' || !!checkedItems[itemKey];
                            const isInteractive = order.status === 'store';
                            return (
                              <div
                                key={i}
                                onClick={() => isInteractive && toggleCheckItem(itemKey)}
                                className={`flex justify-between items-center text-sm py-2 px-3 rounded-xl border transition-all ${
                                  isInteractive ? 'cursor-pointer select-none hover:bg-slate-100/70' : ''
                                } ${
                                  isChecked
                                    ? 'bg-amber-50/40 border-amber-300 text-slate-500 line-through'
                                    : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                                    isChecked
                                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                      : 'border-slate-300 bg-white'
                                  }`}>
                                    {isChecked && (
                                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path d="M3.5 6L5 7.5L8.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span>{item.emoji || '📦'}</span>
                                    <span className={`font-semibold ${isChecked ? 'text-slate-400' : 'text-slate-900'}`}>{item.name}</span>
                                    <span className="text-slate-400">× {item.quantity}</span>
                                  </div>
                                </div>
                                <span className={`font-bold ${isChecked ? 'text-slate-400' : 'text-slate-900'}`}>₹{item.price * item.quantity}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between pt-2 px-3 border-t border-slate-100 mt-2">
                          <span className="text-xs font-bold text-slate-600">Total</span>
                          <span className="text-sm font-black text-slate-900">₹{order.totalAmount}</span>
                        </div>
                      </div>

                      {/* Delivery address */}
                      {order.deliveryAddress && (
                        <div className="bg-blue-50 rounded-xl px-4 py-3">
                          <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Delivery Address</p>
                          <p className="text-xs text-slate-700">
                            {order.deliveryAddress.street}, {order.deliveryAddress.city}
                            {order.deliveryAddress.pincode ? `, ${order.deliveryAddress.pincode}` : ''}
                          </p>
                        </div>
                      )}

                      {/* Payment Proof details */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Payment Details</p>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start sm:items-center gap-1.5 sm:gap-2 text-xs">
                          <span className="text-slate-500">Method:</span>
                          <span className="font-bold text-slate-900 uppercase">
                            {order.paymentMethod === 'upi' ? '📱 UPI / Wallet' : '💵 Cash on Delivery'}
                          </span>
                        </div>
                        {order.paymentMethod === 'upi' && (
                          <>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start sm:items-center gap-1.5 sm:gap-2 text-xs">
                              <span className="text-slate-500">Transaction ID:</span>
                              <span className="font-mono font-bold text-slate-800 break-all">{order.upiTransactionId || '—'}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start sm:items-center gap-1.5 sm:gap-2 text-xs">
                              <span className="text-slate-500">Verification Status:</span>
                              <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] w-fit whitespace-nowrap ${order.paymentProofVerified ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                                {order.paymentProofVerified ? '✓ Verified' : '⚠️ Pending Verification'}
                              </span>
                            </div>
                            
                            {order.paymentProofVerifiedBy && (
                              <p className="text-[10px] text-slate-400 mt-1">
                                Verified by {order.paymentProofVerifiedBy} at {order.paymentProofVerifiedAt ? new Date(order.paymentProofVerifiedAt).toLocaleString('en-IN') : ''}
                              </p>
                            )}

                            {order.paymentProofImage ? (
                              <div className="mt-2">
                                <p className="text-[10px] text-slate-400 mb-1">Screenshot Proof:</p>
                                <a href={order.paymentProofImage} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-lg border border-slate-200 bg-white max-w-[200px] hover:border-violet-300 transition-colors">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={order.paymentProofImage} alt="Payment Proof" className="max-h-32 object-contain p-1" />
                                </a>
                              </div>
                            ) : (
                              <p className="text-[10px] text-rose-500 font-bold mt-1">⚠️ No screenshot uploaded</p>
                            )}

                            {!order.paymentProofVerified && (
                              <button
                                onClick={async () => {
                                  try {
                                    await orderService.verifyPaymentProof(order.id, userData?.name || userData?.email || 'Store Staff');
                                    addToast('Payment verified successfully! ✅', 'success');
                                  } catch {
                                    addToast('Failed to verify payment', 'error');
                                  }
                                }}
                                className="w-full mt-2 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
                              >
                                Verify Payment
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Action button */}
                      {order.status === 'store' && (
                        <div className="space-y-2">
                          <button
                            onClick={() => handleMarkPacked(order.id)}
                            disabled={processing === order.id || !allChecked}
                            className={`w-full py-3.5 rounded-2xl text-white text-sm font-bold press-effect transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                              allChecked
                                ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-200'
                                : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                            }`}
                          >
                            {processing === order.id ? (
                              'Updating...'
                            ) : (
                              <>📦 Mark as Packed & Ready {allChecked && '✨'}</>
                            )}
                          </button>
                          {!allChecked && (
                            <p className="text-[10px] text-center text-amber-600 font-semibold animate-pulse-slow">
                              ⚠️ Please tick all items in the checklist to enable packing confirmation.
                            </p>
                          )}
                        </div>
                      )}

                      {order.status === 'packed' && (
                        <div className="flex items-center gap-2 p-3 bg-cyan-50 rounded-2xl">
                          <span className="text-xl">✅</span>
                          <div>
                            <p className="text-xs font-bold text-cyan-700">Packed & Ready for Pickup</p>
                            <p className="text-[10px] text-cyan-500">Delivery boy will pick up shortly</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
