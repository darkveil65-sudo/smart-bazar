import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ui/ToastContext';
import { clientDb, collection, query, where, onSnapshot } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

interface CategoryProps {
  params: {
    categoryId: string;
  };
}

const CustomerCategory = ({ params }: CategoryProps) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (!user) return;

    // Fetch category details
    const categoryDoc = clientDb.doc(`categories/${params.categoryId}`);
    const categoryUnsub = categoryDoc.onSnapshot((doc) => {
      if (doc.exists()) {
        setCategoryName(doc.data().name);
      }
    });

    // Fetch products for this category
    const productsRef = collection(clientDb, 'products');
    const q = query(productsRef, where('category', '==', params.categoryId), where('isAvailable', '==', true));
    
    const productsUnsub = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(prods);
      setLoading(false);
    });

    return () => {
      categoryUnsub();
      productsUnsub();
    };
  }, [user, params.categoryId]);

  const addToCart = (product: any) => {
    // Add to cart logic would go here
    addToast(`${product.name} added to cart`, 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              ← Back
            </Button>
            <h1 className="text-2xl font-semibold mt-2">Loading category...</h1>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((_, index) => (
              <Card key={index} className="h-full">
                <div className="flex flex-col items-center justify-center h-full">
                  <Skeleton width="60px" height="60px" className="mb-4 rounded-full" />
                  <Skeleton width="80%" height="1.5rem" className="mb-2" />
                  <Skeleton width="60%" height="1rem" className="mb-2" />
                  <Skeleton width="40%" height="1rem" />
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
            ← Back
          </Button>
          <h1 className="text-2xl font-semibold mt-2">{categoryName}</h1>
        </div>
        
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No products available in this category yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id} className="h-full">
                <div className="flex flex-col items-center justify-start p-4 h-full">
                  {/* Product Image */}
                  <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-gray-500">No Image</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-center">{product.name}</h3>
                  <p className="text-gray-500 mb-4 text-center">₹{product.price.toFixed(2)}</p>
                  <p className="text-sm text-gray-500 mb-4 text-center">
                    {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
                  </p>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="w-full"
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                  >
                    {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerCategory;