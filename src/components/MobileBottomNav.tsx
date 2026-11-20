import React from 'react';
import { useStore } from '../context/StoreContext';
import { Home, Grid, Sparkles, Film, ShoppingBag } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { 
    cartCount, 
    reels,
    setIsCartOpen, 
    openReelModal,
    routeView,
    navigateToEditzAI,
    returnToHome,
    selectedDepartment,
    setIsMobileNavOpen
  } = useStore();

  const handleHomeClick = () => {
    returnToHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShopClick = () => {
    setIsMobileNavOpen(true);
  };

  const handleReelsClick = () => {
    if (reels && reels.length > 0) {
      openReelModal(reels[0]);
      return;
    }
    returnToHome();
    setTimeout(() => {
      const el = document.getElementById('reels-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 80);
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-black/10 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around text-xs shadow-lg"
    >
      {/* Home */}
      <button
        type="button"
        onClick={handleHomeClick}
        className={`flex flex-col items-center justify-center min-h-[44px] min-w-[52px] px-2 transition-colors cursor-pointer ${routeView === 'home' && !selectedDepartment ? 'text-[#242424] font-semibold' : 'text-[#242424]/70 hover:text-[#242424]'}`}
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] whitespace-nowrap">Home</span>
      </button>

      {/* Categories / Depts */}
      <button
        type="button"
        onClick={handleShopClick}
        className="flex flex-col items-center justify-center min-h-[44px] min-w-[52px] px-2 text-[#242424]/70 hover:text-[#242424] transition-colors cursor-pointer"
        aria-label="Open Categories Drawer"
      >
        <Grid className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] font-medium whitespace-nowrap">Shop</span>
      </button>

      {/* EDITZ AI Discovery Engine */}
      <button
        type="button"
        onClick={() => navigateToEditzAI(undefined, 'finder')}
        className={`flex flex-col items-center justify-center min-h-[44px] min-w-[56px] px-2 transition-colors cursor-pointer ${
          routeView === 'editz-ai' ? 'text-[#242424]' : 'text-[#536B57] hover:text-[#242424]'
        }`}
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-0.5 ${
          routeView === 'editz-ai' ? 'bg-[#536B57] text-white' : 'bg-[#536B57]/15 text-[#536B57]'
        }`}>
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] font-bold whitespace-nowrap">EDITZ AI</span>
      </button>

      {/* Reels */}
      <button
        type="button"
        onClick={handleReelsClick}
        className="flex flex-col items-center justify-center min-h-[44px] min-w-[52px] px-2 text-[#242424]/75 hover:text-[#242424] transition-colors cursor-pointer"
      >
        <Film className="w-5 h-5 mb-0.5 text-[#D9A6A0]" />
        <span className="text-[10px] font-medium whitespace-nowrap">Reels</span>
      </button>

      {/* Single Mobile Cart / Bag Entry */}
      <button
        type="button"
        onClick={() => setIsCartOpen(true)}
        className="flex flex-col items-center justify-center min-h-[44px] min-w-[52px] px-2 text-[#242424] transition-colors relative cursor-pointer"
        aria-label="Open Shopping Bag"
      >
        <div className="relative">
          <ShoppingBag className="w-5 h-5 mb-0.5 text-[#242424]" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#242424] text-white text-[9px] font-bold font-mono tabular-nums flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold whitespace-nowrap">Bag</span>
      </button>
    </nav>
  );
};
