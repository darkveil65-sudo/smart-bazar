'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@smart-bazar/shared/components/layout/DashboardLayout';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { Order, UserData } from '@smart-bazar/shared/types/firestore';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

const adminNav = [
  { label: 'Overview', href: '/dashboard/admin', icon: '📊' },
  { label: 'Inventory', href: '/dashboard/admin/inventory', icon: '📦' },
  { label: 'Analytics', href: '/dashboard/admin/analytics', icon: '📈' },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: '⚙️' },
];

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs = [
      orderService.subscribeToOrders(setOrders),
      userService.subscribeToUsers(setUsers),
    ];
    setLoading(false);
    return () => unsubs.forEach(u => u());
  }, []);

  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const stats = [
    { label: 'Life-time Revenue', value: `₹${totalRevenue.toLocaleString()}`, color: '#22c55e', icon: '💰' },
    { label: 'Success Rate', value: `${orders.length ? Math.round((orders.filter(o => o.status === 'completed').length / orders.length) * 100) : 0}%`, color: '#3b82f6', icon: '📈' },
    { label: 'Active Customers', value: users.filter(u => u.role === 'customer').length, color: '#8b5cf6', icon: '👥' },
    { label: 'Avg Order Value', value: `₹${orders.length ? Math.round(totalRevenue / (orders.filter(o => o.status === 'completed').length || 1)) : 0}`, color: '#f59e0b', icon: '🛍️' },
  ];

  return (
    <DashboardLayout title="Business Intelligence" navItems={adminNav} accentColor="#3b82f6">
      <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Performance Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Deep dive into your shop's growth and revenue metrics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 stagger">
          {stats.map((s, i) => (
            <div key={s.label} className="card-admin p-6 animate-fadeInUp" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${s.color}15` }}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</p>
                  <h3 className="text-2xl font-black tracking-tight" style={{ color: s.color }}>{s.value}</h3>
                </div>
              </div>
              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-current transition-all duration-1000" style={{ width: '70%', color: s.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue by Day Chart Placeholder */}
          <div className="lg:col-span-2 card-admin p-6">
            <h3 className="font-bold mb-6 flex justify-between items-center">
              <span>Revenue Growth</span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase px-2 py-1 bg-muted rounded-lg">Last 7 Days</span>
            </h3>
            <div className="h-64 flex items-end gap-3 px-2">
              {[40, 60, 45, 90, 65, 80, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div 
                    className="w-full bg-primary/20 hover:bg-primary transition-all rounded-t-lg relative" 
                    style={{ height: `${h}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      ₹{h*120}
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground">DAY {i+1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* User Distribution */}
          <div className="card-admin p-6">
            <h3 className="font-bold mb-6">User Distribution</h3>
            <div className="space-y-4">
              {[
                { label: 'Customers', count: users.filter(u => u.role === 'customer').length, color: '#22c55e' },
                { label: 'Store Partners', count: users.filter(u => u.role === 'store').length, color: '#3b82f6' },
                { label: 'Delivery Boys', count: users.filter(u => u.role === 'delivery').length, color: '#f59e0b' },
                { label: 'Staff/Managers', count: users.filter(u => u.role === 'manager' || u.role === 'co-admin').length, color: '#8b5cf6' },
              ].map((item) => (
                <div key={item.label} className="group">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                    <span className="text-[11px] font-black text-slate-900">{item.count}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-1000 group-hover:brightness-90" 
                      style={{ 
                        width: `${users.length ? (item.count / users.length) * 100 : 0}%`, 
                        backgroundColor: item.color 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <p className="text-[10px] font-bold text-primary mb-1 uppercase">Platform Insight</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your user base has grown by <span className="text-primary font-bold">14%</span> since last month. Most users are currently concentrated in the <span className="font-bold text-slate-900">Delivery</span> segment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
