import React, { useState, useMemo } from 'react';
import { useStore, isProductLiveOnStorefront, sortProductsByMerchandising } from '../context/StoreContext';
import { ProductCard } from './ProductCard';
import { Tag } from 'lucide-react';

export const PricePicksSection: React.FC = () => {
  const { products } = useStore();
  const [selectedTier, setSelectedTier] = useState<number>(299);

  const liveProducts = useMemo(
    () => sortProductsByMerchandising(products.filter(isProductLiveOnStorefront)),
    [products]
  );

  // Filter dynamically based on actual selling price (Section 11)
  const itemsInTier = useMemo(() => {
    return liveProducts
      .filter((p) => p.price <= selectedTier)
      .slice(0, 8);
  }, [liveProducts, selectedTier]);

  const countUnder199 = liveProducts.filter((p) => p.price <= 199).length;
  const countUnder299 = liveProducts.filter((p) => p.price <= 299).length;
  const countUnder499 = liveProducts.filter((p) => p.price <= 499).length;
  const countUnder999 = liveProducts.filter((p) => p.price <= 999).length;

  return (
    <section id="price-picks-section" className="py-12 sm:py-16 bg-[#F7F5F0] border-b border-black/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header & Price Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-black/8 gap-4">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-mono uppercase tracking-wider text-[#536B57] mb-1.5">
              <Tag className="w-3.5 h-3.5 text-[#536B57]" />
              <span>Budget-Friendly Curations</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#242424] tracking-tight">
              Best Finds Under ₹{selectedTier}
            </h2>
            <p className="text-sm text-[#242424]/70 mt-1 max-w-xl">
              High-utility lifestyle and organisation upgrades at accessible testing price points.
            </p>
          </div>

          {/* Dynamic Segmented Price Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { price: 199, label: 'Under ₹199', count: countUnder199 },
              { price: 299, label: 'Under ₹299', count: countUnder299 },
              { price: 499, label: 'Under ₹499', count: countUnder499 },
              { price: 999, label: 'Under ₹999', count: countUnder999 },
            ].map((tier) => (
              <button
                key={tier.price}
                onClick={() => setSelectedTier(tier.price)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  selectedTier === tier.price
                    ? 'bg-[#242424] text-white shadow-sm'
                    : 'bg-white text-[#242424]/80 border border-black/8 hover:border-black/20'
                }`}
              >
                <span>{tier.label}</span>
                <span className="opacity-60 text-[10px] ml-1 font-mono">({tier.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Mobile, 4-Column Desktop Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {itemsInTier.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

      </div>
    </section>
  );
};
