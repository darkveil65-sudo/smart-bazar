'use client';

import { HeroBanner, Store } from '@smart-bazar/shared/types/firestore';

/* -- Per-category hero gradient palettes ----------------------------------- */
const HERO_GRADIENTS = [
  'linear-gradient(135deg, #004d20 0%, #00c853 60%, #1de9b6 100%)',
  'linear-gradient(135deg, #0d47a1 0%, #1976d2 55%, #42a5f5 100%)',
  'linear-gradient(135deg, #7c1fa8 0%, #ab47bc 55%, #ce93d8 100%)',
  'linear-gradient(135deg, #b71c1c 0%, #e53935 55%, #ff8a65 100%)',
  'linear-gradient(135deg, #e65100 0%, #f57c00 55%, #ffd54f 100%)',
];
const HERO_BADGES = ['⚡ Express Delivery', '🌿 100% Fresh', '💰 Best Prices', '🎁 Top Deals', '🚴 Fast Delivery'];
const HERO_EMOJIS = ['🛒', '🥦', '🍱', '🎀', '🍞'];

interface HeroBannerProps {
  dbBanners: HeroBanner[];
  dbStores: Store[];
  heroSlide: number;
  firstName: string;
  onSlideClick: (catId: string) => void;
  onDotClick: (idx: number) => void;
}

export default function HeroBannerSlider({
  dbBanners, dbStores, heroSlide, firstName, onSlideClick, onDotClick,
}: HeroBannerProps) {
  const firestoreBannerSlides = dbBanners
    .filter(b => b.isActive)
    .map(b => ({
      catId: '', gradient: b.gradient, emoji: '🛒',
      headline: b.headline, sub: b.sub, cta: b.cta, badge: b.badge, imageUrl: b.imageUrl ?? null,
    }));

  const categoryBannerSlides = dbStores
    .filter(s => !s.isComingSoon)
    .slice(0, 5)
    .map((s, i) => ({
      catId: s.id, gradient: HERO_GRADIENTS[i % HERO_GRADIENTS.length],
      emoji: HERO_EMOJIS[i % HERO_EMOJIS.length], headline: s.name,
      sub: 'Fresh products, fast delivery', cta: 'Shop Now',
      badge: HERO_BADGES[i % HERO_BADGES.length], imageUrl: s.imageUrl ?? null,
    }));

  const slides = (
    firestoreBannerSlides.length > 0 ? firestoreBannerSlides : categoryBannerSlides
  ).length > 0
    ? (firestoreBannerSlides.length > 0 ? firestoreBannerSlides : categoryBannerSlides)
    : [{ catId: '', gradient: HERO_GRADIENTS[0], emoji: '🛒', headline: 'Smart Bazar', sub: 'Premium furniture at your door', cta: 'Explore', badge: '⚡ Express Delivery', imageUrl: null }];

  const hero = slides[heroSlide % slides.length];

  return (
    <div style={{ padding: '14px 16px 0' }}>
      <div style={{
        borderRadius: 22, background: hero.gradient, padding: '20px 20px 18px',
        position: 'relative', overflow: 'hidden', minHeight: 160,
        boxShadow: '0 8px 32px rgba(0,0,0,0.16)', animation: 'fadeIn 0.5s ease-out',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.10)' }} />
        <div style={{ position: 'absolute', right: 20, bottom: -40, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 20, padding: '4px 12px', marginBottom: 10,
          }}>
            <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, letterSpacing: '0.03em' }}>{hero.badge}</span>
          </div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>
            👋 Hi {firstName}!
          </p>
          <h2 key={heroSlide} style={{
            fontSize: 26, fontWeight: 900, color: '#fff', margin: '0 0 6px',
            lineHeight: 1.15, fontFamily: 'var(--font-display)',
            animation: 'fadeInUp 0.5s ease-out',
          }}>
            {hero.headline}<br />
            <span style={{ opacity: 0.85, fontSize: 18 }}>{hero.sub}</span>
          </h2>
          <button
            onClick={() => onSlideClick(hero.catId)}
            style={{
              marginTop: 12, background: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: 12, padding: '10px 22px',
              fontSize: 13, fontWeight: 800, cursor: 'pointer', color: '#00a045',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)', transition: 'all 0.2s', letterSpacing: 0.2,
            }}
          >
            {hero.cta} →
          </button>
        </div>

        {/* Image / Emoji */}
        <div style={{ position: 'absolute', right: 14, bottom: 16, animation: 'bounceSubtle 2.5s ease-in-out infinite' }}>
          {hero.imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={hero.imageUrl} alt={hero.headline} style={{ width: 80, height: 80, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' }} />
            : <span style={{ fontSize: 64 }}>{hero.emoji}</span>
          }
        </div>

        {/* Dots */}
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
          {slides.map((_, i) => (
            <div
              key={i}
              onClick={() => onDotClick(i)}
              style={{
                width: (i === heroSlide % slides.length) ? 18 : 6, height: 6, borderRadius: 3,
                background: (i === heroSlide % slides.length) ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.45)',
                transition: 'all 0.3s ease', cursor: 'pointer',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
