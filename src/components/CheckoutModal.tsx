import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Address } from '../types';
import { PINCODE_DIRECTORY } from '../data/mockData';
import { 
  X, 
  ShieldCheck, 
  CreditCard, 
  Truck, 
  CheckCircle, 
  QrCode, 
  Lock, 
  ArrowRight,
  Smartphone,
  Building,
  DollarSign,
  Mail,
  UserPlus
} from 'lucide-react';

export const CheckoutModal: React.FC = () => {
  const { 
    isCheckoutOpen, 
    setIsCheckoutOpen, 
    cart, 
    cartSubtotal, 
    couponDiscount, 
    redeemedPointsDiscount, 
    shippingFee, 
    cartTotal,
    settings,
    createOrder,
    setIsTrackingOpen,
    setTrackingLookupId,
    showToast,
    currentCustomer,
    navigateToAuth,
    trackAbandonedCart,
    refreshProducts,
    hasCartStockIssue
  } = useStore();

  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [createdOrderSummary, setCreatedOrderSummary] = useState<any>(null);

  // Form details pre-populated if customer logged in (with saved addresses support)
  const defaultSavedAddr = currentCustomer?.savedAddresses?.[0];
  const [address, setAddress] = useState<Address>(() => ({
    fullName: defaultSavedAddr?.fullName || (currentCustomer ? (currentCustomer.fullName || `${currentCustomer.firstName} ${currentCustomer.lastName}`.trim()) : ''),
    phoneNumber: defaultSavedAddr?.phoneNumber || currentCustomer?.phoneNumber || '',
    email: defaultSavedAddr?.email || currentCustomer?.email || '',
    flatHouseNo: defaultSavedAddr?.flatHouseNo || '',
    streetArea: defaultSavedAddr?.streetArea || '',
    landmark: defaultSavedAddr?.landmark || '',
    pincode: defaultSavedAddr?.pincode || currentCustomer?.pincode || '',
    city: defaultSavedAddr?.city || currentCustomer?.city || '',
    state: defaultSavedAddr?.state || currentCustomer?.state || '',
  }));

  React.useEffect(() => {
    if (isCheckoutOpen && currentCustomer) {
      const firstSaved = currentCustomer.savedAddresses?.[0];
      setAddress((prev) => ({
        ...prev,
        fullName: prev.fullName || firstSaved?.fullName || currentCustomer.fullName || `${currentCustomer.firstName} ${currentCustomer.lastName}`.trim(),
        phoneNumber: prev.phoneNumber || firstSaved?.phoneNumber || currentCustomer.phoneNumber || '',
        email: prev.email || firstSaved?.email || currentCustomer.email || '',
        flatHouseNo: prev.flatHouseNo || firstSaved?.flatHouseNo || '',
        streetArea: prev.streetArea || firstSaved?.streetArea || '',
        landmark: prev.landmark || firstSaved?.landmark || '',
        pincode: prev.pincode || firstSaved?.pincode || currentCustomer.pincode || '',
        city: prev.city || firstSaved?.city || currentCustomer.city || '',
        state: prev.state || firstSaved?.state || currentCustomer.state || '',
      }));
    }
  }, [isCheckoutOpen, currentCustomer]);

  const [marketingConsent, setMarketingConsent] = useState(currentCustomer?.marketingConsent || false);
  const [whatsappDeliveryUpdates, setWhatsappDeliveryUpdates] = useState(true);

  const [pincodeMessage, setPincodeMessage] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'Netbanking'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [upiApp, setUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'qr'>('gpay');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isCheckoutOpen) return null;

  // Auto-fill city and state when Indian 6-digit PIN code is typed
  const handlePincodeChange = (pin: string) => {
    const cleaned = pin.replace(/\D/g, '').slice(0, 6);
    setAddress((prev) => ({ ...prev, pincode: cleaned }));

    if (cleaned.length === 6) {
      const match = PINCODE_DIRECTORY[cleaned];
      if (match) {
        setAddress((prev) => ({
          ...prev,
          city: match.city,
          state: match.state,
        }));
        setPincodeMessage(`Delivering in ${match.days}`);
      } else {
        setPincodeMessage('Standard Pan-India Express Delivery (3-4 days)');
      }
    } else {
      setPincodeMessage('');
    }
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasCartStockIssue) {
      showToast('Some items in your bag are out of stock or unavailable. Please update your bag.', 'warning');
      return;
    }
    if (!address.fullName || !address.phoneNumber || !address.pincode || !address.flatHouseNo) {
      showToast('Please complete all required shipping fields', 'warning');
      return;
    }
    if (address.phoneNumber.replace(/\D/g, '').length < 10) {
      showToast('Please enter a valid 10-digit Indian phone number', 'warning');
      return;
    }
    setStep('payment');
  };

  const handleFinalOrderSubmit = async () => {
    setIsProcessing(true);

    try {
      // 1. Validate live catalogue prices/stock and create secure order challenge on server (Prepaid Only)
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cartTotal,
          currency: 'INR',
          paymentMethod,
          customerEmail: address.email,
          customerPhone: address.phoneNumber,
          discountAmount: couponDiscount + redeemedPointsDiscount,
          items: cart.map((i) => ({
            productId: i.product.id,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData?.success) {
        setIsProcessing(false);
        await refreshProducts();
        showToast(orderData?.error || 'Checkout validation failed. Cart prices/availability refreshed.', 'warning');
        return;
      }

      const gwOrderId = orderData.gatewayOrderId;
      const challenge = orderData.serverSignatureChallenge;

      // Simulate instantaneous gateway processing (UPI / Cards / Netbanking)
      await new Promise((r) => setTimeout(r, 900));

      // 2. Verify payment server-side & trigger atomic inventory deduction
      const gwPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayOrderId: gwOrderId,
          gatewayPaymentId: gwPaymentId,
          serverSignatureChallenge: challenge,
          amount: orderData.amount ?? cartTotal,
        }),
      });
      const verifyData = await verifyRes.json();
      const isVerified = verifyRes.ok && verifyData?.verified === true;

      if (!isVerified) {
        setIsProcessing(false);
        showToast(verifyData?.error || 'Payment verification failed. Your card/account was not debited.', 'warning');
        return;
      }

      // 3. Mark order as Paid and create confirmed order
      const order = createOrder({
        items: cart,
        subtotal: cartSubtotal,
        discount: couponDiscount + redeemedPointsDiscount,
        shippingCharge: shippingFee,
        total: cartTotal,
        paymentMethod: paymentMethod,
        paymentStatus: 'Paid',
        gatewayOrderId: gwOrderId,
        gatewayPaymentId: gwPaymentId,
        shippingAddress: address,
        estimatedDeliveryDate: 'In 2-3 business days via Delhivery Air',
      });

      setCreatedOrderSummary(order);
      setIsProcessing(false);
      setStep('success');
      showToast('Payment confirmed! Order placed successfully.', 'success');
    } catch (err: any) {
      setIsProcessing(false);
      showToast(err?.message || 'Payment processing failed. Please try again.', 'warning');
    }
  };

  const handleCloseCheckout = () => {
    if (step !== 'success' && (address.email || address.phoneNumber) && cart.length > 0) {
      trackAbandonedCart({
        customerName: address.fullName || 'Shopper',
        email: address.email,
        phone: address.phoneNumber,
        cartValue: cartTotal,
        products: cart.map((i) => `${i.product.name} (x${i.quantity})`).join(', '),
      });
    }
    setIsCheckoutOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-2xl bg-[#F7F5F0] sm:rounded-3xl shadow-2xl border border-black/10 overflow-hidden flex flex-col max-h-screen sm:max-h-[94vh]">
        
        {/* Top Header */}
        <div className="bg-white px-6 py-4 border-b border-black/8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-[#242424]">EVERYDAY_EDITZ CHECKOUT</span>
            <span className="text-black/30">·</span>
            <span className="text-xs text-[#536B57] font-mono flex items-center space-x-1">
              <Lock className="w-3 h-3" />
              <span>256-Bit Encrypted</span>
            </span>
          </div>

          <button
            onClick={handleCloseCheckout}
            className="p-1.5 text-black/60 hover:text-black rounded-full hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="overflow-y-auto p-6 sm:p-8 flex-1">
          
          {/* STEP 1: Account Gate for Guests OR Shipping Address & Contact for Signed-In Customers */}
          {step === 'details' && !currentCustomer && (
            <div className="max-w-md mx-auto py-4 sm:py-6 text-center space-y-5">
              <div className="w-12 h-12 rounded-full bg-[#F3E7E4] text-[#9E6E65] flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-serif-luxury text-2xl sm:text-3xl font-semibold text-[#242424]">
                  Sign in to place your order
                </h3>
                <p className="text-xs sm:text-sm text-[#6E6560] leading-relaxed">
                  An account keeps your order tracking, invoice, and replacement protection safely linked to you. Your {cart.length} {cart.length === 1 ? 'item' : 'items'} in bag will stay saved.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    navigateToAuth('login', undefined, { type: 'checkout' });
                  }}
                  className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-[#242424] hover:bg-black text-[#FAF8F6] text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Mail className="w-4 h-4 text-[#D9A6A0]" />
                  <span>Sign In with Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    navigateToAuth('register', undefined, { type: 'checkout' });
                  }}
                  className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-white border border-black/15 hover:border-[#242424]/40 text-[#242424] text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-[#9E6E65]" />
                  <span>Create a New Account</span>
                </button>
              </div>

              <p className="text-[11px] text-[#6E6560] pt-1">
                After signing in, you’ll return directly to checkout automatically.
              </p>
            </div>
          )}

          {step === 'details' && currentCustomer && (
            <form onSubmit={handleProceedToPayment} className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#242424]">
                  1. Contact & Delivery Address
                </h3>
                <p className="text-xs text-[#242424]/70 mt-0.5">
                  Enter your address details for insured courier delivery across India.
                </p>
              </div>

              {currentCustomer?.savedAddresses && currentCustomer.savedAddresses.length > 0 && (
                <div className="bg-white p-3.5 rounded-2xl border border-black/8 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-black/60 block">
                    Use Saved Address
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentCustomer.savedAddresses.map((saved, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAddress(saved)}
                        className="text-left p-2.5 rounded-xl border border-black/10 hover:border-[#242424] bg-[#FAF8F5] text-xs cursor-pointer transition-colors"
                      >
                        <div className="font-semibold text-[#242424] truncate">{saved.fullName}</div>
                        <div className="text-[11px] text-black/60 truncate">{saved.flatHouseNo}, {saved.city} - {saved.pincode}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-1">
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={address.fullName}
                    onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-white rounded-xl border border-black/15 focus:outline-hidden focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-1">
                    10-Digit Mobile Number *
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-black/15 bg-[#FAF8F5] text-xs font-mono text-black/70">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={address.phoneNumber}
                      onChange={(e) => setAddress({ ...address, phoneNumber: e.target.value.replace(/\D/g, '') })}
                      className="w-full text-xs px-3.5 py-2.5 bg-white rounded-r-xl border border-black/15 focus:outline-hidden focus:ring-1 focus:ring-black font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#242424] mb-1">
                    Email for GST Invoice & Tracking Updates *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={address.email}
                    onChange={(e) => setAddress({ ...address, email: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-white rounded-xl border border-black/15 focus:outline-hidden focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Delivery Address fields */}
              <div className="space-y-4 pt-4 border-t border-black/8">
                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-1">
                    Flat, House No., Apartment, Building *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="House / Flat / Building No."
                    value={address.flatHouseNo}
                    onChange={(e) => setAddress({ ...address, flatHouseNo: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-white rounded-xl border border-black/15 focus:outline-hidden focus:ring-1 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-1">
                    Street Address, Area, Colony *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Street, Sector, Locality or Landmark"
                    value={address.streetArea}
                    onChange={(e) => setAddress({ ...address, streetArea: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 bg-white rounded-xl border border-black/15 focus:outline-hidden focus:ring-1 focus:ring-black"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#242424] mb-1">
                      6-Digit PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="PIN code"
                      value={address.pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 bg-white rounded-xl border border-black/15 focus:outline-hidden focus:ring-1 focus:ring-black font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#242424] mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-white rounded-xl border border-black/15 focus:outline-hidden focus:ring-1 focus:ring-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#242424] mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="State"
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 bg-white rounded-xl border border-black/15 focus:outline-hidden focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>

                {pincodeMessage && (
                  <div className="p-2.5 rounded-lg bg-[#536B57]/10 text-[#536B57] text-xs flex items-center space-x-1.5 font-medium">
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    <span>{pincodeMessage}</span>
                  </div>
                )}
              </div>

              {/* Order items review with variants */}
              <div className="bg-white p-4 rounded-xl border border-black/8 space-y-2">
                <span className="text-xs font-bold text-[#242424] block">
                  Items in your Bag ({cart.length})
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div key={`${item.product.id}-${idx}`} className="flex items-center justify-between text-xs py-1 border-b border-black/5 last:border-b-0">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-semibold text-[#242424] truncate">{item.product.name}</div>
                        {item.selectedVariant && (
                          <div className="text-[10px] text-[#536B57] font-mono">
                            {item.selectedVariant} {item.variantSku ? `· ${item.variantSku}` : ''}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <span className="text-black/50 text-[11px]">x{item.quantity} · </span>
                        <span className="font-bold text-[#242424]">₹{(item.unitPrice ?? item.product.price) * item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order total preview */}
              <div className="p-4 bg-white rounded-xl border border-black/8 flex items-center justify-between text-xs">
                <div>
                  <span className="text-black/60">Cart Total ({cart.length} items):</span>
                  <div className="text-base font-bold text-[#242424] font-mono">₹{cartTotal}</div>
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#242424] hover:bg-black text-[#F7F5F0] text-xs font-semibold rounded-xl flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <span>Select Payment Method</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D9A6A0]" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Indian Payment Gateways */}
          {step === 'payment' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#242424]">
                    2. Payment Method
                  </h3>
                  <p className="text-xs text-[#242424]/70 mt-0.5">
                    Pay securely with UPI, RuPay / Credit / Debit Cards, or Net Banking.
                  </p>
                </div>
                <button
                  onClick={() => setStep('details')}
                  className="text-xs text-[#536B57] underline font-medium cursor-pointer"
                >
                  Edit Address
                </button>
              </div>

              {/* Strict Prepaid Banner */}
              <div className="bg-[#536B57]/10 border border-[#536B57]/20 rounded-2xl p-3.5 flex items-start space-x-3">
                <Lock className="w-4 h-4 text-[#536B57] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold text-[#242424]">100% Secure Prepaid Checkout</div>
                  <div className="text-black/75 mt-0.5">
                    Cash on Delivery (COD) is strictly disabled. We deliver verified lifestyle essentials with expedited courier transit once your online payment is verified.
                  </div>
                </div>
              </div>

              {/* Payment Method Selector Tabs (Strictly Prepaid) */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'UPI', label: 'UPI (Instant)', icon: Smartphone },
                  { id: 'Card', label: 'Credit / Debit', icon: CreditCard },
                  { id: 'Netbanking', label: 'Net Banking', icon: Building },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#242424] bg-white text-[#242424] shadow-xs ring-1 ring-[#242424]'
                          : 'border-black/10 bg-[#FAF8F5] text-black/60 hover:bg-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#536B57]' : 'text-black/50'}`} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* UPI Tab */}
              {paymentMethod === 'UPI' && (
                <div className="bg-white p-5 rounded-2xl border border-black/8 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#242424]">Instant UPI Payment</span>
                    <span className="text-[10px] font-mono text-[#536B57] bg-[#536B57]/10 px-2 py-0.5 rounded">
                      Zero Surcharge
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'gpay', label: 'Google Pay' },
                      { id: 'phonepe', label: 'PhonePe' },
                      { id: 'paytm', label: 'Paytm' },
                      { id: 'qr', label: 'Scan QR' },
                    ].map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setUpiApp(app.id as any)}
                        className={`py-2 text-[11px] font-medium rounded-lg border text-center transition-all cursor-pointer ${
                          upiApp === app.id
                            ? 'bg-[#242424] text-white border-[#242424]'
                            : 'bg-[#F7F5F0] text-[#242424]/80 border-black/10 hover:bg-white'
                        }`}
                      >
                        {app.label}
                      </button>
                    ))}
                  </div>

                  {upiApp === 'qr' ? (
                    <div className="flex flex-col items-center justify-center p-4 bg-[#FAF8F5] rounded-xl border border-black/5">
                      <QrCode className="w-24 h-24 text-[#242424] p-1 bg-white rounded-lg shadow-xs" />
                      <span className="text-[11px] font-mono text-black/60 mt-2">
                        Scan with any UPI app to pay ₹{cartTotal}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-[#242424] mb-1">
                        Enter UPI VPA / Handle
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. mobile@upi or username@okhdfcbank"
                        className="w-full text-xs px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-black/10 focus:outline-hidden font-mono"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Card Tab */}
              {paymentMethod === 'Card' && (
                <div className="bg-white p-5 rounded-2xl border border-black/8 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#242424]">Credit / Debit / RuPay Cards</span>
                    <span className="text-[10px] text-black/40">3D Secure Verified</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#242424] mb-1">Card Number</label>
                    <input
                      type="text"
                      maxLength={19}
                      placeholder="4111 2222 3333 4444"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                      className="w-full text-xs px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-black/10 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#242424] mb-1">Expiry Date</label>
                      <input
                        type="text"
                        maxLength={5}
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-black/10 focus:outline-hidden font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#242424] mb-1">CVV</label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-xs px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-black/10 focus:outline-hidden font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Netbanking Tab */}
              {paymentMethod === 'Netbanking' && (
                <div className="bg-white p-5 rounded-2xl border border-black/8 space-y-3">
                  <span className="text-xs font-bold text-[#242424]">Choose Your Bank</span>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-black/10 focus:outline-hidden"
                  >
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="State Bank of India">State Bank of India (SBI)</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  </select>
                </div>
              )}

              {/* Final Submit Button */}
              <div className="p-4 bg-white rounded-2xl border border-black/8 flex items-center justify-between">
                <div>
                  <span className="text-xs text-black/50">Payable Amount:</span>
                  <div className="text-xl font-bold text-[#242424] font-mono">₹{cartTotal}</div>
                </div>

                <button
                  onClick={handleFinalOrderSubmit}
                  disabled={isProcessing}
                  className="px-6 py-3.5 bg-[#242424] hover:bg-black text-[#F7F5F0] font-semibold text-xs rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 text-[#D9A6A0]" />
                  <span>{isProcessing ? 'Verifying with Razorpay...' : `Authorize & Place Order (₹${cartTotal})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Order Success & Tracking */}
          {step === 'success' && createdOrderSummary && (
            <div className="py-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#536B57]">
                  Order Confirmed & Payment Verified
                </span>
                <h3 className="text-2xl font-bold text-[#242424] mt-1">
                  Thank You, {address.fullName || 'Shopper'}!
                </h3>
                <p className="text-xs text-[#242424]/70 mt-1 max-w-sm mx-auto">
                  We've received your order. Packing is commencing for expedited dispatch.
                </p>
              </div>

              {/* Order Info Card */}
              <div className="max-w-md mx-auto bg-white p-5 rounded-2xl border border-black/8 text-left space-y-3 text-xs">
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span className="text-black/50">Order Reference</span>
                  <span className="font-mono font-bold text-[#242424]">{createdOrderSummary.id}</span>
                </div>
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span className="text-black/50">Courier Partner</span>
                  <span className="font-medium">{createdOrderSummary.courierName}</span>
                </div>
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span className="text-black/50">Air Waybill / Tracking #</span>
                  <span className="font-mono text-[#536B57]">{createdOrderSummary.trackingNumber}</span>
                </div>
                <div className="flex justify-between border-b border-black/5 pb-2">
                  <span className="text-black/50">Estimated Arrival</span>
                  <span className="font-semibold">{createdOrderSummary.estimatedDeliveryDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/50">Delivery Address</span>
                  <span className="text-right truncate max-w-[200px]">{address.flatHouseNo}, {address.city}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    setTrackingLookupId(createdOrderSummary.id);
                    setIsTrackingOpen(true);
                  }}
                  className="px-5 py-2.5 bg-[#242424] text-white text-xs font-semibold rounded-xl hover:bg-black transition-colors cursor-pointer"
                >
                  Track Live Shipment
                </button>

                <button
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-5 py-2.5 bg-white border border-black/15 text-[#242424] text-xs font-semibold rounded-xl hover:bg-[#F2EFE9] transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
