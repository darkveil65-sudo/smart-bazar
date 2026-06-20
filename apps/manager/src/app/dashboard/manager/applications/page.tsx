'use client';

import { useState, useEffect } from 'react';
// Layout handled by parent
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { applicationService } from '@smart-bazar/shared/lib/services/applicationService';
import { Application } from '@smart-bazar/shared/types/firestore';
import { CATEGORY_MAP } from '@smart-bazar/shared/lib/constants';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

export default function ManagerApplicationsPage() {
  const { userData } = useAuthStore();
  const { addToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);

  useEffect(() => {
    const unsub = applicationService.subscribeToApplications((apps) => {
      setApplications(apps.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = applications.filter(a => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const handleApprove = async (app: Application) => {
    if (!userData) return;
    setProcessing(app.id);
    try {
      await applicationService.approveApplication(app.id, app, userData.id, userData.id);
      addToast(`${app.type === 'store' ? 'Store' : 'Delivery boy'} approved! 🎉`, 'success');
    } catch {
      addToast('Approval failed. Try again.', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !userData) return;
    setProcessing(rejectTarget.id);
    try {
      await applicationService.rejectApplication(rejectTarget.id, userData.id, rejectNotes);
      addToast('Application rejected', 'info');
      setRejectTarget(null);
      setRejectNotes('');
    } catch {
      addToast('Rejection failed', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="w-full max-w-7xl mx-auto animate-fadeIn">
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900">Partner Applications</h1>
          <p className="text-sm text-slate-500">
            Review and approve store & delivery partner requests
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            { key: 'pending', label: 'Pending', count: pendingCount, color: '#f59e0b' },
            { key: 'approved', label: 'Approved', color: '#22c55e' },
            { key: 'rejected', label: 'Rejected', color: '#ef4444' },
            { key: 'all', label: 'All', color: '#6b7280' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filter === tab.key ? 'text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
              }`}
              style={filter === tab.key ? { background: tab.color } : {}}
            >
              {tab.label}
              {'count' in tab && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filter === tab.key ? 'bg-white/30' : 'bg-red-100 text-red-600'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded bg-slate-100" />
                    <div className="h-3 w-60 rounded bg-slate-100" />
                    <div className="h-3 w-32 rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 bg-white rounded-3xl border border-slate-100">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-bold text-slate-400">No {filter} applications</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map(app => {
              const catCfg = app.storeCategory ? CATEGORY_MAP[app.storeCategory] : null;
              const typeColor = app.type === 'store' ? '#3b82f6' : '#f97316';
              const typeBg = app.type === 'store' ? '#dbeafe' : '#ffedd5';
              const typeIcon = app.type === 'store' ? '🏪' : '🛵';
              return (
                <div key={app.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-fadeInUp">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: typeBg }}>
                      {typeIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-slate-900 text-sm">{app.userName || app.userEmail}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                          style={{ background: typeBg, color: typeColor }}>
                          {app.type}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          app.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mb-2">{app.userEmail}</p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[10px] text-slate-600">
                        {app.businessName && (
                          <span>🏷️ {app.businessName}</span>
                        )}
                        {catCfg && (
                          <span>{catCfg.icon} {catCfg.name}</span>
                        )}
                        {app.vehicleType && (
                          <span>🛵 {app.vehicleType}</span>
                        )}
                        {app.vehicleNumber && (
                          <span>🔢 {app.vehicleNumber}</span>
                        )}
                        {app.businessAddress && (
                          <span className="col-span-2">📍 {app.businessAddress}</span>
                        )}
                        <span className="text-slate-400">
                          {new Date(app.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {app.adminNotes && (
                        <p className="mt-2 text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-lg">
                          Note: {app.adminNotes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {app.status === 'pending' && (
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(app)}
                          disabled={processing === app.id}
                          className="px-4 py-2 rounded-xl text-white text-[11px] font-bold disabled:opacity-60 transition-all press-effect"
                          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
                        >
                          {processing === app.id ? '...' : '✓ Approve'}
                        </button>
                        <button
                          onClick={() => setRejectTarget(app)}
                          className="px-4 py-2 rounded-xl text-red-500 border border-red-200 bg-red-50 text-[11px] font-bold hover:bg-red-100 transition-all"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectTarget(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scaleIn">
            <h2 className="font-bold text-slate-900 mb-1">Reject Application</h2>
            <p className="text-xs text-slate-500 mb-4">{rejectTarget.userEmail}</p>
            <textarea
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm resize-none focus:outline-none focus:border-red-300 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectTarget(null)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600">
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!processing}
                className="flex-1 py-2.5 rounded-2xl bg-red-500 text-white text-sm font-bold disabled:opacity-60"
              >
                {processing ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
