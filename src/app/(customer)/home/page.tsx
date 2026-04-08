import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ui/ToastContext';
import { clientDb, collection, query, where, onSnapshot } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

const CustomerHome = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Predefined categories as per requirements
  const predefinedCategories = [
    { id: 'mudikhana', name: 'Mudikhana' },
    { id: 'household', name: 'Household' },
    { id: 'vegetables', name: 'Vegetables' },
    { id: 'fruits', name: 'Fruits' },
    { id: 'beauty', name: 'Beauty' },
    { id: 'fashion', name: 'Fashion' },
  ];

  useEffect(() => {
    // Use predefined categories
    setCategories(predefinedCategories);
    
    // Fetch products
    const productsRef = collection(clientDb, 'products');
    const q = query(productsRef, where('isAvailable', '==', true));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(prods);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const navigateToCategory = (categoryId: string) => {
    router.push(`/category/${categoryId}`);
  };

  const addToCart = (product: any) => {
    addToast(`${product.name} added to cart`, 'success');
  };

  const cartItems = typeof window !== 'undefined' ? parseInt(localStorage.getItem('cartCount') || '0') : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-center mb-8">Smart Bazar</h1>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((_, index) => (
              <Card key={index} className="h-full">
                <div className="flex flex-col items-center justify-center h-full">
                  <Skeleton width="48px" height="48px" className="mb-4 rounded-full" />
                  <Skeleton width="80%" height="1.5rem" className="mb-2" />
                  <Skeleton width="60%" height="1rem" />
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Smart Bazar</h1>
          <div className="flex items-center space-x-4">
            <button onClick={() => router.push('/cart')} className="relative p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItems}
                </span>
              )}
            </button>
            <Button variant="outline" onClick={() => router.push('/')}>
              Login
            </Button>
          </div>
        </div>
        
        <h2 className="text-2xl font-semibold mb-6">Shop by Category</h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div 
              key={category.id} 
              onClick={() => navigateToCategory(category.id)}
              className="cursor-pointer bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col items-center justify-center p-6 h-full">
                {/* Category Icon Placeholder */}
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center rounded-full mb-4">
                  {category.name.charAt(0)}
                </div>
                <h3 className="text-lg font-semibold text-center">{category.name}</h3>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Browse products
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Featured Products Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-6">Featured Products</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {products.length > 0 ? products.slice(0, 8).map((product) => (
              <Card key={product.id} className="h-full">
                <div className="flex flex-col items-center justify-start p-4 h-full">
                  <div className="w-36 h-36 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <span className="text-gray-500">No Image</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-center">{product.name}</h3>
                  <p className="text-gray-500 mb-4 text-center">₹{product.price}</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => addToCart(product)}>
                    Add to Cart
                  </Button>
                </div>
              </Card>
            )) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No products available yet. Check back later!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;