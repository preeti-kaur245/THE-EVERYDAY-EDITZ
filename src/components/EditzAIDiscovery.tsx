import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Search,
  ShoppingBag,
  ArrowRight,
  Camera,
  Upload,
  X,
  RefreshCw,
  CheckCircle2,
  SlidersHorizontal,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import { useStore, isProductLiveOnStorefront } from '../context/StoreContext';
import { AIDiscoveryResponse, VisualSearchResponse } from '../types';
import { ProductCard } from './ProductCard';

const EXAMPLE_PROMPTS = [
  'Find useful things for my hostel.',
  'Build a self-care basket under ₹500.',
  'Find travel essentials.',
  'Find gifts under ₹1,000.',
  'Make my kitchen more organised.',
  'Show me trending everyday products.',
  'Find useful products for college students.',
  'Help me build a budget-friendly basket.',
];

const QUICK_BUDGETS = [
  { label: 'Any Budget', value: null },
  { label: 'Under ₹299', value: 299 },
  { label: 'Under ₹499', value: 499 },
  { label: 'Under ₹799', value: 799 },
  { label: 'Under ₹999', value: 999 },
];

interface EditzAIDiscoveryProps {
  variant?: 'section' | 'page';
  onHandoffToBudgetBasket?: (budget: number | null, purpose: string, category: string) => void;
}

export const EditzAIDiscovery: React.FC<EditzAIDiscoveryProps> = ({
  variant = 'section',
  onHandoffToBudgetBasket,
}) => {
  const {
    products,
    addToCart,
    openProductModal,
    setIsCartOpen,
    showToast,
    editzAiPrompt,
    setEditzAiPrompt,
    recordSearchSignal,
    navigateToEditzAI,
    returnToHome,
  } = useStore();

  const [query, setQuery] = useState(editzAiPrompt || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBudget, setSelectedBudget] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AIDiscoveryResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Visual Search state
  const [isVisualOpen, setIsVisualOpen] = useState(false);
  const [visualLoading, setVisualLoading] = useState(false);
  const [visualPreview, setVisualPreview] = useState<string | null>(null);
  const [visualNotes, setVisualNotes] = useState('');
  const [visualResult, setVisualResult] = useState<VisualSearchResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runDiscovery = async (
    overrideQuery?: string,
    overrideBudget?: number | null,
    overrideCategory?: string
  ) => {
    const activeQuery = (overrideQuery !== undefined ? overrideQuery : query).trim();
    if (!activeQuery) {
      setErrorMsg('Please describe what you need or pick a prompt below.');
      return;
    }

    const activeBudget = overrideBudget !== undefined ? overrideBudget : selectedBudget;
    const activeCat = overrideCategory !== undefined ? overrideCategory : selectedCategory;

    setErrorMsg(null);
    setIsLoading(true);
    recordSearchSignal(activeQuery);

    try {
      const res = await fetch('/api/ai/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: activeQuery,
          budget: activeBudget,
          category: activeCat,
          mode: 'finder',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErrorMsg(data?.error || 'Could not run EDITZ AI discovery right now.');
      } else {
        setResult(data);
      }
    } catch {
      setErrorMsg('Network error reaching EDITZ AI. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Pick up external prompt handoff (e.g. Hero or SearchModal)
  useEffect(() => {
    if (editzAiPrompt && editzAiPrompt.trim()) {
      setQuery(editzAiPrompt);
      runDiscovery(editzAiPrompt);
      setEditzAiPrompt('');
    }
  }, [editzAiPrompt]);

  const handlePromptClick = (promptText: string) => {
    setQuery(promptText);
    const budgetMatch = promptText.match(/₹\s*([\d,]+)/);
    const parsedBudget = budgetMatch ? Number(budgetMatch[1].replace(/,/g, '')) : null;
    if (parsedBudget) setSelectedBudget(parsedBudget);
    runDiscovery(promptText, parsedBudget !== null ? parsedBudget : selectedBudget, selectedCategory);
  };

  const handleVisualFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a JPG, PNG, or WebP photo.', 'warning');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      showToast('Image must be under 4 MB.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      setVisualPreview(dataUrl);
      setVisualResult(null);
      setVisualLoading(true);
      try {
        const res = await fetch('/api/ai/visual-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: dataUrl,
            mimeType: file.type || 'image/jpeg',
            notes: visualNotes.trim() || undefined,
          }),
        });
        const data: VisualSearchResponse = await res.json();
        setVisualResult(data);
      } catch {
        setVisualResult({
          success: false,
          code: 'NETWORK_ERROR',
          message: 'Could not reach visual discovery service. Please try text search.',
          matches: [],
        });
      } finally {
        setVisualLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleHandoff = () => {
    const inferredBudget = result?.intent?.maxBudget || selectedBudget || 499;
    const inferredCat = result?.intent?.category && result.intent.category !== 'all' ? result.intent.category : selectedCategory;
    const purposeText = query.trim() || result?.intent?.occasion || 'Everyday essentials';

    if (onHandoffToBudgetBasket) {
      onHandoffToBudgetBasket(inferredBudget, purposeText, inferredCat);
    } else {
      const el = document.getElementById('budget-basket');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const liveMatches = (result?.matches || []).filter((m) => {
    const live = products.find((p) => p.id === m.product.id);
    return live ? isProductLiveOnStorefront(live) : isProductLiveOnStorefront(m.product);
  });

  const handleAddAllMatches = () => {
    const inStockMatches = liveMatches
      .map((m) => products.find((p) => p.id === m.product.id) || m.product)
      .filter((p) => p.inStock && (p.stockCount ?? 0) > 0);
    if (inStockMatches.length === 0) {
      showToast('No in-stock items in current selection.', 'warning');
      return;
    }
    inStockMatches.forEach((p) => addToCart(p, 1));
    showToast(`Added ${inStockMatches.length} recommended items to your bag!`);
    setIsCartOpen(true);
  };

  return (
    <section
      id="editz-ai-section"
      className={`${
        variant === 'page' ? 'py-10 sm:py-14 min-h-[70vh]' : 'py-12 sm:py-16 border-b border-black/8'
      } bg-[#FAF8F5]`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {variant === 'page' && (
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={returnToHome}
              className="text-xs font-medium text-[#242424]/70 hover:text-[#242424] flex items-center space-x-1 cursor-pointer"
            >
              <span>← Back to Storefront</span>
            </button>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#536B57]">
              EDITZ AI · Everyday Discovery Engine
            </span>
          </div>
        )}

        {/* Central Discovery Console Card */}
        <div className="bg-white rounded-3xl border border-black/10 shadow-sm p-5 sm:p-8 lg:p-10">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#536B57] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#D9A6A0]" />
              <span>EDITZ AI — Everyday Discovery Engine</span>
              {variant !== 'page' && (
                <>
                  <span className="text-black/25">·</span>
                  <button
                    onClick={() => navigateToEditzAI(query || undefined, 'finder')}
                    className="underline hover:text-[#242424] cursor-pointer"
                  >
                    Open Full Discovery Studio
                  </button>
                </>
              )}
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold text-[#242424] tracking-tight">
              Your everyday. A little smarter.
            </h2>
            <p className="text-sm sm:text-base text-[#242424]/75 mt-2 leading-relaxed">
              Tell us what you need, what you&apos;re looking for or what you want to solve. Let us find the right products.
            </p>
          </div>

          {/* Search & Prompt Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runDiscovery();
            }}
            className="mt-6 flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#242424]/45 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find something useful, build my basket or tell us what you need..."
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-[#F7F5F0] border border-black/12 text-sm text-[#242424] placeholder:text-[#242424]/45 focus:outline-none focus:border-[#242424] focus:bg-white transition-all"
                aria-label="Describe what you need for EDITZ AI"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setResult(null);
                    setErrorMsg(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black cursor-pointer"
                  aria-label="Clear query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsVisualOpen((v) => !v)}
                className={`px-4 py-3.5 rounded-2xl border text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer min-h-[46px] ${
                  isVisualOpen
                    ? 'bg-[#D9A6A0]/20 border-[#D9A6A0] text-[#242424]'
                    : 'bg-[#F7F5F0] border-black/10 text-[#242424] hover:bg-[#F2EFE9]'
                }`}
                title="Visual Product Finder (Photo Search)"
              >
                <Camera className="w-4 h-4 text-[#536B57]" />
                <span className="hidden md:inline">Visual Find</span>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3.5 rounded-2xl bg-[#242424] hover:bg-black text-[#F7F5F0] text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-60 min-h-[46px] whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Finding...</span>
                  </>
                ) : (
                  <>
                    <span>Ask EDITZ AI</span>
                    <ArrowRight className="w-4 h-4 text-[#D9A6A0]" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Optional Filters Strip */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center space-x-1 text-[#242424]/55 font-mono uppercase tracking-wider text-[11px] mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </span>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#F7F5F0] border border-black/10 text-xs font-medium text-[#242424] focus:outline-none cursor-pointer"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              <option value="women">Women</option>
              <option value="men">Men</option>
              <option value="kids">Kids</option>
              <option value="home-lifestyle">Home &amp; Lifestyle</option>
            </select>

            {QUICK_BUDGETS.map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() => setSelectedBudget(b.value)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  selectedBudget === b.value
                    ? 'bg-[#242424] text-white border-[#242424]'
                    : 'bg-white text-[#242424]/75 border-black/10 hover:border-black/25'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* 8 Exact Clickable Discovery Prompts */}
          <div className="mt-5 pt-5 border-t border-black/6">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#242424]/55 mb-2.5">
              Try asking EDITZ AI
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {EXAMPLE_PROMPTS.map((promptText) => (
                <button
                  key={promptText}
                  type="button"
                  onClick={() => handlePromptClick(promptText)}
                  className="text-left px-3.5 py-2.5 rounded-xl bg-[#F7F5F0] hover:bg-[#F2EFE9] border border-black/6 hover:border-black/20 text-xs text-[#242424] font-medium transition-all flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="line-clamp-1">{promptText}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#536B57] shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Visual Product Finder Drawer */}
          {isVisualOpen && (
            <div className="mt-6 p-5 rounded-2xl bg-[#F7F5F0] border border-black/10 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[#242424] flex items-center space-x-2">
                    <Camera className="w-4 h-4 text-[#536B57]" />
                    <span>Visual Everyday Finder</span>
                  </h3>
                  <p className="text-xs text-[#242424]/70 mt-0.5">
                    Upload a photo of a product or space to match live in-stock items from our catalogue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVisualOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer"
                  aria-label="Close visual search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    value={visualNotes}
                    onChange={(e) => setVisualNotes(e.target.value)}
                    placeholder="Optional note (e.g. for my college desk or under ₹500)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-black/10 text-xs text-[#242424] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-7 flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleVisualFile(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={visualLoading}
                    className="px-4 py-2.5 rounded-xl bg-[#242424] text-white text-xs font-semibold flex items-center space-x-2 hover:bg-black cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#D9A6A0]" />
                    <span>{visualLoading ? 'Analysing Photo...' : 'Upload Photo (JPG / PNG / WebP)'}</span>
                  </button>
                  {visualPreview && (
                    <img
                      src={visualPreview}
                      alt="Uploaded search reference"
                      className="w-11 h-11 rounded-lg object-cover border border-black/10"
                    />
                  )}
                </div>
              </div>

              {visualResult && (
                <div className="pt-3 border-t border-black/8">
                  {!visualResult.success ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{visualResult.message}</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {visualResult.analysis && (
                        <div className="p-3.5 rounded-xl bg-white border border-black/8 text-xs text-[#242424]">
                          <span className="font-semibold text-[#536B57]">Detected: </span>
                          <span className="font-bold">{visualResult.analysis.detectedItem}</span>
                          {' — '}
                          <span className="text-[#242424]/75">{visualResult.analysis.honestAssessment}</span>
                        </div>
                      )}
                      {visualResult.matches.length === 0 ? (
                        <p className="text-xs text-[#242424]/70">
                          No close catalogue match found for this photo right now. Try searching with keywords above.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {visualResult.matches.map((m) => (
                            <div key={m.product.id} className="space-y-2">
                              <ProductCard product={m.product} />
                              <p className="text-[11px] text-[#242424]/70 px-1 line-clamp-2">{m.reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error Feedback */}
          {errorMsg && (
            <div className="mt-5 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Grounded AI Discovery Results */}
          {result && (
            <div className="mt-7 pt-7 border-t border-black/10 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#F7F5F0] rounded-2xl p-4 sm:p-5 border border-black/8">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#536B57]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {result.aiMode === 'gemini-grounded'
                        ? 'Grounded EDITZ AI Match'
                        : 'Live Catalogue Intent Match'}
                    </span>
                    {result.intent?.maxBudget && (
                      <span className="text-[#242424]/70">· Budget ≤ ₹{result.intent.maxBudget}</span>
                    )}
                    {result.intent?.category && result.intent.category !== 'all' && (
                      <span className="text-[#242424]/70">· {result.intent.category}</span>
                    )}
                  </div>
                  <p className="text-sm sm:text-base font-medium text-[#242424]">
                    {result.assistantMessage}
                  </p>
                  {result.aiNotice && (
                    <p className="text-[11px] text-[#242424]/60">{result.aiNotice}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleHandoff}
                    className="px-4 py-2.5 rounded-xl bg-white border border-black/12 hover:border-[#242424] text-xs font-semibold text-[#242424] flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Wallet className="w-3.5 h-3.5 text-[#536B57]" />
                    <span>Open in Budget Basket</span>
                  </button>
                  {liveMatches.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddAllMatches}
                      className="px-4 py-2.5 rounded-xl bg-[#242424] hover:bg-black text-white text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-[#D9A6A0]" />
                      <span>Add In-Stock Finds</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Refinement Chips */}
              {result.refinementSuggestions && result.refinementSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#242424]/50">
                    Refine:
                  </span>
                  {result.refinementSuggestions.map((refPrompt) => (
                    <button
                      key={refPrompt}
                      type="button"
                      onClick={() => handlePromptClick(refPrompt)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-black/10 hover:border-[#242424] text-xs font-medium text-[#242424] cursor-pointer transition-colors"
                    >
                      {refPrompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Matched Product Cards with AI Reasons */}
              {liveMatches.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {liveMatches.map((m) => {
                    const liveProd = products.find((p) => p.id === m.product.id) || m.product;
                    return (
                      <div key={liveProd.id} className="flex flex-col gap-2">
                        <ProductCard product={liveProd} />
                        <div
                          onClick={() => openProductModal(liveProd)}
                          className="px-3 py-2 rounded-xl bg-[#F7F5F0] border border-black/6 text-[11px] text-[#242424]/80 leading-snug cursor-pointer hover:border-black/15"
                        >
                          <span className="font-semibold text-[#536B57]">Why it fits: </span>
                          {m.reason}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-[#F7F5F0] border border-black/8 text-center">
                  <p className="text-sm font-medium text-[#242424]">
                    No published products matched that exact filter right now.
                  </p>
                  <p className="text-xs text-[#242424]/65 mt-1">
                    Try widening your budget or switching categories to &ldquo;All Categories&rdquo;.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
