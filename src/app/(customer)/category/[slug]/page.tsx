'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/constants';
import { productService } from '@/lib/services/productService';
import { Product } from '@/types/firestore';
import { useCartStore } from '@/stores/cartStore';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, items, updateQuantity } = useCartStore();

  const category = CATEGORY_MAP[slug];

  useEffect(() => {
    if (!slug) return;
    const unsub = productService.subscribeToCategoryProducts(slug, (prods) => {
      setProducts(prods.filter((p) => p.isAvailable));
      setLoading(false);
    });
    return () => unsub();
  }, [slug]);

  const getCartQty = (productId: string) =>
    items.find((i) => i.product.id === productId)?.quantity || 0;

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{category?.icon || '📦'}</span>
          <h1 className="text-xl font-bold">{category?.name || slug}</h1>
        </div>
      </div>

      {/* All categories pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => router.push(`/category/${cat.id}`)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all
              ${cat.id === slug
                ? 'bg-primary text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-3">
              <Skeleton height="100px" className="rounded-xl mb-3" />
              <Skeleton height="14px" width="80%" className="mb-2" />
              <Skeleton height="14px" width="40%" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">{category?.icon || '📦'}</p>
          <p className="font-medium text-foreground">No products in {category?.name || 'this category'}</p>
          <p className="text-sm text-muted-foreground mt-1">Products will appear once stores add them</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => {
            const qty = getCartQty(product.id);
            return (
              <div key={product.id} className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-all">
                <div className="aspect-square bg-gradient-card flex items-center justify-center">
                  <span className="text-5xl">{category?.icon || '📦'}</span>
                </div>
                <div className="p-3">
                  <h4 className="text-sm font-medium truncate">{product.name}</h4>
                  {product.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-primary">₹{product.price}</span>
                    {qty > 0 ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQuantity(product.id, qty - 1)} className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">−</button>
                        <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                        <button onClick={() => updateQuantity(product.id, qty + 1)} className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-sm font-bold">+</button>
                      </div>
                    ) : (
                      <Button size="xs" onClick={() => addItem(product)}>Add</Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
