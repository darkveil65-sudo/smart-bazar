'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Product } from '@smart-bazar/shared/types/firestore';
import { triggerAddToCartAnimation } from '@smart-bazar/shared/lib/utils/animation';

interface ProductCardProps {
  product: Product;
  qty: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  onClick?: () => void;
  accentColor?: string;
  delay?: number;
  deliverySlot?: string;
}

export default function ProductCard({
  product, qty, onAdd, onInc, onDec, onClick,
  accentColor = '#10B981', delay = 0, deliverySlot = '',
}: ProductCardProps) {
  const [pressed, setPressed] = useState(false);
  const [incPressed, setIncPressed] = useState(false);
  const [decPressed, setDecPressed] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [addPressed, setAddPressed] = useState(false);

  const unitStr = product.unit ? (/^\d/.test(product.unit) ? product.unit : `1 ${product.unit}`) : null;
  const mrp = (product as any).mrp;
  const discountPct = mrp && mrp > product.price ? Math.round((1 - product.price / mrp) * 100) : null;
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  // Generate a stable mock rating & reviews based on product name/id if not present
  const getStableRating = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const score = 4.1 + (Math.abs(hash) % 9) * 0.1;
    const reviews = 12 + (Math.abs(hash) % 230);
    return { rating: score.toFixed(1), reviews };
  };

  const { rating, reviews } = getStableRating(product.id);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      className={`product-card ${pressed ? 'pressed' : ''}`}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        borderRadius: 18,
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        animation: `fadeInUp 0.4s ${delay}ms ease-out both`,
        opacity: isOutOfStock ? 0.82 : 1,
        background: 'var(--glass-card-bg, rgba(255, 255, 255, 0.45))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-card-border, rgba(255, 255, 255, 0.45))',
        transform: pressed ? 'scale(0.96)' : hovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
        boxShadow: hovered 
          ? '0 12px 30px rgba(0, 0, 0, 0.15), 0 0 15px rgba(16, 185, 129, 0.15)' 
          : '0 8px 24px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
      }}
    >
      {/* Accent top strip */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }} />

      {/* Discount badge */}
      {discountPct && discountPct > 0 && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 2,
          background: '#ff5252', color: '#fff', fontSize: 9, fontWeight: 800,
          padding: '2px 7px', borderRadius: 6, boxShadow: '0 2px 8px rgba(255,82,82,0.35)',
        }}>
          {discountPct}% OFF
        </div>
      )}

      {/* Wishlist heart */}
      <button
        onClick={(e) => { e.stopPropagation(); setWishlisted(w => !w); }}
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 3,
          width: 26, height: 26, borderRadius: 8, border: 'none',
          background: wishlisted ? '#fff0f0' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
          transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          transform: wishlisted ? 'scale(1.15)' : 'scale(1)',
        }}
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill={wishlisted ? '#ef4444' : 'none'}
          stroke={wishlisted ? '#ef4444' : '#94a3b8'} strokeWidth="2.2">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      </button>

      {/* Low stock badge */}
      {isLowStock && !isOutOfStock && (
        <div style={{
          position: 'absolute', top: 10, left: 10, zIndex: 2,
          background: '#fffbeb', color: '#d97706', fontSize: 8, fontWeight: 700,
          padding: '2px 6px', borderRadius: 5, border: '1px solid #fde68a',
        }}>
          {product.stock} left
        </div>
      )}

      {/* Image */}
      <div style={{
        height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isOutOfStock
          ? 'rgba(241, 245, 249, 0.05)'
          : 'rgba(255, 255, 255, 0.08)',
        position: 'relative', overflow: 'hidden',
        filter: isOutOfStock ? 'grayscale(0.4)' : 'none',
        borderBottom: '1px solid var(--glass-card-border, rgba(255,255,255,0.15))',
      }}>
        {product.imageUrl ? (
          product.imageUrl.startsWith('data:') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '12px' }} />
          ) : (
            <div style={{ position: 'absolute', inset: '12px' }}>
              <Image src={product.imageUrl} alt={product.name} fill sizes="50vw" style={{ objectFit: 'contain' }} priority={false} unoptimized />
            </div>
          )
        ) : (
          <span style={{ fontSize: 48 }}>📦</span>
        )}

        {/* ADD / QTY / OUT-OF-STOCK */}
        <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 2 }}>
          {qty > 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'linear-gradient(135deg, #10B981, #059669)',
              borderRadius: 10, padding: '4px 6px',
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDecPressed(true);
                  setTimeout(() => setDecPressed(false), 150);
                  onDec();
                }}
                style={{
                  background: 'none', border: 'none', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer',
                  padding: '2px 6px', lineHeight: 1,
                  transform: decPressed ? 'scale(0.8)' : 'scale(1)',
                  transition: 'transform 0.1s ease',
                }}>−</button>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, minWidth: 16, textAlign: 'center' }}>{qty}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIncPressed(true);
                  setTimeout(() => setIncPressed(false), 150);
                  triggerAddToCartAnimation(e);
                  onInc();
                }}
                style={{
                  background: 'none', border: 'none', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer',
                  padding: '2px 6px', lineHeight: 1,
                  transform: incPressed ? 'scale(0.8)' : 'scale(1)',
                  transition: 'transform 0.1s ease',
                }}>+</button>
            </div>
          ) : isOutOfStock ? (
            <div style={{
              background: 'rgba(254, 215, 170, 0.45)', border: '1px solid rgba(251, 146, 60, 0.3)',
              borderRadius: 10, padding: '5px 8px',
              fontSize: 9, fontWeight: 800, color: '#c2410c',
              textAlign: 'center', lineHeight: 1.3,
              backdropFilter: 'blur(4px)',
            }}>
              Out of<br />Stock
            </div>
          ) : (
            <button
              className="add-btn"
              onClick={(e) => {
                e.stopPropagation();
                setAddPressed(true);
                setTimeout(() => setAddPressed(false), 150);
                triggerAddToCartAnimation(e);
                onAdd();
              }}
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                color: '#fff',
                borderRadius: 10,
                padding: '6px 14px',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                transform: addPressed ? 'scale(0.85)' : 'scale(1)',
                transition: 'transform 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>+</span>
              <span>ADD</span>
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {deliverySlot && !isOutOfStock && (
          <div className="delivery-badge" style={{ marginBottom: 6, alignSelf: 'flex-start' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
            {deliverySlot}
          </div>
        )}
        {isOutOfStock && (
          <div style={{ marginBottom: 6, fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>
            Currently unavailable
          </div>
        )}
        
        <h4 style={{
          fontSize: 12, fontWeight: 700, color: 'var(--foreground)', margin: '0 0 2px', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {product.name}
        </h4>
        
        {/* Star Rating Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '2px 0 6px' }}>
          <div style={{ display: 'flex', gap: 1 }}>
            {[...Array(5)].map((_, idx) => {
              const starVal = idx + 1;
              const isFilled = starVal <= Math.round(Number(rating));
              return (
                <span key={idx} style={{ color: isFilled ? '#F59E0B' : 'rgba(148, 163, 184, 0.25)', fontSize: 12, lineHeight: 1 }}>
                  ★
                </span>
              );
            })}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground)' }}>{rating}</span>
          <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>({reviews})</span>
        </div>

        {unitStr && <p style={{ fontSize: 10, color: 'var(--muted-foreground)', margin: '0 0 6px', fontWeight: 600 }}>{unitStr}</p>}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 'auto' }}>
          <span className="price-main" style={{ color: 'var(--foreground)' }}>₹{product.price}</span>
          {mrp && mrp > product.price && <span className="price-mrp">₹{mrp}</span>}
        </div>
      </div>
    </div>
  );
}
