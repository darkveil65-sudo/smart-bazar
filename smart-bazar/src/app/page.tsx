'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { clientAuth as auth, clientDb as db } from '@/lib/firebase';
import { useToast } from '@/contexts/ui/ToastContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;
        
        // Set cookie for middleware
        document.cookie = `userRole=${role}; path=/; max-age=3600`;
        
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
          case 'customer':
            router.push('/home');
            break;
          default:
            router.push('/');
        }
        addToast('Login successful!', 'success');
      } else {
        addToast('User data not found', 'error');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/invalid-credential') {
        addToast('Invalid email or password', 'error');
      } else if (error.code === 'auth/user-not-found') {
        addToast('User not found', 'error');
      } else {
        addToast('Login failed. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">Smart Bazar</h1>
          <p className="text-gray-600 mt-2">Your favorite grocery delivery app</p>
        </div>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6 text-center">Login to Your Account</h2>
            <form onSubmit={handleLogin}>
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
                placeholder="Enter your password"
                required
              />
              <Button
                variant="primary"
                className="w-full mt-4"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <button
                  className="text-primary-600 hover:underline"
                  onClick={() => router.push('/register')}
                >
                  Register here
                </button>
              </p>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-gray-500 text-center">
                Demo Accounts (use any password):
              </p>
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <p>Admin: admin@smartbazar.com</p>
                <p>Manager: manager@smartbazar.com</p>
                <p>Store: store@smartbazar.com</p>
                <p>Delivery: delivery@smartbazar.com</p>
                <p>Customer: customer@smartbazar.com</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <Button variant="ghost" onClick={() => router.push('/home')}>
            Continue as Guest
          </Button>
        </div>
      </div>
    </div>
  );
}