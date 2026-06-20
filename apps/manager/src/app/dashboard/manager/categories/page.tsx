'use client';

import { useState, useEffect } from 'react';
// Layout handled by parent
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { categoryService } from '@smart-bazar/shared/lib/services/categoryService';
import { subCategoryService } from '@smart-bazar/shared/lib/services/subCategoryService';
import { storeService } from '@smart-bazar/shared/lib/services/storeService';
import { Product, Category, Store, SubCategory } from '@smart-bazar/shared/types/firestore';
import { CATEGORY_MAP } from '@smart-bazar/shared/lib/constants';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

export default function ManagerCategoriesPage() {
  const { userData } = useAuthStore();
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStore, setActiveStore] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [dbStores, setDbStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tier3SubCategories, setTier3SubCategories] = useState<SubCategory[]>([]);
  // Alias for render code
  const activeCategory = activeStore;
  const setActiveCategory = setActiveStore;
  const allowedCats = dbStores;
  const subCategories = categories;

  const [form, setForm] = useState({
    name: '', price: '', mrp: '', unit: 'piece', stock: '10',
    description: '', emoji: '', imageUrl: '', store: '', category: '', subCategory: '', vendorId: '',
  });

  const allowedCat_ids = userData?.assignedCategories && userData.assignedCategories.length > 0
    ? userData.assignedCategories
    : null;

  useEffect(() => {
    storeService.getStores().then(all => {
      const filtered = allowedCat_ids ? all.filter(s => allowedCat_ids.includes(s.id as any)) : all;
      setDbStores(filtered);
      if (filtered.length > 0) setActiveStore(filtered[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsub = productService.subscribeToProducts(setProducts);
    setLoading(false);
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (form.store) {
      categoryService.getCategories(form.store).then(data => {
        setCategories(data);
        if (data.length > 0 && !data.find(c => c.id === form.category)) {
           setForm(prev => ({...prev, category: data[0].id}));
        } else if (data.length === 0) {
           setForm(prev => ({...prev, category: ''}));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.store]);

  useEffect(() => {
    if (form.category) {
      subCategoryService.getSubCategories(form.category).then(data => {
        setTier3SubCategories(data);
        if (data.length > 0 && !data.find(c => c.id === form.subCategory)) {
           setForm(prev => ({...prev, subCategory: data[0].id}));
        } else if (data.length === 0) {
           setForm(prev => ({...prev, subCategory: ''}));
        }
      });
    } else {
      setTier3SubCategories([]);
      setForm(prev => ({...prev, subCategory: ''}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  const filteredProducts = products.filter(p => p.store === activeStore);

  const openAdd = () => {
    setEditProduct(null);
    setForm({ name: '', price: '', mrp: '', unit: 'piece', stock: '10', description: '', emoji: '', imageUrl: '', store: activeStore, category: '', subCategory: '', vendorId: '' });
    setImageFile(null);
    setImagePreview('');
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name, price: String(p.price), mrp: p.mrp ? String(p.mrp) : '', unit: p.unit || 'piece', stock: String(p.stock),
      description: p.description || '', emoji: p.emoji || '', imageUrl: p.imageUrl || '',
      store: p.store || '', category: p.category || '', subCategory: p.subCategory || '', vendorId: p.vendorId || '',
    });
    setImageFile(null);
    setImagePreview(p.imageUrl || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { addToast('Product name required', 'error'); return; }
    const price = parseFloat(form.price);
    if (!price || price <= 0) { addToast('Valid price required', 'error'); return; }

    const mrp = parseFloat(form.mrp) || 0;
    const discountPercent = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

    setSaving(true);
    try {
      const baseData = {
        name: form.name.trim(),
        price,
        mrp,
        discountPercent,
        unit: form.unit,
        stock: parseInt(form.stock) || 10,
        description: form.description,
        emoji: form.emoji,
        imageUrl: form.imageUrl || '',   // existing URL or empty — image upload is async
        store: form.store,
        category: form.category,
        subCategory: form.subCategory, // <-- new
        vendorId: form.vendorId || '',
        isAvailable: true,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      let savedId = editProduct?.id || '';

      // ── 1. Save product data immediately ──
      if (editProduct) {
        await productService.updateProduct(editProduct.id, baseData);
      } else {
        savedId = await productService.addProduct(baseData);
      }

      // ── 2. Close modal right away ──
      setShowForm(false);
      addToast(editProduct ? 'Product updated ✅' : 'Product added ✅', 'success');

      // ── 3. Upload image in background (no waiting) ──
      if (imageFile && savedId) {
        productService.uploadProductImage(imageFile)
          .then(url => productService.updateProduct(savedId, { imageUrl: url }))
          .catch((error) => {
            console.error('Background product image upload failed:', error);
            addToast('Failed to upload product image. Please upload a valid image file.', 'error');
          });
      }
    } catch {
      addToast('Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };


  const handleDelete = async (productId: string) => {
    if (!confirm('Delete this product?')) return;
    setDeleting(productId);
    try {
      await productService.deleteProduct(productId);
      addToast('Product deleted', 'info');
    } catch {
      addToast('Delete failed', 'error');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-fadeIn">
      <div>
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Categories & Products</h1>
            <p className="text-sm text-slate-500">{products.length} products total</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-bold press-effect shadow-md"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            + Add Product
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 hide-scrollbar">
          {allowedCats.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat.id ? 'text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
              }`}
              style={activeCategory === cat.id ? { background: CATEGORY_MAP[cat.id]?.color || '#3b82f6' } : {}}
            >
              {cat.imageUrl ? (
                <img src={cat.imageUrl as string} alt="" className="w-5 h-5 rounded-md object-cover" />
              ) : (
                <span>{(cat as any).icon}</span>
              )}
              {cat.name}
              <span className={`min-w-[20px] h-4 px-1 rounded-full text-[10px] flex items-center justify-center ${
                activeCategory === cat.id ? 'bg-white/30' : 'bg-slate-100 text-slate-500'
              }`}>
                {products.filter(p => p.category === cat.id).length}
              </span>
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 h-36 animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center py-16 bg-white rounded-3xl border border-slate-100 border-dashed">
            <p className="text-4xl mb-3">
              {CATEGORY_MAP[activeCategory]?.imageUrl ? (
                <img src={CATEGORY_MAP[activeCategory].imageUrl as string} className="w-16 h-16 rounded-2xl object-cover mb-4" alt="" />
              ) : (
                (CATEGORY_MAP[activeCategory] as any)?.icon || '📦'
              )}
            </p>
            <p className="font-bold text-slate-400">No products in {CATEGORY_MAP[activeCategory]?.name}</p>
            <button onClick={openAdd} className="mt-4 text-emerald-600 font-bold text-sm hover:underline">
              + Add first product
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(p => {
              const catCfg = p.category ? CATEGORY_MAP[p.category] : undefined;
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all animate-fadeInUp group">
                  <div className="h-24 flex items-center justify-center text-4xl" style={{ background: catCfg?.bg }}>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                    ) : catCfg?.imageUrl ? (
                      <div className="w-full h-full overflow-hidden rounded-xl border border-border"><img src={catCfg.imageUrl as string} className="w-full h-full object-cover" alt="" /></div>
                    ) : (
                      <span>{p.emoji || (catCfg as any)?.icon || '📦'}</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-slate-900 leading-tight">{p.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-base font-black" style={{ color: catCfg?.color }}>₹{p.price}<span className="text-[10px] text-slate-400 font-normal">/{p.unit}</span></p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        p.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(p)}
                        className="flex-1 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p.id)}
                        disabled={deleting === p.id}
                        className="flex-1 py-1.5 text-[10px] font-bold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-all disabled:opacity-60">
                        {deleting === p.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-h-[94vh] flex flex-col overflow-hidden"
            style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>

            {/* ── Header ── */}
            <div className="px-6 pt-5 pb-4 shrink-0"
              style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">
                    {editProduct ? '✏️ Edit Product' : '➕ New Product'}
                  </h2>
                  <p className="text-[11px] text-emerald-300 mt-0.5">
                    {editProduct ? 'Update the product details below' : 'Fill in details to add to catalog'}
                  </p>
                </div>
                <button onClick={() => setShowForm(false)}
                  className="w-9 h-9 rounded-2xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all text-xl font-light">
                  ×
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-slate-50">

              {/* Image Upload — large centered */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 bg-white transition-all hover:border-emerald-400 group"
                style={{ minHeight: 140 }}>
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full object-cover" style={{ maxHeight: 180 }} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                      <label className="opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-white text-slate-800 text-xs font-bold px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
                        🔄 Change Image
                        <input type="file" accept="image/*" className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setImageFile(file);
                              const reader = new FileReader();
                              reader.onloadend = () => setImagePreview(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }} />
                      </label>
                    </div>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-3 py-8 cursor-pointer w-full">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center text-3xl">📸</div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700">Tap to upload image</p>
                      <p className="text-xs text-slate-400 mt-0.5">PNG, JPG, WebP · 800×800px recommended</p>
                    </div>
                    <span className="px-5 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm">Choose File</span>
                    <input type="file" accept="image/*" className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setImagePreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }} />
                  </label>
                )}
              </div>

              {/* Store chips */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Store</p>
                <div className="flex gap-2 flex-wrap">
                  {allowedCats.map(cat => (
                    <button key={cat.id} type="button"
                      onClick={() => setForm(f => ({ ...f, store: cat.id }))}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all press-effect"
                      style={form.store === cat.id
                        ? { background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', boxShadow: '0 4px 12px rgba(5,150,105,0.35)', border: '1.5px solid #059669' }
                        : { background: '#f8fafc', color: '#64748b', border: '1.5px solid #e2e8f0' }}>
                      {cat.imageUrl
                        ? <img src={cat.imageUrl as string} alt="" className="w-5 h-5 rounded-lg object-cover" />
                        : <span>{(cat as any).icon || '🏪'}</span>}
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Sub category */}
                {subCategories.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</p>
                    <div className="relative">
                      <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 transition-all appearance-none cursor-pointer font-medium">
                        {subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                )}
                
                {/* Tier3 Sub category */}
                {tier3SubCategories.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sub-Category *</p>
                    <div className="relative">
                      <select value={form.subCategory || ''} onChange={e => setForm(f => ({ ...f, subCategory: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 transition-all appearance-none cursor-pointer font-medium" required>
                        <option value="">-- Sub-Category --</option>
                        {tier3SubCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                )}


              </div>

              {/* Name + Description */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Details</p>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Product name (e.g. Amul Butter 500g)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 transition-all font-medium placeholder:text-slate-300" />
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Short description (optional)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 transition-all font-medium placeholder:text-slate-300" />
              </div>

              {/* Price + Stock */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pricing & Stock</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                    <input type="number" placeholder="Price" value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      className="w-full pl-8 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 transition-all font-bold" />
                    <span className="absolute bottom-1.5 right-2 text-[8px] font-black text-emerald-600 bg-emerald-50 px-1 rounded">SALE</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                    <input type="number" placeholder="MRP" value={form.mrp}
                      onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))}
                      className="w-full pl-8 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 transition-all font-bold" />
                    <span className="absolute bottom-1.5 right-2 text-[8px] font-black text-slate-400 bg-slate-100 px-1 rounded">MRP</span>
                  </div>
                  <input type="number" placeholder="Stock" value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 transition-all font-bold" />
                </div>
              </div>

              {/* Unit chips */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Unit / Quantity</p>
                <div className="flex gap-2 flex-wrap items-center">
                  {['1 piece', '500g', '1 kg', '250g', '200ml', '1 L', '6 pack'].map(u => (
                    <button key={u} type="button"
                      onClick={() => setForm(f => ({ ...f, unit: f.unit === u ? '' : u }))}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all press-effect"
                      style={{
                        background: form.unit === u ? 'rgba(5,150,105,0.1)' : '#f8fafc',
                        color: form.unit === u ? '#059669' : '#64748b',
                        border: form.unit === u ? '1.5px solid rgba(5,150,105,0.4)' : '1.5px solid #e2e8f0',
                      }}>
                      {u}
                    </button>
                  ))}
                  <input type="text" placeholder="Custom…"
                    value={['1 piece','500g','1 kg','250g','200ml','1 L','6 pack'].includes(form.unit || '') ? '' : (form.unit || '')}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="flex-1 min-w-[90px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15 transition-all" />
                </div>
                {form.unit && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                    📦 Will show as: <span className="font-black">{form.unit}</span>
                  </p>
                )}
              </div>

            </div>

            {/* ── Footer ── */}
            <div className="px-5 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3.5 border-2 border-slate-200 text-sm font-bold rounded-2xl hover:bg-slate-50 transition-all text-slate-600 press-effect">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-[2] py-3.5 text-sm font-black rounded-2xl text-white press-effect disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: saving ? '#6ee7b7' : 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 6px 20px rgba(5,150,105,0.35)' }}>
                {saving ? (
                  <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Saving…</>
                ) : editProduct ? '✅ Update Product' : '✅ Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}