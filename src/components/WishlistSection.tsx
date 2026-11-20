import React from 'react';
import { useStore, isProductLiveOnStorefront } from '../context/StoreContext';
import { Heart, ShoppingBag, Trash2, Bell } from 'lucide-react';
import { ProductIllustration } from './ProductIllustration';

export const WishlistSection: React.FC = () => {
  const {
    wishlist,
    products,
    addToCart,
    toggleWishlist,
    openProductModal,
    wishlistRestockAlerts,
    toggleWishlistRestockAlert,
  } = useStore();

  const savedProducts = products.filter((p) => isProductLiveOnStorefront(p) && wishlist.includes(p.id));

  if (savedProducts.length === 0) return null;

  return (
    <section id="wishlist-section" className="py-12 sm:py-16 bg-[#F7F5F0] border-b border-black/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-black/8">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-mono uppercase tracking-wider text-[#D9A6A0] mb-1">
              <Heart className="w-3.5 h-3.5 fill-[#D9A6A0]" />
              <span>Saved For Later</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#242424] tracking-tight">
              Your Wishlist ({savedProducts.length})
            </h2>
          </div>

          <span className="text-xs text-black/50 font-mono hidden sm:inline">
            Saved across sessions · Opt-in drop alerts
          </span>
        </div>

        {/* Saved Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {savedProducts.map((product) => {
            const primaryImg = product.primaryImage || product.images?.[0];
            const alertActive = wishlistRestockAlerts.includes(product.id);
            const isInStock = product.inStock && (product.stockCount ?? 0) > 0;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-black/8 overflow-hidden flex flex-col justify-between hover:shadow-sm transition-all min-w-0"
              >
                <div 
                  onClick={() => openProductModal(product)}
                  className="w-full aspect-4/3 bg-[#F2EFE9] overflow-hidden cursor-pointer relative"
                >
                  {primaryImg ? (
                    <img
                      src={primaryImg}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <ProductIllustration productId={product.id} className="w-full h-full" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(product.id);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs border border-black/5 text-black/40 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-2.5 sm:p-4 flex flex-col justify-between flex-1 min-w-0">
                  <div>
                    <h4 
                      onClick={() => openProductModal(product)}
                      className="text-xs font-semibold text-[#242424] line-clamp-2 cursor-pointer hover:underline min-h-[2rem]"
                    >
                      {product.name}
                    </h4>
                    <div className="text-xs font-bold font-mono text-[#242424] mt-1 tabular-nums">
                      ₹{product.price}
                    </div>
                  </div>

                  <div className="pt-2 sm:pt-3 mt-2 sm:mt-3 border-t border-black/5 space-y-1.5">
                    {isInStock ? (
                      <button
                        onClick={() => {
                          addToCart(product, 1);
                          toggleWishlist(product.id);
                        }}
                        className="w-full py-2 bg-[#242424] hover:bg-black text-white text-xs font-medium rounded-lg flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-[#D9A6A0]" />
                        <span>Move to Bag</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 bg-zinc-200 text-zinc-500 text-xs font-medium rounded-lg cursor-not-allowed"
                      >
                        Out of Stock
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleWishlistRestockAlert(product)}
                      className={`w-full py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center space-x-1 border transition-colors cursor-pointer ${
                        alertActive
                          ? 'bg-[#536B57]/10 text-[#536B57] border-[#536B57]/30 font-semibold'
                          : 'bg-[#FAF8F5] text-black/65 border-black/8 hover:text-black'
                      }`}
                    >
                      <Bell className="w-3 h-3" />
                      <span>
                        {alertActive
                          ? 'Alert Enabled'
                          : isInStock
                          ? 'Price / Drop Alert'
                          : 'Notify When Restocked'}
                      </span>
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
