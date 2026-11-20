import React, { useState, useMemo } from 'react';
import { useStore, isProductLiveOnStorefront } from '../context/StoreContext';
import { Layers, ShoppingBag, Check, Plus, Minus, Sparkles } from 'lucide-react';
import { ProductIllustration } from './ProductIllustration';

export const SmartCombos: React.FC = () => {
  const {
    bundles,
    products,
    addBundleToCart,
    addToCart,
    openProductModal,
    setIsCartOpen,
    showToast,
    trackAnalyticsEvent,
  } = useStore();

  const liveInStockProducts = useMemo(
    () =>
      products.filter(
        (p) => isProductLiveOnStorefront(p) && p.inStock && (p.stockCount ?? 0) > 0
      ),
    [products]
  );

  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customDeptFilter, setCustomDeptFilter] = useState<string>('all');
  const [customQuantities, setCustomQuantities] = useState<Record<string, number>>({});

  const visibleBundles = bundles.filter((b) => b.isActive !== false);

  const selectedCustomEntries = useMemo(() => {
    return Object.entries(customQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const prod = liveInStockProducts.find((p) => p.id === id);
        return prod ? { product: prod, qty } : null;
      })
      .filter(Boolean) as Array<{ product: (typeof liveInStockProducts)[number]; qty: number }>;
  }, [customQuantities, liveInStockProducts]);

  const customTotalItems = selectedCustomEntries.reduce((s, e) => s + e.qty, 0);
  const customSubtotal = selectedCustomEntries.reduce(
    (s, e) => s + e.product.price * e.qty,
    0
  );
  const customOriginalTotal = selectedCustomEntries.reduce((s, e) => {
    const orig = e.product.originalPrice > e.product.price ? e.product.originalPrice : e.product.price;
    return s + orig * e.qty;
  }, 0);
  const customGenuineSavings = Math.max(0, customOriginalTotal - customSubtotal);

  const handleToggleCustomQty = (productId: string, delta: number, maxStock: number) => {
    setCustomQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, Math.min(maxStock, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleAddCustomKit = () => {
    if (selectedCustomEntries.length < 2) {
      showToast('Pick at least 2 items to assemble your custom kit.', 'warning');
      return;
    }
    selectedCustomEntries.forEach(({ product, qty }) => addToCart(product, qty));
    trackAnalyticsEvent('custom_bundle_added', `${selectedCustomEntries.length} items`);
    showToast(`Added custom ${customTotalItems}-item kit to your bag!`);
    setCustomQuantities({});
    setIsCartOpen(true);
  };

  const filteredCustomPool = liveInStockProducts
    .filter((p) => customDeptFilter === 'all' || (p.departments || []).includes(customDeptFilter as any))
    .slice(0, 8);

  return (
    <section id="smart-combos" className="py-12 sm:py-16 bg-[#F7F5F0] border-b border-black/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-black/8 gap-4">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-mono tracking-wider text-[#536B57] uppercase mb-1.5">
              <Layers className="w-3.5 h-3.5 text-[#536B57]" />
              <span>Coordinated Sets</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#242424] tracking-tight">
              Smart Combos &amp; Bundles
            </h2>
            <p className="text-sm text-[#242424]/70 mt-1 max-w-xl">
              Curated everyday toolkits computed from live store stock and pricing — or assemble your own kit.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCustomOpen((v) => !v)}
            className="px-4 py-2.5 bg-white border border-black/15 hover:border-[#242424] text-[#242424] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#536B57]" />
            <span>{isCustomOpen ? 'Hide Custom Kit Builder' : 'Build Your Own Kit'}</span>
          </button>
        </div>

        {/* Interactive Custom Bundle Assembler */}
        {isCustomOpen && (
          <div className="mb-8 bg-white rounded-3xl border border-black/10 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-black/8">
              <div>
                <h3 className="text-base font-bold text-[#242424]">Assemble Your Custom Everyday Kit</h3>
                <p className="text-xs text-[#242424]/65">Select 2 or more live in-stock items to add together in one click.</p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'women', label: 'Women' },
                  { id: 'men', label: 'Men' },
                  { id: 'kids', label: 'Kids' },
                  { id: 'home-lifestyle', label: 'Home' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCustomDeptFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg border cursor-pointer ${
                      customDeptFilter === tab.id
                        ? 'bg-[#242424] text-white border-[#242424]'
                        : 'bg-[#FAF8F5] text-[#242424]/75 border-black/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredCustomPool.map((item) => {
                const qty = customQuantities[item.id] || 0;
                const img = item.primaryImage || item.images?.[0];
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      qty > 0 ? 'border-[#536B57] bg-[#FAF8F5]' : 'border-black/8 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        onClick={() => openProductModal(item)}
                        className="w-12 h-12 rounded-lg bg-[#F2EFE9] overflow-hidden shrink-0 cursor-pointer"
                      >
                        {img ? (
                          <img src={img} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ProductIllustration productId={item.id} className="w-full h-full scale-75" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-[#242424] line-clamp-1">{item.name}</div>
                        <div className="text-xs font-mono font-bold text-[#536B57] mt-0.5">₹{item.price}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-black/5">
                      <span className="text-[10px] font-mono text-black/45">Stock: {item.stockCount}</span>
                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => handleToggleCustomQty(item.id, 1, item.stockCount)}
                          className="px-2.5 py-1 bg-[#242424] text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      ) : (
                        <div className="flex items-center space-x-1.5 bg-white border border-black/15 rounded-lg px-1.5 py-0.5">
                          <button
                            type="button"
                            onClick={() => handleToggleCustomQty(item.id, -1, item.stockCount)}
                            className="p-0.5 text-black/70 hover:text-black cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono font-bold px-1">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleCustomQty(item.id, 1, item.stockCount)}
                            className="p-0.5 text-black/70 hover:text-black cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-black/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-[#242424]/80 flex flex-wrap items-center gap-3">
                <span>
                  Selected: <strong className="font-mono">{customTotalItems} item(s)</strong>
                </span>
                <span>
                  Kit Total: <strong className="font-mono text-base text-[#242424]">₹{customSubtotal}</strong>
                </span>
                {customGenuineSavings > 0 && (
                  <span className="text-emerald-700 font-mono font-semibold">
                    Savings vs MRP: ₹{customGenuineSavings}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddCustomKit}
                disabled={selectedCustomEntries.length < 2}
                className="px-5 py-2.5 bg-[#536B57] hover:bg-[#435746] disabled:opacity-45 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add Custom Kit to Bag</span>
              </button>
            </div>
          </div>
        )}

        {/* 2-Column Responsive Bundle Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleBundles.map((bundle) => {
            const bundleItems = products.filter(
              (p) => isProductLiveOnStorefront(p) && bundle.productIds.includes(p.id)
            );
            if (bundleItems.length === 0) return null;
            const bundleAvailable =
              bundleItems.length === bundle.productIds.length &&
              bundleItems.every((p) => p.inStock && (p.stockCount ?? 0) > 0);
            const liveSum = bundleItems.reduce((sum, item) => sum + item.price, 0);
            const liveOriginalSum = bundleItems.reduce(
              (sum, item) => sum + (item.originalPrice > item.price ? item.originalPrice : item.price),
              0
            );
            const effectiveBundlePrice =
              bundle.bundlePrice > 0 && bundle.bundlePrice <= liveSum ? bundle.bundlePrice : liveSum;
            const effectiveOriginalPrice = Math.max(liveOriginalSum, liveSum);
            const effectiveSavings = Math.max(0, effectiveOriginalPrice - effectiveBundlePrice);

            return (
              <div
                key={bundle.id}
                className="bg-white rounded-2xl border border-black/8 p-6 flex flex-col justify-between hover:border-black/15 transition-all shadow-xs"
              >
                <div>
                  {/* Top Bar with Badge & Savings */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-medium text-[#536B57] bg-[#536B57]/10 px-2.5 py-0.5 rounded">
                      {bundle.badge}
                    </span>
                    {effectiveSavings > 0 && (
                      <span className="text-xs font-mono text-emerald-700 font-semibold">
                        Save ₹{effectiveSavings}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-[#242424]">
                    {bundle.title}
                  </h3>
                  <p className="text-xs text-[#242424]/70 mt-1">
                    {bundle.description}
                  </p>

                  {/* Included Items Thumbnails Strip */}
                  <div className="my-5 grid grid-cols-3 gap-3">
                    {bundleItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => openProductModal(item)}
                        className="group/item flex flex-col items-center bg-[#F7F5F0] rounded-xl p-2.5 border border-black/5 hover:border-black/15 transition-all cursor-pointer text-center"
                        title={item.name}
                      >
                        <div className="w-full aspect-square rounded-lg bg-white overflow-hidden mb-2 relative">
                          {item.primaryImage || item.images?.[0] ? (
                            <img 
                              src={item.primaryImage || item.images[0]} 
                              alt={item.name}
                              className="w-full h-full object-cover group-hover/item:scale-105 transition-transform"
                            />
                          ) : (
                            <ProductIllustration productId={item.id} className="w-full h-full scale-90" />
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-[#242424] line-clamp-1 group-hover/item:underline">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-black/50 font-mono mt-0.5">
                          ₹{item.price}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Checklist bullets */}
                  <div className="space-y-1.5 text-xs text-[#242424]/80 py-2">
                    <div className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#536B57] shrink-0" />
                      <span>1-Box Combined Eco Packaging</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#536B57] shrink-0" />
                      <span>Complimentary Pan-India Express Delivery</span>
                    </div>
                  </div>
                </div>

                {/* Footer Price & Add Bundle CTA */}
                <div className="pt-4 mt-4 border-t border-black/8 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-black/40">Combo Price</div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xl font-bold text-[#242424] font-mono tabular-nums">
                        ₹{effectiveBundlePrice}
                      </span>
                      {effectiveOriginalPrice > effectiveBundlePrice && (
                        <del className="text-xs text-black/40 font-mono tabular-nums">
                          ₹{effectiveOriginalPrice}
                        </del>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!bundleAvailable) return;
                      addBundleToCart(bundle);
                      trackAnalyticsEvent('bundle_added', bundle.title);
                    }}
                    disabled={!bundleAvailable}
                    className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shadow-sm ${
                      bundleAvailable
                        ? 'bg-[#242424] hover:bg-black text-[#F7F5F0] cursor-pointer'
                        : 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-[#D9A6A0]" />
                    <span>{bundleAvailable ? 'Get Smart Combo' : 'Item Out of Stock'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
