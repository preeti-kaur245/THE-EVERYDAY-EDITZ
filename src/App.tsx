/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ShopByDepartmentSection } from './components/ShopByDepartmentSection';
import { DailyEdit } from './components/DailyEdit';
import { DepartmentCollectionRow } from './components/DepartmentCollectionRow';
import { TrendingSection } from './components/TrendingSection';
import { ReelShelfSection } from './components/ReelShelfSection';
import { PricePicksSection } from './components/PricePicksSection';
import { SmartCombos } from './components/SmartCombos';
import { EditorialSection } from './components/EditorialSection';
import { NewArrivalsSection } from './components/NewArrivalsSection';
import { WishlistSection } from './components/WishlistSection';
import { WhyEverydayEditz } from './components/WhyEverydayEditz';
import { DepartmentLandingPage } from './components/DepartmentLandingPage';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ProductDetailModal } from './components/ProductDetailModal';
import { SeeItInActionReels } from './components/SeeItInActionReels';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { RewardsModal } from './components/RewardsModal';
import { SearchModal } from './components/SearchModal';
import { CustomerAccountModal } from './components/CustomerAccountModal';
import { ProductEnquiryModal } from './components/ProductEnquiryModal';
import { ProductWaitlistModal } from './components/ProductWaitlistModal';
import { CustomerFeedbackModal } from './components/CustomerFeedbackModal';
import { PolicyModal } from './components/PolicyModal';
import { ReturnClaimModal } from './components/ReturnClaimModal';
import { ToastContainer } from './components/ToastContainer';
import { BrandIntroLoader } from './components/BrandIntroLoader';
import { SEOHead } from './components/SEOHead';
import { CollectionLandingPage } from './components/CollectionLandingPage';
import { NotFoundPage } from './components/NotFoundPage';
import { CustomerAuthPages } from './components/CustomerAuthPages';
import { CustomerAccountDashboard } from './components/CustomerAccountDashboard';
import { AdminPortalPage } from './components/AdminPortalPage';
import { StaffPortalPage } from './components/StaffPortalPage';

const AUTH_ROUTE_VIEWS = new Set([
  'login',
  'register',
  'forgot-password',
  'reset-password',
]);

function StorefrontContent() {
  const { routeView, selectedDepartment, returnToHome } = useStore();

  const handleScrollToDailyEdit = () => {
    returnToHome();
    setTimeout(() => {
      const el = document.getElementById('daily-edit');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Dedicated isolated Admin Portal (/admin) — zero storefront navigation or public links
  if (routeView === 'admin') {
    return (
      <div className="min-h-screen bg-[#FAF8F6] text-[#242424] selection:bg-[#D9A6A0]/30 selection:text-[#242424]">
        <SEOHead />
        <AdminPortalPage />
        <ToastContainer />
      </div>
    );
  }

  // Dedicated Everyday Editz Staff Portal (/staff and /staff/login)
  if (routeView === 'staff' || routeView === 'staff-login') {
    return (
      <div className="min-h-screen bg-[#FAF8F6] text-[#242424] selection:bg-[#D9A6A0]/30 selection:text-[#242424]">
        <SEOHead />
        <StaffPortalPage />
        <ToastContainer />
      </div>
    );
  }

  // Dedicated minimal luxury Customer Authentication experience (/login, /register, /forgot-password, /reset-password)
  if (AUTH_ROUTE_VIEWS.has(routeView)) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] text-[#242424] selection:bg-[#D9A6A0]/30 selection:text-[#242424]">
        <SEOHead />
        <CustomerAuthPages />
        <PolicyModal />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#242424] flex flex-col selection:bg-[#D9A6A0]/30 selection:text-[#242424] pb-20 lg:pb-0">
      <SEOHead />
      
      {/* Signature Brand Loading Experience (Stage 1-5 Editorial Reveal) */}
      <BrandIntroLoader />

      {/* 1. Announcement Bar */}
      <AnnouncementBar />

      {/* 2. Brand Navigation with Department Mega-Menus */}
      <Header onNavigateHome={returnToHome} />

      {/* Main View: Account, Department, Collection, Custom 404, OR Complete Restructured Homepage */}
      <main className="flex-1">
        {routeView === 'account' ? (
          <>
            <CustomerAccountDashboard />
            <WhyEverydayEditz />
          </>
        ) : routeView === 'department' && selectedDepartment ? (
          <>
            <DepartmentLandingPage departmentId={selectedDepartment} />
            <WhyEverydayEditz />
          </>
        ) : routeView === 'new-arrivals' ? (
          <>
            <CollectionLandingPage collection="new-arrivals" />
            <WhyEverydayEditz />
          </>
        ) : routeView === 'everyday-essentials' ? (
          <>
            <CollectionLandingPage collection="everyday-essentials" />
            <WhyEverydayEditz />
          </>
        ) : routeView === 'not-found' ? (
          <>
            <NotFoundPage />
            <WhyEverydayEditz />
          </>
        ) : (
          <>
            {/* 3. Editorial Hero Banner */}
            <Hero onExploreClick={handleScrollToDailyEdit} />

            {/* 4. Shop by Department (Women, Men, Kids, Home & Lifestyle) */}
            <ShopByDepartmentSection />

            {/* 5. The Daily Edit (3-5 handpicked finds) */}
            <DailyEdit />

            {/* 6. Women's Featured Collection (70% Marketing Priority) */}
            <DepartmentCollectionRow 
              departmentId="women" 
              title="Women’s Featured Collection" 
              subtitle="Travel organizers, silk sleep masks, and curated self-care tools."
              badge="70% Allocation · Spotlight"
            />

            {/* 7. Men's Featured Collection (20% Marketing Priority) */}
            <DepartmentCollectionRow 
              departmentId="men" 
              title="Men’s Featured Collection" 
              subtitle="Beard styling sets, shockproof EDC pouches, and travel essentials."
              badge="20% Allocation · Daily Gear"
            />

            {/* 8. Kids' Featured Collection (10% Marketing Priority) */}
            <DepartmentCollectionRow 
              departmentId="kids" 
              title="Kids’ Featured Collection" 
              subtitle="Reusable wipe-clean books, safe magnetic blocks, and school organizers."
              badge="10% Allocation · Child-Safe"
            />

            {/* 9. Home & Lifestyle Collection */}
            <DepartmentCollectionRow 
              departmentId="home-lifestyle" 
              title="Home & Lifestyle Collection" 
              subtitle="Cross-category tools to declutter kitchens, wardrobes, and luggage."
              badge="Whole Home Organisation"
            />

            {/* 10. Trending Products */}
            <TrendingSection />

            {/* 10b. Studio Reels Shelf (Connected to Real Database, Hidden if empty) */}
            <ReelShelfSection />

            {/* 11. Best Finds Under ₹199 / ₹299 / ₹499 / ₹999 */}
            <PricePicksSection />

            {/* 12. Smart Combos */}
            <SmartCombos />

            {/* 13. Curated Editorial Capsules */}
            <EditorialSection />

            {/* 14. Recently Added (New Arrivals) */}
            <NewArrivalsSection />

            {/* Wishlist Section */}
            <WishlistSection />

            {/* 14. Brand Trust Section (Why Everyday Editz) & 15. Footer */}
            <WhyEverydayEditz />
          </>
        )}
      </main>

      {/* Mobile Sticky Thumb Navigation */}
      <MobileBottomNav />

      {/* Modals & Overlays */}
      <ProductDetailModal />
      <SeeItInActionReels />
      <CartDrawer />
      <CheckoutModal />
      <OrderTrackingModal />
      <RewardsModal />
      <SearchModal />
      <CustomerAccountModal />
      <ProductEnquiryModal />
      <ProductWaitlistModal />
      <CustomerFeedbackModal />
      <PolicyModal />
      <ReturnClaimModal />
      <ToastContainer />

    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <StorefrontContent />
    </StoreProvider>
  );
}
