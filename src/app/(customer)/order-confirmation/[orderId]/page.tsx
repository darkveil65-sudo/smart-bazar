import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ui/ToastContext';
import { clientDb, doc, onSnapshot } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface OrderConfirmationProps {
  params: {
    orderId: string;
  };
}

const OrderConfirmation = ({ params }: OrderConfirmationProps) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const { orderId } = params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const orderDoc = clientDb.doc(`orders/${orderId}`);
    const unsubscribe = onSnapshot(orderDoc, (doc) => {
      if (doc.exists() && doc.data().customerId === user.uid) {
        setOrder({
          id: doc.id,
          ...doc.data()
        });
      } else {
        addToast('Order not found or access denied', 'error');
        router.push('/cart');
      }
    });

    return () => unsubscribe();
  }, [user, orderId, router, addToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-semibold mb-6">Confirming Your Order...</h1>
          <div className="flex items-center justify-center h-[400px]">
            <div className="flex space-x-3">
              <div className="w-4 h-4 bg-primary-500 rounded-full animate-pulse"></div>
              <div className="w-4 h-4 bg-primary-500 rounded-full animate-pulse delay-100"></div>
              <div className="w-4 h-4 bg-primary-500 rounded-full animate-pulse delay-200"></div>
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
          <p className="text-gray-500 mb-6">We couldn't find your order. Please check your cart and try again.</p>
          <Button variant="outline" onClick={() => router.push('/cart')}>
            Go to Cart
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 text-white flex items-center justify-center rounded-full mx-auto mb-4">
            ✓
          </div>
          <h1 className="text-3xl font-bold">Order Placed Successfully!</h1>
          <p className="text-lg text-gray-600 mt-4">
            Your order has been received and is being processed.
          </p>
        </div>
        
        <div className="space-y-6">
          {/* Order Details */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Order Details</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Order ID:</span>
                <span className="font-mono">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Order Date:</span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
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
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-bold text-lg">₹{order.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </Card>
          
          {/* Order Items */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item: any) => (
                <div key={item.productId} className="flex justify-between items-start pb-3 border-b">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              {order.items.length === 0 && (
                <p className="text-gray-500 text-center py-4">No items in order</p>
              )}
            </div>
          </Card>
          
          {/* Next Steps */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">What Happens Next?</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>A manager will review your order and assign it to a store.</li>
              <li>The store will prepare your order and mark it as packed.</li>
              <li>A delivery person will be assigned to deliver your order.</li>
              <li>You'll receive real-time updates on your order's progress.</li>
              <li>Your order will be delivered within 30 minutes!</li>
            </ol>
          </Card>
        </div>
        
        <div className="mt-8">
          <Button variant="outline" onClick={() => router.push('/')}>
            Continue Shopping
          </Button>
          <Button 
            variant="primary" 
            className="ml-3"
            onClick={() => router.push(`/order-tracking/${order.id}`)}
          >
            Track Order
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;