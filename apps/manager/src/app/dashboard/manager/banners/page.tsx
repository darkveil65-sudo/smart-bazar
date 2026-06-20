'use client';

import { useState, useEffect, useRef } from 'react';
import { heroBannerService } from '@smart-bazar/shared/lib/services/heroBannerService';
import { HeroBanner } from '@smart-bazar/shared/types/firestore';
import Skeleton from '@smart-bazar/shared/components/ui/Skeleton';

const GRADIENT_PRESETS = [
  { label: 'Green Fresh',   value: 'linear-gradient(135deg, #004d20 0%, #00c853 60%, #1de9b6 100%)' },
  { label: 'Ocean Blue',    value: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 55%, #42a5f5 100%)' },
  { label: 'Purple Royal',  value: 'linear-gradient(135deg, #7c1fa8 0%, #ab47bc 55%, #ce93d8 100%)' },
  { label: 'Sunset Red',    value: 'linear-gradient(135deg, #b71c1c 0%, #e53935 55%, #ff8a65 100%)' },
  { label: 'Orange Warm',   value: 'linear-gradient(135deg, #e65100 0%, #f57c00 55%, #ffd54f 100%)' },
  { label: 'Teal Cool',     value: 'linear-gradient(135deg, #004d40 0%, #00695c 55%, #26a69a 100%)' },
  { label: 'Pink Festive',  value: 'linear-gradient(135deg, #880e4f 0%, #e91e63 55%, #f48fb1 100%)' },
  { label: 'Dark Premium',  value: 'linear-gradient(135deg, #0a1628 0%, #1e293b 55%, #334155 100%)' },
];

const BADGE_PRESETS = ['⚡ Express Delivery', '🌿 100% Fresh', '💰 Best Prices', '🎁 Special Offer', '🚴 Fast Delivery', '🔥 Hot Deals', '✨ New Arrivals', '🎉 Festival Sale'];

const EMPTY: Omit<HeroBanner, 'id'> = {
  headline: '',
  sub: '',
  badge: BADGE_PRESETS[0],
  cta: 'Shop Now',
  gradient: GRADIENT_PRESETS[0].value,
  imageUrl: '',
  isActive: true,
  order: 0,
};

export default function ManagerHeroBannerPage() {
  const [banners, setBanners]   = useState<HeroBanner[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editBanner, setEditBanner] = useState<HeroBanner | null>(null);
  const [form, setForm]         = useState<Omit<HeroBanner, 'id'>>(EMPTY);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = heroBannerService.subscribe((data) => {
      setBanners(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openAdd = () => {
    setEditBanner(null);
    setForm({ ...EMPTY, order: banners.length });
    setImageFile(null);
    setImagePreview('');
    setShowForm(true);
  };

  const openEdit = (b: HeroBanner) => {
    setEditBanner(b);
    setForm({ headline: b.headline, sub: b.sub, badge: b.badge, cta: b.cta, gradient: b.gradient, imageUrl: b.imageUrl ?? '', isActive: b.isActive, order: b.order });
    setImageFile(null);
    setImagePreview(b.imageUrl ?? '');
    setShowForm(true);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!form.headline.trim() || !form.sub.trim()) return alert('Headline and subtitle required');
    setSaving(true);
    try {
      if (editBanner) {
        await heroBannerService.update(editBanner.id, form, imageFile);
      } else {
        await heroBannerService.add(form, imageFile);
      }
      setShowForm(false);
    } catch (e) { console.error(e); alert('Error saving banner'); }
    setSaving(false);
  };

  const toggleActive = async (b: HeroBanner) => {
    await heroBannerService.toggleActive(b.id, !b.isActive);
  };

  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
    overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0a1628', margin: 0 }}>🎨 Hero Banners</h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>Manage promotional banners on the Customer home screen</p>
        </div>
        <button onClick={openAdd} style={{
          background: 'linear-gradient(135deg,#059669,#0891b2)', color: '#fff',
          border: 'none', borderRadius: 12, padding: '10px 20px',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(5,150,105,0.2)',
        }}>+ Add Banner</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ ...card, display: 'flex', overflow: 'hidden' }}>
              <Skeleton width={200} height={120} className="shrink-0 animate-shimmer" />
              <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div className="space-y-2">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Skeleton width="120px" height="18px" />
                    <Skeleton width="60px" height="18px" />
                  </div>
                  <Skeleton width="80%" height="14px" />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Skeleton width="50px" height="14px" />
                    <Skeleton width="80px" height="14px" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Skeleton width="60px" height="28px" />
                  <Skeleton width="80px" height="28px" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🖼️</div>
          <p style={{ fontWeight: 700, color: '#0a1628', fontSize: 16 }}>No banners yet</p>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Add your first hero banner</p>
          <button onClick={openAdd} style={{
            marginTop: 16, background: 'linear-gradient(135deg,#059669,#0891b2)', color: '#fff',
            border: 'none', borderRadius: 10, padding: '10px 24px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>+ Add First Banner</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {banners.map((b) => (
            <div key={b.id} style={{ ...card, display: 'flex', overflow: 'hidden', opacity: b.isActive ? 1 : 0.6 }}>
              <div style={{ flexShrink: 0, width: 200, height: 120, background: b.gradient, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {b.imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </>
                ) : (
                  <span style={{ fontSize: 40 }}>🛒</span>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', padding: '6px 10px' }}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: '#fff', margin: 0 }}>{b.headline}</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{b.sub}</p>
                </div>
              </div>
              <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0a1628' }}>{b.headline}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: b.isActive ? '#dcfce7' : '#f1f5f9', color: b.isActive ? '#16a34a' : '#94a3b8' }}>
                      {b.isActive ? '● Active' : '○ Inactive'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 4px' }}>{b.sub}</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 10, background: '#f1f5f9', borderRadius: 6, padding: '2px 8px', color: '#475569', fontWeight: 600 }}>{b.badge}</span>
                    <span style={{ fontSize: 10, background: '#f1f5f9', borderRadius: 6, padding: '2px 8px', color: '#475569', fontWeight: 600 }}>CTA: {b.cta}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => openEdit(b)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#ccfbf1', color: '#0f766e', border: 'none', cursor: 'pointer' }}>✏️ Edit</button>
                  <button onClick={() => toggleActive(b)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: b.isActive ? '#fff7ed' : '#ecfdf5', color: b.isActive ? '#c2410c' : '#059669', border: 'none', cursor: 'pointer' }}>
                    {b.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0a1628' }}>{editBanner ? '✏️ Edit Banner' : '+ New Banner'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Preview */}
            <div style={{ borderRadius: 16, background: form.gradient, padding: '20px', position: 'relative', overflow: 'hidden', marginBottom: 20, minHeight: 120 }}>
              <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
              <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.25)', color: '#fff', borderRadius: 12, padding: '3px 10px', fontWeight: 700 }}>{form.badge || 'Badge'}</span>
              <p style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: '8px 0 4px' }}>{form.headline || 'Headline'}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{form.sub || 'Sub-title'}</p>
              {imagePreview && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="" style={{ position: 'absolute', right: 16, bottom: 10, width: 70, height: 70, objectFit: 'contain' }} />
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Headline *</label>
                <input value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} placeholder="e.g. Fresh Groceries" maxLength={40}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Sub-title *</label>
                <input value={form.sub} onChange={e => setForm(f => ({ ...f, sub: e.target.value }))} placeholder="e.g. Delivered to your door" maxLength={60}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Badge</label>
                  <select value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}>
                    {BADGE_PRESETS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>CTA Button</label>
                  <input value={form.cta} onChange={e => setForm(f => ({ ...f, cta: e.target.value }))} placeholder="Shop Now" maxLength={20}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>Background Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {GRADIENT_PRESETS.map(g => (
                    <button key={g.value} onClick={() => setForm(f => ({ ...f, gradient: g.value }))} title={g.label}
                      style={{ width: 36, height: 36, borderRadius: 10, border: form.gradient === g.value ? '3px solid #0a1628' : '2px solid transparent', background: g.value, cursor: 'pointer', outline: 'none', transition: 'all 0.15s' }} />
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Banner Image (optional)</label>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '2px dashed #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                  {imagePreview ? '📷 Change Image' : '📷 Upload Image'}
                </button>
                {imagePreview && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    <button onClick={() => { setImageFile(null); setImagePreview(''); setForm(f => ({ ...f, imageUrl: '' })); }}
                      style={{ fontSize: 11, color: '#e11d48', background: '#fff1f2', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>Remove</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Display Order</label>
                  <input type="number" value={form.order} min={0} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Active</span>
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#64748b' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{
                flex: 2, padding: '12px', borderRadius: 12, border: 'none',
                background: saving ? '#94a3b8' : 'linear-gradient(135deg,#059669,#0891b2)',
                color: '#fff', fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
              }}>
                {saving ? 'Saving...' : editBanner ? '✓ Update Banner' : '✓ Add Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
