import React, { useState } from 'react';
import { useStore, isProductLiveOnStorefront } from '../context/StoreContext';
import { Product } from '../types';
import { 
  X, 
  Heart, 
  ShoppingBag, 
  Zap, 
  Star, 
  Truck, 
  RotateCcw, 
  ShieldCheck, 
  Check, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  Share2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus
} from 'lucide-react';
import { ProductIllustration } from './ProductIllustration';

export const ProductDetailModal: React.FC = () => {
  const { 
    selectedProduct, 
    setSelectedProduct,
    closeProductModal,
    addToCart, 
    toggleWishlist, 
    isInWishlist,
    setIsCheckoutOpen,
    products,
    showToast,
    setIsEnquiryOpen,
    setEnquiryProduct,
    setIsWaitlistOpen,
    setWaitlistProduct,
    submitFeedback,
    currentCustomer,
    selectedDepartment,
    navigateToDepartment,
    returnToHome,
    openProductModal,
    trackAnalyticsEvent
  } = useStore();

  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedColorHex, setSelectedColorHex] = useState<string | undefined>(undefined);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'editorial' | 'specs' | 'how-to' | 'reviews'>('editorial');
  const [pincodeQuery, setPincodeQuery] = useState('');
  const [pincodeResult, setPincodeResult] = useState<string | null>(null);

  // New review form state
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewCity, setNewReviewCity] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Multi-image gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Compute gallery images array: primary image first, followed by remaining images
  const galleryImages = React.useMemo(() => {
    if (!selectedProduct) return [];
    const imgs = Array.isArray(selectedProduct.images) ? selectedProduct.images.filter(Boolean) : [];
    if (imgs.length === 0 && selectedProduct.primaryImage) return [selectedProduct.primaryImage];
    const primary = selectedProduct.primaryImage || imgs[0];
    if (primary && imgs.includes(primary)) {
      return [primary, ...imgs.filter((img) => img !== primary)];
    }
    return imgs;
  }, [selectedProduct]);

  // Reset when modal opens (History URL handled by StoreContext openProductModal / closeProductModal)

  // Reset active image index and initialize default options when product changes
  React.useEffect(() => {
    setActiveImageIndex(0);
    setValidationError(null);
    setQuantity(1);
    if (selectedProduct) {
      const initial: Record<string, string> = {};
      if (selectedProduct.options && selectedProduct.options.length > 0) {
        selectedProduct.options.forEach((grp) => {
          const firstAvailable = grp.values.find((v) => v.available) || grp.values[0];
          if (firstAvailable) {
            initial[grp.name] = firstAvailable.label;
          }
        });
      }
      setSelectedOptions(initial);
      setSelectedVariant(
        (selectedProduct.variants && selectedProduct.variants[0]?.options[0]?.label) || ''
      );
    }
  }, [selectedProduct?.id]);

  // Compute matched variant item from selected options
  const matchedVariantItem = React.useMemo(() => {
    if (!selectedProduct || !selectedProduct.variantItems || selectedProduct.variantItems.length === 0) {
      return null;
    }
    const optionKeys = Object.keys(selectedOptions);
    if (optionKeys.length === 0) return null;

    return selectedProduct.variantItems.find((vi) => {
      return Object.entries(vi.options).every(([k, v]) => selectedOptions[k] === v);
    }) || null;
  }, [selectedProduct, selectedOptions]);

  if (!selectedProduct) return null;

  const product = selectedProduct;
  const isFavorited = isInWishlist(product.id);

  const activePrice = matchedVariantItem?.price ?? product.price;
  const activeOriginalPrice = matchedVariantItem?.originalPrice ?? product.originalPrice;
  const activeStock = matchedVariantItem ? matchedVariantItem.stockCount : product.stockCount;
  const isCombinationAvailable = matchedVariantItem 
    ? (matchedVariantItem.inStock && matchedVariantItem.stockCount > 0) 
    : (product.inStock && product.stockCount > 0);
  const activeSavings = Math.max(0, activeOriginalPrice - activePrice);
  const activeDiscountPercent = activeOriginalPrice > 0 ? Math.round((activeSavings / activeOriginalPrice) * 100) : 0;

  const handlePrevImage = () => {
    if (galleryImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (galleryImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const diff = touchStartX - touchEndX;
    if (diff > 40) {
      handleNextImage();
    } else if (diff < -40) {
      handlePrevImage();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  // Set default variant if unselected (legacy fallback)
  const currentVariant = selectedVariant || (product.variants && product.variants[0]?.options[0]?.label);

  const handleSelectLegacyVariant = (option: { label: string; colorHex?: string }) => {
    setSelectedVariant(option.label);
    if (option.colorHex) {
      setSelectedColorHex(option.colorHex);
    }
  };

  const handleSelectColourOption = (groupName: string, val: any) => {
    setSelectedOptions((prev) => ({ ...prev, [groupName]: val.label }));
    setValidationError(null);
    if (val.colorHex) setSelectedColorHex(val.colorHex);
    if (val.image) {
      const idx = galleryImages.indexOf(val.image);
      if (idx >= 0) {
        setActiveImageIndex(idx);
      }
    }
  };

  const handleSelectStandardOption = (groupName: string, label: string) => {
    setSelectedOptions((prev) => ({ ...prev, [groupName]: label }));
    setValidationError(null);
  };

  const isOptionAvailable = (groupName: string, optionLabel: string) => {
    if (!product.variantItems || product.variantItems.length === 0) {
      return true;
    }
    const hypothetical = { ...selectedOptions, [groupName]: optionLabel };
    const matching = product.variantItems.find((vi) =>
      Object.entries(hypothetical).every(([k, v]) => vi.options[k] === v)
    );
    if (matching) {
      return matching.inStock && matching.stockCount > 0;
    }
    return true;
  };

  const getSelectedVariantLabel = () => {
    if (matchedVariantItem) return matchedVariantItem.title;
    const parts = Object.values(selectedOptions);
    if (parts.length > 0) return parts.join(' / ');
    return currentVariant || undefined;
  };

  const buildVariantDetails = () => {
    const colorGroup = product.options?.find((g) => g.type === 'color' || g.name.toLowerCase().includes('colour') || g.name.toLowerCase().includes('color'));
    const sizeGroup = product.options?.find((g) => g.type === 'size' || g.name.toLowerCase().includes('size'));

    return {
      variantId: matchedVariantItem?.id,
      selectedColor: colorGroup ? selectedOptions[colorGroup.name] : undefined,
      selectedSize: sizeGroup ? selectedOptions[sizeGroup.name] : undefined,
      selectedOptions: Object.keys(selectedOptions).length > 0 ? selectedOptions : undefined,
      unitPrice: activePrice,
      variantSku: matchedVariantItem?.sku || product.sku,
      variantImage: matchedVariantItem?.image,
    };
  };

  const handleAddToCart = () => {
    if (product.options && product.options.length > 0) {
      for (const grp of product.options) {
        if (grp.required && !selectedOptions[grp.name]) {
          setValidationError(`Please select a ${grp.name} before adding to bag.`);
          showToast(`Please select a ${grp.name}`, 'warning');
          return;
        }
      }
    }

    if (!isCombinationAvailable) {
      setValidationError('This combination is currently out of stock. Please select another variant.');
      showToast('Combination out of stock', 'warning');
      return;
    }

    const label = getSelectedVariantLabel();
    const details = buildVariantDetails();
    addToCart(product, quantity, label, details);
  };

  const handleBuyNow = () => {
    if (product.options && product.options.length > 0) {
      for (const grp of product.options) {
        if (grp.required && !selectedOptions[grp.name]) {
          setValidationError(`Please select a ${grp.name} before proceeding.`);
          showToast(`Please select a ${grp.name}`, 'warning');
          return;
        }
      }
    }

    if (!isCombinationAvailable) {
      setValidationError('This combination is currently out of stock. Please select another variant.');
      showToast('Combination out of stock', 'warning');
      return;
    }

    const label = getSelectedVariantLabel();
    const details = buildVariantDetails();
    addToCart(product, quantity, label, details);
    setSelectedProduct(null);
    setIsCheckoutOpen(true);
  };

  const checkPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (pincodeQuery.length === 6) {
      setPincodeResult('Express Delivery available: 2-3 business days via Delhivery');
    } else {
      setPincodeResult('Please enter a valid 6-digit Indian PIN code');
    }
  };

  const handleShareProduct = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `${product.name} — ${product.tagline}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Product link copied!');
    }
  };

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;

    setIsSubmittingReview(true);
    submitFeedback({
      customerId: currentCustomer?.id,
      customerName: newReviewAuthor.trim(),
      productName: product.name,
      productId: product.id,
      rating: newReviewRating,
      feedback: newReviewComment.trim(),
    });

    setIsSubmittingReview(false);
    setNewReviewAuthor('');
    setNewReviewCity('');
    setNewReviewComment('');
  };

  const handleGoBack = () => {
    closeProductModal();
  };

  const handleClose = () => {
    closeProductModal();
  };

  // Frequently bought together item (must be published and in stock)
  const fbtItem = product.frequentlyBoughtWith
    ? products.find((p) => p.id === product.frequentlyBoughtWith?.[0] && isProductLiveOnStorefront(p) && p.inStock && p.stockCount > 0)
    : null;

  const primaryDept = product.departments?.[0];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#F7F5F0] sm:bg-black/60 sm:backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 md:p-6 animate-in fade-in duration-200">
      
      {/* Modal Card Box: full-screen on mobile, centered dialog on sm+ */}
      <div className="relative w-full max-w-5xl bg-[#F7F5F0] h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:rounded-3xl shadow-2xl border-0 sm:border sm:border-black/10 overflow-hidden flex flex-col">
        
        {/* Sticky Top Header on Modal */}
        <div className="sticky top-0 z-30 bg-[#F7F5F0]/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-4 border-b border-black/8 flex items-center justify-between gap-2 shrink-0">
          {/* Clearly Visible Back Button */}
          <button
            type="button"
            onClick={handleGoBack}
            className="flex items-center space-x-1.5 py-1.5 px-2.5 -ml-1 text-xs font-semibold text-[#242424] hover:bg-black/5 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Back to previous shopping view"
          >
            <ChevronLeft className="w-5 h-5 text-[#242424]" />
            <span>Back</span>
          </button>

          {/* Accessible Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex-1 min-w-0 text-center sm:text-left px-1">
            <ol className="flex items-center justify-center sm:justify-start space-x-1 text-[11px] font-mono text-[#536B57] uppercase tracking-wider truncate">
              <li>
                <button
                  type="button"
                  onClick={returnToHome}
                  className="hover:underline cursor-pointer"
                >
                  Home
                </button>
              </li>
              {primaryDept && (
                <>
                  <li className="text-black/30">/</li>
                  <li>
                    <button
                      type="button"
                      onClick={() => navigateToDepartment(primaryDept)}
                      className="hover:underline cursor-pointer"
                    >
                      {primaryDept}
                    </button>
                  </li>
                </>
              )}
              <li className="text-black/30">/</li>
              <li className="text-[#242424]/75 font-semibold truncate">{product.name}</li>
            </ol>
          </nav>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={() => toggleWishlist(product.id)}
              className="p-2 text-[#242424]/70 hover:text-[#D9A6A0] rounded-full hover:bg-black/5 transition-colors cursor-pointer"
              aria-label={isFavorited ? 'Remove from wishlist' : 'Save to wishlist'}
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-[#D9A6A0] text-[#D9A6A0]' : ''}`} />
            </button>
            <button
              onClick={handleShareProduct}
              className="p-2 text-[#242424]/60 hover:text-black rounded-full hover:bg-black/5 transition-colors cursor-pointer"
              title="Share product"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-[#242424]/70 hover:text-black rounded-full hover:bg-black/5 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body with bottom padding on mobile */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 sm:space-y-10 pb-28 sm:pb-8">
          
          {/* Main 2-Column Product Purchase Hero */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 6-cols: Visual Showcase Gallery */}
            <div className="lg:col-span-6 flex flex-col space-y-4">
              <div 
                className="w-full max-w-full aspect-square sm:aspect-4/3 rounded-2xl bg-white border border-black/8 shadow-sm overflow-hidden relative select-none group/gallery touch-pan-y"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {galleryImages.length > 0 ? (
                  <img
                    key={activeImageIndex}
                    src={galleryImages[activeImageIndex]}
                    alt={`${product.name} - View ${activeImageIndex + 1}`}
                    className="w-full h-full object-cover transition-opacity duration-300 ease-out"
                  />
                ) : (
                  <ProductIllustration 
                    productId={product.id} 
                    variantColor={selectedColorHex}
                    className="w-full h-full"
                  />
                )}

                {/* Discount Badge */}
                {product.discountPercent > 0 && (
                  <span className="absolute top-4 left-4 bg-[#242424] text-[#F7F5F0] text-xs font-mono font-semibold px-2.5 py-1 rounded">
                    SAVE {product.discountPercent}%
                  </span>
                )}

                {/* Image Position Indicator Badge (e.g. 1/5) */}
                {galleryImages.length > 1 && (
                  <div className="absolute top-4 right-4 bg-[#242424]/85 backdrop-blur-xs text-[#F7F5F0] text-[11px] font-mono px-2.5 py-1 rounded-full shadow-xs">
                    {activeImageIndex + 1} / {galleryImages.length}
                  </div>
                )}

                {/* Desktop Prev/Next Navigation Arrows */}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage();
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#242424] shadow-md border border-black/10 flex items-center justify-center transition-all opacity-0 group-hover/gallery:opacity-100 hover:scale-105 cursor-pointer"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#242424] shadow-md border border-black/10 flex items-center justify-center transition-all opacity-0 group-hover/gallery:opacity-100 hover:scale-105 cursor-pointer"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Mobile Swipe Cue Dots */}
                {galleryImages.length > 1 && (
                  <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 sm:hidden pointer-events-none">
                    {galleryImages.map((_, dotIdx) => (
                      <span
                        key={dotIdx}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          dotIdx === activeImageIndex
                            ? 'w-5 bg-[#242424]'
                            : 'w-1.5 bg-[#242424]/30'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {galleryImages.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        activeImageIndex === idx
                          ? 'border-[#242424] shadow-sm scale-102 ring-1 ring-[#242424]'
                          : 'border-transparent opacity-65 hover:opacity-100 hover:border-black/20'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-[#242424]/80 text-[8px] text-white text-center py-0.5 font-mono uppercase">
                          Cover
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Verified Trust Strip */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs text-[#242424]/80 py-3 bg-white rounded-xl border border-black/8">
                <div className="flex flex-col items-center justify-center p-1">
                  <Truck className="w-4 h-4 text-[#536B57] mb-1" />
                  <span className="font-medium text-[11px]">Free Ship ₹499+</span>
                </div>
                <div className="flex flex-col items-center justify-center p-1 border-x border-black/8">
                  <RotateCcw className="w-4 h-4 text-[#536B57] mb-1" />
                  <span className="font-medium text-[11px]">7-Day Replace</span>
                </div>
                <div className="flex flex-col items-center justify-center p-1">
                  <ShieldCheck className="w-4 h-4 text-[#536B57] mb-1" />
                  <span className="font-medium text-[11px]">Studio Tested</span>
                </div>
              </div>
            </div>

            {/* Right 6-cols: Purchase Module */}
            <div className="lg:col-span-6 flex flex-col space-y-6">
              <div>
                {/* Ratings */}
                <div className="flex items-center space-x-2 text-xs font-mono text-[#242424]/70 mb-2">
                  <div className="flex items-center text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-3.5 h-3.5 ${star <= Math.round(product.rating) ? 'fill-amber-500' : 'text-zinc-300'}`} 
                      />
                    ))}
                  </div>
                  <span className="font-bold text-[#242424]">{product.rating}</span>
                  <span className="text-black/40">·</span>
                  <span className="underline underline-offset-2 cursor-pointer" onClick={() => setActiveTab('reviews')}>
                    {product.reviewCount} Verified Indian Buyers
                  </span>
                </div>

                {/* Title & Tagline */}
                <h1 className="text-2xl sm:text-3xl font-bold text-[#242424] tracking-tight">
                  {product.name}
                </h1>
                <p className="text-sm text-[#242424]/75 mt-1.5 leading-relaxed">
                  {product.tagline}
                </p>

                {/* Dynamic Price Display (Updates with Variant Price) */}
                <div className="mt-4 flex items-baseline space-x-3">
                  <span className="text-3xl font-bold text-[#242424] font-mono tabular-nums">
                    ₹{activePrice}
                  </span>
                  {activeOriginalPrice > activePrice && (
                    <>
                      <del className="text-base text-black/40 font-mono tabular-nums">
                        ₹{activeOriginalPrice}
                      </del>
                      <span className="text-xs font-mono text-[#536B57] font-semibold bg-[#536B57]/10 px-2 py-0.5 rounded">
                        {activeDiscountPercent}% OFF · Save ₹{activeSavings}
                      </span>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-[#242424]/60 mt-1 flex items-center justify-between">
                  <span>Inclusive of all taxes & GST invoices provided.</span>
                  {matchedVariantItem?.sku && (
                    <span className="font-mono text-[10px] text-black/50">SKU: {matchedVariantItem.sku}</span>
                  )}
                </div>

                {product.ageSuitability && (
                  <div className="mt-3 p-2.5 rounded-xl bg-[#536B57]/10 text-xs font-mono text-[#536B57] space-y-0.5">
                    <div className="font-bold flex items-center space-x-1">
                      <span>✓ Age Recommended: {product.ageSuitability}</span>
                    </div>
                    {product.safetyInformation && (
                      <div className="text-[11px] text-[#242424]/75 font-sans">
                        {product.safetyInformation}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Validation Warning Alert */}
              {validationError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center space-x-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-medium">{validationError}</span>
                </div>
              )}

              {/* Modern Flexible Product Options & Variants Selector */}
              {product.options && product.options.length > 0 ? (
                <div className="space-y-4 pt-2 border-t border-black/8">
                  {product.options.map((grp) => {
                    const isColorType = grp.type === 'color' || grp.name.toLowerCase().includes('colour') || grp.name.toLowerCase().includes('color');
                    const isSizeType = grp.type === 'size' || grp.name.toLowerCase().includes('size');
                    const currentSelection = selectedOptions[grp.name];

                    return (
                      <div key={grp.id} className="space-y-2">
                        <div className="text-xs font-semibold text-[#242424] flex items-center justify-between">
                          <span>
                            Select {grp.name}:
                          </span>
                          <span className="text-[#536B57] font-semibold font-mono">
                            {currentSelection || 'Choose'}
                          </span>
                        </div>

                        {/* Colour Swatches Selector */}
                        {isColorType ? (
                          <div className="flex flex-wrap items-center gap-2.5">
                            {grp.values.map((opt) => {
                              const isSelected = currentSelection === opt.label;
                              const available = opt.available && isOptionAvailable(grp.name, opt.label);

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => handleSelectColourOption(grp.name, opt)}
                                  className={`group relative flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'border-[#242424] bg-white ring-2 ring-[#242424] ring-offset-1 shadow-xs'
                                      : 'border-black/15 bg-[#FAF8F5] hover:bg-white text-black/80'
                                  } ${!available ? 'opacity-50 border-dashed' : ''}`}
                                  title={`${opt.label}${!available ? ' (Out of stock)' : ''}`}
                                >
                                  {opt.colorHex && (
                                    <span
                                      className="w-4 h-4 rounded-full border border-black/25 shrink-0"
                                      style={{ backgroundColor: opt.colorHex }}
                                    />
                                  )}
                                  <span className="text-xs font-medium">{opt.label}</span>
                                  {!available && (
                                    <span className="text-[9px] font-mono text-red-500 font-semibold">OOS</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : isSizeType ? (
                          /* Size Pills Selector */
                          <div className="flex flex-wrap gap-2">
                            {grp.values.map((opt) => {
                              const isSelected = currentSelection === opt.label;
                              const available = opt.available && isOptionAvailable(grp.name, opt.label);

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={!available}
                                  onClick={() => handleSelectStandardOption(grp.name, opt.label)}
                                  className={`min-w-[46px] px-3.5 py-2 text-xs font-semibold rounded-xl border flex items-center justify-center space-x-1.5 transition-all ${
                                    isSelected
                                      ? 'border-[#242424] bg-[#242424] text-white shadow-xs cursor-pointer'
                                      : available
                                      ? 'border-black/15 bg-white hover:border-black/40 text-[#242424] cursor-pointer'
                                      : 'border-black/10 bg-black/5 text-black/35 line-through cursor-not-allowed'
                                  }`}
                                  title={!available ? 'Unavailable in selected colour' : `Select Size ${opt.label}`}
                                >
                                  <span>{opt.label}</span>
                                  {!available && <span className="text-[9px] no-underline">✕</span>}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          /* Custom / Material Option Selector */
                          <div className="flex flex-wrap gap-2">
                            {grp.values.map((opt) => {
                              const isSelected = currentSelection === opt.label;
                              const available = opt.available && isOptionAvailable(grp.name, opt.label);

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={!available}
                                  onClick={() => handleSelectStandardOption(grp.name, opt.label)}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                                    isSelected
                                      ? 'border-[#242424] bg-white ring-1 ring-[#242424] font-semibold text-[#242424]'
                                      : available
                                      ? 'border-black/10 bg-[#FAF8F5] hover:bg-white text-black/75 cursor-pointer'
                                      : 'border-black/10 bg-black/5 text-black/35 line-through cursor-not-allowed'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : product.variants && product.variants.length > 0 ? (
                /* Backward Compatibility with Legacy ProductVariant */
                <div className="space-y-4 pt-2 border-t border-black/8">
                  {product.variants.map((vGroup, idx) => (
                    <div key={idx}>
                      <div className="text-xs font-semibold text-[#242424] mb-2 flex items-center justify-between">
                        <span>Select {vGroup.name}:</span>
                        <span className="text-[#536B57] font-normal font-mono">{currentVariant}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {vGroup.options.map((opt) => {
                          const isOptSelected = currentVariant === opt.label;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => handleSelectLegacyVariant(opt)}
                              className={`px-3 py-2 text-xs font-medium rounded-xl border flex items-center space-x-2 transition-all cursor-pointer ${
                                isOptSelected
                                  ? 'border-[#242424] bg-white text-[#242424] shadow-xs ring-1 ring-[#242424]'
                                  : 'border-black/10 bg-[#F7F5F0] hover:bg-white text-[#242424]/80'
                              }`}
                            >
                              {opt.colorHex && (
                                <span 
                                  className="w-3.5 h-3.5 rounded-full border border-black/20"
                                  style={{ backgroundColor: opt.colorHex }}
                                />
                              )}
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Quantity Stepper & Stock status */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-medium text-[#242424]">Quantity:</span>
                  <div className="flex items-center border border-black/15 bg-white rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 text-black/60 hover:text-black cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-3 text-xs font-bold font-mono tabular-nums">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(Math.min(10, Math.max(1, activeStock)), quantity + 1))}
                      disabled={quantity >= activeStock || !isCombinationAvailable}
                      className="p-2 text-black/60 hover:text-black cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="text-xs font-mono flex items-center space-x-1.5">
                  {isCombinationAvailable ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-[#536B57]" />
                      <span className="text-[#536B57] font-semibold">
                        In Stock ({activeStock} unit{activeStock === 1 ? '' : 's'} available)
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-red-600 font-semibold">
                        Combination Out of Stock
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Purchase Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!isCombinationAvailable}
                  className={`w-full py-3.5 border text-sm font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-xs ${
                    isCombinationAvailable
                      ? 'bg-white border-[#242424] text-[#242424] hover:bg-[#F2EFE9] cursor-pointer'
                      : 'bg-black/5 border-black/10 text-black/40 cursor-not-allowed'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isCombinationAvailable ? 'Add to Bag' : 'Out of Stock'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={!isCombinationAvailable}
                  className={`w-full py-3.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-sm ${
                    isCombinationAvailable
                      ? 'bg-[#242424] hover:bg-black text-[#F7F5F0] cursor-pointer'
                      : 'bg-black/20 text-black/40 cursor-not-allowed'
                  }`}
                >
                  <Zap className="w-4 h-4 text-[#D9A6A0]" />
                  <span>Buy Now (Express)</span>
                </button>
              </div>

              {/* Wishlist toggle secondary */}
              <button
                onClick={() => toggleWishlist(product.id)}
                className="w-full py-2.5 text-xs font-medium text-[#242424]/80 hover:text-[#242424] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-[#D9A6A0] text-[#D9A6A0]' : ''}`} />
                <span>{isFavorited ? 'Saved in your Wishlist' : 'Save to Wishlist'}</span>
              </button>

              {/* Indian PIN Code Delivery Checker */}
              <div className="bg-white p-3.5 rounded-xl border border-black/8">
                <form onSubmit={checkPincode} className="flex items-center space-x-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit PIN code"
                    value={pincodeQuery}
                    onChange={(e) => setPincodeQuery(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 text-xs px-3 py-2 bg-[#F7F5F0] rounded-lg border border-black/10 focus:outline-hidden font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-[#242424] text-white text-xs font-medium rounded-lg hover:bg-black cursor-pointer shrink-0"
                  >
                    Check PIN
                  </button>
                </form>
                {pincodeResult && (
                  <p className="text-[11px] text-[#536B57] mt-2 font-medium">
                    {pincodeResult}
                  </p>
                )}
              </div>

              {/* CRM Interactive Touchpoints: Enquiry & Waitlist */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEnquiryProduct(product);
                    setIsEnquiryOpen(true);
                  }}
                  className="py-2.5 px-3 bg-white hover:bg-black/5 text-[#242424] text-xs font-semibold rounded-xl border border-black/10 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>Ask a Question / Enquiry</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWaitlistProduct(product);
                    setIsWaitlistOpen(true);
                  }}
                  className="py-2.5 px-3 bg-[#D9A6A0]/15 hover:bg-[#D9A6A0]/25 text-[#242424] text-xs font-semibold rounded-xl border border-[#D9A6A0]/30 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>Join VIP Waitlist</span>
                </button>
              </div>

            </div>

          </div>

          {/* Frequently Bought Together Bundle suggestion */}
          {fbtItem && (
            <div className="bg-white rounded-2xl border border-black/8 p-5">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#536B57] mb-3">
                Frequently Bought Together
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl bg-[#F7F5F0] overflow-hidden shrink-0">
                    <ProductIllustration productId={product.id} className="w-full h-full scale-75" />
                  </div>
                  <span className="text-lg font-bold text-black/40">+</span>
                  <div className="w-16 h-16 rounded-xl bg-[#F7F5F0] overflow-hidden shrink-0">
                    <ProductIllustration productId={fbtItem.id} className="w-full h-full scale-75" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#242424]">
                      {product.name.slice(0, 30)}... + {fbtItem.name.slice(0, 30)}...
                    </h4>
                    <div className="text-xs font-mono text-[#242424] font-bold mt-0.5">
                      Combined: ₹{product.price + fbtItem.price}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    addToCart(product, 1);
                    addToCart(fbtItem, 1);
                    showToast('Added duo pairing to bag!');
                  }}
                  className="px-4 py-2 bg-[#F7F5F0] hover:bg-[#242424] hover:text-white text-xs font-semibold rounded-xl border border-black/10 transition-colors shrink-0 cursor-pointer"
                >
                  Add Both to Bag
                </button>
              </div>
            </div>
          )}

          {/* 10-Point Editorial Description Panels Tabs */}
          <div className="bg-white rounded-2xl border border-black/8 overflow-hidden">
            
            {/* Tabs Header */}
            <div className="flex border-b border-black/8 bg-[#FAF8F5] overflow-x-auto no-scrollbar">
              {[
                { id: 'editorial', label: '1. The Everyday Editz & Story' },
                { id: 'specs', label: '2. Specifications & Dimensions' },
                { id: 'how-to', label: '3. How to Use & Notes' },
                { id: 'reviews', label: `4. Reviews (${product.reviews.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-3.5 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-[#242424] text-[#242424] bg-white'
                      : 'border-transparent text-[#242424]/60 hover:text-[#242424]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Editorial & Problem It Solves */}
            {activeTab === 'editorial' && (
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#536B57] mb-1">
                    The Everyday Editz
                  </h3>
                  <p className="text-sm text-[#242424]/85 leading-relaxed">
                    {product.editorial.everydayEdit}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-black/5">
                  <div>
                    <h4 className="text-xs font-bold text-[#242424] mb-2 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#D9A6A0]" />
                      <span>Why You'll Love It</span>
                    </h4>
                    <ul className="space-y-2 text-xs text-[#242424]/80">
                      {product.editorial.whyYouLoveIt.map((benefit, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <Check className="w-3.5 h-3.5 text-[#536B57] shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[#242424] mb-2 flex items-center space-x-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#536B57]" />
                      <span>The Problem It Solves</span>
                    </h4>
                    <p className="text-xs text-[#242424]/80 leading-relaxed bg-[#F7F5F0] p-3.5 rounded-xl border border-black/5">
                      {product.editorial.problemItSolves}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-black/5">
                  <h4 className="text-xs font-bold text-[#242424] mb-2">Key Features</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#242424]/80">
                    {product.editorial.keyFeatures.map((feat, i) => (
                      <div key={i} className="flex items-center space-x-2 bg-[#FAF8F5] p-2.5 rounded-lg border border-black/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#536B57]" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Specs & Dimensions */}
            {activeTab === 'specs' && (
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#536B57] mb-3">
                    Technical Specifications
                  </h3>
                  <div className="border border-black/8 rounded-xl overflow-hidden divide-y divide-black/8 text-xs">
                    {Object.entries(product.editorial.specifications).map(([key, value]) => (
                      <div key={key} className="flex flex-col sm:flex-row py-2.5 px-4 bg-white sm:even:bg-[#FAF8F5]">
                        <span className="w-48 font-medium text-[#242424]/70">{key}</span>
                        <span className="text-[#242424] font-mono mt-0.5 sm:mt-0">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-black/5 text-xs">
                  <div className="bg-[#FAF8F5] p-4 rounded-xl border border-black/5">
                    <span className="font-bold text-[#242424] block mb-1">Materials & Build</span>
                    <p className="text-[#242424]/80">{product.editorial.materialAndDimensions.material}</p>
                    <p className="text-black/50 font-mono mt-1">{product.editorial.materialAndDimensions.dimensions} · {product.editorial.materialAndDimensions.weight}</p>
                  </div>

                  <div className="bg-[#FAF8F5] p-4 rounded-xl border border-black/5">
                    <span className="font-bold text-[#242424] block mb-1">Package Contents</span>
                    <ul className="space-y-1 text-[#242424]/80">
                      {product.editorial.packageContents.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: How to Use & Notes */}
            {activeTab === 'how-to' && (
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#536B57] mb-3">
                    Step-by-Step Usage Guide
                  </h3>
                  <div className="space-y-3">
                    {product.editorial.howToUse.map((step, idx) => (
                      <div key={idx} className="flex items-start space-x-3 text-xs bg-[#FAF8F5] p-3 rounded-xl border border-black/5">
                        <span className="w-5 h-5 rounded-full bg-[#242424] text-white flex items-center justify-center font-mono text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[#242424]/85 leading-relaxed pt-0.5">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-black/5">
                  <h4 className="text-xs font-bold text-[#242424] mb-2 flex items-center space-x-1.5 text-amber-700">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Important Product Notes & Limitations</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-[#242424]/80 bg-amber-50/50 p-4 rounded-xl border border-amber-200/40">
                    {product.editorial.limitations.map((note, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Tab 4: Genuine Reviews */}
            {activeTab === 'reviews' && (
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-black/8">
                  <div>
                    <h3 className="text-sm font-bold text-[#242424]">
                      Verified Indian Customer Reviews
                    </h3>
                    <p className="text-xs text-[#242424]/60">
                      Real feedback from verified purchasers across India.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono text-[#242424]">{product.rating} / 5.0</div>
                    <div className="text-[11px] text-[#536B57] font-semibold">100% Genuine Reviews</div>
                  </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  {product.reviews.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-xl bg-[#FAF8F5] border border-black/5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-[#242424]">{rev.author}</span>
                          <span className="text-[10px] text-black/40">({rev.location})</span>
                          {rev.verifiedPurchase && (
                            <span className="text-[10px] font-mono text-[#536B57] bg-[#536B57]/10 px-1.5 py-0.5 rounded">
                              Verified Order
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-black/40 font-mono">{rev.date}</span>
                      </div>

                      <div className="flex items-center text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-500' : 'text-zinc-300'}`} />
                        ))}
                      </div>

                      <h5 className="text-xs font-semibold text-[#242424]">{rev.title}</h5>
                      <p className="text-xs text-[#242424]/80 leading-relaxed">{rev.comment}</p>
                    </div>
                  ))}
                </div>

                {/* Add a Verified Review Form */}
                <form onSubmit={handleAddReview} className="pt-6 border-t border-black/8 space-y-3">
                  <h4 className="text-xs font-bold text-[#242424]">Write a Review</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Your Full Name"
                      required
                      value={newReviewAuthor}
                      onChange={(e) => setNewReviewAuthor(e.target.value)}
                      className="text-xs px-3 py-2 bg-white rounded-lg border border-black/10 focus:outline-hidden"
                    />
                    <input
                      type="text"
                      placeholder="Your City"
                      value={newReviewCity}
                      onChange={(e) => setNewReviewCity(e.target.value)}
                      className="text-xs px-3 py-2 bg-white rounded-lg border border-black/10 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-[#242424]/70">Your Rating:</span>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setNewReviewRating(num)}
                          className="p-1 cursor-pointer"
                        >
                          <Star className={`w-4 h-4 ${num <= newReviewRating ? 'text-amber-500 fill-amber-500' : 'text-zinc-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Describe how this item upgraded your daily routine..."
                    required
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-black/10 focus:outline-hidden"
                  />

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-4 py-2 bg-[#242424] text-white text-xs font-semibold rounded-lg hover:bg-black transition-colors cursor-pointer"
                  >
                    {isSubmittingReview ? 'Submitting...' : 'Post Verified Review'}
                  </button>
                </form>
              </div>
            )}

          </div>

          {/* Similar Products & Complete Your Collection Recommendations */}
          {(() => {
            const livePool = products.filter(
              (p) =>
                p.id !== product.id &&
                isProductLiveOnStorefront(p) &&
                p.inStock &&
                (p.stockCount ?? 0) > 0
            );
            const productDepts = new Set(product.departments || []);
            const productSubcats = new Set(product.subcategories || []);
            const productTags = new Set([...(product.tags || []), ...(product.aiTags || []), ...(product.useCases || [])]);

            const similarProducts = [...livePool]
              .map((cand) => {
                let score = 0;
                if ((cand.departments || []).some((d) => productDepts.has(d))) score += 8;
                if ((cand.subcategories || []).some((s) => productSubcats.has(s))) score += 12;
                if (
                  [...(cand.tags || []), ...(cand.aiTags || []), ...(cand.useCases || [])].some((t) =>
                    productTags.has(t)
                  )
                ) {
                  score += 5;
                }
                if (Math.abs(cand.price - product.price) <= 250) score += 3;
                return { cand, score };
              })
              .sort((a, b) => b.score - a.score)
              .slice(0, 4)
              .map((x) => x.cand);

            const similarIds = new Set(similarProducts.map((s) => s.id));
            const compatibleSet = new Set(product.compatibility || []);
            const companionProducts = livePool
              .filter((p) => !similarIds.has(p.id) && p.id !== fbtItem?.id)
              .sort((a, b) => {
                const aComp = compatibleSet.has(a.id) ? 1 : 0;
                const bComp = compatibleSet.has(b.id) ? 1 : 0;
                return bComp - aComp || Number(b.isBestSeller) - Number(a.isBestSeller);
              })
              .slice(0, 3);

            if (similarProducts.length === 0 && companionProducts.length === 0) return null;

            return (
              <div className="space-y-4">
                {similarProducts.length > 0 && (
                  <div className="bg-white rounded-2xl border border-black/8 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#536B57]">
                        Similar Products You May Like
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {similarProducts.map((item) => {
                        const img = item.primaryImage || item.images?.[0];
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              trackAnalyticsEvent('recommendation_click', `similar:${item.id}`);
                              openProductModal(item);
                            }}
                            className="text-left p-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F2EFE9] border border-black/6 transition-colors cursor-pointer group"
                          >
                            <div className="aspect-square rounded-lg bg-white overflow-hidden mb-2">
                              {img ? (
                                <img src={img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <ProductIllustration productId={item.id} className="w-full h-full scale-90" />
                              )}
                            </div>
                            <div className="text-xs font-semibold text-[#242424] line-clamp-1">{item.name}</div>
                            <div className="text-xs font-mono font-bold text-[#536B57] mt-0.5">₹{item.price}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {companionProducts.length > 0 && (
                  <div className="bg-white rounded-2xl border border-black/8 p-5">
                    <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#536B57] mb-3">
                      Complete Your Collection
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {companionProducts.map((item) => {
                        const img = item.primaryImage || item.images?.[0];
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-[#FAF8F5] border border-black/6"
                          >
                            <div
                              onClick={() => {
                                trackAnalyticsEvent('recommendation_click', `collection:${item.id}`);
                                openProductModal(item);
                              }}
                              className="flex items-center space-x-2.5 min-w-0 cursor-pointer flex-1"
                            >
                              <div className="w-11 h-11 rounded-lg bg-white overflow-hidden shrink-0">
                                {img ? (
                                  <img src={img} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <ProductIllustration productId={item.id} className="w-full h-full scale-75" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-[#242424] truncate hover:underline">{item.name}</div>
                                <div className="text-xs font-mono font-bold text-[#536B57]">₹{item.price}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                trackAnalyticsEvent('recommendation_click', `collection_add:${item.id}`);
                                addToCart(item, 1);
                              }}
                              className="px-2.5 py-1.5 bg-[#242424] hover:bg-black text-white rounded-lg text-[10px] font-semibold shrink-0 cursor-pointer"
                            >
                              + Bag
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>

        {/* Mobile Sticky Bottom Purchase Bar (Requirement 3 & 6) */}
        <div className="sticky bottom-0 inset-x-0 z-30 sm:hidden bg-white/95 backdrop-blur-md border-t border-black/10 px-4 py-3 shadow-lg flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex flex-col">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-lg font-bold font-mono text-[#242424] tabular-nums">
                ₹{activePrice}
              </span>
              {activeOriginalPrice > activePrice && (
                <del className="text-xs text-black/40 font-mono tabular-nums">
                  ₹{activeOriginalPrice}
                </del>
              )}
            </div>
            <span className="text-[10px] font-mono text-[#536B57] font-semibold truncate">
              {isCombinationAvailable ? (activeStock <= 5 ? `Only ${activeStock} left!` : 'In Stock') : 'Out of Stock'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!isCombinationAvailable}
              className={`px-3 py-2.5 text-xs font-semibold rounded-xl border flex items-center space-x-1 shadow-2xs transition-all ${
                isCombinationAvailable 
                  ? 'bg-white border-[#242424] text-[#242424] active:bg-[#F2EFE9] cursor-pointer' 
                  : 'bg-black/5 border-black/10 text-black/40 cursor-not-allowed'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Bag</span>
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!isCombinationAvailable}
              className={`px-4 py-2.5 text-xs font-semibold rounded-xl text-white shadow-sm flex items-center space-x-1.5 transition-all ${
                isCombinationAvailable 
                  ? 'bg-[#242424] active:bg-black cursor-pointer' 
                  : 'bg-black/30 cursor-not-allowed'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-[#D9A6A0]" />
              <span>Buy Now</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
