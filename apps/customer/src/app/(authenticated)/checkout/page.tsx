'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';
import { useAuthStore } from '@smart-bazar/shared/stores/authStore';
import { useAppConfig } from '@smart-bazar/shared/contexts/AppConfigContext';
import { orderService } from '@smart-bazar/shared/lib/services/orderService';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { userService } from '@smart-bazar/shared/lib/services/userService';
import { couponService } from '@smart-bazar/shared/lib/services/couponService';
import { useToast } from '@smart-bazar/shared/contexts/ui/ToastContext';
import { Coupon } from '@smart-bazar/shared/types/firestore';
import EmptyState from '@smart-bazar/shared/components/ui/EmptyState';
import { uploadToCloudinary } from '@smart-bazar/shared/lib/services/cloudinaryService';

interface DeliveryAddress {
  customerName: string;
  mobile: string;
  area: string;
  para: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

const paymentMethods = [
  { id: 'cod', label: 'Cash on Delivery', icon: '💵', desc: 'Pay when we deliver' },
  { id: 'upi', label: 'UPI / Wallet', icon: '📱', desc: 'PhonePe, GPay, Paytm' },
];

const CopyIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const GPayLogo = () => (
  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-border/80 shadow-sm select-none">
    <span className="font-extrabold text-xs tracking-tight">
      <span className="text-blue-500">G</span>
      <span className="text-red-500">o</span>
      <span className="text-yellow-500">o</span>
      <span className="text-blue-500">g</span>
      <span className="text-green-500">l</span>
      <span className="text-red-500">e</span>
      <span className="text-slate-700 dark:text-slate-300 ml-1">Pay</span>
    </span>
  </div>
);

const UpiLogo = () => (
  <div className="flex items-center bg-[#0f8a5f]/10 dark:bg-[#0f8a5f]/20 px-2.5 py-1 rounded-full border border-[#0f8a5f]/30 select-none">
    <span className="text-[#0f8a5f] dark:text-[#12b07b] text-[10px] font-black tracking-widest italic">UPI</span>
  </div>
);

const UploadCloudIcon = () => (
  <svg className="w-7 h-7 text-primary mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);


export default function CheckoutPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { config, getDeliverySlot: getLiveSlot } = useAppConfig();
  const { items, getSubtotal, getDeliveryCharge, clearCart } = useCartStore();
  const { user, userData } = useAuthStore();
  const subtotal = getSubtotal();

  const freeMin   = config.freeDeliveryMin;
  const charge    = config.deliveryCharge;
  const minOrder  = config.minOrderValue;
  const areas     = config.deliveryAreas || [];

  // Fresh addresses from Firestore (not stale localStorage cache)
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>(
    (userData?.addresses as DeliveryAddress[]) || []
  );
  const [addrLoading, setAddrLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) { setAddrLoading(false); return; }
    userService.getUser(user.uid).then(fresh => {
      const addrs = (fresh?.addresses as DeliveryAddress[]) || [];
      setSavedAddresses(addrs);
      if (addrs.length > 0) { setSelectedIdx(0); setUseNew(false); }
      else setUseNew(true);
    }).catch(() => {}).finally(() => setAddrLoading(false));
  }, [user?.uid]);

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [useNew, setUseNew] = useState(true);
  const [newAddr, setNewAddr] = useState<DeliveryAddress>({
    customerName: userData?.name || '',
    mobile: userData?.phone || '',
    area: '',
    para: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [upiTxId, setUpiTxId] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const handleCopyUpi = () => {
    const upiId = config?.merchantUpiId || 'smartbazar@upi';
    navigator.clipboard.writeText(upiId).then(() => {
      setCopiedUpi(true);
      addToast('UPI ID copied! 📋', 'success');
      setTimeout(() => setCopiedUpi(false), 2000);
    });
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(Math.round(total).toString()).then(() => {
      setCopiedAmount(true);
      addToast('Amount copied! 📋', 'success');
      setTimeout(() => setCopiedAmount(false), 2000);
    });
  };

  useEffect(() => {
    if (userData) {
      setNewAddr(prev => ({
        ...prev,
        customerName: prev.customerName || userData.name || '',
        mobile: prev.mobile || userData.phone || '',
      }));
    }
  }, [userData]);

  interface PriceDifference {
    productId: string;
    variantId?: string;
    name: string;
    oldPrice: number;
    newPrice: number;
  }
  const [priceDifferences, setPriceDifferences] = useState<PriceDifference[]>([]);
  const [pendingItems, setPendingItems] = useState<any[]>([]);

  /* -- Coupon state -- */
  const [couponCode, setCouponCode]     = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError]   = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Auto-apply coupon from URL query param or sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const codeFromUrl = searchParams.get('coupon') || sessionStorage.getItem('applied_coupon');
      if (codeFromUrl && !appliedCoupon) {
        setCouponCode(codeFromUrl);
        setCouponLoading(true);
        setCouponError('');
        couponService.validate(codeFromUrl, user?.uid || '', subtotal)
          .then(coupon => {
            const disc = couponService.calculateDiscount(coupon, subtotal, getDeliveryCharge(freeMin, charge));
            setAppliedCoupon(coupon);
            setCouponDiscount(disc);
            addToast(`🎉 ${couponService.describeDiscount(coupon)} applied!`, 'success');
            // Clear sessionStorage so it doesn't auto-apply next time if deleted
            sessionStorage.removeItem('applied_coupon');
          })
          .catch(err => {
            setCouponError(err.message || 'Invalid coupon');
            setAppliedCoupon(null);
            setCouponDiscount(0);
          })
          .finally(() => {
            setCouponLoading(false);
          });
      }
    }
  }, [user?.uid, subtotal, freeMin, charge, addToast, appliedCoupon, getDeliveryCharge]);


  const deliveryCharge = appliedCoupon?.type === 'free_delivery'
    ? 0
    : getDeliveryCharge(freeMin, charge);
  const discount       = couponDiscount;
  const total          = subtotal + deliveryCharge - discount;

  /* -- Apply coupon -- */
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const coupon = await couponService.validate(couponCode, user?.uid || '', subtotal);
      const disc = couponService.calculateDiscount(coupon, subtotal, getDeliveryCharge(freeMin, charge));
      setAppliedCoupon(coupon);
      setCouponDiscount(disc);
      addToast(`🎉 ${couponService.describeDiscount(coupon)} applied!`, 'success');
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon');
      setAppliedCoupon(null);
      setCouponDiscount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode('');
    setCouponError('');
  };

  const activeAddress: DeliveryAddress | null =
    useNew ? newAddr : (selectedIdx !== null ? savedAddresses[selectedIdx] : null);

  /* --- Empty cart --- */
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-fadeIn">
        <EmptyState
          type="cart"
          title="Cart is empty"
          description="Browse our items and add them to your cart to checkout."
          action={{
            label: "Browse Products",
            onClick: () => router.push('/home'),
          }}
        />
      </div>
    );
  }

  /* --- Place Order --- */
  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      addToast('Your cart is empty', 'error');
      return;
    }
    if (!activeAddress?.customerName?.trim() || !activeAddress?.mobile?.trim() || !activeAddress?.area) {
      addToast('Please fill delivery address', 'error');
      return;
    }
    if (useNew && (!newAddr.street?.trim() || !newAddr.city?.trim())) {
      addToast('Please fill Street Address and City', 'error');
      return;
    }
    if (!/^[0-9]{10,11}$/.test(activeAddress.mobile.replace(/\s/g, ''))) {
      addToast('Enter a valid 10–11 digit mobile number', 'error');
      return;
    }
    if (!user) { addToast('Please login to place order', 'error'); return; }

    if (paymentMethod === 'upi') {
      if (!upiTxId.trim() && !paymentProofFile) {
        addToast('Please enter UPI Transaction ID or upload a payment screenshot', 'error');
        return;
      }
      if (upiTxId.trim() && !/^\d{12}$/.test(upiTxId.trim())) {
        addToast('UPI Transaction ID must be a 12-digit numeric number', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      let uploadedImageUrl = '';
      if (paymentMethod === 'upi' && paymentProofFile) {
        uploadedImageUrl = await uploadToCloudinary(paymentProofFile);
      }

      let priceMismatch = false;
      let availabilityIssue = false;
      const tempPriceDifferences: PriceDifference[] = [];
      const updatedItems = [...items];
      const verifiedItems = [];
      let verifiedSubtotal = 0;
      let isPreorder = false;

      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        if (!item || !item.product || !item.product.id) {
          availabilityIssue = true;
          updatedItems.splice(i, 1);
          i--;
          continue;
        }
        const p = await productService.getProduct(item.product.id);
        
        // 1. Check Availability
        if (!p || !p.isAvailable) {
          availabilityIssue = true;
          addToast(`"${item.product?.name || 'Item'}" is no longer available and has been removed from your cart.`, 'error');
          updatedItems.splice(i, 1);
          i--;
          continue;
        }

        // 2. Check Price Mismatch
        const currentCartPrice = item.variantPrice ?? item.product.price;
        let dbPrice = p.price;
        let dbVariant = null;

        if (item.variantId) {
          dbVariant = p.variants?.find(v => v.id === item.variantId);
          if (dbVariant) {
            dbPrice = dbVariant.price;
          } else {
            availabilityIssue = true;
            addToast(`Variant "${item.variantName}" of "${item.product.name}" is no longer available and has been removed.`, 'error');
            updatedItems.splice(i, 1);
            i--;
            continue;
          }
        }

        const itemName = dbVariant ? `${p.name} - ${dbVariant.name}` : p.name;
        if (currentCartPrice !== dbPrice) {
          priceMismatch = true;
          tempPriceDifferences.push({
            productId: item.product.id,
            variantId: item.variantId,
            name: itemName,
            oldPrice: currentCartPrice,
            newPrice: dbPrice
          });
          const updatedItem = { ...item };
          if (updatedItem.variantId) {
            updatedItem.variantPrice = dbPrice;
            if (updatedItem.product.variants) {
              updatedItem.product = {
                ...updatedItem.product,
                variants: updatedItem.product.variants.map(v => 
                  v.id === updatedItem.variantId ? { ...v, price: dbPrice } : v
                )
              };
            }
          } else {
            updatedItem.product = {
              ...updatedItem.product,
              price: dbPrice
            };
          }
          updatedItems[i] = updatedItem;
        }

        // Determine stock/preorder status
        const currentStock = dbVariant ? dbVariant.stock : p.stock;
        if (currentStock <= 0) {
          isPreorder = true;
        }

        // Build verified item
        verifiedItems.push({
          productId: p.id,
          name: itemName,
          price: dbPrice,
          quantity: item.quantity,
          vendorId: p.vendorId || ''
        });
        verifiedSubtotal += dbPrice * item.quantity;
      }

      if (availabilityIssue) {
        useCartStore.setState({ items: updatedItems });
        setLoading(false);
        return;
      }

      if (priceMismatch) {
        setPriceDifferences(tempPriceDifferences);
        setPendingItems(updatedItems);
        setLoading(false);
        return;
      }

      const verifiedDelivery = (appliedCoupon?.type === 'free_delivery')
        ? 0
        : (verifiedSubtotal >= freeMin ? 0 : charge);
      const verifiedDiscount = appliedCoupon
        ? couponService.calculateDiscount(appliedCoupon, verifiedSubtotal, verifiedDelivery)
        : 0;
      const verifiedTotal = verifiedSubtotal + verifiedDelivery - verifiedDiscount;

      if (verifiedSubtotal < minOrder) throw new Error(`Minimum order value is ₹${minOrder}`);

      // Calculate dominant category
      const categoryCounts: Record<string, number> = {};
      let dominantCategory = '';
      let maxCount = 0;
      for (const item of items) {
         const cat = item.product?.store;
         if (cat) {
            categoryCounts[cat] = (categoryCounts[cat] || 0) + item.quantity;
            if (categoryCounts[cat] > maxCount) {
               maxCount = categoryCounts[cat];
               dominantCategory = cat;
            }
         }
      }

      const payload = {
        customerId: user.uid,
        customerName: activeAddress.customerName || '',
        customerPhone: activeAddress.mobile || '',
        items: verifiedItems,
        totalAmount: verifiedTotal,
        deliveryCharge: verifiedDelivery,
        discountAmount: verifiedDiscount,
        couponCode: appliedCoupon?.code || null,
        status: 'pending',
        isPreorder: isPreorder,
        paymentMethod: paymentMethod,
        paymentProofImage: paymentMethod === 'upi' ? uploadedImageUrl : '',
        upiTransactionId: paymentMethod === 'upi' ? upiTxId : '',
        paymentProofVerified: paymentMethod === 'upi' ? false : true,
        deliveryAddress: {
          street: activeAddress.street || [activeAddress.para, activeAddress.area].filter(Boolean).join(', '),
          city: activeAddress.city || activeAddress.area || '',
          state: activeAddress.state || '',
          pincode: activeAddress.pincode || '',
          customerName: activeAddress.customerName || '',
          mobile: activeAddress.mobile || '',
          area: activeAddress.area || '',
          para: activeAddress.para || ''
        },
        specialInstructions: specialInstructions || '',
        deliverySlot: getLiveSlot() || '',
        category: dominantCategory,
        createdAt: new Date().toISOString(),
      };

      // Strip any Firebase-unfriendly undefined values deeply
      const cleanPayload = JSON.parse(JSON.stringify(payload));
      
      const orderId = await orderService.createOrder(cleanPayload);

      // Save new address to profile if checked
      if (useNew && saveToProfile && user) {
        const addressToSave = {
          customerName: newAddr.customerName || '',
          mobile: newAddr.mobile || '',
          area: newAddr.area || '',
          para: newAddr.para || '',
          street: newAddr.street || '',
          city: newAddr.city || '',
          state: newAddr.state || '',
          pincode: newAddr.pincode || '',
        };
        const updatedAddresses = [
          ...savedAddresses.map(addr => ({
            customerName: addr.customerName || '',
            mobile: addr.mobile || '',
            area: addr.area || '',
            para: addr.para || '',
            street: addr.street || '',
            city: addr.city || '',
            state: addr.state || '',
            pincode: addr.pincode || '',
          })),
          addressToSave
        ];
        await userService.updateUser(user.uid, { addresses: updatedAddresses as any }).catch(e => console.error("Error saving address to profile:", e));
      }

      // Mark coupon as used
      if (appliedCoupon) {
        await couponService.markUsed(appliedCoupon.id).catch(() => {}); // non-blocking
      }

      clearCart();
      addToast('Order placed! 🎉', 'success');
      router.push(`/orders/${orderId}`);
    } catch (err: any) {
      addToast(err.message || 'Failed to place order', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground transition-all placeholder:text-muted-foreground/40 font-semibold';
  const labelCls = 'block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5';

  return (
    <div className="px-4 py-5 pb-10 animate-fadeIn max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => router.back()} className="p-2 rounded-xl hover:bg-muted transition-colors press-effect">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-extrabold">Checkout</h1>
          <p className="text-xs text-muted-foreground">{items.length} item{items.length > 1 ? 's' : ''} · ₹{total}</p>
        </div>
      </div>

      {/* == SECTION 1 — DELIVERY ADDRESS == */}
      <section className="mb-6 bg-card/45 backdrop-blur-md border border-border/60 rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-display font-black text-foreground mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shadow-sm">1</span>
          Delivery Address
        </h2>

        {/* Address loading skeleton */}
        {addrLoading && (
          <div className="space-y-2 mb-2">
            {[1, 2].map(i => (
              <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Saved addresses */}
        {!addrLoading && savedAddresses.length > 0 && (
          <div className="grid grid-cols-1 gap-3 mb-3">
            {savedAddresses.map((addr, i) => {
              const isSelected = !useNew && selectedIdx === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedIdx(i);
                    setUseNew(false);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 press-effect flex items-start gap-3.5 relative overflow-hidden ${
                    isSelected
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                      : 'border-border bg-card/65 dark:bg-slate-900/50 hover:border-primary/40 hover:bg-card'
                  }`}
                >
                  <div className={`mt-0.5 p-2 rounded-lg shrink-0 transition-colors ${
                    isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground truncate">{addr.customerName}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider font-mono">
                        Saved {i + 1}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">{addr.mobile}</p>
                    <p className="text-xs text-muted-foreground/80 mt-1 truncate">
                      {[addr.street, addr.para, addr.area, addr.city].filter(Boolean).join(', ')}
                    </p>
                  </div>

                  <div className="absolute top-4 right-4 shrink-0 flex items-center justify-center">
                    <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/60'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Add new toggle button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setUseNew(true);
                setSelectedIdx(null);
              }}
              className={`w-full text-left flex items-center gap-3 p-4 rounded-xl border-2 transition-all press-effect ${
                useNew
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                  : 'border-dashed border-border bg-card/30 dark:bg-slate-900/10 hover:border-primary/40 hover:bg-card/50'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                useNew ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-bold text-primary">Deliver to a new address</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">Enter details for a new location</p>
              </div>
              <div className="ml-auto shrink-0 flex items-center justify-center">
                <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                  useNew ? 'border-primary bg-primary' : 'border-muted-foreground/60'
                }`}>
                  {useNew && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* New address form */}
        {useNew && (
          <div className="bg-card/85 dark:bg-slate-950/40 rounded-xl border border-border p-4 space-y-4 mt-3 animate-fadeIn">
            {/* Name & Mobile */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input value={newAddr.customerName}
                  onChange={e => setNewAddr(a => ({ ...a, customerName: e.target.value }))}
                  placeholder="e.g. Rahim Uddin"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Mobile Number *</label>
                <input type="tel" inputMode="numeric" maxLength={11}
                  value={newAddr.mobile}
                  onChange={e => setNewAddr(a => ({ ...a, mobile: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="01XXXXXXXXX"
                  className={inputCls} />
              </div>
            </div>
            {/* Area & Para */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Area *</label>
                {areas.length > 0 ? (
                  <div className="relative">
                    <select value={newAddr.area}
                      onChange={e => setNewAddr(a => ({ ...a, area: e.target.value }))}
                      className={inputCls + ' appearance-none cursor-pointer bg-card'}>
                      <option value="">Select area</option>
                      {areas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M5 7l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                ) : (
                  <input value={newAddr.area}
                    onChange={e => setNewAddr(a => ({ ...a, area: e.target.value }))}
                    placeholder="Your area"
                    className={inputCls} />
                )}
              </div>
              <div>
                <label className={labelCls}>Para / Mohalla</label>
                <input value={newAddr.para}
                  onChange={e => setNewAddr(a => ({ ...a, para: e.target.value }))}
                  placeholder="e.g. East Para"
                  className={inputCls} />
              </div>
            </div>
            {/* Street Address */}
            <div>
              <label className={labelCls}>Street Address *</label>
              <input value={newAddr.street}
                onChange={e => setNewAddr(a => ({ ...a, street: e.target.value }))}
                placeholder="e.g. House 12, Road 4"
                className={inputCls} />
            </div>
            {/* City, State & Pincode */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>City *</label>
                <input value={newAddr.city}
                  onChange={e => setNewAddr(a => ({ ...a, city: e.target.value }))}
                  placeholder="City"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <input value={newAddr.state}
                  onChange={e => setNewAddr(a => ({ ...a, state: e.target.value }))}
                  placeholder="State"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Pincode</label>
                <input type="tel" inputMode="numeric" maxLength={6}
                  value={newAddr.pincode}
                  onChange={e => setNewAddr(a => ({ ...a, pincode: e.target.value.replace(/[^0-9]/g, '') }))}
                  placeholder="Pincode"
                  className={inputCls} />
              </div>
            </div>
            {/* Save to Profile Checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer py-1 select-none">
              <input
                type="checkbox"
                checked={saveToProfile}
                onChange={e => setSaveToProfile(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500/20"
              />
              <span className="text-xs font-semibold text-slate-600">Save this address to my profile</span>
            </label>
            {/* Special Instructions */}
            <div>
              <label className={labelCls}>Delivery Instructions (optional)</label>
              <textarea value={specialInstructions}
                onChange={e => setSpecialInstructions(e.target.value)}
                rows={2} placeholder="Any notes for delivery..."
                className={inputCls + ' resize-none'} />
            </div>
          </div>
        )}

        {/* Instructions for saved address */}
        {!useNew && (
          <div className="mt-3">
            <label className={labelCls}>Delivery Instructions (optional)</label>
            <textarea value={specialInstructions}
              onChange={e => setSpecialInstructions(e.target.value)}
              rows={2} placeholder="Any notes for delivery..."
              className={inputCls + ' resize-none'} />
          </div>
        )}
      </section>

      {/* == SECTION 2.5 — COUPON CODE == */}
      <section className="mb-6 bg-card/45 backdrop-blur-md border border-border/60 rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-display font-black text-foreground mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shadow-sm">🎟️</span>
          Promo Code
        </h2>
        {appliedCoupon ? (
          <div className="bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎉</span>
              <div>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{appliedCoupon.code}</p>
                <p className="text-xs text-emerald-500 dark:text-emerald-300 font-semibold">
                  {couponService.describeDiscount(appliedCoupon)} saved!
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveCoupon}
              className="text-xs font-black text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted transition-colors press-effect"
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                placeholder="Enter promo code"
                className="flex-1 px-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground transition-all placeholder:text-muted-foreground/40 font-semibold uppercase tracking-wider"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all press-effect ${
                  couponCode.trim()
                    ? 'bg-gradient-primary text-white shadow-sm'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {couponLoading ? '...' : 'Apply'}
              </button>
            </div>
            {couponError && (
              <p className="text-xs text-destructive font-semibold mt-2 pl-1 flex items-center gap-1">
                ⚠️ {couponError}
              </p>
            )}
          </div>
        )}
      </section>

      {/* == SECTION 3 — PAYMENT == */}
      <section className="mb-6 bg-card/45 backdrop-blur-md border border-border/60 rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-display font-black text-foreground mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shadow-sm">2</span>
          Payment Method
        </h2>
        <div className="space-y-3">
          {paymentMethods.map(method => (
            <div key={method.id}>
              <button type="button"
                onClick={(e) => { e.preventDefault(); setPaymentMethod(method.id); }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all press-effect ${
                  paymentMethod === method.id
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                    : 'border-border bg-card/50 hover:border-primary/30'
                } ${paymentMethod === method.id && method.id === 'upi' ? 'rounded-b-none border-b-0' : ''}`}>
                <span className="text-2xl">{method.icon}</span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-foreground">{method.label}</p>
                  <p className="text-xs text-muted-foreground font-medium">{method.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                  paymentMethod === method.id ? 'border-primary bg-primary' : 'border-muted-foreground/60'
                }`}>
                  {paymentMethod === method.id && (
                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-scaleInBounce" />
                  )}
                </div>
              </button>

              {method.id === 'upi' && paymentMethod === 'upi' && (
                <div className="p-5 bg-card/40 dark:bg-slate-900/30 rounded-b-xl border border-t-0 border-primary/50 flex flex-col items-center animate-fadeIn">
                  {/* Brand Header */}
                  <div className="flex items-center justify-center gap-3 mb-4 w-full border-b border-border/60 pb-3">
                    <GPayLogo />
                    <span className="text-muted-foreground/40 text-sm">|</span>
                    <UpiLogo />
                  </div>

                  <p className="text-xs font-black mb-3 text-primary uppercase tracking-wider">Scan to pay with any UPI App</p>
                  
                  {config?.merchantUpiQrCode ? (
                    <div className="bg-white p-3.5 rounded-2xl shadow-md border border-primary/20 flex justify-center items-center animate-fadeIn relative group transition-transform duration-300 hover:scale-[1.02]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={config.merchantUpiQrCode}
                        alt="Merchant UPI QR"
                        className="w-40 h-40 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="bg-white p-3.5 rounded-2xl shadow-md border border-primary/20 flex justify-center items-center animate-fadeIn relative group transition-transform duration-300 hover:scale-[1.02]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=${config?.merchantUpiId || 'smartbazar@upi'}&pn=${encodeURIComponent(config?.businessName || 'Smart Bazar')}&am=${total}&cu=INR`)}`}
                        alt="UPI QR"
                        className="w-40 h-40"
                      />
                    </div>
                  )}

                  {/* Direct Launch Button */}
                  <a
                    href={`upi://pay?pa=${config?.merchantUpiId || 'smartbazar@upi'}&pn=${encodeURIComponent(config?.businessName || 'Smart Bazar')}&am=${total}&cu=INR`}
                    className="w-full max-w-[280px] mt-4 py-2.5 px-4 bg-gradient-primary text-white rounded-xl text-xs font-black text-center flex items-center justify-center gap-2 hover:opacity-95 active:scale-98 transition-all shadow-md press-effect"
                  >
                    <span>📱</span> Pay via UPI App (GPay/PhonePe...)
                  </a>
                  <p className="text-[9px] text-muted-foreground mt-1">Recommended for mobile users</p>
                  
                  {/* Copyable Details Console */}
                  <div className="text-left mt-4 w-full bg-card/90 dark:bg-slate-950/45 p-4 rounded-xl border border-border/80 space-y-3 shadow-inner">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">UPI ID</p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-foreground font-bold select-all">{config?.merchantUpiId || 'smartbazar@upi'}</span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="p-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                          title="Copy UPI ID"
                        >
                          {copiedUpi ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground font-black">₹{Math.round(total)}</span>
                        <button
                          type="button"
                          onClick={handleCopyAmount}
                          className="p-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                          title="Copy Amount"
                        >
                          {copiedAmount ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-muted-foreground text-center mt-3 max-w-[240px] font-medium leading-relaxed">
                    Pay <strong className="text-foreground">₹{Math.round(total)}</strong> using GPay or any other UPI app, then submit details below.
                  </p>

                  <div className="w-full border-t border-border/60 my-4" />

                  {/* UPI transaction ID input */}
                  <div className="w-full text-left">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={labelCls + ' mb-0'}>
                        UPI Transaction ID (UTR) *
                      </label>
                      {upiTxId.trim().length > 0 && (
                        <span className={`text-[10px] font-bold ${upiTxId.trim().length === 12 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {upiTxId.trim().length}/12 Digits
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. 123456789012"
                        value={upiTxId}
                        maxLength={12}
                        onChange={(e) => setUpiTxId(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-semibold text-foreground placeholder:text-muted-foreground/30 pr-10"
                      />
                      {upiTxId.trim().length === 12 && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                          <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground/80 mt-1.5 font-medium leading-normal">
                      Provide the 12-digit transaction ID from your payment confirmation screen.
                    </p>
                  </div>

                  {/* Payment Screenshot upload */}
                  <div className="w-full mt-4 text-left">
                    <label className={labelCls}>
                      Upload Payment Screenshot *
                    </label>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-5 bg-card/30 hover:bg-card/65 transition-all duration-200 relative cursor-pointer min-h-[140px]">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setUploadError(null);
                          if (file) {
                            const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
                            if (!allowedTypes.includes(file.type)) {
                              const errMessage = 'Only PNG, JPEG, and WEBP images are allowed.';
                              setUploadError(errMessage);
                              addToast(errMessage, 'error');
                              setPaymentProofFile(null);
                              setImagePreview(null);
                              e.target.value = '';
                              return;
                            }
                            const maxSizeBytes = 5 * 1024 * 1024; // 5MB
                            if (file.size > maxSizeBytes) {
                              const errMessage = 'Screenshot exceeds the 5MB size limit.';
                              setUploadError(errMessage);
                              addToast(errMessage, 'error');
                              setPaymentProofFile(null);
                              setImagePreview(null);
                              e.target.value = '';
                              return;
                            }
                            setPaymentProofFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setImagePreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          } else {
                            setPaymentProofFile(null);
                            setImagePreview(null);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      {imagePreview ? (
                        <div className="flex flex-col items-center w-full relative z-20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imagePreview}
                            alt="Screenshot Preview"
                            className="max-h-28 object-contain rounded-lg border border-border mb-2.5 shadow-sm"
                          />
                          <p className="text-xs text-foreground font-semibold truncate max-w-[200px]">
                            {paymentProofFile?.name}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentProofFile(null);
                              setImagePreview(null);
                              setUploadError(null);
                            }}
                            className="mt-2 text-xs font-black text-rose-500 hover:text-rose-600 transition-colors bg-rose-500/10 px-3 py-1 rounded-lg press-effect"
                          >
                            Remove Image
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center pointer-events-none">
                          <UploadCloudIcon />
                          <p className="text-xs font-bold text-foreground">Tap or drag to upload screenshot</p>
                          <p className="text-[10px] text-muted-foreground mt-1">Supports PNG, JPG, WEBP (Max 5MB)</p>
                        </div>
                      )}
                    </div>
                    {uploadError && (
                      <p className="text-xs text-rose-500 font-semibold mt-2 flex items-center gap-1.5 pl-1">
                        ⚠️ {uploadError}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* == SECTION 4 — ORDER SUMMARY == */}
      <section className="mb-6 bg-card/45 backdrop-blur-md border border-border/60 rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-display font-black text-foreground mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shadow-sm">3</span>
          Order Summary
        </h2>
        <div className="space-y-3 text-sm">
          {items.map((i, idx) => (
            <div key={i.product?.id || idx} className="flex justify-between items-center py-1 border-b border-border/40 last:border-b-0">
              <div className="min-w-0 flex-1 pr-4">
                <p className="font-bold text-foreground truncate">{i.product?.name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground font-semibold">Qty: {i.quantity}</p>
              </div>
              <span className="font-black text-foreground shrink-0">₹{(i.product?.price || 0) * i.quantity}</span>
            </div>
          ))}
          
          <div className="pt-2 mt-2 space-y-2 border-t border-border/60">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Subtotal</span>
              <span className="font-bold text-foreground">₹{subtotal}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground font-semibold">Delivery</span>
              <span className={`font-black ${deliveryCharge === 0 ? 'text-emerald-500' : 'text-foreground'}`}>
                {deliveryCharge === 0 ? '🎉 FREE' : `₹${deliveryCharge}`}
              </span>
            </div>
            
            {discount > 0 && (
              <div className="flex justify-between items-center bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">🎟️ Coupon ({appliedCoupon?.code})</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">−₹{Math.round(discount)}</span>
              </div>
            )}
            
            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground font-semibold">Est. Delivery</span>
              <span className="font-bold text-primary">{getLiveSlot()}</span>
            </div>
          </div>
          
          <div className="border-t border-border/60 pt-3 flex justify-between items-center">
            <span className="font-black text-base text-foreground">Total Amount</span>
            <span className="font-black text-primary text-xl tracking-tight">₹{Math.round(total)}</span>
          </div>
        </div>
      </section>

      {/* == PLACE ORDER CTA == */}
      <button
        onClick={handlePlaceOrder}
        disabled={loading}
        className="w-full py-4 rounded-xl text-white font-bold text-base press-effect disabled:opacity-60 transition-all flex items-center justify-center gap-2 bg-gradient-primary shadow-[0_8px_30px_rgba(0,200,83,0.25)] hover:shadow-[0_8px_30px_rgba(0,200,83,0.35)]"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
              <path d="M12 2a10 10 0 0110 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            Placing order...
          </>
        ) : (
          `Place Order — ₹${Math.round(total)}`
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground mt-3">🔒 Your data is safe and encrypted</p>

      {/* == PRICE DIFFERENCE DIALOG == */}
      {priceDifferences.length > 0 && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          style={{ animation: 'fadeIn 0.25s ease-out' }}
        >
          <div 
            className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl overflow-hidden"
            style={{ animation: 'scaleIn 0.25s ease-out' }}
          >
            <div className="p-6">
              {/* Icon & Title */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl shrink-0">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Price Updates Detected</h3>
                  <p className="text-xs text-muted-foreground">Some item prices in your cart have changed since you added them. Please review:</p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3 my-5 max-h-60 overflow-y-auto pr-1">
                {priceDifferences.map((diff, index) => {
                  const isDecrease = diff.newPrice < diff.oldPrice;
                  const diffAmount = Math.abs(diff.newPrice - diff.oldPrice);
                  return (
                    <div key={index} className="p-3 bg-muted/40 rounded-2xl border border-border/50 flex justify-between items-center">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-sm font-bold truncate text-foreground">{diff.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Price updated in database
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-muted-foreground line-through">₹{diff.oldPrice}</span>
                          <span className="text-sm font-black text-foreground">₹{diff.newPrice}</span>
                        </div>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                          isDecrease 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {isDecrease ? `↓ Saved ₹${diffAmount}` : `↑ +₹${diffAmount}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPriceDifferences([]);
                    setPendingItems([]);
                  }}
                  className="flex-1 py-3 bg-muted hover:bg-muted/80 rounded-xl text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Update cart store
                    useCartStore.setState({ items: pendingItems });
                    setPriceDifferences([]);
                    setPendingItems([]);
                    addToast('Cart updated with new prices. Review the total and place order.', 'success');
                  }}
                  className="flex-1 py-3 text-white font-bold text-sm rounded-xl transition-colors hover:opacity-90 bg-gradient-primary"
                >
                  Confirm & Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
