'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { storeService } from '@smart-bazar/shared/lib/services/storeService';
import { Store } from '@smart-bazar/shared/types/firestore';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import Skeleton from '@smart-bazar/shared/components/ui/Skeleton';

export default function StoresPage() {
  const { addToast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string>('');
  
  const [formData, setFormData] = useState({ name: '', isComingSoon: false });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const data = await storeService.getStores();
      setStores(data);
    } catch (e) {
      console.error(e);
      addToast('Failed to load stores', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const openAddModal = () => {
    setEditingStoreId(null);
    setExistingImageUrl('');
    setFormData({ name: '', isComingSoon: false });
    setImageFile(null);
    setImagePreview('');
    setIsModalOpen(true);
  };

  const openEditModal = (store: Store) => {
    setEditingStoreId(store.id);
    setFormData({ name: store.name, isComingSoon: store.isComingSoon || false });
    setImageFile(null);
    setExistingImageUrl(store.imageUrl || '');
    setImagePreview(store.imageUrl || '');
    setIsModalOpen(true);
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setSaving(true);
    try {
      addToast(imageFile ? 'Uploading image and saving...' : 'Saving store...', 'info');
      
      if (editingStoreId) {
        await storeService.updateStore(editingStoreId, formData.name, imageFile, existingImageUrl, formData.isComingSoon);
        addToast('Store updated successfully!', 'success');
      } else {
        const id = formData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        await storeService.addStore(id, formData.name, imageFile, formData.isComingSoon);
        addToast('Store created successfully!', 'success');
      }
      
      setIsModalOpen(false);
      setEditingStoreId(null);
      setExistingImageUrl('');
      setFormData({ name: '', isComingSoon: false });
      setImageFile(null);
      setImagePreview('');
      
      loadStores();
    } catch (error) {
      console.error('Failed to save store:', error);
      if (imageFile) {
        addToast('Failed to upload store image. Please upload a valid image file.', 'error');
      } else {
        addToast('Failed to save store', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStore = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the store "${name}"? Products inside it will remain but won't be shown correctly if missing the store mapping.`)) return;
    
    try {
      await storeService.deleteStore(id);
      addToast('Store removed successfully', 'success');
      loadStores();
    } catch (error) {
      console.error('Delete failed:', error);
      addToast('Failed to delete store', 'error');
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Stores</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage top-level stores and their imagery</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={openAddModal}
            className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-blue press-effect flex items-center justify-center gap-2"
          >
            <span>+ Add New Store</span>
          </button>
        </div>
      </div>

      {/* Stores List */}
      <div className="card-admin overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 px-4 font-bold text-xs text-slate-500 uppercase tracking-widest">Store</th>
                <th className="py-3 px-4 font-bold text-xs text-slate-500 uppercase tracking-widest">ID</th>
                <th className="py-3 px-4 font-bold text-xs text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`store-skel-${i}`} className="border-b border-border last:border-0">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton width="120px" height="16px" className="rounded" />
                          <Skeleton width="80px" height="12px" className="rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Skeleton width="80px" height="16px" className="rounded" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Skeleton width="90px" height="28px" className="rounded-lg" />
                        <Skeleton width="90px" height="28px" className="rounded-lg" />
                        <Skeleton width="34px" height="34px" className="rounded-lg" />
                        <Skeleton width="34px" height="34px" className="rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                stores.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                        {s.imageUrl ? (
                          <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">🏪</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-foreground">{s.name}</p>
                          {s.isComingSoon && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold uppercase tracking-widest rounded flex items-center gap-1">
                              ⏳ Coming Soon
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Added {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{s.id}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Quick Coming Soon toggle */}
                      <button
                        onClick={async () => {
                          try {
                            await storeService.updateStore(s.id, s.name, null, s.imageUrl, !s.isComingSoon);
                            addToast(s.isComingSoon ? `"${s.name}" is now Live!` : `"${s.name}" set to Coming Soon`, 'success');
                            loadStores();
                          } catch { addToast('Failed to update', 'error'); }
                        }}
                        className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-colors mr-1 ${
                          s.isComingSoon
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        title={s.isComingSoon ? 'Click to make Live' : 'Click to set Coming Soon'}
                      >
                        {s.isComingSoon ? '⏳ Coming Soon' : '✅ Live'}
                      </button>
                      <Link 
                        href={`/dashboard/admin/categories/${s.id}`}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold uppercase rounded-lg transition-colors inline-flex items-center gap-1 mr-2"
                      >
                        Categories →
                      </Link>
                      <button 
                        onClick={() => openEditModal(s)} 
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors inline-block"
                        title="Edit Store"
                      >
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M11 5H6C4.89543 5 4 5.89543 4 7V14C4 15.1046 4.89543 16 6 16H13C14.1046 16 15 15.1046 15 14V9M12.5858 3.58579C13.3668 2.80474 14.6332 2.80474 15.4142 3.58579V3.58579C16.1953 4.36683 16.1953 5.63316 15.4142 6.41421L8 13.8284L5 14.8284L6 11.8284L13.4142 4.41421C13.4142 4.41421 13.4142 4.41421 13.4142 4.41421H13.4143Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteStore(s.id, s.name)} 
                        className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors inline-block"
                        title="Delete Store"
                      >
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 6h14m-1 0v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h2a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
              {stores.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="text-center py-20">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl mb-3">🏪</span>
                      <p className="text-sm font-bold text-slate-400">No stores found</p>
                      <p className="text-xs text-muted-foreground">Add a new store to get started.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Store Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn">
          <form onSubmit={handleSaveStore} className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border overflow-hidden animate-scaleIn">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-extrabold">{editingStoreId ? 'Edit Store' : 'Add New Store'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Store Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors" 
                  placeholder="e.g. Beauty Store"
                  required 
                />
              </div>

              {/* Image Upload Area */}
              <div className="mt-4">
                <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Store Image (Optional but recommended)</label>
                <div className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-6 bg-muted/10 relative hover:bg-muted/30 transition-colors">
                  {imagePreview ? (
                     <div className="w-24 h-24 rounded-full overflow-hidden shadow-md mb-3 border-4 border-white">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                     </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-3xl mb-3 shadow-md">
                      🏪
                    </div>
                  )}
                  <p className="text-xs font-bold text-slate-600">Click or tap to upload an image</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Recommended: 800x800px WebP</p>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => setImagePreview(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  />
                </div>
              </div>

              {/* Coming Soon Toggle */}
              <div className="mt-4 flex items-center justify-between p-4 border border-border rounded-xl bg-muted/20">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Coming Soon Mode</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Show this store with a &quot;Coming Soon&quot; badge to customers.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={formData.isComingSoon}
                    onChange={(e) => setFormData({...formData, isComingSoon: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>

            <div className="p-6 bg-muted/10 border-t border-border flex gap-3">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 border border-border text-xs font-bold rounded-xl hover:bg-muted/50 transition-all text-slate-600"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={saving}
                className={`flex-1 py-3 text-white text-xs font-bold rounded-xl transition-all ${saving ? 'bg-primary/70 cursor-not-allowed' : 'bg-primary shadow-blue'}`}
              >
                {saving ? 'Saving...' : (editingStoreId ? 'Save Changes' : 'Create Store')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
