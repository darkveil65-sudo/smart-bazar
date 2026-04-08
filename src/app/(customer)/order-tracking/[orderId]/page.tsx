import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ui/ToastContext';
import { clientDb, doc, onSnapshot } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

interface OrderTrackingProps {
  params: {
    orderId: string;
  };
}

const OrderTracking = ({ params }: OrderTrackingProps) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const { orderId } = params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

  // Define the order status flow
  const statusFlow = ['pending', 'manager', 'store', 'packed', 'delivery', 'completed', 'cancelled'];

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const orderDoc = clientDb.doc(`orders/${orderId}`);
    const unsubscribe = onSnapshot(orderDoc, (doc) => {
      if (doc.exists() && doc.data().customerId === user.uid) {
        const orderData = {
          id: doc.id,
          ...doc.data()
        };
        setOrder(orderData);
        
        // Create status history based on current status and timestamps
        const history = [];
        statusFlow.forEach((status, index) => {
          // For simplicity, we're estimating timestamps based on order creation
          // In a real app, you'd store actual timestamps for each status change
          const statusTime = new Date(orderData.createdAt);
          statusTime.setMinutes(statusTime.getMinutes() + (index * 5)); // 5 min per status
          
          history.push({
            status,
            completed: orderData.status === status || 
                      statusFlow.indexOf(orderData.status) > index,
            timestamp: statusTime.toISOString(),
            description: getStatusDescription(status)
          });
        });
        
        setStatusHistory(history);
      } else {
        addToast('Order not found or access denied', 'error');
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [user, orderId, router, addToast]);

  const getStatusDescription = (status: string): string => {
    const descriptions: Record<string, string> = {
      pending: 'Order placed and waiting for manager review',
      manager: 'Manager reviewing order and assigning to store',
      store: 'Store preparing your order',
      packed: 'Order packed and ready for pickup',
      delivery: 'Out for delivery',
      completed: 'Order delivered successfully',
      cancelled: 'Order cancelled'
    };
    return descriptions[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-semibold mb-6">Tracking Your Order...</h1>
          <div className="flex items-center justify-center h-[400px]">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-primary-200 animate-spin"></div>
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-primary-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center py-20">
          <h1 className="text-2xl font-semibold mb-4">Order Not Found</h1>
          <p className="text-gray-500 mb-6">We couldn't find your order. Please check your order history.</p>
          <Button variant="outline" onClick={() => router.push('/order-history')}>
            Go to Order History
          </Button>
        </div>
      </div>
    );
  }

  // Calculate estimated delivery time (30 minutes from order placement)
  const estimatedDeliveryTime = new Date(order.createdAt);
  estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + 30);
  
  // Calculate progress percentage
  const currentStatusIndex = statusFlow.indexOf(order.status);
  const progressPercentage = currentStatusIndex === -1 ? 0 : ((currentStatusIndex + 1) / statusFlow.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Order Tracking</h1>
          <p className="text-gray-600">Order #{order.id}</p>
        </div>
        
        {/* Order Status Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="font-medium">Order Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium 
              ${order.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                order.status === 'manager' ? 'bg-yellow-100 text-yellow-800' :
                order.status === 'store' ? 'bg-indigo-100 text-indigo-800' :
                order.status === 'packed' ? 'bg-purple-100 text-purple-800' :
                order.status === 'delivery' ? 'bg-pink-100 text-pink-800' :
                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`bg-primary-600 h-2.5 rounded-full transition-all duration-500`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>{statusFlow[0].charAt(0).toUpperCase() + statusFlow[0].slice(1)}</span>
            <span>{statusFlow[statusFlow.length - 1].charAt(0).toUpperCase() + statusFlow[statusFlow.length - 1].slice(1)}</span>
          </div>
        </div>
        
        {/* Order Details Card */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Order Details</h2>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Order ID:</p>
                <p className="font-mono">{order.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Order Date:</p>
                <p>{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount:</p>
                <p className="font-bold text-lg">₹{order.totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Delivery Charge:</p>
                <p>{order.totalAmount >= 199 ? 'FREE' : '₹20.00'}</p>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Status Timeline */}
        <Card>
          <h2 className="text-xl font-semibold mb-4">Order Progress</h2>
          <div className="space-y-6">
            {statusHistory.map((status, index) => (
              <div key={index} className="flex items-start space-x-4">
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-1 flex items-center justify-center w-10 h-10">
                  {status.completed ? (
                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center">
                      ✓
                    </div>
                  ) : status.timestamp > new Date().toISOString() ? (
                    <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center">
                      •
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center">
                      {index === 0 ? '1' : index === 1 ? '2' : index === 2 ? '3' : index === 3 ? '4' : index === 4 ? '5' : '6'}
                    </div>
                  )}
                </div>
                
                {/* Status Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{getStatusDescription(status.status)}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full 
                      ${status.completed ? 'bg-green-100 text-green-800' :
                        !status.completed && status.timestamp > new Date().toISOString() ? 'bg-gray-200 text-gray-600' :
                        'bg-primary-100 text-primary-800'}`}>
                      {status.timestamp > new Date().toISOString() ? 'Upcoming' : 'In Progress'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(status.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Estimated Delivery Time */}
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">Estimated Delivery Time</h3>
                  <p className="text-sm text-gray-500">
                    {estimatedDeliveryTime.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  {new Date() > estimatedDeliveryTime ? (
                    <span className="px-2 py-0.5 rounded-full text-sm 
                      bg-red-100 text-red-800">
                      Delayed
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-sm 
                      bg-green-100 text-green-800">
                      On Time
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Action Buttons */}
        <div className="mt-8">
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <Button 
              variant="outline" 
              onClick={() => { console.log('Contact support'); }}
            >
              Contact Support
            </Button>
          )}
          
          {order.status === 'completed' && (
            <Button 
              variant="primary"
              onClick={() => { console.log('Rate order'); }}
            >
              Rate Order
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;