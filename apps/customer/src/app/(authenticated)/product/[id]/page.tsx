'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Product } from '@smart-bazar/shared/types/firestore';
import { productService } from '@smart-bazar/shared/lib/services/productService';
import { storeService } from '@smart-bazar/shared/lib/services/storeService';
import { useCartStore } from '@smart-bazar/shared/stores/cartStore';
import { getDeliverySlot } from '@smart-bazar/shared/lib/constants';
import { triggerAddToCartAnimation } from '@smart-bazar/shared/lib/utils/animation';

export default function ProductDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [otherStoreProducts, setOtherStoreProducts] = useState<Record<string, { name: string; products: Product[] }>>({});
  // backward-compat alias used in render
  const otherCategoryProducts = otherStoreProducts;
  const [loading, setLoading] = useState(true);
  
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  // Variant & gallery state
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);
  const [activeImg, setActiveImg] = useState(0);
  const [isSpecsExpanded, setIsSpecsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const recsCarouselRef = useRef<HTMLDivElement>(null);

  // Full-screen image zoomable carousel state
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  // Size/Color Variant Parsing & state
  const COMMON_COLORS = [
    'red', 'blue', 'green', 'yellow', 'black', 'white', 'orange', 'pink', 'purple',
    'grey', 'gray', 'brown', 'silver', 'gold', 'beige', 'navy', 'teal', 'burgundy',
    'charcoal', 'magenta', 'cyan', 'ivory', 'cream', 'olive', 'lavender', 'peach',
    'coral', 'turquoise', 'maroon', 'bronze', 'copper', 'plum', 'rust', 'khaki',
    'tan', 'rose', 'rose gold', 'lilac', 'mustard', 'emerald', 'indigo', 'violet'
  ];

  const getColorFromName = (name: string): string | null => {
    const nameLower = name.toLowerCase();
    for (const color of COMMON_COLORS) {
      const regex = new RegExp(`\\b${color}\\b`, 'i');
      if (regex.test(nameLower)) {
        return color.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
    return null;
  };

  const parsedVariants = (product?.variants || []).map(v => {
    let color: string | null = null;
    let size: string | null = null;
    
    const parts = v.name.split(/[-/,|]/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      for (const part of parts) {
        const detectedColor = getColorFromName(part);
        if (detectedColor) {
          color = detectedColor;
        } else {
          size = part;
        }
      }
    } else {
      const detectedColor = getColorFromName(v.name);
      if (detectedColor) {
        color = detectedColor;
        const remaining = v.name.replace(new RegExp(detectedColor, 'gi'), '').trim().replace(/^[-/,|\s]+|[-/,|\s]+$/g, '');
        if (remaining) {
          size = remaining;
        }
      } else {
        size = v.name;
      }
    }
    
    return {
      variant: v,
      color: color || undefined,
      size: size || undefined,
    };
  });

  const allColors = Array.from(new Set(parsedVariants.map(pv => pv.color).filter(Boolean))) as string[];
  const allSizes = Array.from(new Set(parsedVariants.map(pv => pv.size).filter(Boolean))) as string[];

  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);

  const selectColor = (color: string) => {
    setSelectedColor(color);
    const matchingColor = parsedVariants.filter(pv => pv.color === color);
    if (matchingColor.length > 0) {
      const matchBoth = matchingColor.find(pv => pv.size === selectedSize);
      if (matchBoth) {
        setSelectedVariantId(matchBoth.variant.id);
      } else {
        const firstAvailable = matchingColor.find(pv => pv.variant.stock > 0) || matchingColor[0];
        setSelectedSize(firstAvailable.size);
        setSelectedVariantId(firstAvailable.variant.id);
      }
    }
  };

  const selectSize = (size: string) => {
    setSelectedSize(size);
    const matchingSize = parsedVariants.filter(pv => pv.size === size);
    if (matchingSize.length > 0) {
      const matchBoth = matchingSize.find(pv => pv.color === selectedColor);
      if (matchBoth) {
        setSelectedVariantId(matchBoth.variant.id);
      } else {
        const firstAvailable = matchingSize.find(pv => pv.variant.stock > 0) || matchingSize[0];
        setSelectedColor(firstAvailable.color);
        setSelectedVariantId(firstAvailable.variant.id);
      }
    }
  };

  const colorMap: Record<string, string> = {
    'Red': '#ef4444',
    'Blue': '#3b82f6',
    'Green': '#22c55e',
    'Yellow': '#eab308',
    'Black': '#1e293b',
    'White': '#ffffff',
    'Orange': '#f97316',
    'Pink': '#ec4899',
    'Purple': '#a855f7',
    'Grey': '#64748b',
    'Gray': '#64748b',
    'Brown': '#78350f',
    'Silver': '#cbd5e1',
    'Gold': '#fbbf24',
    'Beige': '#f5f5dc',
    'Navy': '#1e3a8a',
    'Teal': '#0d9488',
    'Burgundy': '#800020',
    'Ivory': '#fffff0',
    'Cream': '#fffdd0',
    'Olive': '#808000',
    'Lavender': '#e6e6fa',
    'Peach': '#ffdab9',
    'Coral': '#ff7f50',
    'Turquoise': '#40e0d0',
    'Maroon': '#800000',
    'Rose Gold': '#b76e79',
    'Lilac': '#c8a2c8',
    'Mustard': '#e1ad01',
    'Emerald': '#50c878',
    'Indigo': '#4b0082',
    'Violet': '#ee82ee'
  };

  const getSpecifications = (p: Product) => {
    const specs: { label: string; value: string }[] = [];
    if (p.store) {
      const storeLabel = p.store.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      specs.push({ label: 'Store', value: storeLabel });
    }
    if (p.category) {
      specs.push({ label: 'Category', value: p.category.charAt(0).toUpperCase() + p.category.slice(1) });
    }
    if (p.subCategory) {
      specs.push({ label: 'Sub-Category', value: p.subCategory.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') });
    }
    if (p.unit) {
      specs.push({ label: 'Unit/Size', value: p.unit });
    }

    let brand = 'Smart Bazar Select';
    const nameParts = p.name.split(' ');
    if (nameParts.length > 1 && nameParts[0].length > 2) {
      const firstWord = nameParts[0];
      if (!['fresh', 'organic', 'premium', 'natural', 'smart', 'bazar'].includes(firstWord.toLowerCase())) {
        brand = firstWord;
      }
    }
    specs.push({ label: 'Brand', value: brand });

    const storeId = p.store?.toLowerCase() || '';
    if (storeId.includes('furniture') || storeId.includes('home')) {
      specs.push(
        { label: 'Material', value: 'Premium Grade Wood & Fabric' },
        { label: 'Assembly Required', value: 'No (Pre-assembled)' },
        { label: 'Warranty', value: '1 Year Manufacturer Warranty' },
        { label: 'Country of Origin', value: 'India' },
        { label: 'Care Instructions', value: 'Wipe with damp cloth, avoid direct sunlight' }
      );
    } else if (storeId.includes('grocery') || storeId.includes('fresh') || storeId.includes('food')) {
      specs.push(
        { label: 'Dietary Preference', value: p.isVeg ? 'Vegetarian 🟢' : 'Non-Vegetarian 🔴' },
        { label: 'Shelf Life', value: 'Best before 6 months from packaging' },
        { label: 'Storage', value: 'Store in a cool, dry place.' },
        { label: 'Country of Origin', value: 'India' }
      );
    } else if (storeId.includes('electronics') || storeId.includes('mobiles') || storeId.includes('gadgets')) {
      specs.push(
        { label: 'Warranty', value: '1 Year Brand Warranty' },
        { label: 'Country of Origin', value: 'India' },
        { label: 'Inside the box', value: 'Product, User Manual, Charging Cable' }
      );
    } else {
      specs.push(
        { label: 'Quality Grade', value: 'Premium Quality Assured' },
        { label: 'Country of Origin', value: 'India' },
        { label: 'Return Policy', value: 'Easy 7-day returns if damaged' }
      );
    }

    if (p.description) {
      const lines = p.description.split('\n');
      lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length === 2 && parts[0].trim().length > 1 && parts[1].trim().length > 1) {
          const label = parts[0].trim();
          const value = parts[1].trim();
          if (!specs.some(s => s.label.toLowerCase() === label.toLowerCase())) {
            specs.push({ label, value });
          }
        }
      });
    }

    return specs;
  };

  // Derived helpers
  const selectedVariant = product?.variants?.find(v => v.id === selectedVariantId);
  const effectivePrice = selectedVariant?.price ?? product?.price ?? 0;
  const effectiveMrp   = selectedVariant?.mrp   ?? product?.mrp;
  const effectiveStock = selectedVariant != null ? selectedVariant.stock : (product?.stock ?? 0);

  const cartItem = cartItems.find(
    (item) => item.product.id === id && item.variantId === selectedVariantId
  );
  const qty = cartItem ? cartItem.quantity : 0;

  // Gallery images
  const galleryImages = product?.images?.length ? product.images
    : product?.imageUrl ? [product.imageUrl] : [];

  const scrollRecs = (direction: 'left' | 'right') => {
    if (recsCarouselRef.current) {
      const scrollAmount = 280;
      recsCarouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (!isPlaying || galleryImages.length <= 1 || isFullScreenOpen) return;
    const interval = setInterval(() => {
      setActiveImg((prev) => (prev + 1) % galleryImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPlaying, galleryImages.length, isFullScreenOpen]);

  useEffect(() => {
    let active = true;
    async function loadData() {
      if (!id || typeof id !== 'string') return;
      
      const prod = await productService.getProductById(id);
      if (prod && active) {
        setProduct(prod);
        // Fetch recommendations from same category and other categories
        const [allProds, allStores] = await Promise.all([
          productService.getAllProducts(),
          storeService.getStores(),
        ]);
        if (active) {
          // Backward-compat: map old category IDs to new store IDs
          const OLD_CAT_TO_STORE: Record<string, string> = {
            furniture: 'furniture-store', home: 'furniture-store',
          };
          const getEffStore = (p: Product) =>
            p.store || (p.category ? OLD_CAT_TO_STORE[p.category.toLowerCase()] : null) || 'furniture-store';
          const prodStore = getEffStore(prod);

          // Same store recommendations
          const similar = allProds.filter(p => getEffStore(p) === prodStore && p.isAvailable);
          const filtered = similar.filter(p => p.id !== prod.id).sort(() => 0.5 - Math.random()).slice(0, 6);
          setRecommendations(filtered);

          // Other stores
          const otherGroups: Record<string, { name: string; products: Product[] }> = {};
          allStores.forEach(store => {
            if (store.id !== prodStore) {
              const storeProds = allProds.filter(p => getEffStore(p) === store.id && p.isAvailable);
              if (storeProds.length > 0) {
                 otherGroups[store.id] = {
                   name: store.name,
                   products: storeProds.sort(() => 0.5 - Math.random()).slice(0, 5),
                 };
              }
            }
          });
          setOtherStoreProducts(otherGroups);
        }
      }
      if (active) setLoading(false);
    }
    
    loadData();
    return () => { active = false; };
  }, [id]);

  // When product loads, init selected variant to first variant
  useEffect(() => {
    if (product?.variants?.length) {
      const firstVar = product.variants[0];
      setSelectedVariantId(firstVar.id);
      
      const parsed = parsedVariants.find(pv => pv.variant.id === firstVar.id);
      if (parsed) {
        setSelectedColor(parsed.color);
        setSelectedSize(parsed.size);
      }
    } else {
      setSelectedVariantId(undefined);
      setSelectedColor(undefined);
      setSelectedSize(undefined);
    }
    setActiveImg(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Sync selectedColor & selectedSize when selectedVariantId changes
  useEffect(() => {
    if (selectedVariantId) {
      const current = parsedVariants.find(pv => pv.variant.id === selectedVariantId);
      if (current) {
        if (current.color) setSelectedColor(current.color);
        if (current.size) setSelectedSize(current.size);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariantId]);

  const onAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product) return;
    triggerAddToCartAnimation(e);
    addItem(
      product,
      selectedVariant
        ? { id: selectedVariant.id, name: selectedVariant.name, price: selectedVariant.price }
        : undefined
    );
  };

  const onInc = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product || qty >= effectiveStock) return;
    triggerAddToCartAnimation(e);
    updateQuantity(product.id, qty + 1, selectedVariantId);
  };

  const onDec = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product) return;
    if (qty > 1) updateQuantity(product.id, qty - 1, selectedVariantId);
    else removeItem(product.id, selectedVariantId);
  };

  if (loading) {
    return (
      <div className="product-page" style={{ 
        minHeight: '100vh', background: '#f8fafc', paddingBottom: 100, 
        paddingTop: 'env(safe-area-inset-top)' 
      }}>
        {/* Header Skeleton */}
        <div style={{
          padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div className="animate-shimmer" style={{ width: 44, height: 44, borderRadius: 22 }} />
          <div className="animate-shimmer" style={{ width: 100, height: 28, borderRadius: 20 }} />
        </div>

        {/* Hero Gallery Skeleton */}
        <div className="animate-shimmer" style={{ height: '45vh', minHeight: 320, width: '100%' }} />

        {/* Content Section Skeleton */}
        <div style={{
          background: '#fff', borderRadius: '32px 32px 0 0', marginTop: -40,
          padding: '30px 24px', position: 'relative', zIndex: 5,
        }}>
          {/* Badges Skeleton */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div className="animate-shimmer" style={{ width: 80, height: 22, borderRadius: 8 }} />
            <div className="animate-shimmer" style={{ width: 110, height: 22, borderRadius: 8 }} />
          </div>

          {/* Title & Subtitle Skeletons */}
          <div className="animate-shimmer" style={{ width: '75%', height: 32, borderRadius: 8, marginBottom: 12 }} />
          <div className="animate-shimmer" style={{ width: '30%', height: 20, borderRadius: 8, marginBottom: 24 }} />

          {/* Variant Selector Chips Skeleton */}
          <div style={{ marginBottom: 24 }}>
            <div className="animate-shimmer" style={{ width: 100, height: 16, borderRadius: 4, marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="animate-shimmer" style={{ width: 90, height: 38, borderRadius: 12 }} />
              <div className="animate-shimmer" style={{ width: 90, height: 38, borderRadius: 12 }} />
              <div className="animate-shimmer" style={{ width: 90, height: 38, borderRadius: 12 }} />
            </div>
          </div>

          {/* Pricing Card Skeleton */}
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20,
            padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 30
          }}>
            <div>
              <div className="animate-shimmer" style={{ width: 40, height: 12, borderRadius: 3, marginBottom: 6 }} />
              <div className="animate-shimmer" style={{ width: 120, height: 32, borderRadius: 8 }} />
            </div>
            <div className="animate-shimmer" style={{ width: 110, height: 44, borderRadius: 14 }} />
          </div>

          {/* Delivery & Urgency Skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 30 }}>
            <div className="animate-shimmer" style={{ height: 54, borderRadius: 16 }} />
            <div className="animate-shimmer" style={{ height: 54, borderRadius: 16 }} />
          </div>

          {/* Ratings & Reviews Skeleton */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="animate-shimmer" style={{ width: 150, height: 22, borderRadius: 6 }} />
              <div className="animate-shimmer" style={{ width: 60, height: 18, borderRadius: 6 }} />
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div className="animate-shimmer" style={{ width: 80, height: 80, borderRadius: 16 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="animate-shimmer" style={{ height: 6, borderRadius: 3 }} />
                <div className="animate-shimmer" style={{ height: 6, borderRadius: 3 }} />
                <div className="animate-shimmer" style={{ height: 6, borderRadius: 3 }} />
                <div className="animate-shimmer" style={{ height: 6, borderRadius: 3 }} />
                <div className="animate-shimmer" style={{ height: 6, borderRadius: 3 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <h2 style={{ color: '#64748b', fontSize: 20 }}>Product Not Found</h2>
        <button onClick={() => router.back()} style={{ marginTop: 20, padding: '12px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 600 }}>Go Back</button>
      </div>
    );
  }

  const categoryInfo = { name: product.store || 'Store', color: '#00c853', icon: '🏪' };
  const accentColor = '#00c853';
  const mrp = effectiveMrp;
  const discountPct = mrp && mrp > effectivePrice ? Math.round((1 - effectivePrice / mrp) * 100) : null;
  const unitStr = product.unit ? (/^\d/.test(product.unit) ? product.unit : `1 ${product.unit}`) : null;

  return (
    <div className="product-page" style={{ 
      minHeight: '100vh', background: '#f8fafc', paddingBottom: 120,
      position: 'relative', overflowX: 'hidden'
    }}>
      <style>{`
        .pop-in { animation: popIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .fade-in { animation: fadeIn 0.4s ease-out both; }
        .pulse-slow { animation: pulseSlow 3s infinite ease-in-out; }
        
        @keyframes popIn {
          0% { transform: scale(0.8) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes slideUp {
          0% { transform: translateY(40px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes pulseSlow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Top Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '20px', zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <button 
          onClick={() => router.back()}
          style={{
            width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            fontSize: 20
          }}
        >
          ←
        </button>
        <div style={{
          background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.8)', padding: '6px 12px',
          borderRadius: 20, fontSize: 13, fontWeight: 700, color: '#334155'
        }}>
          {product.store || 'Store'}
        </div>
      </div>

      {/* Responsive layout wrapper */}
      <div className="flex flex-col md:grid md:grid-cols-12 md:gap-8 w-full max-w-7xl mx-auto px-0 md:px-6 md:py-8 pt-20 md:pt-24">
        
        {/* Hero Image Gallery */}
        <div 
          className="product-gallery-container w-full md:col-span-6"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${accentColor}15 0%, #f8fafc 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
        {/* Decorative Blobs */}
        <div className="pulse-slow" style={{
          position: 'absolute', top: '10%', right: '-10%', width: 200, height: 200,
          background: `${accentColor}20`, borderRadius: '50%', filter: 'blur(40px)', zIndex: 0
        }} />
        <div className="pulse-slow" style={{
          position: 'absolute', bottom: '-5%', left: '-5%', width: 250, height: 250,
          background: `${accentColor}15`, borderRadius: '50%', filter: 'blur(50px)', zIndex: 0,
          animationDelay: '1s'
        }} />

        {galleryImages.length > 0 ? (
          <div className="pop-in" style={{ width: '100%', height: '100%', position: 'relative', zIndex: 2 }}>
            {/* Sliding Carousel Wrapper */}
            <div 
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: `translate3d(-${activeImg * 100}%, 0px, 0px)`,
                cursor: 'zoom-in'
              }}
              onTouchStart={e => {
                touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
              }}
              onTouchEnd={e => {
                const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
                const dt = Date.now() - touchStartRef.current.time;
                if (Math.abs(dx) > 50 && dt < 300) {
                  setIsPlaying(false);
                  if (dx < 0) {
                    setActiveImg(i => (i + 1) % galleryImages.length);
                  } else {
                    setActiveImg(i => (i - 1 + galleryImages.length) % galleryImages.length);
                  }
                }
              }}
            >
              {galleryImages.map((imgSrc, i) => (
                <div 
                  key={i} 
                  onClick={() => setIsFullScreenOpen(true)}
                  style={{
                    minWidth: '100%',
                    height: '100%',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px 40px'
                  }}
                >
                  {imgSrc.startsWith('data:') ? (
                    <img 
                      src={imgSrc} 
                      alt={`${product.name} - image ${i + 1}`}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        objectFit: 'contain', 
                        filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.15))' 
                      }} 
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <Image 
                        src={imgSrc} 
                        alt={`${product.name} - image ${i + 1}`} 
                        fill 
                        sizes="100vw"
                        style={{ 
                          objectFit: 'contain', 
                          filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.15))' 
                        }} 
                        priority={i === 0} 
                        unoptimized 
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Left / Right arrows */}
            {galleryImages.length > 1 && (
              <>
                <button 
                  onClick={() => {
                    setIsPlaying(false);
                    setActiveImg(i => (i - 1 + galleryImages.length) % galleryImages.length);
                  }}
                  style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.75)',
                    backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.9)',
                    fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 5, lineHeight: 1
                  }}
                >
                  ‹
                </button>
                <button 
                  onClick={() => {
                    setIsPlaying(false);
                    setActiveImg(i => (i + 1) % galleryImages.length);
                  }}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.75)',
                    backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.9)',
                    fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 5, lineHeight: 1
                  }}
                >
                  ›
                </button>
              </>
            )}
            {/* Dot indicators and play/pause button */}
            {galleryImages.length > 1 && (
              <div style={{
                position: 'absolute',
                bottom: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(8px)',
                padding: '6px 12px',
                borderRadius: 999,
                zIndex: 5,
                border: '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#334155',
                    fontSize: 10,
                    width: 14,
                    height: 14,
                  }}
                  title={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
                >
                  {isPlaying ? "⏸️" : "▶️"}
                </button>
                <div style={{ display: 'flex', gap: 5 }}>
                  {galleryImages.map((_, i) => (
                    <button 
                      key={i} 
                      onClick={(e) => { e.stopPropagation(); setActiveImg(i); setIsPlaying(false); }}
                      style={{
                        width: i === activeImg ? 14 : 6, height: 6, borderRadius: 3,
                        background: i === activeImg ? accentColor : 'rgba(0,0,0,0.2)',
                        border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', padding: 0,
                      }} 
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Thumbnail strip */}
            {galleryImages.length > 1 && (
              <div style={{
                position: 'absolute', bottom: 28, right: 12, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 5,
              }}>
                {galleryImages.map((src, i) => (
                  <button key={i} onClick={() => { setActiveImg(i); setIsPlaying(false); }}
                    style={{
                      width: 36, height: 36, borderRadius: 8, overflow: 'hidden',
                      border: `2px solid ${i === activeImg ? accentColor : 'rgba(255,255,255,0.6)'}`,
                      cursor: 'pointer', background: '#fff', padding: 0,
                      boxShadow: i === activeImg ? `0 0 0 2px ${accentColor}40` : 'none',
                      transition: 'all 0.2s',
                    }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="pop-in" style={{ width: '70%', height: '70%', position: 'relative', zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 120 }}>{product.emoji || '📦'}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="product-content-section slide-up w-full md:col-span-6">
        {/* Badges */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {discountPct && discountPct > 0 && (
             <span style={{ background: '#ff5252', color: '#fff', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
               {discountPct}% OFF
             </span>
          )}
          {product.stock <= 0 && (
            <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800, border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              Out of Stock
            </span>
          )}
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 8, lineHeight: 1.2 }}>
          {product.name}
        </h1>
        {unitStr && !product.variants?.length && (
          <p style={{ color: '#64748b', fontSize: 15, fontWeight: 500, marginBottom: 16 }}>{unitStr}</p>
        )}

        {/* -- Variant Selector Chips -- */}
        {product.variants && product.variants.length > 0 && (
          <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Color variants selector */}
            {allColors.length > 0 && (
              <div>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Color</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {allColors.map(color => {
                    const isSelected = color === selectedColor;
                    const bgHex = colorMap[color] || '#cbd5e1';
                    const variantsForColor = parsedVariants.filter(pv => pv.color === color);
                    const isOos = variantsForColor.every(pv => pv.variant.stock === 0);
                    
                    return (
                      <button 
                        key={color} 
                        onClick={() => !isOos && selectColor(color)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 16px',
                          borderRadius: 12,
                          cursor: isOos ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          fontSize: 13,
                          fontFamily: 'Inter, sans-serif',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          background: isSelected ? `${accentColor}10` : isOos ? '#f8fafc' : '#fff',
                          color: isSelected ? '#0f172a' : isOos ? '#cbd5e1' : '#334155',
                          border: isSelected ? `2.5px solid ${accentColor}` : `1.5px solid ${isOos ? '#f1f5f9' : '#e2e8f0'}`,
                          boxShadow: isSelected ? `0 4px 12px ${accentColor}25` : '0 1px 3px rgba(0,0,0,0.02)',
                          opacity: isOos ? 0.5 : 1,
                        }}
                      >
                        <span 
                          style={{ 
                            width: 14, 
                            height: 14, 
                            borderRadius: '50%', 
                            backgroundColor: bgHex,
                            border: bgHex.toLowerCase() === '#ffffff' ? '1px solid #cbd5e1' : 'none',
                            display: 'inline-block',
                            boxShadow: isSelected ? `0 0 0 2px #fff, 0 0 0 3px ${accentColor}` : 'none'
                          }} 
                        />
                        {color}
                        {isOos && (
                          <span style={{ fontSize: 9, background: '#ef4444', color: '#fff', borderRadius: 4, padding: '1px 3px', fontWeight: 800 }}>OOS</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size variants selector */}
            {allSizes.length > 0 && (
              <div>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {allColors.length > 0 ? 'Size' : 'Option'}
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {allSizes.map(size => {
                    const isSelected = size === selectedSize;
                    const variantsForSize = parsedVariants.filter(pv => pv.size === size);
                    const isOos = variantsForSize.every(pv => pv.variant.stock === 0);
                    
                    return (
                      <button 
                        key={size} 
                        onClick={() => !isOos && selectSize(size)}
                        style={{
                          padding: '10px 18px',
                          borderRadius: 12,
                          cursor: isOos ? 'not-allowed' : 'pointer',
                          fontWeight: 700,
                          fontSize: 13,
                          fontFamily: 'Inter, sans-serif',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          background: isSelected ? accentColor : isOos ? '#f1f5f9' : '#fff',
                          color: isSelected ? '#fff' : isOos ? '#cbd5e1' : '#334155',
                          border: isSelected ? `2.5px solid ${accentColor}` : `1.5px solid ${isOos ? '#f1f5f9' : '#e2e8f0'}`,
                          boxShadow: isSelected ? `0 4px 12px ${accentColor}40` : '0 1px 3px rgba(0,0,0,0.02)',
                          opacity: isOos ? 0.5 : 1,
                        }}
                      >
                        {size}
                        {isOos && (
                          <span style={{ marginLeft: 4, fontSize: 9, background: '#ef4444', color: '#fff', borderRadius: 4, padding: '1px 3px', fontWeight: 800 }}>OOS</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Flat Fallback if variants couldn't be parsed into color/size */}
            {allColors.length === 0 && allSizes.length === 0 && (
              <div>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select Option</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {product.variants.map(v => {
                    const isSelected = v.id === selectedVariantId;
                    const isOos = v.stock === 0;
                    return (
                      <button 
                        key={v.id} 
                        onClick={() => !isOos && setSelectedVariantId(v.id)}
                        style={{
                          padding: '10px 18px', borderRadius: 12, cursor: isOos ? 'not-allowed' : 'pointer',
                          fontWeight: 700, fontSize: 13, fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                          background: isSelected ? accentColor : isOos ? '#f1f5f9' : '#fff',
                          color: isSelected ? '#fff' : isOos ? '#cbd5e1' : '#334155',
                          boxShadow: isSelected ? `0 4px 12px ${accentColor}40` : '0 1px 3px rgba(0,0,0,0.02)',
                          border: isSelected ? `2.5px solid ${accentColor}` : `1.5px solid #e2e8f0`,
                          position: 'relative', opacity: isOos ? 0.55 : 1,
                        }}
                      >
                        {v.name}
                        {isOos && (
                          <span style={{ position: 'absolute', top: -5, right: -5, fontSize: 8, background: '#ef4444', color: '#fff', borderRadius: 6, padding: '1px 4px', fontWeight: 800, lineHeight: 1.4 }}>OOS</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedVariant && (
              <p style={{ marginTop: 2, fontSize: 11, color: '#94a3b8', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
                {selectedVariant.stock > 0 ? `${selectedVariant.stock} items in stock` : 'Out of stock'}
              </p>
            )}
          </div>
        )}

        {/* Pricing Card */}
        <div style={{
          background: effectiveStock <= 0 ? '#fffbf2' : '#f8fafc',
          border: effectiveStock <= 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
          borderRadius: 20,
          padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 30
        }}>
          <div>
            <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Price</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: effectiveStock <= 0 ? '#b45309' : '#0f172a' }}>₹{effectivePrice}</span>
              {effectiveMrp && effectiveMrp > effectivePrice && (
                <span style={{ fontSize: 16, fontWeight: 600, color: '#94a3b8', textDecoration: 'line-through' }}>₹{effectiveMrp}</span>
              )}
            </div>
          </div>
          
          {/* Add / Qty Logic */}
          <div style={{ position: 'relative' }}>
             {effectiveStock <= 0 ? (
                // -- PRE-ORDER BUTTON --
                qty > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,#f59e0b,#d97706)', borderRadius: 14, padding: '8px 12px', boxShadow: '0 8px 24px rgba(217,119,6,0.35)' }}>
                    <button onClick={onDec} style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.2)', borderRadius: 8, border: 'none', color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, minWidth: 20, textAlign: 'center' }}>{qty}</span>
                    <button onClick={onInc} style={{ width: 28, height: 28, background: '#fff', borderRadius: 8, border: 'none', color: '#d97706', fontWeight: 800, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                ) : (
                  <button
                    onClick={onAddToCart}
                    style={{
                      padding: '12px 22px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 14,
                      fontWeight: 800,
                      fontSize: 15,
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(217,119,6,0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <span style={{ fontSize: 18 }}>⭐</span>
                    Pre-Order
                  </button>
                )
             ) : qty > 0 ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: accentColor, borderRadius: 14, padding: '8px 12px',
                  boxShadow: `0 8px 24px ${accentColor}40`
                }}>
                  <button onClick={onDec} style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.2)', borderRadius: 8, border: 'none', color: '#fff', fontWeight: 800, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, minWidth: 20, textAlign: 'center' }}>{qty}</span>
                  <button onClick={onInc} style={{ width: 28, height: 28, background: '#fff', borderRadius: 8, border: 'none', color: accentColor, fontWeight: 800, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
             ) : (
                <button onClick={onAddToCart} style={{
                  padding: '12px 24px', background: accentColor, color: '#fff',
                  border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 15,
                  cursor: 'pointer', boxShadow: `0 8px 24px ${accentColor}40`,
                  transition: 'transform 0.1s',
                }}>
                  Add to Cart
                </button>
             )}
          </div>
        </div>

        {/* Urgency & Delivery Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 30 }}>

            {/* -- PRE-ORDER INFO BANNER (out of stock) -- */}
            {product.stock <= 0 && (
              <div style={{
                padding: 18, borderRadius: 18,
                background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                border: '1.5px solid #fde68a',
                boxShadow: '0 4px 16px rgba(245,158,11,0.10)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <span style={{ fontSize: 28, lineHeight: 1 }}>⭐</span>
                  <div>
                    <div style={{ color: '#92400e', fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Pre-Order Available!</div>
                    <div style={{ color: '#b45309', fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>
                      This item is currently out of stock. You can pre-order it — we&apos;ll deliver as soon as stock arrives. Our team will confirm your delivery time.
                    </div>
                    {qty > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, boxShadow: '0 0 6px rgba(245,158,11,0.6)', animation: 'pulseSlow 2s infinite' }} />
                        <span style={{ color: '#92400e', fontWeight: 700, fontSize: 12 }}>
                          {qty} item{qty > 1 ? 's' : ''} added to pre-order cart!
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Selling Fast Badge (low stock) */}
            {product.stock > 0 && product.stock <= 10 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#fffbeb', borderRadius: 16, border: '1px solid #fef08a' }}>
                <span style={{ fontSize: 24 }}>🔥</span>
                <div>
                  <div style={{ color: '#d97706', fontWeight: 800, fontSize: 14 }}>Selling Fast!</div>
                  <div style={{ color: '#b45309', fontSize: 12, fontWeight: 500 }}>Only {product.stock} items left in stock.</div>
                </div>
              </div>
            )}

            {/* Delivery slot — hide for out-of-stock (handled by pre-order) */}
            {product.stock > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: '#f0fdfa', borderRadius: 16, border: '1px solid #ccfbf1' }}>
                <span style={{ fontSize: 24 }}>⚡</span>
                <div>
                  <div style={{ color: '#0d9488', fontWeight: 800, fontSize: 14 }}>Superfast Delivery</div>
                  <div style={{ color: '#0f766e', fontSize: 12, fontWeight: 500 }}>Expected slot: {getDeliverySlot()}</div>
                </div>
              </div>
            )}
        </div>

        {/* About & Specifications */}
        {product.description && (
          <div style={{ marginBottom: 24, borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>About Product</h3>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
              {product.description}
            </p>
          </div>
        )}

        <div style={{ marginBottom: 24, borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
          <button 
            onClick={() => setIsSpecsExpanded(!isSpecsExpanded)}
            style={{
              width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'none', border: 'none', padding: '12px 0', cursor: 'pointer',
              fontSize: 16, fontWeight: 800, color: '#0f172a', textAlign: 'left',
              fontFamily: 'Outfit, sans-serif'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Product Specifications</span>
              <span style={{
                background: '#f1f5f9',
                color: '#64748b',
                padding: '2px 8px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'Inter, sans-serif'
              }}>
                {getSpecifications(product).length}
              </span>
            </div>
            <span style={{ fontSize: 14, transform: isSpecsExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', color: '#64748b' }}>
              ▼
            </span>
          </button>
          {isSpecsExpanded && (
            <div style={{ 
              marginTop: 12, 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: 16, 
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              animation: 'fadeIn 0.25s ease-out'
            }}>
              {getSpecifications(product).map((spec, index) => (
                <div 
                  key={index} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px', 
                    background: index % 2 === 0 ? '#ffffff' : '#f8fafc',
                    borderBottom: index === getSpecifications(product).length - 1 ? 'none' : '1px solid #f1f5f9'
                  }}
                >
                  <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{spec.label}</span>
                  <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 700, textAlign: 'right', maxWidth: '65%', fontFamily: 'Inter, sans-serif' }}>{spec.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mock Reviews Section */}
        <div style={{ marginBottom: 40 }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
             <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Ratings & Reviews</h3>
             <span style={{ color: accentColor, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>View All</span>
           </div>
           
           <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: '#0f172a' }}>4.8</span>
                <div style={{ color: '#fbbf24', fontSize: 14 }}>★★★★★</div>
                <span style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>1,248 Ratings</span>
             </div>
             
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[5, 4, 3, 2, 1].map(stars => (
                  <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#64748b', width: 10 }}>{stars}</span>
                    <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: stars > 3 ? '#10b981' : stars === 3 ? '#f59e0b' : '#ef4444', 
                                    width: stars === 5 ? '75%' : stars === 4 ? '15%' : stars === 3 ? '5%' : '2%' }} />
                    </div>
                  </div>
                ))}
             </div>
           </div>
           
           {/* Individual Mock Review */}
           <div style={{ padding: 16, border: '1px solid #f1f5f9', borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#64748b' }}>S</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Simran K.</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Verified Buyer</div>
                  </div>
                </div>
                <div style={{ color: '#fbbf24', fontSize: 12 }}>★★★★★</div>
              </div>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: 0 }}>
                &quot;Excellent quality! Received the product exactly as described and the delivery was super fast. Highly recommended. 👍&quot;
              </p>
           </div>
        </div>

        {/* Top products in this category (Recommended Products Carousel) */}
        {recommendations.length > 0 && (
          <div style={{ margin: '30px 0 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                Recommended Products
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button 
                  onClick={() => router.push(`/category/${product.store || ''}`)}
                  style={{ background: 'none', border: 'none', color: accentColor, fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}
                >
                  See all
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button 
                    onClick={() => scrollRecs('left')} 
                    style={{ 
                      width: 28, 
                      height: 28, 
                      borderRadius: 14, 
                      border: '1px solid #e2e8f0', 
                      background: '#fff', 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: 14, 
                      fontWeight: 700,
                      color: '#64748b',
                      transition: 'all 0.2s',
                      padding: 0
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = accentColor}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    ‹
                  </button>
                  <button 
                    onClick={() => scrollRecs('right')} 
                    style={{ 
                      width: 28, 
                      height: 28, 
                      borderRadius: 14, 
                      border: '1px solid #e2e8f0', 
                      background: '#fff', 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: 14, 
                      fontWeight: 700,
                      color: '#64748b',
                      transition: 'all 0.2s',
                      padding: 0
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = accentColor}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
            
            <div 
              ref={recsCarouselRef}
              className="no-scrollbar" 
              style={{ 
                display: 'flex', 
                overflowX: 'auto', 
                gap: 12, 
                paddingBottom: 12, 
                margin: '0 -24px', 
                paddingLeft: 24, 
                paddingRight: 24, 
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth'
              }}
            >
              {recommendations.map(rec => {
                 const recQty = cartItems.find((item) => item.product.id === rec.id)?.quantity || 0;
                 return (
                   <div key={rec.id} style={{ scrollSnapAlign: 'start' }}>
                     <HorizontalProductCard
                       key={rec.id}
                       product={rec}
                       qty={recQty}
                       accentColor={accentColor}
                       catIcon={(categoryInfo as any)?.icon ?? '📦'}
                       deliverySlot={getDeliverySlot()}
                       onAdd={() => addItem(rec)}
                       onInc={() => updateQuantity(rec.id, recQty + 1)}
                       onDec={() => {
                           if (recQty > 1) updateQuantity(rec.id, recQty - 1);
                           else removeItem(rec.id);
                       }}
                       onClick={() => router.push(`/product/${rec.id}`)}
                     />
                   </div>
                 );
              })}
            </div>
          </div>
        )}

        {/* Explore More Stores */}
        {Object.entries(otherCategoryProducts).map(([storeId, storeData]) => {
           const { name: storeName, products: prods } = storeData as { name: string; products: typeof recommendations };
           if (!prods || prods.length === 0) return null;
           
           return (
             <div key={storeId} style={{ marginTop: 30 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 12 }}>
                 <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                   {storeName}
                 </h2>
                 <button 
                   onClick={() => router.push(`/category/${storeId}`)}
                   style={{ background: 'none', border: 'none', color: accentColor, fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}
                 >
                   See all
                 </button>
               </div>
               
               <div style={{ display: 'flex', overflowX: 'auto', gap: 12, paddingBottom: 10, paddingRight: 20, margin: '0 -20px', paddingLeft: 20, scrollSnapType: 'x mandatory' }}>
                 {prods.map(prod => {
                   const itemQty = cartItems.find((item) => item.product.id === prod.id)?.quantity || 0;
                   return (
                     <div key={prod.id} style={{ scrollSnapAlign: 'start' }}>
                       <HorizontalProductCard
                         product={prod}
                         qty={itemQty}
                         accentColor={accentColor}
                         catIcon="🏪"
                         deliverySlot={getDeliverySlot()}
                         onAdd={() => addItem(prod)}
                         onInc={() => updateQuantity(prod.id, itemQty + 1)}
                         onDec={() => {
                             if (itemQty > 1) updateQuantity(prod.id, itemQty - 1);
                             else removeItem(prod.id);
                         }}
                         onClick={() => router.push(`/product/${prod.id}`)}
                       />
                     </div>
                   );
                 })}
               </div>
             </div>
           );
        })}

        <div style={{ height: 60 }} /> {/* Spacer */}
      </div>

      {/* Sticky Bottom "Checkout" / "View Cart" Bar if cart has items */}
      {cartItems.length > 0 && (
        <div className="slide-up" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(0,0,0,0.05)', padding: '16px 24px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.06)'
        }}>
          <button 
            onClick={() => router.push('/cart')}
            style={{
              width: '100%', padding: '16px', background: '#0f172a', color: '#fff',
              border: 'none', borderRadius: 16, fontWeight: 800, fontSize: 16,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              boxShadow: '0 8px 24px rgba(15,23,42,0.25)', cursor: 'pointer'
            }}
          >
             <span>{cartItems.length} Items</span>
             <span>View Cart →</span>
          </button>
        </div>
      )}
      
      </div> {/* Close Responsive layout wrapper */}

      {/* Full Screen Image Gallery Modal */}
      {isFullScreenOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.98)',
          backdropFilter: 'blur(20px)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#fff',
          overflow: 'hidden',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          {/* Top Header */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 70,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 24px',
            zIndex: 1010,
            background: 'linear-gradient(to bottom, rgba(15,23,42,0.8), rgba(0,0,0,0))'
          }}>
            <button 
              onClick={() => {
                setIsFullScreenOpen(false);
                setZoomScale(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              ✕
            </button>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {activeImg + 1} / {galleryImages.length}
            </div>
            {/* Zoom controls */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => {
                  setZoomScale(s => {
                    const newScale = Math.max(1, s - 0.5);
                    if (newScale === 1) setPanOffset({ x: 0, y: 0 });
                    return newScale;
                  });
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                −
              </button>
              <button
                onClick={() => {
                  setZoomScale(1);
                  setPanOffset({ x: 0, y: 0 });
                }}
                style={{
                  padding: '0 12px',
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Reset
              </button>
              <button
                onClick={() => {
                  setZoomScale(s => Math.min(3, s + 0.5));
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Main Zoom Area */}
          <div 
            style={{
              position: 'relative',
              width: '100%',
              height: 'calc(100% - 170px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              touchAction: 'none'
            }}
            onMouseDown={e => {
              if (zoomScale > 1) {
                isDraggingRef.current = true;
                setIsDragging(true);
                dragStartRef.current = { x: e.clientX, y: e.clientY };
                panOffsetRef.current = panOffset;
              } else {
                touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
              }
            }}
            onMouseMove={e => {
              if (isDraggingRef.current && zoomScale > 1) {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;
                setPanOffset({
                  x: panOffsetRef.current.x + dx,
                  y: panOffsetRef.current.y + dy
                });
              }
            }}
            onMouseUp={e => {
              if (isDraggingRef.current) {
                isDraggingRef.current = false;
                setIsDragging(false);
              } else if (zoomScale === 1) {
                const dx = e.clientX - touchStartRef.current.x;
                const dt = Date.now() - touchStartRef.current.time;
                if (Math.abs(dx) > 50 && dt < 300) {
                  if (dx < 0) {
                    setActiveImg(i => (i + 1) % galleryImages.length);
                  } else {
                    setActiveImg(i => (i - 1 + galleryImages.length) % galleryImages.length);
                  }
                }
              }
            }}
            onMouseLeave={() => {
              isDraggingRef.current = false;
              setIsDragging(false);
            }}
            onTouchStart={e => {
              if (zoomScale > 1) {
                isDraggingRef.current = true;
                setIsDragging(true);
                dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                panOffsetRef.current = panOffset;
              } else {
                touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
              }
            }}
            onTouchMove={e => {
              if (isDraggingRef.current && zoomScale > 1) {
                const dx = e.touches[0].clientX - dragStartRef.current.x;
                const dy = e.touches[0].clientY - dragStartRef.current.y;
                setPanOffset({
                  x: panOffsetRef.current.x + dx,
                  y: panOffsetRef.current.y + dy
                });
              }
            }}
            onTouchEnd={e => {
              if (isDraggingRef.current) {
                isDraggingRef.current = false;
                setIsDragging(false);
              } else if (zoomScale === 1) {
                const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
                const dt = Date.now() - touchStartRef.current.time;
                if (Math.abs(dx) > 50 && dt < 300) {
                  if (dx < 0) {
                    setActiveImg(i => (i + 1) % galleryImages.length);
                  } else {
                    setActiveImg(i => (i - 1 + galleryImages.length) % galleryImages.length);
                  }
                }
              }
            }}
            onDoubleClick={() => {
              if (zoomScale === 1) {
                setZoomScale(2);
              } else {
                setZoomScale(1);
                setPanOffset({ x: 0, y: 0 });
              }
            }}
          >
            {/* Left / Right navigation arrows */}
            {galleryImages.length > 1 && zoomScale === 1 && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImg(i => (i - 1 + galleryImages.length) % galleryImages.length);
                  }}
                  style={{
                    position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)',
                    width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10
                  }}
                >
                  ‹
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImg(i => (i + 1) % galleryImages.length);
                  }}
                  style={{
                    position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)',
                    width: 48, height: 48, borderRadius: 24, background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10
                  }}
                >
                  ›
                </button>
              </>
            )}

            <div style={{
              transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0px) scale(${zoomScale})`,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
            }}>
              {galleryImages[activeImg]?.startsWith('data:') ? (
                <img 
                  src={galleryImages[activeImg]} 
                  alt={product.name}
                  style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', pointerEvents: 'none' }} 
                />
              ) : (
                <div style={{ width: '90%', height: '90%', position: 'relative' }}>
                  <Image 
                    src={galleryImages[activeImg]} 
                    alt={product.name} 
                    fill 
                    style={{ objectFit: 'contain', pointerEvents: 'none' }} 
                    unoptimized 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer controls & thumbnails */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            zIndex: 1010,
            background: 'linear-gradient(to top, rgba(15,23,42,0.8), rgba(0,0,0,0))',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
          }}>
            {/* Gesture Hint */}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
              {zoomScale > 1 ? "Drag to pan image" : "Swipe left/right or double click to zoom"}
            </div>

            {/* Thumbnails row */}
            {galleryImages.length > 1 && (
              <div style={{ display: 'flex', gap: 8 }}>
                {galleryImages.map((src, i) => (
                  <button 
                    key={i} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImg(i);
                      setZoomScale(1);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: `2px solid ${i === activeImg ? accentColor : 'transparent'}`,
                      background: 'rgba(255,255,255,0.1)',
                      padding: 0,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===============================================================
// HORIZONTAL PRODUCT CARD (for "Explore more" carousels)
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
  const discountPct = (product as any).mrp && (product as any).mrp > product.price 
      ? Math.round((1 - product.price / (product as any).mrp) * 100) : null;

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
        height: 120, background: '#fafafa', display: 'flex', alignItems: 'center',
        justifyContent: 'center', position: 'relative', overflow: 'hidden',
        borderBottom: '1px solid #f5f5f5',
        padding: 10
      }}>
        {product.imageUrl ? (
          product.imageUrl.startsWith('data:') ? (
            <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 12 }}>
              <Image src={product.imageUrl} alt={product.name} fill sizes="33vw" style={{ objectFit: 'contain' }} unoptimized />
            </div>
          )
        ) : (
          <span style={{ fontSize: 40 }}>{catIcon}</span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Delivery time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#b45309' }}>{deliverySlot}</span>
        </div>

        {discountPct && discountPct > 0 && (
             <div style={{ fontSize: 9, fontWeight: 800, color: '#3b82f6', marginBottom: 2 }}>
               {discountPct}% OFF
             </div>
        )}

        <h4 style={{
          fontSize: 11, fontWeight: 600, color: '#0f172a', margin: '0 0 2px', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {product.name}
        </h4>
        
        {/* Reviews mock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 4 }}>
           <span style={{ color: '#fbbf24', fontSize: 9 }}>★★★★★</span>
           <span style={{ color: '#94a3b8', fontSize: 8 }}>(124)</span>
        </div>

        {unitStr && (
          <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, margin: '0 0 8px' }}>{unitStr}</p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', gap: 4 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>₹{product.price}</div>
            {discountPct && discountPct > 0 && (
              <div style={{ fontSize: 9, fontWeight: 500, color: '#94a3b8', textDecoration: 'line-through' }}>MRP ₹{(product as any).mrp}</div>
            )}
          </div>

          <div style={{ alignSelf: 'flex-end', marginTop: 4 }}>
            {qty > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: accentColor, borderRadius: 8, padding: '3px 6px' }}>
                <button onClick={(e) => { e.stopPropagation(); onDec(); }} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer', padding: 0, lineHeight: 1 }}>−</button>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 11, minWidth: 12, textAlign: 'center' }}>{qty}</span>
                <button onClick={(e) => { e.stopPropagation(); triggerAddToCartAnimation(e); onInc(); }} style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer', padding: 0, lineHeight: 1 }}>+</button>
              </div>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); triggerAddToCartAnimation(e); onAdd(); }}
                style={{ background: '#fff', border: `1px solid ${product.stock <= 0 ? '#f97316' : accentColor}`, color: product.stock <= 0 ? '#f97316' : accentColor, borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                {product.stock <= 0 ? 'PRE-ORDER' : 'ADD'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
