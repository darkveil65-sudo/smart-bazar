'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { clientAuth, clientDb, doc, getDoc, setDoc } from '@smart-bazar/shared/lib/firebase';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { getAppUrl } from '@smart-bazar/shared/lib/urls';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';

export default function CustomerAuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <AuthContent />
    </Suspense>
  );
}

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const { userData, initialized } = useAuthStore();

  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>('login');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'signup') setTab('signup');
    else if (tabParam === 'forgot') setTab('forgot');
    else setTab('login');
  }, [searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (!initialized || !userData) return;
    const roleRedirects: Record<string, string> = {
      admin: getAppUrl('admin') + '/dashboard/admin',
      'co-admin': getAppUrl('admin') + '/dashboard/admin',
      manager: getAppUrl('manager') + '/dashboard/manager',
      store: getAppUrl('store') + '/dashboard/store',
      delivery: getAppUrl('delivery') + '/dashboard/delivery',
    };
    if (roleRedirects[userData.role]) {
      window.location.href = roleRedirects[userData.role];
    } else {
      router.replace('/home');
    }
  }, [userData, initialized, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { addToast('Please fill all fields', 'error'); return; }
    setLoading(true);
    try {
       const { user: firebaseUser } = await signInWithEmailAndPassword(clientAuth, email, password);
       const userDoc = await getDoc(doc(clientDb, 'users', firebaseUser.uid));
       if (userDoc.exists()) {
         const data = userDoc.data();
         useAuthStore.setState({
           user: firebaseUser,
           userData: { id: userDoc.id, ...(data as UserData) },
           loading: false,
           initialized: true,
         });
        document.cookie = `userRole=${data.role}; path=/; max-age=86400`;
        addToast('Welcome back! 👋', 'success');
        const roleRedirects: Record<string, string> = {
          admin: getAppUrl('admin') + '/dashboard/admin',
          'co-admin': getAppUrl('admin') + '/dashboard/admin',
          manager: getAppUrl('manager') + '/dashboard/manager',
          store: getAppUrl('store') + '/dashboard/store',
          delivery: getAppUrl('delivery') + '/dashboard/delivery',
        };
        const target = roleRedirects[data.role];
        if (target) {
          window.location.href = target;
        } else {
          router.replace('/home');
        }
      } else {
        addToast('User profile not found', 'error');
      }
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found') {
        addToast('Invalid email or password', 'error');
      } else if (e.code === 'auth/too-many-requests') {
        addToast('Too many attempts. Try again later.', 'error');
      } else {
        addToast('Login failed. Check your connection.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { addToast('Please fill all fields', 'error'); return; }
    if (password !== confirmPassword) { addToast('Passwords do not match', 'error'); return; }
    if (password.length < 6) { addToast('Password must be at least 6 characters', 'error'); return; }
    setLoading(true);
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(clientAuth, email, password);
      const userData = { name: name.trim(), email, role: 'customer', createdAt: new Date().toISOString() };
      await setDoc(doc(clientDb, 'users', firebaseUser.uid), userData);
      document.cookie = 'userRole=customer; path=/; max-age=86400';
      addToast('Welcome to Smart Bazar! 🎉', 'success');
      router.replace('/home');
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'auth/email-already-in-use') addToast('Email already registered', 'error');
      else if (e.code === 'auth/weak-password') addToast('Password too weak', 'error');
      else addToast('Registration failed. Try again.', 'error');
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
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'auth/user-not-found') addToast('No account found with this email', 'error');
      else addToast('Failed to send reset email', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-gradient-hero-soft overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-400/12 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-teal-300/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-10 w-64 h-64 bg-emerald-300/10 rounded-full blur-3xl" />
      </div>

      {/* Top brand section */}
      <div className="flex-1 flex flex-col pt-16 pb-6 px-6 items-center text-center relative z-10">
        <div
          className="w-20 h-20 rounded-3xl bg-gradient-primary flex items-center justify-center mb-5 animate-scaleInBounce"
          style={{ boxShadow: '0 12px 32px rgba(5, 150, 105, 0.35)' }}
        >
          <span className="text-4xl">🛒</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight animate-fadeInUp" style={{ animationDelay: '80ms' }}>
          Smart Bazar
        </h1>
        <p className="text-muted-foreground text-sm mt-1.5 animate-fadeInUp" style={{ animationDelay: '140ms' }}>
          Groceries delivered in 30 minutes ⚡
        </p>

        {/* Trust badges */}
        <div className="flex gap-3 mt-5 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
          {['🥬 Fresh', '⚡ Fast', '💚 Trusted'].map((badge) => (
            <span
              key={badge}
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(5,150,105,0.1)', color: '#047857' }}
            >
              {badge}
            </span>
          ))}
        </div>

        {/* Hero CTA for New Users */}
        <div className="mt-8 animate-fadeInUp" style={{ animationDelay: '300ms' }}>
          <button 
            onClick={() => setTab('signup')}
            className="group flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-sm font-bold transition-all backdrop-blur-md border border-white/20 shadow-xl press-effect"
          >
            <span>New here? Create Account</span>
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Auth card — bottom sheet style */}
      <div
        className="relative z-10 bg-card w-full rounded-t-3xl animate-slideUp"
        style={{
          boxShadow: '0 -8px 40px rgba(0,0,0,0.08)',
          paddingBottom: 'max(2rem, calc(2rem + env(safe-area-inset-bottom, 0px)))',
        }}
      >
        {/* Tabs */}
        {tab !== 'forgot' && (
          <div className="flex pt-2 px-2 border-b border-border">
            {['login', 'signup'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t as 'login' | 'signup')}
                className={`flex-1 py-4 text-sm font-bold capitalize transition-all duration-300 relative ${
                  tab === t ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {t === 'signup' ? '✨ Create Account' : '👋 Sign In'}
                {tab === t && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full animate-scaleIn" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="px-6 py-6">
          {/* LOGIN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 animate-fadeIn">
              <div>
                <h2 className="text-xl font-bold">Welcome back 👋</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Sign in to continue shopping</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12v8H2V4zm0 0l6 5 6-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl text-sm border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-muted rounded-xl text-sm border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    {showPassword
                      ? <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 3l14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                    }
                  </button>
                </div>
                <div className="flex justify-end mt-1.5">
                  <button type="button" onClick={() => setTab('forgot')} className="text-xs text-primary hover:underline font-medium">
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200 press-effect disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 6px 20px rgba(5,150,105,0.3)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          )}

          {/* SIGNUP FORM */}
          {tab === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4 animate-fadeIn">
              <div>
                <h2 className="text-xl font-bold">Create account ✨</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Join Smart Bazar today</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2.5 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl text-sm border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12v8H2V4zm0 0l6 5 6-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl text-sm border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-muted rounded-xl text-sm border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-0.5">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl text-sm border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200 press-effect disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 6px 20px rgba(5,150,105,0.3)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Creating account...
                  </span>
                ) : 'Create Account'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4 animate-fadeIn">
              <button type="button" onClick={() => setTab('login')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground -ml-1 mb-1">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 13L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back
              </button>
              <div>
                <h2 className="text-xl font-bold">Reset password 🔑</h2>
                <p className="text-sm text-muted-foreground mt-0.5">We&apos;ll send a reset link to your email</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12v8H2V4zm0 0l6 5 6-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-muted rounded-xl text-sm border border-transparent focus:outline-none focus:border-primary focus:bg-white transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-white transition-all press-effect disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 6px 20px rgba(5,150,105,0.3)' }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {/* Footer note */}
          {tab === 'login' && (
            <p className="text-center text-xs text-muted-foreground mt-5">
              New here?{' '}
              <button type="button" onClick={() => setTab('signup')} className="text-primary font-semibold hover:underline">
                Create account →
              </button>
            </p>
          )}
          {tab === 'signup' && (
            <p className="text-center text-xs text-muted-foreground mt-5">
              Already have an account?{' '}
              <button type="button" onClick={() => setTab('login')} className="text-primary font-semibold hover:underline">
                Sign in →
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
