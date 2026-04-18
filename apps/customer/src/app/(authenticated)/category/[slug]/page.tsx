'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CATEGORIES, CATEGORY_MAP } from '@smart-bazar/shared/lib/constants';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { Product } from '@smart-bazar/shared/types/firestore';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';

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
    <div className="animate-fadeIn">
      {/* Category Hero */}
      <div
        className="px-4 pt-5 pb-5 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${category?.color || '#059669'}18, ${category?.color || '#059669'}08)` }}
      >
        <div
          className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-15"
          style={{ background: category?.color || '#059669' }}
        />
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground press-effect"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 13L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: `${category?.color || '#059669'}20` }}
          >
            {category?.icon || '📦'}
          </div>
          <div>
            <h1 className="text-xl font-extrabold">{category?.name || slug}</h1>
            {!loading && (
              <p className="text-sm text-muted-foreground">{products.length} products available</p>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto hide-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => router.push(`/category/${cat.id}`)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all press-effect
              ${cat.id === slug
                ? 'text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-border'
              }`}
            style={cat.id === slug ? { background: cat.color } : {}}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Products */}
      <div className="px-4 pb-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="aspect-square animate-shimmer" />
                <div className="p-3">
                  <div className="h-3.5 rounded animate-shimmer mb-1.5 w-3/4" />
                  <div className="h-3 rounded animate-shimmer w-1/2 mb-2" />
                  <div className="flex justify-between">
                    <div className="h-4 rounded animate-shimmer w-12" />
                    <div className="h-7 w-14 rounded-lg animate-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">{category?.icon || '📦'}</p>
            <p className="font-semibold">No products yet</p>
            <p className="text-sm text-muted-foreground mt-1">Products will appear once stores add them</p>
            <button onClick={() => router.push('/home')} className="mt-4 text-sm text-primary font-semibold hover:underline">
              Back to home →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 stagger-children">
            {products.map((product) => {
              const qty = getCartQty(product.id);
              return (
                <div
                  key={product.id}
                  className="bg-card rounded-2xl border border-border overflow-hidden card-hover animate-fadeInUp"
                >
                  <div
                    className="aspect-square flex items-center justify-center"
                    style={{ background: `${category?.color || '#059669'}12` }}
                  >
                    <span className="text-5xl">{category?.icon || '📦'}</span>
                  </div>
                  <div className="p-2.5">
                    <h4 className="text-xs font-semibold leading-tight line-clamp-2 mb-0.5">{product.name}</h4>
                    {product.description && (
                      <p className="text-[10px] text-muted-foreground truncate mb-1.5">{product.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-primary">₹{product.price}</span>
                      {qty > 0 ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQuantity(product.id, qty - 1)} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-xs font-bold press-effect">−</button>
                          <span className="w-5 text-center text-xs font-bold">{qty}</span>
                          <button onClick={() => updateQuantity(product.id, qty + 1)} className="w-6 h-6 rounded-lg text-white flex items-center justify-center text-xs font-bold press-effect" style={{ background: category?.color || 'var(--primary)' }}>+</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addItem(product)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white press-effect"
                          style={{ background: `linear-gradient(135deg, ${category?.color || '#059669'}, ${category?.color || '#10b981'})` }}
                        >
                          + Add
                        </button>
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
