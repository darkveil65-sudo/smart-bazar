import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ui/ToastContext';
import { clientDb, collection, query, where, onSnapshot, orderBy } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const DeliveryDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState({ total: 0, inProgress: 0, completed: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.customClaims?.role !== 'delivery') {
      addToast('Access denied', 'error');
      return;
    }

    const q = query(
      collection(clientDb, 'orders'),
      where('assignedDeliveryBoyId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orderData: any[] = [];
      let inProgress = 0, completed = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        orderData.push({ id: doc.id, ...data });
        if (data.status === 'delivery') inProgress++;
        if (data.status === 'completed') completed++;
      });

      setOrders(orderData);
      setStats({ total: orderData.length, inProgress, completed });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, addToast]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await clientDb.doc(`orders/${orderId}`).update({ status: newStatus, updatedAt: new Date().toISOString() });
      addToast('Delivery status updated', 'success');
    } catch (error) {
      addToast('Failed to update status', 'error');
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 p-8"><div className="animate-pulse">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Delivery Dashboard</h1>
        <Button variant="outline" onClick={() => {}}>Logout</Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card><div className="p-4"><p className="text-sm text-gray-500">Total Deliveries</p><p className="text-2xl font-bold">{stats.total}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">In Progress</p><p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold text-green-600">{stats.completed}</p></div></Card>
      </div>

      <h2 className="text-xl font-semibold mb-4">Delivery Tasks</h2>
      <div className="space-y-4">
        {orders.map(order => (
          <Card key={order.id} className="border-l-4 border-blue-500">
            <div className="p-4 flex justify-between items-start">
              <div>
                <h3 className="font-medium">Order #{order.id}</h3>
                <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                <p className="text-sm mt-2">Amount: ₹{order.totalAmount}</p>
                {order.deliveryAddress && (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                    <p className="font-medium">Delivery Address:</p>
                    <p>{order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pincode}</p>
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-sm ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                  {order.status}
                </span>
                {order.status === 'packed' && <Button variant="primary" size="sm" className="mt-2" onClick={() => updateOrderStatus(order.id, 'delivery')}>Start Delivery</Button>}
                {order.status === 'delivery' && <Button variant="primary" size="sm" className="mt-2" onClick={() => updateOrderStatus(order.id, 'completed')}>Mark Delivered</Button>}
              </div>
            </div>
          </Card>
        ))}
        {orders.length === 0 && <p className="text-gray-500 text-center py-8">No delivery tasks assigned.</p>}
      </div>
    </div>
  );
};

export default DeliveryDashboard;