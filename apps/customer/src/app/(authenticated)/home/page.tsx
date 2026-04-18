'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, DELIVERY_TIME_MINUTES } from '@smart-bazar/shared/lib/constants';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { Product } from '@smart-bazar/shared/types/firestore';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';

export default function HomePage() {
  const router = useRouter();
  const { userData } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { addItem, items, updateQuantity } = useCartStore();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = productService.subscribeToProducts((prods) => {
      setProducts(prods.filter((p) => p.isAvailable));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const getCartQty = (productId: string) =>
    items.find((i) => i.product.id === productId)?.quantity || 0;

  const filteredProducts = products.filter((p) => {
    const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = !activeCategory || p.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const getCategoryIcon = (categoryId: string) =>
    CATEGORIES.find((c) => c.id === categoryId)?.icon || '📦';

  // Skeleton loader
  const ProductSkeleton = () => (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="aspect-square animate-shimmer" />
      <div className="p-2.5">
        <div className="h-3.5 rounded animate-shimmer mb-1.5 w-3/4" />
        <div className="h-3 rounded animate-shimmer w-1/2" />
        <div className="flex justify-between items-center mt-2.5">
          <div className="h-4 rounded animate-shimmer w-12" />
          <div className="h-7 w-14 rounded-lg animate-shimmer" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fadeIn">
      {/* ===== HERO BANNER ===== */}
      <div className="relative overflow-hidden bg-gradient-hero px-4 pt-5 pb-6">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/8 rounded-full" />
        <div className="absolute top-4 right-16 w-16 h-16 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-black/5 rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-[11px] font-semibold flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" fill="white" fillOpacity="0.5"/><path d="M5 2.5V5L6.5 6" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>
              {DELIVERY_TIME_MINUTES} min delivery
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white leading-tight mb-1">
            Fresh Groceries<br />at Your Door 🚚
          </h2>
          <p className="text-white/75 text-sm">Order now, delivered in {DELIVERY_TIME_MINUTES} minutes</p>

          {/* Greeting */}
          {userData?.name && (
            <p className="mt-3 text-white/90 text-xs font-medium">
              👋 Hi, {userData.name.split(' ')[0]}!
            </p>
          )}
        </div>
      </div>

      {/* ===== SEARCH BAR (floating over hero gap) ===== */}
      <div className="px-4 -mt-4 mb-4 relative z-10">
        <div
          className="flex items-center gap-3 bg-card rounded-2xl border border-border px-3.5 py-3"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
        >
          <svg className="text-muted-foreground shrink-0" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="5.5"/><path d="M13 13L16 16" strokeLinecap="round"/>
          </svg>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search products, vegetables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* ===== PARTNER BANNER ===== */}
      <div className="px-4 mt-4">
        <div 
          onClick={() => router.push('/partner-application')}
          className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-emerald-900/10 cursor-pointer hover:scale-[1.02] transition-transform active:scale-95"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
              🤝
            </div>
            <div>
              <p className="text-white text-xs font-bold leading-none mb-1">Become a Partner</p>
              <p className="text-emerald-100 text-[10px] opacity-90">Start selling or delivering today</p>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 15L12.5 10L7.5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>

      {/* ===== SEARCH BAR (floating over hero gap) ===== */}

      <div className="px-4">
        {/* ===== CATEGORIES CHIPS ===== */}
        {!searchQuery && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold">Categories</h3>
              <button
                onClick={() => router.push('/category')}
                className="text-xs text-primary font-semibold hover:underline"
              >
                See all →
              </button>
            </div>

            {/* Scrollable horizontal category grid */}
            <div className="grid grid-cols-3 gap-2.5 stagger-children">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(isActive ? null : cat.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 press-effect animate-fadeInUp ${
                      isActive
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: `${cat.color}18` }}
                    >
                      {cat.icon}
                    </div>
                    <span className={`text-[11px] font-semibold leading-tight ${isActive ? 'text-primary' : 'text-foreground'}`}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== PRODUCTS SECTION ===== */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold">
              {activeCategory
                ? CATEGORIES.find((c) => c.id === activeCategory)?.name
                : searchQuery
                ? `Results for "${searchQuery}"`
                : 'All Products'}
            </h3>
            {!loading && (
              <span className="text-xs text-muted-foreground">{filteredProducts.length} items</span>
            )}
          </div>

          {/* Clear filter */}
          {activeCategory && (
            <button
              onClick={() => setActiveCategory(null)}
              className="mb-3 flex items-center gap-1.5 text-xs text-primary font-medium px-3 py-1.5 bg-primary/10 rounded-full press-effect"
            >
              <span>{CATEGORIES.find((c) => c.id === activeCategory)?.icon}</span>
              {CATEGORIES.find((c) => c.id === activeCategory)?.name}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </button>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4,5,6].map((i) => <ProductSkeleton key={i} />)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">{searchQuery ? '🔍' : '📦'}</p>
              <p className="font-semibold text-foreground">
                {searchQuery ? 'No products found' : 'No products available'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? 'Try a different keyword' : 'Products will appear here soon'}
              </p>
              {(searchQuery || activeCategory) && (
                <button
                  onClick={() => { setSearchQuery(''); setActiveCategory(null); }}
                  className="mt-4 text-sm text-primary font-semibold hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => {
                const qty = getCartQty(product.id);
                const catIcon = getCategoryIcon(product.category);
                const catColor = CATEGORIES.find((c) => c.id === product.category)?.color || '#059669';
                return (
                  <div
                    key={product.id}
                    className="bg-card rounded-2xl border border-border overflow-hidden card-hover animate-fadeInUp"
                  >
                    {/* Product Image/Emoji */}
                    <div
                      className="aspect-square flex items-center justify-center relative bg-muted/30"
                    >
                      <span className="text-5xl">{catIcon}</span>
                      {product.stock <= 5 && product.stock > 0 && (
                        <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/20">
                          Only {product.stock} left
                        </span>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-2.5">
                      <h4 className="text-xs font-semibold text-foreground leading-tight line-clamp-2 mb-0.5">
                        {product.name}
                      </h4>
                      {product.description && (
                        <p className="text-[10px] text-muted-foreground truncate mb-1.5">{product.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-primary">₹{product.price}</span>
                        {qty > 0 ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQuantity(product.id, qty - 1)}
                              className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-sm font-bold hover:bg-muted/70 transition-colors press-effect"
                            >−</button>
                            <span className="w-5 text-center text-xs font-bold">{qty}</span>
                            <button
                              onClick={() => updateQuantity(product.id, qty + 1)}
                              className="w-6 h-6 rounded-lg text-white flex items-center justify-center text-sm font-bold press-effect"
                              style={{ background: 'var(--primary)' }}
                            >+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addItem(product)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white press-effect transition-all"
                            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
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
    </div>
  );
}
