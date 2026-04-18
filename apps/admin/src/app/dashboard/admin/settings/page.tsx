'use client';

import { useState } from 'react';
import DashboardLayout from '@smart-bazar/shared/components/layout/DashboardLayout';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { userService } from '@smart-bazar/shared/lib/services/userService';

const adminNav = [
  { label: 'Overview', href: '/dashboard/admin', icon: '📊' },
  { label: 'Inventory', href: '/dashboard/admin/inventory', icon: '📦' },
  { label: 'Analytics', href: '/dashboard/admin/analytics', icon: '📈' },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: '⚙️' },
];

export default function SettingsPage() {
  const { userData } = useAuthStore();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    email: userData?.email || '',
    businessName: 'Smart Bazar HQ',
    deliveryRadius: 10,
    minOrderValue: 199,
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.id) return;
    setLoading(true);
    try {
      await userService.updateUser(userData.id, { name: formData.name });
      addToast('Profile updated successfully', 'success');
     } catch (error) {
       console.error('Failed to update profile:', error);
       addToast('Failed to update profile', 'error');
     }
    finally { setLoading(false); }
  };

  return (
    <DashboardLayout title="System Settings" navItems={adminNav} accentColor="#3b82f6">
      <div className="animate-fadeIn max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Platform Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage global business rules and your personal profile</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile Settings */}
          <div className="card-admin p-6">
            <h3 className="font-bold mb-6 flex items-center gap-2">
              <span className="text-lg">👤</span> Personal Profile
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-3 bg-slate-50 border border-border rounded-xl text-sm text-slate-400 cursor-not-allowed"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-primary text-white text-xs font-bold rounded-xl shadow-blue press-effect disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>

          {/* Business Rules */}
          <div className="card-admin p-6">
            <h3 className="font-bold mb-6 flex items-center gap-2">
              <span className="text-lg">⚙️</span> Business Logic
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">Default Delivery Radius (km)</label>
                <input 
                  type="number" 
                  value={formData.deliveryRadius}
                  onChange={e => setFormData({...formData, deliveryRadius: Number(e.target.value)})}
                  className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase tracking-wider">Minimum Order Value (₹)</label>
                <input 
                  type="number" 
                  value={formData.minOrderValue}
                  onChange={e => setFormData({...formData, minOrderValue: Number(e.target.value)})}
                  className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm focus:border-primary outline-none transition-all"
                />
              </div>
              <button className="w-full py-3 border border-border text-xs font-bold rounded-xl hover:bg-muted transition-all">
                Update Global Constants
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="md:col-span-2 card-admin p-6 border-destructive/20 bg-destructive/[0.02]">
            <h3 className="font-bold text-destructive mb-6 flex items-center gap-2">
              <span className="text-lg">⚠️</span> Danger Zone
            </h3>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">Temporarily disable all customer orders across the platform.</p>
              </div>
              <button className="px-6 py-2.5 bg-destructive text-white text-xs font-bold rounded-xl shadow-lg hover:brightness-110 transition-all">
                Enable Maintenance
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-destructive/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Purge Logs</p>
                <p className="text-xs text-muted-foreground">Delete all system activity logs older than 30 days.</p>
              </div>
              <button className="px-6 py-2.5 border border-destructive/30 text-destructive text-xs font-bold rounded-xl hover:bg-destructive/5 transition-all">
                Force Purge
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
