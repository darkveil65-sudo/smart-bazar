'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { storeService } from '@smart-bazar/shared/lib/services/storeService';
import { categoryService } from '@smart-bazar/shared/lib/services/categoryService';
import { subCategoryService } from '@smart-bazar/shared/lib/services/subCategoryService';
import { Product, Store, Category, SubCategory, ProductVariant } from '@smart-bazar/shared/types/firestore';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import Skeleton from '@smart-bazar/shared/components/ui/Skeleton';

// ─── Constants ────────────────────────────────────────────────────────────────
const LOW_STOCK_THRESHOLD = 5;

type StockFilter = 'all' | 'in_stock' | 'low' | 'out';

const STOCK_FILTERS: { value: StockFilter; label: string; icon: string; color: string }[] = [
  { value: 'all', label: 'All Stock', icon: '📦', color: '#94a3b8' },
  { value: 'in_stock', label: 'In Stock', icon: '🟢', color: '#14b8a6' },
  { value: 'low', label: 'Low Stock', icon: '🟡', color: '#f97316' },
  { value: 'out', label: 'Out of Stock', icon: '🔴', color: '#f43f5e' },
];

function generateVariantId(): string {
  return 'var_' + Math.random().toString(36).slice(2, 8);
}

function getStockStatus(stock: number): 'in_stock' | 'low' | 'out' {
  if (stock <= 0) return 'out';
  if (stock < LOW_STOCK_THRESHOLD) return 'low';
  return 'in_stock';
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

const StockBadge = ({ stock }: { stock: number }) => {
  const status = getStockStatus(stock);
  const config = {
    in_stock: { label: 'In Stock', color: '#14b8a6', bg: 'rgba(20,184,166,0.12)', dot: '#14b8a6' },
    low: { label: 'Low Stock', color: '#f97316', bg: 'rgba(249,115,22,0.12)', dot: '#f97316' },
    out: { label: 'Out of Stock', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', dot: '#f43f5e' },
  }[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{ color: config.color, background: config.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
      {config.label}
    </span>
  );
};

// ─── Add Product Modal ─────────────────────────────────────────────────────────

interface AddProductModalProps {
  stores: Store[];
  onClose: () => void;
  onSuccess: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const AddProductModal = ({ stores, onClose, onSuccess, addToast }: AddProductModalProps) => {
  const multiImgRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    price: 0,
    mrp: 0,
    isVeg: true,
    tags: [],
    store: stores[0]?.id ?? 'furniture-store',
    stock: 0,
    description: '',
    isAvailable: true,
    category: '',
    subCategory: '',
    unit: '',
    imageUrl: '',
  });

  // Load categories when store changes
  useEffect(() => {
    if (!formData.store) return;
    categoryService.getCategories(formData.store).then((data) => {
      setCategories(data);
      setFormData((prev) => ({
        ...prev,
        category: data.find((c) => c.id === prev.category) ? prev.category : (data[0]?.id ?? ''),
      }));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.store]);

  // Load sub-categories when category changes
  useEffect(() => {
    if (!formData.category) { setSubCategories([]); return; }
    subCategoryService.getSubCategories(formData.category).then((data) => {
      setSubCategories(data);
      setFormData((prev) => ({
        ...prev,
        subCategory: data.find((c) => c.id === prev.subCategory) ? prev.subCategory : (data[0]?.id ?? ''),
      }));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category]);

  const handleMultiImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const toAdd = files.slice(0, Math.max(0, 5 - imagePreviews.length));
    setImageFiles((prev) => [...prev, ...toAdd]);
    toAdd.forEach((f) => setImagePreviews((prev) => [...prev, URL.createObjectURL(f)]));
    e.target.value = '';
  };

  const addVariant = () =>
    setVariants((prev) => [...prev, { id: generateVariantId(), name: '', price: 0, stock: 10 }]);
  const updateVariant = (id: string, field: keyof ProductVariant, value: string | number) =>
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  const removeVariant = (id: string) => setVariants((prev) => prev.filter((v) => v.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    if (!variants.length && !formData.price) return;
    setSaving(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        addToast('Uploading image…', 'info');
        const url = await productService.uploadProductImage(file);
        uploadedUrls.push(url);
      }
      const mainImageUrl = uploadedUrls[0] ?? '';
      const discountPercent =
        (formData.mrp ?? 0) > (formData.price ?? 0) && (formData.mrp ?? 0) > 0
          ? Math.round((((formData.mrp ?? 0) - (formData.price ?? 0)) / (formData.mrp ?? 1)) * 100)
          : 0;

      await productService.addProduct({
        ...(formData as Omit<Product, 'id'>),
        imageUrl: mainImageUrl,
        ...(uploadedUrls.length ? { images: uploadedUrls } : {}),
        ...(variants.length ? { variants } : {}),
        price: variants.length
          ? Math.min(...variants.map((v) => v.price ?? 0))
          : (formData.price ?? 0),
        stock: variants.length
          ? variants.reduce((s, v) => s + (v.stock ?? 0), 0)
          : (formData.stock ?? 0),
        discountPercent,
        vendorId: 'admin',
      } as Product);
      addToast('Product added successfully', 'success');
      onSuccess();
    } catch (err) {
      console.error('Failed to add product:', err);
      addToast('Failed to add product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const UNIT_PRESETS = ['1 piece', '500g', '1 kg', '250g', '200ml', '1 L', '6 pack'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 animate-fadeIn"
      style={{ background: 'rgba(9,14,26,0.8)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl border border-white/10 overflow-hidden animate-scaleIn flex flex-col"
        style={{
          maxHeight: '92vh',
          background: 'rgba(17,24,39,0.95)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0 border-b border-white/8"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,182,212,0.08) 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-emerald-500/15 border border-emerald-500/25">
              📦
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Add New Product</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Fill in product details to list in inventory</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-white/8 hover:text-white transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Multi-Image Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Product Images <span className="font-normal normal-case">(max 5)</span>
              </label>
              {imagePreviews.length < 5 && (
                <button
                  type="button"
                  onClick={() => multiImgRef.current?.click()}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  + Add Photo
                </button>
              )}
            </div>
            <input
              ref={multiImgRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleMultiImageChange}
              className="hidden"
            />
            {imagePreviews.length === 0 ? (
              <div
                onClick={() => multiImgRef.current?.click()}
                className="w-full h-28 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all border-2 border-dashed border-white/12 bg-white/3 hover:bg-white/5 hover:border-emerald-500/30"
              >
                <span className="text-3xl block mb-1">📸</span>
                <span className="text-xs font-bold text-muted-foreground">Click to upload photos</span>
                <span className="text-[10px] text-muted-foreground/60 mt-0.5">First image = main image</span>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="relative group">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                      <img src={src} alt={`img-${idx}`} className="w-full h-full object-cover" />
                    </div>
                    {idx === 0 && (
                      <span className="absolute bottom-0.5 left-0.5 text-[7px] font-black bg-primary text-white px-1 py-0.5 rounded-full leading-none">
                        MAIN
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreviews((p) => p.filter((_, i) => i !== idx));
                        setImageFiles((p) => p.filter((_, i) => i !== idx));
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 5 && (
                  <div
                    onClick={() => multiImgRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-white/12 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <span className="text-2xl text-muted-foreground">+</span>
                    <span className="text-[8px] text-muted-foreground font-bold mt-0.5">Add</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Basic Info
            </label>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Product name (e.g. Luxury Sofa Set)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-muted-foreground outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15 transition-all"
                required
              />
              <textarea
                placeholder="Short description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-muted-foreground outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15 transition-all resize-none h-20"
              />
            </div>
          </div>

          {/* Pricing */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Pricing
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                <input
                  type="number"
                  placeholder="Sale price"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full pl-8 pr-14 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15 transition-all"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                  PRICE
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                <input
                  type="number"
                  placeholder="MRP (original)"
                  value={formData.mrp || ''}
                  onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
                  className="w-full pl-8 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15 transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground bg-white/8 px-1.5 py-0.5 rounded-md">
                  MRP
                </span>
              </div>
            </div>
            {(formData.mrp ?? 0) > (formData.price ?? 0) && (formData.mrp ?? 0) > 0 && (
              <p className="text-[11px] text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                <span>🏷️</span>
                {Math.round((((formData.mrp ?? 0) - (formData.price ?? 0)) / (formData.mrp ?? 1)) * 100)}% discount will be saved automatically
              </p>
            )}
          </div>

          {/* Unit */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Unit / Quantity
            </label>
            <div className="flex gap-2 flex-wrap items-center">
              {UNIT_PRESETS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setFormData({ ...formData, unit: formData.unit === u ? '' : u })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all press-effect border ${
                    formData.unit === u
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10'
                  }`}
                >
                  {u}
                </button>
              ))}
              <input
                type="text"
                placeholder="Custom (e.g. 750ml)"
                value={UNIT_PRESETS.includes(formData.unit ?? '') ? '' : (formData.unit ?? '')}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="flex-1 min-w-[120px] px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-muted-foreground outline-none focus:border-emerald-500/40 transition-all"
              />
            </div>
          </div>

          {/* Store & Category */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
              Store &amp; Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <select
                  value={formData.store}
                  onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15 transition-all appearance-none cursor-pointer"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id} className="bg-slate-900">
                      {s.name}
                    </option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" width="12" height="12" viewBox="0 0 20 20" fill="none">
                  <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              {categories.length > 0 && (
                <div className="relative">
                  <select
                    value={formData.category ?? ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">-- Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" width="12" height="12" viewBox="0 0 20 20" fill="none">
                    <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              {subCategories.length > 0 && (
                <div className="relative col-span-2 mt-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                    Sub-Category *
                  </label>
                  <select
                    value={formData.subCategory ?? ''}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15 transition-all appearance-none cursor-pointer"
                    required
                  >
                    <option value="" className="bg-slate-900">-- Sub-Category --</option>
                    {subCategories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-[42px] pointer-events-none text-muted-foreground" width="12" height="12" viewBox="0 0 20 20" fill="none">
                    <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Variants <span className="font-normal normal-case">(size/weight/color)</span>
              </label>
              <button
                type="button"
                onClick={addVariant}
                className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black rounded-xl text-white press-effect"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}
              >
                + Add Variant
              </button>
            </div>
            {variants.length === 0 && (
              <div className="text-center py-3 rounded-2xl text-[11px] text-muted-foreground font-medium border-2 border-dashed border-white/8 bg-white/3">
                No variants — product has single price &amp; stock below
              </div>
            )}
            <div className="space-y-3">
              {variants.map((v, idx) => (
                <div key={v.id} className="p-3 rounded-2xl border border-white/10 bg-white/3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                      Variant {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeVariant(v.id)}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-bold px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-all"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: 'name', label: 'Name *', placeholder: 'e.g. 500g', type: 'text' },
                      { key: 'price', label: 'Price ₹ *', placeholder: '₹0', type: 'number' },
                      { key: 'mrp', label: 'MRP ₹', placeholder: '₹0', type: 'number' },
                      { key: 'stock', label: 'Stock *', placeholder: '0', type: 'number' },
                    ] as const).map(({ key, label, placeholder, type }) => (
                      <div key={key}>
                        <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">
                          {label}
                        </label>
                        <input
                          type={type}
                          placeholder={placeholder}
                          value={v[key] ?? ''}
                          onChange={(e) =>
                            updateVariant(v.id, key, type === 'number' ? Number(e.target.value) : e.target.value)
                          }
                          className="w-full px-2.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-emerald-500/40 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Base Stock — only if no variants */}
          {variants.length === 0 && (
            <>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={formData.stock || ''}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/15 transition-all"
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div
                    className="relative w-9 h-5 rounded-full transition-colors shrink-0"
                    style={{ background: formData.isAvailable ? 'var(--primary)' : 'rgba(255,255,255,0.15)' }}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={!!formData.isAvailable}
                      onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                    />
                    <div
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                      style={{ transform: formData.isAvailable ? 'translateX(16px)' : 'translateX(0)' }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-white">In Stock / Available</span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/8 flex gap-3 shrink-0 bg-white/3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-white/10 text-sm font-bold rounded-xl text-muted-foreground hover:bg-white/5 hover:text-white transition-all press-effect"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-[2] px-8 py-3 text-white text-sm font-bold rounded-xl transition-all press-effect disabled:opacity-60 flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
              boxShadow: '0 4px 16px rgba(20,184,166,0.35)',
            }}
          >
            {saving ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 019.8 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Saving…
              </>
            ) : (
              '+ Create Product'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Page Component ───────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [stores, setStores] = useState<Store[]>([]);

  // Load stores once
  useEffect(() => {
    storeService.getStores().then(setStores);
  }, []);

  // Real-time products subscription
  useEffect(() => {
    const unsub = productService.subscribeToProducts((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Derived: low stock items ───────────────────────────────────────────────
  const lowStockProducts = products.filter(
    (p) => p.stock > 0 && p.stock < LOW_STOCK_THRESHOLD
  );
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStore = selectedStore === 'all' || p.store === selectedStore;
    const matchStock: boolean = (() => {
      if (stockFilter === 'all') return true;
      const status = getStockStatus(p.stock);
      return status === stockFilter;
    })();
    return matchSearch && matchStore && matchStock;
  });

  // ── Stock count helpers for filter badges ──────────────────────────────────
  const stockCounts: Record<StockFilter, number> = {
    all: products.length,
    in_stock: products.filter((p) => getStockStatus(p.stock) === 'in_stock').length,
    low: products.filter((p) => getStockStatus(p.stock) === 'low').length,
    out: products.filter((p) => getStockStatus(p.stock) === 'out').length,
  };

  // ── Export CSV (UI only) ───────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    addToast('Export feature coming soon', 'info');
  }, [addToast]);

  // ── Handle delete ──────────────────────────────────────────────────────────
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productService.deleteProduct(id);
      addToast('Product removed', 'info');
    } catch (err) {
      console.error('Delete failed:', err);
      addToast('Delete failed', 'error');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fadeIn max-w-7xl mx-auto space-y-6">

      {/* ── Page Header ── */}
      <div className="glass rounded-2xl border border-white/10 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/8 via-transparent to-emerald-500/8 pointer-events-none" />
        <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-xl">
                📦
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Inventory Overview</h1>
            </div>
            <p className="text-muted-foreground text-sm max-w-lg">
              Cross-store product catalog — monitor stock levels, pricing, and availability in real time.
            </p>
          </div>
          <div className="flex gap-3">
            {/* Export button — UI only */}
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/12 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white text-xs font-bold transition-all press-effect"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M3 15v2a1 1 0 001 1h12a1 1 0 001-1v-2M10 3v10m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold press-effect transition-all"
              style={{
                background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                boxShadow: '0 4px 16px rgba(20,184,166,0.3)',
              }}
            >
              + Add Product
            </button>
          </div>
        </div>
      </div>

      {/* ── Low-Stock Alert Banner ── */}
      {!loading && (lowStockProducts.length > 0 || outOfStockCount > 0) && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="text-sm font-bold text-amber-300">Stock Alert</p>
              <p className="text-xs text-amber-400/80 mt-0.5">
                {lowStockProducts.length > 0 && (
                  <span>
                    <strong className="text-amber-300">{lowStockProducts.length}</strong>{' '}
                    {lowStockProducts.length === 1 ? 'product has' : 'products have'} low stock (under {LOW_STOCK_THRESHOLD} units)
                    {outOfStockCount > 0 && ' · '}
                  </span>
                )}
                {outOfStockCount > 0 && (
                  <span>
                    <strong className="text-rose-400">{outOfStockCount}</strong>{' '}
                    {outOfStockCount === 1 ? 'product is' : 'products are'} out of stock
                  </span>
                )}
              </p>
              {lowStockProducts.length > 0 && (
                <p className="text-[10px] text-amber-400/60 mt-1">
                  Low: {lowStockProducts.slice(0, 3).map((p) => p.name).join(', ')}
                  {lowStockProducts.length > 3 && ` +${lowStockProducts.length - 3} more`}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStockFilter('low')}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-amber-300 border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/20 transition-all press-effect"
          >
            View Low Stock
          </button>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="glass rounded-2xl border border-white/10 p-4 space-y-4">
        {/* Stock status filter tabs */}
        <div className="flex flex-wrap gap-2">
          {STOCK_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStockFilter(f.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all press-effect border ${
                stockFilter === f.value
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'text-muted-foreground border-white/8 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  stockFilter === f.value ? 'bg-emerald-500/25 text-emerald-300' : 'bg-white/8 text-muted-foreground'
                }`}
              >
                {stockCounts[f.value]}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Store filter row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">🔍</span>
            <input
              type="text"
              placeholder="Search products by name…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/8 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500/40 transition-all"
            />
          </div>
          <div className="relative sm:w-52">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500/40 transition-all appearance-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" width="12" height="12" viewBox="0 0 20 20" fill="none">
              <path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Inventory Table ── */}
      <div className="card-admin overflow-hidden">
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Product Catalog</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
            </p>
          </div>
          {/* Summary chips */}
          <div className="hidden md:flex gap-2">
            {[
              { label: 'Total SKUs', value: products.length, color: '#94a3b8' },
              { label: 'Low Stock', value: lowStockProducts.length, color: '#f59e0b' },
              { label: 'Out', value: outOfStockCount, color: '#f43f5e' },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-sm font-black" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Store</th>
                <th>Price</th>
                <th>Stock Qty</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                          <div className="flex-1 space-y-2">
                            <Skeleton width="120px" height="14px" className="rounded" />
                            <Skeleton width="160px" height="10px" className="rounded" />
                          </div>
                        </div>
                      </td>
                      <td><Skeleton width="80px" height="20px" className="rounded-md" /></td>
                      <td><Skeleton width="50px" height="14px" className="rounded" /></td>
                      <td><Skeleton width="70px" height="14px" className="rounded" /></td>
                      <td><Skeleton width="80px" height="24px" className="rounded-full" /></td>
                      <td>
                        <div className="flex gap-2 justify-end">
                          <Skeleton width="30px" height="30px" className="rounded-lg" />
                          <Skeleton width="30px" height="30px" className="rounded-lg" />
                        </div>
                      </td>
                    </tr>
                  ))
                : filteredProducts.map((p) => {
                    const stockStatus = getStockStatus(p.stock);
                    const storeName = stores.find((s) => s.id === p.store)?.name ?? p.store;
                    return (
                      <tr key={p.id} className="group">
                        {/* Product */}
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0">
                              {p.images?.[0] ?? p.imageUrl ? (
                                <img
                                  src={p.images?.[0] ?? p.imageUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="flex items-center justify-center w-full h-full text-lg">📦</span>
                              )}
                              {(p.images?.length ?? 0) > 1 && (
                                <span className="absolute bottom-0 right-0 text-[7px] font-black bg-black/70 text-white px-0.5 rounded-sm leading-tight">
                                  +{(p.images?.length ?? 1) - 1}
                                </span>
                              )}
                              {/* Low stock dot indicator */}
                              {stockStatus !== 'in_stock' && (
                                <span
                                  className="absolute top-0 left-0 w-2.5 h-2.5 rounded-full border-2 border-[#090e1a]"
                                  style={{
                                    background: stockStatus === 'out' ? '#f43f5e' : '#f59e0b',
                                  }}
                                />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-xs text-white group-hover:text-emerald-400 transition-colors">
                                {p.name}
                              </p>
                              {p.variants?.length ? (
                                <span className="text-[9px] font-bold text-purple-400 bg-purple-500/12 px-1.5 py-0.5 rounded-full">
                                  🎛️ {p.variants.length} variants
                                </span>
                              ) : (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                  {p.description ?? 'No description'}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Store */}
                        <td>
                          <span className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 text-[10px] font-bold border border-cyan-500/15">
                            {storeName}
                          </span>
                        </td>

                        {/* Price */}
                        <td>
                          <span className="font-bold text-emerald-400 text-sm">
                            {p.variants?.length ? (
                              <>₹{Math.min(...p.variants.map((v) => v.price ?? 0))}+</>
                            ) : (
                              <>₹{p.price}</>
                            )}
                          </span>
                          {(p.mrp ?? 0) > p.price && (
                            <p className="text-[10px] text-muted-foreground line-through">₹{p.mrp}</p>
                          )}
                        </td>

                        {/* Stock Quantity */}
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                background:
                                  stockStatus === 'in_stock'
                                    ? '#14b8a6'
                                    : stockStatus === 'low'
                                    ? '#f97316'
                                    : '#f43f5e',
                              }}
                            />
                            <span
                              className="font-mono text-[11px] font-bold"
                              style={{
                                color:
                                  stockStatus === 'in_stock'
                                    ? '#14b8a6'
                                    : stockStatus === 'low'
                                    ? '#f97316'
                                    : '#f43f5e',
                              }}
                            >
                              {p.stock} units
                            </span>
                          </div>
                        </td>

                        {/* Status badge */}
                        <td>
                          <StockBadge stock={p.stock} />
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="flex gap-2 items-center justify-end">
                            <button
                              type="button"
                              title="Edit product"
                              className="p-2 hover:bg-white/8 rounded-lg text-muted-foreground hover:text-primary transition-colors press-effect"
                            >
                              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                                <path
                                  d="M11 4H4a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              title="Delete product"
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-2 hover:bg-rose-500/10 rounded-lg text-muted-foreground hover:text-rose-400 transition-colors press-effect"
                            >
                              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                                <path
                                  d="M3 6h14m-1 0v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h2a2 2 0 012 2v2"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

              {/* Empty state */}
              {!loading && filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/8 flex items-center justify-center text-3xl">
                        📦
                      </div>
                      <p className="text-sm font-bold text-white">No products found</p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your filters or add a new product.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="mt-1 px-4 py-2 rounded-xl text-xs font-bold text-white press-effect"
                        style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}
                      >
                        + Add First Product
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Product Modal ── */}
      {isModalOpen && (
        <AddProductModal
          stores={stores}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => setIsModalOpen(false)}
          addToast={addToast}
        />
      )}
    </div>
  );
}
