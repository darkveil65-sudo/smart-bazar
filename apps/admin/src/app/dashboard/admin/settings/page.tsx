'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { useAppConfig } from '@smart-bazar/shared/contexts/AppConfigContext';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { configService } from '@smart-bazar/shared/lib/services/configService';
import { DeliverySlotRule } from '@smart-bazar/shared/types/firestore';

type SettingTab = 'slots' | 'pricing' | 'merchant' | 'platform' | 'areas' | 'maintenance' | 'profile';

export default function SettingsPage() {
  const { userData } = useAuthStore();
  const { addToast }  = useToast();
  const { config, loading, updateConfig } = useAppConfig();

  const [activeTab, setActiveTab]   = useState<SettingTab>('slots');
  const [saving, setSaving]         = useState(false);
  const [profileName, setProfileName] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Local editable copies of config sections
  const [slots, setSlots]             = useState<DeliverySlotRule[]>([]);
  const [lateNight, setLateNight]     = useState('');
  const [pricing, setPricing]         = useState({ minOrderValue: 199, deliveryCharge: 20, freeDeliveryMin: 199, serviceFee: 0 });
  const [platform, setPlatform]       = useState({ businessName: '', supportPhone: '', supportEmail: '' });
  const [maintenance, setMaintenance] = useState({ maintenanceMode: false, maintenanceMessage: '' });
  const [areas, setAreas]             = useState<string[]>([]);
  const [newArea, setNewArea]         = useState('');

  // Merchant UPI and QR state
  const [merchantUpiId, setMerchantUpiId] = useState('');
  const [merchantUpiQrCode, setMerchantUpiQrCode] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);
  const [copiedField, setCopiedField] = useState<'upiId' | 'qrUrl' | null>(null);

  // Sync from live config when it loads
  useEffect(() => {
    if (!loading) {
      setSlots(config.deliverySlots ? [...config.deliverySlots] : []);
      setLateNight(config.lateNightSlot || '');
      setPricing({
        minOrderValue:   config.minOrderValue,
        deliveryCharge:  config.deliveryCharge,
        freeDeliveryMin: config.freeDeliveryMin,
        serviceFee:      config.serviceFee || 0,
      });
      setPlatform({
        businessName:  config.businessName,
        supportPhone:  config.supportPhone || '',
        supportEmail:  config.supportEmail || '',
      });
      setMaintenance({
        maintenanceMode:    config.maintenanceMode,
        maintenanceMessage: config.maintenanceMessage,
      });
      setAreas(config.deliveryAreas ? [...config.deliveryAreas] : []);
      setMerchantUpiId(config.merchantUpiId || '');
      setMerchantUpiQrCode(config.merchantUpiQrCode || '');
    }
  }, [loading, config]);

  useEffect(() => {
    if (userData?.name) setProfileName(userData.name);
  }, [userData]);

  // ── Copy helpers ──────────────────────────────────────────────────────────
  const copyToClipboard = (text: string, field: 'upiId' | 'qrUrl') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    addToast('📋 Copied to clipboard!', 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // ── QR Upload handler ─────────────────────────────────────────────────────
  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingQr(true);
    try {
      const url = await configService.uploadQrCode(file);
      setMerchantUpiQrCode(url);
      addToast('✅ QR code uploaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to upload QR code', 'error');
    } finally {
      setUploadingQr(false);
    }
  };

  const removeQrCode = () => {
    setMerchantUpiQrCode('');
    addToast('🗑️ QR Code URL cleared (remember to save changes)', 'success');
  };

  // ── Slot helpers ──────────────────────────────────────────────────────────
  const addSlot = () => {
    const newSlot: DeliverySlotRule = {
      id: `slot_${Date.now()}`,
      orderFrom: 0,
      orderTo: 1,
      deliveryLabel: 'Delivery Label',
      enabled: true,
    };
    setSlots(prev => [...prev, newSlot]);
  };

  const updateSlot = (id: string, field: keyof DeliverySlotRule, value: string | number | boolean) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const deleteSlot = (id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id));
  };

  const addArea = () => {
    const trimmed = newArea.trim();
    if (!trimmed) return;
    if (areas.map(a => a.toLowerCase()).includes(trimmed.toLowerCase())) return;
    setAreas(prev => [...prev, trimmed]);
    setNewArea('');
  };

  const removeArea = (idx: number) => setAreas(prev => prev.filter((_, i) => i !== idx));

  const saveAreas = async () => {
    setSaving(true);
    try {
      await updateConfig({ deliveryAreas: areas });
      addToast('✅ Delivery areas updated! Customers will see the new list.', 'success');
    } catch { addToast('Failed to save areas', 'error'); }
    finally { setSaving(false); }
  };

  // ── Validation Helpers ───────────────────────────────────────────────────
  const validateSlots = (): boolean => {
    const errs: Record<string, string> = {};
    slots.forEach(slot => {
      if (!slot.deliveryLabel.trim()) {
        errs[`slot_${slot.id}_label`] = 'Label is required';
      }
      if (slot.orderFrom >= slot.orderTo) {
        errs[`slot_${slot.id}_range`] = 'Start hour must be before end hour';
      }
    });

    setValidationErrors(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.startsWith('slot_')) delete next[k];
      });
      return { ...next, ...errs };
    });

    if (Object.keys(errs).length > 0) {
      addToast('❌ Please resolve slot validation errors.', 'error');
      return false;
    }
    return true;
  };

  const validatePricing = (): boolean => {
    const errs: Record<string, string> = {};
    if (pricing.minOrderValue < 0) errs.minOrderValue = 'Minimum order value cannot be negative';
    if (pricing.deliveryCharge < 0) errs.deliveryCharge = 'Delivery charge cannot be negative';
    if (pricing.freeDeliveryMin < 0) errs.freeDeliveryMin = 'Free delivery threshold cannot be negative';
    if (pricing.serviceFee < 0) errs.serviceFee = 'Service fee cannot be negative';

    setValidationErrors(prev => {
      const next = { ...prev };
      ['minOrderValue', 'deliveryCharge', 'freeDeliveryMin', 'serviceFee'].forEach(k => delete next[k]);
      return { ...next, ...errs };
    });

    if (Object.keys(errs).length > 0) {
      addToast('❌ Please resolve pricing validation errors.', 'error');
      return false;
    }
    return true;
  };

  const validateMerchant = (): boolean => {
    const errs: Record<string, string> = {};
    if (merchantUpiId) {
      const upiRegex = /^[\w.\-_]+@[\w\-]+$/;
      if (!upiRegex.test(merchantUpiId)) {
        errs.merchantUpiId = 'Must be a valid UPI ID (e.g., username@upi)';
      }
    }

    setValidationErrors(prev => {
      const next = { ...prev };
      delete next.merchantUpiId;
      return { ...next, ...errs };
    });

    if (Object.keys(errs).length > 0) {
      addToast('❌ Please resolve payment validation errors.', 'error');
      return false;
    }
    return true;
  };

  const validatePlatform = (): boolean => {
    const errs: Record<string, string> = {};
    if (!platform.businessName.trim()) {
      errs.businessName = 'Business name is required';
    }
    if (platform.supportPhone) {
      const phoneRegex = /^\+?[0-9\s\-()]{10,16}$/;
      if (!phoneRegex.test(platform.supportPhone)) {
        errs.supportPhone = 'Must be a valid phone number (10-15 digits)';
      }
    }
    if (platform.supportEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(platform.supportEmail)) {
        errs.supportEmail = 'Must be a valid email address';
      }
    }

    setValidationErrors(prev => {
      const next = { ...prev };
      ['businessName', 'supportPhone', 'supportEmail'].forEach(k => delete next[k]);
      return { ...next, ...errs };
    });

    if (Object.keys(errs).length > 0) {
      addToast('❌ Please resolve platform info validation errors.', 'error');
      return false;
    }
    return true;
  };

  const validateProfile = (): boolean => {
    const errs: Record<string, string> = {};
    if (!profileName.trim()) {
      errs.profileName = 'Full name is required';
    }

    setValidationErrors(prev => {
      const next = { ...prev };
      delete next.profileName;
      return { ...next, ...errs };
    });

    if (Object.keys(errs).length > 0) {
      addToast('❌ Please resolve profile validation errors.', 'error');
      return false;
    }
    return true;
  };

  // ── Save handlers ─────────────────────────────────────────────────────────
  const saveSlots = async () => {
    if (!validateSlots()) return;
    setSaving(true);
    try {
      await updateConfig({ deliverySlots: slots, lateNightSlot: lateNight });
      addToast('✅ Delivery slots updated! Changes live across all apps instantly.', 'success');
    } catch { addToast('Failed to save slots', 'error'); }
    finally   { setSaving(false); }
  };

  const savePricing = async () => {
    if (!validatePricing()) return;
    setSaving(true);
    try {
      await updateConfig(pricing);
      addToast('✅ Pricing rules & fees updated!', 'success');
    } catch { addToast('Failed to save pricing', 'error'); }
    finally   { setSaving(false); }
  };

  const saveMerchant = async () => {
    if (!validateMerchant()) return;
    setSaving(true);
    try {
      await updateConfig({ merchantUpiId, merchantUpiQrCode });
      addToast('✅ Merchant UPI & QR configuration updated!', 'success');
    } catch { addToast('Failed to save merchant payment settings', 'error'); }
    finally   { setSaving(false); }
  };

  const savePlatform = async () => {
    if (!validatePlatform()) return;
    setSaving(true);
    try {
      await updateConfig(platform);
      addToast('✅ Platform info updated!', 'success');
    } catch { addToast('Failed to save', 'error'); }
    finally   { setSaving(false); }
  };

  const saveMaintenance = async (mode: boolean) => {
    setSaving(true);
    try {
      const updated = { ...maintenance, maintenanceMode: mode };
      setMaintenance(updated);
      await updateConfig(updated);
      addToast(mode ? '🔴 Maintenance mode ENABLED. Customer app is now paused.' : '🟢 Maintenance mode OFF. Customer app is live!', mode ? 'error' : 'success');
    } catch { addToast('Failed to update', 'error'); }
    finally   { setSaving(false); }
  };

  const saveProfile = async () => {
    if (!userData?.id) return;
    if (!validateProfile()) return;
    setSaving(true);
    try {
      await userService.updateUser(userData.id, { name: profileName });
      addToast('✅ Profile updated!', 'success');
    } catch { addToast('Failed to update profile', 'error'); }
    finally   { setSaving(false); }
  };

  const formatHour = (h: number) => {
    if (h === 0)  return '12am';
    if (h < 12)  return `${h}am`;
    if (h === 12) return '12pm';
    return `${h - 12}pm`;
  };

  const tabs: { key: SettingTab; label: string; icon: string; desc: string }[] = [
    { key: 'slots',       label: 'Delivery Slots',  icon: '🕐', desc: 'Time windows' },
    { key: 'pricing',     label: 'Pricing & Fees',   icon: '💰', desc: 'Order & charges' },
    { key: 'merchant',    label: 'UPI & QR Code',   icon: '💳', desc: 'Accept payments' },
    { key: 'platform',    label: 'Platform Info',   icon: '🏪', desc: 'Brand & contact' },
    { key: 'areas',       label: 'Delivery Areas',  icon: '📍', desc: 'Area dropdown' },
    { key: 'maintenance', label: 'Maintenance',     icon: '🔴', desc: 'Go live / pause' },
    { key: 'profile',     label: 'My Profile',      icon: '👤', desc: 'Personal info' },
  ];

  if (loading) {
    return (
      <div className="animate-fadeIn max-w-5xl mx-auto">
        <div className="h-8 w-48 bg-muted rounded-xl animate-pulse mb-8" />
        <div className="grid grid-cols-7 gap-3 mb-8">
          {[1,2,3,4,5,6,7].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-muted rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn max-w-5xl mx-auto">
      {/* Warning indicator banner when active */}
      {config.maintenanceMode && (
        <div className="mb-6 animate-pulse bg-gradient-to-r from-red-600 to-amber-500 text-white px-6 py-4 rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-red-500/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">⚠️</span>
            <div>
              <p className="font-extrabold text-sm tracking-wide uppercase">Maintenance Mode is Active</p>
              <p className="text-xs text-red-50">Customer apps are paused. Checking out is temporarily disabled.</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveTab('maintenance')}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs rounded-xl transition-all uppercase tracking-widest shrink-0 border border-white/10"
          >
            Configure Settings
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-foreground tracking-tight">Platform Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Change delivery slots, pricing, maintenance mode — <span className="font-bold text-primary">no code changes needed</span>. Updates are instant across all apps.
        </p>
      </div>

      {/* Tab Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-col items-start gap-1 px-4 py-3.5 rounded-2xl text-left border transition-all duration-200 cursor-pointer ${
              activeTab === tab.key
                ? 'bg-primary/10 text-primary border-primary/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-[1.02]'
                : 'bg-card border-border hover:border-border/80 text-muted-foreground hover:text-foreground hover:bg-card/80'
            }`}
          >
            <span className="text-2xl mb-1">{tab.icon}</span>
            <span className="text-xs font-bold leading-tight">{tab.label}</span>
            <span className="text-[10px] text-muted-foreground/75 mt-0.5">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: Delivery Slots ── */}
      {activeTab === 'slots' && (
        <div className="card-admin overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/10">
            <div>
              <h2 className="font-bold text-foreground">Time windows</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Define when orders placed in a time window will be delivered. Edits go live instantly.</p>
            </div>
            <button
              onClick={addSlot}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-xl transition-all hover:opacity-95 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-95 cursor-pointer bg-primary"
            >
              + Add Slot
            </button>
          </div>

          <div className="divide-y divide-border-light">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1">On</div>
              <div className="col-span-2">Order From</div>
              <div className="col-span-2">Order To</div>
              <div className="col-span-5">Delivery Label (shown to customer)</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            {slots.map((slot) => (
              <div key={slot.id} className="grid grid-cols-12 gap-3 items-center px-6 py-3.5 hover:bg-muted/10 transition-colors">
                {/* Enabled toggle */}
                <div className="col-span-1">
                  <button
                    onClick={() => updateSlot(slot.id, 'enabled', !slot.enabled)}
                    className={`w-8 h-5 rounded-full relative transition-all cursor-pointer ${slot.enabled ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${slot.enabled ? 'left-3.5' : 'left-0.5'}`} />
                  </button>
                </div>

                {/* Order From */}
                <div className="col-span-2">
                  <select
                    value={slot.orderFrom}
                    onChange={e => updateSlot(slot.id, 'orderFrom', Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs bg-muted/40 border border-border/80 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all duration-200"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i} className="bg-slate-900 text-foreground">{formatHour(i)}</option>
                    ))}
                  </select>
                </div>

                {/* Order To */}
                <div className="col-span-2">
                  <select
                    value={slot.orderTo}
                    onChange={e => updateSlot(slot.id, 'orderTo', Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs bg-muted/40 border border-border/80 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all duration-200"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i} className="bg-slate-900 text-foreground">{formatHour(i)}</option>
                    ))}
                  </select>
                </div>

                {/* Delivery Label */}
                <div className="col-span-5">
                  <input
                    type="text"
                    value={slot.deliveryLabel}
                    onChange={e => updateSlot(slot.id, 'deliveryLabel', e.target.value)}
                    placeholder="e.g. 9am - 10am"
                    className={`w-full px-3 py-1.5 text-xs bg-muted/40 border rounded-lg text-foreground focus:outline-none focus:ring-2 transition-all duration-200 ${
                      validationErrors[`slot_${slot.id}_label`] || validationErrors[`slot_${slot.id}_range`]
                        ? 'border-destructive/60 focus:ring-destructive/20 focus:border-destructive'
                        : 'border-border/80 focus:ring-primary/20 focus:border-primary'
                    }`}
                  />
                  {validationErrors[`slot_${slot.id}_label`] && (
                    <p className="text-destructive text-[10px] mt-1 font-bold animate-fadeIn">{validationErrors[`slot_${slot.id}_label`]}</p>
                  )}
                  {validationErrors[`slot_${slot.id}_range`] && (
                    <p className="text-destructive text-[10px] mt-1 font-bold animate-fadeIn">{validationErrors[`slot_${slot.id}_range`]}</p>
                  )}
                </div>

                {/* Delete */}
                <div className="col-span-2 flex justify-end">
                  <button
                    onClick={() => deleteSlot(slot.id)}
                    className="px-3 py-1.5 text-[10px] font-bold text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {slots.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <p className="text-3xl mb-2">🕐</p>
                <p className="text-sm font-medium">No delivery slots defined. Click &quot;+ Add Slot&quot; to add one.</p>
              </div>
            )}
          </div>

          {/* Late Night / Fallback Slot */}
          <div className="px-6 py-5 border-t border-border bg-warning/5">
            <label className="text-[10px] font-bold text-warning uppercase tracking-wider block mb-2">
              🌙 Late Night Fallback (shown when no slot matches)
            </label>
            <input
              type="text"
              value={lateNight}
              onChange={e => setLateNight(e.target.value)}
              placeholder="e.g. Tomorrow 9am - 10am"
              className="w-full max-w-sm px-3 py-2 text-xs bg-muted/40 border border-border/80 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            />
          </div>

          {/* Save Button */}
          <div className="px-6 py-4 border-t border-border flex justify-end bg-muted/5">
            <button
              onClick={saveSlots}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-all hover:opacity-95 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-95 cursor-pointer bg-primary"
            >
              {saving ? '⏳ Saving...' : '💾 Save Delivery Slots'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: Delivery Areas ── */}
      {activeTab === 'areas' && (
        <div className="card-admin overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-muted/10">
            <h2 className="font-bold text-foreground">📍 Delivery Areas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage the list of areas available in the customer address form. Changes go live instantly.</p>
          </div>

          <div className="p-6">
            {/* Add new area */}
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={newArea}
                onChange={e => setNewArea(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addArea(); } }}
                placeholder="Type area name and press Enter or click Add..."
                className="flex-1 px-4 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
              />
              <button
                onClick={addArea}
                className="px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-95 flex items-center gap-1.5 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-95 shrink-0 bg-primary cursor-pointer"
              >
                + Add
              </button>
            </div>

            {/* Area chips */}
            {areas.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="text-3xl mb-2">📍</p>
                <p className="text-sm font-medium">No delivery areas added yet.</p>
                <p className="text-xs mt-1">Add areas using the input above.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {areas.map((area, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/25 rounded-xl shadow-sm">
                    <span className="text-xs font-bold text-primary">{area}</span>
                    <button
                      onClick={() => removeArea(i)}
                      className="w-4 h-4 rounded-full bg-primary/20 hover:bg-destructive/20 flex items-center justify-center text-primary hover:text-destructive transition-colors text-xs font-black cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 text-xs text-muted-foreground">
              {areas.length} area{areas.length !== 1 ? 's' : ''} configured
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border flex justify-end bg-muted/5">
            <button
              onClick={saveAreas}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-all hover:opacity-95 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-95 cursor-pointer bg-primary"
            >
              {saving ? '⏳ Saving...' : '💾 Save Areas'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: Pricing Rules & Fees ── */}
      {activeTab === 'pricing' && (
        <div className="card-admin overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-muted/10">
            <h2 className="font-bold text-foreground">💰 Pricing & Fees</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Control checkout pricing, service fees, and delivery parameters. Changes are live instantly.</p>
          </div>

          <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                key: 'minOrderValue' as const,
                label: 'Minimum Order Threshold',
                desc: 'Orders below this amount will be blocked at checkout',
                icon: '🛒',
                prefix: '₹',
              },
              {
                key: 'serviceFee' as const,
                label: 'Service Fee',
                desc: 'Administrative surcharge added to every transaction',
                icon: '🛠️',
                prefix: '₹',
              },
              {
                key: 'deliveryCharge' as const,
                label: 'Flat Delivery Charge',
                desc: 'Fee applied when cart is below the free threshold',
                icon: '🛵',
                prefix: '₹',
              },
              {
                key: 'freeDeliveryMin' as const,
                label: 'Free Delivery Threshold',
                desc: 'Delivery fee waived when cart total exceeds this',
                icon: '🎁',
                prefix: '₹',
              },
            ].map(field => (
              <div key={field.key} className="card-admin p-5 flex flex-col justify-between hover:scale-[1.02] duration-200">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl mb-3 shadow-inner font-bold">
                    {field.icon}
                  </div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    {field.label}
                  </label>
                  <p className="text-[10px] text-muted-foreground/70 mb-4 leading-relaxed min-h-[30px]">{field.desc}</p>
                </div>
                <div>
                  <div className={`flex items-center gap-2 bg-muted/40 rounded-xl border focus-within:ring-2 focus-within:shadow-md transition-all duration-200 px-3 py-2.5 ${
                    validationErrors[field.key]
                      ? 'border-destructive/60 focus-within:ring-destructive/20 focus-within:border-destructive'
                      : 'border-border/80 focus-within:ring-primary/20 focus-within:border-primary'
                  }`}>
                    <span className="text-sm font-extrabold text-muted-foreground/80">{field.prefix}</span>
                    <input
                      type="number"
                      value={pricing[field.key]}
                      onChange={e => setPricing(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                      className="flex-1 text-lg font-black text-foreground outline-none bg-transparent w-full"
                      min={0}
                    />
                  </div>
                  {validationErrors[field.key] && (
                    <p className="text-destructive text-[10px] mt-1 font-bold animate-fadeIn">{validationErrors[field.key]}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Live Preview */}
          <div className="px-6 pb-5">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 shadow-inner">
              <p className="text-xs font-bold text-primary mb-2.5 flex items-center gap-1.5">
                <span>📋</span> Live Checkout Formula Preview
              </p>
              <div className="text-xs text-muted-foreground space-y-1.5 font-medium leading-relaxed">
                <p>✓ Cart Subtotal must be at least <strong className="text-foreground font-extrabold">₹{pricing.minOrderValue}</strong> to place an order.</p>
                <p>✓ A service fee of <strong className="text-foreground font-extrabold">₹{pricing.serviceFee}</strong> will be added to every order.</p>
                {pricing.freeDeliveryMin > 0 ? (
                  <p>✓ Flat delivery charge of <strong className="text-foreground font-extrabold">₹{pricing.deliveryCharge}</strong> applies. It becomes <strong className="text-foreground font-extrabold">FREE</strong> for orders above <strong className="text-foreground font-extrabold">₹{pricing.freeDeliveryMin}</strong>.</p>
                ) : (
                  <p>✓ Flat delivery charge of <strong className="text-foreground font-extrabold">₹{pricing.deliveryCharge}</strong> applies to all orders.</p>
                )}
                <div className="pt-2 mt-2 border-t border-border text-muted-foreground font-semibold flex flex-wrap gap-x-4">
                  <span>Checkout calculation:</span>
                  <span className="font-extrabold text-foreground">Total = Subtotal + Service Fee ({pricing.serviceFee}) + Delivery Charge ({pricing.deliveryCharge} or 0)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border flex justify-end bg-muted/5">
            <button
              onClick={savePricing}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-all hover:opacity-95 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-95 cursor-pointer bg-primary"
            >
              {saving ? '⏳ Saving...' : '💾 Save Pricing Rules'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: Merchant UPI & QR ── */}
      {activeTab === 'merchant' && (
        <div className="card-admin overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-muted/10">
            <h2 className="font-bold text-foreground">💳 Merchant UPI & QR configuration</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Define your UPI address and upload a QR code. Customers will make payments directly to this account at checkout.</p>
          </div>

          <div className="p-6 grid md:grid-cols-12 gap-8">
            {/* Form inputs */}
            <div className="md:col-span-7 space-y-6">
              {/* UPI ID Input */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Merchant UPI ID Address
                </label>
                <div className="flex gap-2">
                  <div className={`flex-1 flex items-center gap-2.5 bg-muted/40 border focus-within:ring-2 focus-within:shadow-md transition-all duration-200 rounded-xl px-4 py-2.5 ${
                    validationErrors.merchantUpiId
                      ? 'border-destructive/60 focus-within:ring-destructive/20 focus-within:border-destructive'
                      : 'border-border/80 focus-within:ring-primary/20 focus-within:border-primary'
                  }`}>
                    <span className="text-lg leading-none">💸</span>
                    <input
                      type="text"
                      value={merchantUpiId}
                      onChange={e => setMerchantUpiId(e.target.value)}
                      placeholder="e.g. smartbazar@upi"
                      className="w-full text-sm font-semibold text-foreground outline-none bg-transparent"
                    />
                  </div>
                  <button
                    onClick={() => copyToClipboard(merchantUpiId, 'upiId')}
                    disabled={!merchantUpiId}
                    className="px-4 py-2.5 bg-muted/45 hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 border border-border disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    {copiedField === 'upiId' ? '✓ Copied!' : '📋 Copy ID'}
                  </button>
                </div>
                {validationErrors.merchantUpiId && (
                  <p className="text-destructive text-[10px] mt-1.5 font-bold animate-fadeIn">{validationErrors.merchantUpiId}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                  Important: Ensure this UPI address is active and correct. Payments are sent directly to this address.
                </p>
              </div>

              {/* QR File Upload / URL */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Payment QR Code Image
                </label>

                {merchantUpiQrCode ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2.5 bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                        <span className="text-muted-foreground/60">🔗</span>
                        <span className="truncate select-all">{merchantUpiQrCode}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(merchantUpiQrCode, 'qrUrl')}
                        className="px-4 py-2.5 bg-muted/45 hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-1.5 border border-border shrink-0 cursor-pointer"
                      >
                        {copiedField === 'qrUrl' ? '✓ Copied!' : '📋 Copy URL'}
                      </button>
                      <button
                        onClick={removeQrCode}
                        className="px-4 py-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold rounded-xl transition-all duration-150 flex items-center justify-center border border-destructive/25 shrink-0 cursor-pointer"
                      >
                        Remove QR
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
                      uploadingQr 
                        ? 'border-primary/40 bg-primary/5' 
                        : 'border-border/80 bg-muted/20 hover:bg-muted/40 hover:border-border'
                    }`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                        {uploadingQr ? (
                          <>
                            <div className="w-9 h-9 rounded-full border-4 border-primary border-t-transparent animate-spin mb-3" />
                            <p className="text-xs font-bold text-primary">Uploading QR image to Firebase...</p>
                          </>
                        ) : (
                          <>
                            <span className="text-3xl mb-2">📸</span>
                            <p className="text-xs font-bold text-foreground mb-1">Click or Drag QR Image to Upload</p>
                            <p className="text-[10px] text-muted-foreground">Supports PNG, JPG, or WEBP formats up to 5MB</p>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleQrUpload} 
                        disabled={uploadingQr} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Panel */}
            <div className="md:col-span-5 flex flex-col items-center justify-center bg-muted/20 border border-border rounded-3xl p-6 shadow-inner">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Customer Checkout UI Preview</p>
              
              <div className="w-full max-w-[230px] bg-slate-950/70 border border-border rounded-3xl shadow-xl overflow-hidden p-5 flex flex-col items-center text-center transition-all duration-300 hover:shadow-2xl">
                <div className="w-10 h-1 bg-muted/30 rounded-full mb-4" />
                <p className="text-xs font-black text-foreground">Scan & Pay via UPI</p>
                <p className="text-[9px] text-muted-foreground mb-4 leading-normal">Open any payment app (GPay, PhonePe, Paytm) to complete payment</p>
                
                {merchantUpiQrCode ? (
                  <div className="w-36 h-36 bg-white border border-border rounded-2xl flex items-center justify-center p-2 relative group overflow-hidden shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={merchantUpiQrCode} 
                      alt="Merchant QR Code Preview" 
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-36 h-36 bg-muted/10 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-4">
                    <span className="text-3xl mb-1">🖼️</span>
                    <span className="text-[9px] text-muted-foreground font-bold">No QR Uploaded</span>
                    <span className="text-[8px] text-muted-foreground/60 mt-0.5">Upload to show preview</span>
                  </div>
                )}

                <div className="w-full mt-4 bg-muted/10 rounded-xl p-2.5 border border-border/80">
                  <p className="text-[8px] text-muted-foreground uppercase font-black tracking-wider">UPI ID Address</p>
                  <p className="text-[10px] font-bold text-foreground truncate mt-0.5">{merchantUpiId || 'Not configured'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border flex justify-end bg-muted/5">
            <button
              onClick={saveMerchant}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-all hover:opacity-95 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-95 cursor-pointer bg-primary"
            >
              {saving ? '⏳ Saving...' : '💾 Save Merchant Settings'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: Platform Info ── */}
      {activeTab === 'platform' && (
        <div className="card-admin overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-muted/10">
            <h2 className="font-bold text-foreground">🏪 Platform Info</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Business name and contact details shown across the platform.</p>
          </div>

          <div className="p-6 space-y-5 max-w-lg">
            {[
              { key: 'businessName' as const, label: 'Business Name', placeholder: 'Allkart', type: 'text', icon: '🏪' },
              { key: 'supportPhone' as const, label: 'Support Phone', placeholder: '+91 98765 43210', type: 'tel', icon: '📞' },
              { key: 'supportEmail' as const, label: 'Support Email', placeholder: 'support@allkart.in', type: 'email', icon: '📧' },
            ].map(field => (
              <div key={field.key}>
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  <span>{field.icon}</span> {field.label}
                </label>
                <input
                  type={field.type}
                  value={platform[field.key]}
                  onChange={e => setPlatform(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className={`w-full px-4 py-3 bg-muted/40 border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 transition-all duration-200 ${
                    validationErrors[field.key]
                      ? 'border-destructive/60 focus:ring-destructive/20 focus:border-destructive'
                      : 'border-border/80 focus:ring-primary/20 focus:border-primary'
                  }`}
                />
                {validationErrors[field.key] && (
                  <p className="text-destructive text-[10px] mt-1 font-bold animate-fadeIn">{validationErrors[field.key]}</p>
                )}
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-border flex justify-end bg-muted/5">
            <button
              onClick={savePlatform}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-all hover:opacity-95 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-95 cursor-pointer bg-primary"
            >
              {saving ? '⏳ Saving...' : '💾 Save Platform Info'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: Maintenance Mode ── */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          {/* Status Card */}
          <div className={`card-admin p-8 text-center transition-all duration-300 ${
            maintenance.maintenanceMode
              ? 'bg-destructive/5 border-destructive/20 shadow-lg shadow-destructive/5'
              : 'bg-primary/5 border-primary/20 shadow-lg shadow-primary/5'
          }`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-5xl mx-auto mb-4 transition-all duration-300 ${
              maintenance.maintenanceMode ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
            }`}>
              {maintenance.maintenanceMode ? '🔴' : '🟢'}
            </div>
            <h2 className={`text-2xl font-black mb-2 tracking-tight ${
              maintenance.maintenanceMode ? 'text-destructive' : 'text-primary'
            }`}>
              {maintenance.maintenanceMode ? 'MAINTENANCE MODE IS ENABLED' : 'ALL PLATFORM SYSTEMS LIVE'}
            </h2>
            <p className={`text-sm mb-6 max-w-md mx-auto text-muted-foreground`}>
              {maintenance.maintenanceMode
                ? 'Customer app is currently paused and checkout is disabled. No new orders can be placed.'
                : 'Customer app is live and accepting orders normally.'}
            </p>
            <button
              onClick={() => saveMaintenance(!maintenance.maintenanceMode)}
              disabled={saving}
              className={`px-8 py-3 text-sm font-bold text-white rounded-2xl shadow-lg disabled:opacity-50 transition-all hover:scale-105 active:scale-95 duration-150 cursor-pointer ${
                maintenance.maintenanceMode
                  ? 'bg-primary hover:bg-primary-light shadow-primary/20'
                  : 'bg-destructive hover:bg-destructive-light shadow-destructive/20'
              }`}
            >
              {saving
                ? '⏳ Updating...'
                : maintenance.maintenanceMode
                  ? '🟢 Turn OFF Maintenance — Go Live'
                  : '🔴 Enable Maintenance Mode'}
            </button>
          </div>

          {/* Custom Message Card */}
          <div className="card-admin p-6">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              💬 Custom Maintenance Message (shown to customers)
            </label>
            <textarea
              value={maintenance.maintenanceMessage}
              onChange={e => setMaintenance(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
              rows={3}
              placeholder="We'll be back shortly! Thank you for your patience."
              className="w-full px-4 py-3 bg-muted/40 border border-border/80 rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 resize-none"
            />
            <button
              onClick={() => saveMaintenance(maintenance.maintenanceMode)}
              disabled={saving}
              className="mt-3 px-5 py-2 text-xs font-bold text-foreground bg-muted hover:bg-muted/80 rounded-xl transition-all border border-border/60 cursor-pointer"
            >
              {saving ? 'Saving...' : '💾 Save Message'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: My Profile ── */}
      {activeTab === 'profile' && (
        <div className="card-admin overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-muted/10">
            <h2 className="font-bold text-foreground">👤 My Profile</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Your personal account information.</p>
          </div>

          <div className="p-6 space-y-5 max-w-md">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-2xl text-white font-black">
                {(profileName || userData?.name || 'A')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-foreground">{userData?.name}</p>
                <p className="text-xs text-muted-foreground">{userData?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 uppercase">
                  {userData?.role}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                className={`w-full px-4 py-3 bg-muted/40 border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 transition-all duration-200 ${
                  validationErrors.profileName
                    ? 'border-destructive/60 focus:ring-destructive/20 focus:border-destructive'
                    : 'border-border/80 focus:ring-primary/20 focus:border-primary'
                }`}
              />
              {validationErrors.profileName && (
                <p className="text-destructive text-[10px] mt-1 font-bold animate-fadeIn">{validationErrors.profileName}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={userData?.email || ''}
                disabled
                className="w-full px-4 py-3 bg-muted/20 border border-border/80 rounded-xl text-sm text-muted-foreground/60 cursor-not-allowed"
              />
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full py-3 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-all hover:opacity-95 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-95 cursor-pointer bg-primary"
            >
              {saving ? '⏳ Saving...' : '💾 Update Profile'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
