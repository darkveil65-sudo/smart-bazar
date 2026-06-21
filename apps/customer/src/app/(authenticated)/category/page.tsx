'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storeService } from '@smart-bazar/shared/lib/services/storeService';
import { Store } from '@smart-bazar/shared/types/firestore';
import EmptyState from '@smart-bazar/shared/components/ui/EmptyState';

/* -- Color palette for category cards (cycles through) ------------------- */
const CARD_PALETTES = [
  { from: '#00c853', to: '#1de9b6', text: '#004d20' },
  { from: '#3b82f6', to: '#6366f1', text: '#1e3a8a' },
  { from: '#f43f5e', to: '#fb7185', text: '#9f1239' },
  { from: '#ffab00', to: '#fbbf24', text: '#78350f' },
  { from: '#7c3aed', to: '#a855f7', text: '#3b0764' },
  { from: '#0ea5e9', to: '#38bdf8', text: '#0c4a6e' },
  { from: '#14b8a6', to: '#2dd4bf', text: '#134e4a' },
  { from: '#f97316', to: '#fb923c', text: '#7c2d12' },
];

/* --------------------------------------------------------------------------- */
export default function StoreListPage() {
  const router = useRouter();
  const [stores, setStores]   = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const unsub = storeService.subscribeToStores((data) => {
      setStores(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* -- Skeleton ----------------------------------------------------------- */
  if (loading) {
    return (
      <div style={{ padding: '20px 16px' }}>
        {/* Header skeleton */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ height: 28, width: 160, borderRadius: 10, background: 'linear-gradient(90deg,#e8f5ec 25%,#d5edd9 50%,#e8f5ec 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', marginBottom: 8 }} />
          <div style={{ height: 14, width: 240, borderRadius: 6, background: 'linear-gradient(90deg,#e8f5ec 25%,#d5edd9 50%,#e8f5ec 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite 200ms' }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{
              height: 160, borderRadius: 20,
              background: 'linear-gradient(90deg,#e8f5ec 25%,#d5edd9 50%,#e8f5ec 75%)',
              backgroundSize: '200% 100%',
              animation: `shimmer 1.5s ${i * 80}ms infinite`,
            }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 16px 24px', animation: 'fadeIn 0.3s ease-out' }}>
      {/* -- Header -------------------------------------------------------- */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: 'linear-gradient(135deg,#00a045,#00c853)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,200,83,0.30)',
          }}>
            <span style={{ fontSize: 18 }}>🛍️</span>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0a1628', margin: 0, fontFamily: 'var(--font-display)' }}>
              All Stores
            </h1>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0, paddingLeft: 46 }}>
          Browse {stores.length} stores — fresh & always reliable
        </p>
      </div>

      {/* -- Featured banner ------------------------------------------------ */}
      <div style={{
        background: 'linear-gradient(135deg,#00a045,#00c853,#1de9b6)',
        backgroundSize: '200% 200%', animation: 'gradientShift 6s ease infinite',
        borderRadius: 20, padding: '16px 18px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: '0 8px 24px rgba(0,200,83,0.28)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
        <div style={{ position: 'absolute', left: -20, bottom: -30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <span style={{ fontSize: 40, zIndex: 1 }}>⚡</span>
        <div style={{ zIndex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 900, color: '#fff', margin: 0, fontFamily: 'var(--font-display)' }}>
            Express Delivery
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: '2px 0 0' }}>
            All categories · Fast delivery at your door
          </p>
        </div>
        <div style={{
          marginLeft: 'auto', background: 'rgba(255,255,255,0.20)',
          border: '1px solid rgba(255,255,255,0.35)', borderRadius: 12,
          padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#fff',
          zIndex: 1, backdropFilter: 'blur(8px)', cursor: 'pointer',
        }}>
          Order Now
        </div>
      </div>

      {/* -- Category grid ---------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {stores.map((s, i) => {
          const isComingSoon = s.isComingSoon === true;
          const palette      = CARD_PALETTES[i % CARD_PALETTES.length];
          const isHovered    = hovered === s.id;

          return (
            <button
              key={s.id}
              onClick={() => { if (!isComingSoon) router.push(`/category/${s.id}`); }}
              onMouseEnter={() => setHovered(s.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: 'relative', overflow: 'hidden',
                borderRadius: 20,
                background: isComingSoon
                  ? 'linear-gradient(135deg,#f1f5f9,#e2e8f0)'
                  : `linear-gradient(145deg, ${palette.from}18, ${palette.to}28)`,
                border: isComingSoon
                  ? '1.5px solid #e2e8f0'
                  : `1.5px solid ${palette.from}30`,
                padding: '0 0 14px',
                cursor: isComingSoon ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                transform: isHovered && !isComingSoon ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
                boxShadow: isHovered && !isComingSoon
                  ? `0 12px 32px ${palette.from}30`
                  : `0 2px 10px rgba(0,0,0,0.06)`,
                textAlign: 'left',
                animation: `fadeInUp 0.4s ${i * 70}ms ease-out both`,
              }}
            >
              {/* Top gradient accent bar */}
              {!isComingSoon && (
                <div style={{
                  height: 4, width: '100%',
                  background: `linear-gradient(90deg, ${palette.from}, ${palette.to})`,
                  marginBottom: 16,
                }} />
              )}
              {isComingSoon && <div style={{ height: 4, width: '100%', background: '#e2e8f0', marginBottom: 16 }} />}

              {/* Decorative circle */}
              {!isComingSoon && (
                <div style={{
                  position: 'absolute', right: -14, top: 20, width: 70, height: 70,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${palette.from}25 0%, transparent 70%)`,
                }} />
              )}

              <div style={{ padding: '0 14px' }}>
                {/* Image / Icon */}
                <div style={{
                  width: 60, height: 60, borderRadius: 18,
                  background: isComingSoon
                    ? '#e2e8f0'
                    : `linear-gradient(135deg, ${palette.from}20, ${palette.to}30)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', marginBottom: 12,
                  border: isComingSoon ? 'none' : `2px solid ${palette.from}25`,
                  flexShrink: 0,
                }}>
                  {s.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.imageUrl} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isComingSoon ? 0.5 : 1 }} />
                  ) : (
                    <span style={{ fontSize: 28, opacity: isComingSoon ? 0.4 : 1 }}>🏪</span>
                  )}
                </div>

                {/* Name */}
                <h3 style={{
                  fontWeight: 800, fontSize: 14, margin: '0 0 3px',
                  color: isComingSoon ? '#94a3b8' : '#0a1628',
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1.3,
                }}>
                  {s.name}
                </h3>

                {/* Sub line */}
                {isComingSoon ? (
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontWeight: 500 }}>Coming soon…</p>
                ) : (
                  <p style={{ fontSize: 11, color: palette.from, margin: 0, fontWeight: 700 }}>Explore →</p>
                )}
              </div>

              {/* Coming soon tape */}
              {isComingSoon && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(90deg,rgba(255,171,0,0.15),rgba(255,171,0,0.08))',
                  borderTop: '1px solid rgba(255,171,0,0.25)',
                  padding: '6px 0', backdropFilter: 'blur(4px)',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: '#d97706', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    ⏳ Coming Soon
                  </span>
                </div>
              )}

              {/* Animated glow on hover */}
              {isHovered && !isComingSoon && (
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: `radial-gradient(circle at 50% 30%, ${palette.from}12 0%, transparent 70%)`,
                  borderRadius: 20,
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* -- Empty state ---------------------------------------------------- */}
      {stores.length === 0 && (
        <EmptyState
          type="search"
          title="No stores yet"
          description="Check back soon — we're stocking up! 🎉"
        />
      )}
    </div>
  );
}
