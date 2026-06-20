'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Product, Order } from '@smart-bazar/shared/types/firestore';
import { reviewService } from '@smart-bazar/shared/lib/services/reviewService';
import Skeleton from '@smart-bazar/shared/components/ui/Skeleton';

export default function StoreDashboard() {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_reviews, setReviews] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;
    let productsLoaded = false;
    let ordersLoaded = false;
    let reviewsLoaded = false;
    const checkLoading = () => {
      if (productsLoaded && ordersLoaded && reviewsLoaded) {
        setLoading(false);
      }
    };
    const unsubs = [
      productService.subscribeToProducts((data) => {
        setProducts(data.filter(p => !p.vendorId || p.vendorId === userData.id));
        productsLoaded = true;
        checkLoading();
      }),
      orderService.subscribeToOrdersByStore(userData.id, (data) => {
        setOrders(data);
        ordersLoaded = true;
        checkLoading();
      }),
      reviewService.subscribeToReviewsByVendor(userData.id, (data) => {
        setReviews(data);
        reviewsLoaded = true;
        checkLoading();
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [userData]);

  const pendingOrders  = orders.filter(o => o.status === 'store');
  const _packedOrders  = orders.filter(o => o.status === 'packed'); // eslint-disable-line @typescript-eslint/no-unused-vars
  const outOfStock     = products.filter(p => p.stock === 0);
  const lowStock       = products.filter(p => p.stock > 0 && p.stock < 10);
  const totalSales     = orders
    .filter(o => o.status === 'completed')
    .reduce((s, o) => s + o.totalAmount, 0);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fadeIn">
      
      {/* ── Welcome Banner ── */}
      <div
        className="rounded-3xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)' }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-amber-100 text-sm font-medium">{greeting()}, 👋</p>
            <h1 className="text-2xl font-extrabold mt-0.5">{userData?.name || 'Store Partner'}</h1>
            <p className="text-amber-100 text-xs mt-1">
              {pendingOrders.length > 0
                ? `⚡ ${pendingOrders.length} new order${pendingOrders.length > 1 ? 's' : ''} waiting to be packed!`
                : '✅ All caught up! No pending orders.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard/store/inventory?action=add')}
              className="px-4 py-2.5 bg-white text-amber-700 rounded-xl text-xs font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              + Add Product
            </button>
            <button
              onClick={() => router.push('/dashboard/store/orders')}
              className="px-4 py-2.5 bg-white/20 backdrop-blur text-white border border-white/30 rounded-xl text-xs font-bold hover:bg-white/30 transition-all"
            >
              View Orders
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`stat-skel-${i}`} className="bg-slate-100 p-5 rounded-2xl border border-white shadow-sm flex flex-col gap-3">
              <Skeleton width="40px" height="40px" className="rounded-xl" />
              <div className="space-y-1.5 mt-1">
                <Skeleton width="60%" height="12px" className="rounded" />
                <Skeleton width="40%" height="24px" className="rounded" />
              </div>
              <Skeleton width="80%" height="10px" className="rounded mt-1" />
            </div>
          ))
        ) : (
          [
            {
              label: 'New Orders',
              value: pendingOrders.length,
              sub: 'Waiting to pack',
              icon: '📥',
              bg: 'from-amber-50 to-amber-100/50',
              iconBg: '#d9770620',
              iconColor: '#b45309',
              textColor: '#b45309',
              urgent: pendingOrders.length > 0,
              onClick: () => router.push('/dashboard/store/orders'),
            },
            {
              label: 'Total Products',
              value: products.length,
              sub: `${lowStock.length} low stock`,
              icon: '📦',
              bg: 'from-amber-50 to-amber-100/50',
              iconBg: '#f59e0b20',
              iconColor: '#d97706',
              textColor: '#d97706',
              onClick: () => router.push('/dashboard/store/inventory'),
            },
            {
              label: 'Total Sales',
              value: `₹${totalSales.toLocaleString('en-IN')}`,
              sub: `${orders.filter(o => o.status === 'completed').length} orders`,
              icon: '💰',
              bg: 'from-yellow-50 to-yellow-100/50',
              iconBg: '#fbbf2420',
              iconColor: '#d97706',
              textColor: '#d97706',
            },
            {
              label: 'Out of Stock',
              value: outOfStock.length,
              sub: outOfStock.length > 0 ? 'Needs restocking' : 'All stocked up!',
              icon: '⚠️',
              bg: outOfStock.length > 0 ? 'from-rose-50 to-rose-100/50' : 'from-slate-50 to-slate-100/50',
              iconBg: outOfStock.length > 0 ? '#ef444420' : '#94a3b820',
              iconColor: outOfStock.length > 0 ? '#dc2626' : '#94a3b8',
              textColor: outOfStock.length > 0 ? '#dc2626' : '#64748b',
              onClick: () => router.push('/dashboard/store/inventory?filter=out'),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              onClick={stat.onClick}
              className={`bg-gradient-to-br ${stat.bg} p-5 rounded-2xl border border-amber-200/40 shadow-sm transition-all duration-200 ${stat.onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''} ${stat.urgent ? 'ring-2 ring-amber-400/40 animate-pulse-slow' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: stat.iconBg }}>
                  {stat.icon}
                </div>
                {stat.urgent && (
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-600 text-white animate-bounce">NEW</span>
                )}
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black mt-0.5" style={{ color: stat.textColor }}>{stat.value}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{stat.sub}</p>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Pending Orders ── */}
        <div className="lg:col-span-3 glass rounded-3xl border border-amber-200/50 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-amber-100/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900">Pending Orders</h3>
              {pendingOrders.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {pendingOrders.length}
                </span>
              )}
            </div>
            <button onClick={() => router.push('/dashboard/store/orders')} className="text-[10px] font-bold text-amber-600 hover:underline uppercase tracking-wide">
              View All →
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={`order-skel-${i}`} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton width="36px" height="36px" className="rounded-xl shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton width="80px" height="14px" className="rounded" />
                      <Skeleton width="120px" height="10px" className="rounded" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Skeleton width="50px" height="16px" className="rounded" />
                    <Skeleton width="60px" height="14px" className="rounded-full" />
                  </div>
                </div>
              ))
            ) : pendingOrders.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-3xl mb-2">🎉</p>
                <p className="text-sm font-bold text-slate-400">No pending orders!</p>
                <p className="text-xs text-slate-300 mt-1">New orders will appear here</p>
              </div>
            ) : (
              pendingOrders.slice(0, 6).map((order) => (
                <div key={order.id} className="px-5 py-4 flex items-center justify-between hover:bg-amber-50/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-lg shrink-0">📦</div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-[10px] text-slate-400">
                        {order.items.length} item{order.items.length > 1 ? 's' : ''} •{' '}
                        {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {order.deliverySlot && (
                        <p className="text-[10px] font-bold text-amber-600 mt-0.5">⏱️ {order.deliverySlot}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">₹{order.totalAmount}</p>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Pack Now</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Inventory Quick View ── */}
        <div className="lg:col-span-2 glass rounded-3xl border border-amber-200/50 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-amber-100/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Inventory</h3>
            <button onClick={() => router.push('/dashboard/store/inventory')} className="text-[10px] font-bold text-amber-600 hover:underline uppercase tracking-wide">
              Manage →
            </button>
          </div>
          <div className="p-4 space-y-3">
            {/* Stock health bar */}
            <div className="bg-amber-50/30 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">Stock Health</p>
              {loading ? (
                <div className="space-y-3.5 py-1">
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                    <Skeleton className="h-full w-full" />
                  </div>
                  <div className="space-y-2.5">
                    {[1,2,3].map(i => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Skeleton width="8px" height="8px" className="rounded-full" />
                          <Skeleton width="55px" height="10px" />
                        </div>
                        <Skeleton width="16px" height="10px" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : products.length === 0 ? (
                <p className="text-xs text-slate-300 text-center py-3">No products yet</p>
              ) : (
                <div>
                  {/* Status chips */}
                  <div className="space-y-2">
                    {[
                      { label: 'In Stock', count: products.filter(p => p.stock >= 10).length, color: '#d97706', bg: '#fef3c7' },
                      { label: 'Low Stock', count: lowStock.length, color: '#f59e0b', bg: '#fffbeb' },
                      { label: 'Out of Stock', count: outOfStock.length, color: '#ef4444', bg: '#fee2e2' },
                    ].map(({ label, count, color, bg }) => (
                      <div key={label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                          <span className="text-[10px] font-medium text-slate-600">{label}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: bg, color }}>{count}</span>
                      </div>
                    ))}
                    <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                      {products.filter(p => p.stock >= 10).length > 0 && (
                        <div className="h-full bg-amber-600 transition-all duration-500 rounded-l-full" style={{ width: `${(products.filter(p => p.stock >= 10).length / products.length) * 100}%` }} />
                      )}
                      {lowStock.length > 0 && (
                        <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${(lowStock.length / products.length) * 100}%` }} />
                      )}
                      {outOfStock.length > 0 && (
                        <div className="h-full bg-red-400 transition-all duration-500 rounded-r-full" style={{ width: `${(outOfStock.length / products.length) * 100}%` }} />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent products */}
            <div className="space-y-2">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton width="40px" height="40px" className="rounded-xl shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton width="100px" height="12px" className="rounded" />
                      <Skeleton width="60px" height="10px" className="rounded" />
                    </div>
                  </div>
                ))
              ) : products.length === 0 ? (
                <p className="text-xs text-slate-300 text-center py-3">No products yet</p>
              ) : (
                products.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                       {p.imageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                         ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover rounded-xl" />
                         : p.emoji || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400">
                        ₹{p.price} ·{' '}
                        {p.stock === 0 ? (
                          <span className="text-red-600 font-extrabold animate-pulse">OOS</span>
                        ) : p.stock < 10 ? (
                          <span className="text-red-500 font-bold animate-pulse">Only {p.stock} left!</span>
                        ) : (
                          `${p.stock} left`
                        )}
                      </p>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        p.stock === 0 ? 'bg-red-500 animate-pulse' : p.stock < 10 ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'
                      }`}
                    />
                  </div>
                ))
              )}
            </div>
              {products.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-xs text-slate-300">Add your first product to get started</p>
                </div>
              )}
            </div>

            <button
              onClick={() => router.push('/dashboard/store/inventory?action=add')}
              className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold transition-colors"
            >
              + Add New Product
            </button>
          </div>
        </div>

      {/* ── Recent All Orders ── */}
      {orders.length > 0 && (
        <div className="glass rounded-3xl border border-amber-200/50 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-amber-100/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">All Recent Orders</h3>
            <button onClick={() => router.push('/dashboard/store/orders?filter=all')} className="text-[10px] font-bold text-amber-600 hover:underline uppercase tracking-wide">
              View All →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs block md:table">
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-amber-100">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Items</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Time</th>
                  <th className="text-left px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 block md:table-row-group">
                {orders.slice(0, 8).map(order => {
                  const statusMap: Record<string, { label: string; bg: string; color: string }> = {
                    store:     { label: 'Pending',   bg: '#fef3c7', color: '#b45309' },
                    packed:    { label: 'Packed',    bg: '#fffbeb', color: '#d97706' },
                    delivery:  { label: 'On Route',  bg: '#fffbeb', color: '#b45309' },
                    completed: { label: 'Delivered', bg: '#d1fae5', color: '#065f46' },
                    cancelled: { label: 'Cancelled', bg: '#fee2e2', color: '#b91c1c' },
                  };
                  const s = statusMap[order.status] || { label: order.status, bg: '#f1f5f9', color: '#64748b' };
                  return (
                    <tr key={order.id} className="hover:bg-amber-50/20 transition-colors block md:table-row border border-slate-100 md:border-0 rounded-2xl md:rounded-none p-4 md:p-0 mb-3 md:mb-0 bg-white md:bg-transparent">
                      <td className="px-0 md:px-5 py-2 md:py-3 font-bold text-slate-900 block md:table-cell text-left md:text-left before:content-['Order_ID:'] before:font-bold before:text-slate-400 before:mr-2 before:inline-block before:md:hidden">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-0 md:px-3 py-2 md:py-3 text-slate-500 block md:table-cell text-left md:text-left before:content-['Items:'] before:font-bold before:text-slate-400 before:mr-2 before:inline-block before:md:hidden">
                        {order.items.length} item{order.items.length > 1 ? 's' : ''}
                      </td>
                      <td className="px-0 md:px-3 py-2 md:py-3 font-bold text-slate-900 block md:table-cell text-left md:text-left before:content-['Amount:'] before:font-bold before:text-slate-400 before:mr-2 before:inline-block before:md:hidden">
                        ₹{order.totalAmount}
                      </td>
                      <td className="px-0 md:px-3 py-2 md:py-3 text-slate-400 block md:table-cell text-left md:text-left before:content-['Time:'] before:font-bold before:text-slate-400 before:mr-2 before:inline-block before:md:hidden">
                        <span className="inline-block md:block">{new Date(order.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        {order.deliverySlot && (
                          <span className="text-[10px] font-bold text-amber-600 ml-2 md:ml-0 md:mt-0.5 inline-block md:block">⏱️ {order.deliverySlot}</span>
                        )}
                      </td>
                      <td className="px-0 md:px-3 py-2 md:py-3 block md:table-cell text-left md:text-left before:content-['Status:'] before:font-bold before:text-slate-400 before:mr-2 before:inline-block before:md:hidden">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}