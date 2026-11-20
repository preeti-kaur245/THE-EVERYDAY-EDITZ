import React, { useState, useRef, useEffect } from 'react';
import { useStore, isProductLiveOnStorefront, sortProductsByMerchandising } from '../context/StoreContext';
import { Play, Sparkles, Plus, ChevronRight, Film, Heart } from 'lucide-react';
import { Product, ReelVideo } from '../types';

type ReelSlot =
  | { kind: 'reel'; id: string; reel: ReelVideo; product: Product | null }
  | { kind: 'showcase'; id: string; product: Product };

export const ReelShelfSection: React.FC = () => {
  const {
    reels,
    openReelModal,
    products,
    openProductModal,
    addToCart,
    trackAnalyticsEvent,
    isAdminAuthenticated,
    setIsAdminOpen,
    likedReelIds,
    reelLikesMap,
    toggleReelLike,
  } = useStore();

  const [poppingId, setPoppingId] = useState<string | null>(null);
  const [burstingId, setBurstingId] = useState<string | null>(null);
  const popTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (popTimerRef.current) clearTimeout(popTimerRef.current);
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    };
  }, []);

  const liveProducts = React.useMemo(
    () =>
      sortProductsByMerchandising(
        products.filter((p) => isProductLiveOnStorefront(p) && p.inStock && (p.stockCount ?? 0) > 0)
      ),
    [products]
  );

  const getProduct = React.useCallback(
    (productId?: string): Product | null => {
      if (!productId) return null;
      return products.find((p) => p.id === productId) || null;
    },
    [products]
  );

  // Build up to 6 compact slots: published video reels first, then live in-stock spotlight products if fewer than 6 reels exist
  const slots: ReelSlot[] = React.useMemo(() => {
    const items: ReelSlot[] = [];
    const usedProductIds = new Set<string>();

    for (const reel of (reels || []).slice(0, 6)) {
      const prod = getProduct(reel.product_id);
      if (prod) usedProductIds.add(prod.id);
      items.push({ kind: 'reel', id: `reel-${reel.id}`, reel, product: prod });
    }

    if (items.length < 6) {
      const prioritized = [
        ...liveProducts.filter((p) => p.isTrending || p.isFeatured),
        ...liveProducts,
      ];
      for (const prod of prioritized) {
        if (items.length >= 6) break;
        if (usedProductIds.has(prod.id)) continue;
        usedProductIds.add(prod.id);
        items.push({ kind: 'showcase', id: `showcase-${prod.id}`, product: prod });
      }
    }

    return items.slice(0, 6);
  }, [reels, liveProducts, getProduct]);

  if (slots.length === 0) {
    return null;
  }

  const hasPublishedReels = Boolean(reels && reels.length > 0);

  const triggerHeartTap = (slotId: string, label: string, alreadyLiked: boolean) => {
    if (popTimerRef.current) clearTimeout(popTimerRef.current);
    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);

    setPoppingId(slotId);
    popTimerRef.current = setTimeout(() => setPoppingId(null), 400);

    if (!alreadyLiked) {
      setBurstingId(slotId);
      burstTimerRef.current = setTimeout(() => setBurstingId(null), 600);
    }

    toggleReelLike(slotId, label);
  };

  return (
    <section
      id="reels-section"
      className="py-6 sm:py-10 bg-[#F2EFE9] border-y border-black/8 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Compact Section Header */}
        <div className="flex items-end justify-between mb-3.5 sm:mb-6 gap-2">
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 text-[10px] sm:text-xs font-mono uppercase tracking-wider text-[#536B57] font-semibold">
              <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D9A6A0] shrink-0" />
              <span className="truncate">
                {hasPublishedReels ? 'Studio Reels · Quick Look' : 'See It In Action · 6 Quick Finds'}
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-[#242424] tracking-tight mt-0.5">
              Reels &amp; Spotlight Picks
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdminAuthenticated && !hasPublishedReels && (
              <button
                type="button"
                onClick={() => setIsAdminOpen(true)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#536B57]/10 text-[#536B57] hover:bg-[#536B57]/20 transition-colors cursor-pointer"
              >
                + Upload Reels
              </button>
            )}
            {hasPublishedReels && (
              <button
                type="button"
                onClick={() => {
                  trackAnalyticsEvent('reel_interaction', reels[0]?.title || 'open_all');
                  openReelModal(reels[0]);
                }}
                className="text-[11px] sm:text-xs font-semibold text-[#536B57] flex items-center space-x-0.5 font-mono hover:underline cursor-pointer"
              >
                <span>Watch All ({reels.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Compact 6-Card Grid: 3x2 on Mobile (fits easily in one screen), 6-across on Desktop */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          {slots.map((slot) => {
            const isLiked = likedReelIds.includes(slot.id);
            const isPopping = poppingId === slot.id;
            const isBursting = burstingId === slot.id;

            if (slot.kind === 'reel') {
              const { reel, product } = slot;
              const productAvailable = Boolean(product && product.inStock && (product.stockCount ?? 0) > 0);
              const likeCount = reelLikesMap[slot.id] ?? reel.likes ?? 0;

              return (
                <div
                  key={slot.id}
                  onClick={() => {
                    trackAnalyticsEvent('reel_interaction', reel.title);
                    openReelModal(reel);
                  }}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-black shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between border border-black/10"
                >
                  {reel.thumbnail_url ? (
                    <img
                      src={reel.thumbnail_url}
                      alt={reel.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <video
                      src={reel.video_url}
                      preload="metadata"
                      muted
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover opacity-85"
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/35 pointer-events-none" />

                  {/* Top Row: Category Badge + Interactive Heart & Count Overlay */}
                  <div className="relative z-10 p-1.5 sm:p-2 flex items-center justify-between gap-1">
                    <span className="bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/10 text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider text-[#D9A6A0] truncate max-w-[56%]">
                      {reel.category || 'REEL'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHeartTap(slot.id, reel.title, isLiked);
                      }}
                      aria-label={isLiked ? `Unlike ${reel.title}` : `Like ${reel.title}`}
                      aria-pressed={isLiked}
                      className={`px-1.5 py-0.5 rounded-full backdrop-blur-xs border flex items-center space-x-1 transition-colors cursor-pointer shrink-0 ${
                        isLiked
                          ? 'bg-[#D9A6A0]/25 border-[#D9A6A0]/60 text-white'
                          : 'bg-black/55 border-white/15 text-white/90 hover:bg-black/75'
                      }`}
                    >
                      <Heart
                        className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-colors ${
                          isPopping ? 'animate-heart-tap' : ''
                        } ${isLiked ? 'fill-[#D9A6A0] text-[#D9A6A0]' : 'text-white'}`}
                      />
                      <span className="text-[9px] sm:text-[10px] font-mono font-semibold tabular-nums leading-none">
                        {likeCount}
                      </span>
                    </button>
                  </div>

                  {/* Center Subtle Play Badge & Heart-Tap Floating Burst */}
                  <div className="relative z-10 flex items-center justify-center pointer-events-none">
                    {isBursting ? (
                      <div className="animate-heart-burst flex items-center justify-center">
                        <Heart className="w-8 h-8 sm:w-10 sm:h-10 fill-[#D9A6A0] text-[#D9A6A0] drop-shadow-lg" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/35 backdrop-blur-xs border border-white/25 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white ml-0.5" />
                      </div>
                    )}
                  </div>

                  {/* Bottom Title, Price & Quick Add */}
                  <div className="relative z-10 p-1.5 sm:p-2.5 space-y-1">
                    <h3 className="text-white text-[10px] sm:text-xs font-semibold truncate leading-tight">
                      {reel.title}
                    </h3>

                    <div className="flex items-center justify-between gap-1">
                      {product ? (
                        <span className="font-mono font-bold text-[#D9A6A0] text-[10px] sm:text-[11px] truncate">
                          ₹{product.price}
                        </span>
                      ) : (
                        <span className="text-[9px] text-white/70 font-mono">Watch</span>
                      )}

                      {product && productAvailable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            trackAnalyticsEvent('reel_interaction', `quick_add:${product.id}`);
                            addToCart(product, 1);
                          }}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#D9A6A0] hover:bg-[#c8958f] text-[#242424] flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                          aria-label={`Add ${product.name} to bag`}
                          title="Quick Add to Bag"
                        >
                          <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            const { product } = slot;
            const imgSrc = product.primaryImage || product.images?.[0];
            const likeCount = reelLikesMap[slot.id] ?? 0;

            return (
              <div
                key={slot.id}
                onClick={() => {
                  trackAnalyticsEvent('reel_interaction', `spotlight:${product.id}`);
                  openProductModal(product);
                }}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#242424] shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between border border-black/10"
              >
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/30 pointer-events-none" />

                {/* Top Row: Department Badge + Interactive Heart & Count Overlay */}
                <div className="relative z-10 p-1.5 sm:p-2 flex items-center justify-between gap-1">
                  <span className="bg-black/55 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-white/10 text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider text-white/90 truncate max-w-[54%]">
                    {product.departments?.[0] === 'home-lifestyle' ? 'HOME' : (product.departments?.[0] || 'EDIT')}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerHeartTap(slot.id, product.name, isLiked);
                    }}
                    aria-label={isLiked ? `Unlike ${product.name}` : `Like ${product.name}`}
                    aria-pressed={isLiked}
                    className={`px-1.5 py-0.5 rounded-full backdrop-blur-xs border flex items-center space-x-1 transition-colors cursor-pointer shrink-0 ${
                      isLiked
                        ? 'bg-[#D9A6A0]/25 border-[#D9A6A0]/60 text-white'
                        : 'bg-black/55 border-white/15 text-white/90 hover:bg-black/75'
                    }`}
                  >
                    <Heart
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-colors ${
                        isPopping ? 'animate-heart-tap' : ''
                      } ${isLiked ? 'fill-[#D9A6A0] text-[#D9A6A0]' : 'text-white'}`}
                    />
                    <span className="text-[9px] sm:text-[10px] font-mono font-semibold tabular-nums leading-none">
                      {likeCount}
                    </span>
                  </button>
                </div>

                {/* Center Subtle Spotlight Indicator or Heart-Tap Burst */}
                <div className="relative z-10 flex items-center justify-center pointer-events-none">
                  {isBursting ? (
                    <div className="animate-heart-burst flex items-center justify-center">
                      <Heart className="w-8 h-8 sm:w-10 sm:h-10 fill-[#D9A6A0] text-[#D9A6A0] drop-shadow-lg" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/25 backdrop-blur-xs border border-white/15 flex items-center justify-center text-[#D9A6A0]/90 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
                      <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </div>
                  )}
                </div>

                <div className="relative z-10 p-1.5 sm:p-2.5 space-y-1">
                  <h3 className="text-white text-[10px] sm:text-xs font-semibold truncate leading-tight">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-bold text-[#D9A6A0] text-[10px] sm:text-[11px]">
                      ₹{product.price}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        trackAnalyticsEvent('reel_interaction', `quick_add:${product.id}`);
                        addToCart(product, 1);
                      }}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#D9A6A0] hover:bg-[#c8958f] text-[#242424] flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                      aria-label={`Add ${product.name} to bag`}
                      title="Quick Add to Bag"
                    >
                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
