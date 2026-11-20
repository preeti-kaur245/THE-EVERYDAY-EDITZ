import React, { useState, useEffect, useMemo } from 'react';
import { useStore, AccountTab } from '../context/StoreContext';
import { Address, Order } from '../types';
import { PINCODE_DIRECTORY } from '../data/mockData';
import {
  User,
  Package,
  Heart,
  MapPin,
  Shield,
  LogOut,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Truck,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  ShoppingBag,
} from 'lucide-react';

export const CustomerAccountDashboard: React.FC = () => {
  const {
    currentCustomer,
    isCustomerSessionChecked,
    activeAccountTab,
    setActiveAccountTab,
    navigateToAuth,
    returnToHome,
    logoutCustomer,
    updateCustomerProfile,
    saveCustomerAddresses,
    changeCustomerPassword,
    fetchCustomerOrders,
    orders,
    products,
    wishlist,
    toggleWishlist,
    openProductModal,
    addToCart,
    rewardsBalance,
    setIsTrackingOpen,
    setTrackingLookupId,
    setIsReturnClaimOpen,
    setReturnClaimPrefillOrder,
    showToast,
  } = useStore();

  // Redirect unauthenticated user to /login with intended destination
  useEffect(() => {
    if (isCustomerSessionChecked && !currentCustomer) {
      navigateToAuth('login', undefined, { type: 'account', tab: activeAccountTab });
    }
  }, [isCustomerSessionChecked, currentCustomer]);

  // Server-backed customer orders
  const [serverOrders, setServerOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (currentCustomer && activeAccountTab === 'orders') {
      setLoadingOrders(true);
      fetchCustomerOrders()
        .then((list) => setServerOrders(list))
        .finally(() => setLoadingOrders(false));
    }
  }, [currentCustomer, activeAccountTab]);

  // Profile form state
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [profileState, setProfileState] = useState('');
  const [profilePincode, setProfilePincode] = useState('');
  const [profileSegment, setProfileSegment] = useState<'Women' | 'Men' | 'Kids' | 'Household'>('Women');
  const [profileMarketing, setProfileMarketing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (currentCustomer) {
      setProfileName(currentCustomer.fullName || `${currentCustomer.firstName} ${currentCustomer.lastName}`.trim());
      setProfilePhone(currentCustomer.phoneNumber || '');
      setProfileCity(currentCustomer.city || '');
      setProfileState(currentCustomer.state || '');
      setProfilePincode(currentCustomer.pincode || '');
      setProfileSegment(currentCustomer.customerSegment || 'Women');
      setProfileMarketing(Boolean(currentCustomer.marketingConsent));
    }
  }, [currentCustomer]);

  // Address form state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<Address>({
    label: 'Home',
    fullName: '',
    phoneNumber: '',
    email: '',
    flatHouseNo: '',
    streetArea: '',
    landmark: '',
    pincode: '',
    city: '',
    state: '',
  });
  const [savingAddress, setSavingAddress] = useState(false);

  // Change password state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const mergedOrders = useMemo(() => {
    if (!currentCustomer) return [];
    const emailLower = (currentCustomer.email || '').toLowerCase();
    const localMatching = orders.filter(
      (o) =>
        o.customerId === currentCustomer.id ||
        (emailLower && o.shippingAddress?.email?.toLowerCase() === emailLower)
    );
    const byId = new Map<string, Order>();
    [...serverOrders, ...localMatching].forEach((o) => byId.set(o.id, o));
    return Array.from(byId.values());
  }, [serverOrders, orders, currentCustomer]);

  const wishlistProducts = useMemo(
    () => products.filter((p) => wishlist.includes(p.id)),
    [products, wishlist]
  );

  if (!isCustomerSessionChecked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#FAF8F6]">
        <Loader2 className="w-6 h-6 animate-spin text-[#B8867C]" />
      </div>
    );
  }

  if (!currentCustomer) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileMessage('');
    if (profileName.trim().length < 2) {
      setProfileError('Full name must be at least 2 characters.');
      return;
    }
    setSavingProfile(true);
    const res = await updateCustomerProfile({
      fullName: profileName.trim(),
      phoneNumber: profilePhone.trim(),
      city: profileCity.trim(),
      state: profileState.trim(),
      pincode: profilePincode.trim(),
      customerSegment: profileSegment,
      marketingConsent: profileMarketing,
    });
    setSavingProfile(false);
    if (!res.success) {
      setProfileError(res.error || 'Could not update profile.');
      return;
    }
    setProfileMessage('Your profile changes have been saved.');
  };

  const handleAddressPincode = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    const match = cleaned.length === 6 ? PINCODE_DIRECTORY[cleaned] : undefined;
    setNewAddress((prev) => ({
      ...prev,
      pincode: cleaned,
      city: match ? match.city : prev.city,
      state: match ? match.state : prev.state,
    }));
  };

  const handleAddAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.fullName.trim() || !newAddress.flatHouseNo.trim() || newAddress.pincode.length !== 6) {
      showToast('Please complete name, address, and 6-digit PIN code.', 'warning');
      return;
    }
    setSavingAddress(true);
    const existing = currentCustomer.savedAddresses || [];
    const entry: Address = {
      ...newAddress,
      id: `addr-${Date.now().toString(36)}`,
      email: newAddress.email || currentCustomer.email,
      phoneNumber: newAddress.phoneNumber || currentCustomer.phoneNumber,
      isDefault: existing.length === 0,
    };
    const res = await saveCustomerAddresses([...existing, entry]);
    setSavingAddress(false);
    if (res.success) {
      setShowAddAddress(false);
      setNewAddress({
        label: 'Home',
        fullName: currentCustomer.fullName || '',
        phoneNumber: currentCustomer.phoneNumber || '',
        email: currentCustomer.email || '',
        flatHouseNo: '',
        streetArea: '',
        landmark: '',
        pincode: '',
        city: '',
        state: '',
      });
      showToast('Delivery address saved', 'success');
    } else {
      showToast(res.error || 'Could not save address', 'warning');
    }
  };

  const handleDeleteAddress = async (idx: number) => {
    const updated = (currentCustomer.savedAddresses || []).filter((_, i) => i !== idx);
    const res = await saveCustomerAddresses(updated);
    if (res.success) showToast('Address removed', 'info');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');
    if (newPwd.length < 8) {
      setPwdError('New password must be at least 8 characters long.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('New passwords do not match.');
      return;
    }
    setPwdSaving(true);
    const res = await changeCustomerPassword(currentPwd, newPwd, confirmPwd);
    setPwdSaving(false);
    if (!res.success) {
      setPwdError(res.error || 'Could not update password.');
      return;
    }
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setPwdSuccess('Your password has been updated securely.');
  };

  const navItems: Array<{ id: AccountTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }> = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'orders', label: 'Orders', icon: Package, count: mergedOrders.length },
    { id: 'wishlist', label: 'Saved Finds', icon: Heart, count: wishlistProducts.length },
    { id: 'addresses', label: 'Addresses', icon: MapPin, count: currentCustomer.savedAddresses?.length || 0 },
    { id: 'security', label: 'Password & Security', icon: Shield },
  ];

  const initials = (currentCustomer.firstName || currentCustomer.fullName || 'M').charAt(0).toUpperCase();

  return (
    <section className="min-h-[75vh] bg-[#FAF8F6] py-10 sm:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Account Page Header */}
        <div className="pb-8 mb-8 border-b border-[#E8DFD9] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#F3E7E4] border border-[#DFC2BA] text-[#242424] flex items-center justify-center font-serif-luxury text-2xl font-semibold shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#9E6E65] font-medium">
                Member Account
              </p>
              <h1 className="font-serif-luxury text-3xl sm:text-4xl font-medium text-[#242424] leading-tight">
                {currentCustomer.fullName || `${currentCustomer.firstName} ${currentCustomer.lastName}`.trim()}
              </h1>
              <p className="text-xs text-[#6E6560] mt-0.5">{currentCustomer.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white border border-[#E8DFD9] text-xs">
              <span className="text-[#7A716B]">Editz Rewards · </span>
              <span className="font-semibold text-[#242424] tabular-nums">{rewardsBalance} pts</span>
            </div>
            <button
              type="button"
              onClick={() => logoutCustomer()}
              className="px-4 py-2 rounded-xl border border-[#E4D9D2] bg-white hover:bg-[#F5EFEA] text-xs font-medium text-[#242424] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#9E6E65]" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Split Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3">
            <nav aria-label="Account sections" className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeAccountTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveAccountTab(item.id)}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[#242424] text-[#FAF8F6]'
                        : 'bg-white border border-[#EBE2DC] text-[#4E4641] hover:border-[#D9A6A0] hover:text-[#242424]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${active ? 'text-[#D9A6A0]' : 'text-[#9E6E65]'}`} />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && item.count > 0 && (
                      <span className={`text-[11px] tabular-nums ${active ? 'text-white/75' : 'text-[#847A74]'}`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Tab Panel */}
          <div className="lg:col-span-9">
            {/* PROFILE TAB */}
            {activeAccountTab === 'profile' && (
              <div className="bg-white rounded-2xl border border-[#EAE0DA] p-6 sm:p-8">
                <div className="flex items-center justify-between pb-5 mb-6 border-b border-[#EFE7E1]">
                  <div>
                    <h2 className="font-serif-luxury text-2xl font-medium text-[#242424]">Personal Details</h2>
                    <p className="text-xs text-[#6E6560] mt-0.5">Keep your contact and delivery preferences up to date.</p>
                  </div>
                </div>

                {profileError && (
                  <div className="mb-5 px-4 py-3 rounded-xl bg-[#FDF2F2] border border-[#EBCAC8] text-xs text-[#8D322D] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}
                {profileMessage && (
                  <div className="mb-5 px-4 py-3 rounded-xl bg-[#F1F5F1] border border-[#CFE0D1] text-xs text-[#364F3A] flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{profileMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="acc-name" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                        Full Name
                      </label>
                      <input
                        id="acc-name"
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full h-11 px-3.5 bg-[#FAF8F6] rounded-xl border border-[#E6DDD7] text-sm text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="acc-email" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                        Email Address
                      </label>
                      <input
                        id="acc-email"
                        type="email"
                        disabled
                        value={currentCustomer.email}
                        className="w-full h-11 px-3.5 bg-[#F4EFEA] rounded-xl border border-[#EAE1DA] text-sm text-[#7A716B] cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label htmlFor="acc-phone" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                        Mobile Number (+91)
                      </label>
                      <input
                        id="acc-phone"
                        type="tel"
                        maxLength={10}
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit mobile number"
                        className="w-full h-11 px-3.5 bg-[#FAF8F6] rounded-xl border border-[#E6DDD7] text-sm font-mono text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="acc-segment" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                        Preferred Curation
                      </label>
                      <select
                        id="acc-segment"
                        value={profileSegment}
                        onChange={(e) => setProfileSegment(e.target.value as any)}
                        className="w-full h-11 px-3.5 bg-[#FAF8F6] rounded-xl border border-[#E6DDD7] text-sm text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                      >
                        <option value="Women">Women</option>
                        <option value="Men">Men</option>
                        <option value="Kids">Kids</option>
                        <option value="Household">Home &amp; Lifestyle</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="acc-pincode" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                        PIN Code
                      </label>
                      <input
                        id="acc-pincode"
                        type="text"
                        maxLength={6}
                        value={profilePincode}
                        onChange={(e) => {
                          const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setProfilePincode(pin);
                          if (pin.length === 6 && PINCODE_DIRECTORY[pin]) {
                            setProfileCity(PINCODE_DIRECTORY[pin].city);
                            setProfileState(PINCODE_DIRECTORY[pin].state);
                          }
                        }}
                        placeholder="6-digit PIN"
                        className="w-full h-11 px-3.5 bg-[#FAF8F6] rounded-xl border border-[#E6DDD7] text-sm font-mono text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="acc-city" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                        City
                      </label>
                      <input
                        id="acc-city"
                        type="text"
                        value={profileCity}
                        onChange={(e) => setProfileCity(e.target.value)}
                        className="w-full h-11 px-3.5 bg-[#FAF8F6] rounded-xl border border-[#E6DDD7] text-sm text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="acc-state" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                        State
                      </label>
                      <input
                        id="acc-state"
                        type="text"
                        value={profileState}
                        onChange={(e) => setProfileState(e.target.value)}
                        className="w-full h-11 px-3.5 bg-[#FAF8F6] rounded-xl border border-[#E6DDD7] text-sm text-[#242424] focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={profileMarketing}
                      onChange={(e) => setProfileMarketing(e.target.checked)}
                      className="w-4 h-4 rounded border-[#CFC4BC] accent-[#242424]"
                    />
                    <span className="text-xs text-[#5E544F]">Receive curated product launches and Sunday Dispatch offers</span>
                  </label>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 h-11 rounded-xl bg-[#242424] hover:bg-[#141414] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-55"
                    >
                      {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9A6A0]" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ORDERS TAB */}
            {activeAccountTab === 'orders' && (
              <div className="bg-white rounded-2xl border border-[#EAE0DA] p-6 sm:p-8 space-y-5">
                <div className="flex items-center justify-between pb-5 border-b border-[#EFE7E1]">
                  <div>
                    <h2 className="font-serif-luxury text-2xl font-medium text-[#242424]">Order History</h2>
                    <p className="text-xs text-[#6E6560] mt-0.5">Track your prepaid shipments or submit a 7-day replacement request.</p>
                  </div>
                </div>

                {loadingOrders ? (
                  <div className="py-12 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-[#B8867C]" />
                  </div>
                ) : mergedOrders.length === 0 ? (
                  <div className="py-14 text-center space-y-3">
                    <Package className="w-10 h-10 text-[#CFC2BA] mx-auto" />
                    <p className="text-sm font-medium text-[#242424]">You have no orders yet</p>
                    <p className="text-xs text-[#7A716B] max-w-xs mx-auto">
                      Once you place a prepaid order, your Delhivery tracking and invoice details will appear here.
                    </p>
                    <button
                      type="button"
                      onClick={returnToHome}
                      className="mt-2 px-5 py-2.5 rounded-xl bg-[#242424] text-white text-xs font-medium hover:bg-[#141414] cursor-pointer"
                    >
                      Explore Curations
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mergedOrders.map((ord) => (
                      <div key={ord.id} className="p-5 rounded-2xl bg-[#FAF8F6] border border-[#EAE0DA] space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EAE0DA]">
                          <div>
                            <span className="font-mono text-xs font-bold text-[#242424]">{ord.id}</span>
                            <span className="text-xs text-[#7A716B] ml-2">{ord.createdAt}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-[#465E4A] font-semibold">{ord.status}</span>
                            <span className="font-mono font-bold text-[#242424]">₹{ord.total}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-[#4F4641]">
                          {ord.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="truncate pr-3">
                                {item.product?.name} {item.selectedVariant ? `(${item.selectedVariant})` : ''} × {item.quantity}
                              </span>
                              <span className="font-mono shrink-0">₹{(item.unitPrice ?? item.product?.price ?? 0) * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-[#6E6560] flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-[#9E6E65]" />
                            <span>AWB: <strong className="font-mono text-[#242424]">{ord.trackingNumber}</strong></span>
                          </span>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setTrackingLookupId(ord.id);
                                setIsTrackingOpen(true);
                              }}
                              className="font-medium text-[#242424] underline decoration-[#D9A6A0] underline-offset-4 hover:text-[#9E6E65] cursor-pointer"
                            >
                              Track Parcel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReturnClaimPrefillOrder(ord.id);
                                setIsReturnClaimOpen(true);
                              }}
                              className="text-[#6E6560] hover:text-[#242424] cursor-pointer"
                            >
                              7-Day Claim
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WISHLIST TAB */}
            {activeAccountTab === 'wishlist' && (
              <div className="bg-white rounded-2xl border border-[#EAE0DA] p-6 sm:p-8 space-y-6">
                <div className="pb-5 border-b border-[#EFE7E1]">
                  <h2 className="font-serif-luxury text-2xl font-medium text-[#242424]">Saved Finds</h2>
                  <p className="text-xs text-[#6E6560] mt-0.5">Items you have saved for later.</p>
                </div>

                {wishlistProducts.length === 0 ? (
                  <div className="py-14 text-center space-y-3">
                    <Heart className="w-10 h-10 text-[#DFC2BA] mx-auto" />
                    <p className="text-sm font-medium text-[#242424]">Your wishlist is empty</p>
                    <button
                      type="button"
                      onClick={returnToHome}
                      className="px-5 py-2.5 rounded-xl bg-[#242424] text-white text-xs font-medium hover:bg-[#141414] cursor-pointer"
                    >
                      Discover Essentials
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {wishlistProducts.map((prod) => (
                      <div key={prod.id} className="p-4 rounded-2xl bg-[#FAF8F6] border border-[#EAE0DA] flex gap-4 items-center">
                        <img
                          src={prod.primaryImage || prod.images?.[0]}
                          alt={prod.name}
                          onClick={() => openProductModal(prod)}
                          className="w-18 h-18 rounded-xl object-cover bg-white border border-[#EAE0DA] cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h3
                            onClick={() => openProductModal(prod)}
                            className="text-sm font-medium text-[#242424] truncate cursor-pointer hover:underline"
                          >
                            {prod.name}
                          </h3>
                          <div className="font-mono text-sm font-semibold text-[#242424] mt-0.5">₹{prod.price}</div>
                          <div className="flex items-center gap-2 mt-2.5">
                            <button
                              type="button"
                              onClick={() => addToCart(prod, 1)}
                              className="px-3 py-1.5 rounded-lg bg-[#242424] text-white text-[11px] font-medium hover:bg-[#141414] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <ShoppingBag className="w-3 h-3 text-[#D9A6A0]" />
                              <span>Move to Bag</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleWishlist(prod.id)}
                              className="text-[11px] text-[#7A716B] hover:text-[#9F3D38] cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ADDRESSES TAB */}
            {activeAccountTab === 'addresses' && (
              <div className="bg-white rounded-2xl border border-[#EAE0DA] p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between pb-5 border-b border-[#EFE7E1]">
                  <div>
                    <h2 className="font-serif-luxury text-2xl font-medium text-[#242424]">Saved Addresses</h2>
                    <p className="text-xs text-[#6E6560] mt-0.5">Pre-fill shipping details automatically during checkout.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewAddress({
                        label: 'Home',
                        fullName: currentCustomer.fullName || '',
                        phoneNumber: currentCustomer.phoneNumber || '',
                        email: currentCustomer.email || '',
                        flatHouseNo: '',
                        streetArea: '',
                        landmark: '',
                        pincode: '',
                        city: '',
                        state: '',
                      });
                      setShowAddAddress((v) => !v);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#242424] text-white text-xs font-medium hover:bg-[#141414] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#D9A6A0]" />
                    <span>{showAddAddress ? 'Cancel' : 'Add Address'}</span>
                  </button>
                </div>

                {showAddAddress && (
                  <form onSubmit={handleAddAddressSubmit} className="p-5 rounded-2xl bg-[#FAF8F6] border border-[#E6DDD7] space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Recipient Full Name"
                        value={newAddress.fullName}
                        onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                        className="h-11 px-3.5 bg-white rounded-xl border border-[#E6DDD7] text-xs"
                      />
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="10-Digit Mobile Number"
                        value={newAddress.phoneNumber}
                        onChange={(e) => setNewAddress({ ...newAddress, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        className="h-11 px-3.5 bg-white rounded-xl border border-[#E6DDD7] text-xs font-mono"
                      />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Flat / House No. / Apartment"
                      value={newAddress.flatHouseNo}
                      onChange={(e) => setNewAddress({ ...newAddress, flatHouseNo: e.target.value })}
                      className="w-full h-11 px-3.5 bg-white rounded-xl border border-[#E6DDD7] text-xs"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Street, Area, Locality"
                      value={newAddress.streetArea}
                      onChange={(e) => setNewAddress({ ...newAddress, streetArea: e.target.value })}
                      className="w-full h-11 px-3.5 bg-white rounded-xl border border-[#E6DDD7] text-xs"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="6-Digit PIN Code"
                        value={newAddress.pincode}
                        onChange={(e) => handleAddressPincode(e.target.value)}
                        className="h-11 px-3.5 bg-white rounded-xl border border-[#E6DDD7] text-xs font-mono"
                      />
                      <input
                        type="text"
                        required
                        placeholder="City"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        className="h-11 px-3.5 bg-white rounded-xl border border-[#E6DDD7] text-xs"
                      />
                      <input
                        type="text"
                        required
                        placeholder="State"
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                        className="h-11 px-3.5 bg-white rounded-xl border border-[#E6DDD7] text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingAddress}
                      className="px-5 h-10 rounded-xl bg-[#242424] text-white text-xs font-medium hover:bg-[#141414] cursor-pointer disabled:opacity-55"
                    >
                      {savingAddress ? 'Saving...' : 'Save Delivery Address'}
                    </button>
                  </form>
                )}

                {(!currentCustomer.savedAddresses || currentCustomer.savedAddresses.length === 0) ? (
                  <div className="py-12 text-center text-xs text-[#7A716B]">
                    No saved delivery addresses yet. Add one for faster checkout.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentCustomer.savedAddresses.map((addr, idx) => (
                      <div key={addr.id || idx} className="p-5 rounded-2xl bg-[#FAF8F6] border border-[#EAE0DA] flex flex-col justify-between gap-3">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#242424]">{addr.fullName}</span>
                            {addr.label && (
                              <span className="text-[10px] uppercase tracking-wider text-[#9E6E65] font-medium">
                                {addr.label}
                              </span>
                            )}
                          </div>
                          <p className="text-[#5E544F] leading-relaxed">
                            {addr.flatHouseNo}, {addr.streetArea}
                            <br />
                            {addr.city}, {addr.state} — {addr.pincode}
                          </p>
                          <p className="font-mono text-[#7A716B] pt-1">+91 {addr.phoneNumber}</p>
                        </div>
                        <div className="pt-2 border-t border-[#EAE0DA] flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(idx)}
                            className="text-xs text-[#8D322D] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECURITY / CHANGE PASSWORD TAB */}
            {activeAccountTab === 'security' && (
              <div className="bg-white rounded-2xl border border-[#EAE0DA] p-6 sm:p-8 space-y-6">
                <div className="pb-5 border-b border-[#EFE7E1]">
                  <h2 className="font-serif-luxury text-2xl font-medium text-[#242424]">Password &amp; Security</h2>
                  <p className="text-xs text-[#6E6560] mt-0.5">
                    Updating your password signs out older sessions on other devices automatically.
                  </p>
                </div>

                {pwdError && (
                  <div className="px-4 py-3 rounded-xl bg-[#FDF2F2] border border-[#EBCAC8] text-xs text-[#8D322D] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{pwdError}</span>
                  </div>
                )}
                {pwdSuccess && (
                  <div className="px-4 py-3 rounded-xl bg-[#F1F5F1] border border-[#CFE0D1] text-xs text-[#364F3A] flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{pwdSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                  {currentCustomer.hasPassword !== false && (
                    <div>
                      <label htmlFor="sec-current-pwd" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          id="sec-current-pwd"
                          type={showCurrentPwd ? 'text' : 'password'}
                          required
                          value={currentPwd}
                          onChange={(e) => setCurrentPwd(e.target.value)}
                          className="w-full h-11 px-3.5 pr-10 bg-[#FAF8F6] rounded-xl border border-[#E6DDD7] text-sm focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPwd((v) => !v)}
                          aria-label={showCurrentPwd ? 'Hide current password' : 'Show current password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7D736D] hover:text-[#242424] cursor-pointer"
                        >
                          {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="sec-new-pwd" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="sec-new-pwd"
                        type={showNewPwd ? 'text' : 'password'}
                        required
                        placeholder="8+ chars, upper, lower & number"
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        className="w-full h-11 px-3.5 pr-10 bg-[#FAF8F6] rounded-xl border border-[#E6DDD7] text-sm focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd((v) => !v)}
                        aria-label={showNewPwd ? 'Hide new password' : 'Show new password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7D736D] hover:text-[#242424] cursor-pointer"
                      >
                        {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="sec-confirm-pwd" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      id="sec-confirm-pwd"
                      type="password"
                      required
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      className="w-full h-11 px-3.5 bg-[#FAF8F6] rounded-xl border border-[#E6DDD7] text-sm focus:outline-hidden focus:border-[#B8867C] focus:bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pwdSaving}
                    className="px-6 h-11 rounded-xl bg-[#242424] hover:bg-[#141414] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer disabled:opacity-55"
                  >
                    {pwdSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9A6A0]" />}
                    <span>Update Password</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D9A6A0]" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
