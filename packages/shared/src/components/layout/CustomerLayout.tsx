'use client';

import { FC, ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';
import { useAppConfig } from '@smart-bazar/shared/contexts/AppConfigContext';
import { useLanguage } from '@smart-bazar/shared/contexts/LanguageContext';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { Product } from '@smart-bazar/shared/types/firestore';
import type { Lang } from '@smart-bazar/shared/lib/i18n/translations';
import { NotificationBell } from '../NotificationBell';
// AnimatedBackground is injected via children slot — see note below
// import AnimatedBackground from '@customer/components/AnimatedBackground';

interface CustomerLayoutProps { children: ReactNode; }

/* --- Language config ---------------------------------------------------- */
const LANGS: { code: Lang; label: string }[] = [
  { code: 'en',       label: 'EN'  },
  { code: 'banglish', label: 'BN' },
  { code: 'bn',       label: 'বাং' },
];

/* --- Nav items (dynamic labels via t()) ---------------------------------- */
const NAV_ICONS = [
  {
    key: 'nav.home',
    href: '/home',
    iconClass: 'nav-icon-home',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    key: 'nav.shop',
    href: '/category',
    iconClass: 'nav-icon-shop',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    key: 'nav.cart',
    href: '/cart',
    iconClass: 'nav-icon-cart',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
      </svg>
    ),
  },
  {
    key: 'nav.orders',
    href: '/orders',
    iconClass: 'nav-icon-orders',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    key: 'nav.profile',
    href: '/profile',
    iconClass: 'nav-icon-profile',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

/* --- Offer keys ---------------------------------------------------------- */
const OFFER_KEYS = ['offer.1', 'offer.2', 'offer.3', 'offer.4', 'offer.5'];

/* ===========================================================================
   CUSTOMER LAYOUT
   =========================================================================== */
const CustomerLayout: FC<CustomerLayoutProps> = ({ children }) => {
  const { lang, setLang, t } = useLanguage();
  const router   = useRouter();
  const pathname = usePathname();
  const { userData, initialized } = useAuthStore();
  const itemCount = useCartStore((s) => s.getItemCount());
  const { addItem, items, updateQuantity } = useCartStore();
  const { config, getDeliverySlot: getLiveSlot, loading: configLoading } = useAppConfig();

  const [scrolled, setScrolled] = useState(false);
  const [tickerIdx, setTickerIdx]   = useState(0);
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [animateCart, setAnimateCart] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Set mounted on client and check window width
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    setMounted(true);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global search states
  const [globalProducts, setGlobalProducts] = useState<Product[]>([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  const [globalSortBy, setGlobalSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [globalFilterAvailability, setGlobalFilterAvailability] = useState(false);

  useEffect(() => {
    if (!globalSearchQuery.trim()) {
      setDebouncedSearchQuery('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(globalSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [globalSearchQuery]);

  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setGlobalProducts([]);
      return;
    }
    const unsub = productService.subscribeToProducts((allProds) => {
      setGlobalProducts(allProds);
    });
    return () => unsub();
  }, [debouncedSearchQuery]);

  const getQty = (pid: string) => items.find((i) => i.product.id === pid)?.quantity ?? 0;

  const filteredGlobalProducts = (() => {
    let list = [...globalProducts];
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }
    if (globalFilterAvailability) {
      list = list.filter((p) => p.stock > 0);
    }
    if (globalSortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (globalSortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    }
    return list;
  })();

  /* cart bounce listener */
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleCartBounce = () => {
      setAnimateCart(false);
      requestAnimationFrame(() => {
        setAnimateCart(true);
        timer = setTimeout(() => setAnimateCart(false), 500);
      });
    };
    window.addEventListener('cart-bounce', handleCartBounce);
    return () => {
      window.removeEventListener('cart-bounce', handleCartBounce);
      clearTimeout(timer);
    };
  }, []);

  /* theme sync listener */
  useEffect(() => {
    const syncTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' || 'light';
      setTheme(currentTheme);
    };
    window.addEventListener('theme-change', syncTheme);
    syncTheme();
    return () => window.removeEventListener('theme-change', syncTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('smart-bazar-theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    window.dispatchEvent(new Event('theme-change'));
  };

  const handleCycleLang = () => {
    const currentIndex = LANGS.findIndex((l) => l.code === lang);
    const nextIndex = (currentIndex + 1) % LANGS.length;
    setLang(LANGS[nextIndex].code);
  };


  /* real-time active orders count for badge */
  useEffect(() => {
    if (!userData?.id) return;
    const unsub = orderService.subscribeToOrdersByCustomer(userData.id, (orders) => {
      const count = orders.filter(
        (o) => !['completed', 'cancelled'].includes(o.status)
      ).length;
      setActiveOrderCount(count);
    });
    return () => unsub();
  }, [userData?.id]);

  /* scroll shadow on header */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* rotating offer ticker */
  useEffect(() => {
    const timer = setInterval(() => setTickerIdx(i => (i + 1) % OFFER_KEYS.length), 3500);
    return () => clearInterval(timer);
  }, []);

  /* auth guard */
  useEffect(() => {
    if (initialized && !userData) router.push('/');
  }, [userData, initialized, router]);

  if (!mounted || !initialized) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', flexDirection: 'column', gap: 16 }}>
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <div style={{ width: 56, height: 56, border: '3px solid #e8fff1', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 12, background: 'var(--primary)', borderRadius: '50%', opacity: 0.15 }} />
      </div>
      <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{t('toast.loading')}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  /* maintenance mode */
  if (!configLoading && config.maintenanceMode) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0a1628,#0d2137)', color: '#fff', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: 72, marginBottom: 24, animation: 'bounceSubtle 2s ease-in-out infinite' }}>🔧</div>
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, fontFamily: 'var(--font-display)' }}>{config.businessName}</h1>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>{t('maintenance.title')}</h2>
      <p style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 320, lineHeight: 1.7, fontSize: 14 }}>{config.maintenanceMessage}</p>
      <p style={{ marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{t('maintenance.back')}</p>
    </div>
  );

  if (!userData) return null;

  return (
    <div style={{ minHeight: '100dvh', background: 'transparent', position: 'relative' }} className={lang === 'bn' ? 'font-hind-siliguri' : ''}>

      {/* === HEADER =================================================== */}
      <header
        className="glass-header"
        style={{
          position: 'sticky', top: 0, zIndex: 30,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: theme === 'dark' ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(16, 185, 129, 0.08)',
          boxShadow: scrolled
            ? (theme === 'dark' ? '0 10px 30px -10px rgba(0, 0, 0, 0.5)' : '0 10px 30px -10px rgba(16, 185, 129, 0.12)')
            : 'none',
        }}
      >
        {/* -- Offer ticker bar --------------------------------------- */}
        <div style={{
          background: 'linear-gradient(90deg, #00a045, #00c853, #00a045)',
          backgroundSize: '200% 100%',
          animation: 'gradientShift 6s ease infinite',
          padding: '5px 16px',
          overflow: 'hidden',
        }}>
          <div className="w-full max-w-[430px] md:max-w-7xl mx-auto" style={{ textAlign: 'center' }}>
            <p
              key={tickerIdx}
              style={{
                fontSize: 11, fontWeight: 700, color: '#fff', margin: 0,
                animation: 'fadeInUp 0.4s ease-out',
                letterSpacing: '0.02em',
              }}
            >
              {t(OFFER_KEYS[tickerIdx])}
            </p>
          </div>
        </div>

        {/* -- Main header row ---------------------------------------- */}
        <div className="w-full max-w-[430px] md:max-w-7xl mx-auto px-4 md:px-8 py-2 md:py-3 flex items-center justify-between gap-3 md:gap-12">

          {/* Logo, Brand + Location Selector Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Logo orb */}
            <div style={{
              width: 38, height: 38, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <span style={{ fontSize: 20 }}>🛒</span>
            </div>

            {/* Brand + Location Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.02em'
                }}>
                  {config.businessName || 'Smart Bazar'}
                </span>
                
                {/* Live delivery pulse */}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '1.5px 5px',
                  borderRadius: 5,
                  background: 'rgba(16, 185, 129, 0.08)',
                  fontSize: 8.5,
                  fontWeight: 800,
                  color: '#10b981',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                }}>
                  <span style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: '#10b981',
                    animation: 'pingPulse 1.5s ease-out infinite',
                  }} />
                  {getLiveSlot()}
                </span>
              </div>

              {/* Interactive Location Badge */}
              <div 
                className="location-badge"
                title="Change location"
              >
                {/* Emerald pin icon */}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: '#10b981',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2
                }}>
                  Home - Sector 62, Noida
                </span>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>

          {/* Desktop Top Navigation Links */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {NAV_ICONS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 text-sm font-bold transition-all duration-200 hover:text-emerald-500"
                  style={{
                    color: active ? 'var(--primary)' : 'var(--foreground)',
                  }}
                >
                  <span className="flex-shrink-0" style={{ transform: active ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.2s' }}>
                    {item.icon}
                  </span>
                  <span style={{ fontFamily: lang === 'bn' ? 'var(--font-hind-siliguri), sans-serif' : 'inherit' }}>
                    {t(item.key)}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Language Switcher */}
            {/* Desktop: Full selector */}
            {!isMobile && (
              <div className="hidden md:flex" style={{ gap: 2, background: 'var(--border-light)', borderRadius: 10, padding: '3px' }}>
                {LANGS.map(({ code, label }) => (
                  <button key={code} onClick={() => setLang(code)}
                    style={{
                      padding: '3px 7px', borderRadius: 7, border: 'none', cursor: 'pointer',
                      fontSize: code === 'bn' ? 11 : 10,
                      fontWeight: 700,
                      fontFamily: code === 'bn' ? 'var(--font-hind-siliguri), sans-serif' : 'inherit',
                      background: lang === code ? 'var(--card)' : 'transparent',
                      color: lang === code ? 'var(--primary-dark)' : 'var(--muted-foreground)',
                      boxShadow: lang === code ? 'var(--shadow-xs)' : 'none',
                      transition: 'all 0.2s',
                      lineHeight: 1.4,
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {/* Mobile: Cycle button */}
            {isMobile && (
              <div className="md:hidden">
                <button
                  onClick={handleCycleLang}
                  className="press-effect flex items-center justify-center"
                  style={{
                    width: 38, height: 38, borderRadius: 12, border: 'none',
                    background: 'rgba(0,200,83,0.08)',
                    cursor: 'pointer', transition: 'all 0.2s',
                    color: 'var(--foreground)',
                    fontSize: lang === 'bn' ? 12 : 11,
                    fontWeight: 800,
                    fontFamily: lang === 'bn' ? 'var(--font-hind-siliguri), sans-serif' : 'inherit',
                  }}
                  title="Change Language"
                >
                  {LANGS.find((l) => l.code === lang)?.label || 'EN'}
                </button>
              </div>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="press-effect hidden md:flex items-center justify-center"
              style={{
                width: 38, height: 38, borderRadius: 12, border: 'none',
                background: 'rgba(0,200,83,0.08)',
                cursor: 'pointer', transition: 'all 0.2s',
                color: 'var(--foreground)',
              }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>

            {/* Notification bell */}
            <NotificationBell />

            {/* Cart */}
            <button
              onClick={() => router.push('/cart')}
              className="press-effect cart-nav-btn hidden md:flex items-center justify-center"
              style={{
                width: 38, height: 38, borderRadius: 12, border: 'none',
                background: itemCount > 0
                  ? 'linear-gradient(135deg, #00a045, #00c853)'
                  : 'rgba(0,200,83,0.08)',
                cursor: 'pointer', position: 'relative',
                transition: 'all 0.2s',
                boxShadow: itemCount > 0 ? '0 4px 14px rgba(0,200,83,0.35)' : 'none',
                animation: animateCart ? 'cartPop 0.5s ease-out' : 'none',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke={itemCount > 0 ? '#fff' : 'var(--foreground)'} strokeWidth="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
              </svg>
              {itemCount > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  minWidth: 19, height: 19, padding: '0 4px',
                  background: '#ff5252', color: '#fff',
                  fontSize: 10, fontWeight: 800, borderRadius: 999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--card)',
                  animation: 'scaleInBounce 0.4s ease-out',
                }}>
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* -- Search row --------------------------------------------- */}
        {pathname !== '/home' && (
          <div className="w-full max-w-[430px] md:max-w-3xl mx-auto px-4 md:px-8 pb-2.5">
            <div className="premium-search-pill">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search for products..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  color: 'var(--foreground)',
                  fontWeight: 500,
                }}
              />
              {globalSearchQuery && (
                <button 
                  onClick={() => { setGlobalSearchQuery(''); }} 
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 0,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* === GLOBAL SEARCH OVERLAY ================================== */}
      {globalSearchQuery.trim() !== '' && (
        <div 
          className="w-full max-w-[430px] md:max-w-5xl"
          style={{
            position: 'fixed',
            top: 'calc(126px + env(safe-area-inset-top, 0px))',
            bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            background: 'var(--background)',
            zIndex: 45,
            overflowY: 'auto',
            padding: '16px 16px 24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}
        >
          {/* Header info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)', fontWeight: 600, margin: 0 }}>
              Search results: <span style={{ color: 'var(--foreground)', fontWeight: 800 }}>{filteredGlobalProducts.length}</span> items
            </p>
            <button
              onClick={() => { setGlobalSearchQuery(''); }}
              style={{ background: 'none', border: 'none', color: '#ff5252', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Close ✕
            </button>
          </div>

          {/* Sorting and Availability Row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--border-light)', borderRadius: 10, padding: '6px 12px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)' }}>Sort:</span>
              <select
                value={globalSortBy}
                onChange={(e) => setGlobalSortBy(e.target.value as any)}
                style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, fontWeight: 700, color: 'var(--foreground)', cursor: 'pointer' }}
              >
                <option value="default">Relevance</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>

            <button
              onClick={() => setGlobalFilterAvailability(!globalFilterAvailability)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: globalFilterAvailability ? 'rgba(0,200,83,0.1)' : 'var(--border-light)',
                border: globalFilterAvailability ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                borderRadius: 10, padding: '6px 12px',
                fontSize: 12, fontWeight: 700,
                color: globalFilterAvailability ? 'var(--primary)' : 'var(--muted-foreground)',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              <span>🟢 In Stock</span>
            </button>
          </div>

          {/* Product grid */}
          {globalSearchQuery !== debouncedSearchQuery ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted-foreground)' }}>
              <div style={{ margin: '0 auto 12px', width: 28, height: 28, border: '2.5px solid #e8fff1', borderTop: '2.5px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--foreground)', marginBottom: 4 }}>Searching...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : filteredGlobalProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted-foreground)' }}>
              <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🔍</span>
              <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--foreground)', marginBottom: 4 }}>No products found</p>
              <p style={{ fontSize: 13 }}>Try another search term or remove filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filteredGlobalProducts.map((p) => {
                const qty = getQty(p.id);
                const unitStr = p.unit ? (/^\d/.test(p.unit) ? p.unit : `1 ${p.unit}`) : null;
                const isOutOfStock = p.stock <= 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setGlobalSearchQuery('');
                      router.push(`/product/${p.id}`);
                    }}
                    style={{
                      background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border-light)',
                      overflow: 'hidden', display: 'flex', flexDirection: 'column',
                      boxShadow: '0 1px 5px rgba(0,0,0,0.04)', position: 'relative',
                      cursor: 'pointer'
                    }}>
                    {isOutOfStock && (
                      <span style={{
                        position: 'absolute', top: 7, left: 7, zIndex: 2,
                        background: '#fee2e2', color: '#dc2626', fontSize: 8, fontWeight: 700,
                        padding: '2px 5px', borderRadius: 4, border: '1px solid #fca5a5',
                      }}>
                        Out of Stock
                      </span>
                    )}

                    {/* Image */}
                    <div style={{
                      height: 120, background: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', position: 'relative', overflow: 'hidden',
                      borderBottom: '1px solid var(--border-light)',
                    }}>
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                      ) : (
                        <span style={{ fontSize: 36 }}>📦</span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <h4 style={{
                        fontSize: 12, fontWeight: 600, color: 'var(--foreground)', margin: '0 0 2px', lineHeight: 1.4,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {p.name}
                      </h4>
                      {unitStr && (
                        <p style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, margin: '0 0 8px' }}>{unitStr}</p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>₹{p.price}</span>

                        {qty > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#00c853', borderRadius: 8, padding: '4px 6px' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, qty - 1); }}
                              style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', padding: 0, lineHeight: 1 }}>−</button>
                            <span style={{ color: '#fff', fontWeight: 700, fontSize: 11, minWidth: 12, textAlign: 'center' }}>{qty}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, qty + 1); }}
                              style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', padding: 0, lineHeight: 1 }}>+</button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); addItem(p); }}
                            style={{
                              background: '#fff', border: `2px solid ${isOutOfStock ? '#f97316' : '#00c853'}`,
                              color: isOutOfStock ? '#f97316' : '#00c853', borderRadius: 8,
                              padding: '4px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer'
                            }}
                          >
                            {isOutOfStock ? 'PRE-ORDER' : 'ADD'}
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
      )}

      {/* === MAIN CONTENT ============================================ */}
      <main
        className="w-full max-w-[430px] md:max-w-7xl mx-auto md:px-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-12 pt-0 md:pt-6"
        style={{
          position: 'relative', zIndex: 1,
          animation: 'fadeIn 0.35s ease-out',
        }}
      >
        {children}
      </main>

      {/* === BOTTOM NAVIGATION ======================================= */}
      <nav
        className="glass-nav md:hidden"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div style={{
          maxWidth: 430, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '6px 4px 2px',
        }}>
          {NAV_ICONS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`glass-nav-item ${active ? 'active' : ''}`}
              >
                {/* Glow background behind icon */}
                {active && (
                  <div style={{
                    position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
                    width: 36, height: 36, borderRadius: 10,
                    background: 'radial-gradient(circle, rgba(0,200,83,0.18) 0%, transparent 70%)',
                    animation: 'navGlow 3s ease-in-out infinite',
                  }} />
                )}
                {/* Active indicator pill at top */}
                {active && (
                  <span style={{
                    position: 'absolute', top: 0, left: '50%',
                    transform: 'translateX(-50%)',
                    width: 24, height: 3,
                    background: 'linear-gradient(90deg, #00a045, #00c853)',
                    borderRadius: '0 0 6px 6px',
                    animation: 'badgePop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
                  }} />
                )}
                {/* Icon */}
                <div 
                  className={item.iconClass}
                  style={{
                    position: 'relative', width: 24, height: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.2s ease',
                    animation: (item.href === '/cart' && animateCart) ? 'cartPop 0.5s ease-out' : 'none',
                  }}
                >
                  {item.icon}
                  {/* Cart badge */}
                  {item.href === '/cart' && itemCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -7, right: -9,
                      minWidth: 17, height: 17, padding: '0 3px',
                      background: '#ff5252', color: '#fff',
                      fontSize: 9, fontWeight: 800, borderRadius: 999,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1.5px solid #fff',
                    }}>
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                  {/* Active orders badge */}
                  {item.href === '/orders' && activeOrderCount > 0 && (
                    <span style={{
                      position: 'absolute', top: -7, right: -9,
                      minWidth: 17, height: 17, padding: '0 3px',
                      background: '#f59e0b', color: '#fff',
                      fontSize: 9, fontWeight: 800, borderRadius: 999,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1.5px solid #fff',
                      animation: 'scaleInBounce 0.4s ease-out',
                    }}>
                      {activeOrderCount > 9 ? '9+' : activeOrderCount}
                    </span>
                  )}
                </div>
                {/* Label */}
                <span style={{
                  fontSize: lang === 'bn' ? 9 : 10,
                  fontWeight: active ? 800 : 500,
                  letterSpacing: 0.1,
                  fontFamily: lang === 'bn' ? 'var(--font-hind-siliguri), sans-serif' : 'inherit',
                  background: active ? 'linear-gradient(135deg, #00a045, #00c853)' : 'none',
                  WebkitBackgroundClip: active ? 'text' : undefined,
                  WebkitTextFillColor: active ? 'transparent' : undefined,
                }}>
                  {t(item.key)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default CustomerLayout;
