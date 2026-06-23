'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { clientAuth, clientDb } from '@smart-bazar/shared/lib/firebase';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { UserData } from '@smart-bazar/shared/types/firestore';

export default function StoreAuthPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { userData } = useAuthStore();

  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>('login');

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (userData) {
      if (userData.role === 'store' && userData.status === 'active') {
        router.replace('/dashboard/store');
      }
    }
  }, [userData, router]);

  // ─── LOGIN ────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { addToast('Please fill all fields', 'error'); return; }
    setLoading(true);
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(clientAuth, email, password);
      const userDoc = await getDoc(doc(clientDb, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;

        // Must be store role
        if (data.role !== 'store') {
          await clientAuth.signOut();
          addToast('Access Denied. This panel is for Store accounts only.', 'error');
          return;
        }

        // Must be approved (active) by manager
        if (data.status !== 'active') {
          await clientAuth.signOut();
          addToast('Your account is pending approval by the Manager. Please wait.', 'warning');
          return;
        }

        useAuthStore.setState({
          user: firebaseUser,
          userData: { ...data, id: userDoc.id } as UserData,
          loading: false,
          initialized: true,
        });
        localStorage.setItem('sb_userData', JSON.stringify({ ...data, id: userDoc.id }));
        document.cookie = 'userRole=store; path=/; max-age=86400';
        addToast('Welcome back! 👋', 'success');
        router.replace('/dashboard/store');
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

  // ─── SIGNUP ───────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPhone || !signupPassword || !signupConfirm) {
      addToast('Please fill all fields', 'error'); return;
    }
    if (signupPassword !== signupConfirm) {
      addToast('Passwords do not match', 'error'); return;
    }
    if (signupPassword.length < 6) {
      addToast('Password must be at least 6 characters', 'error'); return;
    }
    setLoading(true);
    try {
      // 1. Create Firebase Auth user
      const { user: firebaseUser } = await createUserWithEmailAndPassword(clientAuth, signupEmail, signupPassword);

      // 2. Save user to Firestore with role=customer, status=pending
      const userData = {
        name: signupName.trim(),
        email: signupEmail,
        phone: signupPhone.trim(),
        role: 'customer' as const,        // customer role until approved
        status: 'inactive' as const,      // blocked until manager approves
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(clientDb, 'users', firebaseUser.uid), userData);

      // 3. Create a store application (for manager to review)
      await addDoc(collection(clientDb, 'applications'), {
        userId: firebaseUser.uid,
        userName: signupName.trim(),
        userEmail: signupEmail,
        userPhone: signupPhone.trim(),
        type: 'store',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 4. Sign them OUT immediately — they must wait for approval
      await clientAuth.signOut();

      addToast('Account created! 🎉 Wait for Manager approval before logging in.', 'success');
      setTab('login');
      // Clear signup fields
      setSignupName(''); setSignupEmail(''); setSignupPhone('');
      setSignupPassword(''); setSignupConfirm('');
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'auth/email-already-in-use') addToast('Email already registered', 'error');
      else if (e.code === 'auth/weak-password') addToast('Password too weak', 'error');
      else addToast('Registration failed. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── FORGOT PASSWORD ──────────────────────────────────────
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

  // ─── ICONS ────────────────────────────────────────────────
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
      <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2.5 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
  const phoneIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 2h4l1.5 3.5-1.75 1.25C6.5 8.5 7.5 9.5 9.25 10.25L10.5 8.5 14 10v4c0 0-2 1-6-3S1 3 2 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const inputCls = "w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all";
  const btnCls = "w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-amber-900/10 to-slate-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl mb-4 shadow-2xl">
            <span className="text-4xl">🏪</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Allkart Store</h1>
          <p className="text-slate-400 text-sm mt-1">Store Partner Panel</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-amber-500/30 overflow-hidden">
          {/* Tabs */}
          {tab !== 'forgot' && (
            <div className="flex border-b border-slate-700">
              {(['login', 'signup'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-4 text-sm font-bold capitalize transition-all relative ${
                    tab === t ? 'text-amber-500' : 'text-slate-500'
                  }`}
                >
                  {t === 'login' ? '👋 Sign In' : '✨ Register'}
                  {tab === t && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-amber-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="p-8">
            {/* ── LOGIN FORM ── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Store Login</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Sign in with your approved store account</p>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{emailIcon}</div>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className={inputCls} />
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{lockIcon}</div>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className={inputCls} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setTab('forgot')} className="text-xs text-amber-400 hover:underline">Forgot password?</button>
                </div>
                <button type="submit" disabled={loading} className={btnCls}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {/* ── SIGNUP FORM ── */}
            {tab === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Create Store Account</h2>
                  <p className="text-sm text-slate-400 mt-0.5">Manager will approve your account</p>
                </div>
                <div className="space-y-3">
                  {/* Name */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{userIcon}</div>
                    <input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="Full Name" required className={inputCls} />
                  </div>
                  {/* Email */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{emailIcon}</div>
                    <input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="Email" required className={inputCls} />
                  </div>
                  {/* Phone */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{phoneIcon}</div>
                    <input type="tel" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} placeholder="Phone Number" required className={inputCls} />
                  </div>
                  {/* Password */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{lockIcon}</div>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Password (min 6 chars)"
                      required
                      className={inputCls + ' pr-10'}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                    </button>
                  </div>
                  {/* Confirm Password */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{lockIcon}</div>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={signupConfirm}
                      onChange={(e) => setSignupConfirm(e.target.value)}
                      placeholder="Confirm Password"
                      required
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Info banner */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex gap-2 items-start">
                  <span className="text-lg mt-0.5">ℹ️</span>
                  <p className="text-[11px] text-amber-300 leading-relaxed">
                    After registration, your application will be reviewed by a Manager. You can log in only after approval.
                  </p>
                </div>

                <button type="submit" disabled={loading} className={btnCls}>
                  {loading ? 'Creating Account...' : 'Create Account & Apply'}
                </button>
              </form>
            )}

            {/* ── FORGOT PASSWORD FORM ── */}
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
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className={inputCls} />
                </div>
                <button type="submit" disabled={loading} className={btnCls}>
                  {loading ? 'Sending...' : 'Send Reset Email'}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-700 mt-6 uppercase tracking-wider font-semibold">
          Store Partner Portal
        </p>
      </div>
    </div>
  );
}
