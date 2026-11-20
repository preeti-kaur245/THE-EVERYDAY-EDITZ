import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { BRAND_LOGO_URL } from '../utils/assetUrl';
import { Department, DepartmentConfig, Order, Product, ReelVideo } from '../types';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Megaphone,
  Film,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  Check,
  X,
  Menu,
  ArrowLeft,
  Star,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';

type StaffSection = 'overview' | 'products' | 'categories' | 'orders' | 'banners' | 'reels';

const DEPARTMENTS_META: Array<{ id: Department; label: string }> = [
  { id: 'women', label: 'Women' },
  { id: 'men', label: 'Men' },
  { id: 'kids', label: 'Kids' },
  { id: 'home-lifestyle', label: 'Home & Lifestyle' },
];

const ORDER_STATUSES: Order['status'][] = [
  'Confirmed',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export const StaffDashboard: React.FC = () => {
  const {
    staffToken,
    staffUsername,
    staffLogout,
    returnToHome,
    products: storeProducts,
    setProducts: setStoreProducts,
    departments,
    setDepartments,
    orders: localOrders,
    settings,
    syncStoreSettingsLocally,
    fetchReels,
    showToast,
  } = useStore();

  const [section, setSection] = useState<StaffSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Server-backed staff datasets
  const [staffProducts, setStaffProducts] = useState<Product[]>(storeProducts);
  const [staffOrders, setStaffOrders] = useState<Order[]>([]);
  const [staffReels, setStaffReels] = useState<ReelVideo[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Products filters & quick price edits
  const [productQuery, setProductQuery] = useState('');
  const [productDeptFilter, setProductDeptFilter] = useState<string>('all');
  const [inlinePrices, setInlinePrices] = useState<Record<string, string>>({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);

  // Product Editor Drawer / Modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductEditorOpen, setIsProductEditorOpen] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodTagline, setProdTagline] = useState('');
  const [prodPrice, setProdPrice] = useState('299');
  const [prodOriginalPrice, setProdOriginalPrice] = useState('449');
  const [prodStock, setProdStock] = useState('25');
  const [prodDepts, setProdDepts] = useState<Department[]>(['women']);
  const [prodSubcats, setProdSubcats] = useState<string[]>([]);
  const [prodPublished, setProdPublished] = useState(true);
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Categories management state
  const [activeCatDept, setActiveCatDept] = useState<Department>('women');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renamingOld, setRenamingOld] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');
  const [savingCategories, setSavingCategories] = useState(false);

  // Orders management state
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [orderQuery, setOrderQuery] = useState('');
  const [orderDrafts, setOrderDrafts] = useState<Record<string, { status: Order['status']; trackingNumber: string }>>({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Homepage Promotional Banners state
  const [bannerForm, setBannerForm] = useState({
    announcementText: settings.announcementText || '',
    announcementSubtext: settings.announcementSubtext || '',
    brandTagline: settings.brandTagline || '',
    heroHeadline: settings.heroHeadline || '',
    heroSubtitle: settings.heroSubtitle || '',
    dailyEditTitle: settings.dailyEditTitle || '',
    dailyEditSubtitle: settings.dailyEditSubtitle || '',
  });
  const [savingBanners, setSavingBanners] = useState(false);

  // Reels & Videos state
  const [editingReel, setEditingReel] = useState<ReelVideo | null>(null);
  const [isReelEditorOpen, setIsReelEditorOpen] = useState(false);
  const [reelTitle, setReelTitle] = useState('');
  const [reelDescription, setReelDescription] = useState('');
  const [reelVideoUrl, setReelVideoUrl] = useState('');
  const [reelThumbUrl, setReelThumbUrl] = useState('');
  const [reelProductId, setReelProductId] = useState('');
  const [reelCategory, setReelCategory] = useState('Lifestyle');
  const [reelCtaLabel, setReelCtaLabel] = useState('Shop Now');
  const [reelStatus, setReelStatus] = useState<'Published' | 'Draft' | 'Unpublished'>('Published');
  const [uploadingReelVideo, setUploadingReelVideo] = useState(false);
  const [uploadingReelThumb, setUploadingReelThumb] = useState(false);
  const [savingReel, setSavingReel] = useState(false);

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${staffToken || ''}`,
    }),
    [staffToken]
  );

  // Initial load from protected /api/staff/* endpoints
  const loadStaffWorkspace = async () => {
    if (!staffToken) return;
    setLoadingData(true);
    try {
      const [pRes, oRes, bRes, rRes, cRes] = await Promise.all([
        fetch('/api/staff/products', { headers: { Authorization: `Bearer ${staffToken}` }, cache: 'no-store' }),
        fetch('/api/staff/orders', { headers: { Authorization: `Bearer ${staffToken}` }, cache: 'no-store' }),
        fetch('/api/staff/banners', { headers: { Authorization: `Bearer ${staffToken}` }, cache: 'no-store' }),
        fetch('/api/staff/reels', { headers: { Authorization: `Bearer ${staffToken}` }, cache: 'no-store' }),
        fetch('/api/staff/categories', { headers: { Authorization: `Bearer ${staffToken}` }, cache: 'no-store' }),
      ]);

      if (pRes.status === 401 || pRes.status === 403) {
        await staffLogout();
        return;
      }

      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData?.success && Array.isArray(pData.products)) {
          setStaffProducts(pData.products);
          setStoreProducts(pData.products);
        }
      }

      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData?.success && Array.isArray(oData.orders)) {
          setStaffOrders(oData.orders);
        }
      }

      if (bRes.ok) {
        const bData = await bRes.json();
        if (bData?.success && bData.banners) {
          setBannerForm((prev) => ({ ...prev, ...bData.banners }));
        }
      }

      if (rRes.ok) {
        const rData = await rRes.json();
        if (rData?.success && Array.isArray(rData.reels)) {
          setStaffReels(rData.reels);
        }
      }

      if (cRes.ok) {
        const cData = await cRes.json();
        if (cData?.success && Array.isArray(cData.departments) && cData.departments.length > 0) {
          setDepartments(cData.departments);
        }
      }
    } catch {
      showToast('Some staff records could not be refreshed.', 'warning');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadStaffWorkspace();
  }, [staffToken]);

  // Merge server orders with local orders (deduplicated by order ID, server takes precedence)
  const mergedOrders = useMemo(() => {
    const map = new Map<string, Order>();
    for (const o of staffOrders) map.set(o.id, o);
    for (const o of localOrders) {
      if (!map.has(o.id)) map.set(o.id, o);
    }
    return Array.from(map.values());
  }, [staffOrders, localOrders]);

  // Summary metrics
  const totalProducts = staffProducts.length;
  const publishedProducts = staffProducts.filter((p) => p.isPublished !== false && p.status !== 'Draft').length;
  const lowStockProducts = staffProducts.filter((p) => (p.stockCount ?? 0) <= 5);
  const pendingOrdersCount = mergedOrders.filter((o) => o.status === 'Confirmed' || o.status === 'Packed').length;
  const publishedReelsCount = staffReels.filter((r) => r.status === 'Published').length;

  // Filtered products list
  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return staffProducts.filter((p) => {
      const deptMatch = productDeptFilter === 'all' || p.departments?.includes(productDeptFilter as Department);
      const qMatch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.tagline || '').toLowerCase().includes(q) ||
        (p.subcategories || []).some((s) => s.toLowerCase().includes(q));
      return deptMatch && qMatch;
    });
  }, [staffProducts, productQuery, productDeptFilter]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    return mergedOrders.filter((o) => {
      const statusMatch = orderStatusFilter === 'All' || o.status === orderStatusFilter;
      const qMatch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        (o.shippingAddress?.fullName || '').toLowerCase().includes(q) ||
        (o.shippingAddress?.phoneNumber || '').includes(q) ||
        (o.shippingAddress?.city || '').toLowerCase().includes(q);
      return statusMatch && qMatch;
    });
  }, [mergedOrders, orderStatusFilter, orderQuery]);

  // Available subcategories for selected product editor departments
  const availableSubcatsForEditor = useMemo(() => {
    const set = new Set<string>();
    for (const d of departments) {
      if (prodDepts.includes(d.id)) {
        for (const s of d.subcategories) set.add(s);
      }
    }
    return Array.from(set);
  }, [departments, prodDepts]);

  // --- Product Handlers ---
  const openCreateProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdTagline('');
    setProdPrice('299');
    setProdOriginalPrice('449');
    setProdStock('25');
    setProdDepts(['women']);
    setProdSubcats([]);
    setProdPublished(true);
    setProdFeatured(false);
    setProdImages([]);
    setNewImageUrl('');
    setIsProductEditorOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdTagline(p.tagline || '');
    setProdPrice(String(p.price));
    setProdOriginalPrice(String(p.originalPrice || Math.round(p.price * 1.3)));
    setProdStock(String(p.stockCount ?? 0));
    setProdDepts(p.departments?.length ? [...p.departments] : ['women']);
    setProdSubcats(p.subcategories?.length ? [...p.subcategories] : []);
    setProdPublished(p.isPublished !== false && p.status !== 'Draft');
    setProdFeatured(Boolean(p.isFeatured));
    setProdImages(p.images?.length ? [...p.images] : p.primaryImage ? [p.primaryImage] : []);
    setNewImageUrl('');
    setIsProductEditorOpen(true);
  };

  const handleUploadProductImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch('/api/staff/upload-image', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ dataUrl, filename: file.name, mimeType: file.type }),
      });
      const data = await res.json();
      if (res.ok && data?.success && data.url) {
        setProdImages((prev) => [...prev, data.url]);
        showToast('Product image uploaded', 'success');
      } else {
        showToast(data?.error || 'Could not upload image', 'warning');
      }
    } catch {
      showToast('Failed to upload image', 'warning');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      showToast('Product name is required.', 'warning');
      return;
    }
    const priceNum = Number(prodPrice);
    const origNum = Math.max(priceNum, Number(prodOriginalPrice) || priceNum);
    const stockNum = Math.max(0, Number(prodStock) || 0);
    if (!priceNum || priceNum <= 0) {
      showToast('Please enter a valid selling price.', 'warning');
      return;
    }

    setSavingProduct(true);
    const payload = {
      name: prodName.trim(),
      tagline: prodTagline.trim() || 'Thoughtfully selected everyday essential.',
      price: priceNum,
      originalPrice: origNum,
      stockCount: stockNum,
      inStock: stockNum > 0,
      departments: prodDepts.length ? prodDepts : (['women'] as Department[]),
      subcategories: prodSubcats,
      isPublished: prodPublished,
      isFeatured: prodFeatured,
      images: prodImages.length ? prodImages : [BRAND_LOGO_URL],
      primaryImage: prodImages[0] || BRAND_LOGO_URL,
    };

    try {
      const url = editingProduct ? `/api/staff/products/${editingProduct.id}` : '/api/staff/products';
      const method = editingProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data?.success && data.product) {
        const saved: Product = data.product;
        setStaffProducts((prev) => {
          const next = editingProduct
            ? prev.map((item) => (item.id === saved.id ? saved : item))
            : [saved, ...prev];
          setStoreProducts(next);
          return next;
        });
        setIsProductEditorOpen(false);
        showToast(editingProduct ? 'Product updated on storefront' : 'New product published to catalogue', 'success');
      } else {
        showToast(data?.error || 'Could not save product.', 'warning');
      }
    } catch {
      showToast('Network error while saving product.', 'warning');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleQuickPriceSave = async (p: Product) => {
    const raw = inlinePrices[p.id];
    const parsed = Number(raw);
    if (!parsed || parsed <= 0 || parsed === p.price) return;
    setSavingPriceId(p.id);
    try {
      const res = await fetch(`/api/staff/products/${p.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          price: parsed,
          originalPrice: Math.max(parsed, p.originalPrice || parsed),
        }),
      });
      const data = await res.json();
      if (res.ok && data?.success && data.product) {
        setStaffProducts((prev) => {
          const next = prev.map((item) => (item.id === p.id ? data.product : item));
          setStoreProducts(next);
          return next;
        });
        setInlinePrices((prev) => {
          const copy = { ...prev };
          delete copy[p.id];
          return copy;
        });
        showToast(`Price updated to ₹${parsed}`, 'success');
      } else {
        showToast(data?.error || 'Could not update price', 'warning');
      }
    } catch {
      showToast('Failed to save price update', 'warning');
    } finally {
      setSavingPriceId(null);
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    try {
      const res = await fetch(`/api/staff/products/${p.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setStaffProducts((prev) => {
          const next = prev.filter((item) => item.id !== p.id);
          setStoreProducts(next);
          return next;
        });
        showToast(`Removed "${p.name}" from catalogue`, 'info');
      } else {
        showToast(data?.error || 'Could not delete product', 'warning');
      }
    } catch {
      showToast('Failed to delete product', 'warning');
    }
  };

  // --- Categories Handlers ---
  const persistDepartments = async (nextDepts: DepartmentConfig[], successMsg: string) => {
    setSavingCategories(true);
    try {
      const res = await fetch('/api/staff/categories', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ departments: nextDepts }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setDepartments(nextDepts);
        showToast(successMsg, 'success');
      } else {
        showToast(data?.error || 'Could not save category changes', 'warning');
      }
    } catch {
      showToast('Failed to save categories', 'warning');
    } finally {
      setSavingCategories(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) return;
    const target = departments.find((d) => d.id === activeCatDept);
    if (!target) return;
    if (target.subcategories.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      showToast('That category already exists in this department.', 'warning');
      return;
    }
    const nextDepts = departments.map((d) =>
      d.id === activeCatDept ? { ...d, subcategories: [...d.subcategories, clean] } : d
    );
    await persistDepartments(nextDepts, `Added "${clean}" to ${target.name}`);
    setNewCategoryName('');
  };

  const handleRenameCategory = async (oldName: string) => {
    const clean = renamingValue.trim();
    if (!clean || clean === oldName) {
      setRenamingOld(null);
      return;
    }
    const nextDepts = departments.map((d) =>
      d.id === activeCatDept
        ? { ...d, subcategories: d.subcategories.map((s) => (s === oldName ? clean : s)) }
        : d
    );
    await persistDepartments(nextDepts, `Renamed category to "${clean}"`);
    setRenamingOld(null);
    setRenamingValue('');
  };

  const handleRemoveCategory = async (catName: string) => {
    const nextDepts = departments.map((d) =>
      d.id === activeCatDept
        ? { ...d, subcategories: d.subcategories.filter((s) => s !== catName) }
        : d
    );
    await persistDepartments(nextDepts, `Removed "${catName}" category`);
  };

  // --- Order Status Handler ---
  const handleUpdateOrderStatus = async (order: Order) => {
    const draft = orderDrafts[order.id];
    const nextStatus = draft?.status || order.status;
    const nextTracking = draft?.trackingNumber ?? order.trackingNumber ?? '';
    setUpdatingOrderId(order.id);
    try {
      const res = await fetch(`/api/staff/orders/${encodeURIComponent(order.id)}/status`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ status: nextStatus, trackingNumber: nextTracking }),
      });
      const data = await res.json();
      if (res.ok && data?.success && data.order) {
        setStaffOrders((prev) => {
          const exists = prev.some((o) => o.id === order.id);
          return exists ? prev.map((o) => (o.id === order.id ? data.order : o)) : [data.order, ...prev];
        });
        showToast(`Order ${order.id} updated to ${nextStatus}`, 'success');
      } else {
        showToast(data?.error || 'Could not update order status', 'warning');
      }
    } catch {
      showToast('Failed to update order status', 'warning');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // --- Banners Handler ---
  const handleSaveBanners = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBanners(true);
    try {
      const res = await fetch('/api/staff/banners', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(bannerForm),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        syncStoreSettingsLocally(bannerForm);
        showToast('Homepage promotional banners updated live', 'success');
      } else {
        showToast(data?.error || 'Could not save banners', 'warning');
      }
    } catch {
      showToast('Failed to save homepage banners', 'warning');
    } finally {
      setSavingBanners(false);
    }
  };

  // --- Reels Handlers ---
  const openCreateReel = () => {
    setEditingReel(null);
    setReelTitle('');
    setReelDescription('');
    setReelVideoUrl('');
    setReelThumbUrl('');
    setReelProductId('');
    setReelCategory('Lifestyle');
    setReelCtaLabel('Shop Now');
    setReelStatus('Published');
    setIsReelEditorOpen(true);
  };

  const openEditReel = (r: ReelVideo) => {
    setEditingReel(r);
    setReelTitle(r.title);
    setReelDescription(r.description || '');
    setReelVideoUrl(r.video_url);
    setReelThumbUrl(r.thumbnail_url || '');
    setReelProductId(r.product_id || '');
    setReelCategory(r.category || 'Lifestyle');
    setReelCtaLabel(r.cta_label || 'Shop Now');
    setReelStatus(r.status);
    setIsReelEditorOpen(true);
  };

  const handleUploadReelVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReelVideo(true);
    try {
      const videoData = await fileToDataUrl(file);
      const res = await fetch('/api/staff/reels/upload-video', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ videoData, filename: file.name, mimeType: file.type }),
      });
      const data = await res.json();
      if (res.ok && data?.success && data.url) {
        setReelVideoUrl(data.url);
        showToast('Promotional video uploaded', 'success');
      } else {
        showToast(data?.error || 'Could not upload video', 'warning');
      }
    } catch {
      showToast('Failed to upload video', 'warning');
    } finally {
      setUploadingReelVideo(false);
      e.target.value = '';
    }
  };

  const handleUploadReelThumb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReelThumb(true);
    try {
      const imageData = await fileToDataUrl(file);
      const res = await fetch('/api/staff/reels/upload-thumbnail', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ imageData, filename: file.name }),
      });
      const data = await res.json();
      if (res.ok && data?.success && data.url) {
        setReelThumbUrl(data.url);
        showToast('Thumbnail image uploaded', 'success');
      } else {
        showToast(data?.error || 'Could not upload thumbnail', 'warning');
      }
    } catch {
      showToast('Failed to upload thumbnail', 'warning');
    } finally {
      setUploadingReelThumb(false);
      e.target.value = '';
    }
  };

  const handleSaveReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelTitle.trim() || !reelVideoUrl.trim()) {
      showToast('Reel title and video are required.', 'warning');
      return;
    }
    setSavingReel(true);
    const payload = {
      title: reelTitle.trim(),
      description: reelDescription.trim(),
      video_url: reelVideoUrl.trim(),
      thumbnail_url: reelThumbUrl.trim(),
      product_id: reelProductId,
      category: reelCategory,
      cta_label: reelCtaLabel.trim() || 'Shop Now',
      status: reelStatus,
    };
    try {
      const url = editingReel ? `/api/staff/reels/${editingReel.id}` : '/api/staff/reels';
      const method = editingReel ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data?.success && data.reel) {
        setStaffReels((prev) =>
          editingReel
            ? prev.map((item) => (item.id === data.reel.id ? data.reel : item))
            : [...prev, data.reel]
        );
        await fetchReels();
        setIsReelEditorOpen(false);
        showToast(editingReel ? 'Reel updated' : 'Promotional reel saved', 'success');
      } else {
        showToast(data?.error || 'Could not save reel', 'warning');
      }
    } catch {
      showToast('Failed to save reel', 'warning');
    } finally {
      setSavingReel(false);
    }
  };

  const handleToggleReelPublish = async (reel: ReelVideo) => {
    try {
      const res = await fetch(`/api/staff/reels/${reel.id}/toggle-publish`, {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok && data?.success && data.reel) {
        setStaffReels((prev) => prev.map((item) => (item.id === reel.id ? data.reel : item)));
        await fetchReels();
        showToast(`Reel set to ${data.reel.status}`, 'success');
      }
    } catch {
      showToast('Failed to update reel status', 'warning');
    }
  };

  const handleDeleteReel = async (reel: ReelVideo) => {
    try {
      const res = await fetch(`/api/staff/reels/${reel.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setStaffReels((prev) => prev.filter((item) => item.id !== reel.id));
        await fetchReels();
        showToast('Reel deleted', 'info');
      }
    } catch {
      showToast('Failed to delete reel', 'warning');
    }
  };

  const navItems: Array<{ id: StaffSection; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products & Prices', icon: Package, count: totalProducts },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, count: mergedOrders.length },
    { id: 'banners', label: 'Homepage Banners', icon: Megaphone },
    { id: 'reels', label: 'Reels & Videos', icon: Film, count: staffReels.length },
  ];

  const activeNavLabel = navItems.find((n) => n.id === section)?.label || 'Overview';
  const currentDeptObj = departments.find((d) => d.id === activeCatDept) || departments[0];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-[#EAE1DB]">
      <div className="px-5 py-5 border-b border-[#EFE7E1] flex items-center justify-between">
        <div>
          <span className="font-serif-luxury text-xl font-semibold text-[#242424] tracking-tight block leading-none">
            Everyday Editz
          </span>
          <span className="text-[11px] text-[#9E6E65] block mt-1">
            Staff Portal
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 text-[#6E6560] hover:text-[#242424] cursor-pointer"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Staff Portal Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSection(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-[#F3E7E4] text-[#242424] font-semibold'
                  : 'text-[#5C534E] hover:bg-[#FAF8F6] hover:text-[#242424]'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#9E6E65]' : 'text-[#8C807A]'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.count === 'number' && (
                <span className="text-[11px] font-mono tabular-nums text-[#8C807A]">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#EFE7E1] space-y-1.5">
        <button
          type="button"
          onClick={returnToHome}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#5C534E] hover:bg-[#FAF8F6] hover:text-[#242424] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#8C807A]" />
          <span>View Storefront</span>
        </button>
        <button
          type="button"
          onClick={staffLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#8D322D] hover:bg-[#FDF2F2] transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-[#242424] flex">
      {/* Desktop Compact Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-64 max-w-[82vw] h-full z-10">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean Top Bar */}
        <header className="sticky top-0 z-30 h-15 bg-white/95 backdrop-blur-xs border-b border-[#EAE1DB] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-lg text-[#242424] hover:bg-[#FAF8F6] cursor-pointer"
              aria-label="Open staff navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-[#7D736D] truncate">
              <span className="hidden sm:inline">Staff Portal</span>
              <span className="hidden sm:inline" aria-hidden="true">/</span>
              <span className="font-semibold text-[#242424] truncate">{activeNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs text-[#6E6560]">
              Signed in as <strong className="text-[#242424] font-medium">{staffUsername || 'Staff'}</strong>
            </span>
            <button
              type="button"
              onClick={openCreateProduct}
              className="px-3.5 py-2 rounded-xl bg-[#242424] hover:bg-[#141414] text-[#FAF8F6] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-[#D9A6A0]" />
              <span>Add Product</span>
            </button>
          </div>
        </header>

        {/* Viewport Workspace */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          {loadingData && staffProducts.length === 0 ? (
            <div className="py-24 flex items-center justify-center gap-2 text-xs text-[#7D736D]">
              <Loader2 className="w-4 h-4 animate-spin text-[#9E6E65]" />
              <span>Loading Everyday Editz workspace...</span>
            </div>
          ) : null}

          {/* SECTION 1: OVERVIEW */}
          {section === 'overview' && (
            <div className="space-y-8">
              <div>
                <h1 className="font-serif-luxury text-3xl font-medium text-[#242424] tracking-tight">
                  Store Operations Overview
                </h1>
                <p className="text-xs sm:text-sm text-[#6E6560] mt-1">
                  Manage catalogue products, pricing, orders, homepage banners, and promotional reels in real time.
                </p>
              </div>

              {/* 4-Column Metric Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-[#EAE1DB] p-5">
                  <p className="text-xs text-[#7D736D]">Total Products</p>
                  <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#242424] mt-2">
                    {totalProducts}
                  </p>
                  <p className="text-[11px] text-[#8C807A] mt-1">
                    {publishedProducts} live · {totalProducts - publishedProducts} draft
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-[#EAE1DB] p-5">
                  <p className="text-xs text-[#7D736D]">Customer Orders</p>
                  <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#242424] mt-2">
                    {mergedOrders.length}
                  </p>
                  <p className="text-[11px] text-[#9E6E65] mt-1">
                    {pendingOrdersCount} awaiting dispatch
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-[#EAE1DB] p-5">
                  <p className="text-xs text-[#7D736D]">Low Stock Items</p>
                  <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#242424] mt-2">
                    {lowStockProducts.length}
                  </p>
                  <p className="text-[11px] text-[#8C807A] mt-1">
                    5 or fewer units left
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-[#EAE1DB] p-5">
                  <p className="text-xs text-[#7D736D]">Promotional Reels</p>
                  <p className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-[#242424] mt-2">
                    {staffReels.length}
                  </p>
                  <p className="text-[11px] text-[#8C807A] mt-1">
                    {publishedReelsCount} published on storefront
                  </p>
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="bg-white rounded-2xl border border-[#EAE1DB] p-5">
                <h2 className="text-sm font-semibold text-[#242424] mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={openCreateProduct}
                    className="p-3.5 rounded-xl bg-[#FAF8F6] hover:bg-[#F3E7E4]/70 border border-[#EAE1DB] text-left transition-colors cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-[#242424]">Add New Product</p>
                    <p className="text-[11px] text-[#7D736D] mt-0.5">Publish item with price & photos</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSection('orders')}
                    className="p-3.5 rounded-xl bg-[#FAF8F6] hover:bg-[#F3E7E4]/70 border border-[#EAE1DB] text-left transition-colors cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-[#242424]">Update Order Status</p>
                    <p className="text-[11px] text-[#7D736D] mt-0.5">Mark packed, shipped, or delivered</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSection('banners')}
                    className="p-3.5 rounded-xl bg-[#FAF8F6] hover:bg-[#F3E7E4]/70 border border-[#EAE1DB] text-left transition-colors cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-[#242424]">Edit Homepage Banners</p>
                    <p className="text-[11px] text-[#7D736D] mt-0.5">Update top bar, hero & daily edit</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSection('reels');
                      openCreateReel();
                    }}
                    className="p-3.5 rounded-xl bg-[#FAF8F6] hover:bg-[#F3E7E4]/70 border border-[#EAE1DB] text-left transition-colors cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-[#242424]">Upload Promo Reel</p>
                    <p className="text-[11px] text-[#7D736D] mt-0.5">Add vertical video linked to product</p>
                  </button>
                </div>
              </div>

              {/* Recent Orders & Low Stock Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-[#EAE1DB] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-[#242424]">Recent Customer Orders</h2>
                    <button
                      type="button"
                      onClick={() => setSection('orders')}
                      className="text-xs font-medium text-[#9E6E65] hover:text-[#242424] cursor-pointer"
                    >
                      View all
                    </button>
                  </div>
                  {mergedOrders.length === 0 ? (
                    <p className="text-xs text-[#7D736D] py-6 text-center">
                      No customer orders recorded yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#F0E8E2]">
                      {mergedOrders.slice(0, 5).map((o) => (
                        <div key={o.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <p className="font-mono font-semibold text-[#242424] truncate">{o.id}</p>
                            <p className="text-[11px] text-[#7D736D] truncate">
                              {o.shippingAddress?.fullName || 'Customer'} · {o.status}
                            </p>
                          </div>
                          <span className="font-mono tabular-nums font-semibold text-[#242424] shrink-0">
                            ₹{o.total}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-[#EAE1DB] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-[#242424]">Catalogue Attention</h2>
                    <button
                      type="button"
                      onClick={() => setSection('products')}
                      className="text-xs font-medium text-[#9E6E65] hover:text-[#242424] cursor-pointer"
                    >
                      Manage products
                    </button>
                  </div>
                  {lowStockProducts.length === 0 ? (
                    <p className="text-xs text-[#7D736D] py-6 text-center">
                      All catalogue items are well stocked.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#F0E8E2]">
                      {lowStockProducts.slice(0, 5).map((p) => (
                        <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <p className="font-medium text-[#242424] truncate">{p.name}</p>
                            <p className="text-[11px] text-[#8D322D]">
                              Stock: {p.stockCount ?? 0} units
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditProduct(p)}
                            className="text-xs font-medium text-[#9E6E65] hover:text-[#242424] shrink-0 cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: PRODUCTS, PRICES & IMAGES */}
          {section === 'products' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="font-serif-luxury text-3xl font-medium text-[#242424] tracking-tight">
                    Products, Pricing & Images
                  </h1>
                  <p className="text-xs text-[#6E6560] mt-1">
                    {filteredProducts.length} of {totalProducts} products shown · Changes sync immediately to the live storefront.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateProduct}
                  className="px-4 py-2.5 rounded-xl bg-[#242424] hover:bg-[#141414] text-[#FAF8F6] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D9A6A0]" />
                  <span>Add New Product</span>
                </button>
              </div>

              {/* Search & Department Filter */}
              <div className="bg-white rounded-2xl border border-[#EAE1DB] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#8C807A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Search products by name or category..."
                    className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] placeholder:text-[#9E938D] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                  />
                </div>
                <div className="flex items-center gap-1 p-1 bg-[#FAF8F6] rounded-xl border border-[#EAE1DB] overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setProductDeptFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      productDeptFilter === 'all' ? 'bg-white text-[#242424] shadow-2xs' : 'text-[#6E6560] hover:text-[#242424]'
                    }`}
                  >
                    All
                  </button>
                  {DEPARTMENTS_META.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setProductDeptFilter(d.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        productDeptFilter === d.id ? 'bg-white text-[#242424] shadow-2xs' : 'text-[#6E6560] hover:text-[#242424]'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products Table */}
              <div className="bg-white rounded-2xl border border-[#EAE1DB] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#EAE1DB] bg-[#FAF8F6] text-[11px] font-medium text-[#6E6560]">
                        <th className="py-3 px-4">Product</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Quick Price (₹)</th>
                        <th className="py-3 px-4 text-right">Stock</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0E8E2]">
                      {filteredProducts.map((p) => {
                        const draftPrice = inlinePrices[p.id] ?? String(p.price);
                        const priceDirty = Number(draftPrice) > 0 && Number(draftPrice) !== p.price;
                        const imgSrc = p.primaryImage || p.images?.[0] || BRAND_LOGO_URL;
                        const isLive = p.isPublished !== false && p.status !== 'Draft';

                        return (
                          <tr key={p.id} className="hover:bg-[#FAF8F6]/70 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 min-w-[220px]">
                                <img
                                  src={imgSrc}
                                  alt={p.name}
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-lg object-cover bg-[#FAF8F6] border border-[#EAE1DB] shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-medium text-[#242424] truncate max-w-[240px]">{p.name}</p>
                                  <p className="text-[11px] text-[#8C807A] truncate max-w-[240px]">
                                    {p.images?.length || 1} photo{(p.images?.length || 1) > 1 ? 's' : ''}
                                    {p.subcategories?.[0] ? ` · ${p.subcategories[0]}` : ''}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[#5C534E] whitespace-nowrap">
                              {(p.departments || []).join(', ')}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  value={draftPrice}
                                  onChange={(e) =>
                                    setInlinePrices((prev) => ({ ...prev, [p.id]: e.target.value }))
                                  }
                                  aria-label={`Price for ${p.name}`}
                                  className="w-20 h-8 px-2 rounded-lg bg-[#FAF8F6] border border-[#E6DDD7] font-mono tabular-nums text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                                />
                                {priceDirty && (
                                  <button
                                    type="button"
                                    disabled={savingPriceId === p.id}
                                    onClick={() => handleQuickPriceSave(p)}
                                    className="h-8 px-2.5 rounded-lg bg-[#242424] text-white text-[11px] font-medium hover:bg-black cursor-pointer disabled:opacity-50"
                                  >
                                    {savingPriceId === p.id ? '...' : 'Save'}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-[#242424]">
                              {p.stockCount ?? 0}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-[#5C534E]">
                              {isLive ? 'Published' : 'Draft'}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditProduct(p)}
                                  className="p-2 rounded-lg text-[#5C534E] hover:text-[#242424] hover:bg-[#F3E7E4]/60 cursor-pointer"
                                  title="Edit product & images"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(p)}
                                  className="p-2 rounded-lg text-[#8C807A] hover:text-[#8D322D] hover:bg-[#FDF2F2] cursor-pointer"
                                  title="Delete product"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-[#7D736D]">
                            No products match your filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: CATEGORIES */}
          {section === 'categories' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif-luxury text-3xl font-medium text-[#242424] tracking-tight">
                  Product Categories
                </h1>
                <p className="text-xs text-[#6E6560] mt-1">
                  Add, rename, or remove subcategories across storefront departments.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-[#EAE1DB] w-fit max-w-full overflow-x-auto no-scrollbar">
                {departments.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setActiveCatDept(d.id);
                      setRenamingOld(null);
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      activeCatDept === d.id
                        ? 'bg-[#F3E7E4] text-[#242424] font-semibold'
                        : 'text-[#6E6560] hover:text-[#242424]'
                    }`}
                  >
                    {d.name} ({d.subcategories.length})
                  </button>
                ))}
              </div>

              {currentDeptObj && (
                <div className="bg-white rounded-2xl border border-[#EAE1DB] p-6 space-y-5">
                  <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder={`Add new subcategory to ${currentDeptObj.name}...`}
                      className="flex-1 h-10 px-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] placeholder:text-[#9E938D] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                    />
                    <button
                      type="submit"
                      disabled={savingCategories || !newCategoryName.trim()}
                      className="h-10 px-4 rounded-xl bg-[#242424] hover:bg-[#141414] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D9A6A0]" />
                      <span>Add Category</span>
                    </button>
                  </form>

                  <div className="divide-y divide-[#F0E8E2]">
                    {currentDeptObj.subcategories.map((subcat) => {
                      const count = staffProducts.filter(
                        (p) => p.departments?.includes(currentDeptObj.id) && p.subcategories?.includes(subcat)
                      ).length;

                      return (
                        <div key={subcat} className="py-3 flex items-center justify-between gap-3">
                          {renamingOld === subcat ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={renamingValue}
                                onChange={(e) => setRenamingValue(e.target.value)}
                                className="flex-1 h-9 px-3 rounded-lg bg-[#FAF8F6] border border-[#B8867C] text-xs text-[#242424] focus:outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameCategory(subcat)}
                                className="h-9 px-3 rounded-lg bg-[#242424] text-white text-xs font-medium cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setRenamingOld(null)}
                                className="h-9 px-2.5 rounded-lg text-xs text-[#6E6560] hover:text-[#242424] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <div>
                                <p className="text-xs font-medium text-[#242424]">{subcat}</p>
                                <p className="text-[11px] text-[#8C807A] font-mono tabular-nums">
                                  {count} linked product{count === 1 ? '' : 's'}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRenamingOld(subcat);
                                    setRenamingValue(subcat);
                                  }}
                                  className="p-2 rounded-lg text-[#5C534E] hover:text-[#242424] hover:bg-[#FAF8F6] cursor-pointer"
                                  title="Rename category"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCategory(subcat)}
                                  className="p-2 rounded-lg text-[#8C807A] hover:text-[#8D322D] hover:bg-[#FDF2F2] cursor-pointer"
                                  title="Remove category"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                    {currentDeptObj.subcategories.length === 0 && (
                      <p className="py-8 text-center text-xs text-[#7D736D]">
                        No subcategories in {currentDeptObj.name} yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: ORDERS */}
          {section === 'orders' && (
            <div className="space-y-5">
              <div>
                <h1 className="font-serif-luxury text-3xl font-medium text-[#242424] tracking-tight">
                  Customer Orders
                </h1>
                <p className="text-xs text-[#6E6560] mt-1">
                  Review incoming orders and update fulfillment status or courier tracking numbers.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#EAE1DB] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-[#8C807A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderQuery}
                    onChange={(e) => setOrderQuery(e.target.value)}
                    placeholder="Search by order ID, customer name, or city..."
                    className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                  />
                </div>
                <div className="flex items-center gap-1 p-1 bg-[#FAF8F6] rounded-xl border border-[#EAE1DB] overflow-x-auto no-scrollbar">
                  {['All', ...ORDER_STATUSES].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        orderStatusFilter === st
                          ? 'bg-white text-[#242424] shadow-2xs'
                          : 'text-[#6E6560] hover:text-[#242424]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#EAE1DB] p-12 text-center">
                  <p className="text-sm font-medium text-[#242424]">No orders found</p>
                  <p className="text-xs text-[#7D736D] mt-1">
                    Customer orders placed through the storefront will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => {
                    const draft = orderDrafts[order.id] || {
                      status: order.status,
                      trackingNumber: order.trackingNumber || '',
                    };
                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl border border-[#EAE1DB] p-5 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0E8E2]">
                          <div>
                            <p className="font-mono text-xs font-semibold text-[#242424]">{order.id}</p>
                            <p className="text-[11px] text-[#7D736D] mt-0.5">
                              {order.createdAt} · {order.shippingAddress?.fullName || 'Customer'} ·{' '}
                              {order.shippingAddress?.city || 'India'}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-mono tabular-nums text-sm font-semibold text-[#242424]">
                              ₹{order.total}
                            </p>
                            <p className="text-[11px] text-[#7D736D]">
                              {order.paymentMethod} · {order.paymentStatus}
                            </p>
                          </div>
                        </div>

                        <div className="text-xs text-[#5C534E] space-y-1">
                          {(order.items || []).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2">
                              <span className="truncate">
                                {item.product?.name || 'Item'} {item.selectedVariant ? `(${item.selectedVariant})` : ''} ×{' '}
                                <span className="font-mono tabular-nums">{item.quantity}</span>
                              </span>
                              <span className="font-mono tabular-nums text-[#242424] shrink-0">
                                ₹{(item.unitPrice ?? item.product?.price ?? 0) * item.quantity}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3 border-t border-[#F0E8E2] flex flex-col sm:flex-row sm:items-center gap-2.5">
                          <select
                            aria-label={`Order status for ${order.id}`}
                            value={draft.status}
                            onChange={(e) =>
                              setOrderDrafts((prev) => ({
                                ...prev,
                                [order.id]: { ...draft, status: e.target.value as Order['status'] },
                              }))
                            }
                            className="h-9 px-3 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C]"
                          >
                            {ORDER_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={draft.trackingNumber}
                            onChange={(e) =>
                              setOrderDrafts((prev) => ({
                                ...prev,
                                [order.id]: { ...draft, trackingNumber: e.target.value },
                              }))
                            }
                            placeholder="Courier AWB / Tracking number"
                            className="flex-1 h-9 px-3 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs font-mono text-[#242424] placeholder:text-[#9E938D] focus:outline-hidden focus:border-[#B8867C]"
                          />

                          <button
                            type="button"
                            disabled={updatingOrderId === order.id}
                            onClick={() => handleUpdateOrderStatus(order)}
                            className="h-9 px-4 rounded-xl bg-[#242424] hover:bg-[#141414] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          >
                            <Check className="w-3.5 h-3.5 text-[#D9A6A0]" />
                            <span>{updatingOrderId === order.id ? 'Updating...' : 'Update Status'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: HOMEPAGE PROMOTIONAL BANNERS */}
          {section === 'banners' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif-luxury text-3xl font-medium text-[#242424] tracking-tight">
                  Homepage Promotional Banners
                </h1>
                <p className="text-xs text-[#6E6560] mt-1">
                  Update the announcement bar, hero promotional messaging, and Daily Edit banner live.
                </p>
              </div>

              {/* Live Preview Strip */}
              <div className="rounded-2xl overflow-hidden border border-[#EAE1DB] bg-white">
                <div className="bg-[#242424] text-[#FAF8F6] px-4 py-2 text-center text-xs">
                  <span>{bannerForm.announcementText || 'Announcement banner text'}</span>
                  {bannerForm.announcementSubtext && (
                    <span className="text-[#D9A6A0] ml-2">· {bannerForm.announcementSubtext}</span>
                  )}
                </div>
                <div className="p-6 bg-[#FAF8F6]">
                  <p className="text-[11px] text-[#9E6E65] font-medium">
                    {bannerForm.brandTagline || 'Your everyday. A little smarter.'}
                  </p>
                  <h2 className="font-serif-luxury text-2xl sm:text-3xl font-medium text-[#242424] mt-1">
                    {bannerForm.heroHeadline || 'Hero Headline Preview'}
                  </h2>
                  <p className="text-xs text-[#5C534E] mt-1.5 max-w-xl leading-relaxed">
                    {bannerForm.heroSubtitle || 'Hero promotional subtitle preview.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveBanners} className="bg-white rounded-2xl border border-[#EAE1DB] p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#3D3632] mb-1.5">
                      Top Announcement Bar Text
                    </label>
                    <input
                      type="text"
                      value={bannerForm.announcementText}
                      onChange={(e) => setBannerForm({ ...bannerForm, announcementText: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#3D3632] mb-1.5">
                      Announcement Offer Link Copy
                    </label>
                    <input
                      type="text"
                      value={bannerForm.announcementSubtext}
                      onChange={(e) => setBannerForm({ ...bannerForm, announcementSubtext: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#3D3632] mb-1.5">
                      Hero Kicker / Brand Tagline
                    </label>
                    <input
                      type="text"
                      value={bannerForm.brandTagline}
                      onChange={(e) => setBannerForm({ ...bannerForm, brandTagline: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#3D3632] mb-1.5">
                      Hero Promotional Headline
                    </label>
                    <input
                      type="text"
                      value={bannerForm.heroHeadline}
                      onChange={(e) => setBannerForm({ ...bannerForm, heroHeadline: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3D3632] mb-1.5">
                    Hero Promotional Subtitle
                  </label>
                  <textarea
                    rows={2}
                    value={bannerForm.heroSubtitle}
                    onChange={(e) => setBannerForm({ ...bannerForm, heroSubtitle: e.target.value })}
                    className="w-full p-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#F0E8E2]">
                  <div>
                    <label className="block text-xs font-medium text-[#3D3632] mb-1.5">
                      Daily Edit Section Title
                    </label>
                    <input
                      type="text"
                      value={bannerForm.dailyEditTitle}
                      onChange={(e) => setBannerForm({ ...bannerForm, dailyEditTitle: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#3D3632] mb-1.5">
                      Daily Edit Section Subtitle
                    </label>
                    <input
                      type="text"
                      value={bannerForm.dailyEditSubtitle}
                      onChange={(e) => setBannerForm({ ...bannerForm, dailyEditSubtitle: e.target.value })}
                      className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingBanners}
                    className="h-10 px-5 rounded-xl bg-[#242424] hover:bg-[#141414] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer disabled:opacity-55"
                  >
                    {savingBanners && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9A6A0]" />}
                    <span>Save Promotional Banners</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECTION 6: REELS & VIDEOS */}
          {section === 'reels' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="font-serif-luxury text-3xl font-medium text-[#242424] tracking-tight">
                    Promotional Reels & Videos
                  </h1>
                  <p className="text-xs text-[#6E6560] mt-1">
                    Upload vertical product videos, link them to catalogue items, and publish to the storefront reel shelf.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateReel}
                  className="px-4 py-2.5 rounded-xl bg-[#242424] hover:bg-[#141414] text-[#FAF8F6] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D9A6A0]" />
                  <span>Add Promotional Reel</span>
                </button>
              </div>

              {staffReels.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#EAE1DB] p-12 text-center space-y-3">
                  <p className="text-sm font-medium text-[#242424]">No promotional reels uploaded yet</p>
                  <p className="text-xs text-[#7D736D] max-w-sm mx-auto">
                    Upload MP4, WebM, or MOV vertical clips to showcase Everyday Editz products in action.
                  </p>
                  <button
                    type="button"
                    onClick={openCreateReel}
                    className="px-4 py-2 rounded-xl bg-[#242424] text-white text-xs font-medium cursor-pointer"
                  >
                    Upload First Reel
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staffReels.map((reel) => {
                    const linked = staffProducts.find((p) => p.id === reel.product_id);
                    return (
                      <div
                        key={reel.id}
                        className="bg-white rounded-2xl border border-[#EAE1DB] overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <div className="aspect-[16/10] bg-[#FAF8F6] relative overflow-hidden border-b border-[#EAE1DB]">
                            {reel.thumbnail_url ? (
                              <img
                                src={reel.thumbnail_url}
                                alt={reel.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <video
                                src={reel.video_url}
                                muted
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="p-4 space-y-1.5">
                            <p className="text-[11px] text-[#9E6E65]">
                              {reel.status} · {reel.category}
                            </p>
                            <h3 className="text-sm font-semibold text-[#242424] truncate">{reel.title}</h3>
                            {reel.description && (
                              <p className="text-xs text-[#6E6560] line-clamp-2">{reel.description}</p>
                            )}
                            {linked && (
                              <p className="text-[11px] text-[#7D736D] truncate pt-1">
                                Linked: {linked.name} (₹{linked.price})
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="px-4 py-3 border-t border-[#F0E8E2] flex items-center justify-between gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleToggleReelPublish(reel)}
                            className="inline-flex items-center gap-1 text-[#5C534E] hover:text-[#242424] font-medium cursor-pointer"
                          >
                            {reel.status === 'Published' ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Unpublish</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5 text-[#9E6E65]" />
                                <span>Publish</span>
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-1">
                            <a
                              href={reel.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-[#7D736D] hover:text-[#242424]"
                              title="Open video file"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => openEditReel(reel)}
                              className="p-1.5 rounded-lg text-[#5C534E] hover:text-[#242424] hover:bg-[#FAF8F6] cursor-pointer"
                              title="Edit reel"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReel(reel)}
                              className="p-1.5 rounded-lg text-[#8C807A] hover:text-[#8D322D] hover:bg-[#FDF2F2] cursor-pointer"
                              title="Delete reel"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* SLIDE-OVER PRODUCT EDITOR (Add / Edit Product + Images) */}
      {isProductEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex justify-end">
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto border-l border-[#EAE1DB] flex flex-col">
            <div className="px-6 py-4 border-b border-[#EAE1DB] flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-serif-luxury text-2xl font-medium text-[#242424]">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <p className="text-[11px] text-[#7D736D]">
                  Changes sync directly to the Everyday Editz storefront.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductEditorOpen(false)}
                className="p-2 rounded-lg text-[#6E6560] hover:text-[#242424] hover:bg-[#FAF8F6] cursor-pointer"
                aria-label="Close editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-5 flex-1">
              <div>
                <label className="block text-xs font-medium text-[#3D3632] mb-1.5">Product Name *</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Velvet Travel Jewellery Organiser"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3D3632] mb-1.5">Short Tagline</label>
                <input
                  type="text"
                  value={prodTagline}
                  onChange={(e) => setProdTagline(e.target.value)}
                  placeholder="Concise everyday benefit..."
                  className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#3D3632] mb-1.5">Price (₹) *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs font-mono tabular-nums text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D3632] mb-1.5">MRP (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={prodOriginalPrice}
                    onChange={(e) => setProdOriginalPrice(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs font-mono tabular-nums text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D3632] mb-1.5">Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs font-mono tabular-nums text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                  />
                </div>
              </div>

              {/* Departments */}
              <div>
                <span className="block text-xs font-medium text-[#3D3632] mb-2">Departments</span>
                <div className="grid grid-cols-2 gap-2">
                  {DEPARTMENTS_META.map((d) => {
                    const checked = prodDepts.includes(d.id);
                    return (
                      <label
                        key={d.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'bg-[#F3E7E4]/60 border-[#D9A6A0] text-[#242424] font-medium'
                            : 'bg-[#FAF8F6] border-[#EAE1DB] text-[#5C534E]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setProdDepts((prev) =>
                              prev.includes(d.id)
                                ? prev.length > 1
                                  ? prev.filter((x) => x !== d.id)
                                  : prev
                                : [...prev, d.id]
                            );
                          }}
                          className="accent-[#9E6E65]"
                        />
                        <span>{d.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Subcategories */}
              {availableSubcatsForEditor.length > 0 && (
                <div>
                  <span className="block text-xs font-medium text-[#3D3632] mb-2">Categories</span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSubcatsForEditor.map((sc) => {
                      const active = prodSubcats.includes(sc);
                      return (
                        <button
                          key={sc}
                          type="button"
                          onClick={() =>
                            setProdSubcats((prev) =>
                              prev.includes(sc) ? prev.filter((x) => x !== sc) : [...prev, sc]
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#242424] text-white border-[#242424]'
                              : 'bg-[#FAF8F6] text-[#5C534E] border-[#EAE1DB] hover:border-[#B8867C]'
                          }`}
                        >
                          {sc}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Visibility Toggles */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs text-[#242424] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodPublished}
                    onChange={(e) => setProdPublished(e.target.checked)}
                    className="accent-[#9E6E65]"
                  />
                  <span>Published on storefront</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[#242424] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodFeatured}
                    onChange={(e) => setProdFeatured(e.target.checked)}
                    className="accent-[#9E6E65]"
                  />
                  <span>Featured item</span>
                </label>
              </div>

              {/* Product Images Manager */}
              <div className="pt-4 border-t border-[#EFE7E1] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#242424]">
                    Product Images ({prodImages.length})
                  </span>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F3E7E4] text-[#242424] text-[11px] font-medium hover:bg-[#ebd7d2] cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#9E6E65]" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage}
                      onChange={handleUploadProductImage}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Or paste image URL..."
                    className="flex-1 h-9 px-3 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newImageUrl.trim()) return;
                      setProdImages((prev) => [...prev, newImageUrl.trim()]);
                      setNewImageUrl('');
                    }}
                    className="h-9 px-3 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] hover:border-[#242424] text-xs font-medium cursor-pointer"
                  >
                    Add URL
                  </button>
                </div>

                {prodImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2.5">
                    {prodImages.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="relative rounded-xl overflow-hidden border border-[#EAE1DB] bg-[#FAF8F6] aspect-square group"
                      >
                        <img
                          src={url}
                          alt={`Product photo ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && (
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#242424]/85 text-white text-[9px] font-medium">
                            Cover
                          </span>
                        )}
                        <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setProdImages((prev) => [url, ...prev.filter((_, i) => i !== idx)])
                              }
                              className="p-1 rounded bg-white/90 text-[#242424] hover:bg-white cursor-pointer"
                              title="Set as cover image"
                            >
                              <Star className="w-3 h-3 text-[#9E6E65]" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setProdImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 rounded bg-white/90 text-[#8D322D] hover:bg-white ml-auto cursor-pointer"
                            title="Remove image"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#EFE7E1] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsProductEditorOpen(false)}
                  className="h-10 px-4 rounded-xl border border-[#E6DDD7] text-xs font-medium text-[#5C534E] hover:text-[#242424] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="h-10 px-5 rounded-xl bg-[#242424] hover:bg-[#141414] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer disabled:opacity-55"
                >
                  {savingProduct && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9A6A0]" />}
                  <span>{editingProduct ? 'Save Changes' : 'Create Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SLIDE-OVER REEL EDITOR */}
      {isReelEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex justify-end">
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto border-l border-[#EAE1DB] flex flex-col">
            <div className="px-6 py-4 border-b border-[#EAE1DB] flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-serif-luxury text-2xl font-medium text-[#242424]">
                  {editingReel ? 'Edit Promotional Reel' : 'New Promotional Reel'}
                </h2>
                <p className="text-[11px] text-[#7D736D]">MP4, WebM, or MOV vertical clips up to 100MB.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsReelEditorOpen(false)}
                className="p-2 rounded-lg text-[#6E6560] hover:text-[#242424] hover:bg-[#FAF8F6] cursor-pointer"
                aria-label="Close reel editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReel} className="p-6 space-y-4 flex-1">
              <div>
                <label className="block text-xs font-medium text-[#3D3632] mb-1.5">Reel Title *</label>
                <input
                  type="text"
                  required
                  value={reelTitle}
                  onChange={(e) => setReelTitle(e.target.value)}
                  placeholder="e.g. Travel Pouch Packing Hack"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3D3632] mb-1.5">Caption / Description</label>
                <textarea
                  rows={2}
                  value={reelDescription}
                  onChange={(e) => setReelDescription(e.target.value)}
                  placeholder="Short caption displayed over the video..."
                  className="w-full p-3 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#3D3632]">Video File or URL *</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F3E7E4] text-[#242424] text-[11px] font-medium cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#9E6E65]" />
                    <span>{uploadingReelVideo ? 'Uploading...' : 'Upload Video'}</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      disabled={uploadingReelVideo}
                      onChange={handleUploadReelVideo}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={reelVideoUrl}
                  onChange={(e) => setReelVideoUrl(e.target.value)}
                  placeholder="/uploads/reels/... or https://..."
                  className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs font-mono text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#3D3632]">Thumbnail Poster (Optional)</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF8F6] border border-[#EAE1DB] text-[#242424] text-[11px] font-medium cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#9E6E65]" />
                    <span>{uploadingReelThumb ? 'Uploading...' : 'Upload Poster'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingReelThumb}
                      onChange={handleUploadReelThumb}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="text"
                  value={reelThumbUrl}
                  onChange={(e) => setReelThumbUrl(e.target.value)}
                  placeholder="Optional thumbnail image URL"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs font-mono text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#3D3632] mb-1.5">Linked Product</label>
                  <select
                    value={reelProductId}
                    onChange={(e) => setReelProductId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C]"
                  >
                    <option value="">None</option>
                    {staffProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3D3632] mb-1.5">Publish Status</label>
                  <select
                    value={reelStatus}
                    onChange={(e) => setReelStatus(e.target.value as 'Published' | 'Draft' | 'Unpublished')}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C]"
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Unpublished">Unpublished</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#3D3632] mb-1.5">Category</label>
                  <input
                    type="text"
                    value={reelCategory}
                    onChange={(e) => setReelCategory(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D3632] mb-1.5">CTA Button Label</label>
                  <input
                    type="text"
                    value={reelCtaLabel}
                    onChange={(e) => setReelCtaLabel(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#FAF8F6] border border-[#E6DDD7] text-xs text-[#242424] focus:outline-hidden focus:border-[#B8867C]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#EFE7E1] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsReelEditorOpen(false)}
                  className="h-10 px-4 rounded-xl border border-[#E6DDD7] text-xs font-medium text-[#5C534E] hover:text-[#242424] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingReel}
                  className="h-10 px-5 rounded-xl bg-[#242424] hover:bg-[#141414] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer disabled:opacity-55"
                >
                  {savingReel && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9A6A0]" />}
                  <span>{editingReel ? 'Save Reel' : 'Publish Reel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
