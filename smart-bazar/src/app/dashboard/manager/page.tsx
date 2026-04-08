import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ui/ToastContext';
import { clientDb, collection, query, where, onSnapshot, orderBy, doc, updateDoc } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const ManagerDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState({ pendingOrders: 0, assignedOrders: 0, storeApps: 0, deliveryApps: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.customClaims?.role !== 'manager') {
      addToast('Access denied', 'error');
      return;
    }

    // Fetch pending orders
    const ordersQ = query(collection(clientDb, 'orders'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const ordersUnsub = onSnapshot(ordersQ, (snapshot) => {
      const orderData: any[] = [];
      snapshot.forEach(doc => orderData.push({ id: doc.id, ...doc.data() }));
      setOrders(orderData);
      setStats(prev => ({ ...prev, pendingOrders: orderData.length }));
    });

    // Fetch applications
    const appsQ = query(collection(clientDb, 'applications'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const appsUnsub = onSnapshot(appsQ, (snapshot) => {
      const appData: any[] = [];
      snapshot.forEach(doc => appData.push({ id: doc.id, ...doc.data() }));
      setApplications(appData);
      const stores = appData.filter(a => a.type === 'store').length;
      const delivery = appData.filter(a => a.type === 'delivery').length;
      setStats(prev => ({ ...prev, storeApps: stores, deliveryApps: delivery }));
      setLoading(false);
    });

    return () => { ordersUnsub(); appsUnsub(); };
  }, [user, addToast]);

  const assignOrderToStore = async (orderId: string, storeId: string) => {
    try {
      await updateDoc(doc(clientDb, 'orders', orderId), {
        assignedStoreId: storeId,
        assignedManagerId: user?.uid,
        status: 'manager',
        updatedAt: new Date().toISOString()
      });
      addToast('Order assigned to store', 'success');
    } catch (error) {
      addToast('Failed to assign order', 'error');
    }
  };

  const updateApplication = async (appId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(clientDb, 'applications', appId), { status, updatedAt: new Date().toISOString() });
      addToast(`Application ${status}`, 'success');
    } catch (error) {
      addToast('Failed to update application', 'error');
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 p-8"><div className="animate-pulse">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Manager Dashboard</h1>
        <Button variant="outline" onClick={() => {}}>Logout</Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card><div className="p-4"><p className="text-sm text-gray-500">Pending Orders</p><p className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Store Applications</p><p className="text-2xl font-bold">{stats.storeApps}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">Delivery Applications</p><p className="text-2xl font-bold">{stats.deliveryApps}</p></div></Card>
        <Card><div className="p-4"><p className="text-sm text-gray-500">My Assigned</p><p className="text-2xl font-bold">{stats.assignedOrders}</p></div></Card>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Pending Orders</h2>
          <div className="space-y-4">
            {orders.map(order => (
              <Card key={order.id}>
                <div className="p-4">
                  <h3 className="font-medium">Order #{order.id}</h3>
                  <p className="text-sm text-gray-500">Amount: ₹{order.totalAmount} | Items: {order.items?.length || 0}</p>
                  <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                  <Button variant="primary" size="sm" className="mt-2" onClick={() => assignOrderToStore(order.id, 'STORE_ID')}>
                    Assign to Store
                  </Button>
                </div>
              </Card>
            ))}
            {orders.length === 0 && <p className="text-gray-500">No pending orders.</p>}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Applications</h2>
          <div className="space-y-4">
            {applications.map(app => (
              <Card key={app.id}>
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{app.type === 'store' ? app.businessName : 'Delivery Application'}</h3>
                      <p className="text-sm text-gray-500">Type: {app.type}</p>
                      <p className="text-sm text-gray-500">{new Date(app.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={() => updateApplication(app.id, 'approved')}>Approve</Button>
                      <Button variant="outline" size="sm" onClick={() => updateApplication(app.id, 'rejected')}>Reject</Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {applications.length === 0 && <p className="text-gray-500">No pending applications.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;