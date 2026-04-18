'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@smart-bazar/shared/components/layout/DashboardLayout';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { categoryService } from '@smart-bazar/shared/lib/services/categoryService';
import { Product, Category } from '@smart-bazar/shared/types/firestore';
import { CATEGORIES, CATEGORY_MAP } from '@smart-bazar/shared/lib/constants';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

const adminNav = [
  { label: 'Overview', href: '/dashboard/admin', icon: '📊' },
  { label: 'Inventory', href: '/dashboard/admin/inventory', icon: '📦' },
  { label: 'Analytics', href: '/dashboard/admin/analytics', icon: '📈' },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: '⚙️' },
];

export default function InventoryPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category: 'mudikhana',
    stock: 0,
    description: '',
    isAvailable: true,
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200',
  });

  useEffect(() => {
    const unsub = productService.subscribeToProducts((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;
    try {
      await productService.addProduct({
        ...formData as Omit<Product, 'id'>,
        storeId: 'admin_store', // Admin added products belong to a generic admin store
      });
      addToast('Product added successfully', 'success');
      setIsModalOpen(false);
      setFormData({ name: '', price: 0, category: 'mudikhana', stock: 0, description: '', isAvailable: true, imageUrl: formData.imageUrl });
     } catch (error) {
       console.error('Failed to add product:', error);
       addToast('Failed to add product', 'error');
     }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productService.deleteProduct(id);
      addToast('Product removed', 'info');
     } catch (error) {
       console.error('Delete failed:', error);
       addToast('Delete failed', 'error');
     }
  };

  const handleSeedCategories = async () => {
    try {
      await categoryService.seedCategories();
      addToast('Categories seeded successfully', 'success');
     } catch (error) {
       console.error('Seeding failed:', error);
       addToast('Seeding failed', 'error');
     }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout title="Inventory Control" navItems={adminNav} accentColor="#3b82f6">
      <div className="animate-fadeIn">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Product Catalog</h1>
            <p className="text-xs text-muted-foreground mt-1">Manage global inventory and stock levels</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleSeedCategories}
              className="px-4 py-2.5 bg-muted text-foreground text-xs font-bold rounded-xl hover:bg-muted/80 transition-all border border-border"
            >
              Seed Categories
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-blue press-effect"
            >
              + Add New Product
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative md:col-span-2">
            <input 
              type="text" 
              placeholder="Search products by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
          </div>
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-3 bg-card border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Inventory List */}
        <div className="card-admin overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-muted" />
                        <div>
                          <p className="font-bold text-xs">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{p.description || 'No description'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                        {CATEGORY_MAP[p.category as keyof typeof CATEGORY_MAP]?.name || p.category}
                      </span>
                    </td>
                    <td className="font-bold text-primary">₹{p.price}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${p.stock > 10 ? 'bg-success' : p.stock > 0 ? 'bg-warning' : 'bg-destructive'}`} />
                        <span className="font-mono text-[11px] font-bold">{p.stock} units</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${p.isAvailable ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {p.isAvailable ? 'ACTIVE' : 'OUT'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-muted rounded-lg text-primary transition-colors">
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M11 4H4a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-2 hover:bg-destructive/10 rounded-lg text-destructive transition-colors">
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M3 6h14m-1 0v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h2a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="text-center py-20">
                      <div className="flex flex-col items-center">
                        <span className="text-4xl mb-3">📦</span>
                        <p className="text-sm font-bold text-slate-400">No products found</p>
                        <p className="text-xs text-muted-foreground">Try adjusting your search or add a new item.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn">
          <form onSubmit={handleCreateProduct} className="w-full max-w-lg bg-card rounded-3xl shadow-2xl border border-border overflow-hidden animate-scaleIn">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-extrabold">Add New Product</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Product Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:border-primary" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Price (₹)</label>
                  <input 
                    type="number" 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})} 
                    className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:border-primary" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Category</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:border-primary"
                  >
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Stock Level</label>
                  <input 
                    type="number" 
                    value={formData.stock} 
                    onChange={e => setFormData({...formData, stock: Number(e.target.value)})} 
                    className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:border-primary" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Availability</label>
                  <label className="flex items-center gap-2 cursor-pointer py-3">
                    <input 
                      type="checkbox" 
                      checked={formData.isAvailable} 
                      onChange={e => setFormData({...formData, isAvailable: e.target.checked})} 
                    />
                    <span className="text-xs font-medium">In Stock</span>
                  </label>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Description</label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:border-primary h-24 resize-none" 
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-muted/10 border-t border-border flex gap-3">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 border border-border text-xs font-bold rounded-xl hover:bg-muted/50 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-3 bg-primary text-white text-xs font-bold rounded-xl shadow-blue"
              >
                Create Product
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
