'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@smart-bazar/shared/components/layout/DashboardLayout';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { Product, Order } from '@smart-bazar/shared/types/firestore';
import { OrderStatusBadge } from '@smart-bazar/shared/components/ui/Badge';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

const storeNav = [
  { label: 'Overview', href: '/dashboard/store', icon: '🏪' },
  { label: 'My Products', href: '/dashboard/store/products', icon: '🎁' },
  { label: 'Active Orders', href: '/dashboard/store/orders', icon: '🔥' },
  { label: 'Profile', href: '/dashboard/store/settings', icon: '👤' },
];

export default function StoreDashboard() {
  const { addToast } = useToast();
  const { userData } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!userData) return;
    const unsubs = [
      productService.subscribeToProducts((data) => {
        // In a real app, we filter by storeId=userData.id
        setProducts(data.filter(p => !p.storeId || p.storeId === userData.id));
      }),
      orderService.subscribeToOrders((data) => {
        // In a real app, filter orders that contain items from this store
        setOrders(data);
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [userData]);

  const stats = {
    totalProducts: products.length,
    outOfStock: products.filter(p => p.stock === 0).length,
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    todaySales: orders.filter(o => o.status === 'completed').reduce((s,o) => s + o.totalAmount, 0),
  };

  return (
    <DashboardLayout title="Partner Center" navItems={storeNav} accentColor="#10b981">
      <div className="animate-fadeIn">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Store Dashboard</h1>
            <p className="text-sm text-slate-500">Welcome, {userData?.name || 'Partner'}</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-[#10b981] text-white text-xs font-bold rounded-xl shadow-lg press-effect"
          >
            + New Product
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
          {[
            { label: 'My Items', value: stats.totalProducts, icon: '📦', color: '#10b981' },
            { label: 'Pending Orders', value: stats.pendingOrders, icon: '📥', color: '#f59e0b' },
            { label: 'Total Sales', value: `₹${stats.todaySales}`, icon: '💰', color: '#3b82f6' },
            { label: 'Out of Stock', value: stats.outOfStock, icon: '⚠️', color: '#ef4444' },
          ].map((s, i) => (
            <div key={s.label} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${s.color}15` }}>
                  {s.icon}
                </div>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{s.value}</h3>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Orders */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Recent Orders</h3>
              <button className="text-[10px] font-bold text-[#10b981] hover:underline uppercase">View All</button>
            </div>
            <div className="divide-y divide-slate-50">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-900">#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[10px] text-slate-400 font-medium">₹{order.totalAmount} • {order.items.length} items</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
              ))}
              {orders.length === 0 && (
                <div className="px-6 py-20 text-center">
                  <p className="text-3xl mb-3">😴</p>
                  <p className="text-xs font-bold text-slate-400">No active orders</p>
                </div>
              )}
            </div>
          </div>

          {/* Low Stock Items */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Inventory Status</h3>
            </div>
            <div className="p-6 space-y-4">
              {products.slice(0, 5).map((p) => (
                <div key={p.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover bg-slate-50" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{p.name}</p>
                      <p className="text-[10px] text-slate-400">₹{p.price}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-bold ${p.stock < 5 ? 'text-destructive' : 'text-slate-500'}`}>
                      {p.stock} units left
                    </p>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div 
                        className={`h-full ${p.stock < 5 ? 'bg-destructive' : 'bg-[#10b981]'}`} 
                        style={{ width: `${Math.min(100, (p.stock / 20) * 100)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-xs font-medium">Your inventory is empty.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}