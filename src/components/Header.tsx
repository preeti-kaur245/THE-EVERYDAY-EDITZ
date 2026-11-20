import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Department } from '../types';
import {
  Search,
  Heart,
  ShoppingBag,
  Menu,
  ChevronDown,
  ArrowRight,
  User,
} from 'lucide-react';
import { MobileNavDrawer } from './MobileNavDrawer';

interface HeaderProps {
  onNavigateHome: () => void;
  onNavigateShop?: () => void;
}

const DESKTOP_NAV_DEPT_ORDER: Department[] = ['men', 'women', 'kids', 'home-lifestyle'];

export const Header: React.FC<HeaderProps> = ({ onNavigateHome }) => {
  const {
    cartCount,
    wishlist,
    departments,
    routeView,
    selectedDepartment,
    navigateToDepartment,
    returnToHome,
    setIsCartOpen,
    setIsSearchOpen,
    navigateToAuth,
    navigateToAccount,
    currentCustomer,
    isMobileNavOpen,
    setIsMobileNavOpen,
    navigateToWishlist,
  } = useStore();

  const [activeMegaMenu, setActiveMegaMenu] = useState<Department | null>(null);

  // Order departments cleanly as Men, Women, Kids, Home & Lifestyle (each rendered exactly once)
  const orderedDepartments = useMemo(() => {
    const byId = new Map(departments.map((d) => [d.id, d]));
    const ordered = DESKTOP_NAV_DEPT_ORDER.map((id) => byId.get(id)).filter(
      (d): d is (typeof departments)[number] => Boolean(d)
    );
    const extras = departments.filter((d) => !DESKTOP_NAV_DEPT_ORDER.includes(d.id));
    return [...ordered, ...extras];
  }, [departments]);

  const handleDeptClick = (deptId: Department) => {
    setActiveMegaMenu(null);
    setIsMobileNavOpen(false);
    navigateToDepartment(deptId);
  };

  const handleSubcatClick = (deptId: Department, subcat: string) => {
    setActiveMegaMenu(null);
    setIsMobileNavOpen(false);
    navigateToDepartment(deptId, subcat);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F7F5F0]/95 backdrop-blur-md border-b border-black/8 transition-colors">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-6 xl:px-8 h-16 sm:h-[68px] grid grid-cols-[auto_1fr_auto] items-center gap-1.5 sm:gap-4 lg:gap-5 xl:gap-8">
        {/* LEFT ZONE: Hamburger (Mobile/Tablet) + Everyday Editz Logo & Brand Name */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0 min-w-0">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-[#242424] hover:bg-black/5 rounded-xl transition-colors cursor-pointer shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              returnToHome();
              onNavigateHome();
            }}
            className="flex items-center gap-1.5 sm:gap-2.5 hover:opacity-90 transition-opacity text-left cursor-pointer group shrink-0 min-w-0"
            aria-label="The Everyday Editz Home"
          >
            <img
              src="/brand-logo.jpg"
              alt="The Everyday Editz"
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-full object-cover ring-1 ring-[#D9A6A0]/55 shadow-xs group-hover:scale-105 transition-transform shrink-0"
            />
            <span className="text-[11px] min-[380px]:text-[13px] sm:text-base lg:text-base xl:text-lg font-bold tracking-tight text-[#242424] leading-none whitespace-nowrap">
              THE EVERYDAY EDITZ
            </span>
          </button>
        </div>

        {/* CENTER ZONE: Single Clean Desktop Navigation (Home, Men, Women, Kids, Home & Lifestyle) */}
        <nav
          aria-label="Primary Navigation"
          onMouseLeave={() => setActiveMegaMenu(null)}
          className="hidden lg:flex items-center justify-center gap-4 xl:gap-7 text-sm font-medium text-[#242424]/80 min-w-0"
        >
          <button
            type="button"
            onClick={() => {
              setActiveMegaMenu(null);
              returnToHome();
              onNavigateHome();
            }}
            className={`py-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
              routeView === 'home' && !selectedDepartment
                ? 'text-[#242424] font-semibold border-[#242424]'
                : 'border-transparent hover:text-[#242424] hover:border-[#D9A6A0]'
            }`}
          >
            Home
          </button>

          {orderedDepartments.map((dept) => {
            const isSelected = routeView === 'department' && selectedDepartment === dept.id;
            const isHovered = activeMegaMenu === dept.id;

            return (
              <div
                key={dept.id}
                onMouseEnter={() => setActiveMegaMenu(dept.id)}
                className="relative flex items-center"
              >
                <button
                  type="button"
                  onClick={() => handleDeptClick(dept.id)}
                  className={`py-2 flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                    isSelected
                      ? 'text-[#242424] font-semibold border-[#242424]'
                      : 'border-transparent hover:text-[#242424] hover:border-[#D9A6A0]'
                  }`}
                >
                  <span>{dept.name}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 opacity-60 transition-transform duration-150 ${
                      isHovered ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Desktop Mega-Menu Dropdown */}
                {isHovered && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
                    <div className="w-[500px] bg-white rounded-2xl shadow-xl border border-black/10 p-6 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-black/8">
                        <div>
                          <span className="text-xs font-mono uppercase tracking-wider text-[#536B57]">
                            {dept.name}
                          </span>
                          <h4 className="text-sm font-bold text-[#242424] mt-0.5">{dept.tagline}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeptClick(dept.id)}
                          className="text-xs font-semibold text-[#536B57] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <span>View All</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {dept.subcategories.map((subcat) => (
                          <button
                            type="button"
                            key={subcat}
                            onClick={() => handleSubcatClick(dept.id, subcat)}
                            className="p-2.5 text-left rounded-xl hover:bg-[#F7F5F0] transition-colors flex items-center justify-between group cursor-pointer border border-transparent hover:border-black/5"
                          >
                            <span className="text-xs font-semibold text-[#242424] group-hover:text-black truncate pr-2">
                              {subcat}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-black/25 group-hover:text-[#242424] group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Spacer on mobile/tablet so Left & Right align cleanly in 3-column grid */}
        <div className="lg:hidden" aria-hidden="true" />

        {/* RIGHT ZONE: Search, Wishlist, Desktop Cart (single instance), and Sign In / Account (top-right corner) */}
        <div className="flex items-center justify-end gap-0.5 sm:gap-1.5 lg:gap-2 shrink-0">
          {/* Search */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-[#242424]/80 hover:text-[#242424] hover:bg-black/5 rounded-full transition-colors cursor-pointer shrink-0"
            aria-label="Search products"
            title="Search"
          >
            <Search className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
          </button>

          {/* Wishlist */}
          <button
            type="button"
            onClick={navigateToWishlist}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-[#242424]/80 hover:text-[#242424] hover:bg-black/5 rounded-full transition-colors relative cursor-pointer shrink-0"
            aria-label="Wishlist"
            title="Wishlist"
          >
            <Heart className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
            {wishlist.length > 0 && (
              <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#D9A6A0] text-[#242424] font-bold text-[10px] font-mono tabular-nums flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </button>

          {/* Desktop Cart / Bag (Strictly hidden on mobile/tablet where MobileBottomNav provides the single Cart entry) */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="hidden lg:flex items-center gap-2 h-10 px-3.5 bg-[#242424] text-[#F7F5F0] rounded-xl hover:bg-black transition-colors shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
            aria-label="Open Shopping Bag"
            title="Shopping Bag"
          >
            <ShoppingBag className="w-4 h-4 text-[#D9A6A0] shrink-0" />
            <span className="text-xs font-semibold tabular-nums">
              {cartCount > 0 ? `Bag (${cartCount})` : 'Bag'}
            </span>
          </button>

          {/* Top-Right Corner: Sign In / Account */}
          <button
            type="button"
            onClick={() => (currentCustomer ? navigateToAccount('profile') : navigateToAuth('login'))}
            className={`h-9 sm:h-10 px-2 sm:px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap border ${
              routeView === 'account'
                ? 'bg-[#242424] text-[#FAF8F6] border-[#242424]'
                : 'bg-white text-[#242424] border-black/12 hover:border-[#242424]/35 hover:bg-[#FAF8F6]'
            }`}
            title={currentCustomer ? `My Account (${currentCustomer.firstName})` : 'Sign In or Create Account'}
            aria-label={currentCustomer ? 'My Account' : 'Sign In'}
          >
            <User className="w-4 h-4 shrink-0 text-[#9E6E65]" />
            <span className="max-w-[68px] sm:max-w-[96px] truncate">
              {currentCustomer ? currentCustomer.firstName : 'Sign In'}
            </span>
          </button>
        </div>
      </div>

      {/* Slide-in Mobile & Tablet Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        onNavigateHome={onNavigateHome}
      />
    </header>
  );
};
