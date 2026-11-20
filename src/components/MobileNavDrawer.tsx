import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../context/StoreContext';
import { Department } from '../types';
import { 
  X, 
  Home, 
  Grid, 
  Sparkles, 
  Clock, 
  Flame, 
  Tag, 
  Heart, 
  Package, 
  User, 
  Gift, 
  ShieldCheck, 
  ChevronRight, 
  ChevronDown, 
  Mail, 
  Instagram,
  Compass,
  HelpCircle,
  LogIn,
  LogOut,
  ArrowRight
} from 'lucide-react';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateHome: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateHome
}) => {
  const { 
    departments, 
    selectedDepartment, 
    navigateToDepartment, 
    navigateToCollection,
    returnToHome,
    wishlist,
    currentCustomer,
    logoutCustomer,
    rewardsBalance,
    navigateToAuth,
    navigateToAccount,
    setIsRewardsOpen,
    setIsTrackingOpen,
    setIsReelsOpen,
    setIsEnquiryOpen,
    setActivePolicy,
    setActivePriceTier
  } = useStore();

  const [expandedDept, setExpandedDept] = useState<Department | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling while drawer is open without layout shifting
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleHomeClick = () => {
    returnToHome();
    onNavigateHome();
    onClose();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShopAllClick = () => {
    returnToHome();
    onClose();
    setTimeout(() => {
      const el = document.getElementById('daily-edit');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDeptSelect = (deptId: Department) => {
    navigateToDepartment(deptId);
    onClose();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubcatSelect = (deptId: Department, subcat: string) => {
    navigateToDepartment(deptId, subcat);
    onClose();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickScroll = (sectionId: string) => {
    returnToHome();
    onClose();
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handlePricePick = (tier: 'under-199' | 'under-299' | 'under-499' | 'under-999') => {
    setActivePriceTier(tier);
    handleQuickScroll('price-picks-section');
  };

  const handlePolicyClick = (tabId: 'returns' | 'replacements' | 'refunds' | 'shipping' | 'privacy' | 'terms') => {
    setActivePolicy(tabId);
    onClose();
  };

  const handleOpenAccount = () => {
    onClose();
    if (currentCustomer) {
      navigateToAccount('profile');
    } else {
      navigateToAuth('login');
    }
  };

  const handleOpenRegister = () => {
    onClose();
    navigateToAuth('register');
  };

  const handleSignOut = async () => {
    await logoutCustomer();
    onClose();
  };

  if (!mounted) return null;

  const content = (
    <div 
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      {/* High-performance backdrop overlay (no expensive backdrop-blur that causes mobile GPU lag) */}
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Slide-in Drawer Container with hardware-accelerated transform */}
      <div 
        className={`fixed inset-y-0 left-0 w-[88vw] max-w-sm bg-[#F7F5F0] h-full shadow-2xl flex flex-col justify-between z-10 overflow-hidden transform transition-transform duration-300 ease-out border-r border-black/10 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ willChange: 'transform' }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-black/8 bg-white flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <img 
              src="/brand-logo.jpg" 
              alt="Everyday Editz" 
              className="w-8 h-8 rounded-full object-cover ring-1 ring-[#D9A6A0]/60 shadow-xs"
            />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-sm sm:text-base font-bold tracking-tight text-[#242424]">
                  THE EVERYDAY EDITZ
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9A6A0]" />
              </div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#536B57]">
                Little Finds · Big Everyday Upgrades
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 text-[#242424] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div 
          className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5 text-sm overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          
          {/* STREAMLINED LOGIN / MY ACCOUNT ENTRY POINT (No example contact details) */}
          <div className="bg-white rounded-2xl p-3 border border-black/8 shadow-xs">
            {currentCustomer ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#536B57]/15 text-[#536B57] flex items-center justify-center font-bold text-xs shrink-0">
                      {currentCustomer.firstName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#242424] truncate">
                        {currentCustomer.firstName} {currentCustomer.lastName}
                      </div>
                      <div className="text-[10px] text-[#536B57] font-semibold flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>{rewardsBalance} Reward Pts</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full shrink-0">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/6">
                  <button
                    onClick={handleOpenAccount}
                    className="w-full py-2 px-3 bg-[#242424] text-white rounded-xl text-xs font-semibold hover:bg-black transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>My Account</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full py-2 px-3 bg-[#F7F5F0] text-black/70 rounded-xl text-xs font-medium hover:text-black hover:bg-black/5 transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF8F6] text-[#242424] flex items-center justify-center shrink-0 border border-[#D9A6A0]/35">
                    <User className="w-5 h-5 text-[#9E6E65]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#242424]">Welcome to Everyday Editz</div>
                    <p className="text-[10px] text-black/55 leading-tight">Sign in for saved addresses, orders & rewards</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleOpenAccount}
                    className="py-2 px-3 bg-[#242424] text-[#FAF8F6] rounded-xl text-xs font-semibold hover:bg-black transition-colors cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                  <button
                    onClick={handleOpenRegister}
                    className="py-2 px-3 bg-[#FAF8F6] text-[#242424] border border-black/12 rounded-xl text-xs font-semibold hover:bg-[#F3E7E4]/60 transition-colors cursor-pointer"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PRIMARY STORE ACTIONS (Home & All Curations) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleHomeClick}
              className={`flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-xs font-semibold ${
                selectedDepartment === null 
                  ? 'bg-[#242424] text-white shadow-xs' 
                  : 'bg-white border border-black/8 text-[#242424] hover:border-black/20'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Storefront</span>
            </button>

            <button
              onClick={handleShopAllClick}
              className="flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-white border border-black/8 text-[#242424] hover:border-black/20 transition-all cursor-pointer text-xs font-semibold shadow-2xs"
            >
              <Grid className="w-4 h-4 text-[#536B57] shrink-0" />
              <span>All Curations</span>
            </button>
          </div>

          {/* CLEAN VERTICAL LIST OF PRODUCT CATEGORIES */}
          <div className="space-y-2">
            <div className="px-1 text-[11px] font-mono uppercase tracking-wider text-[#536B57] font-semibold flex items-center justify-between">
              <span>Categories</span>
              <span className="text-[10px] text-black/40">Clean Vertical List</span>
            </div>

            <div className="bg-white rounded-2xl border border-black/8 divide-y divide-black/6 shadow-2xs overflow-hidden">
              {departments.map((dept) => {
                const isSelected = selectedDepartment === dept.id;
                const isExpanded = expandedDept === dept.id;

                const deptColor = 
                  dept.id === 'women' ? 'bg-[#D9A6A0]' :
                  dept.id === 'men' ? 'bg-[#242424]' :
                  dept.id === 'kids' ? 'bg-[#536B57]' : 'bg-[#B7A18D]';

                return (
                  <div key={dept.id} className="transition-colors">
                    {/* Category Row Header */}
                    <div className="flex items-center justify-between px-3.5 py-3 hover:bg-[#F7F5F0]/60 transition-colors">
                      <button
                        onClick={() => handleDeptSelect(dept.id)}
                        className="flex-1 text-left flex items-center space-x-3 cursor-pointer min-w-0"
                      >
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${deptColor}`} />
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-[#536B57]' : 'text-[#242424]'}`}>
                            {dept.name}
                          </div>
                          <div className="text-[10px] text-black/50 truncate">
                            {dept.tagline}
                          </div>
                        </div>
                      </button>

                      {/* Expand / Collapse Subcategories */}
                      <button
                        onClick={() => setExpandedDept(isExpanded ? null : dept.id)}
                        className="p-1.5 text-black/40 hover:text-black rounded-lg hover:bg-black/5 transition-colors cursor-pointer shrink-0 ml-1"
                        aria-label={`Toggle ${dept.name} subcategories`}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-black' : ''}`} />
                      </button>
                    </div>

                    {/* Clean Vertical Subcategory List */}
                    {isExpanded && (
                      <div className="bg-[#FAF8F5] px-4 py-2 border-t border-black/5 space-y-0.5">
                        <button
                          onClick={() => handleDeptSelect(dept.id)}
                          className="w-full text-left py-2 px-2 text-[11px] font-bold text-[#536B57] hover:bg-white rounded-lg transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>Explore All in {dept.name}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        
                        {dept.subcategories.map((subcat) => (
                          <button
                            key={subcat}
                            onClick={() => handleSubcatSelect(dept.id, subcat)}
                            className="w-full text-left py-2 px-2.5 rounded-lg text-xs text-[#242424]/85 hover:bg-white hover:text-black transition-colors flex items-center justify-between cursor-pointer group"
                          >
                            <span className="flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-black/20 group-hover:bg-[#536B57] transition-colors" />
                              <span className="group-hover:font-medium">{subcat}</span>
                            </span>
                            <ChevronRight className="w-3 h-3 text-black/30 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CURATED FINDS & FEATURES */}
          <div className="space-y-2">
            <div className="px-1 text-[11px] font-mono uppercase tracking-wider text-[#536B57] font-semibold">
              Curated Edits & Reels
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onClose();
                  navigateToCollection('new-arrivals');
                }}
                className="p-2.5 bg-white rounded-xl border border-black/6 text-left hover:border-black/20 transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center space-x-1.5 text-[#536B57] mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono font-bold uppercase">New</span>
                </div>
                <div className="text-xs font-semibold text-[#242424]">New Arrivals</div>
              </button>

              <button
                onClick={() => handleQuickScroll('trending-section')}
                className="p-2.5 bg-white rounded-xl border border-black/6 text-left hover:border-black/20 transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center space-x-1.5 text-[#D9A6A0] mb-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono font-bold uppercase">Trending</span>
                </div>
                <div className="text-xs font-semibold text-[#242424]">Trending Edits</div>
              </button>

              <button
                onClick={() => handleQuickScroll('smart-combos')}
                className="p-2.5 bg-white rounded-xl border border-black/6 text-left hover:border-black/20 transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center space-x-1.5 text-[#B7A18D] mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono font-bold uppercase">Combos</span>
                </div>
                <div className="text-xs font-semibold text-[#242424]">Smart Combos</div>
              </button>

              <button
                onClick={() => {
                  onClose();
                  setIsReelsOpen(true);
                }}
                className="p-2.5 bg-white rounded-xl border border-black/6 text-left hover:border-black/20 transition-all cursor-pointer shadow-2xs"
              >
                <div className="flex items-center space-x-1.5 text-[#536B57] mb-1">
                  <Compass className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono font-bold uppercase">Video</span>
                </div>
                <div className="text-xs font-semibold text-[#242424]">See It In Action</div>
              </button>
            </div>
          </div>

          {/* BUDGET & PRICE PICKS */}
          <div className="space-y-2">
            <div className="px-1 text-[11px] font-mono uppercase tracking-wider text-[#536B57] font-semibold flex items-center justify-between">
              <span>Price Picks</span>
              <span className="text-[10px] text-black/40">Budget Curations</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => handlePricePick('under-199')}
                className="py-2 px-1 bg-white rounded-xl border border-black/6 text-center hover:border-black/20 transition-all cursor-pointer shadow-2xs"
              >
                <div className="text-[10px] text-black/40 font-mono">Under</div>
                <div className="text-xs font-bold text-[#242424]">₹199</div>
              </button>
              <button
                onClick={() => handlePricePick('under-299')}
                className="py-2 px-1 bg-white rounded-xl border border-black/6 text-center hover:border-black/20 transition-all cursor-pointer shadow-2xs"
              >
                <div className="text-[10px] text-black/40 font-mono">Under</div>
                <div className="text-xs font-bold text-[#536B57]">₹299</div>
              </button>
              <button
                onClick={() => handlePricePick('under-499')}
                className="py-2 px-1 bg-white rounded-xl border border-black/6 text-center hover:border-black/20 transition-all cursor-pointer shadow-2xs"
              >
                <div className="text-[10px] text-black/40 font-mono">Under</div>
                <div className="text-xs font-bold text-[#D9A6A0]">₹499</div>
              </button>
              <button
                onClick={() => handlePricePick('under-999')}
                className="py-2 px-1 bg-white rounded-xl border border-black/6 text-center hover:border-black/20 transition-all cursor-pointer shadow-2xs"
              >
                <div className="text-[10px] text-black/40 font-mono">Under</div>
                <div className="text-xs font-bold text-[#242424]">₹999</div>
              </button>
            </div>
          </div>

          {/* SHOPPING SERVICES & TRACKING */}
          <div className="space-y-2">
            <div className="px-1 text-[11px] font-mono uppercase tracking-wider text-[#536B57] font-semibold">
              Shopping & Services
            </div>

            <div className="space-y-1 bg-white rounded-2xl p-2 border border-black/6 shadow-2xs">
              <button
                onClick={() => {
                  onClose();
                  handleQuickScroll('wishlist-section');
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F7F5F0] transition-colors cursor-pointer text-[#242424]"
              >
                <div className="flex items-center space-x-3">
                  <Heart className="w-4 h-4 text-[#D9A6A0]" />
                  <span className="text-xs font-medium">Saved / Wishlist</span>
                </div>
                {wishlist.length > 0 && (
                  <span className="text-[10px] font-mono font-bold bg-[#D9A6A0] text-[#242424] px-1.5 py-0.5 rounded-full">
                    {wishlist.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  onClose();
                  setIsTrackingOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F7F5F0] transition-colors cursor-pointer text-[#242424]"
              >
                <div className="flex items-center space-x-3">
                  <Package className="w-4 h-4 text-[#536B57]" />
                  <span className="text-xs font-medium">Track Delhivery Order</span>
                </div>
                <span className="text-[10px] text-black/40 font-mono">Fast dispatch ›</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  setIsRewardsOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F7F5F0] transition-colors cursor-pointer text-[#242424]"
              >
                <div className="flex items-center space-x-3">
                  <Gift className="w-4 h-4 text-[#B7A18D]" />
                  <span className="text-xs font-medium">Everyday Rewards</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#536B57] bg-[#536B57]/10 px-2 py-0.5 rounded-full">
                  {rewardsBalance} pts
                </span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  setIsEnquiryOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#F7F5F0] transition-colors cursor-pointer text-[#242424]"
              >
                <div className="flex items-center space-x-3">
                  <HelpCircle className="w-4 h-4 text-[#242424]" />
                  <span className="text-xs font-medium">Product Enquiry & Help</span>
                </div>
                <span className="text-[10px] text-black/40">Assistance ›</span>
              </button>
            </div>
          </div>

          {/* POLICIES & CUSTOMER TRANSPARENCY */}
          <div className="space-y-1.5">
            <div className="px-1 text-[11px] font-mono uppercase tracking-wider text-[#536B57] font-semibold">
              Policies & Assurances
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#242424]/80">
              <button
                onClick={() => handlePolicyClick('returns')}
                className="p-2 bg-white rounded-lg border border-black/5 text-left hover:text-black cursor-pointer truncate"
              >
                Return Policy
              </button>
              <button
                onClick={() => handlePolicyClick('replacements')}
                className="p-2 bg-white rounded-lg border border-black/5 text-left hover:text-black cursor-pointer truncate"
              >
                Replacement Policy
              </button>
              <button
                onClick={() => handlePolicyClick('refunds')}
                className="p-2 bg-white rounded-lg border border-black/5 text-left hover:text-black cursor-pointer truncate"
              >
                Refund Policy
              </button>
              <button
                onClick={() => handlePolicyClick('shipping')}
                className="p-2 bg-white rounded-lg border border-black/5 text-left hover:text-black cursor-pointer truncate"
              >
                Shipping & Delivery
              </button>
              <button
                onClick={() => handlePolicyClick('privacy')}
                className="p-2 bg-white rounded-lg border border-black/5 text-left hover:text-black cursor-pointer truncate"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => handlePolicyClick('terms')}
                className="p-2 bg-white rounded-lg border border-black/5 text-left hover:text-black cursor-pointer truncate"
              >
                Terms & Conditions
              </button>
            </div>
          </div>

        </div>

        {/* DRAWER FOOTER: CLEAN BRAND ASSURANCE (No example contact details or dummy profile data) */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-black/8 shrink-0 space-y-2 text-[11px] text-[#242424]/80">
          <div className="flex items-center space-x-2 text-[#536B57] font-semibold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>100% Prepaid · Safe Pan-India Delivery</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-black/5">
            <button
              onClick={() => {
                onClose();
                setIsEnquiryOpen(true);
              }}
              className="text-[#536B57] hover:underline font-medium flex items-center space-x-1 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Support</span>
            </button>

            <a 
              href="https://www.instagram.com/everyday_editz.in/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#D9A6A0] hover:text-[#242424] transition-colors flex items-center space-x-1 font-medium"
            >
              <Instagram className="w-3.5 h-3.5" />
              <span>@everyday_editz.in</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(content, document.body);
};
