import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ui/ToastContext';
import { clientDb, collection, query, where, onSnapshot, orderBy } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

interface AdminDashboardProps {
  params: {};
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !(user.customClaims?.role === 'admin' || user.customClaims?.role === 'co-admin')) {
      // Redirect to home if not admin
      // In a real app, we'd use router.push('/')
      addToast('Access denied: Admin privileges required', 'error');
      return;
    }

    const loadStats = async () => {
      setLoading(true);
      try {
        // Fetch user count
        const usersSnapshot = await clientDb.collection('users').get();
        const totalUsers = usersSnapshot.size;
        
        // Fetch order stats
        const ordersSnapshot = await clientDb.collection('orders').get();
        let totalOrders = 0;
        let totalRevenue = 0;
        let pendingOrders = 0;
        
        ordersSnapshot.forEach(doc => {
          const orderData = doc.data();
          totalOrders++;
          totalRevenue += orderData.totalAmount || 0;
          if (orderData.status === 'pending') pendingOrders++;
        });
        
        setStats({
          totalUsers,
          totalOrders,
          totalRevenue,
          pendingOrders
        });
        
        // Fetch recent orders
        const recentOrdersQuery = query(
          clientDb.collection('orders'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        const recentOrdersUnsubscribe = onSnapshot(recentOrdersQuery, (snapshot) => {
          const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setRecentOrders(orders);
        });
        
        // Cleanup subscription on unmount
        return () => recentOrdersUnsubscribe();
      } catch (error) {
        console.error('Error loading admin dashboard:', error);
        addToast('Error loading dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user, addToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((_, index) => (
              <Card key={index} className="h-full">
                <div className="flex flex-col items-center justify-center h-full">
                  <Skeleton width="48px" height="48px" className="mb-4 rounded-full" />
                  <Skeleton width="60%" height="1.5rem" className="mb-2" />
                  <Skeleton width="40%" height="1rem" />
                </div>
              </Card>
            ))}
          </div>
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((_, index) => (
                <Card key={index} className="h-full">
                  <div className="flex flex-col items-center justify-center h-full">
                    <Skeleton width="40px" height="40px" className="mb-3 rounded-full" />
                    <Skeleton width="70%" height="1.25rem" className="mb-1" />
                    <Skeleton width="50%" height="1rem" className="mb-1" />
                    <Skeleton width="30%" height="1rem" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, Admin!</span>
            <Button variant="outline" onClick={() => {/* Logout logic */}}>
              Logout
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <div className="flex items-center justify-between p-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-primary-600">{stats.totalUsers}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-1.1.45-2.156 1.208-2.856M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.65.275-1.235.725-1.566" />
                </svg>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center justify-between p-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-primary-600">{stats.totalOrders}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center justify-between p-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-primary-600">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                </svg>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center justify-between p-6">
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Pending Orders</p>
                <p className="text-2xl font-bold text-primary-600">{stats.pendingOrders}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16l-3-3m0 0l-3 3m3 3V8" />
                </svg>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Recent Orders */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent orders found.</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <Card key={order.id} className="border-l-4">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium">Order #{order.id}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium
                        ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'manager' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'store' ? 'bg-indigo-100 text-indigo-800' :
                          order.status === 'packed' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'delivery' ? 'bg-pink-100 text-pink-800' :
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Customer:</span>
                        <span className="text-sm">{order.customerId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Amount:</span>
                        <span className="text-sm font-bold">₹{order.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Items:</span>
                        <span className="text-sm">{order.items?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">User Management</h3>
              <p className="text-gray-600 mb-4">Manage user accounts, roles, and permissions</p>
              <Button variant="primary" onClick={() => {/* Navigate to user management */}}>
                Manage Users
              </Button>
            </div>
          </Card>
          
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Category Management</h3>
              <p className="text-gray-600 mb-4">Manage product categories and subcategories</p>
              <Button variant="primary" onClick={() => {/* Navigate to category management */}}>
                Manage Categories
              </Button>
            </div>
          </Card>
          
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Store Applications</h3>
              <p className="text-gray-600 mb-4">Review and approve store applications</p>
              <Button variant="primary" onClick={() => {/* Navigate to applications */}}>
                Review Applications
              </Button>
            </div>
          </Card>
          
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Delivery Applications</h3>
              <p className="text-gray-600 mb-4">Review and approve delivery applications</p>
              <Button variant="primary" onClick={() => {/* Navigate to applications */}}>
                Review Applications
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;