import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ui/ToastContext';
import { clientDb, collection, doc, setDoc, where, onSnapshot } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

interface CheckoutProps {
  searchParams: {
    orderId?: string;
  };
}

const CheckoutPage = ({ searchParams }: CheckoutProps) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(searchParams?.orderId || null);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    specialInstructions: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (orderId) {
      loadOrderDetails();
    } else {
      // Redirect to cart if no order ID
      router.push('/cart');
    }
  }, [user, orderId, router]);

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      const orderDoc = await clientDb.doc(`orders/${orderId}`).get();
      if (orderDoc.exists() && orderDoc.data().customerId === user.uid) {
        setOrder({
          id: orderDoc.id,
          ...orderDoc.data()
        });
      } else {
        addToast('Order not found or access denied', 'error');
        router.push('/cart');
      }
    } catch (error) {
      console.error('Error loading order:', error);
      addToast('Error loading order details', 'error');
      router.push('/cart');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!order) {
      addToast('No order found', 'error');
      return;
    }

    try {
      // Update order with delivery details
      await clientDb.doc(`orders/${orderId}`).update({
        deliveryAddress: {
          street: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          landmark: formData.landmark || undefined,
        },
        specialInstructions: formData.specialInstructions || undefined,
        status: 'manager', // Move to manager for assignment
        updatedAt: new Date().toISOString()
      });
      
      addToast('Order placed successfully! A manager will assign it shortly.', 'success');
      router.push(`/order-tracking/${orderId}`);
    } catch (error) {
      console.error('Error submitting checkout:', error);
      addToast('Error placing order. Please try again.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-semibold mb-6">Processing Checkout...</h1>
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
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Checkout</h1>
          <p className="text-gray-600">Review your order and provide delivery details</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Order Summary */}
          <Card className="md:col-span-2 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
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
              <div className="pt-4 border-t">
                <div className="flex justify-between">
                  <span className="text-lg font-medium">Subtotal:</span>
                  <span className="text-lg font-medium">₹{order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-lg font-medium">Delivery Charge:</span>
                  <span className="text-lg font-medium">FREE</span>
                </div>
                <div className="flex justify-between items-start pt-2 border-t">
                  <span className="text-2xl font-bold text-primary-600">Total:</span>
                  <span className="text-2xl font-bold text-primary-600">₹{order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Delivery Details Form */}
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Delivery Details</h2>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Full Name"
                  value={formData.fullName}
                  onChange={(value) => setFormData({...formData, fullName: value})}
                  required
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  value={formData.phone}
                  onChange={(value) => setFormData({...formData, phone: value})}
                  required
                />
              </div>
              
              <Input
                label="Street Address"
                value={formData.address}
                onChange={(value) => setFormData({...formData, address: value})}
                required
              />
              
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(value) => setFormData({...formData, city: value})}
                  required
                />
                <Input
                  label="State"
                  value={formData.state}
                  onChange={(value) => setFormData({...formData, state: value})}
                  required
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Pincode"
                  type="number"
                  value={formData.pincode}
                  onChange={(value) => setFormData({...formData, pincode: value})}
                  required
                />
                <Input
                  label="Landmark (Optional)"
                  value={formData.landmark}
                  onChange={(value) => setFormData({...formData, landmark: value})}
                />
              </div>
              
              <Input
                label="Special Instructions (Optional)"
                placeholder="e.g., Leave at door, Call before arriving"
                value={formData.specialInstructions}
                onChange={(value) => setFormData({...formData, specialInstructions: value})}
              />
              
              <Button variant="primary" className="w-full" type="submit">
                Place Order
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;