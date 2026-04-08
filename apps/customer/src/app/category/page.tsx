'use client';

import { useRouter } from 'next/navigation';
import { CATEGORIES } from '@smart-bazar/shared/lib/constants';

export default function CategoryIndexPage() {
  const router = useRouter();

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold mb-6">All Categories</h1>
      <div className="grid grid-cols-2 gap-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => router.push(`/category/${cat.id}`)}
            className="flex flex-col items-center gap-3 p-6 bg-card rounded-2xl border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: `${cat.color}15` }}
            >
              {cat.icon}
            </div>
            <span className="text-sm font-semibold text-foreground">{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
