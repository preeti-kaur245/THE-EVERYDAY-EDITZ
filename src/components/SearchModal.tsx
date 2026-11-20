import React, { useState, useMemo } from 'react';
import { useStore, isProductLiveOnStorefront, sortProductsByMerchandising } from '../context/StoreContext';
import { 
  X, 
  Search, 
  TrendingUp, 
  Clock, 
  ArrowRight, 
  Shield,
  Sparkles
} from 'lucide-react';
import { ProductIllustration } from './ProductIllustration';

export const SearchModal: React.FC = () => {
  const { 
    isSearchOpen, 
    setIsSearchOpen, 
    products, 
    openProductModal,
    navigateToEditzAI,
    recordSearchSignal
  } = useStore();

  const [term, setTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [priceCap, setPriceCap] = useState<number | null>(null);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [saveHistory, setSaveHistory] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Vegan leather desk pad',
    'Heat bag sealer',
    'Travel clothes steamer',
  ]);

  const popularSearches = [
    'Travel toiletry organiser',
    'Silicone scalp massager',
    'Cable organiser pouch',
    'Period heating bag',
    'Shoe cleaning kit',
    'Kids activity books',
    'Desk cable management',
    'Packing cube sets',
  ];

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    const hasFilter = deptFilter !== 'all' || priceCap !== null || inStockOnly;
    if (!q && !hasFilter) return [];

    const tokens = q.split(/\s+/).filter((t) => t.length >= 2 && !['for', 'under', 'with', 'the', 'and', 'find', 'show'].includes(t));

    return sortProductsByMerchandising(
      products.filter((p) => {
        if (!isProductLiveOnStorefront(p)) return false;
        if (deptFilter !== 'all' && !(p.departments || []).includes(deptFilter as any)) return false;
        if (priceCap !== null && p.price > priceCap) return false;
        if (inStockOnly && (!p.inStock || (p.stockCount ?? 0) <= 0)) return false;
        if (!q) return true;

        const haystack = [
          p.name,
          p.tagline || '',
          p.category || '',
          p.needCategory || '',
          p.editorial?.problemItSolves || '',
          ...(p.tags || []),
          ...(p.aiTags || []),
          ...(p.useCases || []),
          ...(p.moments || []),
          ...(p.departments || []),
          ...(p.subcategories || []),
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(q) || (tokens.length > 0 && tokens.some((tok) => haystack.includes(tok)));
      })
    ).slice(0, 10);
  }, [term, products, deptFilter, priceCap, inStockOnly]);

  if (!isSearchOpen) return null;

  const handleSelectRecent = (queryText: string) => {
    setTerm(queryText);
  };

  const handleClearHistory = () => {
    setRecentSearches([]);
  };

  const handleSelectProduct = (product: any) => {
    if (saveHistory && term.trim() && !recentSearches.includes(term.trim())) {
      setRecentSearches((prev) => [term.trim(), ...prev.slice(0, 4)]);
    }
    if (term.trim()) {
      recordSearchSignal(term.trim());
    }
    setIsSearchOpen(false);
    openProductModal(product);
  };

  const handleAskEditzAi = () => {
    const queryToSend = term.trim() || 'Show me trending everyday products.';
    if (term.trim()) recordSearchSignal(term.trim());
    setIsSearchOpen(false);
    navigateToEditzAI(queryToSend, 'finder');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 pt-10 sm:pt-16 animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-2xl bg-[#F7F5F0] rounded-3xl shadow-2xl border border-black/10 overflow-hidden flex flex-col">
        
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 bg-white border-b border-black/8 space-y-3">
          <div className="flex items-center space-x-3">
            <Search className="w-5 h-5 text-black/50 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search naturally... (e.g. gifts under 500, travel pouch, hostel)"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="flex-1 text-sm bg-transparent border-none focus:outline-hidden text-[#242424] placeholder:text-black/40 font-medium"
            />
            {term && (
              <button
                onClick={() => setTerm('')}
                className="text-xs text-black/40 hover:text-black p-1 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              onClick={handleAskEditzAi}
              className="px-3 py-1.5 bg-[#536B57] hover:bg-[#435746] text-white text-[11px] font-semibold rounded-xl flex items-center space-x-1 transition-colors cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask EDITZ AI</span>
            </button>
            <button
              onClick={() => setIsSearchOpen(false)}
              className="p-1.5 text-black/60 hover:text-black rounded-full hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Filter Strip */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {[
              { id: 'all', label: 'All Depts' },
              { id: 'women', label: 'Women' },
              { id: 'men', label: 'Men' },
              { id: 'kids', label: 'Kids' },
              { id: 'home-lifestyle', label: 'Home' },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDeptFilter(d.id)}
                className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  deptFilter === d.id
                    ? 'bg-[#242424] text-white border-[#242424]'
                    : 'bg-[#F7F5F0] text-[#242424]/75 border-black/10 hover:bg-black/5'
                }`}
              >
                {d.label}
              </button>
            ))}

            <span className="text-black/20 mx-0.5">|</span>

            {[
              { label: 'Any ₹', val: null },
              { label: '≤ ₹299', val: 299 },
              { label: '≤ ₹499', val: 499 },
              { label: '≤ ₹999', val: 999 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPriceCap(p.val)}
                className={`px-2.5 py-1 rounded-lg border font-mono transition-colors cursor-pointer ${
                  priceCap === p.val
                    ? 'bg-[#536B57] text-white border-[#536B57]'
                    : 'bg-[#F7F5F0] text-[#242424]/75 border-black/10 hover:bg-black/5'
                }`}
              >
                {p.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setInStockOnly((v) => !v)}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ml-auto ${
                inStockOnly
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                  : 'bg-[#F7F5F0] text-[#242424]/65 border-black/10'
              }`}
            >
              In Stock Only
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[68vh] overflow-y-auto space-y-6">
          
          {/* Active Live Results */}
          {(term.trim() || deptFilter !== 'all' || priceCap !== null || inStockOnly) ? (
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-[#536B57] uppercase tracking-wider mb-3">
                <span>Matching Curations ({results.length})</span>
                <button
                  type="button"
                  onClick={handleAskEditzAi}
                  className="text-[#536B57] font-semibold underline cursor-pointer normal-case"
                >
                  Open full EDITZ AI recommendations →
                </button>
              </div>

              {results.length > 0 ? (
                <div className="space-y-2.5">
                  {results.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="bg-white p-3.5 rounded-xl border border-black/8 hover:border-black/20 transition-all flex items-center justify-between cursor-pointer group shadow-xs"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-[#F7F5F0] overflow-hidden shrink-0">
                          {product.primaryImage || product.images?.[0] ? (
                            <img
                              src={product.primaryImage || product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ProductIllustration productId={product.id} className="w-full h-full scale-75" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-[#242424] truncate group-hover:text-black">
                            {product.name}
                          </h4>
                          <span className="text-[10px] text-black/50 font-mono">
                            {product.subcategories?.[0] || product.needCategory}
                            {product.discountPercent > 0 ? ` · ${product.discountPercent}% OFF` : ''}
                            {!product.inStock || (product.stockCount ?? 0) <= 0 ? ' · Out of Stock' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <span className="text-xs font-bold font-mono text-[#242424]">
                          ₹{product.price}
                        </span>
                        <ArrowRight className="w-4 h-4 text-black/30 group-hover:text-black group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center space-y-3 text-xs text-black/60">
                  <p>No direct keyword match for "{term || 'selected filters'}".</p>
                  <button
                    type="button"
                    onClick={handleAskEditzAi}
                    className="px-4 py-2 bg-[#536B57] text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Let EDITZ AI Find Alternatives</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Popular Searches Tags */}
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-mono uppercase tracking-wider text-[#536B57] mb-3">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Popular Searches in India</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setTerm(tag)}
                      className="px-3 py-1.5 bg-white hover:bg-[#FAF8F5] border border-black/8 hover:border-black/15 text-xs text-[#242424]/80 rounded-lg transition-colors cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-black/50 mb-3">
                    <span className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Recent Searches</span>
                    </span>
                    <button
                      onClick={handleClearHistory}
                      className="text-[10px] text-black/40 hover:text-black underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {recentSearches.map((rec) => (
                      <div
                        key={rec}
                        onClick={() => handleSelectRecent(rec)}
                        className="py-1.5 px-3 rounded-lg hover:bg-white text-xs text-[#242424] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span>{rec}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-black/30" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Privacy control */}
              <div className="pt-4 border-t border-black/8 flex items-center justify-between text-xs text-black/60">
                <span className="flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#536B57]" />
                  <span>Store search history locally</span>
                </span>
                <button
                  onClick={() => setSaveHistory(!saveHistory)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                    saveHistory ? 'bg-[#536B57]' : 'bg-zinc-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    saveHistory ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
