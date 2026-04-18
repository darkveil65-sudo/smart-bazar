'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { ROLES } from '@smart-bazar/shared/lib/constants';

interface Address {
  street: string;
  city: string;
  state: string;
  pincode: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { userData, logout } = useAuthStore();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(userData?.name || '');
  const [addresses, setAddresses] = useState<Address[]>(userData?.addresses || []);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<Address>({ street: '', city: '', state: '', pincode: '' });
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleSaveName = async () => {
    if (!userData || !name.trim()) return;
    setLoading(true);
    try {
      await userService.updateUser(userData.id, { name: name.trim() });
      addToast('Name updated ✓', 'success');
      setEditingName(false);
     } catch (error) {
       console.error('Failed to update name:', error);
       addToast('Failed to update name', 'error');
     }
  };

  const handleAddAddress = async () => {
    if (!newAddress.street || !newAddress.city || !newAddress.pincode) {
      addToast('Please fill required fields', 'error');
      return;
    }
    setLoading(true);
    try {
      const updatedAddresses = [...addresses, newAddress];
      await userService.updateUser(userData!.id, { addresses: updatedAddresses });
      setAddresses(updatedAddresses);
      setNewAddress({ street: '', city: '', state: '', pincode: '' });
      setShowAddAddress(false);
      addToast('Address saved ✓', 'success');
     } catch (error) {
       console.error('Failed to save address:', error);
       addToast('Failed to save address', 'error');
     }
  };

  const handleDeleteAddress = async (index: number) => {
    setLoading(true);
    try {
      const updated = addresses.filter((_, i) => i !== index);
      await userService.updateUser(userData!.id, { addresses: updated });
      setAddresses(updated);
      addToast('Address removed', 'info');
     } catch (error) {
       console.error('Failed to remove address:', error);
       addToast('Failed to remove address', 'error');
     }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const fieldClass = "w-full px-3.5 py-3 bg-muted rounded-xl text-sm border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-all";
  const labelClass = "block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide";

  const initial = userData?.name?.[0]?.toUpperCase() || 'U';
  const roleColor = userData?.role
    ? ROLES[userData.role as keyof typeof ROLES]?.color || '#059669'
    : '#059669';

  return (
    <div className="px-4 py-5 animate-fadeIn pb-8">
      {/* Profile Card */}
      <div
        className="relative overflow-hidden rounded-3xl p-5 mb-6"
        style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
      >
        <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/8 rounded-full" />
        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-extrabold text-white shrink-0">
            {initial}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-white truncate">{userData?.name || 'User'}</h2>
            <p className="text-white/75 text-xs truncate">{userData?.email}</p>
            <span
              className="mt-1.5 inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white"
            >
              {userData?.role?.toUpperCase() || 'CUSTOMER'}
            </span>
          </div>
          {/* Edit name button */}
          <button
            onClick={() => setEditingName(!editingName)}
            className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors press-effect"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.33 2.67a2.67 2.67 0 010 3.73L7.67 10l-4 1 1-4 3.66-4.33z" stroke="white" strokeWidth="1.3"/></svg>
          </button>
        </div>
      </div>

      {/* Edit Name Form */}
      {editingName && (
        <div className="bg-card rounded-2xl border border-border p-4 mb-5 animate-slideUp">
          <h3 className="font-bold text-sm mb-3">Edit Name</h3>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass + ' mb-3'}
            placeholder="Your full name"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveName}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold press-effect disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
            >
              {loading ? 'Saving...' : 'Save Name'}
            </button>
            <button
              onClick={() => { setEditingName(false); setName(userData?.name || ''); }}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors press-effect"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-card rounded-2xl border border-border divide-y divide-border mb-5">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-xl">✉️</span>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Email</p>
            <p className="text-sm font-semibold">{userData?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-xl">🗓️</span>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Member since</p>
            <p className="text-sm font-semibold">
              {userData?.createdAt
                ? new Date(userData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Saved Addresses */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Saved Addresses</h3>
          {!showAddAddress && (
            <button
              onClick={() => setShowAddAddress(true)}
              className="text-xs text-primary font-semibold px-2.5 py-1.5 bg-primary/8 rounded-lg press-effect"
            >
              + Add New
            </button>
          )}
        </div>

        {addresses.length === 0 && !showAddAddress && (
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <p className="text-3xl mb-2">📍</p>
            <p className="text-sm text-muted-foreground">No saved addresses</p>
            <button onClick={() => setShowAddAddress(true)} className="mt-3 text-sm text-primary font-semibold hover:underline">
              Add your first address
            </button>
          </div>
        )}

        <div className="space-y-2">
          {addresses.map((addr, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 flex items-start justify-between gap-3 animate-fadeInUp">
              <div className="flex gap-2.5 flex-1 min-w-0">
                <span className="text-lg mt-0.5">📍</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{addr.street}</p>
                  <p className="text-xs text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteAddress(i)}
                className="text-destructive shrink-0 press-effect p-1"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 3.5h12M5 3.5V2.333a.833.833 0 01.833-.833h3.334a.833.833 0 01.833.833V3.5M11.5 3.5l-.5 8a1 1 0 01-1 .95H5a1 1 0 01-1-.95l-.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          ))}
        </div>

        {/* Add Address Form */}
        {showAddAddress && (
          <div className="bg-card rounded-2xl border border-border p-4 mt-2 animate-slideUp">
            <h4 className="font-bold text-sm mb-3">New Address</h4>
            <div className="space-y-2.5">
              <div>
                <label className={labelClass}>Street / Area *</label>
                <input type="text" value={newAddress.street} onChange={(e) => setNewAddress((a) => ({ ...a, street: e.target.value }))} placeholder="House no, Street, Area" className={fieldClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>City *</label>
                  <input type="text" value={newAddress.city} onChange={(e) => setNewAddress((a) => ({ ...a, city: e.target.value }))} placeholder="City" className={fieldClass} />
                </div>
                <div>
                  <label className={labelClass}>Pincode *</label>
                  <input type="text" inputMode="numeric" maxLength={6} value={newAddress.pincode} onChange={(e) => setNewAddress((a) => ({ ...a, pincode: e.target.value }))} placeholder="Pincode" className={fieldClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input type="text" value={newAddress.state} onChange={(e) => setNewAddress((a) => ({ ...a, state: e.target.value }))} placeholder="State" className={fieldClass} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleAddAddress} disabled={loading} className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold press-effect disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  {loading ? 'Saving...' : 'Save Address'}
                </button>
                <button onClick={() => setShowAddAddress(false)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors press-effect">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="bg-card rounded-2xl border border-border divide-y divide-border mb-5">
        <button
          onClick={() => router.push('/orders')}
          className="flex items-center gap-3 px-4 py-3.5 w-full text-left hover:bg-muted/50 transition-colors press-effect"
        >
          <span className="text-xl">📦</span>
          <span className="text-sm font-medium flex-1">My Orders</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted-foreground"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button
          onClick={() => router.push('/home')}
          className="flex items-center gap-3 px-4 py-3.5 w-full text-left hover:bg-muted/50 transition-colors press-effect"
        >
          <span className="text-xl">🛒</span>
          <span className="text-sm font-medium flex-1">Browse Products</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-muted-foreground"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Logout */}
      {!confirmLogout ? (
        <button
          onClick={() => setConfirmLogout(true)}
          className="w-full py-3.5 rounded-2xl border-2 border-destructive/30 text-destructive font-semibold press-effect hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 15.5H3.5A1.5 1.5 0 012 14V4a1.5 1.5 0 011.5-1.5H7M12 13l4-4m0 0L12 5m4 4H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Logout
        </button>
      ) : (
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 animate-slideUp">
          <p className="text-sm font-semibold text-center mb-3">Are you sure you want to logout?</p>
          <div className="flex gap-2">
            <button
              onClick={handleLogout}
              className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-sm font-semibold press-effect"
            >
              Yes, Logout
            </button>
            <button
              onClick={() => setConfirmLogout(false)}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-colors press-effect"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Version */}
      <p className="text-center text-[10px] text-muted-foreground mt-6">Smart Bazar v1.0 • Made with ❤️</p>
    </div>
  );
}
