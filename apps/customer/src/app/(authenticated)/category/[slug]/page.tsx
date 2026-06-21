'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CATEGORIES, CATEGORY_MAP } from '@smart-bazar/shared/lib/constants';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { categoryService } from '@smart-bazar/shared/lib/services/categoryService';
import { storeService } from '@smart-bazar/shared/lib/services/storeService';
import { subCategoryService } from '@smart-bazar/shared/lib/services/subCategoryService';
import { Product, Category, Store, SubCategory } from '@smart-bazar/shared/types/firestore';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';
import { useAppConfig } from '@smart-bazar/shared/contexts/AppConfigContext';
import Image from 'next/image';
import { triggerAddToCartAnimation } from '@smart-bazar/shared/lib/utils/animation';
import EmptyState from '@smart-bazar/shared/components/ui/EmptyState';

const BANNER_CFG: Record<string, { headline: string; sub: string; emoji: string; bg: string; accentBg: string }> = {
  'furniture-store': { headline: 'Style Your Space 🏡',  sub: 'Premium furniture & decor',      emoji: '🪑', bg: 'linear-gradient(135deg,#fef9c3 0%,#fde68a 100%)', accentBg: '#f59e0b' },
};

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { getDeliverySlot: getLiveSlot } = useAppConfig();

  const [products, setProducts]           = useState<Product[]>([]);
  const [categories, setCategories]       = useState<Category[]>([]);
  const [dbStores, setDbStores]           = useState<Store[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [loading, setLoading]             = useState(true);
  const [catLoading, setCatLoading]       = useState(true);
  const [actualSubCategories, setActualSubCategories] = useState<SubCategory[]>([]);
  const [activeRealSubCat, setActiveRealSubCat] = useState<string | null>(null);

  // New Filter & Sort states
  const [allStoreSubCategories, setAllStoreSubCategories] = useState<SubCategory[]>([]);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [filterAvailability, setFilterAvailability] = useState(false);

  // Aliases for existing render code
  const subCategories = categories;
  const dbCategories = dbStores;
  const activeSubCat = activeCategory;
  const setActiveSubCat = setActiveCategory;

  const { addItem, items, updateQuantity } = useCartStore();
  const catTabsRef = useRef<HTMLDivElement>(null);

  const category = CATEGORY_MAP[slug];
  const banner   = BANNER_CFG[slug] ?? {
    headline: category?.name ?? slug,
    sub: 'Explore products',
    emoji: category?.icon ?? '📦',
    bg: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)',
    accentBg: '#059669',
  };
  const accentColor = category?.color ?? '#059669';

  // -- Data subscriptions -------------------------------------------------------
  useEffect(() => {
    if (!slug) return;
    // slug = storeId: load categories (formerly sub-categories) for this store
    const unsubCat = categoryService.subscribeToCategories(slug, setCategories);

    // Load subcategories for this store
    const unsubStoreSub = subCategoryService.subscribeToStoreSubCategories(slug, setAllStoreSubCategories);

    // Backward-compat: old products used `category` with old IDs (e.g. 'mudikhana').
    // Map them to stores so nothing disappears after migration.
    const OLD_CAT_TO_STORE: Record<string, string> = {
      furniture: 'furniture-store', home: 'furniture-store',
    };
    const matchesStore = (p: Product) =>
      p.store === slug ||
      (!p.store && (OLD_CAT_TO_STORE[(p.category || '').toLowerCase()] === slug));

    const unsubProd = productService.subscribeToProducts((allProds) => {
      setProducts(allProds.filter((p) => p.isAvailable && matchesStore(p)));
      setLoading(false);
    });
    setActiveCategory(null);
    setSearchQuery('');
    return () => { unsubCat(); unsubProd(); unsubStoreSub(); };
  }, [slug]);

  // -- Real-time stores (for chip strip navigation) -----------------------------
  useEffect(() => {
    const unsub = storeService.subscribeToStores((data) => {
      setDbStores(data);
      setCatLoading(false);
    });
    return () => unsub();
  }, []);

  // -- Load Real SubCategories when a Category is selected --
  useEffect(() => {
    setActiveRealSubCat(null);
    if (activeCategory) {
      const unsub = subCategoryService.subscribeToSubCategories(activeCategory, setActualSubCategories);
      return () => unsub();
    } else {
      setActualSubCategories([]);
    }
  }, [activeCategory]);

  // Scroll active category tab into view
  useEffect(() => {
    if (!catTabsRef.current) return;
    const el = catTabsRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [slug]);

  // -- Helpers ------------------------------------------------------------------
  const getQty = (pid: string) => items.find((i) => i.product.id === pid)?.quantity ?? 0;

  const filteredProducts = (() => {
    let list = [...products];
    if (activeSubCat)  list = list.filter((p) => p.category === activeSubCat);
    if (activeRealSubCat) list = list.filter((p) => p.subCategory === activeRealSubCat);
    if (searchQuery)   list = list.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filterAvailability) {
      list = list.filter((p) => p.stock > 0);
    }
    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    }
    return list;
  })();

  // Products grouped by category (formerly sub-category)
  const productsBySubCat = subCategories
    .map((s) => ({
      subcat: s,
      items: products.filter((p) => p.category === s.id),
    }))
    .filter((g) => g.items.length > 0);

  // Products with no category assigned
  const uncategorisedProducts = products.filter(
    (p) => !p.category || !subCategories.find((s) => s.id === p.category)
  );

  const isFiltered = !!activeSubCat || !!searchQuery || sortBy !== 'default' || filterAvailability || !!activeRealSubCat;

  // -- Coming Soon guard --------------------------------------------------------
  const thisCategory = dbCategories.find((c) => c.id === slug);
  const isComingSoon = !catLoading && thisCategory?.isComingSoon === true;

  // -- RENDER -------------------------------------------------------------------

  // Coming Soon blocking screen
  if (isComingSoon) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg,#fef9c3,#fde68a)',
        padding: 32, textAlign: 'center',
      }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>⏳</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e293b', marginBottom: 8 }}>
          {thisCategory?.name || slug}
        </h1>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#92400e', marginBottom: 12 }}>
          Coming Soon!
        </h2>
        <p style={{ fontSize: 14, color: '#78350f', maxWidth: 280, lineHeight: 1.6, marginBottom: 32 }}>
          We&apos;re stocking up the best products for you. Stay tuned! 🚀
        </p>
        <button
          onClick={() => router.push('/home')}
          style={{
            background: '#f59e0b', color: '#fff', border: 'none',
            borderRadius: 14, padding: '14px 28px', fontSize: 15,
            fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(245,158,11,0.4)',
          }}
        >
          ← Back to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: 90 }}>

      {/* ======================== STICKY HEADER ======================== */}
      <div style={{
        position: 'sticky', top: 60, zIndex: 30,
        background: '#fff', borderBottom: '1px solid #f0f0f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        {/* Back + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px 0' }}>
          <button
            onClick={() => router.back()}
            style={{ background: '#f5f5f5', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 13L7 9L11 5" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            {category?.icon} {category?.name ?? slug}
          </span>
          {!loading && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
              {products.length} products
            </span>
          )}
        </div>

        {/* Category tab strip */}
        <div
          ref={catTabsRef}
          style={{ display: 'flex', overflowX: 'auto', padding: '8px 10px 0', gap: 4, scrollbarWidth: 'none' }}
          className="hide-scrollbar"
        >
          {dbCategories.length > 0 ? dbCategories.map((cat) => {
            const isActive = cat.id === slug;
            const isCatComingSoon = cat.isComingSoon === true;
            return (
              <button
                key={cat.id}
                className="category-chip"
                data-active={String(isActive)}
                onClick={() => {
                  if (!isCatComingSoon) router.replace(`/category/${cat.id}`);
                }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '6px 14px 10px', borderRadius: 0, border: 'none',
                  cursor: isCatComingSoon ? 'not-allowed' : 'pointer',
                  minWidth: 60, flexShrink: 0, background: 'transparent',
                  color: isActive ? accentColor : '#64748b',
                  opacity: isCatComingSoon ? 0.5 : 1,
                  borderBottom: isActive ? `2.5px solid ${accentColor}` : '2.5px solid transparent',
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
              >
                {cat.imageUrl ? (
                  <div style={{ width: 44, height: 44, padding: 2, borderRadius: 12, background: '#f0fdf4', marginBottom: 2, overflow: 'hidden' }}>
                    <img src={cat.imageUrl} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
                  </div>
                ) : (
                  <span style={{ fontSize: 24, marginBottom: 4 }}>📦</span>
                )}
                <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap' }}>
                  {cat.name}
                </span>
                {isCatComingSoon && (
                  <div style={{
                    position: 'absolute', top: 2, right: 2,
                    background: '#f59e0b', color: '#fff',
                    fontSize: 7, fontWeight: 800, padding: '1px 4px',
                    borderRadius: 3, letterSpacing: '0.04em',
                  }}>SOON</div>
                )}
              </button>
            );
          }) : CATEGORIES.map((cat) => {
            // fallback while loading
            const isActive = cat.id === slug;
            return (
              <button
                key={cat.id}
                className="category-chip"
                data-active={String(isActive)}
                onClick={() => router.replace(`/category/${cat.id}`)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '6px 14px 10px', borderRadius: 0, border: 'none',
                  cursor: 'pointer', minWidth: 60, flexShrink: 0, background: 'transparent',
                  color: isActive ? accentColor : '#64748b',
                  borderBottom: isActive ? `2.5px solid ${accentColor}` : '2.5px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {(cat as any).imageUrl ? (
                  <div style={{ width: 44, height: 44, padding: 2, borderRadius: 12, background: '#f0fdf4', marginBottom: 2, overflow: 'hidden' }}>
                    <img src={(cat as any).imageUrl} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
                  </div>
                ) : (
                  <span style={{ fontSize: 24, marginBottom: 4 }}>{(cat as any).icon}</span>
                )}
                <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap' }}>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================== SEARCH BAR ======================== */}
      <div style={{ background: '#fff', padding: '10px 14px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#f5f5f5', borderRadius: 12, padding: '10px 14px' }}>
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="#94a3b8" strokeWidth="2">
            <circle cx="8" cy="8" r="5.5"/><path d="M13 13L16 16" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder={`Search "${category?.name ?? slug}" products...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#0f172a' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, fontSize: 14 }}>✕</button>
          )}
        </div>
        <button
          onClick={() => setShowFilterDrawer(true)}
          style={{
            background: showFilterDrawer || activeSubCat || activeRealSubCat || sortBy !== 'default' || filterAvailability ? `${accentColor}12` : '#f5f5f5',
            border: activeSubCat || activeRealSubCat || sortBy !== 'default' || filterAvailability ? `1.5px solid ${accentColor}` : 'none',
            borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
          }}
          title="Filters & Sort"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activeSubCat || activeRealSubCat || sortBy !== 'default' || filterAvailability ? accentColor : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
        </button>
      </div>

      {/* ======================== QUICK SORT & FILTER BAR ======================== */}
      <div style={{ background: '#fff', padding: '0 14px 10px', borderBottom: '1px solid #f0f0f0', marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f5f5f5', borderRadius: 10, padding: '6px 12px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
          >
            <option value="default">Relevance</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>

        <button
          onClick={() => setFilterAvailability(!filterAvailability)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: filterAvailability ? `${accentColor}12` : '#f5f5f5',
            border: filterAvailability ? `1.5px solid ${accentColor}` : '1.5px solid transparent',
            borderRadius: 10, padding: '6px 12px',
            fontSize: 12, fontWeight: 700,
            color: filterAvailability ? accentColor : '#64748b',
            cursor: 'pointer', transition: 'all 0.15s'
          }}
        >
          <span>🟢 In Stock</span>
        </button>

        {(sortBy !== 'default' || filterAvailability) && (
          <button
            onClick={() => { setSortBy('default'); setFilterAvailability(false); }}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              fontSize: 12, fontWeight: 700, color: '#ff5252', cursor: 'pointer'
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* ======================== FILTER DRAWER (SIDEBAR) ======================== */}
      {showFilterDrawer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.2s ease-out' }}>
          {/* Backdrop */}
          <div
            onClick={() => setShowFilterDrawer(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          />

          {/* Drawer Content */}
          <div style={{
            position: 'relative', width: '300px', height: '100%', background: '#fff',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
            animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Header */}
            <div style={{ padding: '20px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Filters & Sort</span>
              <button onClick={() => setShowFilterDrawer(false)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#94a3b8', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Scrollable Filters */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {/* Sort Section */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Sort By</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { val: 'default', label: 'Default / Relevance' },
                    { val: 'price-asc', label: 'Price: Low to High' },
                    { val: 'price-desc', label: 'Price: High to Low' },
                  ].map((opt) => (
                    <label key={opt.val} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="sortBy"
                        checked={sortBy === opt.val}
                        onChange={() => setSortBy(opt.val as any)}
                        style={{ accentColor }}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Availability Section */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Availability</h4>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filterAvailability}
                    onChange={(e) => setFilterAvailability(e.target.checked)}
                    style={{ accentColor }}
                  />
                  Only show In Stock items
                </label>
              </div>

              {/* Category (featured collections) Section */}
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Category</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="activeSubCat"
                      checked={activeSubCat === null}
                      onChange={() => { setActiveSubCat(null); setActiveRealSubCat(null); }}
                      style={{ accentColor }}
                    />
                    All Categories
                  </label>
                  {subCategories.map((sub) => (
                    <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="activeSubCat"
                        checked={activeSubCat === sub.id}
                        onChange={() => { setActiveSubCat(sub.id); setActiveRealSubCat(null); }}
                        style={{ accentColor }}
                      />
                      {sub.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Subcategories Section */}
              {allStoreSubCategories.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Subcategory</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="activeRealSubCat"
                        checked={activeRealSubCat === null}
                        onChange={() => setActiveRealSubCat(null)}
                        style={{ accentColor }}
                      />
                      All Subcategories
                    </label>
                    {allStoreSubCategories
                      .filter(sub => !activeSubCat || sub.categoryId === activeSubCat)
                      .map((sub) => (
                        <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="activeRealSubCat"
                            checked={activeRealSubCat === sub.id}
                            onChange={() => {
                              setActiveRealSubCat(sub.id);
                              // automatically select the parent category if not set
                              if (sub.categoryId !== activeSubCat) {
                                setActiveSubCat(sub.categoryId);
                              }
                            }}
                            style={{ accentColor }}
                          />
                          {sub.name}
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  setSortBy('default');
                  setFilterAvailability(false);
                  setActiveSubCat(null);
                  setActiveRealSubCat(null);
                  setShowFilterDrawer(false);
                }}
                style={{ flex: 1, padding: '12px', background: '#f5f5f5', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
              >
                Reset All
              </button>
              <button
                onClick={() => setShowFilterDrawer(false)}
                style={{ flex: 1, padding: '12px', background: accentColor, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}
              >
                Apply Filters
              </button>
            </div>
          </div>

          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </div>
      )}

      {/* ======== FILTERED / SEARCH RESULT VIEW ======== */}
      {isFiltered ? (
        <div>
          {/* Filter chip row */}
          <div style={{ background: '#fff', padding: '10px 14px', marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            {activeSubCat && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: `${accentColor}15`, border: `1px solid ${accentColor}40`,
                borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700, color: accentColor,
              }}>
                {subCategories.find(s => s.id === activeSubCat)?.name}
                <button onClick={() => { setActiveSubCat(null); setActiveRealSubCat(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: accentColor, fontSize: 14, lineHeight: 1 }}>✕</button>
              </div>
            )}
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>
              {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Real SubCategory Pills */}
          {actualSubCategories.length > 0 && (
            <div style={{ display: 'flex', gap: 8, padding: '0 14px', marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }} className="hide-scrollbar">
              {actualSubCategories.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setActiveRealSubCat(sub.id === activeRealSubCat ? null : sub.id)}
                  style={{
                    padding: '8px 14px', borderRadius: 24, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                    background: sub.id === activeRealSubCat ? accentColor : '#fff',
                    color: sub.id === activeRealSubCat ? '#fff' : '#64748b',
                    border: sub.id === activeRealSubCat ? `1px solid ${accentColor}` : '1px solid #e2e8f0',
                    cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
                    boxShadow: sub.id === activeRealSubCat ? `0 4px 12px ${accentColor}30` : 'none'
                  }}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}

          {/* Product grid */}
          <div style={{ padding: '0 14px' }}>
            {filteredProducts.length === 0 ? (
              <EmptyState
                type="search"
                title="No products found"
                description="Try a different search term or category"
                action={{
                  label: 'Clear filters',
                  onClick: () => { setSearchQuery(''); setActiveSubCat(null); setActiveRealSubCat(null); }
                }}
              />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} qty={getQty(p.id)} accentColor={accentColor}
                    catIcon={category?.icon ?? '📦'}
                    deliverySlot={getLiveSlot()}
                    onAdd={() => addItem(p)}
                    onInc={() => updateQuantity(p.id, getQty(p.id) + 1)}
                    onDec={() => updateQuantity(p.id, getQty(p.id) - 1)}
                    onClick={() => router.push(`/product/${p.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      ) : loading ? (
        // ======== LOADING SKELETONS ========
        <div>
          <div style={{ background: '#fff', padding: 14, marginBottom: 8 }}>
            <div style={{ height: 110, borderRadius: 18, background: 'linear-gradient(90deg,#f1f5f9 25%,#e8eef5 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
          </div>
          <div style={{ background: '#fff', padding: 14, marginBottom: 8 }}>
            <div style={{ height: 16, width: 160, borderRadius: 6, background: '#f1f5f9', marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 12, overflowX: 'hidden' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ minWidth: 130, borderRadius: 14, background: '#f8fafc', overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ height: 130, background: 'linear-gradient(90deg,#f1f5f9 25%,#e8eef5 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
                  <div style={{ padding: 10 }}>
                    <div style={{ height: 10, background: '#e2e8f0', borderRadius: 4, marginBottom: 6, width: '80%' }} />
                    <div style={{ height: 10, background: '#e2e8f0', borderRadius: 4, width: '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      ) : (
        // ======== MAIN CONTENT VIEW ========
        <div>

          {/* -- HERO BANNER -- */}
          <div style={{ padding: '0 14px 8px', background: '#fff', marginBottom: 8 }}>
            <div style={{
              background: banner.bg, borderRadius: 20, padding: '20px 18px',
              position: 'relative', overflow: 'hidden', minHeight: 110,
            }}>
              <div style={{ position: 'absolute', right: -24, top: -24, width: 100, height: 100, background: 'rgba(255,255,255,0.3)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', right: 20, bottom: -28, width: 80, height: 80, background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }} />
              <div style={{ position: 'relative', zIndex: 1, maxWidth: '65%' }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '0 0 6px', lineHeight: 1.25 }}>
                  {banner.headline}
                </h2>
                <p style={{ fontSize: 12, color: '#475569', margin: '0 0 14px' }}>{banner.sub}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>
                    Delivery in {getLiveSlot()}
                  </span>
                </div>
              </div>
              <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
                <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(255,255,255,0.4)', padding: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                  {category?.imageUrl ? (
                    <img src={category.imageUrl} style={{ width: '100%', height: '100%', borderRadius: 16, objectFit: 'cover' }} alt="" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, background: '#fff', borderRadius: 16 }}>{banner.emoji}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* -- FEATURED SUB-CATEGORY BANNERS (horizontal scroll) -- */}
          {subCategories.length > 0 && (
            <div style={{ background: '#fff', padding: '14px 0 14px', marginBottom: 8 }}>
              <div style={{ paddingLeft: 14, paddingRight: 14, marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  ✨ Featured Collections
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingLeft: 14, paddingRight: 14, scrollbarWidth: 'none' }}
                className="hide-scrollbar">
                {subCategories.map((sub) => {
                  const subProdCount = products.filter(p => p.category === sub.id).length;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setActiveSubCat(sub.id)}
                      style={{
                        minWidth: 140, height: 120, borderRadius: 16, border: `2px solid ${accentColor}30`,
                        background: '#fff', cursor: 'pointer', flexShrink: 0,
                        overflow: 'hidden', position: 'relative', padding: 0,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      }}
                    >
                      {/* Image fill */}
                      {sub.imageUrl ? (
                        <img src={sub.imageUrl} alt={sub.name}
                          style={{ width: '100%', height: '70%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '70%', background: banner.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                          {category?.imageUrl ? (
                            <img src={category.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          ) : (
                            <span>{(category as any)?.icon}</span>
                          )}
                        </div>
                      )}
                      {/* Featured badge */}
                      <div style={{
                        position: 'absolute', top: 8, left: 8,
                        background: accentColor, color: '#fff',
                        fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                      }}>
                        Featured
                      </div>
                      {/* Name bar */}
                      <div style={{ padding: '7px 10px', background: '#fff', textAlign: 'left' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sub.name}
                        </p>
                        <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{subProdCount} items</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* -- PRODUCT SECTIONS BY SUB-CATEGORY -- */}
          {productsBySubCat.map((group, gIdx) => (
            <div key={group.subcat.id} style={{ background: '#fff', padding: '14px 0 6px', marginBottom: 8 }}>
              {/* Section header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 14px', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {group.subcat.name}
                  </h3>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>
                    {group.items.length} product{group.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setActiveSubCat(group.subcat.id)}
                  style={{ fontSize: 12, color: accentColor, fontWeight: 700, background: `${accentColor}12`, border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  See all →
                </button>
              </div>

              {/* Horizontal scroll of product cards */}
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingLeft: 14, paddingRight: 14, paddingBottom: 14, scrollbarWidth: 'none' }}
                className="hide-scrollbar">
                {group.items.slice(0, 8).map((p) => (
                  <HorizontalProductCard
                    key={p.id}
                    product={p}
                    qty={getQty(p.id)}
                    accentColor={accentColor}
                    catIcon={category?.icon ?? '📦'}
                    deliverySlot={getLiveSlot()}
                    onAdd={() => addItem(p)}
                    onInc={() => updateQuantity(p.id, getQty(p.id) + 1)}
                    onDec={() => updateQuantity(p.id, getQty(p.id) - 1)}
                    onClick={() => router.push(`/product/${p.id}`)}
                  />
                ))}
                {/* See all card */}
                {group.items.length > 8 && (
                  <button
                    onClick={() => setActiveSubCat(group.subcat.id)}
                    style={{
                      minWidth: 100, borderRadius: 14, border: `2px dashed ${accentColor}40`,
                      background: `${accentColor}08`, cursor: 'pointer', flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '20px 12px',
                    }}
                  >
                    <span style={{ fontSize: 28 }}>→</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, textAlign: 'center' }}>
                      See all {group.items.length} products
                    </span>
                  </button>
                )}
              </div>

              {/* Divider banner after every 2 sections */}
              {gIdx === 1 && (
                <div style={{ margin: '0 14px 8px' }}>
                  <div style={{
                    background: banner.bg, borderRadius: 14, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12, position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ fontSize: 34 }}>{banner.emoji}</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                        Free delivery on ₹199+
                      </p>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>Delivered {getLiveSlot()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* -- UNCATEGORISED PRODUCTS -- */}
          {uncategorisedProducts.length > 0 && (
            <div style={{ background: '#fff', padding: '14px 0 6px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 14px', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>All {category?.name} Products</h3>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{uncategorisedProducts.length} items</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingLeft: 14, paddingRight: 14, paddingBottom: 14, scrollbarWidth: 'none' }}
                className="hide-scrollbar">
                {uncategorisedProducts.slice(0, 8).map((p) => (
                  <HorizontalProductCard
                    key={p.id}
                    product={p}
                    qty={getQty(p.id)}
                    accentColor={accentColor}
                    catIcon={category?.icon ?? '📦'}
                    deliverySlot={getLiveSlot()}
                    onAdd={() => addItem(p)}
                    onInc={() => updateQuantity(p.id, getQty(p.id) + 1)}
                    onDec={() => updateQuantity(p.id, getQty(p.id) - 1)}
                    onClick={() => router.push(`/product/${p.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* -- SHOP BY CATEGORY (4-column grid) -- */}
          {subCategories.length > 0 && (
            <div style={{ background: '#fff', padding: '16px 14px', marginBottom: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 14px' }}>
                Shop by Category
              </h3>
              <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {subCategories.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubCat(sub.id)}
                    style={{
                      background: `${accentColor}10`,
                      border: 'none', borderRadius: 14, padding: '10px 6px 8px',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 52, height: 52, borderRadius: 12, overflow: 'hidden',
                      background: `${accentColor}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {sub.imageUrl ? (
                        <img src={sub.imageUrl} alt={sub.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {category?.imageUrl ? (
                            <img src={category.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          ) : (
                            <span style={{ fontSize: 24 }}>{(category as any)?.icon}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <p style={{
                      fontSize: 10, fontWeight: 700, color: '#0f172a', margin: 0,
                      textAlign: 'center', lineHeight: 1.3,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {sub.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* -- EMPTY STATE -- */}
          {products.length === 0 && !loading && (
            <EmptyState
              icon={category?.icon ?? '📦'}
              title="No products yet"
              description="Products will appear once stores add items to this category"
              action={{
                label: 'Back to Home',
                onClick: () => router.push('/home')
              }}
            />
          )}

        </div>
      )}
    </div>
  );
}

// ===============================================================
// HORIZONTAL SCROLL PRODUCT CARD (Blinkit-style, ~130px wide)
// ===============================================================
function HorizontalProductCard({
  product, qty, accentColor, catIcon, deliverySlot, onAdd, onInc, onDec, onClick,
}: {
  product: Product;
  qty: number;
  accentColor: string;
  catIcon: string;
  deliverySlot: string;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  onClick?: () => void;
}) {
  const unitStr = product.unit
    ? (/^\d/.test(product.unit) ? product.unit : `1 ${product.unit}`)
    : null;

  return (
    <div 
      onClick={onClick}
      style={{
        minWidth: 130, maxWidth: 130, borderRadius: 14,
        border: '1px solid #f0f0f0', background: '#fff', flexShrink: 0,
        overflow: 'hidden', position: 'relative',
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column', cursor: onClick ? 'pointer' : 'default'
      }}>
      {/* Unit badge */}
      {unitStr && (
        <div style={{
          position: 'absolute', top: 8, left: 8, zIndex: 2,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
          borderRadius: 6, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: '#475569',
          border: '1px solid #e2e8f0',
        }}>
          {unitStr}
        </div>
      )}

      {/* Stock badge */}
      {product.stock <= 0 ? (
        <div style={{
          position: 'absolute', top: 8, right: 8, zIndex: 2,
          background: '#fee2e2', color: '#dc2626', fontSize: 8, fontWeight: 700,
          borderRadius: 5, padding: '2px 5px', border: '1px solid #fca5a5',
        }}>
          Out of Stock
        </div>
      ) : product.stock <= 5 && (
        <div style={{
          position: 'absolute', top: 8, right: 8, zIndex: 2,
          background: '#fef3c7', color: '#d97706', fontSize: 8, fontWeight: 700,
          borderRadius: 5, padding: '2px 5px', border: '1px solid #fde68a',
        }}>
          {product.stock} left
        </div>
      )}

      {/* Image area */}
      <div style={{
        height: 120, background: '#fafafa', display: 'flex', alignItems: 'center',
        justifyContent: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {product.imageUrl ? (
          product.imageUrl.startsWith('data:') ? (
            <img src={product.imageUrl} alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10 }} />
          ) : (
            <div style={{ position: 'absolute', inset: 10 }}>
              <Image src={product.imageUrl} alt={product.name} fill
                sizes="130px" style={{ objectFit: 'contain' }} unoptimized />
            </div>
          )
        ) : (
          <span style={{ fontSize: 44 }}>{catIcon}</span>
        )}

        {/* ADD / Qty button overlaid at bottom of image */}
        <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 2 }}>
          {qty > 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: accentColor, borderRadius: 8, padding: '4px 7px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}>
              <button onClick={(e) => { e.stopPropagation(); onDec(); }} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>−</button>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, minWidth: 14, textAlign: 'center' }}>{qty}</span>
              <button onClick={(e) => { e.stopPropagation(); triggerAddToCartAnimation(e); onInc(); }} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>+</button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); triggerAddToCartAnimation(e); onAdd(); }}
              style={{
                background: '#fff', border: `2px solid ${product.stock <= 0 ? '#f97316' : accentColor}`,
                color: product.stock <= 0 ? '#f97316' : accentColor, borderRadius: 8, padding: '4px 12px',
                fontSize: 12, fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
              }}
            >
              {product.stock <= 0 ? 'PRE-ORDER' : 'ADD'}
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '8px 10px 10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Delivery time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#15803d' }}>{deliverySlot}</span>
        </div>

        <p style={{
          fontSize: 11, fontWeight: 600, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {product.name}
        </p>

        <p style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: 0, marginTop: 'auto' }}>
          ₹{product.price}
        </p>
      </div>
    </div>
  );
}

// ===============================================================
// GRID PRODUCT CARD (for filtered/search view)
// ===============================================================
function ProductCard({
  product, qty, accentColor, catIcon, deliverySlot, onAdd, onInc, onDec, onClick,
}: {
  product: Product;
  qty: number;
  accentColor: string;
  catIcon: string;
  deliverySlot: string;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  onClick?: () => void;
}) {
  const unitStr = product.unit
    ? (/^\d/.test(product.unit) ? product.unit : `1 ${product.unit}`)
    : null;

  return (
    <div 
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 1px 5px rgba(0,0,0,0.04)', position: 'relative',
        cursor: onClick ? 'pointer' : 'default'
      }}>
      {product.stock <= 0 ? (
        <span style={{
          position: 'absolute', top: 7, left: 7, zIndex: 2,
          background: '#fee2e2', color: '#dc2626', fontSize: 8, fontWeight: 700,
          padding: '2px 5px', borderRadius: 4, border: '1px solid #fca5a5',
        }}>
          Out of Stock
        </span>
      ) : product.stock <= 5 && (
        <span style={{
          position: 'absolute', top: 7, left: 7, zIndex: 2,
          background: '#fef3c7', color: '#d97706', fontSize: 8, fontWeight: 700,
          padding: '2px 5px', borderRadius: 4, border: '1px solid #fde68a',
        }}>
          Only {product.stock} left
        </span>
      )}

      {/* Image */}
      <div style={{
        height: 140, background: '#fafafa', display: 'flex', alignItems: 'center',
        justifyContent: 'center', position: 'relative', overflow: 'hidden',
        borderBottom: '1px solid #f5f5f5',
      }}>
        {product.imageUrl ? (
          product.imageUrl.startsWith('data:') ? (
            <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12 }} />
          ) : (
            <div style={{ position: 'absolute', inset: 12 }}>
              <Image src={product.imageUrl} alt={product.name} fill sizes="50vw" style={{ objectFit: 'contain' }} unoptimized />
            </div>
          )
        ) : (
          <span style={{ fontSize: 46 }}>{catIcon}</span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 11px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Delivery time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#15803d' }}>{deliverySlot}</span>
        </div>

        <h4 style={{
          fontSize: 12, fontWeight: 600, color: '#0f172a', margin: '0 0 2px', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {product.name}
        </h4>
        {unitStr && (
          <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, margin: '0 0 8px' }}>{unitStr}</p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>₹{product.price}</span>

          {qty > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: accentColor, borderRadius: 9, padding: '4px 8px' }}>
              <button onClick={(e) => { e.stopPropagation(); onDec(); }} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>−</button>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, minWidth: 14, textAlign: 'center' }}>{qty}</span>
              <button onClick={(e) => { e.stopPropagation(); triggerAddToCartAnimation(e); onInc(); }} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>+</button>
            </div>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); triggerAddToCartAnimation(e); onAdd(); }}
              style={{ background: '#fff', border: `2px solid ${product.stock <= 0 ? '#f97316' : accentColor}`, color: product.stock <= 0 ? '#f97316' : accentColor, borderRadius: 9, padding: '4px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              {product.stock <= 0 ? 'PRE-ORDER' : 'ADD'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
