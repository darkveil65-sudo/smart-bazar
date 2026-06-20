'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { clientAuth, clientDb } from '@smart-bazar/shared/lib/firebase';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { UserData } from '@smart-bazar/shared/types/firestore';

// ✅ ONLY this email can access the admin panel
const ADMIN_EMAIL = 'hapizulsk92@gmail.com';

export default function AdminLoginPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { userData, initialized } = useAuthStore();
  const [screen, setScreen] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Redirect if already logged in as admin
  useEffect(() => {
    if (!initialized || !userData) return;
    if (userData.role === 'admin' || userData.role === 'co-admin') {
      router.replace('/dashboard/admin');
    } else {
      clientAuth.signOut();
      useAuthStore.setState({ user: null, userData: null });
      document.cookie = 'userRole=; path=/; max-age=0';
      addToast('Access denied. Admin only.', 'error');
    }
  }, [userData, initialized, router, addToast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { addToast('Please fill all fields', 'error'); return; }
    
    if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      addToast('Unauthorized admin email. Access denied.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(clientAuth, email, password);
      const userDocRef = doc(clientDb, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      let adminData: UserData;

      if (userDoc.exists()) {
        adminData = { ...userDoc.data() as UserData, id: userDoc.id };
        // Ensure role is admin
        if (adminData.role !== 'admin') {
          await import('firebase/firestore').then(({ updateDoc }) =>
            updateDoc(userDocRef, { role: 'admin' })
          );
          adminData.role = 'admin';
        }
      } else {
        // First time login — auto-create admin document
        const newDoc: Omit<UserData, 'id'> = {
          name: 'Super Admin',
          email: ADMIN_EMAIL,
          role: 'admin',
          status: 'active',
          createdAt: serverTimestamp() as any,
        };
        await setDoc(userDocRef, newDoc);
        adminData = { ...newDoc, id: firebaseUser.uid } as UserData;
        addToast('Admin profile created! Welcome.', 'success');
      }

      useAuthStore.setState({ user: firebaseUser, userData: adminData, loading: false, initialized: true });
      document.cookie = `userRole=admin; path=/; max-age=86400`;
      addToast('Welcome back, Admin! 🎉', 'success');
      router.replace('/dashboard/admin');
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        addToast('Incorrect password. Please try again.', 'error');
      } else if (code === 'auth/too-many-requests') {
        addToast('Too many attempts. Try again later or reset your password.', 'error');
      } else if (code === 'auth/user-not-found') {
        addToast('Admin account not found. Contact system administrator.', 'error');
      } else {
        addToast(err.message || 'Login failed', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(clientAuth, ADMIN_EMAIL);
      setResetSent(true);
      addToast(`Reset link sent to ${ADMIN_EMAIL}`, 'success');
    } catch {
      addToast('Failed to send reset email. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden relative">
      {/* ===== BACKGROUND ===== */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" style={{ animation: 'pulse-slow 8s infinite ease-in-out' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/20 rounded-full blur-[120px]" style={{ animation: 'pulse-slow 8s 2s infinite ease-in-out' }} />
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-indigo-600/10 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
          }}
        />
      </div>

      <div className="w-full max-w-md px-6 relative z-10" style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards' }}>
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20 mb-4">
            <span className="text-3xl">🛒</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Smart Bazar</h1>
          <p className="text-slate-400 font-medium mt-1">Admin Control Center</p>
        </div>

        {/* Card */}
        <div
          className="rounded-[2rem] p-8 shadow-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}
        >
          {screen === 'login' && (
            <form onSubmit={handleLogin} style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <h2 className="text-lg font-bold text-white mb-6">Administrator Sign In</h2>

              {/* Email Input */}
              <div className="space-y-2 mb-5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Admin Email</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@platform.com"
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-slate-600"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2 mb-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Password</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
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

              <div className="flex justify-end mb-6">
                <button
                  type="button"
                  onClick={() => setScreen('forgot')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold tracking-wide"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    AUTHENTICATING...
                  </span>
                ) : 'ACCESS DASHBOARD'}
              </button>
            </form>
          )}

          {screen === 'forgot' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <button
                onClick={() => { setScreen('login'); setResetSent(false); }}
                className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold mb-6 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 12L6 8l4-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to Sign In
              </button>

              <h2 className="text-lg font-bold text-white mb-2">Reset Password</h2>
              <p className="text-slate-400 text-sm mb-6">
                A password reset link will be sent to <span className="text-blue-400 font-semibold">{ADMIN_EMAIL}</span>
              </p>

              {resetSent ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">✅</span>
                  </div>
                  <p className="text-white font-bold mb-1">Reset link sent!</p>
                  <p className="text-slate-400 text-sm">Check your email inbox and follow the link to set a new password.</p>
                  <button
                    onClick={() => { setScreen('login'); setResetSent(false); }}
                    className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword}>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? 'SENDING...' : 'SEND RESET LINK'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-8 uppercase tracking-[0.3em] font-bold">
          Protected · Smart Bazar Admin · Authorized Access Only
        </p>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
