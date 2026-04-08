'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const ManagerDashboard = () => {
  const router = useRouter();
  const [stats] = useState({ pendingOrders: 0, storeApps: 0, deliveryApps: 0 });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Manager Dashboard</h1>
        <Button variant="outline" onClick={() => router.push('/')}>
          Logout
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <div className="p-6">
            <p className="text-sm text-gray-500">Pending Orders</p>
            <p className="text-2xl font-bold">{stats.pendingOrders}</p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm text-gray-500">Store Applications</p>
            <p className="text-2xl font-bold">{stats.storeApps}</p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm text-gray-500">Delivery Applications</p>
            <p className="text-2xl font-bold">{stats.deliveryApps}</p>
          </div>
        </Card>
      </div>

      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Welcome to Manager Panel</h2>
        <p className="text-gray-500">Configure Firebase to see orders and applications</p>
      </div>
    </div>
  );
};

export default ManagerDashboard;