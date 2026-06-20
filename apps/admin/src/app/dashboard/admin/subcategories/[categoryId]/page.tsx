'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { subCategoryService } from '@smart-bazar/shared/lib/services/subCategoryService';
import { SubCategory } from '@smart-bazar/shared/types/firestore';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import Skeleton from '@smart-bazar/shared/components/ui/Skeleton';

export default function SubCategoriesUnderCategoryPage() {
  const { addToast } = useToast();
  const params = useParams();
  const router = useRouter();
  const categoryId = params.categoryId as string; 
  
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editingSubCategoryId, setEditingSubCategoryId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string>('');
  
  const [formData, setFormData] = useState({ name: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const loadSubCategories = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const data = await subCategoryService.getSubCategories(categoryId);
      setSubCategories(data);
    } catch (e) {
      console.error(e);
      addToast('Failed to load sub-categories', 'error');
    } finally {
      setLoading(false);
    }
  }, [categoryId, addToast]);

  useEffect(() => {
    loadSubCategories();
  }, [loadSubCategories]);

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
    if (!formData.name || !categoryId) return;
    
    setSaving(true);
    try {
      addToast(imageFile ? 'Uploading image and saving...' : 'Saving sub-category...', 'info');
      
      if (editingSubCategoryId) {
        await subCategoryService.updateSubCategory(editingSubCategoryId, formData.name, imageFile, existingImageUrl);
        addToast('Sub-Category updated successfully!', 'success');
      } else {
        const id = `${categoryId}-${formData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        // storeId logic here is a bit tricky; let's extract it from categoryId or leave empty. Usually categoryId starts with storeId.
        const storeId = categoryId.split('-')[0] + '-' + categoryId.split('-')[1]; // naive but works for household-store
        await subCategoryService.addSubCategory(id, categoryId, storeId, formData.name, imageFile);
        addToast('Sub-Category created successfully!', 'success');
      }
      
      setIsModalOpen(false);
      setEditingSubCategoryId(null);
      setExistingImageUrl('');
      setFormData({ name: '' });
      setImageFile(null);
      setImagePreview('');
      
      loadSubCategories();
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
      loadSubCategories();
    } catch (error) {
      console.error('Delete failed:', error);
      addToast('Failed to delete sub-category', 'error');
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <button 
            onClick={() => router.back()} // Back to the specific category listing
            className="flex items-center gap-1 text-xs text-slate-500 font-bold mb-2 hover:text-primary transition-colors uppercase tracking-widest"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight">Sub-Categories</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage sub-categories for category: <span className="font-bold text-foreground">{categoryId}</span></p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={openAddModal}
            className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-blue press-effect flex items-center justify-center gap-2"
          >
            <span>+ Add Sub-Category</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="card-admin overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 px-4 font-bold text-xs text-slate-500 uppercase tracking-widest">Sub-Category</th>
                <th className="py-3 px-4 font-bold text-xs text-slate-500 uppercase tracking-widest">ID</th>
                <th className="py-3 px-4 font-bold text-xs text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`subcat-skel-${i}`} className="border-b border-border last:border-0">
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
                        <Skeleton width="34px" height="34px" className="rounded-lg" />
                        <Skeleton width="34px" height="34px" className="rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                subCategories.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                        {c.imageUrl ? (
                          <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">📁</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">Added {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{c.id}</span>
                  </td>
                  <td className="py-4 px-4 text-right">
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
              )))}
              {subCategories.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="text-center py-20">
                    <div className="flex flex-col items-center">
                      <span className="text-4xl mb-3">📁</span>
                      <p className="text-sm font-bold text-slate-400">No sub-categories found</p>
                      <p className="text-xs text-muted-foreground">Add a new sub-category to organize this category.</p>
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
          <form onSubmit={handleSaveSubCategory} className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border overflow-hidden animate-scaleIn">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-extrabold">{editingSubCategoryId ? 'Edit Sub-Category' : 'Add New Sub-Category'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
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
                  className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:border-primary transition-colors" 
                  placeholder="e.g. Cleansers"
                  required 
                />
              </div>

              {/* Image Upload Area */}
              <div className="mt-4">
                <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Image (Optional but recommended)</label>
                <div className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-6 bg-muted/10 relative hover:bg-muted/30 transition-colors">
                  {imagePreview ? (
                     <div className="w-24 h-24 rounded-full overflow-hidden shadow-md mb-3 border-4 border-white">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                     </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-3xl mb-3 shadow-md">
                      🖼️
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
                {saving ? 'Saving...' : (editingSubCategoryId ? 'Save Changes' : 'Create Sub-Category')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
