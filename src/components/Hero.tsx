import React from 'react';
import { useStore, isProductLiveOnStorefront, sortProductsByMerchandising } from '../context/StoreContext';
import { ArrowUpRight, Compass, Sparkles } from 'lucide-react';
import { ProductIllustration } from './ProductIllustration';

interface HeroProps {
  onExploreClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreClick }) => {
  const { settings, setIsReelsOpen, openProductModal, products, navigateToEditzAI } = useStore();
  const [heroAiQuery, setHeroAiQuery] = React.useState('');

  const liveProducts = sortProductsByMerchandising(products.filter(isProductLiveOnStorefront));
  const featuredProduct =
    liveProducts.find((p) => p.isFeatured) ||
    liveProducts.find((p) => p.id === 'prod-magdock-pad') ||
    liveProducts[0];

  const featuredImage = featuredProduct?.primaryImage || featuredProduct?.images?.[0];

  const handleHeroAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroAiQuery.trim();
    if (!q) {
      navigateToEditzAI(undefined, 'finder');
      return;
    }
    navigateToEditzAI(q, 'finder');
  };

  return (
    <section className="relative overflow-hidden bg-[#F7F5F0] pt-8 pb-12 sm:pt-14 sm:pb-20 border-b border-black/8">
      {/* Subtle architectural grid line background */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-stretch">
          
          {/* Left Column: Brand Statement & Primary Direct Route */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              {/* Quiet unboxed kicker */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono tracking-wider text-[#536B57] uppercase mb-4">
                <span className="w-2 h-2 rounded-full bg-[#536B57]" />
                <span>{settings.brandTagline || 'Your everyday. A little smarter.'}</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#242424] tracking-tight leading-[1.08] text-balance mb-6">
                {settings.heroHeadline}
              </h1>

              {/* Refined Subtitle */}
              <p className="text-base sm:text-lg text-[#242424]/80 leading-relaxed max-w-xl mb-6">
                {settings.heroSubtitle}
              </p>

              {/* Inline EDITZ AI Discovery Bar */}
              <form
                onSubmit={handleHeroAiSubmit}
                className="mb-6 max-w-xl bg-white rounded-2xl border border-black/12 p-1.5 shadow-xs flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#536B57]/30"
              >
                <Sparkles className="w-4 h-4 text-[#536B57] ml-2.5 shrink-0" />
                <input
                  type="text"
                  value={heroAiQuery}
                  onChange={(e) => setHeroAiQuery(e.target.value)}
                  placeholder="Ask EDITZ AI: hostel essentials, gifts under ₹1,000, travel..."
                  className="flex-1 bg-transparent text-xs sm:text-sm text-[#242424] placeholder:text-black/40 focus:outline-hidden py-2"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#536B57] hover:bg-[#435746] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0 flex items-center space-x-1"
                >
                  <span>Ask EDITZ AI</span>
                </button>
              </form>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <button
                  onClick={onExploreClick}
                  className="px-6 py-3.5 bg-[#242424] text-[#F7F5F0] rounded-xl hover:bg-black transition-all font-medium text-sm flex items-center space-x-2 shadow-sm cursor-pointer"
                >
                  <span>Explore The Edit</span>
                  <ArrowUpRight className="w-4 h-4 text-[#D9A6A0]" />
                </button>

                <button
                  onClick={() => navigateToEditzAI(undefined, 'finder')}
                  className="px-5 py-3.5 bg-[#FAF8F5] border border-[#536B57]/30 text-[#536B57] rounded-xl hover:bg-[#536B57]/10 transition-all font-semibold text-sm flex items-center space-x-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>EDITZ AI Finder</span>
                </button>

                <button
                  onClick={() => setIsReelsOpen(true)}
                  className="px-5 py-3.5 bg-white border border-black/15 text-[#242424] rounded-xl hover:bg-[#F2EFE9] transition-all font-medium text-sm flex items-center space-x-2 cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-[#536B57]" />
                  <span>See It In Action</span>
                </button>
              </div>
            </div>

            {/* Proof Metric Strip */}
            <div className="pt-8 sm:pt-10 mt-6 sm:mt-8 border-t border-black/8 grid grid-cols-3 gap-2 sm:gap-4 text-[#242424]">
              <div>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">100%</div>
                <div className="text-[10px] sm:text-xs text-[#242424]/70 mt-0.5">Prepaid & Verified</div>
              </div>
              <div>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">48 Hrs</div>
                <div className="text-[10px] sm:text-xs text-[#242424]/70 mt-0.5">Express Dispatch</div>
              </div>
              <div>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">7 Days</div>
                <div className="text-[10px] sm:text-xs text-[#242424]/70 mt-0.5">Replacement Promise</div>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Featured Campaign Spotlight Card */}
          {featuredProduct && (
            <div className="lg:col-span-5 flex flex-col">
              <div className="relative flex-1 bg-white rounded-2xl border border-black/10 p-6 flex flex-col justify-between shadow-sm overflow-hidden group">
                {/* Top Meta Bar */}
                <div className="flex items-center justify-between text-xs text-[#242424]/60 font-mono mb-4">
                  <span className="flex items-center space-x-1.5 text-[#536B57]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="font-semibold uppercase tracking-wider">Featured Spotlight</span>
                  </span>
                  <span className="tabular-nums">
                    ₹{featuredProduct.price}
                    {featuredProduct.originalPrice > featuredProduct.price && (
                      <> · <del className="text-black/40">₹{featuredProduct.originalPrice}</del></>
                    )}
                  </span>
                </div>

                {/* Product Visual */}
                <div
                  onClick={() => openProductModal(featuredProduct)}
                  className="my-auto py-3 flex items-center justify-center cursor-pointer"
                >
                  <div className="w-full aspect-4/3 rounded-xl bg-[#F2EFE9] border border-black/5 overflow-hidden relative shadow-inner">
                    {featuredImage ? (
                      <img
                        src={featuredImage}
                        alt={`${featuredProduct.name} — Featured at The Everyday Editz`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <ProductIllustration productId={featuredProduct.id} className="w-full h-full" />
                    )}
                    {featuredProduct.discountPercent > 0 && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-white/95 text-[#536B57] font-mono text-[11px] font-bold shadow-xs">
                        {featuredProduct.discountPercent}% OFF
                      </span>
                    )}
                    {(!featuredProduct.inStock || featuredProduct.stockCount <= 0) && (
                      <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-red-600 text-white font-mono text-[10px] font-bold">
                        OUT OF STOCK
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer Details */}
                <div className="pt-4 border-t border-black/8 flex items-center justify-between">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-[#242424] truncate">
                      {featuredProduct.name}
                    </h2>
                    <p className="text-xs text-[#242424]/70 line-clamp-1 mt-0.5">
                      {featuredProduct.tagline}
                    </p>
                  </div>

                  <button
                    onClick={() => openProductModal(featuredProduct)}
                    className="px-3.5 py-1.5 bg-[#F2EFE9] hover:bg-[#242424] hover:text-white transition-colors text-xs font-medium rounded-lg shrink-0 ml-3 cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
};

