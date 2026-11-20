import React from 'react';
import { Product } from '../types';
import { useStore, isProductLiveOnStorefront } from '../context/StoreContext';
import { Heart, Plus, Star, Eye, Bell } from 'lucide-react';
import { ProductIllustration } from './ProductIllustration';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    openProductModal,
    addToCart,
    toggleWishlist,
    isInWishlist,
    setWaitlistProduct,
    setIsWaitlistOpen,
  } = useStore();

  const isFavorited = isInWishlist(product.id);
  const primaryImg = product.primaryImage || product.images?.[0];
  const secondaryImg = product.images && product.images.length > 1 ? product.images[1] : null;
  const isAvailable = isProductLiveOnStorefront(product) && product.inStock && (product.stockCount ?? 0) > 0;
  const descriptiveAlt = `${product.name} — ${product.subcategories?.[0] || 'Everyday Essential'} | The Everyday Editz`;

  return (
    <div className="group relative bg-white rounded-2xl border border-black/8 hover:border-black/15 transition-all duration-200 flex flex-col justify-between overflow-hidden hover:-translate-y-0.5 hover:shadow-md">
      {/* Top Image Showcase Area */}
      <div
        onClick={() => openProductModal(product)}
        className="relative w-full aspect-4/3 bg-[#F2EFE9] overflow-hidden cursor-pointer select-none"
      >
        {primaryImg ? (
          <>
            <img
              src={primaryImg}
              alt={descriptiveAlt}
              className={`w-full h-full object-cover transform transition-transform duration-500 ease-out group-hover:scale-105 ${!isAvailable ? 'opacity-70 grayscale-[30%]' : ''}`}
              loading="lazy"
              decoding="async"
            />
            {secondaryImg && (
              <img
                src={secondaryImg}
                alt={`${product.name} alternate view`}
                className="hidden md:block absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                loading="lazy"
                decoding="async"
              />
            )}
          </>
        ) : (
          <ProductIllustration
            productId={product.id}
            className="w-full h-full transform group-hover:scale-105 transition-transform duration-300"
          />
        )}

        {/* Top Badges & Wishlist Button */}
        <div className="absolute top-2 sm:top-2.5 left-2 sm:left-2.5 right-2 sm:right-2.5 flex items-center justify-between pointer-events-none">
          <div className="flex items-center space-x-1 max-w-[70%] truncate">
            {!isAvailable ? (
              <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-white bg-red-600/95 backdrop-blur-xs px-1.5 py-0.5 rounded shadow-xs">
                OUT OF STOCK
              </span>
            ) : product.isBestSeller ? (
              <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-amber-900 bg-amber-100/90 backdrop-blur-xs px-1.5 py-0.5 rounded shadow-xs truncate">
                BEST SELLER
              </span>
            ) : product.isNewArrival ? (
              <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-emerald-900 bg-emerald-100/90 backdrop-blur-xs px-1.5 py-0.5 rounded shadow-xs">
                NEW
              </span>
            ) : product.isTrending ? (
              <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-[#242424] bg-[#D9A6A0]/90 backdrop-blur-xs px-1.5 py-0.5 rounded shadow-xs">
                TRENDING
              </span>
            ) : product.discountPercent > 0 ? (
              <span className="text-[9px] sm:text-[10px] font-mono font-semibold tracking-wider text-[#536B57] bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded shadow-xs">
                {product.discountPercent}% OFF
              </span>
            ) : null}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            className="pointer-events-auto w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 backdrop-blur-xs border border-black/5 flex items-center justify-center text-[#242424] hover:text-[#D9A6A0] transition-colors shadow-xs cursor-pointer ml-auto shrink-0"
            aria-label={isFavorited ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                isFavorited ? 'fill-[#D9A6A0] text-[#D9A6A0]' : 'text-current'
              }`}
            />
          </button>
        </div>

        {/* Quick View Hover Button (Desktop only) */}
        <div className="hidden sm:flex absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openProductModal(product);
            }}
            className="w-full py-2 bg-white/95 backdrop-blur-md text-[#242424] text-xs font-semibold rounded-lg shadow-sm border border-black/5 hover:bg-white flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#536B57]" />
            <span>Quick Editorial View</span>
          </button>
        </div>
      </div>

      {/* Card Info Content */}
      <div className="p-2.5 sm:p-4 flex flex-col justify-between flex-1 min-w-0">
        <div>
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] text-[#242424]/60 font-mono uppercase tracking-wider mb-1 truncate">
            <span className="truncate">{product.subcategories?.[0] || 'Everyday Editz'}</span>
            {product.reviewCount > 0 && product.rating > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="flex items-center text-[#242424]/75 shrink-0">
                  <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500 fill-amber-500 mr-0.5" />
                  <span>{product.rating}</span>
                </span>
              </>
            )}
          </div>

          <h3
            onClick={() => openProductModal(product)}
            className="text-xs sm:text-sm font-semibold text-[#242424] leading-snug line-clamp-2 hover:text-black transition-colors cursor-pointer min-h-[2rem] sm:min-h-[2.5rem]"
            title={product.name}
          >
            {product.name}
          </h3>

          <p className="text-[11px] sm:text-xs text-[#242424]/70 line-clamp-1 mt-0.5">
            {product.tagline}
          </p>
        </div>

        {/* Price & Action Row */}
        <div className="pt-2 sm:pt-3 mt-2 sm:mt-3 border-t border-black/5 flex items-center justify-between gap-1">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:space-x-1.5 min-w-0">
            <span className="text-sm sm:text-base font-bold text-[#242424] font-mono tabular-nums truncate">
              ₹{product.price}
            </span>
            {product.originalPrice > product.price && (
              <del className="text-[10px] sm:text-xs text-black/40 font-mono tabular-nums">
                ₹{product.originalPrice}
              </del>
            )}
          </div>

          {isAvailable ? (
            <button
              onClick={() => addToCart(product, 1)}
              className="px-2.5 sm:px-3 py-1.5 bg-[#F7F5F0] hover:bg-[#242424] text-[#242424] hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 border border-black/8 hover:border-[#242424] cursor-pointer shrink-0"
              aria-label={`Add ${product.name} to bag`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">Add</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setWaitlistProduct(product);
                setIsWaitlistOpen(true);
              }}
              className="px-2.5 sm:px-3 py-1.5 bg-[#D9A6A0]/15 hover:bg-[#D9A6A0]/30 text-[#242424] rounded-lg text-[10px] sm:text-xs font-semibold transition-all flex items-center space-x-1 border border-[#D9A6A0]/40 cursor-pointer shrink-0"
              aria-label={`Notify me when ${product.name} is back in stock`}
            >
              <Bell className="w-3 h-3" />
              <span>Notify</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

