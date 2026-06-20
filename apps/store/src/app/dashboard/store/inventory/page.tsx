'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { categoryService } from '@smart-bazar/shared/lib/services/categoryService';
import { Product, Category, ProductVariant, SubCategory } from '@smart-bazar/shared/types/firestore';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function generateVariantId() {
  return 'var_' + Math.random().toString(36).slice(2, 8);
}

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function StoreInventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userData } = useAuthStore();
  const { addToast } = useToast();
  const multiImgRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>({
    name: '', price: 0, mrp: 0, isVeg: true, tags: [], stock: 10, store: 'grocery-store', category: '', unit: 'kg',
  });

  // Multi-image states
  const [imageFiles, setImageFiles] = useState<File[]>([]);       // new files to upload
  const [imagePreviews, setImagePreviews] = useState<string[]>([]); // existing + new previews

  // Variant states
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);

  /* ── Load ── */

  useEffect(() => {
    if (form.store) {
      categoryService.getCategories(form.store).then(data => {
        let allowedData = data;
        if (userData?.assignedCategories !== undefined) {
          allowedData = data.filter(c => userData.assignedCategories!.includes(c.id));
        }

        setCategories(allowedData);
        if (allowedData.length > 0 && (!form.category || !allowedData.find(c => c.id === form.category))) {
          setForm(prev => ({ ...prev, category: allowedData[0].id }));
        } else if (allowedData.length === 0) {
          setForm(prev => ({ ...prev, category: '' }));
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.store, userData?.assignedCategories]);

  useEffect(() => {
    import('@smart-bazar/shared/lib/services/subCategoryService').then(({ subCategoryService }) => {
      if (form.category) {
        subCategoryService.getSubCategories(form.category).then(data => {
          setSubCategories(data);
          if (data.length > 0 && (!form.subCategory || !data.find(s => s.id === form.subCategory))) {
            setForm(prev => ({ ...prev, subCategory: data[0].id }));
          } else if (data.length === 0) {
            setForm(prev => ({ ...prev, subCategory: '' }));
          }
        });
      } else {
        setSubCategories([]);
        setForm(prev => ({ ...prev, subCategory: '' }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  useEffect(() => {
    if (searchParams.get('action') === 'add') openAdd();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!userData) return;
    const unsub = productService.subscribeToProducts((all) => {
      setProducts(all.filter(p => !p.vendorId || p.vendorId === userData.id));
      setLoading(false);
    });
    return () => unsub();
  }, [userData]);

  /* ── Filtered ── */
  const filteredProducts = products.filter(p => {
    const effectiveStock = p.variants?.length
      ? p.variants.reduce((sum, v) => sum + v.stock, 0)
      : p.stock;
    if (filter === 'low') return effectiveStock > 0 && effectiveStock < 10;
    if (filter === 'out') return effectiveStock === 0;
    return true;
  });

  /* ── Stock update (no-variant) ── */
  const handleStockUpdate = async (productId: string, newStock: number) => {
    setUpdating(productId);
    try {
      await productService.updateProduct(productId, { stock: newStock, isAvailable: newStock > 0 });
      addToast('Stock updated ✅', 'success');
    } catch {
      addToast('Update failed', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const handleToggleAvailable = async (p: Product) => {
    setUpdating(p.id);
    try {
      await productService.updateProduct(p.id, { isAvailable: !p.isAvailable });
      addToast(`Product ${p.isAvailable ? 'hidden' : 'visible'}`, 'success');
    } catch {
      addToast('Update failed', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    setDeleting(id);
    try {
      await productService.deleteProduct(id);
      addToast('Product deleted', 'success');
    } catch {
      addToast('Failed to delete product', 'error');
    } finally {
      setDeleting(null);
    }
  };

  /* ── Open Add/Edit ── */
  const openAdd = () => {
    setEditProduct(null);
    setForm({ 
      name: '', 
      price: 0, 
      mrp: 0, 
      isVeg: true, 
      tags: [], 
      stock: 10, 
      category: '',
      subCategory: '', 
      unit: 'kg',
      store: userData?.vendorStore || userData?.assignedStores?.[0] || 'household-store',
      vendorId: userData?.id || ''
    });
    setImageFiles([]);
    setImagePreviews([]);
    setVariants([]);
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ ...p });
    setImageFiles([]);
    // Load existing images — prefer images[] array, fallback to imageUrl
    setImagePreviews(p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : []);
    setVariants(p.variants ? [...p.variants] : []);
    setShowForm(true);
  };

  /* ── Image handling ── */
  const handleMultiImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 5 - imagePreviews.length;
    const toAdd = files.slice(0, remaining);
    setImageFiles(prev => [...prev, ...toAdd]);
    toAdd.forEach(f => {
      const url = URL.createObjectURL(f);
      setImagePreviews(prev => [...prev, url]);
    });
    // reset input so same files can re-trigger
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
    // If this was a new file, remove from imageFiles too
    const existingCount = (editProduct?.images?.length || (editProduct?.imageUrl ? 1 : 0));
    const fileIdx = idx - existingCount;
    if (fileIdx >= 0) {
      setImageFiles(prev => prev.filter((_, i) => i !== fileIdx));
    }
  };

  /* ── Variant handling ── */
  const addVariant = () => {
    setVariants(prev => [...prev, { id: generateVariantId(), name: '', price: 0, stock: 10 }]);
  };

  const updateVariant = (id: string, field: keyof ProductVariant, value: string | number) => {
    setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const removeVariant = (id: string) => {
    setVariants(prev => prev.filter(v => v.id !== id));
  };

  /* ── Save ── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.category || !form.subCategory) return;
    if (!variants.length && !form.price) return;

    try {
      setSaving(true);

      // Upload new images
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        try {
          const url = await productService.uploadProductImage(file);
          uploadedUrls.push(url);
        } catch (uploadErr) {
          console.error('Product image upload failed:', uploadErr);
          addToast('Failed to upload product image. Please upload a valid image file.', 'error');
          setSaving(false);
          return;
        }
      }

      // Combine existing (non-blob) images with newly uploaded
      const existingUrls = imagePreviews
        .filter(p => !p.startsWith('blob:'))
        .slice(0, imagePreviews.length - imageFiles.length); // original non-blob ones

      const allImages = [...existingUrls, ...uploadedUrls];
      const mainImageUrl = allImages[0] || form.imageUrl || '';

      const productData = {
        ...form,
        imageUrl: mainImageUrl,
        images: allImages.length ? allImages : undefined,
        // Only include variants if we actually have some
        ...(variants.length ? { variants } : {}),
        // If variants exist, use min variant price as base price; else use form price
        price: variants.length ? Math.min(...variants.map(v => v.price || 0)) : (form.price || 0),
        // If variants exist, use total stock; else use form stock
        stock: variants.length ? variants.reduce((sum, v) => sum + (v.stock || 0), 0) : (form.stock || 0),
        isAvailable: form.isAvailable ?? true,
        vendorId: form.vendorId || userData?.id || '',
        store: form.store || userData?.vendorStore || userData?.assignedStores?.[0] || 'household-store',
        createdAt: form.createdAt || new Date().toISOString(),
      } as any;

      if (editProduct) {
        await productService.updateProduct(editProduct.id, productData);
        addToast('Product updated!', 'success');
      } else {
        await productService.addProduct(productData);
        addToast('Product added!', 'success');
      }

      setShowForm(false);
      if (searchParams.get('action') === 'add') router.replace('/dashboard/store/inventory');
    } catch (err) {
      console.error(err);
      addToast('Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };


  const lowStockCount = products.filter(p => {
    const s = p.variants?.length ? p.variants.reduce((a, v) => a + v.stock, 0) : p.stock;
    return s > 0 && s < 10;
  }).length;
  const outCount = products.filter(p => {
    const s = p.variants?.length ? p.variants.reduce((a, v) => a + v.stock, 0) : p.stock;
    return s === 0;
  }).length;

  const inp = 'w-full px-3 py-2.5 bg-muted/40 border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';

  return (
    <div className="w-full max-w-4xl mx-auto animate-fadeIn">
      <div>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900">My Inventory</h1>
              <p className="text-sm text-slate-500">{products.length} products in your store</p>
            </div>
            <button onClick={openAdd} className="px-4 py-2 bg-primary hover:bg-primary-dark transition-colors text-white text-xs font-bold rounded-xl shadow-md">
              + New Product
            </button>
          </div>
          {(lowStockCount > 0 || outCount > 0) && (
            <div className="flex gap-2 text-xs font-bold">
              {lowStockCount > 0 && <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl">⚠️ {lowStockCount} Low Stock</span>}
              {outCount > 0 && <span className="px-3 py-1.5 bg-red-100 text-red-600 rounded-xl">❌ {outCount} Out of Stock</span>}
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { key: 'all', label: 'All Products' },
            { key: 'low', label: 'Low Stock', count: lowStockCount, color: '#f59e0b' },
            { key: 'out', label: 'Out of Stock', count: outCount, color: '#ef4444' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === tab.key ? 'text-white shadow-md animate-scaleIn' : 'bg-white text-slate-500 border border-slate-200'
              }`}
              style={filter === tab.key ? { background: 'color' in tab ? tab.color : 'var(--primary)' } : {}}>
              {tab.label}
              {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === tab.key ? 'bg-white/30' : 'bg-red-100 text-red-600'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Product List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 bg-slate-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-36 bg-slate-100 rounded" />
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                  </div>
                  <div className="w-28 h-8 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center py-16 bg-white rounded-3xl border border-slate-100">
            <p className="text-4xl mb-3">📦</p>
            <p className="font-bold text-slate-400">No products in this filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map(p => {
              const dynamicCat = categories.find(c => c.id === p.category);
              const effectiveStock = p.variants?.length
                ? p.variants.reduce((sum, v) => sum + v.stock, 0)
                : p.stock;
              const stockLevel = effectiveStock === 0 ? 'out' : effectiveStock < 10 ? 'low' : 'ok';
              const mainImg = p.images?.[0] || p.imageUrl || '';

              return (
                <div key={p.id} className={`bg-white rounded-2xl border shadow-sm p-4 transition-all animate-fadeInUp ${
                  stockLevel === 'out' ? 'border-red-100 bg-red-50/20' :
                  stockLevel === 'low' ? 'border-amber-100 bg-amber-50/20' :
                  'border-slate-100'
                }`}>
                  <div className="flex items-center gap-4">
                    {/* Image — shows count badge if multiple */}
                    <div className="relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-2xl shrink-0 overflow-hidden bg-slate-100">
                      {mainImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mainImg} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">{p.emoji || '📦'}</span>
                      )}
                      {(p.images?.length || 0) > 1 && (
                        <span className="absolute bottom-0.5 right-0.5 text-[8px] font-black bg-black/60 text-white px-1 py-0.5 rounded-full leading-none">
                          +{(p.images?.length || 1) - 1}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900">{p.name}</p>
                        {dynamicCat && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {dynamicCat.name}
                          </span>
                        )}
                        {p.variants?.length ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            🎛️ {p.variants.length} variants
                          </span>
                        ) : null}
                      </div>

                      {p.variants?.length ? (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {p.variants.map(v => (
                            <span key={v.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                              v.stock === 0 ? 'bg-red-50 text-red-600 border-red-200' :
                              v.stock < 5  ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {v.name} ₹{v.price} · {v.stock === 0 ? 'OOS' : `${v.stock}`}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 mt-0.5">
                          ₹{p.price} / {/^\d/.test(p.unit || '') ? p.unit : `1 ${p.unit || 'piece'}`}
                        </p>
                      )}

                      {/* Stock bar */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(100, (effectiveStock / 50) * 100)}%`,
                              background: stockLevel === 'out' ? '#ef4444' : stockLevel === 'low' ? '#f59e0b' : '#22c55e',
                            }} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(stockLevel === 'low' || stockLevel === 'out') && (
                            <span className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${
                              stockLevel === 'out' ? 'bg-red-600' : 'bg-amber-500'
                            }`} />
                          )}
                          <span className={`text-[10px] font-bold ${
                            stockLevel === 'out' ? 'text-red-600' : stockLevel === 'low' ? 'text-amber-600' : 'text-slate-500'
                          }`}>
                            {stockLevel === 'out' ? 'Out of Stock' : `${effectiveStock} in stock`}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <button onClick={() => openEdit(p)}
                          className="px-3 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all">
                          Edit Detail
                        </button>
                        <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                          className="px-3 py-1 text-[10px] font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-all disabled:opacity-60">
                          {deleting === p.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </div>

                    {/* Right controls — only show stock stepper if no variants */}
                    {!p.variants?.length ? (
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                          <button onClick={() => handleStockUpdate(p.id, Math.max(0, p.stock - 1))}
                            disabled={updating === p.id || p.stock === 0}
                            className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 text-sm">−</button>
                          <span className="w-8 text-center text-sm font-bold text-slate-900">{p.stock}</span>
                          <button onClick={() => handleStockUpdate(p.id, p.stock + 1)}
                            disabled={updating === p.id}
                            className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-bold text-slate-700 hover:bg-slate-50 text-sm">+</button>
                        </div>
                        <button onClick={() => handleToggleAvailable(p)} disabled={updating === p.id}
                          className={`relative w-10 h-5 rounded-full transition-all duration-300 disabled:opacity-60 ${p.isAvailable ? 'bg-amber-500' : 'bg-slate-300'}`}>
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${p.isAvailable ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => handleToggleAvailable(p)} disabled={updating === p.id}
                        className={`relative w-10 h-5 rounded-full transition-all duration-300 disabled:opacity-60 shrink-0 ${p.isAvailable ? 'bg-amber-500' : 'bg-slate-300'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${p.isAvailable ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          Product Form Modal
      ═══════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-background w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn">

            {/* ── Header ── */}
            <div className="px-6 pt-6 pb-5 shrink-0"
              style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #78350f 100%)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: 'rgba(217,119,6,0.2)', border: '1px solid rgba(217,119,6,0.3)' }}>
                    {editProduct ? '✏️' : '📦'}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">{editProduct ? 'Edit Product' : 'Add New Product'}</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">{editProduct ? 'Update product details' : 'Fill in the details below'}</p>
                  </div>
                </div>
                <button onClick={() => setShowForm(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all text-lg">✕</button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Category */}
              {categories.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Category</label>
                    <div className="relative">
                      <select value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value, subCategory: '' }))}
                        className={inp + ' appearance-none cursor-pointer'}>
                        {categories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Sub Category</label>
                    <div className="relative">
                      <select 
                        value={form.subCategory || ''} 
                        onChange={e => setForm(f => ({ ...f, subCategory: e.target.value }))}
                        className={inp + ' appearance-none cursor-pointer'}
                        disabled={subCategories.length === 0}
                      >
                        {subCategories.length === 0 ? (
                          <option value="">No subcategories</option>
                        ) : (
                          subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                        )}
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                </div>
              )}

              {/* ━━━ MULTIPLE IMAGES ━━━ */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Product Images <span className="text-slate-400 font-normal normal-case">(max 5)</span>
                  </label>
                  {imagePreviews.length < 5 && (
                    <button type="button" onClick={() => multiImgRef.current?.click()}
                      className="text-[10px] font-bold text-primary hover:underline">
                      + Add Photo
                    </button>
                  )}
                </div>
                <input ref={multiImgRef} type="file" accept="image/png,image/jpeg,image/webp" multiple
                  onChange={handleMultiImageChange} className="hidden" />

                {imagePreviews.length === 0 ? (
                  <div onClick={() => multiImgRef.current?.click()}
                    className="w-full h-28 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all"
                    style={{ border: '2px dashed var(--border)', background: 'var(--muted)' }}>
                    <span className="text-3xl block mb-1">📸</span>
                    <span className="text-xs font-bold text-muted-foreground">Click to upload photos</span>
                    <span className="text-[10px] text-muted-foreground/60 mt-0.5">First image = main image</span>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {imagePreviews.map((src, idx) => (
                      <div key={idx} className="relative group">
                        <div className="w-20 h-20 rounded-xl overflow-hidden border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`img${idx}`} className="w-full h-full object-cover" />
                        </div>
                        {idx === 0 && (
                          <span className="absolute bottom-0.5 left-0.5 text-[7px] font-black bg-primary text-white px-1 py-0.5 rounded-full leading-none">MAIN</span>
                        )}
                        <button type="button" onClick={() => removeImage(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          ×
                        </button>
                      </div>
                    ))}
                    {imagePreviews.length < 5 && (
                      <div onClick={() => multiImgRef.current?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                        <span className="text-2xl text-muted-foreground">+</span>
                        <span className="text-[8px] text-muted-foreground font-bold mt-0.5">Add</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Product Name */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Product Name</label>
                <input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Fresh Tomatoes"
                  className={inp} />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Description <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Brief product description..."
                  className={inp + ' resize-none'} />
              </div>

              {/* ━━━ VARIANTS SECTION ━━━ */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                      Variants <span className="font-normal normal-case text-slate-400">(size / weight / color)</span>
                    </label>
                    {variants.length > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5">Each variant has its own price & stock</p>
                    )}
                  </div>
                  <button type="button" onClick={addVariant}
                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black rounded-xl transition-all"
                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff' }}>
                    + Add Variant
                  </button>
                </div>

                {variants.length === 0 && (
                  <div className="text-center py-4 rounded-2xl text-[11px] text-slate-400 font-medium"
                    style={{ border: '1.5px dashed var(--border)', background: 'var(--muted)' }}>
                    No variants — product has a single price & stock below
                  </div>
                )}

                <div className="space-y-3">
                  {variants.map((v, idx) => (
                    <div key={v.id} className="p-3 rounded-2xl border border-border bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Variant {idx + 1}</span>
                        <button type="button" onClick={() => removeVariant(v.id)}
                          className="text-[11px] text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition-all">
                          🗑️ Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Name *</label>
                          <input placeholder="e.g. 500g, 1 kg, Red" value={v.name}
                            onChange={e => updateVariant(v.id, 'name', e.target.value)}
                            className="w-full px-2.5 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary transition-all" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Sale Price ₹ *</label>
                          <input type="number" placeholder="₹0" value={v.price || ''}
                            onChange={e => updateVariant(v.id, 'price', Number(e.target.value))}
                            className="w-full px-2.5 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary transition-all" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">MRP ₹</label>
                          <input type="number" placeholder="₹0" value={v.mrp || ''}
                            onChange={e => updateVariant(v.id, 'mrp', Number(e.target.value))}
                            className="w-full px-2.5 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary transition-all" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Stock *</label>
                          <input type="number" placeholder="0" value={v.stock ?? ''}
                            onChange={e => updateVariant(v.id, 'stock', Number(e.target.value))}
                            className="w-full px-2.5 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary transition-all" />
                        </div>
                      </div>
                      {v.mrp && v.mrp > v.price && v.price > 0 && (
                        <p className="text-[10px] text-green-600 font-bold mt-1.5">
                          🏷️ {Math.round(((v.mrp - v.price) / v.mrp) * 100)}% discount
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Base Price + Stock (hidden when variants exist) ── */}
              {variants.length === 0 && (
                <>
                  {/* Pricing */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Pricing</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                        <input type="number" placeholder="Sale price" value={form.price || ''}
                          onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                          className="w-full pl-8 pr-14 py-3 bg-muted/40 border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all" required />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">PRICE</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₹</span>
                        <input type="number" placeholder="MRP (original)" value={form.mrp || ''}
                          onChange={e => setForm(f => ({ ...f, mrp: Number(e.target.value) }))}
                          className="w-full pl-8 pr-12 py-3 bg-muted/40 border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500 bg-muted px-1.5 py-0.5 rounded-md">MRP</span>
                      </div>
                    </div>
                    {Number(form.mrp) > Number(form.price) && Number(form.mrp) > 0 && (
                      <p className="text-[11px] text-green-600 font-semibold mt-1.5 flex items-center gap-1">
                        🏷️ {Math.round(((Number(form.mrp) - Number(form.price)) / Number(form.mrp)) * 100)}% discount will be shown
                      </p>
                    )}
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Unit / Quantity</label>
                    <div className="flex gap-2 flex-wrap items-center">
                      {['1 piece', '500g', '1 kg', '250g', '200ml', '1 L', '6 pack'].map(u => (
                        <button key={u} type="button"
                          onClick={() => setForm(f => ({ ...f, unit: f.unit === u ? '' : u }))}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all press-effect"
                          style={{
                            background: form.unit === u ? 'rgba(217,119,6,0.12)' : 'var(--muted)',
                            color: form.unit === u ? 'var(--primary)' : 'var(--muted-foreground)',
                            border: form.unit === u ? '1.5px solid rgba(217,119,6,0.4)' : '1.5px solid var(--border)',
                          }}>{u}</button>
                      ))}
                      <input type="text" placeholder="Custom (e.g. 750ml)"
                        value={['1 piece','500g','1 kg','250g','200ml','1 L','6 pack'].includes(form.unit || '') ? '' : (form.unit || '')}
                        onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                        className="flex-1 min-w-[120px] px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground/50" />
                    </div>
                  </div>

                  {/* Stock */}
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Stock Quantity</label>
                      <input type="number" placeholder="e.g. 50" value={form.stock || ''}
                        onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))}
                        className={inp} />
                    </div>
                    <div className="pb-0.5">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <div className="relative w-9 h-5 rounded-full transition-colors shrink-0"
                          style={{ background: form.isAvailable ? 'var(--primary)' : 'var(--border)' }}>
                          <input type="checkbox" className="sr-only" checked={!!form.isAvailable}
                            onChange={e => setForm(f => ({ ...f, isAvailable: e.target.checked }))} />
                          <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                            style={{ transform: form.isAvailable ? 'translateX(16px)' : 'translateX(0)' }} />
                        </div>
                        <span className="text-xs font-semibold text-foreground">In Stock</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* ── Footer ── */}
            <div className="px-6 py-4 border-t border-border flex gap-3 shrink-0 bg-muted/20">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-3 border border-border text-sm font-bold rounded-xl hover:bg-muted/60 transition-all text-foreground press-effect">
                Cancel
              </button>
              <button onClick={handleSave}
                disabled={saving || !form.name || !form.category || !form.subCategory || (!variants.length && !form.price)}
                className="flex-1 py-3 text-sm font-black rounded-xl text-white press-effect disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, var(--primary-light), var(--primary-dark))' }}>
                {saving ? (
                  <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="31.4" strokeLinecap="round" className="opacity-25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>Saving…</>
                ) : editProduct ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
