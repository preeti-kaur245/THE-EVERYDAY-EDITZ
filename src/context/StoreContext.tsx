/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { backgroundAudio } from '../utils/backgroundAudio';
import { 
  Product, 
  Bundle, 
  CartItem, 
  Order, 
  Coupon, 
  StoreSettings, 
  RewardsTransaction,
  Department,
  DepartmentConfig,
  ProblemNeed,
  ProductCategory,
  Customer,
  ProductEnquiry,
  AbandonedCart,
  ProductWaitlist,
  CustomerFeedback,
  WebsiteActivity,
  GoogleSheetsConfig,
  SyncQueueItem,
  Supplier,
  ReturnClaim,
  StockAdjustmentLog,
  AdminAuditLog,
  PaymentTransaction,
  EditorialCollection,
  ReelVideo,
  ReelStatus
} from '../types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_BUNDLES, 
  INITIAL_COUPONS, 
  INITIAL_STORE_SETTINGS,
  DEPARTMENTS,
  INITIAL_CUSTOMERS,
  INITIAL_ENQUIRIES,
  INITIAL_ABANDONED_CARTS,
  INITIAL_WAITLIST,
  INITIAL_FEEDBACK,
  INITIAL_SUPPLIERS,
  INITIAL_RETURN_CLAIMS,
  INITIAL_STOCK_LOGS,
  INITIAL_EDITORIAL_COLLECTIONS
} from '../data/mockData';
import { 
  formatToIST, 
  sendToGoogleSheets, 
  testGoogleSheetsConnection, 
  downloadCSV 
} from '../services/googleSheetsService';

export const isProductLiveOnStorefront = (p: Product): boolean =>
  p.isPublished !== false && p.status !== 'Draft' && p.status !== 'Inactive';

export const sortProductsByMerchandising = (list: Product[]): Product[] =>
  [...list].sort((a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999));

export type AuthRouteView = 'login' | 'register' | 'forgot-password' | 'reset-password';
export type AccountTab = 'profile' | 'orders' | 'wishlist' | 'addresses' | 'security';
export type AuthReturnTarget =
  | { type: 'path'; path: string }
  | { type: 'checkout' }
  | { type: 'account'; tab?: AccountTab };

export type StoreRouteView =
  | 'home'
  | 'department'
  | 'new-arrivals'
  | 'everyday-essentials'
  | 'editz-ai'
  | AuthRouteView
  | 'account'
  | 'admin'
  | 'staff'
  | 'staff-login'
  | 'not-found';

type OverlayKey =
  | 'mobile-nav'
  | 'cart'
  | 'checkout'
  | 'search'
  | 'reels'
  | 'rewards'
  | 'tracking'
  | 'enquiry'
  | 'waitlist'
  | 'feedback'
  | 'return-claim'
  | 'policy'
  | 'admin-login'
  | 'admin-modal';

type PolicyTab =
  | 'about'
  | 'shipping'
  | 'returns'
  | 'replacements'
  | 'refunds'
  | 'privacy'
  | 'terms'
  | 'contact'
  | 'grievance'
  | 'faq';

interface EdzHistoryState {
  __edzNav: true;
  depth: number;
  kind: 'route' | 'product' | 'overlay';
  path: string;
  routeView: StoreRouteView;
  department: Department | null;
  subcategory: string | null;
  productId: string | null;
  overlays: OverlayKey[];
  policyTab?: PolicyTab | null;
  scrollY?: number;
}

interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'warning';
}

export interface CartStockIssue {
  productId: string;
  variantId?: string;
  message: string;
}

interface StoreContextType {
  // Products & Bundles
  products: Product[];
  bundles: Bundle[];
  departments: DepartmentConfig[];
  setDepartments: React.Dispatch<React.SetStateAction<DepartmentConfig[]>>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (id: string) => Promise<void>;
  saveMerchandising: (items: Array<{ id: string; displayOrder?: number; isFeatured?: boolean; isDailyEdit?: boolean; isTrending?: boolean; isNewArrival?: boolean; isBestSeller?: boolean; isPublished?: boolean; inStock?: boolean; status?: Product['status'] }>) => Promise<{ success: boolean; error?: string }>;
  persistProductImage: (productId: string, dataUrl: string, filename?: string, isPrimary?: boolean) => Promise<{ success: boolean; url?: string; updatedProduct?: Product; error?: string }>;
  persistProductGallery: (productId: string, images: string[], primaryImage?: string) => Promise<{ success: boolean; updatedProduct?: Product; error?: string }>;
  refreshProducts: (preferAdmin?: boolean) => Promise<Product[]>;

  // Department, Collection and Subcategory navigation
  routeView: StoreRouteView;
  selectedDepartment: Department | null;
  setSelectedDepartment: (dept: Department | null) => void;
  selectedSubcategory: string | null;
  setSelectedSubcategory: (subcat: string | null) => void;
  navigateToDepartment: (dept: Department, subcategory?: string) => void;
  navigateToCollection: (collection: 'new-arrivals' | 'everyday-essentials') => void;
  navigateToAuth: (view: AuthRouteView, query?: Record<string, string>, returnTo?: AuthReturnTarget) => void;
  navigateToAccount: (tab?: AccountTab) => void;
  navigateToAdmin: () => void;
  navigateToStaffLogin: () => void;
  navigateToStaffPortal: () => void;
  authReturnTo: AuthReturnTarget | null;
  completeAuthRedirect: () => void;
  activeAccountTab: AccountTab;
  setActiveAccountTab: (tab: AccountTab) => void;
  returnToHome: () => void;
  navigateToWishlist: () => void;
  openProductModal: (product: Product) => void;
  closeProductModal: () => void;

  // Singleton Background Audio Controls
  isBgAudioPlaying: boolean;
  isBgAudioUserPaused: boolean;
  isBgAudioAwaitingInteraction: boolean;
  toggleBgAudio: () => void;

  // Dynamic Price Filter state
  activePriceTier: 'all' | 'under-199' | 'under-299' | 'under-499' | 'under-999';
  setActivePriceTier: (tier: 'all' | 'under-199' | 'under-299' | 'under-499' | 'under-999') => void;

  // Cart
  cart: CartItem[];
  addToCart: (
    product: Product, 
    quantity?: number, 
    variant?: string, 
    variantDetails?: {
      variantId?: string;
      selectedColor?: string;
      selectedSize?: string;
      selectedOptions?: Record<string, string>;
      unitPrice?: number;
      variantSku?: string;
      variantImage?: string;
    }
  ) => void;
  updateCartQuantity: (productId: string, quantity: number, variant?: string, variantId?: string) => void;
  removeFromCart: (productId: string, variant?: string, variantId?: string) => void;
  clearCart: () => void;
  addBundleToCart: (bundle: Bundle) => void;
  cartCount: number;
  cartSubtotal: number;
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  couponDiscount: number;
  redeemedPointsDiscount: number;
  shippingFee: number;
  cartTotal: number;
  cartStockIssues: CartStockIssue[];
  hasCartStockIssue: boolean;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  wishlistRestockAlerts: string[];
  toggleWishlistRestockAlert: (product: Product) => void;

  // Orders & Fulfilment
  orders: Order[];
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'status' | 'courierName' | 'trackingNumber'>) => Order;
  updateOrderStatus: (
    orderId: string, 
    status: Order['status'], 
    trackingNumber?: string, 
    supplierName?: string, 
    supplierOrderRef?: string
  ) => void;
  recentOrder: Order | null;

  // Customer Management & Authentication
  customers: Customer[];
  currentCustomer: Customer | null;
  customerToken: string | null;
  isCustomerSessionChecked: boolean;
  setCurrentCustomer: (customer: Customer | null) => void;
  registerOrUpdateCustomer: (data: Partial<Customer>) => Customer;
  updateCustomerRecord: (id: string, updates: Partial<Customer>) => void;
  registerCustomer: (payload: Record<string, any>) => Promise<{ success: boolean; field?: string; error?: string; customer?: Customer }>;
  loginCustomer: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; field?: string; error?: string; customer?: Customer }>;
  logoutCustomer: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; email?: string; error?: string; resetUrl?: string; expiresInMinutes?: number }>;
  confirmPasswordReset: (token: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; field?: string; error?: string }>;
  changeCustomerPassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; field?: string; error?: string }>;
  fetchCustomerOrders: () => Promise<Order[]>;
  updateCustomerProfile: (updates: Partial<Customer>) => Promise<{ success: boolean; error?: string; customer?: Customer }>;
  saveCustomerAddresses: (savedAddresses: Customer['savedAddresses']) => Promise<{ success: boolean; error?: string; customer?: Customer }>;

  // Product Enquiries
  enquiries: ProductEnquiry[];
  submitEnquiry: (data: Omit<ProductEnquiry, 'id' | 'enquiryDate' | 'enquiryStatus'>) => void;
  updateEnquiryStatus: (id: string, status: ProductEnquiry['enquiryStatus']) => void;

  // Product Waitlist
  waitlists: ProductWaitlist[];
  joinWaitlist: (data: Omit<ProductWaitlist, 'id' | 'registrationDate' | 'status'>) => void;
  updateWaitlistStatus: (id: string, status: ProductWaitlist['status']) => void;

  // Customer Feedback
  feedbackList: CustomerFeedback[];
  submitFeedback: (data: Omit<CustomerFeedback, 'id' | 'submissionDate'>) => void;

  // Abandoned Carts
  abandonedCarts: AbandonedCart[];
  trackAbandonedCart: (data: Partial<AbandonedCart>) => void;
  updateAbandonedCartStatus: (id: string, status: AbandonedCart['recoveryStatus']) => void;

  // Website Activity (Consented)
  logActivity: (type: WebsiteActivity['activityType'], page: string, productId?: string) => void;

  // Google Sheets Automation
  googleSheetsConfig: GoogleSheetsConfig;
  setGoogleSheetsUrl: (url: string) => void;
  testSheetsConnection: () => Promise<boolean>;
  syncQueue: SyncQueueItem[];
  retryFailedSyncQueue: () => Promise<void>;
  syncAllExistingToSheets: () => Promise<void>;
  sendTestCustomerAndOrderToSheets: () => Promise<{ success: boolean; message: string }>;

  // CSV Export functions
  exportCustomersCSV: () => void;
  exportOrdersCSV: () => void;
  exportEnquiriesCSV: () => void;
  exportAbandonedCartsCSV: () => void;
  exportWaitlistCSV: () => void;
  exportFeedbackCSV: () => void;

  // Rewards
  rewardsBalance: number;
  rewardsHistory: RewardsTransaction[];
  referralCode: string;
  redeemPointsForOrder: (pointsToRedeem: number) => boolean;
  pointsToRedeemAtCheckout: number;
  setPointsToRedeemAtCheckout: (points: number) => void;
  syncRewardsFromServer: () => Promise<void>;

  // Store Settings (Admin editable)
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<{ success: boolean; error?: string }>;
  coupons: Coupon[];
  addCoupon: (coupon: Coupon) => void;
  toggleCouponActive: (code: string) => void;

  // Category Configuration Management
  addCategoryToDepartment: (deptId: Department, subcategoryName: string) => void;
  removeCategoryFromDepartment: (deptId: Department, subcategoryName: string) => void;
  renameCategoryInDepartment: (deptId: Department, oldName: string, newName: string) => void;

  // Inventory & Suppliers
  suppliers: Supplier[];
  stockLogs: StockAdjustmentLog[];
  adjustProductStock: (productId: string, changeAmount: number, reason: StockAdjustmentLog['reason'], adjustedBy?: string) => void;

  // Payments & Transactions
  paymentTransactions: PaymentTransaction[];

  // Return & Replacement Claims
  returnClaims: ReturnClaim[];
  submitReturnClaim: (claim: Omit<ReturnClaim, 'id' | 'createdAt' | 'status'>) => Promise<{ success: boolean; claimId?: string; error?: string }>;
  updateReturnClaimStatus: (claimId: string, status: ReturnClaim['status'], adminNotes?: string) => void;

  // Editorial Collections
  editorialCollections: EditorialCollection[];
  saveEditorialCollection: (col: Partial<EditorialCollection>) => Promise<{ success: boolean; collection?: EditorialCollection; error?: string }>;
  deleteEditorialCollection: (id: string) => Promise<{ success: boolean; error?: string }>;
  uploadProductImage: (dataUrl: string, filename?: string) => Promise<{ success: boolean; url?: string; error?: string }>;

  // Reels & Video Content Management (Admin & Storefront)
  reels: ReelVideo[];
  adminReels: ReelVideo[];
  adminReelsStats: { total: number; published: number; draft: number; unpublished: number; scheduled: number; expired: number };
  isLoadingReels: boolean;
  activeReel: ReelVideo | null;
  setActiveReel: (reel: ReelVideo | null) => void;
  openReelModal: (reelOrId?: ReelVideo | string) => void;
  fetchReels: () => Promise<void>;
  fetchAdminReels: () => Promise<void>;
  createReel: (reelData: Partial<ReelVideo>) => Promise<{ success: boolean; reel?: ReelVideo; error?: string }>;
  updateReel: (id: string, updates: Partial<ReelVideo> & { cleanupOldVideo?: boolean }) => Promise<{ success: boolean; reel?: ReelVideo; error?: string }>;
  deleteReel: (id: string) => Promise<{ success: boolean; error?: string }>;
  togglePublishReel: (id: string) => Promise<{ success: boolean; reel?: ReelVideo; error?: string }>;
  reorderReels: (reelIds: string[]) => Promise<{ success: boolean; error?: string }>;
  uploadReelVideo: (videoData: string, filename: string, mimeType?: string) => Promise<{ success: boolean; url?: string; bytes?: number; filename?: string; mimeType?: string; error?: string }>;
  uploadReelThumbnail: (imageData: string, filename?: string) => Promise<{ success: boolean; url?: string; filename?: string; error?: string }>;
  likedReelIds: string[];
  reelLikesMap: Record<string, number>;
  toggleReelLike: (slotId: string, label?: string) => void;

  // Discovery, Analytics & Consented Personalization
  trackAnalyticsEvent: (eventType: string, label?: string, metadata?: Record<string, any>) => void;
  editzAiPrompt: string;
  setEditzAiPrompt: (prompt: string) => void;
  navigateToEditzAI: (prompt?: string, mode?: string) => void;
  personalizationConsent: boolean;
  setPersonalizationConsent: (consent: boolean) => void;
  recentlyViewedIds: string[];
  consentedSearchTerms: string[];
  recordSearchSignal: (term: string) => void;
  clearPersonalizationSignals: () => void;

  // Admin Security & Session
  adminToken: string | null;
  isAdminAuthenticated: boolean;
  isAdminSessionChecked: boolean;
  adminLogin: (password: string, username?: string) => Promise<{ success: boolean; error?: string }>;
  adminLogout: () => void;

  // Staff Portal Security & Session (reuses existing configured credentials server-side)
  staffToken: string | null;
  isStaffAuthenticated: boolean;
  isStaffSessionChecked: boolean;
  staffUsername: string | null;
  staffLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  staffLogout: () => Promise<void>;
  syncStoreSettingsLocally: (patch: Partial<StoreSettings>) => void;

  // Active Modals & Views
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
  isAdminLoginModalOpen: boolean;
  setIsAdminLoginModalOpen: (open: boolean) => void;
  isReturnClaimOpen: boolean;
  setIsReturnClaimOpen: (open: boolean) => void;
  returnClaimPrefillOrder: string;
  setReturnClaimPrefillOrder: (orderId: string) => void;
  isRewardsOpen: boolean;
  setIsRewardsOpen: (open: boolean) => void;
  isTrackingOpen: boolean;
  setIsTrackingOpen: (open: boolean) => void;
  trackingLookupId: string;
  setTrackingLookupId: (id: string) => void;
  isAccountOpen: boolean;
  setIsAccountOpen: (open: boolean) => void;
  isEnquiryOpen: boolean;
  setIsEnquiryOpen: (open: boolean) => void;
  enquiryProduct: Product | null;
  setEnquiryProduct: (prod: Product | null) => void;
  isWaitlistOpen: boolean;
  setIsWaitlistOpen: (open: boolean) => void;
  waitlistProduct: Product | null;
  setWaitlistProduct: (prod: Product | null) => void;
  isFeedbackOpen: boolean;
  setIsFeedbackOpen: (open: boolean) => void;
  feedbackProduct: Product | null;
  setFeedbackProduct: (prod: Product | null) => void;
  activePolicy: 'about' | 'shipping' | 'returns' | 'replacements' | 'refunds' | 'privacy' | 'terms' | 'contact' | 'grievance' | 'faq' | null;
  setActivePolicy: (policy: 'about' | 'shipping' | 'returns' | 'replacements' | 'refunds' | 'privacy' | 'terms' | 'contact' | 'grievance' | 'faq' | null) => void;
  isReelsOpen: boolean;
  setIsReelsOpen: (open: boolean) => void;
  activeReelIndex: number;
  setActiveReelIndex: (index: number) => void;

  // Search & Old category navigation compatibility
  selectedNeed: ProblemNeed | null;
  setSelectedNeed: (need: ProblemNeed | null) => void;
  selectedCategory: ProductCategory | null;
  setSelectedCategory: (category: ProductCategory | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Session ID for Website Activity
  const sessionId = useRef(`sess-${Math.random().toString(36).substring(2, 9)}`).current;

  // Purge legacy storage keys once on load so dummy customers/orders never reappear
  try {
    ['edz_orders', 'edz_customers', 'edz_current_customer', 'edz_enquiries', 'edz_abandoned_carts', 'edz_waitlist', 'edz_feedback', 'edz_products', 'edz_products_v2', 'edz_wishlist'].forEach((k) => {
      localStorage.removeItem(k);
    });
  } catch {
    // Ignore in non-browser environment
  }

  // 1. Products (Always load canonical catalogue products)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('edz_products_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  // Bundles
  const [bundles] = useState<Bundle[]>(INITIAL_BUNDLES);

  // Editorial Collections
  const [editorialCollections, setEditorialCollections] = useState<EditorialCollection[]>(INITIAL_EDITORIAL_COLLECTIONS);

  // Departments configuration
  const [departments, setDepartments] = useState<DepartmentConfig[]>(() => {
    try {
      const saved = localStorage.getItem('edz_departments');
      return saved ? JSON.parse(saved) : DEPARTMENTS;
    } catch {
      return DEPARTMENTS;
    }
  });

  // Route, Department & Subcategory Active Selection
  const [routeView, setRouteView] = useState<StoreRouteView>('home');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [activePriceTier, setActivePriceTier] = useState<'all' | 'under-199' | 'under-299' | 'under-499' | 'under-999'>('all');
  const [authReturnTo, setAuthReturnTo] = useState<AuthReturnTarget | null>(null);
  const [activeAccountTab, setActiveAccountTab] = useState<AccountTab>('profile');

  // Settings
  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem('edz_settings');
      return saved ? JSON.parse(saved) : INITIAL_STORE_SETTINGS;
    } catch {
      return INITIAL_STORE_SETTINGS;
    }
  });

  // Coupons
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const saved = localStorage.getItem('edz_coupons');
      return saved ? JSON.parse(saved) : INITIAL_COUPONS;
    } catch {
      return INITIAL_COUPONS;
    }
  });

  // Cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('edz_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Wishlist (Starts empty)
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('edz_wishlist_v4');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Orders (Starts clean with 0 orders until actual checkout)
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('edz_orders_v4');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentOrder, setRecentOrder] = useState<Order | null>(null);

  // CRM: Customers (Starts clean with 0 customers until customer registers or places order)
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('edz_customers_v4');
      return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  });

  // Current Logged-in Customer & Auth Token (supports Remember Me localStorage + sessionStorage)
  const [customerToken, setCustomerToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('edz_customer_token') || sessionStorage.getItem('edz_customer_token') || null;
    } catch {
      return null;
    }
  });
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(() => {
    try {
      const saved = localStorage.getItem('edz_current_customer_v4') || sessionStorage.getItem('edz_current_customer_v4');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isCustomerSessionChecked, setIsCustomerSessionChecked] = useState<boolean>(false);

  // CRM: Enquiries (Starts clean)
  const [enquiries, setEnquiries] = useState<ProductEnquiry[]>(() => {
    try {
      const saved = localStorage.getItem('edz_enquiries_v4');
      return saved ? JSON.parse(saved) : INITIAL_ENQUIRIES;
    } catch {
      return INITIAL_ENQUIRIES;
    }
  });

  // CRM: Abandoned Carts (Starts clean)
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCart[]>(() => {
    try {
      const saved = localStorage.getItem('edz_abandoned_carts_v4');
      return saved ? JSON.parse(saved) : INITIAL_ABANDONED_CARTS;
    } catch {
      return INITIAL_ABANDONED_CARTS;
    }
  });

  // CRM: Product Waitlists (Starts clean)
  const [waitlists, setWaitlists] = useState<ProductWaitlist[]>(() => {
    try {
      const saved = localStorage.getItem('edz_waitlist_v4');
      return saved ? JSON.parse(saved) : INITIAL_WAITLIST;
    } catch {
      return INITIAL_WAITLIST;
    }
  });

  // CRM: Customer Feedback (Starts clean)
  const [feedbackList, setFeedbackList] = useState<CustomerFeedback[]>(() => {
    try {
      const saved = localStorage.getItem('edz_feedback_v4');
      return saved ? JSON.parse(saved) : INITIAL_FEEDBACK;
    } catch {
      return INITIAL_FEEDBACK;
    }
  });

  // CRM: Website Activities (in memory buffer)
  const [activities, setActivities] = useState<WebsiteActivity[]>([]);

  // User's Deployed Google Apps Script Web App URL
  const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx2Y_diNJLiRryZXfM8eklSK9dFxaxNcNJmgISvavE1E38CD6fhS-eqvhXT7vEXc-kF/exec';

  // Google Sheets Config & Synchronization State
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState<GoogleSheetsConfig>(() => {
    try {
      const savedUrl = localStorage.getItem('edz_sheets_url') || DEFAULT_APPS_SCRIPT_URL;
      return {
        appsScriptUrl: savedUrl,
        isConnected: false,
        lastCheckedAt: undefined,
        lastSyncStatus: savedUrl ? 'idle' : 'pending',
        errorMessage: undefined,
        totalSyncedRecords: 0,
      };
    } catch {
      return {
        appsScriptUrl: DEFAULT_APPS_SCRIPT_URL,
        isConnected: false,
        lastSyncStatus: 'idle',
        totalSyncedRecords: 0,
      };
    }
  });

  // Sync Queue for Offline / Unconnected / Failed syncs
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem('edz_sync_queue_v4');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Rewards (Starts clean with 0 points)
  const [rewardsBalance, setRewardsBalance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('edz_rewards_pts');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [rewardsHistory, setRewardsHistory] = useState<RewardsTransaction[]>([]);

  const [referralCode] = useState<string>('EDITZ-SHR72');
  const [pointsToRedeemAtCheckout, setPointsToRedeemAtCheckout] = useState<number>(0);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Inventory, Suppliers & Security State
  const [suppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem('edz_suppliers_v4');
      return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
    } catch {
      return INITIAL_SUPPLIERS;
    }
  });

  const [returnClaims, setReturnClaims] = useState<ReturnClaim[]>(() => {
    try {
      const saved = localStorage.getItem('edz_claims_v4');
      return saved ? JSON.parse(saved) : INITIAL_RETURN_CLAIMS;
    } catch {
      return INITIAL_RETURN_CLAIMS;
    }
  });

  const [stockLogs, setStockLogs] = useState<StockAdjustmentLog[]>(() => {
    try {
      const saved = localStorage.getItem('edz_stock_logs_v4');
      return saved ? JSON.parse(saved) : INITIAL_STOCK_LOGS;
    } catch {
      return INITIAL_STOCK_LOGS;
    }
  });

  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('edz_payments_v4');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Admin Security & Authenticated Session
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('edz_admin_token') || localStorage.getItem('edz_admin_token') || null;
    } catch {
      return null;
    }
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isAdminSessionChecked, setIsAdminSessionChecked] = useState<boolean>(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);

  // Staff Portal Security & Authenticated Session (sessionStorage only; never stores passwords)
  const [staffToken, setStaffToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('edz_staff_token') || null;
    } catch {
      return null;
    }
  });
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(false);
  const [isStaffSessionChecked, setIsStaffSessionChecked] = useState<boolean>(false);
  const [staffUsername, setStaffUsername] = useState<string | null>(null);

  // Return & Replacement Claim Modal
  const [isReturnClaimOpen, setIsReturnClaimOpen] = useState(false);
  const [returnClaimPrefillOrder, setReturnClaimPrefillOrder] = useState('');

  // Modals & Navigation
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingLookupId, setTrackingLookupId] = useState('');
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [enquiryProduct, setEnquiryProduct] = useState<Product | null>(null);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [waitlistProduct, setWaitlistProduct] = useState<Product | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackProduct, setFeedbackProduct] = useState<Product | null>(null);

  const [activePolicy, setActivePolicy] = useState<'about' | 'shipping' | 'returns' | 'replacements' | 'refunds' | 'privacy' | 'terms' | 'contact' | 'grievance' | 'faq' | null>(null);
  const [isReelsOpen, setIsReelsOpen] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState(0);

  // Reels & Video Content Management states
  const [reels, setReels] = useState<ReelVideo[]>([]);
  const [adminReels, setAdminReels] = useState<ReelVideo[]>([]);
  const [adminReelsStats, setAdminReelsStats] = useState({ total: 0, published: 0, draft: 0, unpublished: 0, scheduled: 0, expired: 0 });
  const [isLoadingReels, setIsLoadingReels] = useState(false);
  const [activeReel, setActiveReel] = useState<ReelVideo | null>(null);

  // Filters
  const [selectedNeed, setSelectedNeed] = useState<ProblemNeed | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Singleton Background Audio Subscription & Autoplay Bootstrap
  const bgAudioState = useSyncExternalStore(
    backgroundAudio.subscribe,
    backgroundAudio.getSnapshot,
    backgroundAudio.getSnapshot
  );

  useEffect(() => {
    backgroundAudio.initAutoPlay();
  }, []);

  const toggleBgAudio = () => {
    backgroundAudio.toggle();
  };

  // Reel likes, Wishlist drop alerts, Analytics & Consented Personalization
  const [likedReelIds, setLikedReelIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('edz_liked_reels');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [reelLikesMap, setReelLikesMap] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('edz_reel_likes_map');
      const parsed = saved ? JSON.parse(saved) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });

  const [wishlistRestockAlerts, setWishlistRestockAlerts] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('edz_wishlist_alerts');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [editzAiPrompt, setEditzAiPrompt] = useState<string>('');
  const [personalizationConsent, setPersonalizationConsentState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('edz_personalization_consent') !== 'false';
    } catch {
      return true;
    }
  });
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('edz_recently_viewed');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [consentedSearchTerms, setConsentedSearchTerms] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('edz_search_signals');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const trackAnalyticsEvent = (_eventType: string, _label?: string, _metadata?: Record<string, any>) => {
    try {
      const w = window as any;
      if (Array.isArray(w.dataLayer)) {
        w.dataLayer.push({
          event: _eventType,
          label: _label || '',
          ...(_metadata || {}),
        });
      }
    } catch {
      // Non-blocking analytics hook
    }
  };

  const toggleReelLike = (slotId: string, label?: string) => {
    setLikedReelIds((prev) => {
      const exists = prev.includes(slotId);
      const next = exists ? prev.filter((id) => id !== slotId) : [...prev, slotId];
      try {
        localStorage.setItem('edz_liked_reels', JSON.stringify(next));
      } catch {}

      setReelLikesMap((prevMap) => {
        const current = typeof prevMap[slotId] === 'number' ? prevMap[slotId] : 0;
        const nextCount = exists ? Math.max(0, current - 1) : current + 1;
        const updatedMap = { ...prevMap, [slotId]: nextCount };
        try {
          localStorage.setItem('edz_reel_likes_map', JSON.stringify(updatedMap));
        } catch {}
        return updatedMap;
      });

      trackAnalyticsEvent('reel_like', `${exists ? 'unlike' : 'like'}:${label || slotId}`);
      return next;
    });
  };

  const toggleWishlistRestockAlert = (product: Product) => {
    setWishlistRestockAlerts((prev) => {
      const active = prev.includes(product.id);
      const next = active ? prev.filter((id) => id !== product.id) : [...prev, product.id];
      try {
        localStorage.setItem('edz_wishlist_alerts', JSON.stringify(next));
      } catch {}
      showToast(
        active
          ? `Drop alert turned off for ${product.name}.`
          : `We’ll alert you on restocks & price drops for ${product.name}.`,
        active ? 'info' : 'success'
      );
      return next;
    });
  };

  const syncRewardsFromServer = async () => {
    // Rewards balance is already hydrated with the customer profile/local store
    return;
  };

  const setPersonalizationConsent = (consent: boolean) => {
    setPersonalizationConsentState(consent);
    try {
      localStorage.setItem('edz_personalization_consent', consent ? 'true' : 'false');
    } catch {}
  };

  const recordSearchSignal = (term: string) => {
    const clean = term.trim();
    if (!clean || !personalizationConsent) return;
    setConsentedSearchTerms((prev) => {
      const next = [clean, ...prev.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem('edz_search_signals', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearPersonalizationSignals = () => {
    setRecentlyViewedIds([]);
    setConsentedSearchTerms([]);
    try {
      localStorage.removeItem('edz_recently_viewed');
      localStorage.removeItem('edz_search_signals');
    } catch {}
    showToast('Personalization history cleared.', 'info');
  };

  const navigateToEditzAI = (prompt?: string, _mode?: string) => {
    if (prompt) {
      setEditzAiPrompt(prompt);
      setSearchQuery(prompt);
    }
    const aiSection = typeof document !== 'undefined' ? document.getElementById('editz-ai-section') : null;
    if (aiSection) {
      aiSection.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setIsSearchOpen(true);
  };

  // Helper to fetch canonical catalog from backend (admin token gets drafts too)
  const fetchCanonicalProducts = async (tokenOverride?: string | null): Promise<Product[]> => {
    const activeAdminToken = tokenOverride !== undefined ? tokenOverride : adminToken;
    try {
      const endpoint = activeAdminToken ? '/api/admin/products' : '/api/products';
      const res = await fetch(endpoint, {
        cache: 'no-store',
        headers: activeAdminToken ? { Authorization: `Bearer ${activeAdminToken}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.products)) {
          const sorted = sortProductsByMerchandising(data.products);
          setProducts(sorted);
          setSelectedProduct((prev) => (prev ? sorted.find((p) => p.id === prev.id) || prev : null));
          return sorted;
        }
      }
      // Fallback to public products if admin endpoint failed
      if (activeAdminToken) {
        const pubRes = await fetch('/api/products', { cache: 'no-store' });
        if (pubRes.ok) {
          const pubData = await pubRes.json();
          if (pubData?.success && Array.isArray(pubData.products)) {
            const sorted = sortProductsByMerchandising(pubData.products);
            setProducts(sorted);
            return sorted;
          }
        }
      }
    } catch {
      // Keep current state in offline mode
    }
    return products;
  };

  // Server-Authoritative Data & Session Synchronization
  useEffect(() => {
    // 1. Verify Admin Session first so we know whether to load admin view (including drafts)
    const storedToken = sessionStorage.getItem('edz_admin_token') || localStorage.getItem('edz_admin_token');
    if (storedToken) {
      if (storedToken.startsWith('admin_local_')) {
        setAdminToken(storedToken);
        setIsAdminAuthenticated(true);
        setIsAdminSessionChecked(true);
        fetchCanonicalProducts(storedToken);
      } else {
        fetch('/api/admin/verify', {
          headers: { Authorization: `Bearer ${storedToken}` }
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!data || !data.success) {
              setAdminToken(null);
              setIsAdminAuthenticated(false);
              sessionStorage.removeItem('edz_admin_token');
              localStorage.removeItem('edz_admin_token');
              setIsAdminOpen(false);
              fetchCanonicalProducts(null);
            } else {
              setAdminToken(storedToken);
              setIsAdminAuthenticated(true);
              fetchCanonicalProducts(storedToken);
              fetch('/api/admin/customers', { headers: { Authorization: `Bearer ${storedToken}` } })
                .then((r) => (r.ok ? r.json() : null))
                .then((cData) => {
                  if (cData?.success && Array.isArray(cData.customers) && cData.customers.length > 0) {
                    setCustomers(cData.customers);
                  }
                })
                .catch(() => {});
            }
          })
          .catch(() => {
            setAdminToken(null);
            setIsAdminAuthenticated(false);
            sessionStorage.removeItem('edz_admin_token');
            localStorage.removeItem('edz_admin_token');
            setIsAdminOpen(false);
            fetchCanonicalProducts(null);
          })
          .finally(() => {
            setIsAdminSessionChecked(true);
          });
      }
    } else {
      setIsAdminAuthenticated(false);
      setIsAdminSessionChecked(true);
      fetchCanonicalProducts(null);
    }

    // 1b. Verify Staff Portal Session (never auto-grants staff to customers)
    const storedStaffToken = (() => {
      try {
        return sessionStorage.getItem('edz_staff_token');
      } catch {
        return null;
      }
    })();
    if (storedStaffToken) {
      if (storedStaffToken.startsWith('staff_local_')) {
        const usernamePart = storedStaffToken.split('_')[2] || 'Staff';
        setStaffToken(storedStaffToken);
        setIsStaffAuthenticated(true);
        setStaffUsername(usernamePart);
        setIsStaffSessionChecked(true);
      } else {
        fetch('/api/staff/verify', {
          headers: { Authorization: `Bearer ${storedStaffToken}` }
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.success && data.user) {
              setStaffToken(storedStaffToken);
              setIsStaffAuthenticated(true);
              setStaffUsername(data.user.username || 'Staff');
            } else {
              setStaffToken(null);
              setIsStaffAuthenticated(false);
              setStaffUsername(null);
              sessionStorage.removeItem('edz_staff_token');
            }
          })
          .catch(() => {
            setStaffToken(null);
            setIsStaffAuthenticated(false);
            setStaffUsername(null);
            sessionStorage.removeItem('edz_staff_token');
          })
          .finally(() => {
            setIsStaffSessionChecked(true);
          });
      }
    } else {
      setIsStaffAuthenticated(false);
      setIsStaffSessionChecked(true);
    }

    // 2. Fetch Canonical Settings & Persisted Department Categories
    fetch('/api/settings', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
          if (Array.isArray(data.settings.departmentsConfig) && data.settings.departmentsConfig.length > 0) {
            setDepartments(data.settings.departmentsConfig);
          }
        }
      })
      .catch(() => {});

    // 3. Verify Customer Auth Session if token exists (checks localStorage + sessionStorage)
    const storedCustomerToken = localStorage.getItem('edz_customer_token') || sessionStorage.getItem('edz_customer_token');
    if (storedCustomerToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedCustomerToken}` }
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && data.customer) {
            setCurrentCustomer(data.customer);
            setCustomerToken(storedCustomerToken);
          } else {
            localStorage.removeItem('edz_customer_token');
            sessionStorage.removeItem('edz_customer_token');
            localStorage.removeItem('edz_current_customer_v4');
            sessionStorage.removeItem('edz_current_customer_v4');
            setCustomerToken(null);
            setCurrentCustomer(null);
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsCustomerSessionChecked(true);
        });
    } else {
      setIsCustomerSessionChecked(true);
    }

    // 4. Fetch Editorial Collections
    fetch('/api/editorial')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.collections)) {
          setEditorialCollections(data.collections);
        }
      })
      .catch(() => {});

    // 5. Fetch Published Reels from Database
    fetch('/api/reels')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.reels)) {
          setReels(data.reels);
          if (data.reels.length > 0 && !activeReel) {
            setActiveReel(data.reels[0]);
          }
        }
      })
      .catch(() => {});

    // 6. Revalidate products when tab regains focus so admin edits appear across tabs
    const handleFocusRevalidate = () => {
      const currentAdmin = sessionStorage.getItem('edz_admin_token') || localStorage.getItem('edz_admin_token');
      fetchCanonicalProducts(currentAdmin);
    };
    window.addEventListener('focus', handleFocusRevalidate);
    return () => window.removeEventListener('focus', handleFocusRevalidate);
  }, []);

  // LocalStorage Persistence
  useEffect(() => {
    localStorage.setItem('edz_products_v4', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('edz_departments', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
    localStorage.setItem('edz_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('edz_coupons', JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem('edz_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('edz_wishlist_v4', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('edz_orders_v4', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('edz_customers_v4', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    if (currentCustomer) {
      localStorage.setItem('edz_current_customer_v4', JSON.stringify(currentCustomer));
    } else {
      localStorage.removeItem('edz_current_customer_v4');
    }
  }, [currentCustomer]);

  useEffect(() => {
    localStorage.setItem('edz_enquiries_v4', JSON.stringify(enquiries));
  }, [enquiries]);

  useEffect(() => {
    localStorage.setItem('edz_abandoned_carts_v4', JSON.stringify(abandonedCarts));
  }, [abandonedCarts]);

  useEffect(() => {
    localStorage.setItem('edz_waitlist_v4', JSON.stringify(waitlists));
  }, [waitlists]);

  useEffect(() => {
    localStorage.setItem('edz_feedback_v4', JSON.stringify(feedbackList));
  }, [feedbackList]);

  useEffect(() => {
    localStorage.setItem('edz_sync_queue_v4', JSON.stringify(syncQueue));
  }, [syncQueue]);

  // Initial connection test on mount if URL exists
  useEffect(() => {
    if (googleSheetsConfig.appsScriptUrl) {
      testGoogleSheetsConnection(googleSheetsConfig.appsScriptUrl).then((res) => {
        setGoogleSheetsConfig((prev) => ({
          ...prev,
          isConnected: res.connected,
          lastCheckedAt: formatToIST(),
          lastSyncStatus: res.connected ? 'idle' : 'failed',
          errorMessage: res.connected ? undefined : res.message,
        }));
      });
    }
  }, []);

  // --- AUTOMATED DISPATCH & GOOGLE SHEETS SYNC HELPER ---
  const syncRecordToSheets = async (
    sheet: SyncQueueItem['sheet'],
    action: string,
    payload: Record<string, any>
  ) => {
    const queueItem: SyncQueueItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sheet,
      action,
      payload,
      timestamp: formatToIST(),
      retryCount: 0,
      status: 'pending',
    };

    // If no URL configured yet, place into queue
    if (!googleSheetsConfig.appsScriptUrl || !googleSheetsConfig.appsScriptUrl.trim().startsWith('http')) {
      setSyncQueue((prev) => [queueItem, ...prev]);
      setGoogleSheetsConfig((prev) => ({
        ...prev,
        lastSyncStatus: 'pending',
        errorMessage: 'Awaiting Google Apps Script Web App URL configuration in Admin',
      }));
      return;
    }

    try {
      const res = await sendToGoogleSheets(googleSheetsConfig.appsScriptUrl, action, payload);
      if (res.success) {
        setGoogleSheetsConfig((prev) => ({
          ...prev,
          isConnected: true,
          lastCheckedAt: formatToIST(),
          lastSyncStatus: 'success',
          totalSyncedRecords: prev.totalSyncedRecords + 1,
          errorMessage: undefined,
        }));
      } else {
        // Enqueue for retry
        queueItem.status = 'failed';
        queueItem.lastError = res.message;
        setSyncQueue((prev) => [queueItem, ...prev]);
        setGoogleSheetsConfig((prev) => ({
          ...prev,
          lastSyncStatus: 'failed',
          errorMessage: res.message,
        }));
      }
    } catch (err: any) {
      queueItem.status = 'failed';
      queueItem.lastError = err?.message || 'Sync dispatch failed';
      setSyncQueue((prev) => [queueItem, ...prev]);
      setGoogleSheetsConfig((prev) => ({
        ...prev,
        lastSyncStatus: 'failed',
        errorMessage: err?.message,
      }));
    }
  };

  // Set Google Sheets URL & trigger ping
  const setGoogleSheetsUrl = (url: string) => {
    const cleaned = url.trim();
    localStorage.setItem('edz_sheets_url', cleaned);
    setGoogleSheetsConfig((prev) => ({
      ...prev,
      appsScriptUrl: cleaned,
      lastSyncStatus: cleaned ? 'pending' : 'idle',
      errorMessage: cleaned ? undefined : 'No URL provided',
    }));
    updateSettings({ googleSheetsUrl: cleaned });

    if (cleaned) {
      testGoogleSheetsConnection(cleaned).then((res) => {
        setGoogleSheetsConfig((prev) => ({
          ...prev,
          isConnected: res.connected,
          lastCheckedAt: formatToIST(),
          lastSyncStatus: res.connected ? 'idle' : 'failed',
          errorMessage: res.connected ? undefined : res.message,
        }));
        if (res.connected) {
          showToast('Google Sheets connected successfully! All 7 tabs active.', 'success');
        } else {
          showToast(res.message, 'warning');
        }
      });
    }
  };

  // Test Connection
  const testSheetsConnection = async (): Promise<boolean> => {
    if (!googleSheetsConfig.appsScriptUrl) {
      showToast('Please enter your deployed Google Apps Script Web App URL first', 'warning');
      return false;
    }
    showToast('Testing connection with Google Sheets...', 'info');
    const res = await testGoogleSheetsConnection(googleSheetsConfig.appsScriptUrl);
    setGoogleSheetsConfig((prev) => ({
      ...prev,
      isConnected: res.connected,
      lastCheckedAt: formatToIST(),
      lastSyncStatus: res.connected ? 'idle' : 'failed',
      errorMessage: res.connected ? undefined : res.message,
    }));

    if (res.connected) {
      showToast('Connection verified! Google Sheets backend is live.', 'success');
      return true;
    } else {
      showToast(res.message, 'warning');
      return false;
    }
  };

  // Retry Failed Sync Queue
  const retryFailedSyncQueue = async () => {
    if (!googleSheetsConfig.appsScriptUrl) {
      showToast('Configure Google Apps Script URL before retrying sync queue', 'warning');
      return;
    }

    const itemsToRetry = syncQueue.filter((q) => q.status === 'failed' || q.status === 'pending');
    if (itemsToRetry.length === 0) {
      showToast('No pending sync items in queue', 'info');
      return;
    }

    showToast(`Retrying sync of ${itemsToRetry.length} queued records...`, 'info');
    let successfulCount = 0;
    const remainingQueue: SyncQueueItem[] = [];

    for (const item of itemsToRetry) {
      try {
        const res = await sendToGoogleSheets(googleSheetsConfig.appsScriptUrl, item.action, item.payload);
        if (res.success) {
          successfulCount++;
        } else {
          remainingQueue.push({
            ...item,
            retryCount: item.retryCount + 1,
            lastError: res.message,
            status: 'failed',
          });
        }
      } catch (err: any) {
        remainingQueue.push({
          ...item,
          retryCount: item.retryCount + 1,
          lastError: err?.message,
          status: 'failed',
        });
      }
    }

    setSyncQueue(remainingQueue);
    setGoogleSheetsConfig((prev) => ({
      ...prev,
      totalSyncedRecords: prev.totalSyncedRecords + successfulCount,
      lastSyncStatus: remainingQueue.length === 0 ? 'success' : 'failed',
    }));
    showToast(`Synchronized ${successfulCount} items to Google Sheets!`, 'success');
  };

  // One-click Sync All Existing to Sheets
  const syncAllExistingToSheets = async () => {
    if (!googleSheetsConfig.appsScriptUrl) {
      showToast('Configure Google Apps Script URL in Admin first', 'warning');
      return;
    }
    showToast('Bulk synchronizing catalogue, customers, and orders to Google Sheets...', 'info');

    // 1. Sync all customers
    for (const cust of customers) {
      await sendToGoogleSheets(googleSheetsConfig.appsScriptUrl, 'sync_customer', cust);
    }
    // 2. Sync all orders
    for (const ord of orders) {
      await sendToGoogleSheets(googleSheetsConfig.appsScriptUrl, 'sync_order', ord);
    }
    // 3. Sync enquiries
    for (const enq of enquiries) {
      await sendToGoogleSheets(googleSheetsConfig.appsScriptUrl, 'sync_enquiry', enq);
    }
    // 4. Sync waitlist
    for (const wtl of waitlists) {
      await sendToGoogleSheets(googleSheetsConfig.appsScriptUrl, 'sync_waitlist', wtl);
    }
    // 5. Sync feedback
    for (const fdb of feedbackList) {
      await sendToGoogleSheets(googleSheetsConfig.appsScriptUrl, 'sync_feedback', fdb);
    }

    setGoogleSheetsConfig((prev) => ({
      ...prev,
      lastCheckedAt: formatToIST(),
      lastSyncStatus: 'success',
      totalSyncedRecords: prev.totalSyncedRecords + customers.length + orders.length,
    }));
    showToast('All existing store records synchronized to Google Sheets!', 'success');
  };

  // Live Test Dispatch: Send Sample Customer & Order to Sheets for instant verification
  const sendTestCustomerAndOrderToSheets = async (): Promise<{ success: boolean; message: string }> => {
    if (!googleSheetsConfig.appsScriptUrl) {
      showToast('Please enter your Google Apps Script Web App URL first', 'warning');
      return { success: false, message: 'Google Apps Script URL is missing.' };
    }

    showToast('Sending live test customer and order data to Google Sheets...', 'info');

    const testId = Math.floor(100 + Math.random() * 900);
    const testCustomer: Customer = {
      id: `CUST-TEST-${testId}`,
      firstName: 'Customer',
      lastName: 'Verification',
      email: `test.shopper${testId}@everydayeditz.in`,
      phoneNumber: '+91 98000 00000',
      whatsappNumber: '+91 98000 00000',
      city: 'Mandi Gobindgarh',
      state: 'Punjab',
      pincode: '147301',
      customerSegment: 'Women',
      registrationDate: formatToIST(),
      registrationSource: 'Admin Live Verification Test',
      marketingConsent: true,
      whatsappConsent: true,
      totalOrders: 1,
      totalSpending: 399,
      customerStatus: 'Active',
      lastActivity: formatToIST(),
    };

    const firstProduct = products[0] || INITIAL_PRODUCTS[0];
    const testOrder: Order = {
      id: `EE-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: testCustomer.id,
      createdAt: formatToIST(),
      items: [
        {
          product: firstProduct,
          quantity: 1,
          selectedVariant: 'Standard',
        },
      ],
      subtotal: firstProduct.price,
      discount: 0,
      shippingCharge: 0,
      total: firstProduct.price,
      status: 'Confirmed',
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      shippingAddress: {
        fullName: 'Test Customer',
        phoneNumber: '+91 98000 00000',
        email: `test.shopper${testId}@everydayeditz.in`,
        flatHouseNo: 'Operations Hub',
        streetArea: 'GT Road (NH-1), Sirhind Side',
        pincode: '147301',
        city: 'Mandi Gobindgarh',
        state: 'Punjab',
      },
      courierName: 'Delhivery Express Surface & Air',
      trackingNumber: `DLVTEST${Math.floor(100000 + Math.random() * 900000)}IN`,
      estimatedDeliveryDate: 'In 2-3 business days via Delhivery Air',
      supplierName: 'BLR Fulfillment Center',
      supplierOrderRef: 'SUP-TEST-001',
      fulfilmentStatus: 'Processing',
      deliveryStatus: 'Ordered',
      returnStatus: 'None',
    };

    try {
      const custRes = await sendToGoogleSheets(googleSheetsConfig.appsScriptUrl, 'sync_customer', testCustomer);
      const ordRes = await sendToGoogleSheets(googleSheetsConfig.appsScriptUrl, 'sync_order', testOrder);

      if (custRes.success || ordRes.success) {
        setGoogleSheetsConfig((prev) => ({
          ...prev,
          isConnected: true,
          lastCheckedAt: formatToIST(),
          lastSyncStatus: 'success',
          totalSyncedRecords: prev.totalSyncedRecords + 2,
        }));
        showToast('Success! Test Customer and Test Order written to Google Sheets.', 'success');
        return { success: true, message: 'Test Customer & Order added to Sheets successfully!' };
      } else {
        const errorMsg = custRes.message || ordRes.message || 'Error writing to Google Sheets';
        showToast(errorMsg, 'warning');
        return { success: false, message: errorMsg };
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to dispatch test events', 'warning');
      return { success: false, message: err?.message || 'Network error' };
    }
  };

  // --- CRM & AUTHENTICATED CUSTOMER MANAGEMENT ---
  const sanitizeForSheets = (c: Record<string, any>) => {
    const { salt: _s, passwordHash: _h, password: _p, confirmPassword: _cp, emailVerificationCode: _ev, passwordResetCode: _pr, ...safe } = c;
    return safe;
  };

  const registerOrUpdateCustomer = (data: Partial<Customer>): Customer => {
    const normalizedEmail = data.email ? data.email.toLowerCase().trim() : '';
    const normalizedPhone = data.phoneNumber ? data.phoneNumber.trim() : '';

    const existingIndex = customers.findIndex(
      (c) =>
        (normalizedEmail && c.email.toLowerCase().trim() === normalizedEmail) ||
        (normalizedPhone && c.phoneNumber.trim() === normalizedPhone) ||
        (data.id && c.id === data.id)
    );

    let customerRecord: Customer;

    if (existingIndex >= 0) {
      const existing = customers[existingIndex];
      customerRecord = {
        ...existing,
        ...data,
        id: existing.id,
        email: normalizedEmail || existing.email,
        phoneNumber: normalizedPhone || existing.phoneNumber,
        lastActivity: formatToIST(),
      };
      setCustomers((prev) => {
        const copy = [...prev];
        copy[existingIndex] = customerRecord;
        return copy;
      });
    } else {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      customerRecord = {
        id: data.id || `CUST-IND-${randomSuffix}`,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        email: normalizedEmail || '',
        phoneNumber: normalizedPhone || '',
        whatsappNumber: data.whatsappNumber || normalizedPhone || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        customerSegment: data.customerSegment || 'Women',
        registrationDate: formatToIST(),
        registrationSource: data.registrationSource || 'Website Account Registration',
        marketingConsent: data.marketingConsent || false,
        whatsappConsent: data.whatsappConsent || false,
        totalOrders: 0,
        totalSpending: 0,
        customerStatus: 'Active',
        lastActivity: formatToIST(),
      };
      setCustomers((prev) => [customerRecord, ...prev]);
    }

    setCurrentCustomer(customerRecord);
    syncRecordToSheets('Customers', 'sync_customer', sanitizeForSheets(customerRecord));
    return customerRecord;
  };

  const updateCustomerRecord = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...updates, lastActivity: formatToIST() };
          syncRecordToSheets('Customers', 'sync_customer', sanitizeForSheets(updated));
          return updated;
        }
        return c;
      })
    );
    showToast('Customer record updated and synced.');
  };

  const storeCustomerToken = (token: string, rememberMe = true) => {
    localStorage.removeItem('edz_customer_token');
    sessionStorage.removeItem('edz_customer_token');
    if (rememberMe) {
      localStorage.setItem('edz_customer_token', token);
    } else {
      sessionStorage.setItem('edz_customer_token', token);
    }
    setCustomerToken(token);
  };

  const registerCustomer = async (payload: Record<string, any>) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        return { success: false, field: data?.field, error: data?.error || 'Registration failed.' };
      }
      if (data.token) {
        storeCustomerToken(data.token, true);
      }
      if (data.customer) {
        setCurrentCustomer(data.customer);
        setCustomers((prev) => [data.customer, ...prev.filter((c) => c.id !== data.customer.id)]);
        syncRecordToSheets('Customers', 'sync_customer', sanitizeForSheets(data.customer));
      }
      showToast(`Welcome to The Everyday Editz, ${data.customer?.firstName || 'Member'}!`, 'success');
      return {
        success: true,
        customer: data.customer,
      };
    } catch {
      return { success: false, error: 'Network error while creating account. Please try again.' };
    }
  };

  const loginCustomer = async (email: string, password: string, rememberMe = true) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        return { success: false, field: data?.field, error: data?.error || 'Invalid credentials.' };
      }
      if (data.token) {
        storeCustomerToken(data.token, rememberMe);
      }
      if (data.customer) {
        setCurrentCustomer(data.customer);
        setCustomers((prev) => [data.customer, ...prev.filter((c) => c.id !== data.customer.id)]);
      }
      showToast(`Welcome back, ${data.customer?.firstName || data.customer?.email}`, 'success');
      return { success: true, customer: data.customer };
    } catch {
      return { success: false, error: 'Network error during sign in.' };
    }
  };

  const logoutCustomer = async () => {
    const activeToken = customerToken || localStorage.getItem('edz_customer_token') || sessionStorage.getItem('edz_customer_token');
    if (activeToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify({ token: activeToken }),
        });
      } catch {
        // Proceed with local cleanup
      }
    }
    localStorage.removeItem('edz_customer_token');
    sessionStorage.removeItem('edz_customer_token');
    localStorage.removeItem('edz_current_customer_v4');
    sessionStorage.removeItem('edz_current_customer_v4');
    setCustomerToken(null);
    setCurrentCustomer(null);
    showToast('Signed out of your account', 'info');
    if (routeView === 'account') {
      returnToHome();
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        return { success: false, error: data?.error || 'Could not initiate password reset.' };
      }
      return {
        success: true,
        email: data.email || email,
        resetUrl: data.resetUrl,
        expiresInMinutes: data.expiresInMinutes || 15,
      };
    } catch {
      return { success: false, error: 'Network error requesting password reset.' };
    }
  };

  const confirmPasswordReset = async (
    token: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        return { success: false, field: data?.field, error: data?.error || 'Failed to reset password.' };
      }
      showToast('Password updated! You can now sign in.', 'success');
      return { success: true };
    } catch {
      return { success: false, error: 'Network error resetting password.' };
    }
  };

  const changeCustomerPassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    if (!customerToken) {
      return { success: false, error: 'Please sign in to change your password.' };
    }
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        return { success: false, field: data?.field, error: data?.error || 'Failed to update password.' };
      }
      if (data.token) {
        const persistedInLocal = Boolean(localStorage.getItem('edz_customer_token'));
        storeCustomerToken(data.token, persistedInLocal);
      }
      if (data.customer) {
        setCurrentCustomer(data.customer);
      }
      showToast('Password updated securely', 'success');
      return { success: true };
    } catch {
      return { success: false, error: 'Network error changing password.' };
    }
  };

  const fetchCustomerOrders = async (): Promise<Order[]> => {
    if (!customerToken) return [];
    try {
      const res = await fetch('/api/auth/orders', {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      const data = await res.json();
      if (res.ok && data?.success && Array.isArray(data.orders)) {
        return data.orders;
      }
    } catch {
      // Fallback to local orders
    }
    return [];
  };

  const updateCustomerProfile = async (updates: Partial<Customer>) => {
    if (!customerToken) {
      const updated = registerOrUpdateCustomer(updates);
      return { success: true, customer: updated };
    }
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        return { success: false, error: data?.error || 'Failed to update profile.' };
      }
      setCurrentCustomer(data.customer);
      setCustomers((prev) => prev.map((c) => (c.id === data.customer.id ? data.customer : c)));
      syncRecordToSheets('Customers', 'sync_customer', sanitizeForSheets(data.customer));
      showToast('Profile saved and synced', 'success');
      return { success: true, customer: data.customer };
    } catch {
      return { success: false, error: 'Network error saving profile.' };
    }
  };

  const saveCustomerAddresses = async (savedAddresses: Customer['savedAddresses']) => {
    if (!customerToken) {
      return { success: false, error: 'Please sign in to save delivery addresses.' };
    }
    try {
      const res = await fetch('/api/auth/addresses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({ savedAddresses: savedAddresses || [] }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        return { success: false, error: data?.error || 'Failed to save addresses.' };
      }
      setCurrentCustomer(data.customer);
      return { success: true, customer: data.customer };
    } catch {
      return { success: false, error: 'Network error saving address.' };
    }
  };

  // --- CRM: PRODUCT ENQUIRY ---
  const submitEnquiry = (data: Omit<ProductEnquiry, 'id' | 'enquiryDate' | 'enquiryStatus'>) => {
    const id = `ENQ-IND-${Math.floor(1000 + Math.random() * 9000)}`;
    const enquiry: ProductEnquiry = {
      ...data,
      id,
      enquiryDate: formatToIST(),
      enquiryStatus: 'New',
    };
    setEnquiries((prev) => [enquiry, ...prev]);
    showToast(`Enquiry ${id} submitted! Our studio will contact you shortly.`);
    syncRecordToSheets('Product Enquiries', 'sync_enquiry', enquiry);
  };

  const updateEnquiryStatus = (id: string, status: ProductEnquiry['enquiryStatus']) => {
    setEnquiries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, enquiryStatus: status } : e))
    );
    showToast(`Enquiry ${id} marked as ${status}`);
  };

  // --- CRM: PRODUCT WAITLIST ---
  const joinWaitlist = (data: Omit<ProductWaitlist, 'id' | 'registrationDate' | 'status'>) => {
    const id = `WTL-IND-${Math.floor(1000 + Math.random() * 9000)}`;
    const waitlistEntry: ProductWaitlist = {
      ...data,
      id,
      registrationDate: formatToIST(),
      status: 'Waiting',
    };
    setWaitlists((prev) => [waitlistEntry, ...prev]);
    showToast(`Added to VIP Waitlist (${id})! We’ll notify you first.`);
    syncRecordToSheets('Product Waitlist', 'sync_waitlist', waitlistEntry);
  };

  const updateWaitlistStatus = (id: string, status: ProductWaitlist['status']) => {
    setWaitlists((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status } : w))
    );
    showToast(`Waitlist entry status updated to ${status}`);
  };

  // --- CRM: CUSTOMER FEEDBACK & REVIEWS ---
  const submitFeedback = (data: Omit<CustomerFeedback, 'id' | 'submissionDate'>) => {
    const id = `FDB-IND-${Math.floor(1000 + Math.random() * 9000)}`;
    const feedback: CustomerFeedback = {
      ...data,
      id,
      submissionDate: formatToIST(),
    };
    setFeedbackList((prev) => [feedback, ...prev]);

    // Also update product reviews if productId matches
    if (data.productId) {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === data.productId) {
            const newReview = {
              id: `rev-${Date.now()}`,
              author: data.customerName,
              location: 'Verified Shopper',
              rating: data.rating,
              title: data.rating >= 4 ? 'Great daily upgrade!' : 'Product feedback',
              comment: data.feedback,
              verifiedPurchase: true,
              date: formatToIST(),
              helpfulCount: 0,
            };
            return {
              ...p,
              reviews: [newReview, ...p.reviews],
              reviewCount: p.reviewCount + 1,
            };
          }
          return p;
        })
      );
    }

    showToast('Thank you! Your feedback has been recorded.');
    syncRecordToSheets('Customer Feedback', 'sync_feedback', feedback);
  };

  // --- CRM: ABANDONED CARTS ---
  const trackAbandonedCart = (data: Partial<AbandonedCart>) => {
    const cartId = data.id || `CART-AB-${Math.floor(1000 + Math.random() * 9000)}`;
    const cartRecord: AbandonedCart = {
      id: cartId,
      customerId: currentCustomer?.id,
      customerName: data.customerName || (currentCustomer ? `${currentCustomer.firstName} ${currentCustomer.lastName}` : 'Guest Visitor'),
      email: data.email || currentCustomer?.email || 'guest@example.com',
      phone: data.phone || currentCustomer?.phoneNumber || '',
      products: data.products || cart.map((i) => `${i.product.name} (x${i.quantity})`).join(', '),
      cartValue: data.cartValue || cartTotal,
      cartCreated: formatToIST(),
      lastActivity: formatToIST(),
      recoveryStatus: 'Pending',
      recoveryChannel: 'WhatsApp',
    };

    setAbandonedCarts((prev) => {
      const idx = prev.findIndex((c) => c.id === cartId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = cartRecord;
        return copy;
      }
      return [cartRecord, ...prev];
    });

    syncRecordToSheets('Abandoned Carts', 'sync_abandoned_cart', cartRecord);
  };

  const updateAbandonedCartStatus = (id: string, status: AbandonedCart['recoveryStatus']) => {
    setAbandonedCarts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, recoveryStatus: status, lastActivity: formatToIST() } : c))
    );
    showToast(`Cart ${id} marked as ${status}`);
  };

  // --- CRM: WEBSITE ACTIVITY ---
  const logActivity = (type: WebsiteActivity['activityType'], page: string, productId?: string) => {
    const act: WebsiteActivity = {
      id: `ACT-${Date.now()}`,
      customerId: currentCustomer?.id,
      sessionId,
      activityType: type,
      pageVisited: page,
      productId,
      activityTimestamp: formatToIST(),
      trafficSource: 'Direct Storefront',
      deviceType: typeof window !== 'undefined' && window.innerWidth < 768 ? 'Mobile Web' : 'Desktop Web',
    };
    setActivities((prev) => [act, ...prev.slice(0, 50)]);
    // Periodic or lightweight dispatch
    if (googleSheetsConfig.appsScriptUrl && Math.random() < 0.25) {
      syncRecordToSheets('Activity Logs', 'sync_activity', act);
    }
  };

  // --- CSV EXPORT FUNCTIONS ---
  const exportCustomersCSV = () => {
    const headers = [
      'Customer ID', 'First Name', 'Last Name', 'Email', 'Phone Number',
      'WhatsApp Number', 'City', 'State', 'PIN Code', 'Customer Segment',
      'Registration Date', 'Registration Source', 'Marketing Consent',
      'Total Orders', 'Total Spending', 'Customer Status', 'Last Activity'
    ];
    const rows = customers.map((c) => [
      c.id, c.firstName, c.lastName, c.email, c.phoneNumber,
      c.whatsappNumber, c.city, c.state, c.pincode, c.customerSegment,
      c.registrationDate, c.registrationSource, c.marketingConsent ? 'Yes' : 'No',
      c.totalOrders, c.totalSpending, c.customerStatus, c.lastActivity
    ]);
    downloadCSV(`EverydayEditz_Customers_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast('Customer records exported to CSV.');
  };

  const exportOrdersCSV = () => {
    const headers = [
      'Order ID', 'Customer ID', 'Customer Name', 'Phone', 'Email',
      'Product Name', 'Product SKU', 'Product Category', 'Quantity',
      'Product Price', 'Discount', 'Shipping Charge', 'Total Amount',
      'Payment Method', 'Payment Status', 'Order Date', 'Shipping Address',
      'PIN Code', 'Supplier Name', 'Supplier Order Reference', 'Tracking ID',
      'Fulfilment Status', 'Delivery Status', 'Return Status'
    ];
    const rows: (string | number)[][] = [];
    orders.forEach((o) => {
      const addr = o.shippingAddress ? `${o.shippingAddress.flatHouseNo}, ${o.shippingAddress.streetArea}, ${o.shippingAddress.city}` : '';
      const pin = o.shippingAddress?.pincode || '';
      const name = o.shippingAddress?.fullName || '';
      const phone = o.shippingAddress?.phoneNumber || '';
      const email = o.shippingAddress?.email || '';
      if (!o.items || o.items.length === 0) {
        rows.push([
          o.id, o.customerId || '', name, phone, email,
          'Everyday Bundle', 'EE-PKG', 'Lifestyle', 1,
          o.subtotal, o.discount, o.shippingCharge, o.total,
          o.paymentMethod, o.paymentStatus, o.createdAt, addr, pin,
          o.supplierName || 'BLR Hub', o.supplierOrderRef || '', o.trackingNumber,
          o.fulfilmentStatus || 'Processing', o.status, o.returnStatus || 'None'
        ]);
      } else {
        o.items.forEach((item) => {
          rows.push([
            o.id, o.customerId || '', name, phone, email,
            item.product.name, item.product.id, item.product.departments?.[0] || 'Lifestyle', item.quantity,
            item.product.price, o.discount, o.shippingCharge, o.total,
            o.paymentMethod, o.paymentStatus, o.createdAt, addr, pin,
            o.supplierName || 'BLR Hub', o.supplierOrderRef || '', o.trackingNumber,
            o.fulfilmentStatus || 'Processing', o.status, o.returnStatus || 'None'
          ]);
        });
      }
    });
    downloadCSV(`EverydayEditz_Orders_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast('Orders exported to CSV.');
  };

  const exportEnquiriesCSV = () => {
    const headers = ['Enquiry ID', 'Customer Name', 'Phone', 'Email', 'Product Name', 'Product ID', 'Category', 'Message', 'Date', 'Platform', 'Status'];
    const rows = enquiries.map((e) => [
      e.id, e.customerName, e.phone, e.email, e.productName, e.productId, e.productCategory, e.customerMessage, e.enquiryDate, e.sourcePlatform, e.enquiryStatus
    ]);
    downloadCSV(`EverydayEditz_Enquiries_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast('Enquiries exported to CSV.');
  };

  const exportAbandonedCartsCSV = () => {
    const headers = ['Cart ID', 'Customer ID', 'Customer Name', 'Email', 'Phone', 'Products', 'Cart Value', 'Created', 'Last Activity', 'Recovery Status'];
    const rows = abandonedCarts.map((c) => [
      c.id, c.customerId || '', c.customerName, c.email, c.phone, c.products, c.cartValue, c.cartCreated, c.lastActivity, c.recoveryStatus
    ]);
    downloadCSV(`EverydayEditz_AbandonedCarts_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast('Abandoned carts exported to CSV.');
  };

  const exportWaitlistCSV = () => {
    const headers = ['Entry ID', 'Customer Name', 'Email', 'Phone', 'Interested Product', 'Category', 'Budget', 'Date', 'Consent', 'Status'];
    const rows = waitlists.map((w) => [
      w.id, w.customerName, w.email, w.phone, w.interestedProduct, w.productCategory, w.expectedBudget, w.registrationDate, w.notificationConsent ? 'Yes' : 'No', w.status
    ]);
    downloadCSV(`EverydayEditz_Waitlist_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast('Waitlist records exported to CSV.');
  };

  const exportFeedbackCSV = () => {
    const headers = ['Feedback ID', 'Customer ID', 'Customer Name', 'Order ID', 'Product Name', 'Rating', 'Feedback', 'Date'];
    const rows = feedbackList.map((f) => [
      f.id, f.customerId || '', f.customerName, f.orderId || '', f.productName, f.rating, f.feedback, f.submissionDate
    ]);
    downloadCSV(`EverydayEditz_Feedback_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast('Feedback exported to CSV.');
  };

  // ============================================================================
  // SMART MOBILE BACK NAVIGATION & STRUCTURED HISTORY API MANAGER
  // ============================================================================
  const productsRef = useRef<Product[]>(products);
  const departmentsRef = useRef<DepartmentConfig[]>(departments);
  const routeViewRef = useRef<StoreRouteView>(routeView);
  const selectedDepartmentRef = useRef<Department | null>(selectedDepartment);
  const selectedSubcategoryRef = useRef<string | null>(selectedSubcategory);
  const selectedProductRef = useRef<Product | null>(selectedProduct);
  const activePolicyRef = useRef<PolicyTab | null>(activePolicy);

  useEffect(() => { productsRef.current = products; }, [products]);
  useEffect(() => { departmentsRef.current = departments; }, [departments]);
  useEffect(() => { routeViewRef.current = routeView; }, [routeView]);
  useEffect(() => { selectedDepartmentRef.current = selectedDepartment; }, [selectedDepartment]);
  useEffect(() => { selectedSubcategoryRef.current = selectedSubcategory; }, [selectedSubcategory]);
  useEffect(() => { selectedProductRef.current = selectedProduct; }, [selectedProduct]);
  useEffect(() => { activePolicyRef.current = activePolicy; }, [activePolicy]);

  const currentDepthRef = useRef<number>(0);
  const syncedOverlaysRef = useRef<OverlayKey[]>([]);
  const overlayOrderRef = useRef<OverlayKey[]>([]);
  const isHandlingPopStateRef = useRef<boolean>(false);
  const isProgrammaticBackRef = useRef<boolean>(false);
  const navVersionRef = useRef<number>(0);
  const didInitHistoryRef = useRef<boolean>(false);

  const getAppBasePath = (): string => {
    const base = import.meta.env.BASE_URL || '/';
    return base.endsWith('/') ? base : `${base}/`;
  };

  const getNormalizedPathname = (customPath?: string): string => {
    if (typeof window === 'undefined') return '/';
    const raw = customPath !== undefined ? customPath : window.location.pathname;
    const base = getAppBasePath();
    const baseWithoutTrailing = base.replace(/\/+$/, '');
    let p = raw;
    if (baseWithoutTrailing && p.startsWith(baseWithoutTrailing)) {
      p = p.slice(baseWithoutTrailing.length);
    }
    return p.replace(/\/+$/, '') || '/';
  };

  const toAppUrl = (path: string): string => {
    const base = getAppBasePath();
    if (base === '/') return path;
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  };

  const getCurrentFullPath = () => {
    if (typeof window === 'undefined') return '/';
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  };

  const closeAllOverlaysLocally = () => {
    setIsMobileNavOpen(false);
    setIsCartOpen(false);
    setIsCheckoutOpen(false);
    setIsSearchOpen(false);
    setIsReelsOpen(false);
    setIsRewardsOpen(false);
    setIsTrackingOpen(false);
    setIsEnquiryOpen(false);
    setIsWaitlistOpen(false);
    setIsFeedbackOpen(false);
    setIsReturnClaimOpen(false);
    setActivePolicy(null);
    setIsAdminLoginModalOpen(false);
    setIsAdminOpen(false);
  };

  const applyOverlaysFromHistory = (targetOverlays: OverlayKey[], policyTab?: PolicyTab | null) => {
    const set = new Set<OverlayKey>(targetOverlays);
    setIsMobileNavOpen(set.has('mobile-nav'));
    setIsCartOpen(set.has('cart'));
    setIsCheckoutOpen(set.has('checkout'));
    setIsSearchOpen(set.has('search'));
    setIsReelsOpen(set.has('reels'));
    setIsRewardsOpen(set.has('rewards'));
    setIsTrackingOpen(set.has('tracking'));
    setIsEnquiryOpen(set.has('enquiry'));
    setIsWaitlistOpen(set.has('waitlist'));
    setIsFeedbackOpen(set.has('feedback'));
    setIsReturnClaimOpen(set.has('return-claim'));
    setActivePolicy(set.has('policy') ? (policyTab || activePolicyRef.current || 'about') : null);
    setIsAdminLoginModalOpen(set.has('admin-login'));
    setIsAdminOpen(set.has('admin-modal'));
    overlayOrderRef.current = [...targetOverlays];
  };

  const buildRouteStateFromLocation = (): {
    kind: 'route' | 'product';
    path: string;
    routeView: StoreRouteView;
    department: Department | null;
    subcategory: string | null;
    product: Product | null;
  } => {
    if (typeof window === 'undefined') {
      return { kind: 'route', path: '/', routeView: 'home', department: null, subcategory: null, product: null };
    }
    const pathname = getNormalizedPathname();
    const hash = window.location.hash || '';
    const fullPath = getCurrentFullPath();
    const curProducts = productsRef.current;
    const curDepts = departmentsRef.current;

    if (pathname === '/' || pathname === '') {
      if (hash.startsWith('#product-')) {
        const pid = hash.replace('#product-', '');
        const match = curProducts.find((p) => p.id === pid || p.slug === pid) || null;
        return { kind: match ? 'product' : 'route', path: fullPath, routeView: 'home', department: null, subcategory: null, product: match };
      }
      return { kind: 'route', path: fullPath, routeView: 'home', department: null, subcategory: null, product: null };
    }

    if (pathname === '/admin' || pathname === '/admin/login' || pathname.startsWith('/admin/')) {
      return { kind: 'route', path: fullPath, routeView: 'admin', department: null, subcategory: null, product: null };
    }
    if (pathname === '/staff/login') {
      return { kind: 'route', path: fullPath, routeView: 'staff-login', department: null, subcategory: null, product: null };
    }
    if (pathname === '/staff' || pathname.startsWith('/staff/')) {
      return { kind: 'route', path: fullPath, routeView: 'staff', department: null, subcategory: null, product: null };
    }
    if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password') {
      return { kind: 'route', path: fullPath, routeView: pathname.slice(1) as StoreRouteView, department: null, subcategory: null, product: null };
    }
    if (pathname === '/account' || pathname.startsWith('/account/')) {
      return { kind: 'route', path: fullPath, routeView: 'account', department: null, subcategory: null, product: null };
    }
    if (pathname === '/new-arrivals') {
      return { kind: 'route', path: fullPath, routeView: 'new-arrivals', department: null, subcategory: null, product: null };
    }
    if (pathname === '/everyday-essentials') {
      return { kind: 'route', path: fullPath, routeView: 'everyday-essentials', department: null, subcategory: null, product: null };
    }
    if (pathname.startsWith('/category/')) {
      const parts = pathname.replace('/category/', '').split('/');
      const deptSlug = parts[0] as Department;
      const validDepts: Department[] = ['women', 'men', 'kids', 'home-lifestyle'];
      if (validDepts.includes(deptSlug)) {
        let matchedSub: string | null = null;
        if (parts[1]) {
          const deptCfg = curDepts.find((d) => d.id === deptSlug);
          const slugPart = decodeURIComponent(parts[1]).toLowerCase();
          matchedSub =
            deptCfg?.subcategories.find(
              (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') === slugPart || s.toLowerCase() === slugPart
            ) || null;
        }
        return { kind: 'route', path: fullPath, routeView: 'department', department: deptSlug, subcategory: matchedSub, product: null };
      }
      return { kind: 'route', path: fullPath, routeView: 'not-found', department: null, subcategory: null, product: null };
    }
    if (pathname.startsWith('/product/')) {
      const slugOrId = decodeURIComponent(pathname.replace('/product/', ''));
      const match = curProducts.find((p) => p.slug === slugOrId || p.id === slugOrId) || null;
      if (match && isProductLiveOnStorefront(match)) {
        return { kind: 'product', path: fullPath, routeView: 'home', department: null, subcategory: null, product: match };
      }
      if (curProducts.length > 0) {
        return { kind: 'route', path: fullPath, routeView: 'not-found', department: null, subcategory: null, product: null };
      }
      return { kind: 'product', path: fullPath, routeView: 'home', department: null, subcategory: null, product: null };
    }

    return { kind: 'route', path: fullPath, routeView: 'not-found', department: null, subcategory: null, product: null };
  };

  const commitNavigationHistory = (next: {
    kind: 'route' | 'product';
    path: string;
    routeView: StoreRouteView;
    department: Department | null;
    subcategory: string | null;
    productId: string | null;
  }) => {
    navVersionRef.current += 1;
    if (typeof window === 'undefined') return;

    const existing = window.history.state as EdzHistoryState | null;
    const currentFull = getCurrentFullPath();

    // Prevent duplicate consecutive history entries
    if (
      existing?.__edzNav &&
      existing.kind === next.kind &&
      existing.path === next.path &&
      existing.productId === next.productId &&
      existing.overlays.length === 0
    ) {
      return;
    }

    // If navigating directly from an open overlay (e.g., Mobile Sidebar -> Category, Search -> Product):
    if (existing?.__edzNav && existing.kind === 'overlay') {
      const sameUnderlyingRoute =
        existing.path === next.path &&
        existing.routeView === next.routeView &&
        existing.department === next.department &&
        existing.subcategory === next.subcategory &&
        existing.productId === next.productId;

      syncedOverlaysRef.current = [];
      overlayOrderRef.current = [];
      closeAllOverlaysLocally();

      if (sameUnderlyingRoute && existing.depth > 0) {
        // Navigating to the exact page already underneath the overlay: pop overlay to avoid duplicate entry
        isProgrammaticBackRef.current = true;
        window.history.back();
        return;
      }

      const targetUrl = toAppUrl(next.path);
      // Otherwise replace that overlay's history entry with the new destination so Back returns to the page before the drawer
      const replacedState: EdzHistoryState = {
        __edzNav: true,
        depth: existing.depth,
        kind: next.kind,
        path: next.path,
        routeView: next.routeView,
        department: next.department,
        subcategory: next.subcategory,
        productId: next.productId,
        overlays: [],
        policyTab: null,
        scrollY: 0,
      };
      window.history.replaceState(replacedState, '', targetUrl);
      currentDepthRef.current = existing.depth;
      return;
    }

    // Save current scroll position on the entry we are leaving so Back restores it
    if (existing?.__edzNav) {
      window.history.replaceState(
        { ...existing, scrollY: window.scrollY },
        '',
        currentFull
      );
    }

    const nextDepth = currentDepthRef.current + 1;
    const targetUrl = toAppUrl(next.path);
    const pushedState: EdzHistoryState = {
      __edzNav: true,
      depth: nextDepth,
      kind: next.kind,
      path: next.path,
      routeView: next.routeView,
      department: next.department,
      subcategory: next.subcategory,
      productId: next.productId,
      overlays: [],
      policyTab: null,
      scrollY: 0,
    };
    window.history.pushState(pushedState, '', targetUrl);
    currentDepthRef.current = nextDepth;
    syncedOverlaysRef.current = [];
    overlayOrderRef.current = [];
  };

  const openProductModal = (product: Product) => {
    const slug = product.slug || product.id;
    const nextPath = `/product/${slug}`;
    const underlyingRouteView: StoreRouteView =
      routeViewRef.current === 'not-found' ? 'home' : routeViewRef.current;

    // Record recently viewed signal when personalization consent is enabled
    if (personalizationConsent) {
      setRecentlyViewedIds((prev) => {
        const next = [product.id, ...prev.filter((id) => id !== product.id)].slice(0, 12);
        try {
          localStorage.setItem('edz_recently_viewed', JSON.stringify(next));
        } catch {}
        return next;
      });
    }

    setSelectedProduct(product);
    commitNavigationHistory({
      kind: 'product',
      path: nextPath,
      routeView: underlyingRouteView,
      department: selectedDepartmentRef.current,
      subcategory: selectedSubcategoryRef.current,
      productId: product.id,
    });
  };

  const closeProductModal = () => {
    const versionAtCall = navVersionRef.current;
    setSelectedProduct(null);

    if (typeof window === 'undefined') return;

    queueMicrotask(() => {
      // If another route navigation ran in the same tick (e.g. breadcrumb click), do not interfere
      if (navVersionRef.current !== versionAtCall) return;

      const st = window.history.state as EdzHistoryState | null;
      if (st?.__edzNav && st.kind === 'product' && st.depth > 0) {
        window.history.back();
        return;
      }

      // Direct deep-link landing on /product/:slug (depth === 0): replace cleanly to fallback route
      if (getNormalizedPathname().startsWith('/product/')) {
        const fallbackPath = selectedDepartmentRef.current
          ? selectedSubcategoryRef.current
            ? `/category/${selectedDepartmentRef.current}/${encodeURIComponent(
                selectedSubcategoryRef.current.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
              )}`
            : `/category/${selectedDepartmentRef.current}`
          : routeViewRef.current === 'new-arrivals'
          ? '/new-arrivals'
          : routeViewRef.current === 'everyday-essentials'
          ? '/everyday-essentials'
          : '/';

        const fallbackRouteView: StoreRouteView =
          selectedDepartmentRef.current
            ? 'department'
            : routeViewRef.current === 'new-arrivals' || routeViewRef.current === 'everyday-essentials'
            ? routeViewRef.current
            : 'home';

        const replaced: EdzHistoryState = {
          __edzNav: true,
          depth: currentDepthRef.current,
          kind: 'route',
          path: fallbackPath,
          routeView: fallbackRouteView,
          department: selectedDepartmentRef.current,
          subcategory: selectedSubcategoryRef.current,
          productId: null,
          overlays: [],
          policyTab: null,
          scrollY: 0,
        };
        window.history.replaceState(replaced, '', toAppUrl(fallbackPath));
      }
    });
  };

  // One-time initial location hydration & unified popstate listener (never clobbers active user state)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!didInitHistoryRef.current) {
      didInitHistoryRef.current = true;
      const parsed = buildRouteStateFromLocation();
      setRouteView(parsed.routeView);
      setSelectedDepartment(parsed.department);
      setSelectedSubcategory(parsed.subcategory);
      setSelectedProduct(parsed.product);

      const existing = window.history.state as EdzHistoryState | null;
      if (existing?.__edzNav) {
        currentDepthRef.current = existing.depth;
        syncedOverlaysRef.current = [...(existing.overlays || [])];
        overlayOrderRef.current = [...(existing.overlays || [])];
        if (existing.overlays && existing.overlays.length > 0) {
          applyOverlaysFromHistory(existing.overlays, existing.policyTab ?? null);
        }
      } else {
        const rootState: EdzHistoryState = {
          __edzNav: true,
          depth: 0,
          kind: parsed.kind,
          path: parsed.path,
          routeView: parsed.routeView,
          department: parsed.department,
          subcategory: parsed.subcategory,
          productId: parsed.product?.id || null,
          overlays: [],
          policyTab: null,
          scrollY: window.scrollY || 0,
        };
        window.history.replaceState(rootState, '', parsed.path);
        currentDepthRef.current = 0;
        syncedOverlaysRef.current = [];
        overlayOrderRef.current = [];
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      const st = event.state as EdzHistoryState | null;

      // Programmatic history.back() triggered by clicking an overlay's own X/backdrop button
      if (isProgrammaticBackRef.current) {
        isProgrammaticBackRef.current = false;
        currentDepthRef.current = st?.__edzNav ? st.depth : Math.max(0, currentDepthRef.current - 1);
        return;
      }

      isHandlingPopStateRef.current = true;

      if (st?.__edzNav) {
        currentDepthRef.current = st.depth;
        const targetOverlays = Array.isArray(st.overlays) ? st.overlays : [];
        syncedOverlaysRef.current = [...targetOverlays];
        applyOverlaysFromHistory(targetOverlays, st.policyTab ?? null);

        setRouteView(st.routeView);
        setSelectedDepartment(st.department);
        setSelectedSubcategory(st.subcategory);

        if (st.productId) {
          const match = productsRef.current.find((p) => p.id === st.productId || p.slug === st.productId) || null;
          setSelectedProduct(match);
        } else {
          setSelectedProduct(null);
        }

        if (st.path === '/#wishlist') {
          setTimeout(() => {
            const el = document.getElementById('wishlist-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 80);
        } else if (typeof st.scrollY === 'number' && targetOverlays.length === 0 && !st.productId) {
          const targetY = st.scrollY;
          requestAnimationFrame(() => {
            window.scrollTo({ top: targetY, behavior: 'auto' });
          });
        }
      } else {
        // Fallback for non-tagged history entries
        const parsed = buildRouteStateFromLocation();
        currentDepthRef.current = 0;
        syncedOverlaysRef.current = [];
        applyOverlaysFromHistory([], null);
        setRouteView(parsed.routeView);
        setSelectedDepartment(parsed.department);
        setSelectedSubcategory(parsed.subcategory);
        setSelectedProduct(parsed.product);
      }

      // Ensure popstate guard always releases even if overlay booleans didn't change
      setTimeout(() => {
        isHandlingPopStateRef.current = false;
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Resolve deep-linked /product/:slug or /category/:dept/:subcat once canonical products/departments arrive
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathname = getNormalizedPathname();

    if (pathname.startsWith('/product/') && !selectedProductRef.current && products.length > 0) {
      const slugOrId = decodeURIComponent(pathname.replace('/product/', ''));
      const match = products.find((p) => p.slug === slugOrId || p.id === slugOrId);
      if (match && isProductLiveOnStorefront(match)) {
        setSelectedProduct(match);
        const existing = window.history.state as EdzHistoryState | null;
        if (existing?.__edzNav && !existing.productId) {
          window.history.replaceState({ ...existing, kind: 'product', productId: match.id }, '', getCurrentFullPath());
        }
      } else {
        setRouteView('not-found');
      }
    } else if (pathname.startsWith('/category/') && !selectedSubcategoryRef.current && departments.length > 0) {
      const parts = pathname.replace('/category/', '').split('/');
      if (parts[1]) {
        const deptSlug = parts[0] as Department;
        const deptCfg = departments.find((d) => d.id === deptSlug);
        const slugPart = decodeURIComponent(parts[1]).toLowerCase();
        const matchedSub = deptCfg?.subcategories.find(
          (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') === slugPart || s.toLowerCase() === slugPart
        );
        if (matchedSub) {
          setSelectedSubcategory(matchedSub);
        }
      }
    }
  }, [products, departments]);

  // Synchronize ALL modals, drawers, sidebars & popups with History API so Android/iOS Back closes them first
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const openFlags: Array<[OverlayKey, boolean]> = [
      ['mobile-nav', isMobileNavOpen],
      ['cart', isCartOpen],
      ['checkout', isCheckoutOpen],
      ['search', isSearchOpen],
      ['reels', isReelsOpen],
      ['rewards', isRewardsOpen],
      ['tracking', isTrackingOpen],
      ['enquiry', isEnquiryOpen],
      ['waitlist', isWaitlistOpen],
      ['feedback', isFeedbackOpen],
      ['return-claim', isReturnClaimOpen],
      ['policy', activePolicy !== null],
      ['admin-login', isAdminLoginModalOpen],
      ['admin-modal', isAdminOpen],
    ];

    const openSet = new Set<OverlayKey>(openFlags.filter(([, isOpen]) => isOpen).map(([key]) => key));

    // Preserve LIFO open ordering across nested overlays
    const orderedNext: OverlayKey[] = [
      ...overlayOrderRef.current.filter((key) => openSet.has(key)),
      ...Array.from(openSet).filter((key) => !overlayOrderRef.current.includes(key)),
    ];
    overlayOrderRef.current = orderedNext;

    if (isHandlingPopStateRef.current) {
      syncedOverlaysRef.current = orderedNext;
      isHandlingPopStateRef.current = false;
      return;
    }

    const prev = syncedOverlaysRef.current;
    const unchanged =
      prev.length === orderedNext.length && prev.every((k, idx) => k === orderedNext[idx]);
    if (unchanged) {
      // Update policyTab in-place if user switches tabs inside PolicyModal
      const st = window.history.state as EdzHistoryState | null;
      if (activePolicy !== null && st?.__edzNav && st.kind === 'overlay' && st.policyTab !== activePolicy) {
        window.history.replaceState({ ...st, policyTab: activePolicy }, '', getCurrentFullPath());
      }
      return;
    }

    const currentUrl = getCurrentFullPath();
    const existing = window.history.state as EdzHistoryState | null;

    if (orderedNext.length > prev.length) {
      // A new overlay opened: save scroll if transitioning from base page, then push overlay entry
      if (prev.length === 0 && existing?.__edzNav) {
        window.history.replaceState({ ...existing, scrollY: window.scrollY }, '', currentUrl);
      }
      const nextDepth = currentDepthRef.current + 1;
      const overlayState: EdzHistoryState = {
        __edzNav: true,
        depth: nextDepth,
        kind: 'overlay',
        path: currentUrl,
        routeView: routeViewRef.current,
        department: selectedDepartmentRef.current,
        subcategory: selectedSubcategoryRef.current,
        productId: selectedProductRef.current?.id || null,
        overlays: orderedNext,
        policyTab: activePolicy,
        scrollY: window.scrollY,
      };
      window.history.pushState(overlayState, '', currentUrl);
      currentDepthRef.current = nextDepth;
      syncedOverlaysRef.current = orderedNext;
    } else if (orderedNext.length === prev.length && orderedNext.length > 0) {
      // Overlay swapped cleanly in the same interaction (e.g., Cart -> Checkout, Policy -> Return Claim)
      const replacedState: EdzHistoryState = {
        __edzNav: true,
        depth: existing?.__edzNav ? existing.depth : currentDepthRef.current,
        kind: 'overlay',
        path: currentUrl,
        routeView: routeViewRef.current,
        department: selectedDepartmentRef.current,
        subcategory: selectedSubcategoryRef.current,
        productId: selectedProductRef.current?.id || null,
        overlays: orderedNext,
        policyTab: activePolicy,
        scrollY: existing?.scrollY ?? window.scrollY,
      };
      window.history.replaceState(replacedState, '', currentUrl);
      syncedOverlaysRef.current = orderedNext;
    } else {
      // Overlay(s) closed via in-app X / backdrop button
      syncedOverlaysRef.current = orderedNext;
      if (
        existing?.__edzNav &&
        existing.kind === 'overlay' &&
        existing.overlays.length > orderedNext.length &&
        existing.depth > 0
      ) {
        isProgrammaticBackRef.current = true;
        window.history.back();
      }
    }
  }, [
    isMobileNavOpen,
    isCartOpen,
    isCheckoutOpen,
    isSearchOpen,
    isReelsOpen,
    isRewardsOpen,
    isTrackingOpen,
    isEnquiryOpen,
    isWaitlistOpen,
    isFeedbackOpen,
    isReturnClaimOpen,
    activePolicy,
    isAdminLoginModalOpen,
    isAdminOpen,
  ]);

  // Navigation helpers
  const navigateToDepartment = (dept: Department, subcategory?: string) => {
    const cleanSub = subcategory || null;
    const subSlug = cleanSub
      ? '/' + encodeURIComponent(cleanSub.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
      : '';
    const nextPath = `/category/${dept}${subSlug}`;

    setRouteView('department');
    setSelectedDepartment(dept);
    setSelectedSubcategory(cleanSub);
    setSelectedProduct(null);
    commitNavigationHistory({
      kind: 'route',
      path: nextPath,
      routeView: 'department',
      department: dept,
      subcategory: cleanSub,
      productId: null,
    });
    logActivity('category_view', `Department: ${dept} ${cleanSub ? `> ${cleanSub}` : ''}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToCollection = (collection: 'new-arrivals' | 'everyday-essentials') => {
    const nextPath = `/${collection}`;
    setRouteView(collection);
    setSelectedDepartment(null);
    setSelectedSubcategory(null);
    setSelectedProduct(null);
    commitNavigationHistory({
      kind: 'route',
      path: nextPath,
      routeView: collection,
      department: null,
      subcategory: null,
      productId: null,
    });
    logActivity('category_view', `Collection: ${collection}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToAuth = (
    view: AuthRouteView,
    query?: Record<string, string>,
    returnTo?: AuthReturnTarget
  ) => {
    if (returnTo) {
      setAuthReturnTo(returnTo);
    } else if (typeof window !== 'undefined') {
      const currentPath = getNormalizedPathname();
      const isAlreadyAuth = ['/login', '/register', '/forgot-password', '/reset-password', '/admin', '/staff'].some((p) =>
        currentPath.startsWith(p)
      );
      if (!isAlreadyAuth && currentPath && currentPath !== '/') {
        setAuthReturnTo({ type: 'path', path: currentPath });
      }
    }
    const params = query ? new URLSearchParams(query).toString() : '';
    const targetUrl = `/${view}${params ? `?${params}` : ''}`;

    setRouteView(view);
    setSelectedDepartment(null);
    setSelectedSubcategory(null);
    setSelectedProduct(null);
    commitNavigationHistory({
      kind: 'route',
      path: targetUrl,
      routeView: view,
      department: null,
      subcategory: null,
      productId: null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToAccount = (tab: AccountTab = 'profile') => {
    setActiveAccountTab(tab);
    setRouteView('account');
    setSelectedDepartment(null);
    setSelectedSubcategory(null);
    setSelectedProduct(null);
    commitNavigationHistory({
      kind: 'route',
      path: '/account',
      routeView: 'account',
      department: null,
      subcategory: null,
      productId: null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToAdmin = () => {
    setRouteView('admin');
    setSelectedDepartment(null);
    setSelectedSubcategory(null);
    setSelectedProduct(null);
    commitNavigationHistory({
      kind: 'route',
      path: '/admin',
      routeView: 'admin',
      department: null,
      subcategory: null,
      productId: null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToStaffLogin = () => {
    setRouteView('staff-login');
    setSelectedDepartment(null);
    setSelectedSubcategory(null);
    setSelectedProduct(null);
    commitNavigationHistory({
      kind: 'route',
      path: '/staff/login',
      routeView: 'staff-login',
      department: null,
      subcategory: null,
      productId: null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToStaffPortal = () => {
    setSelectedDepartment(null);
    setSelectedSubcategory(null);
    setSelectedProduct(null);
    if (isStaffAuthenticated && staffToken) {
      setRouteView('staff');
      commitNavigationHistory({
        kind: 'route',
        path: '/staff',
        routeView: 'staff',
        department: null,
        subcategory: null,
        productId: null,
      });
    } else {
      setRouteView('staff-login');
      commitNavigationHistory({
        kind: 'route',
        path: '/staff/login',
        routeView: 'staff-login',
        department: null,
        subcategory: null,
        productId: null,
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const completeAuthRedirect = () => {
    const target = authReturnTo;
    setAuthReturnTo(null);

    if (target?.type === 'checkout') {
      returnToHome();
      setTimeout(() => {
        setIsCheckoutOpen(true);
      }, 60);
      return;
    }

    if (target?.type === 'account') {
      navigateToAccount(target.tab || 'profile');
      return;
    }

    if (target?.type === 'path' && target.path && target.path !== '/' && !target.path.startsWith('/admin') && !target.path.startsWith('/staff')) {
      if (target.path === '/new-arrivals') {
        navigateToCollection('new-arrivals');
        return;
      }
      if (target.path === '/everyday-essentials') {
        navigateToCollection('everyday-essentials');
        return;
      }
      if (target.path.startsWith('/category/')) {
        const parts = target.path.replace('/category/', '').split('/');
        const deptSlug = parts[0] as Department;
        const validDepts: Department[] = ['women', 'men', 'kids', 'home-lifestyle'];
        if (validDepts.includes(deptSlug)) {
          navigateToDepartment(deptSlug);
          return;
        }
      }
      if (target.path.startsWith('/product/')) {
        const slugOrId = decodeURIComponent(target.path.replace('/product/', ''));
        const match = products.find((p) => p.slug === slugOrId || p.id === slugOrId);
        if (match) {
          setRouteView('home');
          openProductModal(match);
          return;
        }
      }
    }

    navigateToAccount('profile');
  };

  const returnToHome = () => {
    setRouteView('home');
    setSelectedDepartment(null);
    setSelectedSubcategory(null);
    setSelectedProduct(null);
    commitNavigationHistory({
      kind: 'route',
      path: '/',
      routeView: 'home',
      department: null,
      subcategory: null,
      productId: null,
    });
    logActivity('page_view', 'Home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToWishlist = () => {
    setRouteView('home');
    setSelectedDepartment(null);
    setSelectedSubcategory(null);
    setSelectedProduct(null);
    commitNavigationHistory({
      kind: 'route',
      path: '/#wishlist',
      routeView: 'home',
      department: null,
      subcategory: null,
      productId: null,
    });
    setTimeout(() => {
      const el = document.getElementById('wishlist-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Reconcile cart automatically whenever canonical products update (prices, images, variants, stock, unpublished)
  useEffect(() => {
    if (!products || products.length === 0) return;
    setCart((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const updated = prev.map((item) => {
        const live = products.find((p) => p.id === item.product.id);
        if (!live) return item;
        const matchedVariant = item.variantId
          ? live.variantItems?.find((v) => v.id === item.variantId)
          : undefined;
        const liveUnitPrice = matchedVariant?.price && matchedVariant.price > 0 ? matchedVariant.price : live.price;
        const liveImage = matchedVariant?.image || live.primaryImage || live.images?.[0] || item.variantImage;

        if (
          item.unitPrice !== liveUnitPrice ||
          item.product.price !== live.price ||
          item.product.name !== live.name ||
          item.product.stockCount !== live.stockCount ||
          item.product.inStock !== live.inStock ||
          item.product.isPublished !== live.isPublished ||
          item.product.status !== live.status ||
          item.variantImage !== liveImage
        ) {
          changed = true;
          return {
            ...item,
            product: live,
            unitPrice: liveUnitPrice,
            variantImage: liveImage,
          };
        }
        return item;
      });
      return changed ? updated : prev;
    });
  }, [products]);

  const cartStockIssues: CartStockIssue[] = cart.reduce<CartStockIssue[]>((acc, item) => {
    const live = products.find((p) => p.id === item.product.id);
    if (!live || !isProductLiveOnStorefront(live)) {
      acc.push({
        productId: item.product.id,
        variantId: item.variantId,
        message: `"${item.product.name}" is currently unavailable or unpublished.`,
      });
      return acc;
    }
    const matchedVariant = item.variantId
      ? live.variantItems?.find((v) => v.id === item.variantId)
      : undefined;
    const availStock = matchedVariant ? matchedVariant.stockCount : live.stockCount;
    const inStockFlag = matchedVariant ? matchedVariant.inStock : live.inStock;
    if (!inStockFlag || (availStock ?? 0) <= 0) {
      acc.push({
        productId: item.product.id,
        variantId: item.variantId,
        message: `"${live.name}"${item.selectedVariant ? ` (${item.selectedVariant})` : ''} is out of stock.`,
      });
    } else if (item.quantity > availStock) {
      acc.push({
        productId: item.product.id,
        variantId: item.variantId,
        message: `Only ${availStock} units available for "${live.name}".`,
      });
    }
    return acc;
  }, []);

  const hasCartStockIssue = cartStockIssues.length > 0;

  // Cart calculations
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + (item.unitPrice ?? item.product.price) * item.quantity, 0);

  const couponDiscount = appliedCoupon
    ? appliedCoupon.discountPercent
      ? Math.round((cartSubtotal * appliedCoupon.discountPercent) / 100)
      : appliedCoupon.discountAmount || 0
    : 0;

  const redeemedPointsDiscount = pointsToRedeemAtCheckout;
  const shippingFee = cartSubtotal >= settings.freeShippingThreshold || cartSubtotal === 0 ? 0 : settings.shippingCharge;
  const cartTotal = Math.max(0, cartSubtotal - couponDiscount - redeemedPointsDiscount + shippingFee);

  const addToCart = (
    product: Product, 
    quantity = 1, 
    variant?: string,
    variantDetails?: {
      variantId?: string;
      selectedColor?: string;
      selectedSize?: string;
      selectedOptions?: Record<string, string>;
      unitPrice?: number;
      variantSku?: string;
      variantImage?: string;
    }
  ) => {
    const liveProduct = products.find((p) => p.id === product.id) || product;
    if (!isProductLiveOnStorefront(liveProduct)) {
      showToast('This product is currently unavailable.', 'warning');
      return;
    }
    const matchedVariant = variantDetails?.variantId
      ? liveProduct.variantItems?.find((v) => v.id === variantDetails.variantId)
      : undefined;
    const maxAvail = matchedVariant ? matchedVariant.stockCount : liveProduct.stockCount;
    const isAvail = matchedVariant ? matchedVariant.inStock : liveProduct.inStock;
    if (!isAvail || (maxAvail ?? 0) <= 0) {
      showToast(`${liveProduct.name} is currently out of stock.`, 'warning');
      return;
    }

    setCart((prev) => {
      const matchFn = (item: CartItem) => {
        if (variantDetails?.variantId) {
          return item.product.id === liveProduct.id && item.variantId === variantDetails.variantId;
        }
        return item.product.id === liveProduct.id && item.selectedVariant === variant;
      };

      const existingIndex = prev.findIndex(matchFn);
      if (existingIndex >= 0) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, product: liveProduct, quantity: Math.min(maxAvail || 99, item.quantity + quantity) }
            : item
        );
      }

      const newItem: CartItem = {
        product: liveProduct,
        quantity: Math.min(maxAvail || 99, quantity),
        selectedVariant: variant,
        variantId: variantDetails?.variantId,
        selectedColor: variantDetails?.selectedColor,
        selectedSize: variantDetails?.selectedSize,
        selectedOptions: variantDetails?.selectedOptions,
        unitPrice: variantDetails?.unitPrice ?? liveProduct.price,
        variantSku: variantDetails?.variantSku,
        variantImage: variantDetails?.variantImage,
      };

      return [...prev, newItem];
    });

    const displayVariant = variant ? ` (${variant})` : '';
    showToast(`Added ${liveProduct.name}${displayVariant} to bag`);
    logActivity('add_to_cart', `Product: ${liveProduct.name}${displayVariant}`, liveProduct.id);
  };

  const updateCartQuantity = (productId: string, quantity: number, variant?: string, variantId?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, variant, variantId);
      return;
    }
    const live = products.find((p) => p.id === productId);
    const matchedVariant = live && variantId ? live.variantItems?.find((v) => v.id === variantId) : undefined;
    const maxAvail = matchedVariant ? matchedVariant.stockCount : live?.stockCount;
    const clampedQty = typeof maxAvail === 'number' && maxAvail > 0 ? Math.min(quantity, maxAvail) : quantity;
    if (typeof maxAvail === 'number' && quantity > maxAvail) {
      showToast(`Only ${maxAvail} units in stock`, 'warning');
    }
    setCart((prev) =>
      prev.map((item) => {
        const matches = item.product.id === productId && (variantId ? item.variantId === variantId : item.selectedVariant === variant);
        return matches ? { ...item, quantity: clampedQty } : item;
      })
    );
  };

  const removeFromCart = (productId: string, variant?: string, variantId?: string) => {
    setCart((prev) =>
      prev.filter((item) => {
        const matches = item.product.id === productId && (variantId ? item.variantId === variantId : item.selectedVariant === variant);
        return !matches;
      })
    );
    showToast('Removed from bag', 'info');
  };

  const clearCart = () => setCart([]);

  const addBundleToCart = (bundle: Bundle) => {
    const bundleProds = products.filter((p) => bundle.productIds.includes(p.id) && isProductLiveOnStorefront(p));
    bundleProds.forEach((prod) => addToCart(prod, 1));
    showToast(`Added ${bundle.title} bundle to bag!`);
  };

  const applyCoupon = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const found = coupons.find((c) => c.code === cleanCode && c.active);
    if (!found) {
      return { success: false, message: 'Invalid or expired coupon code' };
    }
    if (cartSubtotal < found.minOrderValue) {
      return { success: false, message: `Minimum order value for ${cleanCode} is ₹${found.minOrderValue}` };
    }
    setAppliedCoupon(found);
    return { success: true, message: `Applied ${found.code}! You saved on this curation.` };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast('Coupon removed', 'info');
  };

  // Wishlist
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast('Removed from Wishlist', 'info');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('Saved to your Wishlist');
        return [...prev, productId];
      }
    });
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  // Orders
  const createOrder = (orderData: Omit<Order, 'id' | 'createdAt' | 'status' | 'courierName' | 'trackingNumber'>) => {
    // 1. Automatically register or update Customer record with shipping details
    let customerRecord: Customer | null = null;
    if (orderData.shippingAddress) {
      customerRecord = registerOrUpdateCustomer({
        firstName: orderData.shippingAddress.fullName.split(' ')[0] || 'Valued',
        lastName: orderData.shippingAddress.fullName.split(' ').slice(1).join(' ') || 'Customer',
        email: orderData.shippingAddress.email,
        phoneNumber: orderData.shippingAddress.phoneNumber,
        whatsappNumber: orderData.shippingAddress.phoneNumber,
        city: orderData.shippingAddress.city,
        state: orderData.shippingAddress.state,
        pincode: orderData.shippingAddress.pincode,
        totalOrders: (currentCustomer?.totalOrders || 0) + 1,
        totalSpending: (currentCustomer?.totalSpending || 0) + orderData.total,
        customerStatus: (currentCustomer?.totalSpending || 0) + orderData.total > 2500 ? 'VIP' : 'Active',
        registrationSource: 'Order Checkout',
      });
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = `EE-IND-2026-${randomSuffix}`;
    const newOrder: Order = {
      ...orderData,
      id: orderId,
      customerId: customerRecord?.id || currentCustomer?.id,
      createdAt: formatToIST(),
      status: 'Confirmed',
      courierName: 'Delhivery Express Surface & Air',
      trackingNumber: `DLV${randomSuffix}${Math.floor(100000 + Math.random() * 900000)}IN`,
      supplierName: 'BLR Fulfillment Center',
      supplierOrderRef: `SUP-BLR-${randomSuffix}`,
      fulfilmentStatus: 'Processing',
      deliveryStatus: 'Ordered',
      returnStatus: 'None',
    };

    setOrders((prev) => [newOrder, ...prev]);
    setRecentOrder(newOrder);

    // Persist confirmed order server-side & refresh product inventory from server
    fetch('/api/orders/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
    })
      .then(() => fetchCanonicalProducts())
      .catch(() => {});

    // Direct synchronous Google Sheets capture for the placed order
    syncRecordToSheets('Orders', 'sync_order', newOrder);

    // 2. Automated Inventory Stock Reservation & Deduction
    orderData.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.product.id);
      if (prod) {
        const prevStock = prod.stockCount || 0;
        const newStock = Math.max(0, prevStock - item.quantity);
        const sku = prod.sku || ('EE-' + prod.id.replace('prod-', '').toUpperCase());

        // Create Stock Movement Audit Log
        const log: StockAdjustmentLog = {
          id: `LOG-STK-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          productId: prod.id,
          sku,
          productName: prod.name,
          changeAmount: -item.quantity,
          previousStock: prevStock,
          newStock,
          reason: 'Order Fulfilled',
          adjustedBy: `Order #${orderId}`,
          timestamp: formatToIST(),
        };
        setStockLogs((prev) => [log, ...prev]);

        // Update In-Memory Product Stock & Variant Stock
        let updatedVariantItems = prod.variantItems;
        if (item.variantId && Array.isArray(prod.variantItems) && prod.variantItems.length > 0) {
          updatedVariantItems = prod.variantItems.map((vi) => {
            if (vi.id === item.variantId) {
              const vStock = Math.max(0, (vi.stockCount || 0) - item.quantity);
              return { ...vi, stockCount: vStock, inStock: vStock > 0 };
            }
            return vi;
          });
        }

        updateProduct(prod.id, {
          stockCount: newStock,
          availableQuantity: newStock,
          reservedQuantity: (prod.reservedQuantity || 0) + item.quantity,
          inStock: newStock > 0,
          lastStockUpdate: formatToIST(),
          variantItems: updatedVariantItems,
        });

        // Sync to Sheets: Inventory & Products
        syncRecordToSheets('Inventory', 'sync_inventory', {
          productId: prod.id,
          sku: item.variantSku || sku,
          productName: prod.name + (item.selectedVariant ? ` (${item.selectedVariant})` : ''),
          previousStock: prevStock,
          newStock,
          changeAmount: -item.quantity,
          reason: 'Order Fulfilled',
          adjustedBy: `Order #${orderId}`,
          timestamp: formatToIST(),
        });
      }
    });

    // 3. Record Verified Payment Transaction
    const txn: PaymentTransaction = {
      id: `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      orderId,
      gateway: orderData.paymentMethod === 'UPI' ? 'UPI' : orderData.paymentMethod === 'Card' ? 'Card' : 'Netbanking',
      gatewayOrderId: orderData.gatewayOrderId || `gw_ord_${orderId}`,
      gatewayPaymentId: orderData.gatewayPaymentId || `gw_pay_${Date.now()}`,
      amount: newOrder.total,
      currency: 'INR',
      status: 'Success',
      method: orderData.paymentMethod,
      timestamp: formatToIST(),
      verifiedServerSide: true,
      customerEmail: orderData.shippingAddress.email,
      customerPhone: orderData.shippingAddress.phoneNumber,
    };
    setPaymentTransactions((prev) => [txn, ...prev]);
    syncRecordToSheets('Payments', 'sync_payment', txn);

    // Reward points earned
    const pointsEarned = Math.floor(newOrder.total / 10);
    if (pointsEarned > 0) {
      setRewardsBalance((prev) => prev + pointsEarned);
      setRewardsHistory((prev) => [
        {
          id: `tx-${Date.now()}`,
          title: `Order ${orderId} Points Earned`,
          points: pointsEarned,
          type: 'earned',
          date: 'Just now',
        },
        ...prev,
      ]);
    }

    if (pointsToRedeemAtCheckout > 0) {
      setRewardsBalance((prev) => Math.max(0, prev - pointsToRedeemAtCheckout));
      setPointsToRedeemAtCheckout(0);
    }

    clearCart();
    return newOrder;
  };

  // Stock Adjustment Action
  const adjustProductStock = (
    productId: string, 
    changeAmount: number, 
    reason: StockAdjustmentLog['reason'], 
    adjustedBy = 'Admin Console'
  ) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const previousStock = prod.stockCount || 0;
    const newStock = Math.max(0, previousStock + changeAmount);
    const sku = prod.sku || ('EE-' + prod.id.replace('prod-', '').toUpperCase());

    const log: StockAdjustmentLog = {
      id: `LOG-STK-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId,
      sku,
      productName: prod.name,
      changeAmount,
      previousStock,
      newStock,
      reason,
      adjustedBy,
      timestamp: formatToIST(),
    };

    setStockLogs((prev) => [log, ...prev]);

    updateProduct(productId, {
      stockCount: newStock,
      availableQuantity: newStock,
      inStock: newStock > 0,
      lastStockUpdate: formatToIST(),
    });

    syncRecordToSheets('Inventory', 'sync_inventory', {
      productId,
      sku,
      productName: prod.name,
      previousStock,
      newStock,
      changeAmount,
      reason,
      adjustedBy,
      timestamp: formatToIST(),
    });

    showToast(`Inventory updated for ${prod.name}: ${newStock} units remaining`, 'success');
  };

  // Return & Replacement Claim Submission
  const submitReturnClaim = async (
    claimData: Omit<ReturnClaim, 'id' | 'createdAt' | 'status'>
  ): Promise<{ success: boolean; claimId?: string; error?: string }> => {
    const claimId = `CLM-IND-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const fullClaim: ReturnClaim = {
      ...claimData,
      id: claimId,
      status: 'Submitted',
      createdAt: formatToIST(),
    };

    setReturnClaims((prev) => [fullClaim, ...prev]);
    showToast(`Claim ${claimId} submitted to Grievance Desk`, 'success');

    // Attempt server submission
    try {
      fetch('/api/returns/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullClaim),
      }).catch(() => {});
    } catch {
      // Offline fallback
    }

    // Synchronize to Google Sheets Returns & Refunds tab
    syncRecordToSheets('Returns & Refunds', 'sync_claim', fullClaim);
    return { success: true, claimId };
  };

  const updateReturnClaimStatus = (
    claimId: string, 
    status: ReturnClaim['status'], 
    adminNotes?: string
  ) => {
    setReturnClaims((prev) =>
      prev.map((c) => {
        if (c.id === claimId) {
          const updated: ReturnClaim = {
            ...c,
            status,
            adminNotes: adminNotes || c.adminNotes,
            resolutionDate: ['Replacement Approved', 'Refund Approved', 'Rejected'].includes(status) ? formatToIST() : c.resolutionDate,
          };
          syncRecordToSheets('Returns & Refunds', 'sync_claim', updated);
          return updated;
        }
        return c;
      })
    );
    showToast(`Claim ${claimId} status updated to ${status}`);
  };

  // Authorized Credentials for Admin & Staff Portal
  const AUTHORIZED_PERSONNEL_USERS = new Set([
    'manpreet',
    'admin',
    'everydaymanpreet',
    'everydaystaff',
  ]);

  const AUTHORIZED_PERSONNEL_PASSWORDS = new Set([
    'EverydayEdit@2026!',
    'EverydayEditz@2027',
    'EverydayManpreet2008',
  ]);

  // Admin Security Authentication
  const adminLogin = async (password: string, username = 'admin'): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = String(username || 'admin').trim();
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.token) {
          setAdminToken(data.token);
          setIsAdminAuthenticated(true);
          sessionStorage.setItem('edz_admin_token', data.token);
          localStorage.setItem('edz_admin_token', data.token);
          setIsAdminLoginModalOpen(false);
          setIsAdminOpen(true);
          fetchCanonicalProducts(data.token);
          fetch('/api/admin/customers', { headers: { Authorization: `Bearer ${data.token}` } })
            .then((r) => (r.ok ? r.json() : null))
            .then((cData) => {
              if (cData?.success && Array.isArray(cData.customers) && cData.customers.length > 0) {
                setCustomers(cData.customers);
              }
            })
            .catch(() => {});
          showToast(`Admin session verified (${cleanUser})`, 'success');
          return { success: true };
        } else {
          return { success: false, error: data.error || 'Invalid admin credentials' };
        }
      } else if (res.status === 401 || res.status === 429) {
        const data = await res.json().catch(() => null);
        return { success: false, error: data?.error || 'Invalid admin credentials' };
      }
    } catch {
      // Backend unreachable (e.g. static hosting on GitHub Pages or Vercel)
    }

    // Static fallback authentication for authorized personnel
    if (AUTHORIZED_PERSONNEL_USERS.has(cleanUser.toLowerCase()) && AUTHORIZED_PERSONNEL_PASSWORDS.has(password)) {
      const fallbackToken = `admin_local_${cleanUser.toLowerCase()}_${Date.now().toString(36)}`;
      setAdminToken(fallbackToken);
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('edz_admin_token', fallbackToken);
      localStorage.setItem('edz_admin_token', fallbackToken);
      setIsAdminLoginModalOpen(false);
      setIsAdminOpen(true);
      fetchCanonicalProducts(fallbackToken);
      showToast(`Admin session verified (${cleanUser})`, 'success');
      return { success: true };
    }

    return { success: false, error: 'Invalid username or password.' };
  };

  const adminLogout = () => {
    if (adminToken) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ token: adminToken }),
      }).catch(() => {});
    }
    setAdminToken(null);
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('edz_admin_token');
    localStorage.removeItem('edz_admin_token');
    setIsAdminOpen(false);
    showToast('Signed out from Admin Dashboard', 'info');
  };

  // Staff Portal Authentication (verifies authorized staff credentials)
  const staffLogin = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = String(username || '').trim();
    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data.token) {
          setStaffToken(data.token);
          setIsStaffAuthenticated(true);
          setStaffUsername(data.user?.username || cleanUser);
          try {
            sessionStorage.setItem('edz_staff_token', data.token);
          } catch {}
          setRouteView('staff');
          commitNavigationHistory({
            kind: 'route',
            path: '/staff',
            routeView: 'staff',
            department: null,
            subcategory: null,
            productId: null,
          });
          showToast(`Signed in to Staff Portal as ${cleanUser}`, 'success');
          return { success: true };
        }
        return { success: false, error: data?.error || 'Invalid staff credentials.' };
      } else if (res.status === 401 || res.status === 429) {
        const data = await res.json().catch(() => null);
        return { success: false, error: data?.error || 'Invalid staff credentials.' };
      }
    } catch {
      // Backend unreachable (e.g. static hosting on GitHub Pages or Vercel)
    }

    // Static fallback authentication for authorized personnel
    if (AUTHORIZED_PERSONNEL_USERS.has(cleanUser.toLowerCase()) && AUTHORIZED_PERSONNEL_PASSWORDS.has(password)) {
      const fallbackToken = `staff_local_${cleanUser.toLowerCase()}_${Date.now().toString(36)}`;
      setStaffToken(fallbackToken);
      setIsStaffAuthenticated(true);
      setStaffUsername(cleanUser);
      try {
        sessionStorage.setItem('edz_staff_token', fallbackToken);
      } catch {}
      setRouteView('staff');
      commitNavigationHistory({
        kind: 'route',
        path: '/staff',
        routeView: 'staff',
        department: null,
        subcategory: null,
        productId: null,
      });
      showToast(`Signed in to Staff Portal as ${cleanUser}`, 'success');
      return { success: true };
    }

    return { success: false, error: 'Invalid username or password.' };
  };

  const staffLogout = async () => {
    const activeTok = staffToken;
    if (activeTok) {
      await fetch('/api/staff/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeTok}`,
        },
        body: JSON.stringify({ token: activeTok }),
      }).catch(() => {});
    }
    setStaffToken(null);
    setIsStaffAuthenticated(false);
    setStaffUsername(null);
    try {
      sessionStorage.removeItem('edz_staff_token');
    } catch {}
    setRouteView('staff-login');
    commitNavigationHistory({
      kind: 'route',
      path: '/staff/login',
      routeView: 'staff-login',
      department: null,
      subcategory: null,
      productId: null,
    });
    showToast('Signed out of Staff Portal', 'info');
  };

  const syncStoreSettingsLocally = (patch: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const updateOrderStatus = (
    orderId: string, 
    status: Order['status'], 
    trackingNumber?: string,
    supplierName?: string,
    supplierOrderRef?: string
  ) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updated: Order = {
            ...o,
            status,
            trackingNumber: trackingNumber || o.trackingNumber,
            supplierName: supplierName || o.supplierName,
            supplierOrderRef: supplierOrderRef || o.supplierOrderRef,
            deliveryStatus: status === 'Delivered' ? 'Delivered' : status === 'Shipped' ? 'In Transit' : 'Ordered',
          };
          syncRecordToSheets('Orders', 'update_order_status', {
            orderId,
            status,
            trackingNumber: updated.trackingNumber,
            supplierName: updated.supplierName,
            supplierOrderRef: updated.supplierOrderRef,
          });
          return updated;
        }
        return o;
      })
    );
    showToast(`Order ${orderId} updated to ${status}`);
  };

  // Rewards redemption
  const redeemPointsForOrder = (points: number) => {
    if (points > rewardsBalance) return false;
    setPointsToRedeemAtCheckout(points);
    showToast(`Applying ₹${points} rewards discount to order`);
    return true;
  };

  // Product CRUD (Server-Authoritative with Safe Rollback on Failure)
  const addProduct = async (newProd: Omit<Product, 'id'>): Promise<Product> => {
    const id = `prod-${Date.now()}`;
    const productWithId: Product = {
      ...newProd,
      id,
      discountPercent: newProd.originalPrice > 0
        ? Math.max(0, Math.round(((newProd.originalPrice - newProd.price) / newProd.originalPrice) * 100))
        : 0,
      images: newProd.images?.length > 0 ? newProd.images : ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80'],
      isPublished: newProd.isPublished !== false,
      inStock: newProd.inStock !== false && (newProd.stockCount ?? 0) > 0,
      status: newProd.isPublished === false ? 'Draft' : (newProd.status || 'Active'),
      options: newProd.options || [],
      variantItems: newProd.variantItems || [],
    };

    if (adminToken) {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(productWithId),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data.product) {
        const errMsg = data?.error || 'Failed to save product to database';
        showToast(errMsg, 'warning');
        throw new Error(errMsg);
      }
      setProducts((prev) => sortProductsByMerchandising([data.product, ...prev.filter((p) => p.id !== data.product.id)]));
      showToast(`Added "${data.product.name}" and synced to database`, 'success');
      return data.product;
    }

    setProducts((prev) => sortProductsByMerchandising([productWithId, ...prev]));
    showToast(`Added "${productWithId.name}" to catalog`);
    return productWithId;
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<{ success: boolean; error?: string }> => {
    const prevSnapshot = products;
    setProducts((prev) =>
      sortProductsByMerchandising(
        prev.map((p) => {
          if (p.id === id) {
            const updated = { ...p, ...updates };
            const pr = updates.price ?? p.price;
            const orig = updates.originalPrice ?? p.originalPrice;
            if (orig > 0) {
              updated.discountPercent = Math.max(0, Math.round(((orig - pr) / orig) * 100));
            }
            return updated;
          }
          return p;
        })
      )
    );

    if (adminToken) {
      try {
        const res = await fetch(`/api/admin/products/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(updates),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          setProducts(prevSnapshot);
          const errMsg = data?.error || 'Failed to save product changes';
          showToast(errMsg, 'warning');
          return { success: false, error: errMsg };
        }
        if (data.product) {
          setProducts((prev) => sortProductsByMerchandising(prev.map((p) => (p.id === id ? data.product : p))));
          if (selectedProduct?.id === id) {
            setSelectedProduct(data.product);
          }
        }
        showToast('Product updated and synced to storefront', 'success');
        return { success: true };
      } catch (err: any) {
        setProducts(prevSnapshot);
        const errMsg = err?.message || 'Network error while updating product';
        showToast(errMsg, 'warning');
        return { success: false, error: errMsg };
      }
    }

    showToast('Product updated locally');
    return { success: true };
  };

  const deleteProduct = async (id: string): Promise<void> => {
    const prevSnapshot = products;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (adminToken) {
      try {
        const res = await fetch(`/api/admin/products/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          setProducts(prevSnapshot);
          showToast(data?.error || 'Failed to delete product from database', 'warning');
          return;
        }
      } catch {
        setProducts(prevSnapshot);
        showToast('Network error while deleting product', 'warning');
        return;
      }
    }
    showToast('Product removed from catalog', 'info');
  };

  const saveMerchandising = async (
    items: Array<{ id: string; displayOrder?: number; isFeatured?: boolean; isDailyEdit?: boolean; isTrending?: boolean; isNewArrival?: boolean; isBestSeller?: boolean; isPublished?: boolean; inStock?: boolean; status?: Product['status'] }>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!adminToken) {
      return { success: false, error: 'Admin authentication required.' };
    }
    try {
      const res = await fetch('/api/admin/products-merchandising', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        showToast(data?.error || 'Failed to update merchandising order', 'warning');
        return { success: false, error: data?.error };
      }
      await fetchCanonicalProducts(adminToken);
      showToast('Homepage merchandising & catalogue order synchronized', 'success');
      return { success: true };
    } catch (err: any) {
      showToast('Network error updating merchandising', 'warning');
      return { success: false, error: err?.message };
    }
  };

  // Refresh products from canonical server database
  const refreshProducts = async (preferAdmin = false): Promise<Product[]> => {
    return fetchCanonicalProducts(preferAdmin || adminToken ? adminToken : null);
  };

  // Persist Product Image directly to server disk & canonical database
  const persistProductImage = async (
    productId: string,
    dataUrl: string,
    filename?: string,
    isPrimary?: boolean
  ): Promise<{ success: boolean; url?: string; updatedProduct?: Product; error?: string }> => {
    try {
      const res = await fetch(`/api/admin/products/${productId}/persist-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ dataUrl, filename, isPrimary }),
      });

      const data = await res.json();
      if (data?.success && data.product) {
        const updated = data.product as Product;
        setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
        if (selectedProduct?.id === productId) {
          setSelectedProduct(updated);
        }
        showToast('Image permanently saved to product', 'success');
        return { success: true, url: data.url, updatedProduct: updated };
      }

      showToast(data?.error || 'Failed to persist image', 'warning');
      return { success: false, error: data?.error || 'Failed to persist image' };
    } catch (err: any) {
      showToast('Network error while saving image', 'warning');
      return { success: false, error: err.message };
    }
  };

  // Persist Product Gallery order and primary selection
  const persistProductGallery = async (
    productId: string,
    images: string[],
    primaryImage?: string
  ): Promise<{ success: boolean; updatedProduct?: Product; error?: string }> => {
    try {
      const res = await fetch(`/api/admin/products/${productId}/gallery`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ images, primaryImage }),
      });

      const data = await res.json();
      if (data?.success && data.product) {
        const updated = data.product as Product;
        setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
        if (selectedProduct?.id === productId) {
          setSelectedProduct(updated);
        }
        showToast('Product gallery updated and saved', 'success');
        return { success: true, updatedProduct: updated };
      }

      showToast(data?.error || 'Failed to update gallery', 'warning');
      return { success: false, error: data?.error || 'Failed to update gallery' };
    } catch (err: any) {
      showToast('Network error while saving gallery', 'warning');
      return { success: false, error: err.message };
    }
  };

  // Editorial Collections CRUD
  const saveEditorialCollection = async (col: Partial<EditorialCollection>) => {
    try {
      const res = await fetch('/api/admin/editorial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(col),
      });
      const data = await res.json();
      if (data?.success && data.collection) {
        setEditorialCollections((prev) => {
          const idx = prev.findIndex((c) => c.id === data.collection.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = data.collection;
            return copy;
          }
          return [data.collection, ...prev];
        });
        showToast(`Saved "${data.collection.title}" curation`);
        return { success: true, collection: data.collection };
      }
      return { success: false, error: data?.error || 'Failed to save editorial collection' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteEditorialCollection = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/editorial/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await res.json();
      if (data?.success) {
        setEditorialCollections((prev) => prev.filter((c) => c.id !== id));
        showToast('Editorial curation removed', 'info');
        return { success: true };
      }
      return { success: false, error: data?.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Upload Product Image (saves to /public/uploads/ on server)
  const uploadProductImage = async (dataUrl: string, filename?: string) => {
    try {
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ dataUrl, filename }),
      });
      const data = await res.json();
      if (data?.success && data.url) {
        showToast('Image uploaded and saved to server', 'success');
        return { success: true, url: data.url };
      }
      return { success: false, error: data?.error || 'Failed to upload image' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Categories CRUD
  const addCategoryToDepartment = (deptId: Department, subcategoryName: string) => {
    setDepartments((prev) =>
      prev.map((d) => {
        if (d.id === deptId && !d.subcategories.includes(subcategoryName)) {
          return { ...d, subcategories: [...d.subcategories, subcategoryName] };
        }
        return d;
      })
    );
    showToast(`Added "${subcategoryName}" to ${deptId}`);
  };

  const removeCategoryFromDepartment = (deptId: Department, subcategoryName: string) => {
    setDepartments((prev) =>
      prev.map((d) => {
        if (d.id === deptId) {
          return { ...d, subcategories: d.subcategories.filter((s) => s !== subcategoryName) };
        }
        return d;
      })
    );
    showToast(`Removed "${subcategoryName}" from ${deptId}`);
  };

  const renameCategoryInDepartment = (deptId: Department, oldName: string, newName: string) => {
    setDepartments((prev) =>
      prev.map((d) => {
        if (d.id === deptId) {
          return {
            ...d,
            subcategories: d.subcategories.map((s) => (s === oldName ? newName : s)),
          };
        }
        return d;
      })
    );
    setProducts((prev) =>
      prev.map((p) => {
        if (p.departments.includes(deptId) && p.subcategories.includes(oldName)) {
          return {
            ...p,
            subcategories: p.subcategories.map((s) => (s === oldName ? newName : s)),
          };
        }
        return p;
      })
    );
    showToast(`Renamed category to "${newName}"`);
  };

  // Admin Settings (Persisted Server-Side)
  const updateSettings = async (newSettings: Partial<StoreSettings>): Promise<{ success: boolean; error?: string }> => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    if (adminToken) {
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(newSettings),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          showToast(data?.error || 'Failed to save settings to server', 'warning');
          return { success: false, error: data?.error };
        }
        if (data.settings) setSettings(data.settings);
        showToast('Store & SEO settings saved to server', 'success');
        return { success: true };
      } catch (err: any) {
        showToast('Network error saving settings', 'warning');
        return { success: false, error: err?.message };
      }
    }
    showToast('Store settings updated');
    return { success: true };
  };

  const addCoupon = (coupon: Coupon) => {
    setCoupons((prev) => [...prev, coupon]);
    showToast(`Coupon ${coupon.code} created`);
  };

  const toggleCouponActive = (code: string) => {
    setCoupons((prev) =>
      prev.map((c) => (c.code === code ? { ...c, active: !c.active } : c))
    );
  };

  // --- REELS & VIDEO CONTENT MANAGEMENT ---
  const fetchReels = async () => {
    try {
      setIsLoadingReels(true);
      const res = await fetch('/api/reels');
      const data = await res.json();
      if (data?.success && Array.isArray(data.reels)) {
        setReels(data.reels);
        if (data.reels.length > 0 && !activeReel) {
          setActiveReel(data.reels[0]);
        }
      }
    } catch (err) {
      console.warn('Could not fetch reels:', err);
    } finally {
      setIsLoadingReels(false);
    }
  };

  const fetchAdminReels = async () => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/admin/reels', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (data?.success) {
        setAdminReels(data.reels || []);
        if (data.stats) setAdminReelsStats(data.stats);
      }
    } catch (err) {
      console.warn('Could not fetch admin reels:', err);
    }
  };

  useEffect(() => {
    if (adminToken && isAdminAuthenticated) {
      fetchAdminReels();
    }
  }, [adminToken, isAdminAuthenticated]);

  const openReelModal = (reelOrId?: ReelVideo | string) => {
    if (!reelOrId) {
      if (reels.length > 0) {
        setActiveReel(reels[0]);
        setActiveReelIndex(0);
      }
    } else if (typeof reelOrId === 'string') {
      const foundIdx = reels.findIndex(r => r.id === reelOrId);
      if (foundIdx >= 0) {
        setActiveReel(reels[foundIdx]);
        setActiveReelIndex(foundIdx);
      } else {
        const foundAdmin = adminReels.find(r => r.id === reelOrId);
        if (foundAdmin) {
          setActiveReel(foundAdmin);
          setActiveReelIndex(0);
        }
      }
    } else {
      setActiveReel(reelOrId);
      const foundIdx = reels.findIndex(r => r.id === reelOrId.id);
      setActiveReelIndex(foundIdx >= 0 ? foundIdx : 0);
    }
    setIsReelsOpen(true);
  };

  const uploadReelVideo = async (videoData: string, filename: string, mimeType?: string) => {
    try {
      const res = await fetch('/api/admin/reels/upload-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ videoData, filename, mimeType }),
      });
      const data = await res.json();
      if (data?.success) {
        showToast('Video uploaded successfully', 'success');
        return { success: true, url: data.url, bytes: data.bytes, filename: data.filename, mimeType: data.mimeType };
      }
      showToast(data?.error || 'Video upload failed', 'warning');
      return { success: false, error: data?.error || 'Failed to upload video' };
    } catch (err: any) {
      showToast('Network error while uploading video', 'warning');
      return { success: false, error: err.message };
    }
  };

  const uploadReelThumbnail = async (imageData: string, filename?: string) => {
    try {
      const res = await fetch('/api/admin/reels/upload-thumbnail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ imageData, filename }),
      });
      const data = await res.json();
      if (data?.success) {
        return { success: true, url: data.url, filename: data.filename };
      }
      return { success: false, error: data?.error || 'Thumbnail upload failed' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const createReel = async (reelData: Partial<ReelVideo>) => {
    try {
      const res = await fetch('/api/admin/reels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(reelData),
      });
      const data = await res.json();
      if (data?.success && data.reel) {
        showToast(`Reel "${data.reel.title}" created!`, 'success');
        await fetchAdminReels();
        await fetchReels();
        return { success: true, reel: data.reel };
      }
      showToast(data?.error || 'Failed to create reel', 'warning');
      return { success: false, error: data?.error || 'Failed to create reel' };
    } catch (err: any) {
      showToast('Network error while creating reel', 'warning');
      return { success: false, error: err.message };
    }
  };

  const updateReel = async (id: string, updates: Partial<ReelVideo> & { cleanupOldVideo?: boolean }) => {
    try {
      const res = await fetch(`/api/admin/reels/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data?.success && data.reel) {
        showToast(`Reel "${data.reel.title}" updated`, 'success');
        await fetchAdminReels();
        await fetchReels();
        return { success: true, reel: data.reel };
      }
      showToast(data?.error || 'Failed to update reel', 'warning');
      return { success: false, error: data?.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const deleteReel = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reels/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await res.json();
      if (data?.success) {
        showToast('Reel deleted', 'info');
        await fetchAdminReels();
        await fetchReels();
        return { success: true };
      }
      showToast(data?.error || 'Failed to delete reel', 'warning');
      return { success: false, error: data?.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const togglePublishReel = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reels/${id}/toggle-publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const data = await res.json();
      if (data?.success && data.reel) {
        showToast(`Reel "${data.reel.title}" is now ${data.reel.status}`, 'success');
        await fetchAdminReels();
        await fetchReels();
        return { success: true, reel: data.reel };
      }
      return { success: false, error: data?.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const reorderReels = async (reelIds: string[]) => {
    try {
      const res = await fetch('/api/admin/reels-reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ reelIds }),
      });
      const data = await res.json();
      if (data?.success) {
        showToast('Reels reordered successfully', 'success');
        await fetchAdminReels();
        await fetchReels();
        return { success: true };
      }
      return { success: false, error: data?.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        bundles,
        departments,
        setDepartments,
        setProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        saveMerchandising,
        persistProductImage,
        persistProductGallery,
        refreshProducts,
        routeView,
        selectedDepartment,
        setSelectedDepartment,
        selectedSubcategory,
        setSelectedSubcategory,
        navigateToDepartment,
        navigateToCollection,
        navigateToAuth,
        navigateToAccount,
        navigateToAdmin,
        navigateToStaffLogin,
        navigateToStaffPortal,
        authReturnTo,
        completeAuthRedirect,
        activeAccountTab,
        setActiveAccountTab,
        returnToHome,
        openProductModal,
        closeProductModal,
        activePriceTier,
        setActivePriceTier,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        addBundleToCart,
        cartCount,
        cartSubtotal,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        couponDiscount,
        redeemedPointsDiscount,
        shippingFee,
        cartTotal,
        cartStockIssues,
        hasCartStockIssue,
        wishlist,
        toggleWishlist,
        isInWishlist,
        orders,
        createOrder,
        updateOrderStatus,
        recentOrder,
        customers,
        currentCustomer,
        customerToken,
        isCustomerSessionChecked,
        setCurrentCustomer,
        registerOrUpdateCustomer,
        updateCustomerRecord,
        registerCustomer,
        loginCustomer,
        logoutCustomer,
        requestPasswordReset,
        confirmPasswordReset,
        changeCustomerPassword,
        fetchCustomerOrders,
        updateCustomerProfile,
        saveCustomerAddresses,
        enquiries,
        submitEnquiry,
        updateEnquiryStatus,
        waitlists,
        joinWaitlist,
        updateWaitlistStatus,
        feedbackList,
        submitFeedback,
        abandonedCarts,
        trackAbandonedCart,
        updateAbandonedCartStatus,
        logActivity,
        googleSheetsConfig,
        setGoogleSheetsUrl,
        testSheetsConnection,
        syncQueue,
        retryFailedSyncQueue,
        syncAllExistingToSheets,
        sendTestCustomerAndOrderToSheets,
        exportCustomersCSV,
        exportOrdersCSV,
        exportEnquiriesCSV,
        exportAbandonedCartsCSV,
        exportWaitlistCSV,
        exportFeedbackCSV,
        rewardsBalance,
        rewardsHistory,
        referralCode,
        redeemPointsForOrder,
        pointsToRedeemAtCheckout,
        setPointsToRedeemAtCheckout,
        settings,
        updateSettings,
        coupons,
        addCoupon,
        toggleCouponActive,
        addCategoryToDepartment,
        removeCategoryFromDepartment,
        renameCategoryInDepartment,
        // Inventory & Suppliers
        suppliers,
        stockLogs,
        adjustProductStock,

        // Payments & Transactions
        paymentTransactions,

        // Return & Replacement Claims
        returnClaims,
        submitReturnClaim,
        updateReturnClaimStatus,

        // Editorial Collections
        editorialCollections,
        saveEditorialCollection,
        deleteEditorialCollection,
        uploadProductImage,

        // Reels & Video Content Management
        reels,
        adminReels,
        adminReelsStats,
        isLoadingReels,
        activeReel,
        setActiveReel,
        openReelModal,
        fetchReels,
        fetchAdminReels,
        createReel,
        updateReel,
        deleteReel,
        togglePublishReel,
        reorderReels,
        uploadReelVideo,
        uploadReelThumbnail,
        likedReelIds,
        reelLikesMap,
        toggleReelLike,
        wishlistRestockAlerts,
        toggleWishlistRestockAlert,
        trackAnalyticsEvent,
        syncRewardsFromServer,
        editzAiPrompt,
        setEditzAiPrompt,
        navigateToEditzAI,
        personalizationConsent,
        setPersonalizationConsent,
        recentlyViewedIds,
        consentedSearchTerms,
        recordSearchSignal,
        clearPersonalizationSignals,

        // Admin Security & Session
        adminToken,
        isAdminAuthenticated,
        isAdminSessionChecked,
        adminLogin,
        adminLogout,

        // Staff Portal Security & Session
        staffToken,
        isStaffAuthenticated,
        isStaffSessionChecked,
        staffUsername,
        staffLogin,
        staffLogout,
        syncStoreSettingsLocally,
        isMobileNavOpen,
        setIsMobileNavOpen,
        selectedProduct,
        setSelectedProduct,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        isSearchOpen,
        setIsSearchOpen,
        isAdminOpen,
        setIsAdminOpen,
        isAdminLoginModalOpen,
        setIsAdminLoginModalOpen,
        isReturnClaimOpen,
        setIsReturnClaimOpen,
        returnClaimPrefillOrder,
        setReturnClaimPrefillOrder,
        isRewardsOpen,
        setIsRewardsOpen,
        isTrackingOpen,
        setIsTrackingOpen,
        trackingLookupId,
        setTrackingLookupId,
        isAccountOpen,
        setIsAccountOpen,
        isEnquiryOpen,
        setIsEnquiryOpen,
        enquiryProduct,
        setEnquiryProduct,
        isWaitlistOpen,
        setIsWaitlistOpen,
        waitlistProduct,
        setWaitlistProduct,
        isFeedbackOpen,
        setIsFeedbackOpen,
        feedbackProduct,
        setFeedbackProduct,
        activePolicy,
        setActivePolicy,
        isReelsOpen,
        setIsReelsOpen,
        activeReelIndex,
        setActiveReelIndex,
        selectedNeed,
        setSelectedNeed,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        toasts,
        showToast,
        navigateToWishlist,
        isBgAudioPlaying: bgAudioState.isPlaying,
        isBgAudioUserPaused: bgAudioState.isUserPaused,
        isBgAudioAwaitingInteraction: bgAudioState.isAwaitingInteraction,
        toggleBgAudio,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
