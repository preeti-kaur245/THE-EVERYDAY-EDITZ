import React, { useMemo } from 'react';
import { Sparkles, EyeOff, Trash2 } from 'lucide-react';
import { useStore, isProductLiveOnStorefront, sortProductsByMerchandising } from '../context/StoreContext';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

export const PersonalizedEditSection: React.FC = () => {
  const {
    products,
    wishlist,
    orders,
    currentCustomer,
    personalizationConsent,
    setPersonalizationConsent,
    recentlyViewedIds,
    consentedSearchTerms,
    clearPersonalizationSignals,
  } = useStore();

  const liveProducts = useMemo(
    () => sortProductsByMerchandising(products.filter(isProductLiveOnStorefront)),
    [products]
  );

  const hasPersonalSignals =
    personalizationConsent &&
    (recentlyViewedIds.length > 0 ||
      wishlist.length > 0 ||
      consentedSearchTerms.length > 0 ||
      orders.length > 0 ||
      Boolean(currentCustomer?.customerSegment));

  const curatedEdit: Product[] = useMemo(() => {
    if (!hasPersonalSignals) {
      return liveProducts
        .filter((p) => p.inStock && (p.stockCount ?? 0) > 0)
        .sort((a, b) => Number(b.isBestSeller || b.isTrending) - Number(a.isBestSeller || a.isTrending))
        .slice(0, 4);
    }

    const preferredDepts = new Set<string>();
    const preferredSubcats = new Set<string>();
    const viewedSet = new Set(recentlyViewedIds);
    const orderedIds = new Set(orders.flatMap((o) => o.items.map((i) => i.product.id)));

    if (currentCustomer?.customerSegment) {
      preferredDepts.add(currentCustomer.customerSegment.toLowerCase());
    }

    liveProducts.forEach((p) => {
      if (viewedSet.has(p.id) || wishlist.includes(p.id) || orderedIds.has(p.id)) {
        (p.departments || []).forEach((d) => preferredDepts.add(d.toLowerCase()));
        (p.subcategories || []).forEach((s) => preferredSubcats.add(s.toLowerCase()));
      }
    });

    const searchTokens = consentedSearchTerms
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 3);

    return liveProducts
      .filter((p) => p.inStock && (p.stockCount ?? 0) > 0)
      .map((p) => {
        let score = (p.isBestSeller ? 4 : 0) + (p.isTrending ? 3 : 0);
        if ((p.departments || []).some((d) => preferredDepts.has(d.toLowerCase()))) score += 10;
        if ((p.subcategories || []).some((s) => preferredSubcats.has(s.toLowerCase()))) score += 12;
        if (viewedSet.has(p.id)) score += 6;
        if (wishlist.includes(p.id)) score += 5;
        const text = `${p.name} ${p.tagline} ${(p.tags || []).join(' ')}`.toLowerCase();
        for (const t of searchTokens) {
          if (text.includes(t)) score += 6;
        }
        return { p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.p);
  }, [liveProducts, hasPersonalSignals, recentlyViewedIds, wishlist, consentedSearchTerms, orders, currentCustomer]);

  if (curatedEdit.length === 0) return null;

  return (
    <section id="your-everyday-editz" className="py-12 sm:py-16 bg-white border-b border-black/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7 pb-4 border-b border-black/8">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-mono uppercase tracking-wider text-[#536B57] mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D9A6A0]" />
              <span>
                {hasPersonalSignals
                  ? 'Tailored to Your Browsing & Saved Finds'
                  : 'Curated from Storefront Bestsellers'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#242424] tracking-tight">
              Your Everyday Editz
            </h2>
            <p className="text-sm text-[#242424]/70 mt-1">
              {currentCustomer
                ? `Welcome back, ${currentCustomer.firstName} — practical picks matched to your recent interest.`
                : 'Thoughtfully ranked from live stock, with transparent privacy controls.'}
            </p>
          </div>

          {/* Privacy-First Personalization Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPersonalizationConsent(!personalizationConsent)}
              className={`px-3 py-1.5 rounded-xl border font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
                personalizationConsent
                  ? 'bg-[#536B57]/10 border-[#536B57]/30 text-[#536B57]'
                  : 'bg-[#F7F5F0] border-black/10 text-[#242424]/70'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Personalization: {personalizationConsent ? 'On' : 'Paused'}</span>
            </button>

            {hasPersonalSignals && (
              <button
                type="button"
                onClick={clearPersonalizationSignals}
                className="px-3 py-1.5 rounded-xl bg-white border border-black/10 hover:border-black/25 text-[#242424]/70 hover:text-[#242424] flex items-center space-x-1 cursor-pointer"
                title="Clear browsing & search signals"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {curatedEdit.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
