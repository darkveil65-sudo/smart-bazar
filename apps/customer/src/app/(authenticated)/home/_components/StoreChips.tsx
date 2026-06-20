'use client';

import { Store } from '@smart-bazar/shared/types/firestore';

interface StoreChipsProps {
  stores: Store[];
  activeStoreId: string | null;
  onSelect: (storeId: string | null) => void;
  accentColor?: string;
}

export default function StoreChips({ stores, activeStoreId, onSelect, accentColor = '#00c853' }: StoreChipsProps) {
  const allStores = [
    { id: null as string | null, name: '🛍️ All', imageUrl: null as string | null, isComingSoon: false },
    ...stores.map(s => ({ id: s.id as string | null, name: s.name, imageUrl: s.imageUrl ?? null, isComingSoon: s.isComingSoon ?? false })),
  ];


  return (
    <div style={{ padding: '16px 0 4px' }}>
      <div
        style={{
          display: 'flex', gap: 8, overflowX: 'auto', paddingLeft: 16, paddingRight: 16,
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}
        className="hide-scrollbar"
      >
        {allStores.map((store) => {
          const isActive = (store.id === null && activeStoreId === null) || store.id === activeStoreId;
          return (
            <button
              key={store.id ?? 'all'}
              onClick={() => onSelect(store.id ?? null)}
              disabled={!!store.isComingSoon}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 24,
                background: isActive
                  ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`
                  : 'rgba(255,255,255,0.9)',
                color: isActive ? '#fff' : '#374151',
                fontWeight: isActive ? 800 : 600,
                fontSize: 12, cursor: store.isComingSoon ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0,
                boxShadow: isActive
                  ? `0 4px 14px ${accentColor}40`
                  : '0 2px 8px rgba(0,0,0,0.08)',
                border: isActive ? 'none' : '1.5px solid rgba(0,0,0,0.08)',
                transform: isActive ? 'scale(1.04)' : 'scale(1)',
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                opacity: store.isComingSoon ? 0.5 : 1,
              }}

            >
              {store.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={store.imageUrl}
                  alt={store.name}
                  style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : null}
              {store.name}
              {store.isComingSoon && <span style={{ fontSize: 9, opacity: 0.7 }}>Soon</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
