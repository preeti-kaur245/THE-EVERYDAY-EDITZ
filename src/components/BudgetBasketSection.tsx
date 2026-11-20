import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useStore, isProductLiveOnStorefront } from '../context/StoreContext';
import { BudgetBasketItem, BudgetBasketResponse, Product } from '../types';
import { ProductIllustration } from './ProductIllustration';

const BUDGET_PRESETS = [199, 299, 499, 799, 999];
const PURPOSE_PRESETS = ['Hostel', 'Travel', 'Self-Care', 'Gifting', 'Kitchen', 'College'];

interface BudgetBasketSectionProps {
  externalTrigger?: {
    budget: number | null;
    purpose: string;
    category: string;
    nonce: number;
  } | null;
}

export const BudgetBasketSection: React.FC<BudgetBasketSectionProps> = ({ externalTrigger }) => {
  const {
    products,
    addToCart,
    openProductModal,
    setIsCartOpen,
    showToast,
    trackAnalyticsEvent,
  } = useStore();

  const [budget, setBudget] = useState<number>(499);
  const [customBudgetInput, setCustomBudgetInput] = useState<string>('499');
  const [category, setCategory] = useState<string>('all');
  const [purpose, setPurpose] = useState<string>('Travel');
  const [maxItems, setMaxItems] = useState<number>(4);
  const [preferences, setPreferences] = useState<string>('');
  const [allowOverBudget, setAllowOverBudget] = useState<boolean>(false);

  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [isValidatingBag, setIsValidatingBag] = useState<boolean>(false);
  const [basketData, setBasketData] = useState<BudgetBasketResponse | null>(null);
  const [items, setItems] = useState<BudgetBasketItem[]>([]);
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);
  const [isAddItemOpen, setIsAddItemOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const buildBasket = async (opts?: {
    budget?: number;
    category?: string;
    purpose?: string;
    excludeIds?: string[];
  }) => {
    const activeBudget = Math.max(99, opts?.budget ?? budget);
    const activeCategory = opts?.category ?? category;
    const activePurpose = opts?.purpose ?? purpose;

    setIsBuilding(true);
    setErrorMsg(null);
    setSwappingIndex(null);

    try {
      const res = await fetch('/api/ai/budget-basket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: activeBudget,
          category: activeCategory,
          purpose: activePurpose,
          maxItems,
          preferences,
          excludeIds: opts?.excludeIds || [],
          allowOverBudget,
        }),
      });
      const data: BudgetBasketResponse = await res.json();
      if (!res.ok || !data?.success) {
        setErrorMsg('Could not generate your budget basket right now.');
      } else {
        setBasketData(data);
        setItems(data.items || []);
      }
    } catch {
      setErrorMsg('Network error reaching Budget Basket service.');
    } finally {
      setIsBuilding(false);
    }
  };

  // Handle handoff from EditzAIDiscovery or MoodMomentSection
  useEffect(() => {
    if (externalTrigger) {
      const nextBudget = externalTrigger.budget || 499;
      setBudget(nextBudget);
      setCustomBudgetInput(String(nextBudget));
      setCategory(externalTrigger.category || 'all');
      setPurpose(externalTrigger.purpose || 'Everyday essentials');
      buildBasket({
        budget: nextBudget,
        category: externalTrigger.category || 'all',
        purpose: externalTrigger.purpose || 'Everyday essentials',
      });
    }
  }, [externalTrigger?.nonce]);

  const basketTotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const remainingBudget = budget - basketTotal;
  const totalSavings = items.reduce((sum, item) => {
    const orig = Number(item.product.originalPrice) || item.product.price;
    return orig > item.product.price ? sum + (orig - item.product.price) * item.quantity : sum;
  }, 0);

  const handleQtyChange = (idx: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((line, i) => {
          if (i !== idx) return line;
          const live = products.find((p) => p.id === line.product.id) || line.product;
          const maxStock = live.stockCount || 1;
          const nextQty = Math.min(maxStock, Math.max(0, line.quantity + delta));
          if (nextQty === 0) return null;
          if (!allowOverBudget && delta > 0 && basketTotal + line.product.price > budget) {
            showToast(`Adding another exceeds ₹${budget} budget. Enable "Allow +15%" or raise budget.`, 'warning');
            return line;
          }
          return {
            ...line,
            quantity: nextQty,
            lineTotal: line.product.price * nextQty,
            lineOriginalTotal: (line.product.originalPrice > line.product.price ? line.product.originalPrice : line.product.price) * nextQty,
          };
        })
        .filter(Boolean) as BudgetBasketItem[]
    );
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSwapItem = (idx: number, replacement: Product) => {
    setItems((prev) =>
      prev.map((line, i) =>
        i === idx
          ? {
              product: replacement,
              quantity: 1,
              reason: `Swapped in: ${replacement.editorial?.problemItSolves || replacement.tagline}`,
              lineTotal: replacement.price,
              lineOriginalTotal:
                replacement.originalPrice > replacement.price ? replacement.originalPrice : replacement.price,
            }
          : line
      )
    );
    setSwappingIndex(null);
  };

  const handleAddFittingItem = (prod: Product) => {
    setItems((prev) => {
      if (prev.some((i) => i.product.id === prod.id)) return prev;
      return [
        ...prev,
        {
          product: prod,
          quantity: 1,
          reason: `Fits remaining budget — ${prod.editorial?.problemItSolves || prod.tagline}`,
          lineTotal: prod.price,
          lineOriginalTotal: prod.originalPrice > prod.price ? prod.originalPrice : prod.price,
        },
      ];
    });
    setIsAddItemOpen(false);
  };

  const handleAddEntireBasketToBag = async () => {
    if (items.length === 0) return;
    setIsValidatingBag(true);
    try {
      const res = await fetch('/api/ai/validate-basket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        }),
      });
      const validation = await res.json();
      if (!validation.valid && validation.issues?.length > 0) {
        showToast(validation.issues[0], 'warning');
      }
      const validLines: Array<{ product: Product; quantity: number }> = validation.validatedItems || [];
      if (validLines.length === 0) {
        showToast('No items in this basket are currently in stock.', 'warning');
        return;
      }
      validLines.forEach((line) => {
        const canonical = products.find((p) => p.id === line.product.id) || line.product;
        addToCart(canonical, line.quantity);
      });
      trackAnalyticsEvent('budget_basket_added', `₹${budget}`);
      showToast(`Added ${validLines.length}-item Budget Basket to your shopping bag!`);
      setIsCartOpen(true);
    } catch {
      // Fallback safely using live frontend state
      items.forEach((line) => addToCart(line.product, line.quantity));
      setIsCartOpen(true);
    } finally {
      setIsValidatingBag(false);
    }
  };

  const chosenIds = new Set(items.map((i) => i.product.id));
  const swapPool = [
    ...(basketData?.alternativeSwaps || []),
    ...products.filter(
      (p) =>
        isProductLiveOnStorefront(p) &&
        p.inStock &&
        (p.stockCount ?? 0) > 0 &&
        !chosenIds.has(p.id) &&
        (category === 'all' || p.departments.includes(category as any))
    ),
  ].filter((p, index, arr) => !chosenIds.has(p.id) && arr.findIndex((x) => x.id === p.id) === index);

  const fittingPool = swapPool.filter((p) => p.price <= Math.max(0, remainingBudget));

  return (
    <section id="budget-basket" className="py-12 sm:py-16 bg-white border-b border-black/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-mono uppercase tracking-wider text-[#536B57] mb-1.5">
              <Wallet className="w-3.5 h-3.5" />
              <span>Smart Value Curation</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#242424] tracking-tight">
              AI Budget Basket Builder
            </h2>
            <p className="text-sm text-[#242424]/70 mt-1 max-w-2xl">
              Set your target budget in ₹ and purpose — we assemble an in-stock basket strictly within your limit using live inventory and pricing.
            </p>
          </div>
        </div>

        {/* Two-column Builder + Interactive Result Workbench */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Panel */}
          <div className="lg:col-span-5 bg-[#FAF8F5] rounded-2xl border border-black/10 p-5 sm:p-6 space-y-5">
            {/* Budget Presets + Custom */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#242424]/70 mb-2">
                1. Choose Your Budget (₹)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2.5">
                {BUDGET_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setBudget(preset);
                      setCustomBudgetInput(String(preset));
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      budget === preset
                        ? 'bg-[#242424] text-white border-[#242424]'
                        : 'bg-white text-[#242424] border-black/10 hover:border-black/30'
                    }`}
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#242424]/60">Custom ₹</span>
                <input
                  type="number"
                  min={99}
                  max={25000}
                  value={customBudgetInput}
                  onChange={(e) => {
                    setCustomBudgetInput(e.target.value);
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= 99) setBudget(n);
                  }}
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-black/12 text-xs font-mono font-bold text-[#242424] focus:outline-none focus:border-[#242424]"
                  aria-label="Custom budget in rupees"
                />
              </div>
            </div>

            {/* Category & Max Items */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#242424]/70 mb-1.5">
                  2. Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/12 text-xs font-medium text-[#242424] focus:outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="women">Women</option>
                  <option value="men">Men</option>
                  <option value="kids">Kids</option>
                  <option value="home-lifestyle">Home &amp; Lifestyle</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#242424]/70 mb-1.5">
                  Max Items
                </label>
                <select
                  value={maxItems}
                  onChange={(e) => setMaxItems(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-black/12 text-xs font-medium text-[#242424] focus:outline-none cursor-pointer"
                >
                  <option value={2}>Up to 2 items</option>
                  <option value={3}>Up to 3 items</option>
                  <option value={4}>Up to 4 items</option>
                  <option value={5}>Up to 5 items</option>
                  <option value={6}>Up to 6 items</option>
                </select>
              </div>
            </div>

            {/* Purpose Chips + Text */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#242424]/70 mb-2">
                3. Purpose or Moment
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PURPOSE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPurpose(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      purpose.toLowerCase() === p.toLowerCase()
                        ? 'bg-[#536B57] text-white border-[#536B57]'
                        : 'bg-white text-[#242424]/80 border-black/10 hover:border-black/25'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Hostel setup, Monsoon trip, Birthday gift..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-black/12 text-xs text-[#242424] focus:outline-none focus:border-[#242424]"
              />
            </div>

            {/* Preferences & Strict Budget Toggle */}
            <div className="space-y-3">
              <input
                type="text"
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="Optional preference (e.g. compact, silk, waterproof)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-black/12 text-xs text-[#242424] focus:outline-none focus:border-[#242424]"
              />

              <label className="flex items-start space-x-2 text-xs text-[#242424]/75 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowOverBudget}
                  onChange={(e) => setAllowOverBudget(e.target.checked)}
                  className="mt-0.5 rounded border-black/25 text-[#242424] focus:ring-0"
                />
                <span>Allow slightly over budget (up to +15%) if a higher-value fit exists</span>
              </label>
            </div>

            <button
              type="button"
              onClick={() => buildBasket()}
              disabled={isBuilding}
              className="w-full py-3.5 rounded-xl bg-[#242424] hover:bg-black text-[#F7F5F0] text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {isBuilding ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Assembling Live Basket...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#D9A6A0]" />
                  <span>Build My ₹{budget} Basket</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive Basket Output */}
          <div className="lg:col-span-7 bg-[#FAF8F5] rounded-2xl border border-black/10 p-5 sm:p-6 min-h-[380px] flex flex-col justify-between">
            {!basketData && !isBuilding ? (
              <div className="my-auto text-center py-10 px-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-black/8 flex items-center justify-center mx-auto">
                  <Wallet className="w-6 h-6 text-[#536B57]" />
                </div>
                <h3 className="text-base font-bold text-[#242424]">
                  Ready to build your custom ₹{budget} basket
                </h3>
                <p className="text-xs text-[#242424]/70 max-w-md mx-auto">
                  Select a budget and purpose on the left, then click &ldquo;Build My ₹{budget} Basket&rdquo;. You can swap, adjust quantities, or add everything to your bag in one tap.
                </p>
                <div className="pt-2 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBudget(499);
                      setCustomBudgetInput('499');
                      setPurpose('Self-Care');
                      buildBasket({ budget: 499, purpose: 'Self-Care', category: 'women' });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white border border-black/10 hover:border-[#242424] text-xs font-medium text-[#242424] cursor-pointer"
                  >
                    Try: Self-Care Basket under ₹499
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBudget(799);
                      setCustomBudgetInput('799');
                      setPurpose('Hostel');
                      buildBasket({ budget: 799, purpose: 'Hostel', category: 'all' });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white border border-black/10 hover:border-[#242424] text-xs font-medium text-[#242424] cursor-pointer"
                  >
                    Try: Hostel Kit under ₹799
                  </button>
                </div>
              </div>
            ) : errorMsg ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Summary Header */}
                <div className="bg-white rounded-xl p-4 border border-black/8 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 text-xs font-mono text-[#536B57]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{basketData?.aiMode === 'gemini-grounded' ? 'AI Value Curated' : 'Live Stock Curated'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        buildBasket({
                          excludeIds: items.map((i) => i.product.id),
                        })
                      }
                      disabled={isBuilding}
                      className="text-xs font-semibold text-[#242424] hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isBuilding ? 'animate-spin' : ''}`} />
                      <span>Regenerate Combination</span>
                    </button>
                  </div>

                  {basketData?.summary && (
                    <p className="text-xs sm:text-sm text-[#242424] font-medium">{basketData.summary}</p>
                  )}

                  {/* Budget Accounting Metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/6 text-center">
                    <div className="bg-[#FAF8F5] rounded-lg p-2">
                      <div className="text-[10px] font-mono uppercase text-[#242424]/55">Basket Total</div>
                      <div className="text-sm sm:text-base font-bold text-[#242424] font-mono tabular-nums">
                        ₹{basketTotal}
                      </div>
                    </div>
                    <div className="bg-[#FAF8F5] rounded-lg p-2">
                      <div className="text-[10px] font-mono uppercase text-[#242424]/55">
                        {remainingBudget >= 0 ? 'Remaining' : 'Over Budget'}
                      </div>
                      <div
                        className={`text-sm sm:text-base font-bold font-mono tabular-nums ${
                          remainingBudget >= 0 ? 'text-[#536B57]' : 'text-amber-700'
                        }`}
                      >
                        ₹{Math.abs(remainingBudget)}
                      </div>
                    </div>
                    <div className="bg-[#FAF8F5] rounded-lg p-2">
                      <div className="text-[10px] font-mono uppercase text-[#242424]/55">MRP Savings</div>
                      <div className="text-sm sm:text-base font-bold text-emerald-700 font-mono tabular-nums">
                        {totalSavings > 0 ? `₹${totalSavings}` : 'Fair Price'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                {items.length === 0 ? (
                  <div className="p-6 rounded-xl bg-white border border-black/8 text-center text-xs text-[#242424]/70">
                    No in-stock products fit this budget right now. Try increasing your budget or choosing &ldquo;All Categories&rdquo;.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((line, idx) => {
                      const img = line.product.primaryImage || line.product.images?.[0];
                      const isSwapping = swappingIndex === idx;
                      const affordableSwaps = swapPool.filter(
                        (cand) =>
                          cand.id !== line.product.id &&
                          (allowOverBudget || basketTotal - line.product.price * line.quantity + cand.price <= budget)
                      );

                      return (
                        <div key={line.product.id} className="bg-white rounded-xl border border-black/8 p-3.5 space-y-2.5">
                          <div className="flex items-start gap-3">
                            <div
                              onClick={() => openProductModal(line.product)}
                              className="w-16 h-16 rounded-lg bg-[#F2EFE9] overflow-hidden shrink-0 cursor-pointer border border-black/5"
                            >
                              {img ? (
                                <img src={img} alt={line.product.name} className="w-full h-full object-cover" />
                              ) : (
                                <ProductIllustration productId={line.product.id} className="w-full h-full" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4
                                  onClick={() => openProductModal(line.product)}
                                  className="text-xs sm:text-sm font-bold text-[#242424] hover:underline cursor-pointer line-clamp-1"
                                >
                                  {line.product.name}
                                </h4>
                                <div className="text-right shrink-0">
                                  <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-[#242424]">
                                    ₹{line.product.price * line.quantity}
                                  </span>
                                  {line.product.originalPrice > line.product.price && (
                                    <del className="block text-[10px] text-black/40 font-mono tabular-nums">
                                      ₹{line.product.originalPrice * line.quantity}
                                    </del>
                                  )}
                                </div>
                              </div>

                              <p className="text-[11px] text-[#242424]/70 mt-0.5 line-clamp-2">{line.reason}</p>

                              <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5">
                                <div className="flex items-center space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(idx, -1)}
                                    className="w-7 h-7 rounded-lg bg-[#F7F5F0] border border-black/10 flex items-center justify-center hover:bg-black/5 cursor-pointer"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="text-xs font-mono font-bold w-5 text-center">{line.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(idx, 1)}
                                    className="w-7 h-7 rounded-lg bg-[#F7F5F0] border border-black/10 flex items-center justify-center hover:bg-black/5 cursor-pointer"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  {affordableSwaps.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setSwappingIndex(isSwapping ? null : idx)}
                                      className="px-2.5 py-1 rounded-lg bg-[#F7F5F0] hover:bg-[#F2EFE9] border border-black/8 text-[11px] font-medium text-[#242424] flex items-center space-x-1 cursor-pointer"
                                    >
                                      <ArrowLeftRight className="w-3 h-3 text-[#536B57]" />
                                      <span>{isSwapping ? 'Close' : 'Replace'}</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(idx)}
                                    className="p-1.5 rounded-lg text-black/45 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    aria-label={`Remove ${line.product.name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Swap Drawer */}
                          {isSwapping && affordableSwaps.length > 0 && (
                            <div className="pt-2.5 border-t border-black/6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {affordableSwaps.slice(0, 4).map((cand) => (
                                <button
                                  key={cand.id}
                                  type="button"
                                  onClick={() => handleSwapItem(idx, cand)}
                                  className="text-left p-2 rounded-lg bg-[#FAF8F5] hover:bg-[#F2EFE9] border border-black/8 flex items-center justify-between gap-2 cursor-pointer"
                                >
                                  <span className="text-[11px] font-semibold text-[#242424] truncate">{cand.name}</span>
                                  <span className="text-[11px] font-mono font-bold text-[#536B57] shrink-0">
                                    ₹{cand.price}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add Fitting Item Drawer */}
                {fittingPool.length > 0 && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsAddItemOpen((v) => !v)}
                      className="text-xs font-semibold text-[#536B57] hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        Add another fitting item (up to ₹{Math.max(0, remainingBudget)} remaining)
                      </span>
                    </button>
                    {isAddItemOpen && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-black/8">
                        {fittingPool.slice(0, 4).map((cand) => (
                          <button
                            key={cand.id}
                            type="button"
                            onClick={() => handleAddFittingItem(cand)}
                            className="text-left p-2 rounded-lg bg-[#FAF8F5] hover:bg-[#F2EFE9] border border-black/6 flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="text-xs font-medium text-[#242424] truncate">{cand.name}</span>
                            <span className="text-xs font-mono font-bold text-[#242424] shrink-0">
                              + ₹{cand.price}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Primary CTA Footer */}
                {items.length > 0 && (
                  <div className="pt-3 border-t border-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-[#242424]/70">
                      Live inventory &amp; pricing verified at checkout.
                    </div>
                    <button
                      type="button"
                      onClick={handleAddEntireBasketToBag}
                      disabled={isValidatingBag}
                      className="px-5 py-3 rounded-xl bg-[#242424] hover:bg-black text-white text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
                    >
                      <ShoppingBag className="w-4 h-4 text-[#D9A6A0]" />
                      <span>
                        {isValidatingBag
                          ? 'Checking Live Stock...'
                          : `Add Entire Basket to Bag · ₹${basketTotal}`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
