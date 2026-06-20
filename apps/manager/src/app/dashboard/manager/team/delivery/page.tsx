'use client';

import { useState, useEffect } from 'react';
// Layout handled by parent
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { UserData, Order } from '@smart-bazar/shared/types/firestore';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

export default function ManagerDeliveryPage() {
  const { addToast } = useToast();
  const [boys, setBoys] = useState<UserData[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const unsubBoys = userService.subscribeToUsersByRole('delivery', (all) => {
      setBoys(all);
      setLoading(false);
    });
    const unsubOrders = orderService.subscribeToAllOrders(setOrders);
    return () => { unsubBoys(); unsubOrders(); };
  }, []);

  const getBoyStats = (uid: string) => {
    const myOrders = orders.filter(o => o.assignedDeliveryBoyId === uid);
    return {
      total: myOrders.length,
      active: myOrders.filter(o => o.status === 'delivery').length,
      delivered: myOrders.filter(o => o.status === 'completed').length,
    };
  };

  const handleToggleStatus = async (boy: UserData) => {
    const newStatus = boy.status === 'active' ? 'inactive' : 'active';
    setToggling(boy.id);
    try {
      await userService.toggleStatus(boy.id, newStatus);
      addToast(`Delivery boy ${newStatus}`, 'success');
    } catch {
      addToast('Update failed', 'error');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto animate-fadeIn">
      <div>
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Delivery Team</h1>
            <p className="text-sm text-slate-500">{boys.length} delivery partners registered</p>
          </div>
          <div className="flex gap-3 text-xs font-bold">
            <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-xl">
              {boys.filter(b => b.status === 'active').length} Active
            </span>
            <span className="px-3 py-1.5 bg-red-100 text-red-600 rounded-xl">
              {boys.filter(b => b.status === 'inactive').length} Inactive
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="flex gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-28 bg-slate-100 rounded" />
                    <div className="h-3 w-36 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : boys.length === 0 ? (
          <div className="flex flex-col items-center py-20 bg-white rounded-3xl border border-slate-100">
            <p className="text-4xl mb-3">🛵</p>
            <p className="font-bold text-slate-400">No delivery partners yet</p>
            <p className="text-sm text-slate-400 mt-1">Approve delivery applications first</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boys.map(boy => {
              const stats = getBoyStats(boy.id);
              const isActive = boy.status !== 'inactive';
              return (
                <div key={boy.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all animate-fadeInUp ${
                  isActive ? 'border-slate-100' : 'border-red-100 bg-red-50/30'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 ${
                        isActive ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-slate-300'
                      }`}>
                        {boy.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">{boy.name}</p>
                        <p className="text-[10px] text-slate-400">{boy.phone || boy.email}</p>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${
                          isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(boy)}
                      disabled={toggling === boy.id}
                      className={`relative shrink-0 w-10 h-5 rounded-full transition-all duration-300 disabled:opacity-60 ${
                        isActive ? 'bg-green-500' : 'bg-slate-300'
                      }`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${
                        isActive ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Total',      value: stats.total,     color: '#3b82f6' },
                      { label: 'On Delivery', value: stats.active,    color: '#f97316' },
                      { label: 'Delivered',  value: stats.delivered, color: '#22c55e' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-base font-black" style={{ color: stat.color }}>{stat.value}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 leading-tight">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
