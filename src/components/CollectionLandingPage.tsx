import React, { useMemo, useState } from 'react';
import {
  useStore,
  isProductLiveOnStorefront,
  sortProductsByMerchandising,
} from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { ArrowLeft, ArrowUpDown, ChevronRight, Clock, Sparkles } from 'lucide-react';

interface CollectionLandingPageProps {
  collection: 'new-arrivals' | 'everyday-essentials';
}

export const CollectionLandingPage: React.FC<CollectionLandingPageProps> = ({ collection }) => {
  const { products, departments, navigateToDepartment, returnToHome } = useStore();
  const [sortBy, setSortBy] = useState<'recommended' | 'price-low' | 'price-high'>('recommended');

  const isNewArrivals = collection === 'new-arrivals';

  const collectionProducts = useMemo(() => {
    const live = products.filter((p) => {
      if (!isProductLiveOnStorefront(p)) return false;
      if (isNewArrivals) return Boolean(p.isNewArrival);
      return (
        p.needCategory === 'Everyday Essentials' ||
        Boolean(p.isDailyEdit) ||
        Boolean(p.isBestSeller) ||
        p.tags?.some((t) => t.toLowerCase().includes('essential'))
      );
    });

    const sorted = sortProductsByMerchandising(live);
    if (sortBy === 'price-low') return [...sorted].sort((a, b) => a.price - b.price);
    if (sortBy === 'price-high') return [...sorted].sort((a, b) => b.price - a.price);
    return sorted;
  }, [products, isNewArrivals, sortBy]);

  return (
    <div className="min-h-screen bg-[#F7F5F0] pb-16">
      <section className="bg-gradient-to-b from-[#FAF8F5] to-[#F7F5F0] border-b border-black/8 pt-8 pb-12 sm:pt-12 sm:pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center justify-between gap-2">
            <ol className="flex items-center space-x-1.5 text-xs font-mono text-[#242424]/70">
              <li>
                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    returnToHome();
                  }}
                  className="hover:text-[#242424] hover:underline"
                >
                  Home
                </a>
              </li>
              <li>
                <ChevronRight className="w-3.5 h-3.5 text-black/30" />
              </li>
              <li className="font-bold text-[#242424]" aria-current="page">
                {isNewArrivals ? 'New Arrivals' : 'Everyday Essentials'}
              </li>
            </ol>

            <button
              onClick={returnToHome}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#242424]/70 hover:text-black transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider mb-3 bg-[#536B57]/12 text-[#354838]">
              {isNewArrivals ? (
                <Clock className="w-3.5 h-3.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isNewArrivals ? 'Fresh Studio Drops' : 'Core Daily Utility'}</span>
              <span>·</span>
              <span>{collectionProducts.length} Live Items</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold text-[#242424] tracking-tight mb-4">
              {isNewArrivals
                ? 'New Arrivals — Latest Curated Finds'
                : 'Everyday Essentials — Smart Finds. Fair Prices.'}
            </h1>

            <p className="text-sm sm:text-base text-[#242424]/80 leading-relaxed mb-6">
              {isNewArrivals
                ? 'Explore our newest problem-solving travel organisers, workspace upgrades, self-care essentials, and family tools freshly added to the store.'
                : 'Everyday Finds. Small-Business-Friendly Prices. Practical, durable daily upgrades across Women, Men, Kids, and Home & Lifestyle.'}
            </p>

            {/* Internal Department Links for Crawlability & Discovery */}
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <a
                  key={dept.id}
                  href={`/category/${dept.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToDepartment(dept.id);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-[#242424] hover:text-white text-xs font-semibold rounded-xl border border-black/10 transition-colors"
                >
                  Explore {dept.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-black/8">
          <span className="text-xs font-mono text-black/60">
            Showing {collectionProducts.length} published products
          </span>

          <div className="flex items-center space-x-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-black/40" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-white border border-black/10 rounded-lg px-2.5 py-1.5 font-medium text-[#242424] focus:outline-hidden cursor-pointer"
            >
              <option value="recommended">Featured Order</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {collectionProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {collectionProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-white rounded-3xl border border-black/8 p-8 max-w-md mx-auto">
            <p className="text-sm font-semibold text-[#242424]">
              No published items in this collection yet.
            </p>
            <button
              onClick={returnToHome}
              className="mt-4 px-4 py-2 bg-[#242424] text-white text-xs font-semibold rounded-xl hover:bg-black cursor-pointer"
            >
              Return to Storefront
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
