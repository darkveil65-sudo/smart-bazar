'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clientDb, collection, addDoc } from '@smart-bazar/shared/lib/firebase';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { CATEGORIES } from '@smart-bazar/shared/lib/constants';

type AppType = 'store' | 'delivery' | 'manager' | 'staff';

export default function PartnerApplicationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <PartnerApplicationContent />
    </Suspense>
  );
}

function PartnerApplicationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userData, user } = useAuthStore();
  const { addToast } = useToast();

  const [type, setType] = useState<AppType>('store');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const urlType = searchParams.get('type') as AppType;
    if (urlType === 'store' || urlType === 'delivery' || urlType === 'manager' || urlType === 'staff') {
      setType(urlType);
    }
  }, [searchParams]);
  
  // Form fields
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [storeCategory, setStoreCategory] = useState<string>(CATEGORIES[0].id);
  const [vehicleType, setVehicleType] = useState('Bike');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) return;
    
    setLoading(true);
    try {
      const applicationData = {
        userId: user.uid,
        userName: userData.name,
        userEmail: userData.email,
        type,
        status: 'pending',
        businessName: type === 'store' ? businessName : undefined,
        businessAddress,
        storeCategory: type === 'store' ? storeCategory : undefined,
        vehicleType: type === 'delivery' ? vehicleType : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(clientDb, 'applications'), applicationData);
      
      addToast('Application submitted successfully! 🚀', 'success');
      router.push('/home');
    } catch (err) {
      console.error(err);
      addToast('Failed to submit application. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 pt-12 pb-20 px-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10">
          <button 
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          <h1 className="text-3xl font-extrabold mb-2">Partner with Us</h1>
          <p className="text-emerald-100 text-sm opacity-90">Grow your business or earn on your own terms.</p>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="px-5 -mt-12 relative z-10">
        <div className="bg-white rounded-3xl shadow-xl shadow-emerald-900/5 p-6 border border-emerald-100">
          {/* Role Selector */}
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
            <button 
              onClick={() => setType('store')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${type === 'store' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              🏪 Store Partner
            </button>
            <button 
              onClick={() => setType('delivery')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${type === 'delivery' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              🚴 Delivery
            </button>
            <button 
              onClick={() => setType('manager')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${type === 'manager' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              💼 Manager
            </button>
            <button 
              onClick={() => setType('staff')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${type === 'staff' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
            >
              🛡️ Staff/Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {type === 'store' ? 'Store Details' : type === 'delivery' ? 'Rider Details' : 'Professional Details'}
              <span className="w-8 h-1 bg-emerald-500 rounded-full"></span>
            </h3>

            {type === 'store' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Business Name</label>
                <input 
                  type="text" 
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Fresh Mart Organic"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {type === 'store' ? 'Shop Address' : 'Residence Address'}
              </label>
              <textarea 
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="Full address with landmark"
                required
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium resize-none"
              />
            </div>

            {type === 'store' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Primary Category</label>
                <select 
                  value={storeCategory}
                  onChange={(e) => setStoreCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium appearance-none"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
            )}

            {type === 'delivery' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vehicle Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Bike', 'Scooter', 'Cycle', 'Other'].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVehicleType(v)}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all ${vehicleType === v ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-500'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all press-effect disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-4">
                By submitting, you agree to our Terms of Service. Our team will review your application within 24-48 hours.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
