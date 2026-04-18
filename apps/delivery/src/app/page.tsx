'use client';

import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { clientAuth, clientDb } from '@smart-bazar/shared/lib/firebase';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { UserData } from '@smart-bazar/shared/types/firestore';
import { getAppUrl } from '@smart-bazar/shared/lib/urls';

const ALLOWED_ROLES: string[] = ["delivery"];

export default function LoginPage() {
  const { addToast } = useToast();
  const { userData } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData) {
      const roleMap: Record<string, string> = {
        admin: getAppUrl('admin') + '/dashboard/admin',
        'co-admin': getAppUrl('co-admin') + '/dashboard/admin',
        manager: getAppUrl('manager') + '/dashboard/manager',
        store: getAppUrl('store') + '/dashboard/store',
        delivery: getAppUrl('delivery') + '/dashboard/delivery',
        customer: getAppUrl('customer') + '/home',
      };
      const role = userData.role as string;
      if (role === 'delivery') {
        window.location.href = window.location.origin + '/dashboard/delivery';
      } else {
        window.location.href = roleMap[role] || getAppUrl('customer') + '/home';
      }
    }
  }, [userData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { addToast('Please fill all fields', 'error'); return; }
    setLoading(true);
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(clientAuth, email, password);
      const userDoc = await getDoc(doc(clientDb, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        const role = data.role;

        if (!ALLOWED_ROLES.includes(role)) {
          // Sign them out immediately and show an error
          await clientAuth.signOut();
          addToast('Access Denied. This panel is for Delivery accounts only.', 'error');
          return;
        }

        useAuthStore.setState({
          user: firebaseUser,
          userData: { ...data, id: userDoc.id } as UserData,
          loading: false,
        });
        document.cookie = "userRole=" + role + "; path=/; max-age=86400";
        addToast('Login successful!', 'success');
      } else {
        addToast('User profile not found. Contact admin.', 'error');
        await clientAuth.signOut();
      }
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found') {
        addToast('Invalid email or password', 'error');
      } else {
        addToast('Login failed. Please try again.', 'error');
      }
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
      addToast('Password reset email sent!', 'success');
      setTab('login');
    } catch (err) {
      addToast('Reset failed. Check if the email is correct.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const emailIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2.67 2.67H13.33C14.07 2.67 14.67 3.27 14.67 4V12C14.67 12.73 14.07 13.33 13.33 13.33H2.67C1.93 13.33 1.33 12.73 1.33 12V4C1.33 3.27 1.93 2.67 2.67 2.67Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M14.67 4L8 8.67L1.33 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
  const lockIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3.33" y="7.33" width="9.33" height="6.67" rx="1.33" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5.33 7.33V4.67a2.67 2.67 0 015.33 0v2.67" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );

  return (
    <div className={"min-h-screen flex items-center justify-center p-4 bg-gradient-to-br " + "from-slate-900 via-emerald-900/20 to-slate-900"}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className={"inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br " + "from-emerald-500 to-lime-500" + " rounded-3xl mb-4 shadow-2xl"}>
            <span className="text-4xl">🚚</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Smart Bazar Delivery</h1>
          <p className="text-slate-400 text-sm mt-1">Delivery Partner Panel</p>
        </div>

        <div className={"bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border " + "border-emerald-500/30" + " overflow-hidden"}>
          <div className="p-8">
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Delivery Login</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Sign in with your delivery account</p>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{emailIcon}</div>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all" />
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{lockIcon}</div>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setTab('forgot')} className={"text-xs " + "text-emerald-400" + " hover:underline"}>Forgot password?</button>
                </div>
                <button type="submit" disabled={loading} className={"w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r " + "from-emerald-500 to-lime-500" + " hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {tab === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <button type="button" onClick={() => setTab('login')} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-4 -ml-1 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Back to login
                  </button>
                  <h2 className="text-xl font-bold text-white">Reset Password</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Enter your email for reset link</p>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{emailIcon}</div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all" />
                </div>
                <button type="submit" disabled={loading} className={"w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r " + "from-emerald-500 to-lime-500" + " hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"}>
                  {loading ? 'Sending...' : 'Send Reset Email'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="mt-6 p-6 rounded-3xl bg-slate-800/40 border border-emerald-500/20 text-center backdrop-blur-sm animate-fadeIn" style={{ animationDelay: '300ms' }}>
          <p className="text-sm font-semibold text-white mb-3">Join as Delivery Partner</p>
          <button 
            onClick={() => window.location.href = getAppUrl('customer') + '/?tab=signup'}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500/20 to-lime-500/20 hover:from-emerald-500/30 hover:to-lime-500/30 text-emerald-300 rounded-full text-xs font-bold transition-all border border-emerald-500/30"
          >
            Become a Rider
          </button>
          <p className="text-[10px] text-slate-500 mt-3 uppercase tracking-widest font-bold">Earn • Deliver • Be Free</p>
        </div>

        <p className="text-center text-[10px] text-slate-700 mt-6 uppercase tracking-wider font-semibold">
          Delivery Fleet Portal
        </p>
      </div>
    </div>
  );
}
