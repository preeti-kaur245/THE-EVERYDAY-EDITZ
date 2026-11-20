export type Department = 'women' | 'men' | 'kids' | 'home-lifestyle';

export type ProductCategory = 
  | 'workspace' 
  | 'home-organise' 
  | 'travel' 
  | 'lifestyle' 
  | 'kitchen' 
  | 'gifting';

export type ProblemNeed = 
  | 'Organise My Space' 
  | 'Make Life Easier' 
  | 'Travel Smarter' 
  | 'Upgrade My Workspace' 
  | 'Everyday Essentials' 
  | 'Gifts Worth Giving';

export interface DepartmentConfig {
  id: Department;
  name: string;
  tagline: string;
  description: string;
  subcategories: string[];
  bannerAccent: string;
  marketingWeight: number; // e.g. 70 for women, 20 for men, 10 for kids
}

export interface ProductVariant {
  name: string;
  options: {
    label: string;
    value: string;
    colorHex?: string;
    inStock: boolean;
  }[];
}

export interface ProductOptionValue {
  id: string;
  label: string;
  value: string;
  colorHex?: string;
  image?: string;
  available: boolean;
}

export interface ProductOptionGroup {
  id: string;
  name: string; // e.g. 'Colour', 'Size', 'Material', 'Pack Size'
  type: 'color' | 'size' | 'select';
  required: boolean;
  values: ProductOptionValue[];
}

export interface ProductVariantItem {
  id: string;
  sku?: string;
  title: string; // e.g. 'Pastel Pink / M'
  options: Record<string, string>; // { Colour: 'Pastel Pink', Size: 'M' }
  price?: number;
  originalPrice?: number;
  stockCount: number;
  inStock: boolean;
  image?: string;
}

export interface Review {
  id: string;
  author: string;
  location: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  date: string;
  helpfulCount: number;
}

export interface EditorialDetails {
  everydayEdit: string;
  whyYouLoveIt: string[];
  problemItSolves: string;
  keyFeatures: string[];
  specifications: Record<string, string>;
  materialAndDimensions: {
    material: string;
    dimensions: string;
    weight: string;
  };
  packageContents: string[];
  howToUse: string[];
  limitations: string[];
  shippingAndReturns: string;
}

export interface Product {
  id: string;
  sku?: string; // Master inventory SKU (e.g. EE-W-TOIL-01)
  name: string;
  tagline: string;
  departments: Department[]; // Many-to-many department assignment
  subcategories: string[]; // Subcategories across departments
  tags: string[];
  category?: ProductCategory; // Backward compatibility
  needCategory?: ProblemNeed; // Backward compatibility
  price: number; // Customer selling price in INR
  originalPrice: number; // MRP in INR
  supplierId?: string; // e.g. SUP-BLR-01
  supplierName?: string; // Verified courier/fulfilment partner
  supplierProductRef?: string; // Supplier model code
  supplierCost?: number; // Private admin purchase cost
  shippingCost?: number; // Courier freight allocation
  discountPercent: number;
  gstRate?: number; // GST rate percentage (e.g. 18%)
  hsnCode?: string; // Indian HSN/SAC code
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockCount: number; // Total physical count
  availableQuantity?: number; // Available unreserved stock
  reservedQuantity?: number; // Reserved for pending/paid orders
  reorderLevel?: number; // Low-stock threshold
  lastStockUpdate?: string; // IST timestamp of last stock update
  lastSupplierVerification?: string; // Date supplier confirmed availability
  status?: 'Active' | 'Inactive' | 'Draft';
  isDailyEdit: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean; // Homepage Spotlight & Featured sections control
  displayOrder?: number; // Merchandising order on homepage & categories
  seoTitle?: string; // Search-engine optimized meta title
  seoDescription?: string; // Search-engine meta description
  slug?: string; // Canonical URL slug (e.g. microfiber-hair-towel)
  isPublished?: boolean;
  ageSuitability?: string; // Especially for Kids & Family products
  safetyInformation?: string; // Safety certifications & notes
  priceTier?: 'under-199' | 'under-299' | 'under-499' | 'under-999' | 'above-999';
  primaryImage?: string; // Canonical primary/cover image URL
  gallery?: ProductImageItem[]; // Multi-image gallery items with positions and flags
  images: string[]; // Ordered list of image URLs (primary image at index 0)
  videoThumbnail?: string;
  videoCaption?: string;
  variants?: ProductVariant[];
  options?: ProductOptionGroup[];
  variantItems?: ProductVariantItem[];
  editorial: EditorialDetails;
  reviews: Review[];
  frequentlyBoughtWith?: string[];
  customBadge?: string;
  aiTags?: string[];
  moments?: string[];
  useCases?: string[];
  compatibility?: string[];
}

export interface ProductImageItem {
  url: string;
  position: number;
  isPrimary: boolean;
}

export interface Bundle {
  id: string;
  title: string;
  description: string;
  badge: string;
  productIds: string[];
  bundlePrice: number;
  originalPrice: number;
  savings: number;
  image: string;
  isActive?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
  variantId?: string;
  selectedColor?: string;
  selectedSize?: string;
  selectedOptions?: Record<string, string>;
  unitPrice?: number;
  variantSku?: string;
  variantImage?: string;
}

export interface Address {
  id?: string;
  label?: string;
  isDefault?: boolean;
  fullName: string;
  phoneNumber: string;
  email: string;
  flatHouseNo: string;
  streetArea: string;
  landmark?: string;
  pincode: string;
  city: string;
  state: string;
}

export interface Order {
  id: string;
  customerId?: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingCharge: number;
  total: number;
  status: 'Confirmed' | 'Packed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  paymentMethod: 'UPI' | 'Card' | 'Netbanking'; // Strictly PREPAID ONLY - COD disabled
  paymentStatus: 'Paid' | 'Failed' | 'Refunded';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  shippingAddress: Address;
  courierName: string;
  trackingNumber: string;
  estimatedDeliveryDate: string;
  supplierName?: string;
  supplierOrderRef?: string;
  fulfilmentStatus?: 'Unfulfilled' | 'Processing' | 'Fulfilled' | 'Cancelled';
  deliveryStatus?: 'Ordered' | 'Dispatched' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Returned';
  returnStatus?: 'None' | 'Requested' | 'Approved' | 'Rejected' | 'Refunded';
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  gateway: 'Razorpay' | 'UPI' | 'PhonePe' | 'Card' | 'Netbanking';
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  amount: number;
  currency: 'INR';
  status: 'Success' | 'Failed' | 'Pending' | 'Refunded';
  method: 'UPI' | 'Card' | 'Netbanking';
  timestamp: string;
  verifiedServerSide: boolean;
  customerEmail?: string;
  customerPhone?: string;
  failureReason?: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phoneNumber: string;
  whatsappNumber: string;
  city: string;
  state: string;
  pincode: string;
  customerSegment: 'Women' | 'Men' | 'Kids' | 'Household';
  registrationDate: string;
  registrationSource: string;
  marketingConsent: boolean; // Explicit separate marketing consent
  whatsappConsent: boolean;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
  emailVerified?: boolean;
  authProvider?: string;
  hasPassword?: boolean;
  savedAddresses?: Address[];
  totalOrders: number;
  totalSpending: number;
  customerStatus: 'Active' | 'VIP' | 'Inactive';
  lastActivity: string;
}

export interface ReturnClaim {
  id: string;
  orderId: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productId: string;
  productName: string;
  issueType: 'Damaged in Transit' | 'Defective Item' | 'Incorrect Product' | 'Incomplete Package' | 'Misdescribed';
  description: string;
  evidenceImages: string[];
  status: 'Submitted' | 'Under Review' | 'Replacement Approved' | 'Refund Approved' | 'Rejected' | 'Info Required';
  adminNotes?: string;
  resolutionDate?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  categories: string[];
  leadTimeDays: number;
  activeSKUs: number;
  lastStockVerification: string;
}

export interface StockAdjustmentLog {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  changeAmount: number;
  previousStock: number;
  newStock: number;
  reason: 'Restock' | 'Order Fulfilled' | 'Order Cancelled' | 'Damaged/Defective' | 'Physical Audit' | 'Manual Correction';
  adjustedBy: string;
  timestamp: string;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  action: string;
  status: 'Success' | 'Warning' | 'Failed' | 'Blocked';
  ip?: string;
  details: string;
}

export interface ProductEnquiry {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  productName: string;
  productId: string;
  productCategory: string;
  customerMessage: string;
  enquiryDate: string;
  sourcePlatform: string;
  enquiryStatus: 'New' | 'In Progress' | 'Responded' | 'Closed';
}

export interface AbandonedCart {
  id: string;
  customerId?: string;
  customerName: string;
  email: string;
  phone: string;
  products: string;
  cartValue: number;
  cartCreated: string;
  lastActivity: string;
  recoveryStatus: 'Pending' | 'Contacted' | 'Recovered' | 'Expired';
  recoveryChannel?: 'WhatsApp' | 'Email' | 'None';
}

export interface ProductWaitlist {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  interestedProduct: string;
  productId?: string;
  productCategory: string;
  expectedBudget: string;
  registrationDate: string;
  notificationConsent: boolean;
  status: 'Waiting' | 'Notified' | 'Purchased';
}

export interface CustomerFeedback {
  id: string;
  customerId?: string;
  customerName: string;
  orderId?: string;
  productName: string;
  productId?: string;
  rating: number;
  feedback: string;
  submissionDate: string;
}

export interface WebsiteActivity {
  id: string;
  customerId?: string;
  sessionId: string;
  activityType: 'page_view' | 'product_view' | 'search' | 'add_to_cart' | 'checkout_started' | 'category_view';
  pageVisited: string;
  productId?: string;
  activityTimestamp: string;
  trafficSource: string;
  deviceType: string;
}

export interface GoogleSheetsConfig {
  appsScriptUrl: string;
  spreadsheetId?: string;
  isConnected: boolean;
  lastCheckedAt?: string;
  lastSyncStatus: 'idle' | 'success' | 'failed' | 'pending';
  errorMessage?: string;
  totalSyncedRecords: number;
}

export interface SyncQueueItem {
  id: string;
  sheet: 'Customers' | 'Orders' | 'Products' | 'Inventory' | 'Suppliers' | 'Payments' | 'Returns & Refunds' | 'Product Enquiries' | 'Abandoned Carts' | 'Product Waitlist' | 'Customer Feedback' | 'Activity Logs';
  action: string;
  payload: Record<string, any>;
  timestamp: string;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'success' | 'failed';
}

export interface RewardsTransaction {
  id: string;
  title: string;
  points: number;
  type: 'earned' | 'redeemed';
  date: string;
}

export interface Coupon {
  code: string;
  description: string;
  discountPercent?: number;
  discountAmount?: number;
  minOrderValue: number;
  active: boolean;
}

export interface StoreSettings {
  announcementText: string;
  announcementSubtext: string;
  heroHeadline: string;
  heroSubtitle: string;
  dailyEditTitle: string;
  dailyEditSubtitle: string;
  freeShippingThreshold: number;
  shippingCharge: number;
  rewardPointsPer100Rupees: number;
  referralRewardPoints: number;
  prepaidNotice?: string;
  googleSheetsUrl?: string;
  googleSiteVerification?: string;
  gaMeasurementId?: string;
  brandTagline?: string;
  smallBusinessPositioning?: string;
}

export interface EditorialCollection {
  id: string;
  title: string;
  tagline?: string;
  shortDescription: string;
  category: string;
  coverImageIndex: number;
  images: string[];
  productIds: string[];
  status: 'Draft' | 'Published';
  updatedAt: string;
  curatorNote?: string;
}

export type ReelStatus = 'Draft' | 'Published' | 'Unpublished';

export interface ReelVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  product_id?: string;
  category: string;
  cta_label: string;
  cta_url?: string;
  display_order: number;
  status: ReelStatus;
  published_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  file_size?: number;
  duration?: number;
  likes?: number;
}

export interface AIDiscoveryMatch {
  product: Product;
  reason: string;
  score?: number;
}

export interface AIDiscoveryResponse {
  success: boolean;
  aiMode?: 'gemini-grounded' | 'catalogue-fallback' | string;
  assistantMessage: string;
  aiNotice?: string;
  intent?: {
    maxBudget?: number | null;
    category?: string;
    occasion?: string;
    keywords?: string[];
  };
  matches: AIDiscoveryMatch[];
  refinementSuggestions?: string[];
}

export interface VisualSearchResponse {
  success: boolean;
  code?: string;
  message?: string;
  analysis?: {
    detectedItem: string;
    honestAssessment: string;
  };
  matches: AIDiscoveryMatch[];
}

export interface BudgetBasketItem {
  product: Product;
  quantity: number;
  reason: string;
  lineTotal: number;
  lineOriginalTotal: number;
}

export interface BudgetBasketResponse {
  success: boolean;
  aiMode?: string;
  budget: number;
  purpose?: string;
  category?: string;
  summary?: string;
  items: BudgetBasketItem[];
  alternativeSwaps?: Product[];
  totalPrice?: number;
  totalSavings?: number;
  remainingBudget?: number;
  aiNotice?: string;
}
