'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { clientAuth, clientDb } from '@smart-bazar/shared/lib/firebase';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { UserData } from '@smart-bazar/shared/types/firestore';
import { getAppUrl } from '@smart-bazar/shared/lib/urls';

const ALLOWED_ROLES: string[] = ['manager'];

export default function LoginPage() {
  const { addToast } = useToast();
  const { userData } = useAuthStore();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isRegistering = useRef(false);

  // Auto-redirect if already logged in as manager
  useEffect(() => {
    if (userData && !isRegistering.current) {
      const roleMap: Record<string, string> = {
        admin: getAppUrl('admin') + '/dashboard/admin',
        'co-admin': getAppUrl('co-admin') + '/dashboard/admin',
        manager: window.location.origin + '/dashboard/manager',
        store: getAppUrl('store') + '/dashboard/store',
        delivery: getAppUrl('delivery') + '/dashboard/delivery',
        customer: getAppUrl('customer') + '/home',
      };
      const role = userData.role as string;
      window.location.href = roleMap[role] || getAppUrl('customer') + '/home';
    }
  }, [userData]);

  // ─── LOGIN ───────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { addToast('Please fill all fields', 'error'); return; }
    setLoading(true);
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(clientAuth, email, password);
      const userDoc = await getDoc(doc(clientDb, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        if (!ALLOWED_ROLES.includes(data.role)) {
          await clientAuth.signOut();
          addToast('Access Denied. This panel is for Manager accounts only.', 'error');
          return;
        }
        useAuthStore.setState({
          user: firebaseUser,
          userData: { ...data, id: userDoc.id } as UserData,
          loading: false,
        });
        document.cookie = 'userRole=' + data.role + '; path=/; max-age=86400';
        addToast('Welcome back! Redirecting...', 'success');
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

  // ─── REGISTER + APPLY ─────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail || !regPassword || !regConfirm) {
      addToast('Please fill all required fields', 'error'); return;
    }
    if (regPassword !== regConfirm) {
      addToast('Passwords do not match', 'error'); return;
    }
    if (regPassword.length < 6) {
      addToast('Password must be at least 6 characters', 'error'); return;
    }
    setLoading(true);
    isRegistering.current = true;
    try {
      // 1. Create Firebase Auth account
      const { user: firebaseUser } = await createUserWithEmailAndPassword(clientAuth, regEmail, regPassword);

      // 2. Create Firestore user doc (role = customer until approved)
      const now = new Date().toISOString();
      const userDocData: any = {
        name: regName.trim(),
        email: regEmail,
        role: 'customer',
        status: 'active',
        createdAt: now,
      };
      if (regPhone) {
        userDocData.phone = regPhone;
      }
      await setDoc(doc(clientDb, 'users', firebaseUser.uid), userDocData);

      // 3. Submit manager application
      await addDoc(collection(clientDb, 'applications'), {
        userId: firebaseUser.uid,
        userName: regName.trim(),
        userEmail: regEmail,
        userPhone: regPhone || '',
        type: 'manager',
        status: 'pending',
        createdAt: now,
      });

      // 4. Sign them out — they need approval first
      await clientAuth.signOut();

      setSubmitted(true);
      addToast('Application submitted! Waiting for admin approval.', 'success');
    } catch (err: unknown) {
      console.error("Manager Registration Error: ", err);
      const e = err as { code?: string };
      if (e.code === 'auth/email-already-in-use') {
        addToast('This email is already registered. Try logging in.', 'error');
      } else {
        addToast('Registration failed. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
      isRegistering.current = false;
    }
  };

  // ─── FORGOT PASSWORD ─────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { addToast('Please enter your email', 'error'); return; }
    setLoading(true);
    try {
      await sendPasswordResetEmail(clientAuth, email);
      addToast('Password reset email sent!', 'success');
      setTab('login');
    } catch {
      addToast('Reset failed. Check if the email is correct.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── ICONS ───────────────────────────────────────────────────
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
  const userIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5.33" r="2.67" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2.67 13.33C2.67 11.12 5.06 9.33 8 9.33s5.33 1.79 5.33 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
  const phoneIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="4" y="1.33" width="8" height="13.33" rx="1.33" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="8" cy="12" r="0.67" fill="currentColor"/>
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-3xl mb-4 shadow-2xl">
            <span className="text-4xl">📋</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Smart Bazar Manager</h1>
          <p className="text-slate-400 text-sm mt-1">Operations Management Panel</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 bg-slate-800/60 rounded-2xl mb-4 backdrop-blur-sm border border-slate-700/50">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSubmitted(false); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'login' ? '👋 Sign In' : '✍️ Register'}
            </button>
          ))}
        </div>

        <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-emerald-500/20 overflow-hidden">
          <div className="p-7">

            {/* ── LOGIN TAB ── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Welcome Back</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Sign in with your manager credentials</p>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{emailIcon}</div>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email" required
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all" />
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{lockIcon}</div>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password" required
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setTab('forgot')}
                    className="text-xs text-emerald-400 hover:underline">Forgot password?</button>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg">
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {/* ── REGISTER TAB ── */}
            {tab === 'register' && !submitted && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Apply as Manager</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Create your account & submit application</p>
                </div>
                <div className="space-y-3">
                  {/* Full Name */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{userIcon}</div>
                    <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)}
                      placeholder="Full Name *" required
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all" />
                  </div>
                  {/* Email */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{emailIcon}</div>
                    <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="Email Address *" required
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all" />
                  </div>
                  {/* Phone */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{phoneIcon}</div>
                    <input type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="Phone Number (optional)"
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all" />
                  </div>
                  {/* Password */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{lockIcon}</div>
                    <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Password * (min 6 chars)" required
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all" />
                  </div>
                  {/* Confirm Password */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{lockIcon}</div>
                    <input type="password" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)}
                      placeholder="Confirm Password *" required
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all" />
                  </div>
                </div>

                <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-700/30 rounded-xl p-3">
                  <span className="mt-0.5">ℹ️</span>
                  <span>Your application will be reviewed by the Admin. You can login once approved.</span>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg">
                  {loading ? 'Submitting...' : '📨 Submit Application'}
                </button>
              </form>
            )}

            {/* ── SUCCESS STATE after register ── */}
            {tab === 'register' && submitted && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-3xl">
                  ✅
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Application Submitted!</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Your manager application is under review.<br/>
                    You&apos;ll be able to log in once approved by the Admin.
                  </p>
                </div>
                <button
                  onClick={() => { setTab('login'); setSubmitted(false); }}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500">
                  Go to Login
                </button>
              </div>
            )}

            {/* ── FORGOT PASSWORD TAB ── */}
            {tab === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <button type="button" onClick={() => setTab('login')}
                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-4 -ml-1 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Back to login
                  </button>
                  <h2 className="text-xl font-bold text-white">Reset Password</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Enter your email for reset link</p>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{emailIcon}</div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email" required
                    className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg">
                  {loading ? 'Sending...' : 'Send Reset Email'}
                </button>
              </form>
            )}

          </div>
        </div>

        <p className="text-center text-[10px] text-slate-700 mt-6 uppercase tracking-wider font-semibold">
          Smart Bazar • Operational Control Portal
        </p>
      </div>
    </div>
  );
}
