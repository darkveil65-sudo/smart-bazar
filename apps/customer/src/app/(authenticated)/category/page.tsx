'use client';

import { useRouter } from 'next/navigation';
import { CATEGORIES } from '@smart-bazar/shared/lib/constants';

export default function CategoryListPage() {
  const router = useRouter();

  return (
    <div className="px-4 py-5 animate-fadeIn">
      <h1 className="text-xl font-extrabold mb-1">Categories</h1>
      <p className="text-sm text-muted-foreground mb-6">Browse everything we offer</p>

      <div className="grid grid-cols-2 gap-3 stagger-children">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => router.push(`/category/${cat.id}`)}
            className="relative overflow-hidden flex flex-col items-start p-4 rounded-2xl border border-border bg-card press-effect card-hover animate-fadeInUp text-left"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Background accent */}
            <div
              className="absolute top-0 right-0 w-20 h-20 rounded-bl-3xl opacity-15"
              style={{ background: cat.color }}
            />
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-3"
              style={{ background: `${cat.color}18` }}
            >
              {cat.icon}
            </div>
            <h3 className="font-bold text-sm text-foreground">{cat.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Explore →</p>
          </button>
        ))}
      </div>
    </div>
  );
}
