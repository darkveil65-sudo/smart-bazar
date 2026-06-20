'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { storeService } from '@smart-bazar/shared/lib/services/storeService';
import { categoryService } from '@smart-bazar/shared/lib/services/categoryService';
import { subCategoryService } from '@smart-bazar/shared/lib/services/subCategoryService';
import { Store, Category, SubCategory } from '@smart-bazar/shared/types/firestore';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

export default function ManagerSubCategoriesPage() {
  const { userData } = useAuthStore();
  const { addToast } = useToast();
  
  const [dbStores, setDbStores] = useState<Store[]>([]);
  const [activeStore, setActiveStore] = useState<string>('');
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string>('');
  
  const [formData, setFormData] = useState({ name: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // 1. Load Stores
  useEffect(() => {
    const allowedCat_ids = userData?.assignedCategories && userData.assignedCategories.length > 0
      ? userData.assignedCategories
      : null;

    storeService.getStores().then(all => {
      const filtered = allowedCat_ids ? all.filter(s => allowedCat_ids.includes(s.id as any)) : all;
      setDbStores(filtered);
      if (filtered.length > 0) setActiveStore(filtered[0].id);
      else setLoading(false);
    });
  }, [userData]);

  // 2. Load Categories when Store changes
  useEffect(() => {
    if (!activeStore) return;
    setLoading(true);
    categoryService.getCategories(activeStore).then(cats => {
      setCategories(cats);
      if (cats.length > 0) {
        setActiveCategory(cats[0].id);
      } else {
        setActiveCategory('');
        setSubCategories([]);
        setLoading(false);
      }
    });
  }, [activeStore]);

  // 3. Load SubCategories when Category changes
  useEffect(() => {
    if (!activeCategory) return;
    setLoading(true);
    subCategoryService.getSubCategories(activeCategory).then(subs => {
      setSubCategories(subs);
      setLoading(false);
    });
  }, [activeCategory]);

  const reloadSubCategories = () => {
    if (!activeCategory) return;
    setLoading(true);
    subCategoryService.getSubCategories(activeCategory).then(subs => {
      setSubCategories(subs);
      setLoading(false);
    });
  };

  const openAddModal = () => {
    setEditingSubCategoryId(null);
    setExistingImageUrl('');
    setFormData({ name: '' });
    setImageFile(null);
    setImagePreview('');
    setIsModalOpen(true);
  };

  const openEditModal = (sub: SubCategory) => {
    setEditingSubCategoryId(sub.id);
    setFormData({ name: sub.name });
    setImageFile(null);
    setExistingImageUrl(sub.imageUrl || '');
    setImagePreview(sub.imageUrl || '');
    setIsModalOpen(true);
  };

  const handleSaveSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !activeCategory || !activeStore) return;
    
    setSaving(true);
    try {
      addToast(imageFile ? 'Uploading image and saving...' : 'Saving sub-category...', 'info');
      
      if (editingSubCategoryId) {
        await subCategoryService.updateSubCategory(editingSubCategoryId, formData.name, imageFile, existingImageUrl);
        addToast('Sub-Category updated successfully!', 'success');
      } else {
        const id = `${activeCategory}-${formData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        await subCategoryService.addSubCategory(id, activeCategory, activeStore, formData.name, imageFile);
        addToast('Sub-Category created successfully!', 'success');
      }
      
      setIsModalOpen(false);
      setEditingSubCategoryId(null);
      setExistingImageUrl('');
      setFormData({ name: '' });
      setImageFile(null);
      setImagePreview('');
      
      reloadSubCategories();
    } catch (error) {
      console.error('Failed to save subcategory:', error);
      addToast('Failed to save sub-category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the sub-category "${name}"?`)) return;
    
    try {
      await subCategoryService.deleteSubCategory(id);
      addToast('Sub-Category removed successfully', 'success');
      reloadSubCategories();
    } catch (error) {
      console.error('Delete failed:', error);
      addToast('Failed to delete sub-category', 'error');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-fadeIn">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Manage Sub-Categories</h1>
          <p className="text-sm text-slate-500">Add and manage sub-categories for inventory.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={openAddModal}
            disabled={!activeCategory}
            className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-blue press-effect flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>+ Add Sub-Category</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Store</label>
          <select 
            value={activeStore}
            onChange={e => setActiveStore(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none min-w-[200px]"
          >
            {dbStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Category</label>
          <select 
            value={activeCategory}
            onChange={e => setActiveCategory(e.target.value)}
            disabled={categories.length === 0}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none min-w-[200px] disabled:bg-slate-100"
          >
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            {categories.length === 0 && <option value="">No categories found</option>}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-4 px-6 font-bold text-xs text-slate-400 uppercase tracking-widest">Sub-Category</th>
                <th className="py-4 px-6 font-bold text-xs text-slate-400 uppercase tracking-widest">ID</th>
                <th className="py-4 px-6 font-bold text-xs text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subCategories.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                        {c.imageUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                          </>
                        ) : (
                          <span className="text-xl">📁</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">{c.name}</p>
                        <p className="text-[10px] text-slate-500">Added {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{c.id}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => openEditModal(c)} 
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors inline-block"
                        title="Edit Sub-Category"
                      >
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M11 5H6C4.89543 5 4 5.89543 4 7V14C4 15.1046 4.89543 16 6 16H13C14.1046 16 15 15.1046 15 14V9M12.5858 3.58579C13.3668 2.80474 14.6332 2.80474 15.4142 3.58579V3.58579C16.1953 4.36683 16.1953 5.63316 15.4142 6.41421L8 13.8284L5 14.8284L6 11.8284L13.4142 4.41421C13.4142 4.41421 13.4142 4.41421 13.4142 4.41421H13.4143Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteSubCategory(c.id, c.name)} 
                        className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors inline-block"
                        title="Delete Sub-Category"
                      >
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 6h14m-1 0v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h2a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {subCategories.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="text-center py-20">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl mb-3">📁</span>
                      <p className="text-sm font-bold text-slate-400">No sub-categories found</p>
                      <p className="text-xs text-slate-400">Add a sub-category under {categories.find(c => c.id === activeCategory)?.name || 'this category'}.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn">
          <form onSubmit={handleSaveSubCategory} className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-scaleIn">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-extrabold">{editingSubCategoryId ? 'Edit Sub-Category' : 'Add New Sub-Category'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Sub-Category Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary transition-colors" 
                  placeholder="e.g. Cleansers"
                  required 
                />
              </div>

              <div className="mt-4">
                <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Image (Optional)</label>
                <div className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 relative hover:bg-slate-100 transition-colors">
                  {imagePreview ? (
                     <div className="w-24 h-24 rounded-full overflow-hidden shadow-md mb-3 border-4 border-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                     </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-3xl mb-3 shadow-md">
                      🖼️
                    </div>
                  )}
                  <p className="text-xs font-bold text-slate-600">Click to upload image</p>
                  <p className="text-[10px] text-slate-400 mt-1">Recommended: WebP format</p>
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
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 border border-slate-200 text-xs font-bold rounded-xl hover:bg-slate-100 transition-all text-slate-600"
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={saving}
                className={`flex-1 py-3 text-white text-xs font-bold rounded-xl transition-all ${saving ? 'bg-primary/70 cursor-not-allowed' : 'bg-primary shadow-blue'}`}
              >
                {saving ? 'Saving...' : (editingSubCategoryId ? 'Save Changes' : 'Create Sub-Category')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
