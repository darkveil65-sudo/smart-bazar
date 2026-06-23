'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { categoryService } from '@smart-bazar/shared/lib/services/categoryService';
import { heroBannerService } from '@smart-bazar/shared/lib/services/heroBannerService';
import { Product, Category, HeroBanner } from '@smart-bazar/shared/types/firestore';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { useAppConfig } from '@smart-bazar/shared/contexts/AppConfigContext';
import { useLanguage } from '@smart-bazar/shared/contexts/LanguageContext';
import ProductCard from './_components/ProductCard';
import EmptyState from '@smart-bazar/shared/components/ui/EmptyState';

const HERO_SLIDES = [
  {
    id: 'slide-1',
    badge: '🌿 Artistic Designs',
    headline: 'Artistic Floral Wardrobes',
    sub: 'Premium quality closets adorned with classic floral prints.',
    cta: 'Shop Wardrobes',
    promoCode: 'WARDROBE15',
    imageUrl: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=600&q=80',
    category: 'wardrobes',
  },
  {
    id: 'slide-2',
    badge: '✨ Makeup Vanities',
    headline: 'Elegant Dressing Tables',
    sub: 'Sleek makeup stations with premium mirrors and storage drawers.',
    cta: 'Explore Dressing Tables',
    promoCode: 'VANITY20',
    imageUrl: 'https://images.unsplash.com/photo-1580481072645-022f9a6dbf27?auto=format&fit=crop&w=600&q=80',
    category: 'dressing-tables',
  },
];

export default function HomePage() {
  const router = useRouter();
  const { userData } = useAuthStore();
  const { getDeliverySlot } = useAppConfig();
  const { t } = useLanguage();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [dbBanners, setDbBanners] = useState<HeroBanner[]>([]);
  const [heroSlide, setHeroSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { addItem, items, updateQuantity } = useCartStore();

  const liveSlot = getDeliverySlot();
  const firstName = userData?.name?.split(' ')[0] ?? 'Guest';

  // Load products, categories & live hero banners
  useEffect(() => {
    const unsubProducts = productService.subscribeToProducts((prods) => {
      setProducts(prods.filter((p) => p.isAvailable));
      setLoading(false);
    });

    const unsubCategories = categoryService.subscribeToCategories('furniture-store', setCategories);

    const unsubBanners = heroBannerService.subscribe((data) => {
      setDbBanners(data.filter((b) => b.isActive));
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubBanners();
    };
  }, []);

  // Merge DB banners with hardcoded fallback
  const activeBanners = dbBanners.length > 0
    ? dbBanners.map((b) => ({
        id: b.id,
        badge: b.badge,
        headline: b.headline,
        sub: b.sub,
        cta: b.cta,
        promoCode: '',
        imageUrl: b.imageUrl ?? '',
        category: '',
        gradient: b.gradient,
      }))
    : HERO_SLIDES;

  // Timer interval for Hero Slider
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setHeroSlide((s) => (s + 1) % activeBanners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, activeBanners.length]);

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sb_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      // Ignored
    }
  }, []);

  // Deal of the day ticking timer state
  const [timeLeft, setTimeLeft] = useState({ hours: 12, minutes: 30, seconds: 0 });

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diff = endOfDay.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ hours: 23, minutes: 59, seconds: 59 });
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ hours, minutes, seconds });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (val: number) => String(val).padStart(2, '0');

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
      setHeroSlide((s) => (s + 1) % activeBanners.length);
    } else if (distance < -minSwipeDistance) {
      setHeroSlide((s) => (s - 1 + activeBanners.length) % activeBanners.length);
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
      setHeroSlide((s) => (s + 1) % activeBanners.length);
    } else if (distance < -minSwipeDistance) {
      setHeroSlide((s) => (s - 1 + activeBanners.length) % activeBanners.length);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  const saveSearchQuery = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('sb_recent_searches', JSON.stringify(updated));
      } catch (e) {
        // Ignored
      }
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('sb_recent_searches');
    } catch (e) {
      // Ignored
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

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  const getCartQty = (id: string) => items.find((i) => i.product.id === id)?.quantity || 0;

  const getEffectiveStore = (p: Product) =>
    p.store || 'furniture-store';

  const handleCategoryClick = (catId: string) => {
    setActiveCategory((prev) => (prev === catId ? null : catId));
  };

  // Stable mock rating & reviews generator based on product ID
  const getStableRating = useCallback((id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const score = 4.1 + (Math.abs(hash) % 9) * 0.1;
    const reviews = 12 + (Math.abs(hash) % 230);
    return { rating: score, reviews };
  }, []);

  // Build item lists dynamically
  const getDealProducts = useCallback(() => {
    // Filter and compute discount for products
    const productsWithDiscounts = products.map((p) => {
      const mrp = p.mrp || (p as any).mrp;
      const discountPercent =
        mrp && mrp > p.price
          ? ((mrp - p.price) / mrp) * 100
          : p.discountPercent || 0;
      return { product: p, discountPercent };
    });

    // Split into those with real discounts vs those without
    const realDeals = productsWithDiscounts.filter((item) => item.discountPercent > 0);

    // Sort real deals by discount percentage descending
    realDeals.sort((a, b) => b.discountPercent - a.discountPercent);

    // If we have at least 3, return the top 3
    if (realDeals.length >= 3) {
      return realDeals.slice(0, 3).map((item) => item.product);
    }

    // Otherwise, fill the remaining slots with available products that have a high stable rating
    const dealProducts = realDeals.map((item) => item.product);
    const dealIds = new Set(dealProducts.map((p) => p.id));

    const others = products
      .filter((p) => !dealIds.has(p.id))
      .map((p) => {
        const { rating } = getStableRating(p.id);
        const ratingVal = (p as any).rating || rating;
        return { product: p, ratingVal };
      })
      .sort((a, b) => b.ratingVal - a.ratingVal);

    const needed = 3 - dealProducts.length;
    const fillers = others.slice(0, needed).map((item) => item.product);

    return [...dealProducts, ...fillers];
  }, [products, getStableRating]);

  const dealItems = useMemo(() => getDealProducts(), [getDealProducts]);

  const getBestSellers = useCallback(() => {
    const dealIds = new Set(dealItems.map((d) => d.id));
    const available = products.filter((p) => p.isAvailable && !dealIds.has(p.id));

    const ratedProducts = available.map((p) => {
      const { rating, reviews } = getStableRating(p.id);
      const ratingVal = (p as any).rating || rating;
      const reviewsVal = (p as any).reviews || reviews;
      return { product: p, ratingVal, reviewsVal };
    });

    // Sort by rating descending, then by reviews count descending
    ratedProducts.sort((a, b) => {
      if (b.ratingVal !== a.ratingVal) {
        return b.ratingVal - a.ratingVal;
      }
      return b.reviewsVal - a.reviewsVal;
    });

    const sortedAvailable = ratedProducts.map((item) => item.product);

    return {
      featured: sortedAvailable[0] || null,
      grid: sortedAvailable.slice(1, 5),
    };
  }, [products, dealItems, getStableRating]);

  const { featured: bestFeatured, grid: bestGrid } = useMemo(
    () => getBestSellers(),
    [getBestSellers]
  );

  const getLatestProducts = useCallback(() => {
    const excludedIds = new Set([
      ...dealItems.map((d) => d.id),
      ...(bestFeatured ? [bestFeatured.id] : []),
      ...bestGrid.map((g) => g.id),
    ]);
    const available = products.filter((p) => p.isAvailable && !excludedIds.has(p.id));

    // Sort by createdAt descending
    const sortedAvailable = [...available].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return sortedAvailable.slice(0, 8);
  }, [products, dealItems, bestFeatured, bestGrid]);

  const latestItems = useMemo(() => getLatestProducts(), [getLatestProducts]);

  // Combine real products for filter/search
  const getUnifiedCatalog = () => {
    const catalogMap = new Map<string, Product>();

    dealItems.forEach((p) => catalogMap.set(p.id, p));
    if (bestFeatured) catalogMap.set(bestFeatured.id, bestFeatured);
    bestGrid.forEach((p) => catalogMap.set(p.id, p));
    latestItems.forEach((p) => catalogMap.set(p.id, p));

    products.forEach((p) => {
      if (p.isAvailable && getEffectiveStore(p) === 'furniture-store') {
        catalogMap.set(p.id, p);
      }
    });

    return Array.from(catalogMap.values());
  };

  const unifiedCatalog = getUnifiedCatalog();

  const filteredProducts = unifiedCatalog.filter((p) => {
    const matchSearch =
      !debouncedSearch ||
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.description?.toLowerCase().includes(debouncedSearch.toLowerCase());

    let matchCategory = true;
    if (activeCategory) {
      const targetCatName = activeCategory.toLowerCase();
      const productCat = (p.category || '').toLowerCase();
      const productName = p.name.toLowerCase();

      // Find real Firestore category name to match against
      const realCatName = categories.find((c) => c.id === p.category)?.name.toLowerCase() || '';

      matchCategory =
        productCat === targetCatName ||
        productName.includes(targetCatName) ||
        realCatName.includes(targetCatName);
    }
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50/30 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 pb-16 font-sans">
      {/* === SEARCH BAR =================================================== */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 py-3 border-b border-slate-100 dark:border-zinc-800">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/50 dark:border-zinc-700/50 cursor-text shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all"
          onClick={() => searchRef.current?.focus()}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke={searchFocused ? '#10B981' : '#94a3b8'}
            strokeWidth="2.2"
            className="flex-shrink-0 transition-colors"
          >
            <circle cx="8" cy="8" r="5.5" />
            <path d="M13 13L16 16" strokeLinecap="round" />
          </svg>
          <input
            ref={searchRef}
            id="home-search"
            name="home-search"
            type="text"
            placeholder={t('home.search') || 'Search premium furniture & decor...'}
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
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-800 dark:text-zinc-100 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setDebouncedSearch('');
              }}
              className="p-1 rounded-md bg-slate-200/60 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-300/60 transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Overlay */}
        {searchFocused && !searchQuery && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-zinc-900 shadow-xl border-b border-slate-100 dark:border-zinc-800 rounded-b-2xl p-5 z-30 animate-fadeInDown flex flex-col gap-5">
            {recentSearches.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold font-display text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Recent Searches
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearRecentSearches();
                    }}
                    className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRecentClick(q)}
                      className="px-4 py-2 text-xs font-semibold rounded-full bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all flex items-center gap-1.5"
                    >
                      <span className="opacity-60">🕒</span>
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-sm">🔥</span>
                <span className="text-xs font-bold font-display text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  Trending Searches
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                                {['Artistic Wardrobes', 'Steel Almirahs', 'Dressing Tables', 'Pink Vanity'].map(
                  (q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRecentClick(q)}
                      className="px-4 py-2 text-xs font-bold rounded-full bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40 transition-all flex items-center gap-1.5"
                    >
                      <span>📈</span>
                      <span>{q}</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20">
        {/* === FILTERED / SEARCH RESULT VIEW ============================== */}
        {searchQuery || activeCategory ? (
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl border border-slate-100 dark:border-zinc-800 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-extrabold font-display text-slate-900 dark:text-zinc-100 tracking-tight">
                  {searchQuery
                    ? `Results for "${searchQuery}"`
                    : `${activeCategory?.toUpperCase()} Collection`}
                </h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1.5">
                  Showing {filteredProducts.length} premium design options
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedSearch('');
                  setActiveCategory(null);
                }}
                className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-all active:scale-95"
              >
                Reset Filters ✕
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <EmptyState
                type="search"
                title="No products found"
                description="We couldn't find matches. Try adjusting your search query or categories."
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    qty={getCartQty(product.id)}
                    onAdd={() => addItem(product)}
                    onInc={() => updateQuantity(product.id, getCartQty(product.id) + 1)}
                    onDec={() => updateQuantity(product.id, getCartQty(product.id) - 1)}
                    deliverySlot={liveSlot}
                    onClick={() => router.push(`/product/${product.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* === MAIN HOME PAGE BLOCKS ===================================== */
          <>
            {/* Top Greeting Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
              <div>
                <h1 className="text-3xl font-extrabold font-display text-slate-900 dark:text-zinc-50 tracking-tight">
                  Hi, {firstName}!
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                  Welcome to your premium furniture curation.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 px-3.5 py-1.5 rounded-full shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Delivering today in: {liveSlot}</span>
              </div>
            </div>

            {/* 1. Hero Slider Banner */}
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl shadow-sm h-[340px] md:h-[420px]"
            >
              <div
                style={{
                  display: 'flex',
                  transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: `translateX(-${(heroSlide * 100) / activeBanners.length}%)`,
                  width: `${activeBanners.length * 100}%`,
                  height: '100%',
                }}
              >
                {activeBanners.map((slide) => (
                  <div
                    key={slide.id}
                    className="w-full h-full flex flex-col md:flex-row justify-between items-center p-8 md:p-14 relative overflow-hidden"
                    style={{ flex: `0 0 ${100 / activeBanners.length}%` }}
                  >
                    {/* Left text block */}
                    <div className="flex flex-col justify-center items-start z-10 max-w-xl text-left">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 mb-4 border border-emerald-100/50 dark:border-emerald-900/30">
                        {slide.badge}
                      </span>
                      <h2 className="text-3xl md:text-5.5xl font-extrabold font-display text-slate-900 dark:text-zinc-50 leading-tight mb-4 tracking-tight">
                        {slide.headline}
                      </h2>
                      <p className="text-sm md:text-base text-slate-500 dark:text-zinc-400 mb-6 max-w-md leading-relaxed">
                        {slide.sub}
                      </p>

                      <div className="flex flex-wrap items-center gap-4">
                        <button
                          onClick={() => handleCategoryClick(slide.category)}
                          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-slate-950 text-white font-bold rounded-xl text-sm transition-all active:scale-95 shadow-sm flex items-center gap-1.5"
                        >
                          <span>{slide.cta}</span>
                          <span>→</span>
                        </button>

                        <div
                          onClick={(e) => handleCopyPromo(e, slide.promoCode)}
                          className="inline-flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-dashed border-slate-300 dark:border-zinc-600 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-zinc-300 cursor-pointer select-none transition-all active:scale-95"
                        >
                          <span>🎟️ {slide.promoCode}</span>
                          <span className="text-[10px] bg-slate-200/60 dark:bg-zinc-700 px-2 py-0.5 rounded text-slate-600 dark:text-zinc-400 font-semibold">
                            {copiedCode === slide.promoCode ? 'Copied!' : 'Copy'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right image display */}
                    <div className="hidden md:flex w-1/2 h-full justify-center items-center relative">
                      <div className="absolute w-[320px] h-[320px] bg-emerald-50/40 dark:bg-emerald-950/10 rounded-full blur-3xl -z-10" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slide.imageUrl}
                        alt={slide.headline}
                        className="max-h-[300px] w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Dots indicators */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
                {activeBanners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroSlide(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      i === heroSlide ? 'bg-slate-800 dark:bg-zinc-100 w-6' : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* 2. Features Trust Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 my-8">
              {[
                {
                  title: 'Free Shipping',
                  desc: 'On orders over ₹199',
                  icon: (
                    <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125a1.125 1.125 0 0 0 1.125-1.125V9.75M8.25 18.75a1.5 1.5 0 0 1-3 0M15.75 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75-15h11.25c.621 0 1.125.504 1.125 1.125V14.25m-13.5 0h13.5" />
                    </svg>
                  ),
                },
                {
                  title: 'Returns',
                  desc: '30-day return policy',
                  icon: (
                    <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                    </svg>
                  ),
                },
                {
                  title: 'Secured Payment',
                  desc: '100% safe & encrypted',
                  icon: (
                    <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  ),
                },
                {
                  title: 'Special Gifts',
                  desc: 'Wraps & promo cards',
                  icon: (
                    <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125V9.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.125c0 .621.504 1.125 1.125 1.125Z" />
                    </svg>
                  ),
                },
                {
                  title: 'Support 24/7',
                  desc: 'Get assistance anytime',
                  icon: (
                    <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
                    </svg>
                  ),
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 flex flex-col items-center text-center shadow-sm hover:shadow transition-shadow"
                >
                  <div className="mb-3 bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-full flex items-center justify-center">
                    {item.icon}
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-zinc-200 text-sm font-display mb-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium leading-normal">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* 7. Shop By Category (Circular Slider) */}
            <div className="my-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold font-display text-slate-800 dark:text-zinc-100 tracking-tight">
                  Shop By Category
                </h3>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                  Discover curated products tailored to your preferences
                </p>
              </div>

              <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-width-none hide-scrollbar">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className="flex flex-col items-center gap-2.5 flex-shrink-0 cursor-pointer focus:outline-none group"
                    >
                      <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-all duration-300 shadow-sm ${
                          isActive
                            ? 'bg-slate-900 dark:bg-zinc-100 text-white dark:text-slate-900 scale-105 ring-4 ring-emerald-500/20 dark:ring-emerald-400/20'
                            : 'bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 group-hover:scale-105 border border-slate-100 dark:border-zinc-800'
                        }`}
                      >
                        {cat.emoji || '📦'}
                      </div>
                      <span
                        className={`text-xs font-semibold font-display transition-colors ${
                          isActive
                            ? 'text-slate-900 dark:text-zinc-100 font-bold'
                            : 'text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-zinc-200'
                        }`}
                      >
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. Deal of the Day (3 timers products) */}
            {dealItems.length > 0 && (
              <div className="my-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold font-display text-slate-800 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                      <span>⚡ Deal of the Day</span>
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                      Hurry! Ticking deals on exclusive premium designs
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30 px-4 py-2 rounded-full font-bold font-display text-sm">
                    <span>Ends In:</span>
                    <span className="font-mono">
                      {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {dealItems.map((p) => {
                    const discountPercent =
                      p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 25;

                    return (
                      <div
                        key={p.id}
                        className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-slate-100 dark:border-zinc-800 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                      >
                        <div className="absolute top-4 left-4 bg-rose-500 text-white font-bold text-xs px-2.5 py-1 rounded-full z-10 shadow-sm">
                          {discountPercent}% OFF
                        </div>

                        <div className="absolute top-4 right-4 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-[11px] px-2.5 py-1 rounded-full z-10 flex items-center gap-1 border border-amber-200/50 dark:border-amber-900/30">
                          <span>⏱️</span>
                          <span className="font-mono">
                            {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:
                            {formatTime(timeLeft.seconds)}
                          </span>
                        </div>

                        <div className="h-48 relative overflow-hidden rounded-xl bg-slate-50 dark:bg-zinc-800/30 flex items-center justify-center mb-4 mt-6">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <span className="text-5xl">🛋️</span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold text-slate-800 dark:text-zinc-200 line-clamp-1 mb-1 font-display">
                            {p.name}
                          </h4>
                          <div className="flex items-center gap-1 mb-3">
                            <span className="text-yellow-500 text-xs">★</span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                              {(p as any).rating || '4.8'}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                              ({(p as any).reviews || '80'})
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50 dark:border-zinc-800">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-lg font-extrabold text-slate-900 dark:text-zinc-100">
                                ₹{p.price}
                              </span>
                              <span className="text-xs text-slate-400 dark:text-zinc-500 line-through">
                                ₹{p.mrp || Math.round(p.price * 1.3)}
                              </span>
                            </div>

                            {getCartQty(p.id) > 0 ? (
                              <div className="flex items-center gap-2.5 bg-emerald-600 text-white rounded-lg p-1 justify-between shadow-sm">
                                <button
                                  onClick={() => updateQuantity(p.id, getCartQty(p.id) - 1)}
                                  className="w-6 h-6 flex items-center justify-center font-bold hover:bg-emerald-700 rounded transition-colors text-xs"
                                >
                                  -
                                </button>
                                <span className="font-bold text-xs">{getCartQty(p.id)}</span>
                                <button
                                  onClick={() => updateQuantity(p.id, getCartQty(p.id) + 1)}
                                  className="w-6 h-6 flex items-center justify-center font-bold hover:bg-emerald-700 rounded transition-colors text-xs"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addItem(p)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                              >
                                <span>Add</span>
                                <span>+</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Double Promo Banners */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-10">
              <div
                onClick={() => handleCategoryClick('wardrobes')}
                className="h-64 rounded-3xl overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="absolute inset-0 bg-slate-900/40 z-10 transition-colors group-hover:bg-slate-900/30" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80"
                  alt="Artistic Wardrobes"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
                />
                <div className="absolute inset-0 z-20 p-8 flex flex-col justify-between text-white">
                  <div>
                    <span className="bg-emerald-500 text-white font-bold font-display text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Spacious Storage
                    </span>
                    <h3 className="text-3xl font-extrabold font-display mt-4 leading-tight">
                      Artistic Wardrobes
                    </h3>
                    <p className="text-sm text-slate-200 mt-2 max-w-xs opacity-90">
                      Premium steel and wooden almirahs decorated with artistic prints.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold border-b-2 border-white pb-0.5 group-hover:border-emerald-400 transition-colors">
                      Shop Wardrobes
                    </span>
                    <span className="text-sm group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </div>

              <div
                onClick={() => handleCategoryClick('dressing-tables')}
                className="h-64 rounded-3xl overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="absolute inset-0 bg-slate-900/40 z-10 transition-colors group-hover:bg-slate-900/30" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1580481072645-022f9a6dbf27?auto=format&fit=crop&w=800&q=80"
                  alt="Modern Dressing Tables"
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
                />
                <div className="absolute inset-0 z-20 p-8 flex flex-col justify-between text-white">
                  <div>
                    <span className="bg-amber-500 text-white font-bold font-display text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Vanity Elegance
                    </span>
                    <h3 className="text-3xl font-extrabold font-display mt-4 leading-tight">
                      Dressing Tables
                    </h3>
                    <p className="text-sm text-slate-200 mt-2 max-w-xs opacity-90">
                      Elegant vanity stations with mirrors and dedicated compartments.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold border-b-2 border-white pb-0.5 group-hover:border-amber-400 transition-colors">
                      Explore Vanities
                    </span>
                    <span className="text-sm group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Best Selling Products */}
            {bestFeatured && (
              <div className="my-10">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold font-display text-slate-800 dark:text-zinc-100 tracking-tight">
                    🔥 Best Sellers
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                    Popular interior selections highly rated by customers
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: spacious featured card */}
                  <div className={`${bestGrid.length > 0 ? 'lg:col-span-5' : 'lg:col-span-12'} bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl border border-slate-100 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group`}>
                    <div className="absolute top-4 left-4 bg-emerald-500 text-white font-bold font-display text-[10px] px-3 py-1 rounded-full z-10 shadow-sm">
                      BEST SELLER
                    </div>

                    <div className="h-64 relative overflow-hidden rounded-2xl bg-slate-50 dark:bg-zinc-800/30 flex items-center justify-center mb-6">
                      {bestFeatured.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={bestFeatured.imageUrl}
                          alt={bestFeatured.name}
                          className="w-full h-full object-contain p-6 group-hover:scale-102 transition-transform duration-500"
                        />
                      ) : (
                        <span className="text-6xl">🪑</span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-yellow-500 text-sm">★</span>
                          <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                            {(bestFeatured as any).rating || '4.8'}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-zinc-500">
                            ({(bestFeatured as any).reviews || '142'} reviews)
                          </span>
                        </div>

                        <h4 className="text-xl font-bold font-display text-slate-900 dark:text-zinc-100 leading-tight mb-2">
                          {bestFeatured.name}
                        </h4>

                        <p className="text-sm text-slate-500 dark:text-zinc-400 line-clamp-3 mb-6 leading-relaxed">
                          {bestFeatured.description ||
                            'Premium aesthetic meets modern layout. Crafted from sustainable materials for long-lasting WFH support.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-zinc-800">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100">
                            ₹{bestFeatured.price}
                          </span>
                          {bestFeatured.mrp && bestFeatured.mrp > bestFeatured.price && (
                            <span className="text-sm text-slate-400 dark:text-zinc-500 line-through">
                              ₹{bestFeatured.mrp}
                            </span>
                          )}
                        </div>

                        {getCartQty(bestFeatured.id) > 0 ? (
                          <div className="flex items-center gap-3 bg-emerald-600 text-white rounded-xl p-1.5 justify-between w-36 shadow-sm">
                            <button
                              onClick={() => updateQuantity(bestFeatured.id, getCartQty(bestFeatured.id) - 1)}
                              className="w-8 h-8 flex items-center justify-center font-bold hover:bg-emerald-700 rounded-lg transition-colors text-sm"
                            >
                              -
                            </button>
                            <span className="font-bold text-sm">{getCartQty(bestFeatured.id)}</span>
                            <button
                              onClick={() => updateQuantity(bestFeatured.id, getCartQty(bestFeatured.id) + 1)}
                              className="w-8 h-8 flex items-center justify-center font-bold hover:bg-emerald-700 rounded-lg transition-colors text-sm"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addItem(bestFeatured)}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5 text-sm"
                          >
                            <span>Add to Cart</span>
                            <span>+</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: 4-product grid */}
                  {bestGrid.length > 0 && (
                    <div className="lg:col-span-7 grid grid-cols-2 gap-6">
                      {bestGrid.map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          qty={getCartQty(p.id)}
                          onAdd={() => addItem(p)}
                          onInc={() => updateQuantity(p.id, getCartQty(p.id) + 1)}
                          onDec={() => updateQuantity(p.id, getCartQty(p.id) - 1)}
                          deliverySlot={liveSlot}
                          onClick={() => router.push(`/product/${p.id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Latest Products Section */}
            {latestItems.length > 0 && (
              <div className="my-10">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold font-display text-slate-800 dark:text-zinc-100 tracking-tight">
                    ✨ Latest Arrivals
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                    Explore fresh designs and seasonal updates for your spaces
                  </p>
                </div>

                {loading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mt-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-[260px] rounded-2xl bg-slate-100 dark:bg-zinc-800 animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {latestItems.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        qty={getCartQty(p.id)}
                        onAdd={() => addItem(p)}
                        onInc={() => updateQuantity(p.id, getCartQty(p.id) + 1)}
                        onDec={() => updateQuantity(p.id, getCartQty(p.id) - 1)}
                        deliverySlot={liveSlot}
                        onClick={() => router.push(`/product/${p.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 8. Bottom Promo Banners */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
              {[
                {
                  title: 'Classic Almirahs',
                  desc: 'Sturdy steel and wooden almirahs built for safety.',
                  tag: 'Wardrobes Collection',
                  emoji: '🚪',
                  cat: 'wardrobes',
                  action: 'View All',
                },
                {
                  title: 'Makeup Vanities',
                  desc: 'Elegant dressing tables with smart storage drawers.',
                  tag: 'Vanity Station',
                  emoji: '🪞',
                  cat: 'dressing-tables',
                  action: 'Explore',
                },
                {
                  title: 'Floral Closets',
                  desc: 'Aesthetic wardrobes decorated with artistic patterns.',
                  tag: 'Artistic Bedrooms',
                  emoji: '🌸',
                  cat: 'wardrobes',
                  action: 'Shop Now',
                },
              ].map((card, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-zinc-900 dark:to-zinc-800/50 rounded-2xl border border-slate-200/50 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-sm hover:shadow transition-shadow group relative overflow-hidden"
                >
                  <div className="absolute -right-4 -bottom-4 text-7xl opacity-10 dark:opacity-5 group-hover:scale-110 transition-transform duration-300 pointer-events-none">
                    {card.emoji}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      {card.tag}
                    </span>
                    <h4 className="text-xl font-bold font-display text-slate-900 dark:text-zinc-100 mt-2">
                      {card.title}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1.5 max-w-[200px] leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCategoryClick(card.cat)}
                    className="text-xs font-bold text-slate-800 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 mt-6 self-start"
                  >
                    <span>{card.action}</span>
                    <span>→</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
