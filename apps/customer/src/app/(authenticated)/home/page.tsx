'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { categoryService } from '@smart-bazar/shared/lib/services/categoryService';
import { storeService } from '@smart-bazar/shared/lib/services/storeService';
import { heroBannerService } from '@smart-bazar/shared/lib/services/heroBannerService';
import { Product, Category, Store, HeroBanner } from '@smart-bazar/shared/types/firestore';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { useAppConfig } from '@smart-bazar/shared/contexts/AppConfigContext';
import { useLanguage } from '@smart-bazar/shared/contexts/LanguageContext';
import { pluralize } from '@smart-bazar/shared/lib/utils/string';
import ProductCard from './_components/ProductCard';
import EmptyState from '@smart-bazar/shared/components/ui/EmptyState';


/* -- Color palette cycles across categories -------------------------------- */
const CAT_PALETTES = [
  { color: '#00c853', bg: '#e8fff1' },
  { color: '#f43f5e', bg: '#fff1f2' },
  { color: '#0ea5e9', bg: '#eff6ff' },
  { color: '#ffab00', bg: '#fffbeb' },
  { color: '#f97316', bg: '#fff7ed' },
  { color: '#7c3aed', bg: '#f5f3ff' },
  { color: '#14b8a6', bg: '#f0fdfa' },
  { color: '#e11d48', bg: '#fff1f2' },
];

/* -- Per-category hero gradient palettes ----------------------------------- */
// const HERO_GRADIENTS = [
//   'linear-gradient(135deg, #004d20 0%, #00c853 60%, #1de9b6 100%)',
//   'linear-gradient(135deg, #0d47a1 0%, #1976d2 55%, #42a5f5 100%)',
//   'linear-gradient(135deg, #7c1fa8 0%, #ab47bc 55%, #ce93d8 100%)',
//   'linear-gradient(135deg, #b71c1c 0%, #e53935 55%, #ff8a65 100%)',
//   'linear-gradient(135deg, #e65100 0%, #f57c00 55%, #ffd54f 100%)',
// ];
// const HERO_BADGES = ['⚡ Express Delivery', '🌿 100% Fresh', '💰 Best Prices', '🎁 Top Deals', '🚴 Fast Delivery'];
// const HERO_EMOJIS = ['🛒', '🥦', '🍱', '🎀', '🍞'];

const Skeleton = ({ h = 160, r = 16, w = '100%' }: { h?: number; r?: number; w?: string }) => (
  <div style={{ height: h, width: w, borderRadius: r }} className="animate-shimmer" />
);

/* =========================================================================== */
export default function HomePage() {
  const router = useRouter();
  const { userData } = useAuthStore();
  const { getDeliverySlot } = useAppConfig();
  const { t } = useLanguage();
  const [products, setProducts]       = useState<Product[]>([]);
  const [dbStores, setDbStores]       = useState<Store[]>([]);
  const [dbBanners, setDbBanners]     = useState<HeroBanner[]>([]);
  const [loading, setLoading]         = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeStore, setActiveStore]           = useState<string | null>(null);
  const [categories, setCategories]             = useState<Category[]>([]);
  const [activeCategory, setActiveCategory]     = useState<string | null>(null);
  const [heroSlide, setHeroSlide]     = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sb_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveSearchQuery = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('sb_recent_searches', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('sb_recent_searches');
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleRecentClick = useCallback((query: string) => {
    setSearchQuery(query);
    setDebouncedSearch(query);
    saveSearchQuery(query);
    setSearchFocused(false);
  }, [saveSearchQuery]);

  const handleCopyPromo = useCallback((e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  // Debounce search input — wait 300ms after last keystroke
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);
  const { addItem, items, updateQuantity } = useCartStore();

  // Alias for backward compat in render code
  const dbCategories = dbStores;
  const subCategories = categories;
  const activeSubCategory = activeCategory;
  const setActiveSubCategory = setActiveCategory;

  const liveSlot = getDeliverySlot();

  useEffect(() => {
    const u1 = productService.subscribeToProducts((prods) => {
      setProducts(prods.filter((p) => p.isAvailable));
      setLoading(false);
    });
    const u2 = storeService.subscribeToStores(setDbStores);
    const u3 = heroBannerService.subscribe(setDbBanners);
    return () => { u1(); u2(); u3(); };
  }, []);

  useEffect(() => {
    if (activeStore) {
      const u = categoryService.subscribeToCategories(activeStore, setCategories);
      setActiveCategory(null);
      return () => u();
    } else {
      setCategories([]);
    }
  }, [activeStore]);

  const [isPaused, setIsPaused] = useState(false);


  const getCartQty = (id: string) => items.find((i) => i.product.id === id)?.quantity || 0;

  // Backward-compat: old products used `category` field with old IDs (e.g. 'mudikhana','beauty').
  // If a product has no `store` field, map its old category to the closest store.
  const OLD_CAT_TO_STORE: Record<string, string> = {
    furniture: 'furniture-store', home: 'furniture-store',
  };
  const getEffectiveStore = (p: Product) =>
    p.store || OLD_CAT_TO_STORE[(p.category || '').toLowerCase()] || 'furniture-store';

  const filteredProducts = products.filter((p) => {
    // Use debounced value for filtering (not raw input)
    const matchSearch = !debouncedSearch || p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      || p.description?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const effectiveStore = getEffectiveStore(p);
    // Show ONLY 'furniture-store' products, removing grocery, beauty, and others
    const matchStore    = effectiveStore === 'furniture-store';
    const matchCategory = !activeCategory || p.category === activeCategory;
    return matchSearch && matchStore && matchCategory;
  });

  // Build product groups using REAL Firestore stores, restricted to 'furniture-store' only
  const productsByCategory = dbStores
    .filter((s) => s.id === 'furniture-store')
    .map((s, i) => ({
      ...s,
      palette: CAT_PALETTES[i % CAT_PALETTES.length],
      products: products.filter((p) => getEffectiveStore(p) === s.id).slice(0, 8),
    }))
    .filter((g) => g.products.length > 0);

  // Build hero slides: prefer Firestore banners, fall back to category-derived slides
  const firestoreBannerSlides = dbBanners
    .filter(b => b.isActive)
    .map(b => ({
      catId:    '',
      gradient: b.gradient,
      emoji:    '🛒',
      headline: b.headline,
      sub:      b.sub,
      cta:      b.cta,
      badge:    b.badge,
      imageUrl: b.imageUrl ?? null,
      promoCode: (b as any).promoCode ?? 'SBWELCOME',
    }));

  const categoryBannerSlides = dbStores
    .filter(s => s.id === 'furniture-store')
    .map((s) => ({
      catId:    s.id,
      gradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #10B981 100%)', // premium emerald gradient
      emoji:    '🛋️',
      headline: s.name,
      sub:      'Premium interior & decor designs',
      cta:      'Shop Now',
      badge:    '🌿 Premium Choice',
      imageUrl: s.imageUrl ?? null,
      promoCode: 'FURNI20',
    }));

  const premiumSlides = [
    {
      catId:    'furniture-store',
      gradient: 'linear-gradient(135deg, #0B1326 0%, #1E293B 50%, #00A6E0 100%)', // electric cyan gradient
      emoji:    '🪑',
      headline: 'Ergonomic Office',
      sub:      'Upgrade your WFH setup with luxury chairs',
      cta:      'Shop Chairs',
      badge:    '🔥 Top Trend',
      imageUrl: null,
      promoCode: 'CHAIR20',
    },
    {
      catId:    'furniture-store',
      gradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #F59E0B 100%)', // warm amber gradient
      emoji:    '💡',
      headline: 'Ambient Lights',
      sub:      'Designer desk lamps and warm study lighting',
      cta:      'Explore Lamps',
      badge:    '✨ Warm Vibe',
      imageUrl: null,
      promoCode: 'LIGHT15',
    }
  ];

  // Use custom banners if any exist, otherwise fall back to category and premium slides
  const heroSlidesFallback = firestoreBannerSlides.length > 0
    ? firestoreBannerSlides
    : [
        ...categoryBannerSlides,
        ...premiumSlides
      ];

  const firstName = userData?.name?.split(' ')[0] ?? 'Guest';

  useEffect(() => {
    if (isPaused || heroSlidesFallback.length <= 1) return;
    const t = setInterval(() => {
      setHeroSlide(s => (s + 1) % heroSlidesFallback.length);
    }, 4000);
    return () => clearInterval(t);
  }, [isPaused, heroSlidesFallback.length]);

  // Swipe & drag gestures support for Hero banner
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragEndX, setDragEndX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) {
      setIsPaused(false);
      return;
    }
    const distance = touchStartX - touchEndX;
    if (distance > minSwipeDistance) {
      setHeroSlide(s => (s + 1) % heroSlidesFallback.length);
    } else if (distance < -minSwipeDistance) {
      setHeroSlide(s => (s - 1 + heroSlidesFallback.length) % heroSlidesFallback.length);
    }
    setIsPaused(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragEndX(null);
    setDragStartX(e.clientX);
    setIsDragging(true);
    setIsPaused(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setDragEndX(e.clientX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setIsPaused(false);
    if (!dragStartX || !dragEndX) return;
    const distance = dragStartX - dragEndX;
    if (distance > minSwipeDistance) {
      setHeroSlide(s => (s + 1) % heroSlidesFallback.length);
    } else if (distance < -minSwipeDistance) {
      setHeroSlide(s => (s - 1 + heroSlidesFallback.length) % heroSlidesFallback.length);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };



  /* -------------------------------------------------------------------------- */
  return (
    <div style={{ background: 'transparent', minHeight: '100vh' }}>

      {/* === SEARCH BAR =================================================== */}
      <div style={{
        background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)',
        padding: '10px 16px', position: 'sticky', top: 0, zIndex: 20,
        borderBottom: '1px solid rgba(0,200,83,0.10)',
      }}>
        <div
          className="input-search"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 14px', cursor: 'text',
            boxShadow: searchFocused ? '0 0 0 3px rgba(0,200,83,0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
          }}
          onClick={() => searchRef.current?.focus()}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
            stroke={searchFocused ? '#00c853' : '#94a3b8'} strokeWidth="2" style={{ flexShrink: 0, transition: 'color 0.2s' }}>
            <circle cx="8" cy="8" r="5.5"/><path d="M13 13L16 16" strokeLinecap="round"/>
          </svg>
          <input
            ref={searchRef}
            id="home-search"
            name="home-search"
            type="text"
            placeholder={t('home.search')}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveSearchQuery(searchQuery);
                searchRef.current?.blur();
              }
            }}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#0a1628', fontFamily: 'var(--font-sans)' }}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setDebouncedSearch(''); }}
              style={{ background: '#f1f5f9', border: 'none', padding: '2px 6px', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: '#64748b', fontWeight: 700 }}>
              ✕
            </button>
          )}
        </div>

        {/* Search Overlay */}
        {searchFocused && !searchQuery && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--card)',
            boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
            borderBottom: '1.5px solid rgba(0,200,83,0.12)',
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            padding: '18px 16px',
            zIndex: 30,
            animation: 'fadeInDown 0.2s ease-out',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            {recentSearches.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Searches</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearRecentSearches();
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {recentSearches.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRecentClick(q)}
                      style={{
                        background: 'var(--muted)',
                        border: '1px solid var(--border)',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: 12,
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                      className="category-chip"
                    >
                      <span style={{ fontSize: 12 }}>🕒</span>
                      <span style={{ fontWeight: 600 }}>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 13 }}>🔥</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trending Searches</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Fresh Milk', 'Organic Banana', 'Chocolate cookies', 'Premium Tea', 'Sofa'].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRecentClick(q)}
                    style={{
                      background: 'rgba(0, 200, 83, 0.06)',
                      border: '1px solid rgba(0, 200, 83, 0.18)',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: 12,
                      color: '#00a045',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    className="category-chip"
                  >
                    <span style={{ fontSize: 12 }}>📈</span>
                    <span style={{ fontWeight: 600 }}>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* === CATEGORY CHIPS (top scroll row) ============================= */}
      {!searchQuery && (
        <div style={{
          background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,200,83,0.08)', padding: '12px 0',
        }}>
          <div style={{ display: 'flex', overflowX: 'auto', padding: '0 16px', gap: 10, scrollbarWidth: 'none' }} className="hide-scrollbar">
            {[...dbStores].filter(s => s.id === 'furniture-store').map((s, i) => {
              const isActive     = activeStore === s.id;
              const isComingSoon = s.isComingSoon === true;
              return (
                <div key={s.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: `fadeInUp 0.4s ${i * 60}ms ease-out both` }}>
                  <button
                    className="category-chip"
                    onClick={() => { if (!isComingSoon) router.push(`/category/${s.id}`); }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                      padding: '4px 6px', border: 'none', minWidth: 64, flexShrink: 0,
                      background: 'transparent',
                      cursor: isComingSoon ? 'not-allowed' : 'pointer',
                      opacity: isComingSoon ? 0.65 : 1,
                    }}
                  >
                    <div style={{
                      width: 58, height: 58, borderRadius: 18, overflow: 'hidden',
                      background: isActive ? 'linear-gradient(135deg,#00a045,#00c853)' : 'rgba(255,255,255,0.9)',
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      border: isActive ? '2.5px solid #00c853' : '2px solid rgba(0,200,83,0.12)',
                      boxShadow: isActive ? '0 6px 18px rgba(0,200,83,0.30)' : '0 2px 10px rgba(0,0,0,0.06)',
                      transform: isActive ? 'scale(1.06)' : 'scale(1)',
                      transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                      padding: s.imageUrl ? 3 : 0,
                    }}>
                      {s.imageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={s.imageUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 15 }} />
                        : <span style={{ fontSize: 26 }}>🪑</span>
                      }
                    </div>
                    <span style={{ fontSize: 10, fontWeight: isActive ? 800 : 600, whiteSpace: 'nowrap', color: isActive ? '#00a045' : '#475569' }}>
                      {s.name}
                    </span>
                  </button>
                  {isComingSoon && (
                    <div style={{
                      position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg,#ffab00,#ff8f00)', color: '#fff',
                      fontSize: 7, fontWeight: 800, padding: '2px 6px', borderRadius: 6,
                      whiteSpace: 'nowrap', letterSpacing: '0.06em', zIndex: 5,
                      boxShadow: '0 2px 8px rgba(255,171,0,0.4)',
                    }}>SOON</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ paddingBottom: 80 }}>

        {/* === SEARCH RESULTS ============================================== */}
        {searchQuery && (
          <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)', padding: '16px', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 14 }}>🔍</span>
              <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600, margin: 0 }}>
                <span style={{ color: '#0a1628', fontWeight: 800 }}>{filteredProducts.length}</span> {pluralize(filteredProducts.length, 'result', 'results')} for &quot;{searchQuery}&quot;
              </p>
            </div>
            {filteredProducts.length === 0 ? (
              <EmptyState
                type="search"
                title="No results found"
                description="Try a different keyword"
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {filteredProducts.map((product, i) => (
                  <ProductCard key={product.id} product={product} qty={getCartQty(product.id)}
                               onAdd={() => addItem(product)} onInc={() => updateQuantity(product.id, getCartQty(product.id) + 1)}
                               onDec={() => updateQuantity(product.id, getCartQty(product.id) - 1)}
                               delay={i * 50} deliverySlot={liveSlot}
                               onClick={() => {
                                 saveSearchQuery(searchQuery);
                                 router.push(`/product/${product.id}`);
                               }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* === CATEGORY FILTERED VIEW ====================================== */}
        {activeCategory && activeCategory !== 'all' && !searchQuery && (
          <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)', padding: '16px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0a1628', margin: 0, fontFamily: 'var(--font-display)' }}>
                {dbCategories.find(c => c.id === activeCategory)?.name}
              </h3>
              <button onClick={() => setActiveCategory(null)}
                style={{ fontSize: 12, color: '#00a045', fontWeight: 700, background: 'rgba(0,200,83,0.08)', border: 'none', cursor: 'pointer', padding: '5px 12px', borderRadius: 20 }}>
                Clear ✕
              </button>
            </div>
            {subCategories.length > 0 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 14, scrollbarWidth: 'none' }} className="hide-scrollbar">
                <button onClick={() => setActiveSubCategory(null)} style={{
                  padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', border: 'none',
                  background: !activeSubCategory ? 'linear-gradient(135deg,#00a045,#00c853)' : 'rgba(0,0,0,0.05)',
                  color: !activeSubCategory ? '#fff' : '#64748b', cursor: 'pointer',
                  boxShadow: !activeSubCategory ? '0 4px 12px rgba(0,200,83,0.3)' : 'none', transition: 'all 0.2s',
                }}>All</button>
                {subCategories.map((subcat) => (
                  <button key={subcat.id} onClick={() => setActiveSubCategory(subcat.id)} style={{
                    padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                    border: 'none', display: 'flex', alignItems: 'center', gap: 5,
                    background: activeSubCategory === subcat.id ? 'linear-gradient(135deg,#00a045,#00c853)' : 'rgba(0,0,0,0.05)',
                    color: activeSubCategory === subcat.id ? '#fff' : '#64748b', cursor: 'pointer',
                    boxShadow: activeSubCategory === subcat.id ? '0 4px 12px rgba(0,200,83,0.3)' : 'none', transition: 'all 0.2s',
                  }}>
                    {subcat.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={subcat.imageUrl} alt="" style={{ width: 16, height: 16, borderRadius: 4, objectFit: 'cover' }} />
                    )}
                    {subcat.name}
                  </button>
                ))}
              </div>
            )}
            {filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 56, marginBottom: 10 }}>📦</div>
                <p style={{ fontWeight: 700, color: '#0a1628', marginBottom: 4 }}>No products yet</p>
                <p style={{ fontSize: 13, color: '#94a3b8' }}>Products will appear soon</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {filteredProducts.map((product, i) => (
                  <ProductCard key={product.id} product={product} qty={getCartQty(product.id)}
                               onAdd={() => addItem(product)} onInc={() => updateQuantity(product.id, getCartQty(product.id) + 1)}
                               onDec={() => updateQuantity(product.id, getCartQty(product.id) - 1)}
                               delay={i * 50} deliverySlot={liveSlot}
                               onClick={() => router.push(`/product/${product.id}`)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* === HOME CONTENT ================================================ */}
        {!searchQuery && !activeStore && !activeCategory && (
          <>
            {/* -- Hero Banner ----------------------------------------------- */}
            <div className="px-4 md:px-0 pt-3.5 md:pt-6">
              <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                className="min-h-[160px] md:min-h-[300px]"
                style={{
                  borderRadius: 22,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  userSelect: 'none',
                }}
              >
                <div style={{
                  display: 'flex',
                  transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: `translateX(-${heroSlide * 100}%)`,
                  width: `${heroSlidesFallback.length * 100}%`,
                  height: '100%',
                }}>
                  {heroSlidesFallback.map((slide, index) => (
                    <div
                      key={index}
                      className="min-h-[160px] md:min-h-[300px] py-5 md:py-8 px-5 md:px-10"
                      style={{
                        flex: '0 0 100%',
                        width: '100%',
                        background: slide.gradient,
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
                      <div style={{ position: 'absolute', right: 20, bottom: -40, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255,255,255,0.35)',
                          borderRadius: 20, padding: '4px 12px', marginBottom: 10,
                        }}>
                          <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, letterSpacing: '0.03em' }}>{slide.badge}</span>
                        </div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
                          👋 Hi {firstName}!
                        </p>
                        <h2 className="text-2xl md:text-4xl" style={{
                          fontWeight: 900, color: '#fff', margin: '0 0 6px',
                          lineHeight: 1.15, fontFamily: 'var(--font-display)',
                        }}>
                          {slide.headline}<br />
                          <span className="text-[18px] md:text-[22px]" style={{ opacity: 0.85 }}>{slide.sub}</span>
                        </h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12 }}>
                          <button onClick={() => slide.catId ? router.push(`/category/${slide.catId}`) : router.push('/category')} style={{
                            background: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: 12, padding: '10px 22px',
                            fontSize: 13, fontWeight: 800, cursor: 'pointer', color: '#10B981',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.15)', transition: 'all 0.2s', letterSpacing: 0.2,
                          }}>
                            {slide.cta} →
                          </button>
                          
                          {slide.promoCode && (
                            <div
                              onClick={(e) => handleCopyPromo(e, slide.promoCode)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'rgba(255, 255, 255, 0.18)',
                                backdropFilter: 'blur(8px)',
                                border: '1.5px dashed rgba(255, 255, 255, 0.4)',
                                borderRadius: 12,
                                padding: '8px 14px',
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#fff',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                              }}
                              className="hover:scale-105 active:scale-95"
                            >
                              <span>🎟️ {slide.promoCode}</span>
                              <span style={{ fontSize: 10, opacity: 0.9, background: 'rgba(0, 0, 0, 0.2)', padding: '2px 6px', borderRadius: 6 }}>
                                {copiedCode === slide.promoCode ? '✓ Copied' : 'Copy'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ position: 'absolute', right: 14, bottom: 16, animation: 'bounceSubtle 2.5s ease-in-out infinite' }}>
                        {slide.imageUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={slide.imageUrl} alt={slide.headline} style={{ width: 80, height: 80, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' }} />
                          : <span style={{ fontSize: 64 }}>{slide.emoji}</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5, zIndex: 10 }}>
                  {heroSlidesFallback.map((_, i) => (
                    <div key={i} onClick={(e) => { e.stopPropagation(); setHeroSlide(i); }} style={{
                      width: (i === heroSlide) ? 18 : 6, height: 6, borderRadius: 3,
                      background: (i === heroSlide) ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.45)',
                      transition: 'all 0.3s ease', cursor: 'pointer',
                    }} />
                  ))}
                </div>
              </div>
            </div>

            {/* -- Offer Cards ----------------------------------------------- */}
            <div style={{ padding: '10px 16px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'linear-gradient(135deg,#e8fff1,#f0fdf4)', border: '1px solid rgba(0,200,83,0.2)', borderRadius: 18, padding: '14px', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,200,83,0.10)' }}>
                  <div style={{ position: 'absolute', right: -10, top: -10, width: 70, height: 70, borderRadius: '50%', background: 'rgba(0,200,83,0.08)' }} />
                  <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>💰</span>
                  <p style={{ fontSize: 16, fontWeight: 900, color: '#00a045', margin: 0, fontFamily: 'var(--font-display)' }}>Flat ₹50 OFF</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>1st order above ₹299</p>
                  <div style={{ marginTop: 8, display: 'inline-block', background: 'rgba(0,200,83,0.12)', borderRadius: 8, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#00a045' }}>USE: FIRST50</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 18, padding: '14px', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 16px rgba(59,130,246,0.10)' }}>
                  <div style={{ position: 'absolute', right: -10, top: -10, width: 70, height: 70, borderRadius: '50%', background: 'rgba(59,130,246,0.08)' }} />
                  <span style={{ fontSize: 28, display: 'block', marginBottom: 6 }}>🚴</span>
                  <p style={{ fontSize: 16, fontWeight: 900, color: '#1d4ed8', margin: 0, fontFamily: 'var(--font-display)' }}>Free Delivery</p>
                  <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>First 10 orders</p>
                  <div style={{ marginTop: 8, display: 'inline-block', background: 'rgba(59,130,246,0.10)', borderRadius: 8, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#1d4ed8' }}>Auto Applied</div>
                </div>
              </div>
            </div>

            {/* -- Shop by Store (Categories) ------------ */}
            {dbCategories.filter(c => !c.isComingSoon).length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(12px)', padding: '14px 16px 16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1e293b', margin: 0 }}>
                    Shop by store
                  </h3>
                  <button onClick={() => router.push('/category')}
                    style={{ fontSize: 13, color: '#00a045', fontWeight: 800, background: 'none', border: 'none', cursor: 'pointer' }}>
                    See all →
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }} className="hide-scrollbar">
                  {dbCategories.filter(c => c.id === 'furniture-store').map((cat, i) => {
                    const pal = CAT_PALETTES[i % CAT_PALETTES.length];
                    const isNameStore = cat.name.toLowerCase().includes('store');
                    const displayName = isNameStore ? cat.name : cat.name;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => router.push(`/category/${cat.id}`)}
                        style={{
                          flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                          padding: 0, border: 'none', cursor: 'pointer',
                          background: 'transparent', transition: 'transform 0.2s', width: 90,
                          animation: `fadeInUp 0.4s ${i * 60}ms ease-out both`,
                        }}
                      >
                        <div style={{
                          width: '100%', height: 75, borderRadius: 16, overflow: 'hidden',
                          background: `linear-gradient(135deg, ${pal.color}bb, ${pal.color})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: `0 4px 12px ${pal.color}35`,
                        }}>
                          {cat.imageUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={cat.imageUrl} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: 36 }}>📦</span>
                          }
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', textAlign: 'center', lineHeight: 1.25 }}>
                          {displayName}{!isNameStore && <><br />Store</>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* -- Products by Store  ------------------------------------ */}
            {loading ? (
              <div className="bg-white/88 py-6 md:py-8 px-4 md:px-6 mb-4 md:mb-8 md:rounded-2xl md:shadow-sm md:border md:border-slate-100/60">
                <Skeleton h={20} r={8} w="160px" />
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 mt-4">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} h={200} r={16} />)}
                </div>
              </div>
            ) : productsByCategory.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.88)', padding: '60px 16px', textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 64, marginBottom: 12 }}>🛒</div>
                <p style={{ fontWeight: 800, fontSize: 18, color: '#0a1628', marginBottom: 6, fontFamily: 'var(--font-display)' }}>No products yet</p>
                <p style={{ fontSize: 13, color: '#94a3b8' }}>Products will appear here soon</p>
              </div>
            ) : (
              productsByCategory.map((group, gIndex) => (
                <div 
                  key={group.id} 
                  className="bg-white/88 backdrop-blur-md py-6 md:py-8 mb-4 md:mb-8 md:rounded-2xl md:shadow-sm md:border md:border-slate-100/60"
                  style={{
                    animation: `fadeInUp 0.4s ${gIndex * 80}ms ease-out both`,
                  }}
                >
                  {/* Section header */}
                  <div className="flex justify-between items-center px-4 md:px-6 mb-4">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: `${group.palette.color}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        border: `1px solid ${group.palette.color}25`,
                      }}>
                        {group.imageUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={group.imageUrl as string} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={group.name} />
                          : <span style={{ fontSize: 20 }}>📦</span>
                        }
                      </div>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0a1628', margin: 0, fontFamily: 'var(--font-display)' }}>
                          {group.name}{!group.name.toLowerCase().includes('store') ? ' Store' : ''}
                        </h3>
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{pluralize(group.products.length, 'item', 'items')}</p>
                      </div>
                    </div>
                    <button onClick={() => router.push(`/category/${group.id}`)} style={{
                      fontSize: 12, color: '#00a045', fontWeight: 700,
                      background: 'rgba(0,200,83,0.08)', border: 'none',
                      borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
                    }}>
                      See all →
                    </button>
                  </div>

                  {/* Product grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 px-4 md:px-6">
                    {group.products.map((product, i) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        qty={getCartQty(product.id)}
                        onAdd={() => addItem(product)}
                        onInc={() => updateQuantity(product.id, getCartQty(product.id) + 1)}
                        onDec={() => updateQuantity(product.id, getCartQty(product.id) - 1)}
                        accentColor={group.palette.color}
                        delay={i * 60}
                        deliverySlot={liveSlot}
                        onClick={() => router.push(`/product/${product.id}`)}
                      />
                    ))}
                  </div>

                  {/* Inter-section delivery banner every 2nd group */}
                  {gIndex % 2 === 1 && (
                    <div style={{ margin: '16px 16px 4px' }}>
                      <div style={{
                        background: 'linear-gradient(135deg,#00a045,#00c853)',
                        borderRadius: 16, padding: '14px 16px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        boxShadow: '0 6px 20px rgba(0,200,83,0.25)',
                        position: 'relative', overflow: 'hidden',
                      }}>
                        <div style={{ position: 'absolute', right: -10, top: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
                        <span style={{ fontSize: 32 }}>🚴</span>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-display)' }}>Free delivery on ₹199+</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', margin: '2px 0 0' }}>Delivered {liveSlot}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}


