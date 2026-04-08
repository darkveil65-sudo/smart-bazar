'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, DELIVERY_TIME_MINUTES } from '@smart-bazar/shared/lib/constants';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { Product } from '@smart-bazar/shared/types/firestore';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';
import Card from '@smart-bazar/shared/components/ui/Card';
import Button from '@smart-bazar/shared/components/ui/Button';
import Skeleton from '@smart-bazar/shared/components/ui/Skeleton';

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, items, updateQuantity, removeItem } = useCartStore();

  useEffect(() => {
    const unsub = productService.subscribeToProducts((prods) => {
      setProducts(prods.filter((p) => p.isAvailable));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const getCartQty = (productId: string) =>
    items.find((i) => i.product.id === productId)?.quantity || 0;

  return (
    <div className="px-4 py-4">
      {/* Hero Banner */}
      <div className="bg-gradient-hero rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-6 -translate-x-6" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="white" strokeWidth="1.5"/><path d="M9 5V9L12 10.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <span className="text-sm font-medium opacity-90">Delivery in {DELIVERY_TIME_MINUTES} minutes</span>
          </div>
          <h2 className="text-2xl font-bold mb-1">Fresh Groceries</h2>
          <p className="text-sm opacity-80">Delivered to your doorstep</p>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Shop by Category</h3>
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => router.push(`/category/${cat.id}`)}
              className="flex flex-col items-center gap-2 p-4 bg-card rounded-2xl border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${cat.color}15` }}
              >
                {cat.icon}
              </div>
              <span className="text-xs font-medium text-foreground">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      <div>
        <h3 className="text-lg font-semibold mb-4">All Products</h3>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton height="120px" className="rounded-xl mb-3" />
                <Skeleton height="14px" width="80%" className="mb-2" />
                <Skeleton height="14px" width="40%" />
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-muted-foreground">No products available yet</p>
            <p className="text-xs text-muted-foreground mt-1">Products will appear here once stores add them</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const qty = getCartQty(product.id);
              return (
                <div
                  key={product.id}
                  className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all duration-300"
                >
                  <div className="aspect-square bg-gradient-card flex items-center justify-center p-4">
                    <span className="text-5xl">
                      {CATEGORIES.find((c) => c.id === product.category)?.icon || '📦'}
                    </span>
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-foreground truncate">{product.name}</h4>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{product.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-primary">₹{product.price}</span>
                      {qty > 0 ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(product.id, qty - 1)}
                            className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold hover:bg-primary/20 transition-colors"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                          <button
                            onClick={() => updateQuantity(product.id, qty + 1)}
                            className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-sm font-bold hover:bg-primary-dark transition-colors"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <Button size="xs" onClick={() => addItem(product)}>
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
