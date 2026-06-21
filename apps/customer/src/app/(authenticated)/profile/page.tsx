'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { useLanguage } from '@smart-bazar/shared/contexts/LanguageContext';
import { useAppConfig } from '@smart-bazar/shared/contexts/AppConfigContext';

import { type Address } from '@smart-bazar/shared/types/firestore';

export default function ProfilePage() {
  const router = useRouter();
  const { userData, logout } = useAuthStore();
  const { addToast } = useToast();
  const { t } = useLanguage();
  const { config } = useAppConfig();
  const dynamicAreas = config.deliveryAreas || [];

  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const syncTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' || 'light';
      setTheme(currentTheme);
    };
    window.addEventListener('theme-change', syncTheme);
    syncTheme();
    return () => window.removeEventListener('theme-change', syncTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('smart-bazar-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    window.dispatchEvent(new Event('theme-change'));
  };

  const [name, setName] = useState(userData?.name || '');
  const [addresses, setAddresses] = useState<Address[]>(userData?.addresses || []);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<Address>({
    customerName: '', mobile: '', area: '', para: '', street: '', city: '', state: '', pincode: '',
  });
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
    } finally { setLoading(false); }
  };

  const handleAddAddress = async () => {
    if (!newAddress.customerName?.trim() || !newAddress.mobile?.trim() || !newAddress.area) {
      addToast('Please fill all required fields', 'error');
      return;
    }
    if (!/^[0-9]{10,11}$/.test(newAddress.mobile?.replace(/\s/g, '') || '')) {
      addToast('Enter a valid 10-11 digit mobile number', 'error');
      return;
    }
    setLoading(true);
    try {
      const updatedAddresses = [...addresses, newAddress];
      await userService.updateUser(userData!.id, { addresses: updatedAddresses });
      setAddresses(updatedAddresses);
      setNewAddress({ customerName: '', mobile: '', area: '', para: '', street: '', city: '', state: '', pincode: '' });
      setShowAddAddress(false);
      addToast('Address saved ✓', 'success');
    } catch (error) {
      console.error('Failed to save address:', error);
      addToast('Failed to save address', 'error');
    } finally { setLoading(false); }
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
    } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const initial = userData?.name?.[0]?.toUpperCase() || 'U';
  const memberSince = userData?.createdAt
    ? new Date(userData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'N/A';

  const inputCls = 'w-full px-4 py-3 bg-muted/60 rounded-xl text-sm border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/50';

  return (
    <div className="animate-fadeIn pb-10">

      {/* -- Hero Banner -- */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #064e3b 0%, #065f46 40%, #059669 100%)', paddingBottom: 56 }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ position: 'absolute', top: 30, left: '60%', width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ padding: '20px 20px 0', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('profile.title')}</p>
            <button
              onClick={() => setEditingName(!editingName)}
              style={{ padding: '8px 14px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, backdropFilter: 'blur(8px)' }}
              className="press-effect"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M11.33 2.67a2.67 2.67 0 010 3.73L7.67 10l-4 1 1-4 3.66-4.33z" stroke="white" strokeWidth="1.5"/></svg>
              {t('profile.editProfile')}
            </button>
          </div>

          {/* Avatar row */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            {/* Big Avatar */}
            <div style={{
              width: 80, height: 80, borderRadius: 24, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))',
              border: '2.5px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 900, color: '#fff',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}>
              {initial}
            </div>
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}>
                {userData?.name || 'User'}
              </h1>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>{userData?.email}</p>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: 10, fontWeight: 800,
                padding: '3px 10px', borderRadius: 999, letterSpacing: '0.06em',
              }}>
                ⭐ {userData?.role?.toUpperCase() || 'CUSTOMER'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* -- Stats strip (overlapping hero) -- */}
      <div style={{ marginTop: -32, marginLeft: 16, marginRight: 16, position: 'relative', zIndex: 2 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          background: 'var(--card)', borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          {[
            { icon: '📦', label: t('profile.orders'), value: '—' },
            { icon: '💚', label: 'Saved', value: addresses.length.toString() },
            { icon: '⭐', label: 'Member', value: '2026' },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: '14px 8px', textAlign: 'center',
              borderRight: i < 2 ? '1px solid var(--border)' : 'none',
            }}>
              <p style={{ fontSize: 18, marginBottom: 2 }}>{stat.icon}</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--foreground)', lineHeight: 1 }}>{stat.value}</p>
              <p style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, marginTop: 2 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 16px 0' }}>

        {/* -- Edit Name Form -- */}
        {editingName && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 16, marginBottom: 16 }} className="animate-slideUp">
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Edit Name</p>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your full name" className={inputCls + ' mb-3'}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSaveName} disabled={loading} className="press-effect"
                style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditingName(false); setName(userData?.name || ''); }} className="press-effect"
                style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--foreground)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* -- Account Info -- */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Account Info</p>
          <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {[
              { icon: '✉️', label: 'Email', value: userData?.email || '—' },
              { icon: '📅', label: 'Member since', value: memberSince },
              { icon: '📱', label: 'Phone', value: (userData as any)?.phone || 'Not added' },
            ].map((row, i, arr) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {row.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600 }}>{row.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* -- Saved Addresses -- */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Saved Addresses</p>
            {!showAddAddress && (
              <button onClick={() => setShowAddAddress(true)} className="press-effect"
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, border: 'none', background: 'rgba(5,150,105,0.1)', color: '#059669', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                <span>＋</span> Add New
              </button>
            )}
          </div>

          {addresses.length === 0 && !showAddAddress && (
            <div style={{ background: 'var(--card)', border: '1.5px dashed var(--border)', borderRadius: 20, padding: '28px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📍</div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>No saved addresses</p>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 14 }}>Add your delivery address for faster checkout</p>
              <button onClick={() => setShowAddAddress(true)} className="press-effect"
                style={{ padding: '10px 24px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Add Address
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {addresses.map((addr, i) => (
              <div key={i} className="animate-fadeInUp"
                style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 14, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📍</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--foreground)' }}>{addr.customerName || userData?.name}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#059669', marginTop: 1 }}>{addr.mobile}</p>
                  <p style={{ fontSize: 12, color: 'var(--foreground)', marginTop: 3 }}>{addr.street}{addr.para ? `, ${addr.para}` : ''}</p>
                  <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>{addr.area}{addr.city ? `, ${addr.city}` : ''}{addr.state ? `, ${addr.state}` : ''} — {addr.pincode}</p>
                </div>
                <button onClick={() => handleDeleteAddress(i)} className="press-effect"
                  style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 15 15" fill="none"><path d="M1.5 3.5h12M5 3.5V2.333a.833.833 0 01.833-.833h3.334a.833.833 0 01.833.833V3.5M11.5 3.5l-.5 8a1 1 0 01-1 .95H5a1 1 0 01-1-.95l-.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            ))}
          </div>

          {/* Add Address Form */}
          {showAddAddress && (
            <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: 16, marginTop: 8 }} className="animate-slideUp">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>New Delivery Address</p>
                  <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>Fields marked * are required</p>
                </div>
                <button onClick={() => setShowAddAddress(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--muted-foreground)' }}>×</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* Row: Customer Name + Mobile */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Name *</label>
                    <input type="text" value={newAddress.customerName}
                      onChange={(e) => setNewAddress(a => ({ ...a, customerName: e.target.value }))}
                      placeholder="Full name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Mobile *</label>
                    <input type="tel" inputMode="numeric" maxLength={11} value={newAddress.mobile}
                      onChange={(e) => setNewAddress(a => ({ ...a, mobile: e.target.value.replace(/[^0-9]/g, '') }))}
                      placeholder="01XXXXXXXXX"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Area dropdown */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Area *</label>
                  <div style={{ position: 'relative' }}>
                    {dynamicAreas.length === 0 ? (
                      <div style={{ padding: '12px 14px', background: 'var(--muted)', borderRadius: 12, fontSize: 12, color: 'var(--muted-foreground)', border: '1.5px dashed var(--border)' }}>
                        ⏳ No areas configured yet — ask your admin to add delivery areas.
                      </div>
                    ) : (
                      <>
                        <select
                          value={newAddress.area}
                          onChange={(e) => setNewAddress(a => ({ ...a, area: e.target.value }))}
                          className={inputCls}
                          style={{ appearance: 'none', paddingRight: 36, cursor: 'pointer', color: newAddress.area ? 'var(--foreground)' : 'var(--muted-foreground)' }}
                        >
                          <option value="">Select Area *</option>
                          {dynamicAreas.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </>
                    )}
                  </div>
                </div>

                {/* Para / Neighbourhood */}
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Para / Neighbourhood</label>
                  <input type="text" value={newAddress.para}
                    onChange={(e) => setNewAddress(a => ({ ...a, para: e.target.value }))}
                    placeholder="e.g. Notun Para, West Para..."
                    className={inputCls}
                  />
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={handleAddAddress} disabled={loading} className="press-effect"
                    style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
                    {loading
                      ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <svg style={{ animation: 'spin 0.8s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/><path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>
                          Saving...
                        </span>
                      : '💾 Save Address'
                    }
                  </button>
                  <button onClick={() => { setShowAddAddress(false); setNewAddress({ customerName: '', mobile: '', area: '', para: '', street: '', city: '', state: '', pincode: '' }); }} className="press-effect"
                    style={{ padding: '13px 18px', borderRadius: 14, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--foreground)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* -- Preferences -- */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Preferences</p>
          <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>Dark Mode</p>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>Switch between dark and light appearance</p>
            </div>
            <button
              onClick={toggleTheme}
              style={{
                background: theme === 'dark' ? '#00c853' : 'var(--border-light)',
                border: 'none',
                width: 46,
                height: 26,
                borderRadius: 99,
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                padding: 0,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  position: 'absolute',
                  top: 3,
                  left: theme === 'dark' ? 23 : 3,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {theme === 'dark' ? (
                  <span style={{ fontSize: 10 }}>🌙</span>
                ) : (
                  <span style={{ fontSize: 10 }}>☀️</span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* -- Quick Links -- */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Quick Links</p>
          <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {[
              { icon: '📦', label: t('profile.orders'), sub: 'View your order history', action: () => router.push('/orders'), color: '#0ea5e9' },
              { icon: '🛒', label: 'Browse Products', sub: 'Shop premium furniture', action: () => router.push('/home'), color: '#10b981' },
              { icon: '🎁', label: 'Offers & Deals', sub: 'Special discounts for you', action: () => router.push('/home'), color: '#f59e0b' },
              { icon: '💬', label: t('profile.support'), sub: 'Help & FAQs', action: () => {}, color: '#8b5cf6' },
            ].map((link, i, arr) => (
              <button key={i} onClick={link.action} className="press-effect"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', textAlign: 'left' }}>
                <div style={{ width: 40, height: 40, borderRadius: 13, background: `${link.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {link.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{link.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{link.sub}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--muted-foreground)', flexShrink: 0 }}><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ))}
          </div>
        </div>

        {/* -- Logout -- */}
        {!confirmLogout ? (
          <button onClick={() => setConfirmLogout(true)} className="press-effect"
            style={{ width: '100%', padding: '14px 0', borderRadius: 18, border: '1.5px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)', color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M7 15.5H3.5A1.5 1.5 0 012 14V4a1.5 1.5 0 011.5-1.5H7M12 13l4-4m0 0L12 5m4 4H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {t('profile.logout')}
          </button>
        ) : (
          <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20, padding: 16 }} className="animate-slideUp">
            <p style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 12, color: 'var(--foreground)' }}>Are you sure you want to logout?</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleLogout} className="press-effect"
                style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: 'none', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Yes, Logout
              </button>
              <button onClick={() => setConfirmLogout(false)} className="press-effect"
                style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--foreground)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Version tag */}
        <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted-foreground)', marginTop: 24 }}>Smart Bazar v1.0 • Made with ❤️</p>
      </div>
    </div>
  );
}
