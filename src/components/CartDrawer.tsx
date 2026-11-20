import React, { useState } from 'react';
import { useStore, isProductLiveOnStorefront } from '../context/StoreContext';
import { 
  X, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight, 
  Tag, 
  Check, 
  Gift, 
  Truck,
  AlertTriangle
} from 'lucide-react';
import { ProductIllustration } from './ProductIllustration';

export const CartDrawer: React.FC = () => {
  const { 
    isCartOpen, 
    setIsCartOpen, 
    cart, 
    updateCartQuantity, 
    removeFromCart, 
    cartSubtotal, 
    cartCount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    couponDiscount,
    redeemedPointsDiscount,
    shippingFee,
    cartTotal,
    cartStockIssues,
    hasCartStockIssue,
    settings,
    setIsCheckoutOpen,
    rewardsBalance,
    pointsToRedeemAtCheckout,
    setPointsToRedeemAtCheckout,
    currentCustomer,
    navigateToAuth,
    showToast
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  if (!isCartOpen) return null;

  const freeShippingRemainder = Math.max(0, settings.freeShippingThreshold - cartSubtotal);
  const freeShippingProgress = Math.min(100, Math.round((cartSubtotal / settings.freeShippingThreshold) * 100));

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput.trim()) return;

    const res = applyCoupon(couponInput);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponInput('');
    }
  };

  const handleToggleRewardsRedemption = () => {
    if (pointsToRedeemAtCheckout > 0) {
      setPointsToRedeemAtCheckout(0);
      showToast('Removed reward points redemption', 'info');
    } else {
      const maxAllowed = Math.min(rewardsBalance, Math.round(cartSubtotal * 0.4));
      if (maxAllowed <= 0) {
        showToast('Cart too low or no points to redeem', 'warning');
        return;
      }
      setPointsToRedeemAtCheckout(maxAllowed);
      showToast(`Redeemed ${maxAllowed} Editz Points for ₹${maxAllowed} off!`);
    }
  };

  const handleCheckoutClick = () => {
    if (hasCartStockIssue) {
      showToast('Please remove or adjust unavailable items before checkout.', 'warning');
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      
      {/* Drawer panel */}
      <div className="relative w-full max-w-md bg-[#F7F5F0] h-full shadow-2xl flex flex-col justify-between border-l border-black/10 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-black/8 bg-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-[#242424]" />
            <h2 className="text-base font-bold text-[#242424]">
              Shopping Bag ({cartCount})
            </h2>
          </div>

          <button
            onClick={() => setIsCartOpen(false)}
            className="p-1.5 text-black/60 hover:text-black rounded-full hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="Close bag"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        <div className="bg-[#FAF8F5] p-3.5 border-b border-black/8 text-xs">
          <div className="flex items-center justify-between mb-1.5 font-medium text-[#242424]">
            <span className="flex items-center space-x-1">
              <Truck className="w-3.5 h-3.5 text-[#536B57]" />
              {freeShippingRemainder > 0 ? (
                <span>Add <strong className="font-mono text-[#536B57]">₹{freeShippingRemainder}</strong> more for Free Delivery</span>
              ) : (
                <span className="text-[#536B57] font-semibold">🎉 You unlocked Complimentary Express Delivery!</span>
              )}
            </span>
            <span className="font-mono text-[11px] text-black/50">{freeShippingProgress}%</span>
          </div>

          <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#536B57] transition-all duration-300 rounded-full"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {hasCartStockIssue && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Catalogue Availability Updated</span>
              </div>
              {cartStockIssues.map((issue, idx) => (
                <p key={idx} className="text-[11px] text-amber-800">{issue.message}</p>
              ))}
            </div>
          )}

          {cart.length > 0 ? (
            cart.map((item, idx) => {
              const matchedVariant = item.variantId ? item.product.variantItems?.find((v) => v.id === item.variantId) : undefined;
              const liveStock = matchedVariant ? matchedVariant.stockCount : item.product.stockCount;
              const liveInStock = (matchedVariant ? matchedVariant.inStock : item.product.inStock) && isProductLiveOnStorefront(item.product) && (liveStock ?? 0) > 0;
              const atMaxStock = typeof liveStock === 'number' && item.quantity >= liveStock;

              return (
              <div 
                key={`${item.product.id}-${item.variantId || item.selectedVariant || idx}`}
                className={`bg-white p-3.5 rounded-xl border flex space-x-3.5 items-center ${!liveInStock ? 'border-red-300 bg-red-50/40' : 'border-black/8'}`}
              >
                {/* Product thumbnail */}
                <div className="w-16 h-16 rounded-lg bg-[#F7F5F0] overflow-hidden shrink-0 border border-black/5">
                  {item.variantImage || item.product.primaryImage || item.product.images?.[0] ? (
                    <img 
                      src={item.variantImage || item.product.primaryImage || item.product.images[0]} 
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ProductIllustration productId={item.product.id} className="w-full h-full scale-75" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-[#242424] truncate">
                    {item.product.name}
                  </h4>
                  {item.selectedVariant && (
                    <div className="text-[10px] text-[#536B57] font-semibold font-mono mt-0.5">
                      {item.selectedVariant}
                    </div>
                  )}
                  {!liveInStock && (
                    <div className="text-[10px] font-bold text-red-600 mt-0.5">
                      Unavailable / Out of Stock — Remove to continue
                    </div>
                  )}
                  {item.variantSku && (
                    <div className="text-[9px] text-black/40 font-mono">
                      SKU: {item.variantSku}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-black/15 rounded-md bg-[#F7F5F0]">
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1, item.selectedVariant, item.variantId)}
                        className="p-1 text-black/60 hover:text-black cursor-pointer"
                        aria-label="Decrease"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-[11px] font-bold font-mono">{item.quantity}</span>
                      <button
                        disabled={!liveInStock || atMaxStock}
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1, item.selectedVariant, item.variantId)}
                        className="p-1 text-black/60 hover:text-black cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Increase"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-[#242424]">
                        ₹{(item.unitPrice ?? item.product.price) * item.quantity}
                      </span>
                      {item.quantity > 1 && (
                        <div className="text-[9px] text-black/40 font-mono">
                          (₹{item.unitPrice ?? item.product.price} each)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeFromCart(item.product.id, item.selectedVariant, item.variantId)}
                  className="p-1.5 text-black/30 hover:text-red-600 transition-colors cursor-pointer"
                  title="Remove from bag"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              );
            })
          ) : (
            <div className="py-20 text-center text-xs text-[#242424]/60">
              <ShoppingBag className="w-12 h-12 text-black/20 mx-auto mb-3" />
              <p className="font-semibold text-sm text-[#242424]">Your bag is empty</p>
              <p className="mt-1">Add curated finds from The Daily Edit or Shop All.</p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="mt-4 px-4 py-2 bg-[#242424] text-white rounded-lg text-xs font-medium hover:bg-black cursor-pointer"
              >
                Browse Curations
              </button>
            </div>
          )}
        </div>

        {/* Footer with Coupons, Loyalty Points, Subtotal & Checkout */}
        {cart.length > 0 && (
          <div className="bg-white p-5 border-t border-black/8 space-y-4">
            
            {/* Coupon Code section */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg text-xs">
                  <div className="flex items-center space-x-1.5 text-emerald-800">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Coupon <strong>{appliedCoupon.code}</strong> applied (-₹{couponDiscount})</span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-[11px] text-emerald-700 underline font-medium cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Coupon (e.g. FIRST10, EVERYDAY50)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="flex-1 text-xs px-3 py-2 bg-[#F7F5F0] rounded-lg border border-black/10 focus:outline-hidden font-mono"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 bg-[#242424] text-white text-xs font-medium rounded-lg hover:bg-black cursor-pointer shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[10px] text-red-600">{couponError}</p>
                  )}
                </form>
              )}
            </div>

            {/* Loyalty Points Redemption Toggle */}
            {rewardsBalance > 0 && (
              <div className="flex items-center justify-between p-2.5 bg-[#FAF8F5] rounded-xl border border-black/5 text-xs">
                <div className="flex items-center space-x-2">
                  <Gift className="w-4 h-4 text-[#536B57]" />
                  <div>
                    <span className="font-semibold text-[#242424]">Editz Points ({rewardsBalance} pts)</span>
                    <span className="block text-[10px] text-black/50">Redeem up to ₹{Math.min(rewardsBalance, Math.round(cartSubtotal * 0.4))}</span>
                  </div>
                </div>

                <button
                  onClick={handleToggleRewardsRedemption}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                    pointsToRedeemAtCheckout > 0
                      ? 'bg-[#536B57] text-white'
                      : 'bg-white border border-black/15 text-[#242424] hover:bg-[#F2EFE9]'
                  }`}
                >
                  {pointsToRedeemAtCheckout > 0 ? `Applied (-₹${pointsToRedeemAtCheckout})` : 'Redeem'}
                </button>
              </div>
            )}

            {/* Breakdown */}
            <div className="space-y-1.5 text-xs text-[#242424]/80 border-t border-black/5 pt-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">₹{cartSubtotal}</span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Discount</span>
                  <span className="font-mono tabular-nums">-₹{couponDiscount}</span>
                </div>
              )}

              {redeemedPointsDiscount > 0 && (
                <div className="flex justify-between text-[#536B57]">
                  <span>Points Discount</span>
                  <span className="font-mono tabular-nums">-₹{redeemedPointsDiscount}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Pan-India Shipping</span>
                <span className="font-mono tabular-nums">
                  {shippingFee === 0 ? <strong className="text-[#536B57]">FREE</strong> : `₹${shippingFee}`}
                </span>
              </div>

              <div className="flex justify-between text-sm font-bold text-[#242424] pt-2 border-t border-black/8">
                <span>Total Amount</span>
                <span className="font-mono tabular-nums text-base">₹{cartTotal}</span>
              </div>
            </div>

            {/* Primary Checkout CTA */}
            <button
              onClick={handleCheckoutClick}
              disabled={hasCartStockIssue}
              className="w-full py-3.5 bg-[#242424] hover:bg-black text-[#F7F5F0] font-semibold text-sm rounded-xl transition-all flex items-center justify-center space-x-2 shadow-md cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <span>{hasCartStockIssue ? 'Resolve Unavailable Items to Checkout' : 'Proceed to Checkout'}</span>
              <ArrowRight className="w-4 h-4 text-[#D9A6A0]" />
            </button>

            {!currentCustomer && (
              <p className="text-center text-[11px] text-[#242424]/65">
                Have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    navigateToAuth('login', undefined, { type: 'checkout' });
                  }}
                  className="font-semibold text-[#9E6E65] hover:text-[#242424] underline underline-offset-2 cursor-pointer"
                >
                  Sign in for saved addresses & faster checkout
                </button>
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
