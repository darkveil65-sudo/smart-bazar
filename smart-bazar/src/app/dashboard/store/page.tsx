import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ui/ToastContext';
import { clientDb, collection, query, where, onSnapshot, orderBy } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const StoreDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState({ totalOrders: 0, pendingOrders: 0, completedOrders: 0, totalRevenue: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.customClaims?.role !== 'store') {
      addToast('Access denied', 'error');
      return;
    }

    const q = query(
      collection(clientDb, 'orders'),
      where('assignedStoreId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orderData: any[] = [];
      let pending = 0, completed = 0, revenue = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        orderData.push({ id: doc.id, ...data });
        if (data.status === 'store' || data.status === 'packed') pending++;
        if (data.status === 'completed') {
          completed++;
          revenue += data.totalAmount || 0;
        }
      });

      setOrders(orderData);
      setStats({ totalOrders: orderData.length, pendingOrders: pending, completedOrders: completed, totalRevenue: revenue });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, addToast]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await clientDb.doc(`orders/${orderId}`).update({ status: newStatus, updatedAt: new Date().toISOString() });
      addToast('Order status updated', 'success');
    } catch (error) {
      addToast('Failed to update order', 'error');
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 p-8"><div className="animate-pulse">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Store Dashboard</h1>
        <Button variant="outline" onClick={() => {}}>Logout</Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card><div className="p-4"><p className="text-sm text-gray-500">Total Orders</p><p className="text-2xl font-bold">{stats.totalOrders}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Pending</p><p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold text-green-600">{stats.completedOrders}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Revenue</p><p className="text-2xl font-bold">₹{stats.totalRevenue}</p></div></Card>
      </div>

      <h2 className="text-xl font-semibold mb-4">Orders</h2>
      <div className="space-y-4">
        {orders.map(order => (
          <Card key={order.id} className="border-l-4 border-yellow-500">
            <div className="p-4 flex justify-between items-start">
              <div>
                <h3 className="font-medium">Order #{order.id}</h3>
                <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                <p className="text-sm mt-2">Items: {order.items?.length || 0} | Amount: ₹{order.totalAmount}</p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm ${order.status === 'completed' ? 'bg-green-100 text-green-800' : order.status === 'packed' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {order.status}
                </span>
                {order.status === 'manager' && <Button variant="primary" size="sm" className="mt-2" onClick={() => updateOrderStatus(order.id, 'store')}>Accept Order</Button>}
                {order.status === 'store' && <Button variant="primary" size="sm" className="mt-2" onClick={() => updateOrderStatus(order.id, 'packed')}>Pack Order</Button>}
              </div>
            </div>
          </Card>
        ))}
        {orders.length === 0 && <p className="text-gray-500 text-center py-8">No orders assigned yet.</p>}
      </div>
    </div>
  );
};

export default StoreDashboard;