'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { clientAuth, clientDb } from '@smart-bazar/shared/lib/firebase';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { UserData } from '@smart-bazar/shared/types/firestore';

const ALLOWED_ROLES: string[] = ['admin', 'co-admin'];
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'hapizulsk92@gmail.com';

export default function AdminLoginPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { userData, initialized } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Instant redirect if already logged in
  useEffect(() => {
    if (!initialized || !userData) return;
    if (ALLOWED_ROLES.includes(userData.role)) {
      router.replace('/dashboard/admin');
    } else {
      // Not an admin, kick them out
      clientAuth.signOut();
      useAuthStore.setState({ user: null, userData: null });
      document.cookie = 'userRole=; path=/; max-age=0';
      addToast('Access denied. Admin accounts only.', 'error');
    }
  }, [userData, initialized, router, addToast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { addToast('Please fill all fields', 'error'); return; }
    setLoading(true);
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(clientAuth, email, password);
      const userDoc = await getDoc(doc(clientDb, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        
        // Auto-promote designated admin email if role is incorrect
        if (firebaseUser.email === ADMIN_EMAIL && data.role !== 'admin') {
          await updateDoc(doc(clientDb, 'users', firebaseUser.uid), { role: 'admin' });
          data.role = 'admin';
          addToast('Account promoted to Administrator.', 'success');
        }

        if (!ALLOWED_ROLES.includes(data.role)) {
          await clientAuth.signOut();
          addToast('Access denied. This panel is for admins only.', 'error');
          return;
        }
        
        // Update local state and cookie before redirecting
        useAuthStore.setState({ 
          user: firebaseUser, 
          userData: { ...data, id: userDoc.id }, 
          loading: false, 
          initialized: true 
        });
        document.cookie = `userRole=${data.role}; path=/; max-age=86400`;
        
        addToast('Welcome back, Admin! 🎉', 'success');
        router.replace('/dashboard/admin');
      } else {
        // If it's the requested email but doc doesn't exist, auto-create it (Seeding logic)
        if (firebaseUser.email === ADMIN_EMAIL) {
          const newAdminData: Omit<UserData, 'id'> = {
            name: 'Super Admin',
            email: firebaseUser.email,
            role: 'admin',
            status: 'active',
            createdAt: serverTimestamp() as any,
          };
          await setDoc(doc(clientDb, 'users', firebaseUser.uid), newAdminData);
          useAuthStore.setState({ 
            user: firebaseUser, 
            userData: { ...newAdminData, id: firebaseUser.uid } as UserData, 
            loading: false, 
            initialized: true 
          });
          document.cookie = `userRole=admin; path=/; max-age=86400`;
          addToast('Admin account provisioned! Welcome.', 'success');
          router.replace('/dashboard/admin');
        } else {
          await clientAuth.signOut();
          addToast('Account profile not found.', 'error');
        }
      }
    } catch (err: any) {
      addToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) { addToast('Please fill all fields', 'error'); return; }
    setLoading(true);
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(clientAuth, email, password);
      
      const newAdminData: Omit<UserData, 'id'> = {
        name,
        email,
        role: 'admin',
        status: 'active',
        createdAt: serverTimestamp() as any,
      };

      await setDoc(doc(clientDb, 'users', firebaseUser.uid), newAdminData);
      
      useAuthStore.setState({ 
        user: firebaseUser, 
        userData: { ...newAdminData, id: firebaseUser.uid } as UserData, 
        loading: false, 
        initialized: true 
      });
      document.cookie = `userRole=admin; path=/; max-age=86400`;
      
      addToast('Admin account created! Redirecting...', 'success');
      router.replace('/dashboard/admin');
    } catch (err: any) {
      addToast(err.message || 'Signup failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { addToast('Please enter your email', 'error'); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(clientAuth, email);
      addToast('Reset link sent! Check your inbox.', 'success');
      setTab('login');
     } catch (error) {
       console.error('Failed to send reset email:', error);
       addToast('Failed to send reset email.', 'error');
     }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden relative">
      {/* ===== PREMIUM BACKGROUND ===== */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/20 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-indigo-600/10 rounded-full blur-[100px]" />
        
        {/* Animated Mesh Grid */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
          }}
        />
      </div>

      <div className="w-full max-w-md px-6 relative z-10 animate-fadeInUp">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20 mb-4 scale-110">
            <span className="text-3xl">🛒</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Smart Bazar</h1>
          <p className="text-slate-400 font-medium mt-1">Admin Control Center</p>
        </div>

        {/* Auth Card */}
        <div 
          className="rounded-[2.5rem] p-8 md:p-10 shadow-2xl overflow-hidden glass-card"
          style={{ 
            background: 'rgba(255, 255, 255, 0.03)', 
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Tabs */}
          <div className="flex p-1.5 bg-white/5 rounded-2xl mb-8 border border-white/5">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${tab === 'login' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              SIGN IN
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${tab === 'signup' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              REGISTER
            </button>
          </div>

          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6 animate-fadeIn">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@smartbazar.com"
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Secure Password</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => setTab('forgot')} className="text-xs text-blue-400 hover:text-blue-300 font-bold tracking-wide">Forgot Password?</button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-900/20 transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? 'AUTHENTICATING...' : 'ACCESS DASHBOARD'}
              </button>
            </form>
          )}

          {tab === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-6 animate-fadeIn">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Admin Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@smartbazar.com"
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-violet-900/20 transform transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ADMIN ACCOUNT'}
              </button>
            </form>
          )}

          {tab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-6 animate-fadeIn">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@smartbazar.com"
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-xl transform transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'SENDING...' : 'SEND RESET LINK'}
              </button>
              <button 
                type="button" 
                onClick={() => setTab('login')}
                className="w-full text-center text-xs text-slate-400 hover:text-white font-bold tracking-widest"
              >
                BACK TO SIGN IN
              </button>
            </form>
          )}
        </div>

        {/* Support Section */}
        <p className="text-center text-[10px] text-slate-600 mt-10 uppercase tracking-[0.3em] font-bold">
          Protected by Smart Bazar Security
        </p>
      </div>

      <style jsx>{`
        .glass-card {
          position: relative;
        }
        .glass-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent, rgba(255,255,255,0.05));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
