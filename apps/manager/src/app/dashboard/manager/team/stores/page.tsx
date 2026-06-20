'use client';

import { useState, useEffect } from 'react';
// Layout handled by parent
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { UserData, Order, Category } from '@smart-bazar/shared/types/firestore';
import { CATEGORIES } from '@smart-bazar/shared/lib/constants';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { categoryService } from '@smart-bazar/shared/lib/services/categoryService';

export default function ManagerStoresPage() {
  const { addToast } = useToast();
  const [stores, setStores] = useState<UserData[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [updatingCat, setUpdatingCat] = useState<string | null>(null);
  const [categoryModal, setCategoryModal] = useState<{ userId: string; current: string[] } | null>(null);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);

  useEffect(() => {
    const unsubStores = userService.subscribeToUsersByRole('store', (all) => {
      setStores(all);
      setLoading(false);
    });
    const unsubOrders = orderService.subscribeToAllOrders(setOrders);
    categoryService.getAllCategories().then(setDbCategories);
    return () => { unsubStores(); unsubOrders(); };
  }, []);

  const getStoreStats = (storeId: string) => {
    const storeOrders = orders.filter(o => o.assignedVendorId === storeId);
    return {
      total: storeOrders.length,
      completed: storeOrders.filter(o => o.status === 'completed').length,
      active: storeOrders.filter(o => ['store', 'packed', 'delivery'].includes(o.status)).length,
      revenue: storeOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.totalAmount, 0),
    };
  };

  const handleToggleStatus = async (store: UserData) => {
    const newStatus = store.status === 'active' ? 'inactive' : 'active';
    setToggling(store.id);
    try {
      await userService.toggleStatus(store.id, newStatus);
      addToast(`Store ${newStatus === 'active' ? 'activated' : 'deactivated'}`, 'success');
    } catch {
      addToast('Status update failed', 'error');
    } finally {
      setToggling(null);
    }
  };

  const handleCategoryChange = async (storeId: string, newCategory: string) => {
    setUpdatingCat(storeId);
    try {
      await userService.updateUser(storeId, { vendorStore: newCategory as any });
      addToast('Store category updated', 'success');
    } catch {
      addToast('Failed to update category', 'error');
    } finally {
      setUpdatingCat(null);
    }
  };

  const handleAssignCategories = async (userId: string, categories: string[]) => {
    try {
      await userService.assignCategories(userId, categories);
      addToast('Categories assigned successfully', 'success');
      setCategoryModal(null);
    } catch (error) {
       console.error('Failed to assign categories:', error);
       addToast('Failed to assign categories', 'error');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-fadeIn">
      <div>
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Store Partners</h1>
            <p className="text-sm text-slate-500">{stores.length} stores registered</p>
          </div>
          <div className="flex gap-3 text-xs font-bold">
            <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-xl">
              {stores.filter(s => s.status === 'active').length} Active
            </span>
            <span className="px-3 py-1.5 bg-red-100 text-red-600 rounded-xl">
              {stores.filter(s => s.status === 'inactive').length} Inactive
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                    <div className="h-3 w-40 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3].map(j => <div key={j} className="h-12 bg-slate-100 rounded-xl" />)}
                </div>
              </div>
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="flex flex-col items-center py-20 bg-white rounded-3xl border border-slate-100">
            <p className="text-4xl mb-3">🏪</p>
            <p className="font-bold text-slate-400">No stores registered yet</p>
            <p className="text-sm text-slate-400 mt-1">Approve store applications first</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map(store => {
              const stats = getStoreStats(store.id);
              const isActive = store.status !== 'inactive';
              return (
                <div key={store.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all animate-fadeInUp ${
                  isActive ? 'border-slate-100' : 'border-red-100 bg-red-50/30'
                }`}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600 shrink-0">
                        {store.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">{store.name}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{store.email}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <select
                            value={store.vendorStore || ''}
                            onChange={(e) => handleCategoryChange(store.id, e.target.value)}
                            disabled={updatingCat === store.id}
                            className="bg-slate-50 border border-slate-200 text-[10px] font-bold rounded-lg px-1.5 py-0.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
                          >
                            <option value="">Unassigned</option>
                            {CATEGORIES.map(c => (
                              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                          </select>
                          {updatingCat === store.id && <span className="text-[10px] text-blue-500 animate-pulse">Saving...</span>}
                        </div>
                        <div className="mt-2 text-xs">
                          <button
                            onClick={() => setCategoryModal({ userId: store.id, current: store.assignedCategories || [] })}
                            className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all"
                          >
                            Edit Permissions {store.assignedCategories?.length ? `(${store.assignedCategories.length})` : ''}
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Status Toggle */}
                    <button
                      onClick={() => handleToggleStatus(store)}
                      disabled={toggling === store.id}
                      className={`relative shrink-0 w-10 h-5 rounded-full transition-all duration-300 disabled:opacity-60 ${
                        isActive ? 'bg-green-500' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${
                        isActive ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Total', value: stats.total, color: '#3b82f6' },
                      { label: 'Active', value: stats.active, color: '#f97316' },
                      { label: 'Done', value: stats.completed, color: '#22c55e' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-base font-black" style={{ color: stat.color }}>{stat.value}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Revenue */}
                  <div className="mt-3 flex items-center justify-between px-1">
                    <span className="text-[10px] text-slate-400">Total Revenue</span>
                    <span className="text-sm font-black text-slate-900">₹{stats.revenue.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Assignment Modal Overlay */}
      {categoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-scaleIn border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Access Control</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Assign categories for this store partner</p>
              </div>
              <button 
                onClick={() => setCategoryModal(null)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6 mb-2">
                {CATEGORIES.map((storeDomain) => {
                  const storeCategories = dbCategories.filter(c => c.storeId === storeDomain.id);
                  if (storeCategories.length === 0) return null;
                  return (
                    <div key={storeDomain.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">{storeDomain.icon}</span>
                        <h4 className="font-bold text-slate-800">{storeDomain.name}</h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {storeCategories.map((cat) => {
                          const isSelected = categoryModal.current.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              onClick={() => {
                                const next = isSelected
                                  ? categoryModal.current.filter(c => c !== cat.id)
                                  : [...categoryModal.current, cat.id];
                                setCategoryModal({ ...categoryModal, current: next });
                              }}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <span className="text-xs truncate mr-2">{cat.name}</span>
                              <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                              }`}>
                                {isSelected && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2.5 5l1.5 1.5 3.5-3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {dbCategories.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No categories found. Please create some in the Stores menu first.
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white shrink-0">
              <button
                onClick={() => handleAssignCategories(categoryModal.userId, categoryModal.current)}
                className="w-full py-4 bg-slate-900 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-slate-800 hover:shadow-xl transition-all active:scale-[0.98]"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
