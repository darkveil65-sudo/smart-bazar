'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { storeService } from '@smart-bazar/shared/lib/services/storeService';
import { Store } from '@smart-bazar/shared/types/firestore';
import EmptyState from '@smart-bazar/shared/components/ui/EmptyState';

const SHOWROOM_IMAGES = [
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80', // luxury living room
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80', // design showroom
  'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80', // study desk / workspace
];

export default function StoreListPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const unsub = storeService.subscribeToStores((data) => {
      setStores(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 animate-pulse">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-slate-200 dark:bg-zinc-800 rounded-xl mb-3" />
          <div className="h-4 w-72 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-3xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 text-slate-800 dark:text-zinc-100 font-sans">
      {/* -- Header -------------------------------------------------------- */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-sm">
            <span className="text-xl">🏬</span>
          </div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-slate-900 dark:text-zinc-50">
            Showrooms & Departments
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-zinc-400 pl-1">
          Explore curated showrooms — high-end designer furniture and interior decor.
        </p>
      </div>

      {/* -- Express Delivery Banner --------------------------------------- */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 md:p-8 mb-10 shadow-md">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -left-16 -bottom-16 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <span className="text-4xl">⚡</span>
            <div>
              <h3 className="text-xl font-bold font-display text-white">
                Same-Day Showroom Delivery
              </h3>
              <p className="text-xs text-emerald-300/80 mt-1 font-medium">
                Professional handling & free installation on orders above ₹199
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (stores.length > 0) {
                router.push(`/category/${stores[0].id}`);
              }
            }}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all active:scale-95 shadow-md flex items-center gap-1.5 self-start md:self-auto"
          >
            <span>Order Now</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* -- Showrooms Grid ------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {stores.map((s, i) => {
          const isComingSoon = s.isComingSoon === true;
          const isHovered = hovered === s.id;
          const fallbackImage = SHOWROOM_IMAGES[i % SHOWROOM_IMAGES.length];

          return (
            <div
              key={s.id}
              onMouseEnter={() => setHovered(s.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                if (!isComingSoon) router.push(`/category/${s.id}`);
              }}
              className={`bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm transition-all duration-300 flex flex-col justify-between ${
                isComingSoon
                  ? 'opacity-60 cursor-not-allowed'
                  : 'cursor-pointer hover:shadow-lg hover:border-emerald-500/20 hover:-translate-y-1'
              }`}
            >
              {/* Showroom Header Image */}
              <div className="h-56 relative overflow-hidden bg-slate-50 dark:bg-zinc-800/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.imageUrl || fallbackImage}
                  alt={s.name}
                  className={`w-full h-full object-cover transition-transform duration-500 ${
                    isHovered && !isComingSoon ? 'scale-105' : 'scale-100'
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* Rating Badge */}
                {!isComingSoon && (
                  <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-white font-bold text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm uppercase tracking-wider">
                    <span>★</span>
                    <span>4.9 Curation</span>
                  </div>
                )}

                {/* Status Pill */}
                <div className="absolute top-4 right-4 bg-emerald-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wider">
                  {isComingSoon ? '⏳ Coming Soon' : '🟢 Open'}
                </div>

                {/* Showroom Title Overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-extrabold font-display text-white tracking-tight leading-tight">
                    {s.name}
                  </h3>
                </div>
              </div>

              {/* Showroom Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 leading-relaxed mb-5">
                    {s.id === 'furniture-store'
                      ? 'Browse our flagship collection of designer WFH chairs, cozy velvet lounge sofas, minimalist study desks, and aesthetic home decor.'
                      : 'Exclusive curated interior designs and accessory departments tailored for modern luxury living spaces.'}
                  </p>

                  {/* Highlights Tags */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['Premium Quality', 'Free Setup', 'Same-Day Delivery'].map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800 border border-slate-200/40 dark:border-zinc-700/40 px-2.5 py-1 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Explore button */}
                <div className="pt-4 border-t border-slate-50 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Noida Showroom
                  </span>
                  
                  {isComingSoon ? (
                    <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/25">
                      Launching Soon
                    </span>
                  ) : (
                    <button className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1 shadow-sm">
                      <span>Explore Showroom</span>
                      <span>→</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* -- Empty state ---------------------------------------------------- */}
      {stores.length === 0 && (
        <EmptyState
          type="search"
          title="No showrooms available"
          description="Check back soon — our designers are curating new spaces! 🎉"
        />
      )}
    </div>
  );
}

