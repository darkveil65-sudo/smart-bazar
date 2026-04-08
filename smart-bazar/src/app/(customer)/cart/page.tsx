import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ui/ToastContext';
import { clientDb } from '@/lib/firebase';
import { doc, onSnapshot, query, where, collection } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

const CustomerCart = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subtotal, setSubtotal] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [total, setTotal] = useState(0);

  const calculateDeliveryCharge = (subtotalAmount: number): number => {
    return subtotalAmount >= 199 ? 0 : 20;
  };

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const savedCart = localStorage.getItem(`cart_${user.uid}`);
    if (savedCart) {
      const items = JSON.parse(savedCart);
      setCartItems(items);
      const sub = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      setSubtotal(sub);
      const charge = calculateDeliveryCharge(sub);
      setDeliveryCharge(charge);
      setTotal(sub + charge);
    }
    setLoading(false);
  }, [user, router]);

  const updateQuantity = (productId: string, change: number) => {
    if (!user) return;
    
    setCartItems((prev: any[]) => {
      const updatedItems = prev.map((item: any) => {
        if (item.id === productId) {
          const newQuantity = Math.max(1, item.quantity + change);
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter((item: any) => item.quantity > 0);
      
      localStorage.setItem(`cart_${user.uid}`, JSON.stringify(updatedItems));
      
      const sub = updatedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      setSubtotal(sub);
      setDeliveryCharge(calculateDeliveryCharge(sub));
      setTotal(sub + calculateDeliveryCharge(sub));
      
      return updatedItems;
    });
  };

  const removeItem = (productId: string) => {
    if (!user) return;
    
    setCartItems((prev: any[]) => {
      const updatedItems = prev.filter((item: any) => item.id !== productId);
      localStorage.setItem(`cart_${user.uid}`, JSON.stringify(updatedItems));
      
      const sub = updatedItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      setSubtotal(sub);
      setDeliveryCharge(calculateDeliveryCharge(sub));
      setTotal(sub + calculateDeliveryCharge(sub));
      
      return updatedItems;
    });
    
    addToast('Item removed from cart', 'info');
  };

  const clearCart = () => {
    if (!user) return;
    setCartItems([]);
    localStorage.removeItem(`cart_${user.uid}`);
    setSubtotal(0);
    setDeliveryCharge(0);
    setTotal(0);
    addToast('Cart cleared', 'info');
  };

  const checkout = async () => {
    if (cartItems.length === 0) {
      addToast('Your cart is empty', 'warning');
      return;
    }

    try {
      const orderData = {
        customerId: user.uid,
        items: cartItems.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          name: item.name
        })),
        totalAmount: total,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const { doc, setDoc, collection } = await import('firebase/firestore');
      const orderRef = doc(collection(clientDb, 'orders'));
      await setDoc(orderRef, orderData);
      
      clearCart();
      router.push(`/order-confirmation/${orderRef.id}`);
      addToast('Order placed successfully!', 'success');
    } catch (error) {
      console.error('Error placing order:', error);
      addToast('Error placing order. Please try again.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              Continue Shopping
            </Button>
            <h1 className="text-2xl font-semibold mt-2">Your Cart</h1>
          </div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <div className="flex items-center space-x-4 p-4">
                  <Skeleton width="80px" height="80px" />
                  <div className="flex-1">
                    <Skeleton width="60%" height="1.25rem" className="mb-2" />
                    <Skeleton width="40%" height="1rem" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            Continue Shopping
          </Button>
          <h1 className="text-2xl font-semibold mt-2">Your Cart</h1>
        </div>
        
        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Your cart is empty</p>
            <Button variant="outline" onClick={() => router.push('/home')}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">
                Cart Items ({cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0)} items)
              </h2>
              <div className="space-y-4">
                {cartItems.map((item: any) => (
                  <Card key={item.id} className="flex flex-row items-start">
                    <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain rounded" />
                      ) : (
                        <span className="text-gray-500 text-sm">No Image</span>
                      )}
                    </div>
                    <div className="ml-4 flex-1 space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold">{item.name}</h3>
                        <Button variant="outline" size="xs" onClick={() => removeItem(item.id)}>
                          X
                        </Button>
                      </div>
                      <p className="text-gray-600">₹{item.price.toFixed(2)} each</p>
                      <div className="flex items-center space-x-3">
                        <Button variant="outline" size="xs" onClick={() => updateQuantity(item.id, -1)}>-</Button>
                        <span className="w-10 text-center">{item.quantity}</span>
                        <Button variant="outline" size="xs" onClick={() => updateQuantity(item.id, 1)}>+</Button>
                      </div>
                      <p className="text-right font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            
            <div className="border-t pt-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-lg font-medium">Subtotal:</span>
                  <span className="text-lg font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-lg font-medium">Delivery Charge:</span>
                  <span className="text-lg font-medium">{deliveryCharge > 0 ? `₹${deliveryCharge.toFixed(2)}` : 'FREE'}</span>
                </div>
                <div className="flex justify-between pt-4 border-t">
                  <span className="text-2xl font-bold text-green-600">Total:</span>
                  <span className="text-2xl font-bold text-green-600">₹{total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <Button variant="primary" className="w-full" onClick={checkout}>
                  Proceed to Checkout ({cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0)} items)
                </Button>
                <Button variant="outline" className="w-full" onClick={clearCart}>
                  Clear Cart
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerCart;