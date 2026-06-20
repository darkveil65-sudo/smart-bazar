'use client';

import { useState, useEffect } from 'react';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { Order, UserData } from '@smart-bazar/shared/types/firestore';

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);

  useEffect(() => {
    const unsubs = [
      orderService.subscribeToOrders(setOrders),
      userService.subscribeToUsers(setUsers),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const stats = [
    { label: 'Life-time Revenue', value: `₹${totalRevenue.toLocaleString()}`, color: '#10b981', icon: '💰' },
    { label: 'Success Rate', value: `${orders.length ? Math.round((orders.filter(o => o.status === 'completed').length / orders.length) * 100) : 0}%`, color: '#06b6d4', icon: '📈' },
    { label: 'Active Customers', value: users.filter(u => u.role === 'customer').length, color: '#10b981', icon: '👥' },
    { label: 'Avg Order Value', value: `₹${orders.length ? Math.round(totalRevenue / (orders.filter(o => o.status === 'completed').length || 1)) : 0}`, color: '#f59e0b', icon: '🛍️' },
  ];

  return (
    <div className="animate-fadeIn">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Performance Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Deep dive into your shop&apos;s growth and revenue metrics</p>
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
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-current transition-all duration-1000" style={{ width: '70%', color: s.color }} />
              </div>
            </div>
          ))}
        </div>
    </div>
  );
}
