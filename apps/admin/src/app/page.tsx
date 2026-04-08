'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { clientAuth, clientDb } from '@smart-bazar/shared/lib/firebase';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import Button from '@smart-bazar/shared/components/ui/Button';
import Input from '@smart-bazar/shared/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { userData } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData) {
      if (['admin', 'co-admin'].includes(userData.role)) router.push('/dashboard/admin');
      else if (userData.role === 'manager') router.push('/dashboard/manager');
      else if (userData.role === 'store') router.push('/dashboard/store');
      else if (userData.role === 'delivery') router.push('/dashboard/delivery');
      else router.push('/home');
    }
  }, [userData, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(clientDb, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;

        document.cookie = `userRole=${role}; path=/; max-age=86400`;

        switch (role) {
          case 'admin':
          case 'co-admin':
            router.push('/dashboard/admin');
            break;
          case 'manager':
            router.push('/dashboard/manager');
            break;
          case 'store':
            router.push('/dashboard/store');
            break;
          case 'delivery':
            router.push('/dashboard/delivery');
            break;
          default:
            router.push('/home');
        }
        addToast('Login successful!', 'success');
      } else {
        addToast('User data not found', 'error');
      }
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === 'auth/invalid-credential') {
        addToast('Invalid email or password', 'error');
      } else if (err.code === 'auth/user-not-found') {
        addToast('User not found', 'error');
      } else {
        addToast('Login failed. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slideUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">🛒</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Smart Bazar</h1>
          <p className="text-muted-foreground mt-1">Grocery delivery in 30 minutes</p>
        </div>

        {/* Login card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
          <h2 className="text-xl font-semibold mb-6 text-center">Welcome Back</h2>
          <form onSubmit={handleLogin} className="space-y-1">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="Enter your email"
              required
              icon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.67 2.67H13.33C14.07 2.67 14.67 3.27 14.67 4V12C14.67 12.73 14.07 13.33 13.33 13.33H2.67C1.93 13.33 1.33 12.73 1.33 12V4C1.33 3.27 1.93 2.67 2.67 2.67Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M14.67 4L8 8.67L1.33 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              }
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
              required
              icon={
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3.33" y="7.33" width="9.33" height="6.67" rx="1.33" stroke="currentColor" strokeWidth="1.2"/><path d="M5.33 7.33V4.67a2.67 2.67 0 015.33 0v2.67" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              }
            />
            <Button
              variant="primary"
              className="w-full mt-2"
              type="submit"
              loading={loading}
              size="lg"
            >
              Login
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <button
                onClick={() => router.push('/register')}
                className="text-primary font-medium hover:underline"
              >
                Register here
              </button>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" onClick={() => router.push('/home')}>
            Continue as Guest →
          </Button>
        </div>
      </div>
    </div>
  );
}