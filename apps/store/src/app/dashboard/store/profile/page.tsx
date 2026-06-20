'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { Address, UserData } from '@smart-bazar/shared/types/firestore';

export default function StoreProfilePage() {
  const { userData } = useAuthStore();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    if (userData) {
      const address = userData.addresses?.[0] || {} as Address;
      setFormData({
        name: userData.name || '',
        phone: userData.phone || '',
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        pincode: address.pincode || '',
      });
    }
  }, [userData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    
    setLoading(true);
    try {
      const addresses: Address[] = [{
        street: formData.street,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      }];
      
      const updateData: Partial<UserData> = {
        name: formData.name,
        phone: formData.phone,
        addresses,
      };

      await userService.updateUser(userData.id, updateData);
      
      // We don't automatically update authStore userData here to avoid 
      // complex state sync, but next reload it will be correct. 
      // A more robust approach would update the context too.
      addToast('Profile updated successfully! 🎉', 'success');
    } catch {
      addToast('Failed to update profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return <div className="p-10 text-center animate-pulse">Loading profile...</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-6 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Store Profile</h1>
        <p className="text-sm text-slate-500">Manage your business details and location</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Basic Details */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-amber-500">🏬</span> Business Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Store Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    placeholder="E.g., Fresh Mart"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    placeholder="10-digit mobile number"
                    required
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Address Details */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-orange-500">📍</span> Store Location
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Street Address</label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                    placeholder="Shop number, Street, Area"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Pincode</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Read-only system info */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Registered Email</p>
                <p className="text-sm font-semibold text-slate-900">{userData.email}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Account Category</p>
                <p className="text-sm font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                  {userData.vendorStore?.toUpperCase() || 'GENERAL'}
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 press-effect cursor-pointer"
              >
                {loading ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
