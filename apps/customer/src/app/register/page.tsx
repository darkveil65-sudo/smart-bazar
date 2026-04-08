'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { clientAuth, clientDb, doc, setDoc } from '@smart-bazar/shared/lib/firebase';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import Button from '@smart-bazar/shared/components/ui/Button';
import Input from '@smart-bazar/shared/components/ui/Input';

export default function RegisterPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      addToast('Please fill all fields', 'error');
      return;
    }
    if (password !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }
    if (password.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(clientAuth, email, password);
      const user = userCredential.user;

      await setDoc(doc(clientDb, 'users', user.uid), {
        name,
        email,
        role: 'customer',
        createdAt: new Date().toISOString(),
      });

      document.cookie = 'userRole=customer; path=/; max-age=86400';
      addToast('Account created successfully!', 'success');
      router.push('/home');
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === 'auth/email-already-in-use') {
        addToast('Email already in use', 'error');
      } else if (err.code === 'auth/weak-password') {
        addToast('Password is too weak', 'error');
      } else {
        addToast('Registration failed. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slideUp">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">🛒</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Create Account</h1>
          <p className="text-muted-foreground mt-1">Join Smart Bazar today</p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
          <form onSubmit={handleRegister} className="space-y-1">
            <Input
              label="Full Name"
              value={name}
              onChange={setName}
              placeholder="Enter your name"
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="Enter your email"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Min 6 characters"
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm your password"
              required
            />
            <Button variant="primary" className="w-full mt-2" type="submit" loading={loading} size="lg">
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button onClick={() => router.push('/')} className="text-primary font-medium hover:underline">
                Login here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
