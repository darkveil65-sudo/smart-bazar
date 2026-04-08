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
import Card from '@smart-bazar/shared/components/ui/Card';
import Button from '@smart-bazar/shared/components/ui/Button';
import Modal from '@smart-bazar/shared/components/ui/Modal';
import Select from '@smart-bazar/shared/components/ui/Select';
import Input from '@smart-bazar/shared/components/ui/Input';
import EmptyState from '@smart-bazar/shared/components/ui/EmptyState';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

const adminNav = [
  { label: 'Dashboard', href: '/dashboard/admin', icon: '📊' },
];

export default function AdminDashboard() {
  const { addToast } = useToast();
  const { userData } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders' | 'applications'>('overview');
  const [userModal, setUserModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState<{ userId: string; current: string[] } | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'customer' });

  useEffect(() => {
    const unsubs = [
      userService.subscribeToUsers(setUsers),
      orderService.subscribeToOrders(setOrders),
      applicationService.subscribeToApplications(setApplications),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const stats = {
    totalUsers: users.length,
    totalOrders: orders.length,
    totalRevenue: orders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.totalAmount, 0),
    pendingOrders: orders.filter((o) => o.status === 'pending').length,
    pendingApps: applications.filter((a) => a.status === 'pending').length,
  };

  const handleApproveApp = async (app: Application) => {
    try {
      await applicationService.approveApplication(app.id);
      if (app.userId) {
        await userService.updateUser(app.userId, {
          role: app.type as UserData['role'],
          ...(app.storeCategory ? { assignedCategories: [app.storeCategory] } : {}),
        });
      }
      addToast('Application approved', 'success');
    } catch { addToast('Failed to approve', 'error'); }
  };

  const handleRejectApp = async (id: string) => {
    try {
      await applicationService.rejectApplication(id);
      addToast('Application rejected', 'info');
    } catch { addToast('Failed to reject', 'error'); }
  };

  const handleAssignCategories = async (userId: string, categories: string[]) => {
    try {
      await userService.assignCategories(userId, categories);
      addToast('Categories assigned', 'success');
      setCategoryModal(null);
    } catch { addToast('Failed to assign', 'error'); }
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'users', label: 'Users', icon: '👥' },
    { key: 'orders', label: 'Orders', icon: '📦' },
    { key: 'applications', label: 'Applications', icon: '📋' },
  ] as const;

  return (
    <DashboardLayout title="Admin Dashboard" navItems={adminNav}>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
              ${activeTab === tab.key ? 'bg-primary text-white shadow-sm' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}
          >
            {tab.icon} {tab.label}
            {tab.key === 'applications' && stats.pendingApps > 0 && (
              <span className="ml-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center">{stats.pendingApps}</span>
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="animate-fadeIn">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[
              { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: '#3b82f6' },
              { label: 'Total Orders', value: stats.totalOrders, icon: '📦', color: '#8b5cf6' },
              { label: 'Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: '💰', color: '#22c55e' },
              { label: 'Pending Orders', value: stats.pendingOrders, icon: '⏳', color: '#f59e0b' },
            ].map((s) => (
              <Card key={s.label}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${s.color}15` }}>{s.icon}</div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {/* Recent orders */}
          <Card>
            <h3 className="font-semibold mb-3">Recent Orders</h3>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No orders yet</p>
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">#{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} items</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">₹{order.totalAmount}</p>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">All Users ({users.length})</h3>
          </div>
          {users.length === 0 ? (
            <EmptyState icon="👥" title="No users yet" />
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium">Email</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-left px-4 py-3 font-medium">Actions</th>
                  </tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">{u.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3">
                          {(u.role === 'manager' || u.role === 'co-admin') && (
                            <Button size="xs" variant="outline" onClick={() => setCategoryModal({ userId: u.id, current: u.assignedCategories || [] })}>
                              Categories
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Orders */}
      {activeTab === 'orders' && (
        <div className="animate-fadeIn">
          <h3 className="font-semibold mb-4">All Orders ({orders.length})</h3>
          {orders.length === 0 ? (
            <EmptyState icon="📦" title="No orders yet" />
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Card key={order.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">#{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{order.items.length} items • ₹{order.totalAmount}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString('en-IN')}</p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Applications */}
      {activeTab === 'applications' && (
        <div className="animate-fadeIn">
          <h3 className="font-semibold mb-4">Applications ({applications.length})</h3>
          {applications.length === 0 ? (
            <EmptyState icon="📋" title="No applications" description="Store and delivery applications will appear here" />
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <Card key={app.id}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium capitalize">{app.type} Application</p>
                      {app.businessName && <p className="text-xs text-muted-foreground">{app.businessName}</p>}
                      {app.storeCategory && <p className="text-xs text-muted-foreground">Category: {app.storeCategory}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(app.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {app.status === 'pending' ? (
                        <>
                          <Button size="xs" variant="primary" onClick={() => handleApproveApp(app)}>Approve</Button>
                          <Button size="xs" variant="danger" onClick={() => handleRejectApp(app.id)}>Reject</Button>
                        </>
                      ) : (
                        <span className={`text-xs font-medium ${app.status === 'approved' ? 'text-success' : 'text-destructive'}`}>
                          {app.status}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category Assignment Modal */}
      {categoryModal && (
        <Modal isOpen={true} onClose={() => setCategoryModal(null)} title="Assign Categories">
          <div className="space-y-3">
            {CATEGORIES.map((cat) => {
              const selected = categoryModal.current.includes(cat.id);
              return (
                <label key={cat.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => {
                      const newCats = selected
                        ? categoryModal.current.filter((c) => c !== cat.id)
                        : [...categoryModal.current, cat.id];
                      setCategoryModal({ ...categoryModal, current: newCats });
                    }}
                    className="rounded"
                  />
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.name}</span>
                </label>
              );
            })}
            <Button variant="primary" block onClick={() => handleAssignCategories(categoryModal.userId, categoryModal.current)}>
              Save Categories
            </Button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}