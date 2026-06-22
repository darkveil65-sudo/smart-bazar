'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { applicationService } from '@smart-bazar/shared/lib/services/applicationService';
import { UserData, Order, Application } from '@smart-bazar/shared/types/firestore';
import { OrderStatusBadge } from '@smart-bazar/shared/components/ui/Badge';
import Skeleton from '@smart-bazar/shared/components/ui/Skeleton';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

export default function AdminDashboard() {
  const router = useRouter();
  const { addToast } = useToast();
  const { userData } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab] = useState<'overview'>('overview');

  useEffect(() => {
    if (!userData || (userData.role !== 'admin' && userData.role !== 'co-admin')) return;

    let usersLoaded = false;
    let ordersLoaded = false;
    let appsLoaded = false;

    const checkLoading = () => {
      if (usersLoaded && ordersLoaded && appsLoaded) {
        setLoading(false);
      }
    };

    const unsubs = [
      userService.subscribeToUsers((u) => { setUsers(u); usersLoaded = true; checkLoading(); }),
      orderService.subscribeToOrders((o) => { setOrders(o); ordersLoaded = true; checkLoading(); }),
      applicationService.subscribeToApplications((a) => { setApplications(a); appsLoaded = true; checkLoading(); }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [userData]);

  const stats = {
    totalUsers: users.length,
    totalOrders: orders.length,
    totalRevenue: orders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.totalAmount, 0),
    pendingOrders: orders.filter((o) => o.status === 'pending').length,
    pendingApps: applications.filter((a) => a.status === 'pending').length,
  };

  const Sparkline = ({ color }: { color: string }) => (
    <div className="absolute bottom-0 left-0 right-0 h-8 opacity-40 overflow-hidden rounded-b-2xl pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
        <path
          d="M0,25 Q15,10 30,20 T60,10 T100,20"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          className="animate-dash"
          style={{ strokeDasharray: 200, strokeDashoffset: 200 }}
        />
        <path
          d="M0,25 Q15,10 30,20 T60,10 T100,20 L100,30 L0,30 Z"
          fill={`url(#grad-${color.replace('#', '')})`}
        />
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );

  const handleApproveApp = async (app: Application) => {
    try {
      if (app.type === 'manager') {
        await applicationService.approveApplication(app.id, app, userData?.id || 'admin');
        await userService.updateUser(app.userId, { role: 'manager', status: 'active' });
      } else {
        await applicationService.approveApplication(app.id, app, userData?.id || 'admin');
      }
      addToast('Application approved successfully', 'success');
     } catch (error) {
       console.error('Failed to approve application:', error);
       addToast('Failed to approve application', 'error');
     }
  };

  const handleRejectApp = async (id: string) => {
    try {
      await applicationService.rejectApplication(id, userData?.id || 'admin');
      addToast('Application rejected', 'info');
     } catch (error) {
       console.error('Failed to reject application:', error);
       addToast('Failed to reject application', 'error');
     }
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊', href: '/dashboard/admin' },
    { key: 'users', label: 'User Directory', icon: '👥', href: '/dashboard/admin/users' },
    { key: 'orders', label: 'Live Orders', icon: '🛒', href: '/dashboard/admin/orders' },
    { key: 'banners', label: 'Hero Banners', icon: '🎨', href: '/dashboard/admin/banners' },
    { key: 'applications', label: 'Applications', icon: '📝', href: '/dashboard/admin/applications' },
    { key: 'settings', label: 'System Settings', icon: '⚙️', href: '/dashboard/admin/settings' },
  ] as const;

  return (
    <div className="animate-fadeIn max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-foreground tracking-tight">System Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time performance and management hub</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 stagger">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`stat-skel-${i}`} className="card-admin p-5">
              <div className="flex justify-between items-start mb-4">
                <Skeleton width="48px" height="48px" className="rounded-2xl" />
                <Skeleton width="40px" height="20px" className="rounded-full" />
              </div>
              <Skeleton width="60%" height="20px" className="mb-2" />
              <Skeleton width="40%" height="32px" className="mb-2" />
              <Skeleton width="80%" height="16px" />
            </div>
          ))
        ) : (
          [
            { label: 'Total Users', value: stats.totalUsers, sub: '+12% this week', icon: '👥', color: '#10b981' },
            { label: 'Active Orders', value: stats.totalOrders, sub: '8% increase', icon: '📦', color: '#06b6d4' },
            { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, sub: 'From completed orders', icon: '💰', color: '#10b981' },
            { label: 'Pending Tasks', value: stats.pendingApps + stats.pendingOrders, sub: 'Needs attention', icon: '⚡', color: '#f59e0b' },
          ].map((s, i) => (
            <div key={s.label} className="card-admin p-5 animate-fadeInUp relative overflow-hidden group hover:scale-[1.02] transition-all duration-300" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm" style={{ backgroundColor: `${s.color}15` }}>
                  {s.icon}
                </div>
                <div className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full ring-1 ring-success/20">LIVE</div>
              </div>
              <p className="text-sm font-medium text-muted-foreground relative z-10">{s.label}</p>
              <h3 className="text-2xl font-black mt-1 tracking-tight relative z-10">{s.value}</h3>
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1 relative z-10">
                <span className={s.label.includes('Tasks') ? 'text-warning' : 'text-success'}>●</span> {s.sub}
              </p>
              <Sparkline color={s.color} />
            </div>
          ))
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 p-1 bg-muted/20 rounded-2xl mb-8 w-fit border border-border/80">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              if (tab.key !== 'overview') {
                router.push(tab.href);
              }
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
              activeTab === tab.key
                ? 'bg-card text-primary border border-border/50 shadow-md scale-105'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.key === 'applications' && stats.pendingApps > 0 && (
              <span className="ml-1 w-5 h-5 bg-destructive text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {stats.pendingApps}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="animate-scaleIn">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders Table */}
          <div className="card-admin overflow-hidden">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-sm">Recent Activity</h3>
              <button 
                onClick={() => router.push('/dashboard/admin/orders')}
                className="text-xs text-primary font-bold hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={`act-skel-${i}`}>
                        <td className="py-3 px-4"><Skeleton width="80px" height="14px" /></td>
                        <td className="py-3 px-4"><Skeleton width="60px" height="20px" className="rounded-full" /></td>
                        <td className="py-3 px-4"><Skeleton width="50px" height="14px" /></td>
                        <td className="py-3 px-4"><Skeleton width="100px" height="14px" /></td>
                      </tr>
                    ))
                  ) : (
                    orders.slice(0, 6).map((order) => (
                      <tr key={order.id}>
                        <td className="font-mono text-[11px] font-bold">#{order.id.slice(0, 8).toUpperCase()}</td>
                        <td><OrderStatusBadge status={order.status} /></td>
                        <td className="font-bold text-primary">₹{order.totalAmount}</td>
                        <td className="text-muted-foreground text-[11px]">
                          <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                          {order.deliverySlot && (
                            <div className="text-[10px] font-bold text-emerald-500 mt-0.5">⏱️ {order.deliverySlot}</div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                  {!loading && orders.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No recent activity</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Applications list */}
          <div className="card-admin overflow-hidden">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-sm">Pending Verifications</h3>
              <button 
                onClick={() => router.push('/dashboard/admin/applications')} 
                className="text-xs text-primary font-bold hover:underline cursor-pointer"
              >
                Manage Apps
              </button>
            </div>
            <div className="divide-y divide-border-light">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={`app-skel-${i}`} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton width="40px" height="40px" className="rounded-xl shrink-0" />
                      <div className="space-y-1.5">
                        <Skeleton width="100px" height="14px" />
                        <Skeleton width="70px" height="10px" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton width="65px" height="28px" className="rounded-lg" />
                      <Skeleton width="60px" height="28px" className="rounded-lg" />
                    </div>
                  </div>
                ))
              ) : (
                applications.filter(a => a.status === 'pending').slice(0, 4).map((app) => (
                  <div key={app.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                        {app.type === 'store' ? '🏪' : '🛵'}
                      </div>
                      <div>
                        <p className="text-sm font-bold capitalize">{app.businessName || `${app.type} App`}</p>
                        <p className="text-[10px] text-muted-foreground">Applied: {new Date(app.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveApp(app)} className="px-3 py-1.5 bg-success text-white text-[10px] font-bold rounded-lg press-effect shadow-sm cursor-pointer">APPROVE</button>
                      <button onClick={() => handleRejectApp(app.id)} className="px-3 py-1.5 bg-destructive/10 text-destructive text-[10px] font-bold rounded-lg press-effect cursor-pointer">REJECT</button>
                    </div>
                  </div>
                ))
              )}
              {!loading && applications.filter(a => a.status === 'pending').length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-3xl mb-2">✅</p>
                  <p className="text-xs text-muted-foreground">All applications cleared!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}