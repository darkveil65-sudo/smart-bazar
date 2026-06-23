'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';
import { FREE_DELIVERY_MIN, CATEGORIES } from '@smart-bazar/shared/lib/constants';
import { useLanguage } from '@smart-bazar/shared/contexts/LanguageContext';
import { pluralize } from '@smart-bazar/shared/lib/utils/string';
import EmptyState from '@smart-bazar/shared/components/ui/EmptyState';
import { couponService } from '@smart-bazar/shared/lib/services/couponService';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { Coupon } from '@smart-bazar/shared/types/firestore';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, getSubtotal, getDeliveryCharge, clearCart } = useCartStore();
  const { t } = useLanguage();
  const { addToast } = useToast();
  const { user } = useAuthStore();

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  const subtotal = getSubtotal();
  const rawDeliveryCharge = getDeliveryCharge();
  
  const isFreeDeliveryCoupon = appliedCoupon?.type === 'free_delivery';
  const deliveryCharge = isFreeDeliveryCoupon ? 0 : rawDeliveryCharge;
  
  const discount = couponDiscount;
  const total = Math.max(0, subtotal + deliveryCharge - discount);
  const freeDeliveryRemaining = FREE_DELIVERY_MIN - subtotal;
  const isDeliveryFree = deliveryCharge === 0;

  const validateAndApply = useCallback(async (code: string, showToast = true) => {
    if (!code.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setIsShaking(false);
    try {
      const coupon = await couponService.validate(code, user?.uid || '', subtotal);
      const disc = couponService.calculateDiscount(coupon, subtotal, rawDeliveryCharge);
      setAppliedCoupon(coupon);
      setCouponDiscount(disc);
      sessionStorage.setItem('applied_coupon', coupon.code);
      if (showToast) {
        addToast(`🎉 Coupon "${coupon.code}" applied!`, 'success');
      }
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon');
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      if (showToast) {
        addToast(err.message || 'Invalid coupon', 'error');
      }
    } finally {
      setCouponLoading(false);
    }
  }, [user?.uid, subtotal, rawDeliveryCharge, addToast]);

  // Load existing coupon on mount or re-validate if subtotal changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const code = sessionStorage.getItem('applied_coupon');
      if (code) {
        setCouponInput(code);
        validateAndApply(code, false);
      }
    }
  }, [validateAndApply]);

  const handleApplyCoupon = () => {
    validateAndApply(couponInput, true);
  };

  const handleSelectCoupon = (code: string) => {
    setCouponInput(code);
    validateAndApply(code, true);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponInput('');
    setCouponError('');
    sessionStorage.removeItem('applied_coupon');
    addToast('Coupon removed', 'info');
  };

  const handleClose = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/home');
    }
  };

  const getCategoryIcon = (categoryId: string) =>
    CATEGORIES.find((c) => c.id === categoryId)?.icon || '📦';
  const getCategoryColor = (categoryId: string) =>
    CATEGORIES.find((c) => c.id === categoryId)?.color || '#0d9488';

  const hasPreorderItems = items.some(item => (item.variantId ? (item.product.variants?.find(v => v.id === item.variantId)?.stock ?? item.product.stock) : item.product.stock) <= 0);

  const availableCoupons = [
    { code: 'WELCOME10', label: '10% OFF', desc: 'Up to ₹100' },
    { code: 'SMART30', label: '₹30 OFF', desc: 'Above ₹150' },
    { code: 'FREE50', label: '₹50 OFF', desc: 'Above ₹250' },
    { code: 'FREESHIP', label: 'FREE SHIP', desc: 'No min value' },
  ];

  const deliveryProgress = Math.min((subtotal / FREE_DELIVERY_MIN) * 100, 100);

  return (
    <div className="w-full font-sans px-4 py-4 md:py-8 animate-fadeIn max-w-7xl mx-auto">
      <style>{`
        @keyframes itemEntrance {
          0% { opacity: 0; transform: translateY(12px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes floatTruck {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(-3deg); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
        }
        @keyframes pulseWarning {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-muted/80 transition-colors press-effect text-foreground border border-border/30 bg-card/50"
            aria-label="Go back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-extrabold font-display tracking-tight text-foreground">{t('cart.title')}</h2>
            <p className="text-xs font-bold text-muted-foreground font-sans">
              {pluralize(items.length, t('cart.item'), t('cart.items'))}
            </p>
          </div>
        </div>
        
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs font-bold font-display text-destructive hover:bg-destructive/5 px-3 py-2 rounded-xl border border-destructive/25 transition-all press-effect"
          >
            {t('cart.removeAll')}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fadeIn">
          <EmptyState
            type="cart"
            title={t('cart.empty')}
            description={t('cart.emptySubtitle')}
            action={{
              label: t('cart.shopNow'),
              onClick: handleClose,
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col md:grid md:grid-cols-12 md:gap-8 items-start">
          {/* Left Side: Items & Alerts (8 cols on desktop) */}
          <div className="w-full md:col-span-8 space-y-5">
            {/* Delivery Fee Progress Alert */}
            <div className="relative overflow-hidden p-4 rounded-2xl border border-border/40 bg-card/60 dark:bg-card/40 backdrop-blur-md shadow-sm">
              {!isDeliveryFree ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
                      </span>
                      <p className="text-xs font-black font-display text-foreground">Delivery Status</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning" style={{ animation: 'pulseWarning 2s infinite' }}>
                      ₹{deliveryCharge} delivery charge
                    </span>
                  </div>

                  <p className="text-[11px] font-bold text-muted-foreground leading-snug">
                    Add <span className="text-warning font-extrabold">₹{freeDeliveryRemaining}</span> more to unlock <span className="text-success font-extrabold">FREE shipping</span>!
                  </p>

                  {/* Progress Bar Container */}
                  <div className="relative mt-4 mb-2 h-2.5 bg-muted/80 dark:bg-muted/30 rounded-full overflow-visible">
                    {/* Active Progress */}
                    <div
                      className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-warning to-success"
                      style={{ width: `${deliveryProgress}%` }}
                    />
                    
                    {/* Moving Truck Emoji */}
                    <div
                      className="absolute -top-2 w-7 h-7 flex items-center justify-center text-lg select-none pointer-events-none transition-all duration-700"
                      style={{
                        left: `${deliveryProgress}%`,
                        transform: 'translateX(-50%)',
                        animation: 'floatTruck 1.5s ease-in-out infinite'
                      }}
                    >
                      🚚
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center text-xl shrink-0" style={{ animation: 'pulseGlow 2.5s infinite' }}>
                    {isFreeDeliveryCoupon ? '🏷️' : '🎉'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black font-display text-success">
                      {isFreeDeliveryCoupon ? 'Free Shipping Coupon Applied!' : 'Free Delivery Unlocked!'}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-0.5 leading-snug">
                      {isFreeDeliveryCoupon 
                        ? `Promo code waived your ₹${rawDeliveryCharge} delivery charge` 
                        : 'Your shipping charge is waived on this order'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Pre-order warning */}
            {hasPreorderItems && (
              <div 
                className="rounded-2xl p-3 flex gap-2.5 items-start border shadow-sm"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))', 
                  borderColor: 'rgba(245,158,11,0.25)' 
                }}
              >
                <span className="text-lg shrink-0">⭐</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black font-display text-warning">Pre-Order Items Alert</p>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 leading-relaxed">
                    Contains out-of-stock items. Manager will confirm delivery date.
                  </p>
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase px-1">Items in Cart</p>
              {items.map((item, idx) => {
                const catIcon = getCategoryIcon(item.product?.category || '');
                const catColor = getCategoryColor(item.product?.category || '');
                const stockLeft = item.variantId 
                  ? (item.product.variants?.find(v => v.id === item.variantId)?.stock ?? item.product.stock)
                  : item.product.stock;
                const isPreorderItem = stockLeft <= 0;

                return (
                  <div
                    key={item.product?.id ? `${item.product.id}-${item.variantId || 'base'}` : idx}
                    className="flex items-center gap-3 bg-card/50 dark:bg-card/30 backdrop-blur-sm rounded-2xl border border-border/40 p-4 shadow-sm hover:border-border/80 hover:bg-card/75 dark:hover:bg-card/50 transition-all duration-300 animate-fadeIn"
                    style={{ 
                      animation: 'itemEntrance 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                      animationDelay: `${idx * 0.04}s`,
                      opacity: 0
                    }}
                  >
                    {/* Product image/icon */}
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-xl shrink-0 overflow-hidden relative"
                      style={{ background: `${catColor}12` }}
                    >
                      {item.product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        catIcon
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-extrabold font-display text-foreground truncate">{item.product.name}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-extrabold text-primary">
                          ₹{item.variantPrice ?? item.product.price}
                        </span>
                        {item.variantName && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-muted/60 text-muted-foreground">
                            {item.variantName}
                          </span>
                        )}
                        {isPreorderItem && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-warning/10 text-warning border border-warning/20">
                            PRE-ORDER
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Controls & Remove */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-muted/80 dark:bg-muted/20 rounded-xl p-0.5 border border-border/20">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variantId)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold hover:bg-card hover:text-foreground transition-all press-effect text-foreground"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variantId)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold hover:bg-card hover:text-foreground transition-all press-effect text-foreground"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.product.id, item.variantId)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl transition-colors press-effect border border-border/20 bg-card/40"
                        aria-label="Remove item"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 3h12M4 3V2a1 1 0 011-1h4a1 1 0 011 1v1m2 0v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Summary & Coupon (4 cols on desktop) */}
          <div className="w-full md:col-span-4 space-y-5 mt-6 md:mt-0 md:sticky md:top-24">
            {/* Promo Coupon Card */}
            <div className="bg-card/60 dark:bg-card/40 border border-border/40 backdrop-blur-md rounded-2xl p-4 shadow-sm space-y-3">
              <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase px-1">Promo Coupon</p>
              
              {/* Coupon Input Box */}
              <div className={`flex gap-2 ${isShaking ? 'animate-shake' : ''}`}>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-sm select-none text-muted-foreground">
                    {appliedCoupon ? '✅' : '🏷️'}
                  </span>
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      setCouponError('');
                    }}
                    placeholder="Enter code (e.g. WELCOME10)"
                    className={`w-full bg-muted/50 dark:bg-muted/15 border ${
                      couponError 
                        ? 'border-destructive/60 focus:border-destructive/80 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]' 
                        : appliedCoupon 
                        ? 'border-success/60 focus:border-success/80 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]' 
                        : 'border-border/40 focus:border-primary/80 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
                    } rounded-xl pl-8 pr-3 py-2 text-xs font-semibold outline-none transition-all text-foreground placeholder:text-muted-foreground`}
                  />
                </div>
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  className="px-4 rounded-xl text-white font-bold text-xs bg-primary hover:bg-primary/90 disabled:bg-muted/50 disabled:text-muted-foreground/60 transition-colors press-effect shrink-0"
                >
                  {couponLoading ? '...' : 'Apply'}
                </button>
              </div>

              {/* Coupon selection quick pills */}
              {!appliedCoupon && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground">Tap to apply:</p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {availableCoupons.map((coupon) => (
                      <button
                        key={coupon.code}
                        onClick={() => handleSelectCoupon(coupon.code)}
                        className="shrink-0 border border-dashed border-border/80 hover:border-primary hover:bg-primary/5 rounded-lg px-2.5 py-1.5 text-left transition-all press-effect bg-muted/30 dark:bg-muted/10 font-sans"
                      >
                        <div className="text-[9px] font-black font-display text-foreground tracking-wider">{coupon.code}</div>
                        <div className="text-[8px] text-muted-foreground font-semibold mt-0.5">{coupon.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error message */}
              {couponError && (
                <p className="text-[10px] font-bold text-destructive px-1">{couponError}</p>
              )}

              {/* Applied coupon details */}
              {appliedCoupon && (
                <div 
                  className="flex items-center justify-between p-3 rounded-xl border border-dashed border-success/40 bg-success/5 shadow-sm"
                  style={{ animation: 'itemEntrance 0.3s ease-out' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base select-none">🎉</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-success tracking-wide">{appliedCoupon.code}</span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-success/20 text-success uppercase">Applied</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground font-bold mt-0.5">
                        {appliedCoupon.description || couponService.describeDiscount(appliedCoupon)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="p-1 rounded-lg hover:bg-success/15 text-success transition-all press-effect shrink-0"
                    aria-label="Remove coupon"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 1l12 12M13 1L1 13" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Summary & Checkout Card */}
            <div className="bg-card/90 dark:bg-card/85 border border-border/40 backdrop-blur-lg p-5 rounded-2xl shadow-md space-y-4">
              <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase px-1">Order Summary</p>
              
              <div className="space-y-2.5 text-xs font-semibold">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>{t('cart.subtotal')}</span>
                  <span className="text-foreground">₹{subtotal}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>{t('cart.deliveryFee')}</span>
                  {deliveryCharge === 0 ? (
                    <span className="text-success font-black">🎉 {t('cart.free')}</span>
                  ) : (
                    <span className="text-foreground">₹{deliveryCharge}</span>
                  )}
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center text-success font-bold">
                    <span>Coupon Discount</span>
                    <span>−₹{discount}</span>
                  </div>
                )}
                
                <div className="border-t border-border/40 pt-3.5 flex justify-between items-center text-sm">
                  <span className="font-extrabold font-display text-foreground">{t('cart.totalAmount')}</span>
                  <span className="font-black text-primary text-base">₹{total}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={() => {
                  if (appliedCoupon) {
                    sessionStorage.setItem('applied_coupon', appliedCoupon.code);
                    router.push(`/checkout?coupon=${appliedCoupon.code}`);
                  } else {
                    router.push('/checkout');
                  }
                }}
                className="w-full py-3.5 rounded-xl text-white font-extrabold font-display text-xs tracking-wide uppercase transition-all press-effect shadow-md"
                style={{ 
                  background: 'linear-gradient(135deg, #0d9488, #14b8a6)', 
                  boxShadow: '0 6px 20px rgba(13,148,136,0.25)' 
                }}
              >
                Checkout (₹{total})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
