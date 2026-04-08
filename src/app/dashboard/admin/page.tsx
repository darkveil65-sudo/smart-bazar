'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const AdminDashboard = () => {
  const router = useRouter();
  const [stats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0
  });
  const [loading] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <Button variant="outline" onClick={() => router.push('/')}>
          Logout
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <div className="p-6">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold">{stats.totalUsers}</p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm text-gray-500">Revenue</p>
            <p className="text-2xl font-bold">₹{stats.totalRevenue}</p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm text-gray-500">Pending Orders</p>
            <p className="text-2xl font-bold">{stats.pendingOrders}</p>
          </div>
        </Card>
      </div>

      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Welcome to Smart Bazar Admin</h2>
        <p className="text-gray-500">Configure Firebase to see real data</p>
      </div>
    </div>
  );
};

export default AdminDashboard;