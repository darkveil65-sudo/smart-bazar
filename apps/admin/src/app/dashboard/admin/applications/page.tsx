'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { applicationService } from '@smart-bazar/shared/lib/services/applicationService';
import { Application } from '@smart-bazar/shared/types/firestore';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';

export default function AdminApplicationsPage() {
  const { userData } = useAuthStore();
  const { addToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingIds, setProcessingIds] = useState<Record<string, 'approve' | 'reject' | null>>({});

  useEffect(() => {
    if (!userData || (userData.role !== 'admin' && userData.role !== 'co-admin')) return;
    const unsub = applicationService.subscribeToApplications(setApplications);
    return () => unsub();
  }, [userData]);

  const handleApproveApp = async (app: Application) => {
    if (!userData) return;
    setProcessingIds(prev => ({ ...prev, [app.id]: 'approve' }));
    try {
      await applicationService.approveApplication(app.id, app, userData.id);
      addToast('Application approved successfully 🎉', 'success');
    } catch (error) {
      console.error('Failed to approve application:', error);
      addToast('Failed to approve application', 'error');
    } finally {
      setProcessingIds(prev => ({ ...prev, [app.id]: null }));
    }
  };

  const handleRejectApp = async (id: string) => {
    if (!userData) return;
    setProcessingIds(prev => ({ ...prev, [id]: 'reject' }));
    try {
      await applicationService.rejectApplication(id, userData.id);
      addToast('Application rejected', 'info');
    } catch (error) {
      console.error('Failed to reject application:', error);
      addToast('Failed to reject application', 'error');
    } finally {
      setProcessingIds(prev => ({ ...prev, [id]: null }));
    }
  };

  const filteredApps = applications.filter(app => filter === 'all' ? true : app.status === filter);

  const searchMatch = (app: Application) => {
    const query = searchQuery.toLowerCase();
    return (
      (app.userName || '').toLowerCase().includes(query) ||
      (app.userEmail || '').toLowerCase().includes(query) ||
      (app.userPhone || '').toLowerCase().includes(query) ||
      (app.businessName || '').toLowerCase().includes(query) ||
      (app.storeCategory || '').toLowerCase().includes(query) ||
      (app.vehicleType || '').toLowerCase().includes(query) ||
      (app.vehicleNumber || '').toLowerCase().includes(query)
    );
  };

  const vendorApps = filteredApps.filter(app => app.type === 'store' && searchMatch(app));
  const deliveryApps = filteredApps.filter(app => app.type === 'delivery' && searchMatch(app));
  const managerApps = filteredApps.filter(app => app.type === 'manager' && searchMatch(app));

  const renderStatusBadge = (status: Application['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.02)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 border border-slate-500/20 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
            Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.05)] relative overflow-hidden">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
            Pending
          </span>
        );
    }
  };

  const renderActionButtons = (app: Application) => {
    const isProcessing = processingIds[app.id];
    
    if (app.status !== 'pending') {
      return (
        <span className="text-xs font-semibold text-slate-400 italic">
          Processed
        </span>
      );
    }

    return (
      <div className="flex justify-end gap-2">
        <button
          onClick={() => handleRejectApp(app.id)}
          disabled={!!isProcessing}
          className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 hover:text-red-600 hover:border-red-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
        >
          {isProcessing === 'reject' ? (
            <>
              <svg className="animate-spin h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Declining...
            </>
          ) : (
            'Reject'
          )}
        </button>
        
        <button
          onClick={() => handleApproveApp(app)}
          disabled={!!isProcessing}
          className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
        >
          {isProcessing === 'approve' ? (
            <>
              <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Approving...
            </>
          ) : (
            'Approve'
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="animate-fadeIn max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="mb-8 p-8 bg-slate-900 rounded-3xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2 flex items-center gap-3">
              Partner Applications <span className="text-3xl shadow-sm rounded-2xl bg-slate-800 p-1.5">📝</span>
            </h1>
            <p className="text-slate-400 font-medium max-w-md">
              Manage incoming partner requests for Store and Delivery networks in high-fidelity data tables.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl backdrop-blur border border-slate-700/50">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pending Queue</p>
              <p className="text-3xl font-black text-amber-400 leading-none">
                {applications.filter(a => a.status === 'pending').length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl border border-amber-500/30">
              ⏳
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Pending Applications</p>
            <h3 className="text-2xl font-black text-amber-600">{applications.filter(a => a.status === 'pending').length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-xl font-bold">
            ⏳
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Approved Partners</p>
            <h3 className="text-2xl font-black text-emerald-600">{applications.filter(a => a.status === 'approved').length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-xl font-bold">
            ✓
          </div>
        </div>
        <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Rejected Applications</p>
            <h3 className="text-2xl font-black text-slate-600">{applications.filter(a => a.status === 'rejected').length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center text-xl font-bold">
            ✕
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-4 border border-slate-200/80 rounded-3xl shadow-sm">
        {/* Filter Tabs */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-full md:w-auto overflow-x-auto hide-scrollbar">
          {(['pending', 'all', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap ${
                filter === tab
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              {tab}
              {tab === 'pending' && applications.filter(a => a.status === 'pending').length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] rounded-md font-bold">
                  {applications.filter(a => a.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-semibold text-slate-700"
          />
        </div>
      </div>

      {/* Tables Pipeline */}
      <div className="space-y-12">
        {/* Table 1: Vendor Signups */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div>
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                🏪 Vendor Signups
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Review store partners requesting access to list inventory and manage shops.
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
              {vendorApps.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Business & Contact</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Store Category</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Applied Date</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendorApps.length > 0 ? (
                  vendorApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div>
                          <div className="font-extrabold text-slate-900 text-base mb-0.5">{app.businessName || 'Unnamed Store'}</div>
                          <div className="flex flex-col gap-0.5 text-xs font-medium text-slate-500">
                            <span>👤 {app.userName || 'No Name'}</span>
                            <span>✉️ {app.userEmail || 'No Email'}</span>
                            <span>📞 {app.userPhone || 'No Phone'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 capitalize">
                          {app.storeCategory || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-medium text-slate-600 max-w-xs break-words">
                          📍 {app.businessAddress || 'No Address Provided'}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-xs font-semibold text-slate-500">
                          📅 {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {renderStatusBadge(app.status)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {renderActionButtons(app)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium text-sm">
                      No vendor applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Delivery Agent Signups */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div>
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                🛵 Delivery Agent Signups
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Review driver and rider onboarding requests to expand the fulfillment fleet.
              </p>
            </div>
            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg border border-purple-100">
              {deliveryApps.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Agent Details</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vehicle Details</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aadhar Verification</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Applied Date</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveryApps.length > 0 ? (
                  deliveryApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div>
                          <div className="font-extrabold text-slate-900 text-base mb-0.5">{app.userName || 'Unnamed Agent'}</div>
                          <div className="flex flex-col gap-0.5 text-xs font-medium text-slate-500">
                            <span>✉️ {app.userEmail || 'No Email'}</span>
                            <span>📞 {app.userPhone || 'No Phone'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 w-fit px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100 capitalize">
                            {app.vehicleType === 'bike' ? '🏍️' : app.vehicleType === 'scooter' ? '🛵' : '🚲'} {app.vehicleType || 'Unknown'}
                          </span>
                          {app.vehicleNumber && (
                            <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-fit">
                              {app.vehicleNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Aadhar Number</div>
                          <div className="text-sm font-semibold text-slate-700">
                            💳 {app.aadharNumber ? `•••• •••• ${app.aadharNumber.slice(-4)}` : 'Not provided'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-xs font-semibold text-slate-500">
                          📅 {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {renderStatusBadge(app.status)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {renderActionButtons(app)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium text-sm">
                      No delivery agent applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Conditionally display Managers Table if there are any manager signups */}
        {applications.some(app => app.type === 'manager') && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  📋 Manager Signups
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Review applications from branch and operational managers.
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-100">
                {managerApps.length} Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Manager Details</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Applied Date</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {managerApps.length > 0 ? (
                    managerApps.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div>
                            <div className="font-extrabold text-slate-900 text-base mb-0.5">{app.userName || 'Unnamed Manager'}</div>
                            <div className="flex flex-col gap-0.5 text-xs font-medium text-slate-500">
                              <span>✉️ {app.userEmail || 'No Email'}</span>
                              <span>📞 {app.userPhone || 'No Phone'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-xs font-semibold text-slate-500">
                            📅 {new Date(app.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {renderStatusBadge(app.status)}
                        </td>
                        <td className="px-6 py-5 text-right">
                          {renderActionButtons(app)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 font-medium text-sm">
                        No manager applications found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
