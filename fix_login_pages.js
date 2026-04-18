const fs = require('fs');
const path = require('path');

// Config for each app: what role it's for, what icon/color/label to show
const appConfigs = {
  customer: {
    role: 'customer',
    title: 'Smart Bazar',
    subtitle: 'Grocery delivery in 30 minutes',
    cardTitle: 'Customer Login',
    roleLabel: '🛒 Customer Portal',
    roleDescription: 'Order groceries online',
    bgGradient: 'from-emerald-50 via-white to-emerald-50',
    icon: '🛒',
    showRegister: true,
    dashboardPath: '/home',
    dashboardApp: 'customer',
  },
  admin: {
    role: 'admin',
    title: 'Smart Bazar Admin',
    subtitle: 'Admin Management Panel',
    cardTitle: 'Admin Login',
    roleLabel: '🔑 Admin & Co-Admin Portal',
    roleDescription: 'Manage users, orders, and applications',
    bgGradient: 'from-red-50 via-white to-orange-50',
    icon: '🔑',
    showRegister: false,
    dashboardPath: '/dashboard/admin',
    dashboardApp: 'admin',
  },
  'co-admin': {
    role: 'co-admin',
    title: 'Smart Bazar Co-Admin',
    subtitle: 'Co-Admin Management Panel',
    cardTitle: 'Co-Admin Login',
    roleLabel: '🛡️ Co-Admin Portal',
    roleDescription: 'Manage users, orders, and applications',
    bgGradient: 'from-orange-50 via-white to-yellow-50',
    icon: '🛡️',
    showRegister: false,
    dashboardPath: '/dashboard/admin',
    dashboardApp: 'admin',
  },
  manager: {
    role: 'manager',
    title: 'Smart Bazar Manager',
    subtitle: 'Manager Operations Panel',
    cardTitle: 'Manager Login',
    roleLabel: '📋 Manager Portal',
    roleDescription: 'Oversee orders and store operations',
    bgGradient: 'from-purple-50 via-white to-violet-50',
    icon: '📋',
    showRegister: false,
    dashboardPath: '/dashboard/manager',
    dashboardApp: 'manager',
  },
  store: {
    role: 'store',
    title: 'Smart Bazar Store',
    subtitle: 'Store Management Panel',
    cardTitle: 'Store Login',
    roleLabel: '🏪 Store Portal',
    roleDescription: 'Manage your store products and orders',
    bgGradient: 'from-blue-50 via-white to-cyan-50',
    icon: '🏪',
    showRegister: false,
    dashboardPath: '/dashboard/store',
    dashboardApp: 'store',
  },
  delivery: {
    role: 'delivery',
    title: 'Smart Bazar Delivery',
    subtitle: 'Delivery Partner Panel',
    cardTitle: 'Delivery Login',
    roleLabel: '🚚 Delivery Portal',
    roleDescription: 'Manage your deliveries and orders',
    bgGradient: 'from-teal-50 via-white to-green-50',
    icon: '🚚',
    showRegister: false,
    dashboardPath: '/dashboard/delivery',
    dashboardApp: 'delivery',
  },
};

function generateLoginPage(appName, config) {
  const emailSvg = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.67 2.67H13.33C14.07 2.67 14.67 3.27 14.67 4V12C14.67 12.73 14.07 13.33 13.33 13.33H2.67C1.93 13.33 1.33 12.73 1.33 12V4C1.33 3.27 1.93 2.67 2.67 2.67Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M14.67 4L8 8.67L1.33 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>`;
  const lockSvg = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3.33" y="7.33" width="9.33" height="6.67" rx="1.33" stroke="currentColor" strokeWidth="1.2"/><path d="M5.33 7.33V4.67a2.67 2.67 0 015.33 0v2.67" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>`;

  const importUserData = appName !== 'customer' ? `\nimport { UserData } from '@smart-bazar/shared/types/firestore';` : '';
  const userDataFromStore = appName !== 'customer' ? `, user` : '';
  const userElseIf = appName !== 'customer' ? `
    } else if (user) {
      window.location.href = getAppUrl('customer') + '/home';` : '';

  const registerSection = config.showRegister ? `

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <button
                onClick={() => window.location.href = getAppUrl('customer') + '/register'}
                className="text-primary font-medium hover:underline"
              >
                Register here
              </button>
            </p>
          </div>` : `

          <div className="mt-4 p-3 bg-muted/50 rounded-xl">
            <p className="text-xs text-muted-foreground text-center">
              🔒 This portal is for <strong>${config.role === 'co-admin' ? 'admin & co-admin' : config.role}</strong> staff only.<br/>
              To register as a customer, visit the{' '}
              <button
                onClick={() => window.location.href = getAppUrl('customer')}
                className="text-primary font-medium hover:underline"
              >
                Customer App
              </button>
            </p>
          </div>`;

  const userDataCasting = appName !== 'customer' 
    ? `const userDocData = userDoc.data() as UserData;
        const role = userDocData.role;
        
        useAuthStore.setState({ 
          user: firebaseUser, 
          userData: { id: userDoc.id, ...userDocData } as UserData,
          loading: false 
        });`
    : `const userDocData = userDoc.data();
        const role = userDocData.role;

        useAuthStore.setState({ 
          user: firebaseUser, 
          userData: { id: userDoc.id, ...userDocData } as UserData,
          loading: false 
        });`;

  return `'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { clientAuth, clientDb } from '@smart-bazar/shared/lib/firebase';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { getAppUrl } from '@smart-bazar/shared/lib/urls';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';${importUserData}
import Button from '@smart-bazar/shared/components/ui/Button';
import Input from '@smart-bazar/shared/components/ui/Input';

export default function LoginPage() {
  const { addToast } = useToast();
  const { userData${userDataFromStore} } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData) {
      if (['admin', 'co-admin'].includes(userData.role)) window.location.href = getAppUrl('admin') + '/dashboard/admin';
      else if (userData.role === 'manager') window.location.href = getAppUrl('manager') + '/dashboard/manager';
      else if (userData.role === 'store') window.location.href = getAppUrl('store') + '/dashboard/store';
      else if (userData.role === 'delivery') window.location.href = getAppUrl('delivery') + '/dashboard/delivery';
      else window.location.href = getAppUrl('customer') + '/home';${userElseIf}
    }
  }, [userData${userDataFromStore}]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
      const firebaseUser = userCredential.user;

      const userDoc = await getDoc(doc(clientDb, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        ${userDataCasting}
        
        document.cookie = \`userRole=\${role}; path=/; max-age=86400\`;

        switch (role) {
          case 'admin':
          case 'co-admin':
            window.location.href = getAppUrl('admin') + '/dashboard/admin';
            break;
          case 'manager':
            window.location.href = getAppUrl('manager') + '/dashboard/manager';
            break;
          case 'store':
            window.location.href = getAppUrl('store') + '/dashboard/store';
            break;
          case 'delivery':
            window.location.href = getAppUrl('delivery') + '/dashboard/delivery';
            break;
          default:
            window.location.href = getAppUrl('customer') + '/home';
        }
        addToast('Login successful!', 'success');
      } else {
        addToast('User data not found in database', 'error');
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
    <div className={\`min-h-screen flex items-center justify-center p-4 bg-gradient-to-br ${config.bgGradient}\`}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slideUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">${config.icon}</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">${config.title}</h1>
          <p className="text-muted-foreground mt-1">${config.subtitle}</p>
          {/* Role Badge */}
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold">
            ${config.roleLabel}
          </div>
        </div>

        {/* Login card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
          <h2 className="text-xl font-semibold mb-1 text-center">${config.cardTitle}</h2>
          <p className="text-xs text-muted-foreground text-center mb-6">${config.roleDescription}</p>
          <form onSubmit={handleLogin} className="space-y-1">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="Enter your email"
              required
              icon={
                ${emailSvg}
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
                ${lockSvg}
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
          </form>${registerSection}
        </div>
      </div>
    </div>
  );
}
`;
}

Object.entries(appConfigs).forEach(([appName, config]) => {
  const filePath = path.join('apps', appName, 'src', 'app', 'page.tsx');
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${filePath} (not found)`);
    return;
  }
  const content = generateLoginPage(appName, config);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Updated ${appName} login page`);
});
