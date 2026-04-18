'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@smart-bazar/shared/components/layout/DashboardLayout';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { Order, UserData } from '@smart-bazar/shared/types/firestore';
import { OrderStatusBadge } from '@smart-bazar/shared/components/ui/Badge';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

const managerNav = [
  { label: 'Overview', href: '/dashboard/manager', icon: '📋' },
  { label: 'Store Partners', href: '/dashboard/manager/stores', icon: '🏪' },
  { label: 'Delivery Team', href: '/dashboard/manager/delivery', icon: '🛵' },
  { label: 'Performance', href: '/dashboard/manager/reports', icon: '📊' },
];

export default function ManagerDashboard() {
  const { addToast } = useToast();
  const { userData } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'staff'>('orders');

  useEffect(() => {
    const unsubs = [
      orderService.subscribeToOrders(setOrders),
      userService.subscribeToUsers(setUsers),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const stats = {
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    activeStores: users.filter(u => u.role === 'store').length,
    deliveryOnline: users.filter(u => u.role === 'delivery').length,
    todaySales: orders.filter(o => o.status === 'completed' && new Date(o.createdAt).toDateString() === new Date().toDateString()).reduce((s,o) => s+o.totalAmount, 0),
  };

  return (
    <DashboardLayout title="Operations Hub" navItems={managerNav} accentColor="#10b981">
      <div className="animate-fadeIn">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manager Dashboard</h1>
          <p className="text-sm text-slate-500">Overseeing store and delivery operations</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
          {[
            { label: 'Pending Orders', value: stats.pendingOrders, icon: '🛒', color: '#10b981', sub: 'Needs Assignment' },
            { label: 'Active Stores', value: stats.activeStores, icon: '🏪', color: '#3b82f6', sub: 'Operational' },
            { label: 'Delivery Boys', value: stats.deliveryOnline, icon: '🛵', color: '#f59e0b', sub: 'Online Now' },
            { label: 'Today Revenue', value: `₹${stats.todaySales}`, icon: '💰', color: '#8b5cf6', sub: 'Live Stats' },
          ].map((s, i) => (
            <div key={s.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-fadeInUp" style={{ animationDelay: `${i*100}ms` }}>
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${s.color}10` }}>
                  {s.icon}
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase tracking-widest">LIVE</span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">{s.label}</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{s.value}</h3>
              <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> {s.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6 w-fit border border-slate-200">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'orders' ? 'bg-white text-[#10b981] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Live Orders
          </button>
          <button 
            onClick={() => setActiveTab('staff')}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'staff' ? 'bg-white text-[#10b981] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Staff Directory
          </button>
        </div>

        {/* Operational View */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden animate-scaleIn">
          {activeTab === 'orders' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Order Detail</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-900">#{o.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-500">{o.items.length} items • {new Date(o.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </td>
                      <td className="px-6 py-4">
                        <OrderStatusBadge status={o.status} />
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 text-sm">₹{o.totalAmount}</td>
                      <td className="px-6 py-4">
                        <button className="text-[10px] font-bold text-[#10b981] px-3 py-1.5 bg-[#10b981]10 rounded-lg hover:bg-[#10b981]20 transition-all uppercase">
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <p className="text-4xl mb-4">💤</p>
                        <p className="text-sm font-bold text-slate-400">No active orders right now</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.filter(u => u.role !== 'customer').map((u) => (
                <div key={u.id} className="p-4 rounded-2xl border border-slate-100 hover:border-[#10b981]30 hover:bg-slate-50/50 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                      {u.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{u.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{u.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">ONLINE</span>
                    <button className="text-[#10b981] font-bold hover:underline">View Performance</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}