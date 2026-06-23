import { FC, ReactNode } from 'react';
import Button from './Button';

interface EmptyStateProps {
  type?: 'cart' | 'search' | 'orders' | 'default';
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

const CartIllustration = () => (
  <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-6 drop-shadow-md">
    {/* Background Circle */}
    <circle cx="90" cy="90" r="72" fill="url(#cart-bg-grad)" fillOpacity="0.08" />
    <circle cx="90" cy="90" r="72" stroke="url(#cart-bg-grad)" strokeWidth="2" strokeDasharray="6 6" strokeOpacity="0.3" />
    
    {/* Floating elements */}
    <circle cx="45" cy="60" r="4" fill="#14b8a6" opacity="0.6" className="animate-pulse" />
    <circle cx="135" cy="75" r="6" fill="#0d9488" opacity="0.4" />
    <path d="M130 125l4-4-4-4-4 4z" fill="#f97316" opacity="0.6" />
    <path d="M50 120l3-3-3-3-3 3z" fill="#3b82f6" opacity="0.5" />

    {/* Sparkles */}
    <path d="M105 45l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#f97316" className="animate-bounce-subtle" />

    {/* Cart path */}
    <g transform="translate(15, 10)">
      {/* Wheels */}
      <circle cx="65" cy="115" r="10" fill="url(#cart-accent-grad)" />
      <circle cx="65" cy="115" r="4" fill="#ffffff" />
      <circle cx="105" cy="115" r="10" fill="url(#cart-accent-grad)" />
      <circle cx="105" cy="115" r="4" fill="#ffffff" />

      {/* Cart Basket */}
      <path
        d="M35 45h15l15 50h45l12-35H55"
        stroke="url(#cart-main-grad)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner grid lines for basket */}
      <path d="M62 60h38M65 72h30M77 50v35M89 50v35" stroke="url(#cart-main-grad)" strokeWidth="3" strokeOpacity="0.4" strokeLinecap="round" />
    </g>

    <defs>
      <linearGradient id="cart-bg-grad" x1="18" y1="18" x2="162" y2="162" gradientUnits="userSpaceOnUse">
        <stop stopColor="#14B8A6" />
        <stop offset="1" stopColor="#0D9488" />
      </linearGradient>
      <linearGradient id="cart-main-grad" x1="35" y1="45" x2="122" y2="95" gradientUnits="userSpaceOnUse">
        <stop stopColor="#14B8A6" />
        <stop offset="1" stopColor="#0D9488" />
      </linearGradient>
      <linearGradient id="cart-accent-grad" x1="55" y1="105" x2="115" y2="125" gradientUnits="userSpaceOnUse">
        <stop stopColor="#111827" />
        <stop offset="1" stopColor="#374151" />
      </linearGradient>
    </defs>
  </svg>
);

const SearchIllustration = () => (
  <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-6 drop-shadow-md">
    <circle cx="90" cy="90" r="72" fill="url(#search-bg-grad)" fillOpacity="0.08" />
    <circle cx="90" cy="90" r="72" stroke="url(#search-bg-grad)" strokeWidth="2" strokeDasharray="6 6" strokeOpacity="0.3" />

    {/* Floating elements */}
    <circle cx="50" cy="55" r="5" fill="#3b82f6" opacity="0.5" />
    <circle cx="130" cy="120" r="4" fill="#6366f1" opacity="0.6" />
    <path d="M125 50l3 3-3 3-3-3z" fill="#14b8a6" opacity="0.5" />

    {/* Magnifying Glass */}
    <g transform="translate(10, 10)">
      {/* Outer Rim */}
      <circle
        cx="75"
        cy="75"
        r="34"
        stroke="url(#search-main-grad)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Lens reflection shine */}
      <path d="M58 58a24 24 0 0124-4" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.6" />
      {/* Question mark inside lens */}
      <path d="M75 64a6 6 0 016 6c0 4-6 5-6 8m0 6v.01" stroke="url(#search-main-grad)" strokeWidth="4" strokeLinecap="round" />
      {/* Handle */}
      <path
        d="M99 99l28 28"
        stroke="url(#search-handle-grad)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Handle Accent */}
      <path d="M109 109l12 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
    </g>

    <defs>
      <linearGradient id="search-bg-grad" x1="18" y1="18" x2="162" y2="162" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#3B82F6" />
      </linearGradient>
      <linearGradient id="search-main-grad" x1="41" y1="41" x2="109" y2="109" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#3B82F6" />
      </linearGradient>
      <linearGradient id="search-handle-grad" x1="99" y1="99" x2="127" y2="127" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1F2937" />
        <stop offset="1" stopColor="#111827" />
      </linearGradient>
    </defs>
  </svg>
);

const OrdersIllustration = () => (
  <svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-6 drop-shadow-md">
    <circle cx="90" cy="90" r="72" fill="url(#orders-bg-grad)" fillOpacity="0.08" />
    <circle cx="90" cy="90" r="72" stroke="url(#orders-bg-grad)" strokeWidth="2" strokeDasharray="6 6" strokeOpacity="0.3" />

    {/* Floating stars */}
    <path d="M40 70l2 5 5-2-5-2-2-5-2 5-5 2z" fill="#f97316" opacity="0.6" />
    <circle cx="135" cy="60" r="5" fill="#f97316" opacity="0.4" />
    <circle cx="55" cy="125" r="3" fill="#ef4444" opacity="0.5" />

    {/* Package Box */}
    <g transform="translate(10, 10)">
      {/* Box flap left (open) */}
      <path
        d="M45 50L75 30v15L45 65z"
        fill="url(#orders-flap-grad)"
        stroke="url(#orders-main-grad)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Box flap right (open) */}
      <path
        d="M115 50L85 30v15l30 20z"
        fill="url(#orders-flap-grad)"
        stroke="url(#orders-main-grad)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Front Face Left */}
      <path
        d="M45 65v35l35 20V85z"
        fill="url(#orders-side-grad-1)"
        stroke="url(#orders-main-grad)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Front Face Right */}
      <path
        d="M115 65v35L80 120V85z"
        fill="url(#orders-side-grad-2)"
        stroke="url(#orders-main-grad)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Tape sealing */}
      <path d="M80 85v35" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
    </g>

    <defs>
      <linearGradient id="orders-bg-grad" x1="18" y1="18" x2="162" y2="162" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F97316" />
        <stop offset="1" stopColor="#ea580c" />
      </linearGradient>
      <linearGradient id="orders-main-grad" x1="45" y1="30" x2="115" y2="120" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ea580c" />
        <stop offset="1" stopColor="#9a3412" />
      </linearGradient>
      <linearGradient id="orders-flap-grad" x1="45" y1="30" x2="115" y2="65" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ffedd5" />
        <stop offset="1" stopColor="#f97316" />
      </linearGradient>
      <linearGradient id="orders-side-grad-1" x1="45" y1="65" x2="80" y2="120" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f97316" />
        <stop offset="1" stopColor="#ea580c" />
      </linearGradient>
      <linearGradient id="orders-side-grad-2" x1="80" y1="65" x2="115" y2="120" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fed7aa" />
        <stop offset="1" stopColor="#f97316" />
      </linearGradient>
    </defs>
  </svg>
);

const EmptyState: FC<EmptyStateProps> = ({ type = 'default', icon, title, description, action }) => {
  const renderIllustration = () => {
    switch (type) {
      case 'cart':
        return <CartIllustration />;
      case 'search':
        return <SearchIllustration />;
      case 'orders':
        return <OrdersIllustration />;
      default:
        return icon ? <div className="text-5xl mb-6">{icon}</div> : null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center max-w-md mx-auto animate-fadeIn">
      {renderIllustration()}
      <h3 className="text-lg font-bold text-foreground mb-2 font-display">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{description}</p>}
      {action && (
        <Button
          variant="primary"
          size="md"
          onClick={action.onClick}
          className="px-6 py-3 rounded-xl font-semibold press-effect"
          style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)', boxShadow: '0 4px 12px rgba(13,148,136,0.25)' }}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
