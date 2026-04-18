'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@smart-bazar/shared/components/layout/DashboardLayout';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { applicationService } from '@smart-bazar/shared/lib/services/applicationService';
import { UserData, Order, Application } from '@smart-bazar/shared/types/firestore';
import { CATEGORIES } from '@smart-bazar/shared/lib/constants';
import { OrderStatusBadge, RoleBadge } from '@smart-bazar/shared/components/ui/Badge';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

const adminNav = [
  { label: 'Overview', href: '/dashboard/admin', icon: '📊' },
  { label: 'Inventory', href: '/dashboard/admin/inventory', icon: '📦' },
  { label: 'Analytics', href: '/dashboard/admin/analytics', icon: '📈' },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: '⚙️' },
];

export default function AdminDashboard() {
  const { addToast } = useToast();
  const { userData } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders' | 'applications'>('overview');
  const [categoryModal, setCategoryModal] = useState<{ userId: string; current: string[] } | null>(null);
  
  // Search State
  const [userSearch, setUserSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  useEffect(() => {
    if (!userData || (userData.role !== 'admin' && userData.role !== 'co-admin')) return;

    const unsubs = [
      userService.subscribeToUsers(setUsers),
      orderService.subscribeToOrders(setOrders),
      applicationService.subscribeToApplications(setApplications),
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

  // Filtered Lists
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(orderSearch.toLowerCase()) || 
    o.status.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customerId.toLowerCase().includes(orderSearch.toLowerCase())
  );

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
      await applicationService.approveApplication(app.id);
      if (app.userId) {
        await userService.updateUser(app.userId, {
          role: app.type as UserData['role'],
          ...(app.storeCategory ? { assignedCategories: [app.storeCategory] } : {}),
        });
      }
      addToast('Application approved successfully', 'success');
     } catch (error) {
       console.error('Failed to approve application:', error);
       addToast('Failed to approve application', 'error');
     }
  };

  const handleRejectApp = async (id: string) => {
    try {
      await applicationService.rejectApplication(id);
      addToast('Application rejected', 'info');
     } catch (error) {
       console.error('Failed to reject application:', error);
       addToast('Failed to reject application', 'error');
     }
  };

  const handleAssignCategories = async (userId: string, categories: string[]) => {
    try {
      await userService.assignCategories(userId, categories);
      addToast('Categories assigned successfully', 'success');
      setCategoryModal(null);
     } catch (error) {
       console.error('Failed to assign categories:', error);
       addToast('Failed to assign categories', 'error');
     }
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'users', label: 'User Directory', icon: '👥' },
    { key: 'orders', label: 'Live Orders', icon: '🛒' },
    { key: 'applications', label: 'Applications', icon: '📝' },
  ] as const;

  return (
    <DashboardLayout title="Platform Control" navItems={adminNav} accentColor="#3b82f6">
      <div className="animate-fadeIn">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">System Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time performance and management hub</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 stagger">
          {[
            { label: 'Total Users', value: stats.totalUsers, sub: '+12% this week', icon: '👥', color: '#3b82f6' },
            { label: 'Active Orders', value: stats.totalOrders, sub: '8% increase', icon: '📦', color: '#8b5cf6' },
            { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, sub: 'From completed orders', icon: '💰', color: '#22c55e' },
            { label: 'Pending Task', value: stats.pendingApps + stats.pendingOrders, sub: 'Needs attention', icon: '⚡', color: '#f59e0b' },
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
                <span className={s.label.includes('Task') ? 'text-warning' : 'text-success'}>●</span> {s.sub}
              </p>
              <Sparkline color={s.color} />
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-2xl mb-8 w-fit border border-border/50">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === tab.key
                  ? 'bg-card text-primary shadow-md scale-105'
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
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Orders Table */}
              <div className="card-admin overflow-hidden">
                <div className="p-5 border-b border-border flex justify-between items-center">
                  <h3 className="font-bold text-sm">Recent Activity</h3>
                  <button className="text-xs text-primary font-bold hover:underline">View All</button>
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
                      {orders.slice(0, 6).map((order) => (
                        <tr key={order.id}>
                          <td className="font-mono text-[11px] font-bold">#{order.id.slice(0, 8).toUpperCase()}</td>
                          <td><OrderStatusBadge status={order.status} /></td>
                          <td className="font-bold text-primary">₹{order.totalAmount}</td>
                          <td className="text-muted-foreground text-[11px]">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {orders.length === 0 && (
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
                  <button onClick={() => setActiveTab('applications')} className="text-xs text-primary font-bold hover:underline">Manage Apps</button>
                </div>
                <div className="divide-y divide-border-light">
                  {applications.filter(a => a.status === 'pending').slice(0, 4).map((app) => (
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
                        <button onClick={() => handleApproveApp(app)} className="px-3 py-1.5 bg-success text-white text-[10px] font-bold rounded-lg press-effect shadow-sm">APPROVE</button>
                        <button onClick={() => handleRejectApp(app.id)} className="px-3 py-1.5 bg-destructive/10 text-destructive text-[10px] font-bold rounded-lg press-effect">REJECT</button>
                      </div>
                    </div>
                  ))}
                  {applications.filter(a => a.status === 'pending').length === 0 && (
                    <div className="py-12 text-center">
                      <p className="text-3xl mb-2">✅</p>
                      <p className="text-xs text-muted-foreground">All applications cleared!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="card-admin overflow-hidden">
              <div className="p-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-sm">User Management</h3>
                  <p className="text-[10px] text-muted-foreground">{filteredUsers.length} total members found</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border/50 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User Info</th>
                      <th>Account Role</th>
                      <th>Permissions</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                              {u.name[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-xs">{u.name}</p>
                              <p className="text-[10px] text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td><RoleBadge role={u.role} /></td>
                        <td>
                          {(u.role === 'manager' || u.role === 'store') ? (
                            <button
                              onClick={() => setCategoryModal({ userId: u.id, current: u.assignedCategories || [] })}
                              className="text-[10px] font-bold text-primary px-3 py-1 bg-primary/10 rounded-lg hover:bg-primary/20 transition-all"
                            >
                              Assign Categories
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Standard User</span>
                          )}
                        </td>
                        <td className="text-[10px] text-muted-foreground">
                          {u.createdAt ? (
                            (u.createdAt as any).toDate 
                              ? (u.createdAt as any).toDate().toLocaleDateString()
                              : new Date(u.createdAt).toLocaleDateString()
                          ) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <>
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="font-bold text-lg tracking-tight">Order Management <span className="text-sm font-normal text-muted-foreground">({filteredOrders.length})</span></h3>
                <div className="relative w-full sm:w-80">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
                  <input
                    type="text"
                    placeholder="Search order ID, status or customer..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="card-admin p-4 hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-muted-foreground font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="space-y-1 mb-4">
                    {order.items.slice(0, 2).map((item, idx) => (
                      <p key={idx} className="text-xs truncate font-medium flex justify-between">
                        <span>{item.name} <span className="text-muted-foreground">x{item.quantity}</span></span>
                      </p>
                    ))}
                    {order.items.length > 2 && <p className="text-[10px] text-primary font-bold">+{order.items.length - 2} more items</p>}
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-border-light">
                    <span className="text-lg font-extrabold text-primary">₹{order.totalAmount}</span>
                    <button className="p-2 bg-muted rounded-lg text-primary hover:bg-primary/10 transition-all">
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </div>
              ))}
              {filteredOrders.length === 0 && (
                <div className="col-span-full py-20 text-center card-admin">
                  <p className="text-4xl mb-3">🔍</p>
                  <p className="text-sm text-muted-foreground font-medium">No orders match your search criteria</p>
                  <button onClick={() => setOrderSearch('')} className="mt-4 text-xs font-bold text-primary hover:underline">Clear Search</button>
                </div>
              )}
            </div>
          </>
        )}

          {activeTab === 'applications' && (
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="card-admin p-5 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-border flex items-center justify-center text-3xl">
                      {app.type === 'store' ? '🏪' : '🛵'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold capitalize">{app.businessName || app.type}</h4>
                        <span className={`status-pill ${app.status === 'approved' ? 'bg-success/10 text-success' : app.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                          {app.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground max-w-sm">{app.businessAddress || 'No address provided'}</p>
                      {app.storeCategory && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500">CATEGORY:</span>
                          <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full uppercase">{app.storeCategory}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {app.status === 'pending' && (
                    <div className="flex gap-3">
                      <button onClick={() => handleApproveApp(app)} className="h-10 px-6 bg-primary text-white text-xs font-bold rounded-xl press-effect shadow-blue transition-transform">APPROVE PARTNER</button>
                      <button onClick={() => handleRejectApp(app.id)} className="h-10 px-6 border border-border text-muted-foreground text-xs font-bold rounded-xl press-effect hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-all">DECLINE</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Assignment Modal Overlay */}
      {categoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border animate-scaleIn">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-extrabold">Assign Category Permissions</h3>
              <button onClick={() => setCategoryModal(null)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs text-muted-foreground mb-4 font-medium uppercase tracking-wider">Select allowed categories</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {CATEGORIES.map((cat) => {
                  const isSelected = categoryModal.current.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        const next = isSelected
                          ? categoryModal.current.filter(c => c !== cat.id)
                          : [...categoryModal.current, cat.id];
                        setCategoryModal({ ...categoryModal, current: next });
                      }}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        isSelected ? 'border-primary bg-primary/5 shadow-inner' : 'border-border bg-card hover:bg-muted'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-slate-600'}`}>{cat.name}</span>
                      {isSelected && (
                        <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2.5 5l1.5 1.5 3.5-3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handleAssignCategories(categoryModal.userId, categoryModal.current)}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-blue press-effect"
              >
                Update Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}