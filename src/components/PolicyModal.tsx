import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  HelpCircle, 
  Mail, 
  MessageSquare,
  FileText,
  ChevronDown,
  Building,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight
} from 'lucide-react';

export const PolicyModal: React.FC = () => {
  const { activePolicy, setActivePolicy, setIsReturnClaimOpen } = useStore();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  if (!activePolicy) return null;

  const faqs = [
    {
      q: 'Do you support Cash on Delivery (COD)?',
      a: 'No. To ensure rapid dispatch, zero unbox tampering, and direct courier priority, EVERYDAY_EDITZ is 100% PREPAID. We support all secure Indian payment methods including UPI (Google Pay, PhonePe, Paytm, BHIM), RuPay, Visa, MasterCard, and Netbanking.',
    },
    {
      q: 'What is your 7-day replacement guarantee?',
      a: 'If your item arrives with transit damage, a manufacturing defect, missing pieces, or does not match specifications, we provide an expedited doorstep replacement or full refund within 7 days of delivery.',
    },
    {
      q: 'Can I return an item if I change my mind?',
      a: 'Under our policy and Indian Consumer Protection (E-Commerce) Rules, change-of-mind returns are not accepted. Our curations are verified and photographed physically prior to sale.',
    },
    {
      q: 'How fast do orders ship across India?',
      a: 'All orders are dispatched within 24 hours via reliable express courier partners (Delhivery, BlueDart, Xpressbees). Metro destinations typically receive delivery in 2-3 business days.',
    },
    {
      q: 'Who is the Grievance Redressal Officer?',
      a: 'Raftaar Solutions Grievance & Consumer Relations Desk (Email: manpreetkaurdeveloper2@gmail.com, Operational Address: Delhi–Jalandhar GT Road (NH-1), Sirhind Side, Mandi Gobindgarh, Punjab – 147301, India). All customer grievances are acknowledged within 48 hours and resolved within 30 days.',
    },
  ];

  const tabs = [
    { id: 'returns', label: 'Return Policy' },
    { id: 'replacements', label: 'Replacement Policy' },
    { id: 'refunds', label: 'Refund Policy' },
    { id: 'shipping', label: 'Shipping & Delivery' },
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'terms', label: 'Terms & Conditions' },
    { id: 'grievance', label: 'Grievance Officer' },
    { id: 'about', label: 'About Us' },
    { id: 'faq', label: 'FAQ' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#F7F5F0] sm:rounded-3xl shadow-2xl border border-black/10 overflow-hidden flex flex-col max-h-screen sm:max-h-[92vh]">
        
        {/* Top Header */}
        <div className="bg-white px-6 py-4 border-b border-black/8 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-[#536B57]">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-bold text-[#242424]">Legal & Consumer Protection</span>
          </div>

          <button
            onClick={() => setActivePolicy(null)}
            className="p-1.5 text-black/60 hover:text-black rounded-full hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy Tab Navigation Bar */}
        <div className="bg-[#FAF8F5] border-b border-black/8 px-6 py-2 overflow-x-auto flex space-x-2 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePolicy(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                activePolicy === tab.id
                  ? 'bg-[#242424] text-white shadow-xs'
                  : 'text-black/60 hover:text-black hover:bg-black/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Scroll Content */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1 text-xs text-[#242424]/85 leading-relaxed">
          
          {/* 1. RETURN POLICY */}
          {activePolicy === 'returns' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#242424]">Return Policy</h3>
                <span className="px-2.5 py-1 rounded bg-[#536B57]/10 text-[#536B57] font-mono text-[11px] font-semibold">
                  Consumer Protection Compliant
                </span>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-black/8 space-y-2">
                <h4 className="font-bold text-sm text-[#242424]">Zero Change-of-Mind Returns</h4>
                <p>
                  In accordance with the <strong>Consumer Protection (E-Commerce) Rules, 2020</strong> and our strict quality hygiene benchmarks, EVERYDAY_EDITZ does not accept returns or cancellations motivated by a "change of mind" or buyer's remorse once an order has been delivered in accordance with advertised specifications.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-sm text-[#242424]">Eligible Grounds for Return & Claims:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-black/8">
                    <span className="font-bold text-black block mb-0.5">1. Transit Damage</span>
                    <p className="text-[11px] text-black/60">Product arrived physically crushed, cracked, leaked or deformed during courier transit.</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-black/8">
                    <span className="font-bold text-black block mb-0.5">2. Manufacturing Defect</span>
                    <p className="text-[11px] text-black/60">Internal mechanical/electronic fault preventing advertised function upon unboxing.</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-black/8">
                    <span className="font-bold text-black block mb-0.5">3. Incorrect Product</span>
                    <p className="text-[11px] text-black/60">Different SKU, color or model received from what was confirmed at checkout.</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-black/8">
                    <span className="font-bold text-black block mb-0.5">4. Incomplete Package</span>
                    <p className="text-[11px] text-black/60">Missing essential accessories, cables, attachments or parts listed on the package.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#536B57]/10 rounded-2xl border border-[#536B57]/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#242424]">Received a damaged or defective item?</div>
                  <div className="text-[11px] text-black/70">Submit your claim with unboxing photos within 7 days of delivery.</div>
                </div>
                <button
                  onClick={() => {
                    setActivePolicy(null);
                    setIsReturnClaimOpen(true);
                  }}
                  className="px-4 py-2 bg-[#242424] text-[#F7F5F0] rounded-xl text-xs font-semibold hover:bg-black transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <span>Submit Claim</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D9A6A0]" />
                </button>
              </div>
            </div>
          )}

          {/* 2. REPLACEMENT POLICY */}
          {activePolicy === 'replacements' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-[#242424]">Replacement Guarantee & Process</h3>
              <p>
                We believe in zero-hassle accountability. When an authentic claim is verified by our quality control desk, we prioritize a swift 1-to-1 replacement at zero cost to the customer.
              </p>

              <div className="space-y-2">
                <h4 className="font-bold text-sm text-[#242424]">Step-by-Step Replacement Workflow:</h4>
                <ol className="list-decimal list-inside space-y-2 bg-white p-5 rounded-2xl border border-black/8">
                  <li>
                    <strong>Submission:</strong> Customer submits a claim via the online Return Desk within 7 calendar days of delivery, attaching photographs of the packaging, courier label, and defect.
                  </li>
                  <li>
                    <strong>Grievance Desk Review:</strong> Claim is assessed within 24 to 48 business hours by the Raftaar Solutions QA desk.
                  </li>
                  <li>
                    <strong>Doorstep Reverse Pickup:</strong> Once approved, our courier partner (Delhivery / BlueDart) arrives for reverse pickup at your registered shipping address.
                  </li>
                  <li>
                    <strong>Expedited Replacement Dispatch:</strong> A brand-new unit is dispatched via Express Air with priority tracking provided to your WhatsApp and email.
                  </li>
                </ol>
              </div>

              <div className="p-4 bg-white rounded-xl border border-black/8">
                <span className="font-bold text-[#242424] block mb-1">Out of Stock Situations:</span>
                <p className="text-[11px] text-black/70">
                  If the required replacement SKU is temporarily out of stock in our fulfillment network, a 100% full refund is issued automatically to your original payment method.
                </p>
              </div>
            </div>
          )}

          {/* 3. REFUND POLICY */}
          {activePolicy === 'refunds' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-[#242424]">Refund Policy</h3>
              <p>
                All approved refunds are processed directly back to the original source account (UPI VPA, Credit/Debit Card, or Netbanking account) used during checkout.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-white rounded-xl border border-black/8">
                  <div className="font-bold text-sm text-[#242424] mb-1">UPI & Netbanking Refunds</div>
                  <p className="text-[11px] text-black/60">
                    Typically credited within <strong>24 to 48 banking hours</strong> of claim authorization.
                  </p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-black/8">
                  <div className="font-bold text-sm text-[#242424] mb-1">Credit & Debit Cards</div>
                  <p className="text-[11px] text-black/60">
                    Credited within <strong>5 to 7 business days</strong> depending on your issuing bank's settlement cycle.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#FAF8F5] rounded-xl border border-black/8 text-[11px] space-y-1">
                <div className="font-bold text-[#242424]">Failed Online Transaction Policy:</div>
                <p className="text-black/70">
                  If money is debited from your bank account during a checkout interruption before order confirmation, our payment gateway auto-reverses the amount within 3-5 business days. You can also contact <a href="mailto:manpreetkaurdeveloper2@gmail.com" className="text-[#536B57] font-semibold hover:underline">manpreetkaurdeveloper2@gmail.com</a> with your UPI RRN or Bank Reference Number.
                </p>
              </div>
            </div>
          )}

          {/* 4. SHIPPING POLICY */}
          {activePolicy === 'shipping' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-[#242424]">Shipping & Delivery Policy</h3>
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-xl border border-black/8">
                  <div className="font-bold text-sm text-[#242424] flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-[#536B57]" />
                    <span>Pan-India Courier Network</span>
                  </div>
                  <p className="mt-1 text-black/70">
                    We partner with Tier-1 logistics networks (Delhivery, Blue Dart, Xpressbees) to service over 19,000 PIN codes across India.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-xl border border-black/8">
                    <div className="font-bold text-sm text-[#242424]">Metro Cities</div>
                    <p className="text-[11px] text-black/60 mt-1">2-3 Business Days (Bengaluru, Mumbai, Delhi-NCR, Hyderabad, Chennai, Pune)</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-black/8">
                    <div className="font-bold text-sm text-[#242424]">Rest of India</div>
                    <p className="text-[11px] text-black/60 mt-1">3-5 Business Days (Tier 2/3 Cities & Regional Towns)</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-black/8">
                  <div className="font-bold text-sm text-[#242424]">Complimentary Shipping Threshold</div>
                  <p className="mt-1 text-black/70">
                    All orders with cart value of <strong>₹499 or more</strong> qualify for Free Express Shipping. Standard delivery fee of ₹49 applies on orders below ₹499.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 5. PRIVACY POLICY */}
          {activePolicy === 'privacy' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-[#242424]">Privacy & Data Protection Policy</h3>
              <p>
                EVERYDAY_EDITZ is committed to protecting your personal information in strict accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection (DPDP) Act, 2023.
              </p>
              <div className="space-y-2 bg-white p-4 rounded-xl border border-black/8">
                <h4 className="font-bold text-sm text-[#242424]">1. Personal Information Collected:</h4>
                <p className="text-[11px] text-black/70">
                  Name, delivery address, contact email, and telephone number collected solely for fulfilling orders, sharing tracking notifications, and providing customer support.
                </p>
              </div>
              <div className="space-y-2 bg-white p-4 rounded-xl border border-black/8">
                <h4 className="font-bold text-sm text-[#242424]">2. Zero Sale of Personal Data:</h4>
                <p className="text-[11px] text-black/70">
                  We never rent, trade, or monetize customer data to third-party telemarketers or external advertising networks.
                </p>
              </div>
              <div className="space-y-2 bg-white p-4 rounded-xl border border-black/8">
                <h4 className="font-bold text-sm text-[#242424]">3. Payment Security:</h4>
                <p className="text-[11px] text-black/70">
                  We do NOT store customer credit card numbers, CVVs, or UPI PINs on our servers. All transactions are processed through PCI-DSS Level 1 compliant gateway partners.
                </p>
              </div>
            </div>
          )}

          {/* 6. TERMS AND CONDITIONS */}
          {activePolicy === 'terms' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-[#242424]">Terms and Conditions of Sale</h3>
              <p>
                By placing an order on everyday_editz.in, you agree to the following terms:
              </p>
              <div className="space-y-2 bg-white p-4 rounded-xl border border-black/8 text-[11px] text-black/75">
                <p>
                  <strong>1. Prepaid Contract:</strong> A binding contract of sale is established upon successful receipt and verification of online payment. Cash on Delivery is not supported.
                </p>
                <p>
                  <strong>2. Pricing & GST:</strong> All prices listed on the website are in Indian National Rupees (INR) and inclusive of 18% GST. Official tax invoices are provided with every consignment.
                </p>
                <p>
                  <strong>3. Product Descriptions:</strong> Product images, dimensions, and specifications are documented accurately from physical specimens. Slight variations in packaging design by manufacturers do not constitute a defect.
                </p>
                <p>
                  <strong>4. Jurisdiction:</strong> Any dispute arising out of or related to website orders shall be subject to the exclusive jurisdiction of the competent courts in Mandi Gobindgarh / Fatehgarh Sahib, Punjab, India.
                </p>
              </div>
            </div>
          )}

          {/* 7. GRIEVANCE OFFICER & SUPPORT */}
          {activePolicy === 'grievance' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-[#536B57]" />
                <h3 className="text-xl font-bold text-[#242424]">Grievance Redressal & Customer Support</h3>
              </div>

              <p>
                In compliance with Rule 5(9) of the Consumer Protection (E-Commerce) Rules, 2020, statutory grievance redressal information is provided below:
              </p>

              <div className="bg-white p-5 rounded-2xl border border-black/8 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-black/8">
                  <div>
                    <div className="text-sm font-bold text-[#242424]">Raftaar Solutions</div>
                    <div className="text-xs text-black/60">Consumer Grievance & Compliance Desk · The Everyday Editz</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#536B57]/10 text-[#536B57] text-[10px] font-mono font-bold">
                    Statutory Grievance Desk
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-black/80">
                    <Mail className="w-4 h-4 text-[#536B57] shrink-0" />
                    <span>Email: <a href="mailto:manpreetkaurdeveloper2@gmail.com" className="font-semibold text-[#536B57] hover:underline">manpreetkaurdeveloper2@gmail.com</a></span>
                  </div>
                  <div className="flex items-start space-x-2 text-black/80">
                    <Building className="w-4 h-4 text-[#536B57] shrink-0 mt-0.5" />
                    <span>Address: Delhi–Jalandhar GT Road (NH-1), Sirhind Side, Mandi Gobindgarh, Punjab – 147301, India</span>
                  </div>
                  <div className="flex items-center space-x-2 text-black/80">
                    <ShieldCheck className="w-4 h-4 text-[#536B57] shrink-0" />
                    <span>Acknowledgment SLA: <strong>Within 48 hours</strong></span>
                  </div>
                  <div className="flex items-center space-x-2 text-black/80">
                    <CheckCircle2 className="w-4 h-4 text-[#536B57] shrink-0" />
                    <span>Redressal Resolution SLA: <strong>Within 30 calendar days</strong></span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#536B57]/10 rounded-2xl border border-[#536B57]/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#242424]">Have an active order issue?</div>
                  <div className="text-[11px] text-black/70">Submit your replacement or damaged product claim directly online.</div>
                </div>
                <button
                  onClick={() => {
                    setActivePolicy(null);
                    setIsReturnClaimOpen(true);
                  }}
                  className="px-4 py-2 bg-[#242424] text-[#F7F5F0] rounded-xl text-xs font-semibold hover:bg-black transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <span>Submit Claim</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D9A6A0]" />
                </button>
              </div>
            </div>
          )}

          {/* ABOUT */}
          {activePolicy === 'about' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-[#242424]">About The Everyday Editz</h3>
              <p className="text-sm text-[#242424]/80">
                The Everyday Editz (everyday_editz.in) was born out of a simple frustration: online marketplaces are flooded with hundreds of thousands of low-grade dropshipped gadgets that look great in 3D renders but break in two weeks.
              </p>
              <p>
                We operate differently. Curated and operated by Raftaar Solutions, The Everyday Editz is an Indian lifestyle product discovery brand that physically inspects, curates, and photographs every single item before it enters our catalogue. If a tool doesn’t genuinely save you time, prevent clutter, or make your routine feel tactile and effortless, we simply don’t sell it.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-black/8">
                <div className="bg-white p-4 rounded-xl border border-black/8">
                  <h4 className="font-bold text-sm text-[#242424] mb-1">Our Mission</h4>
                  <p className="text-[11px] text-black/60">Little finds that yield big everyday upgrades for Indian homes and modern desks.</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-black/8">
                  <h4 className="font-bold text-sm text-[#242424] mb-1">Zero-Slop Promise</h4>
                  <p className="text-[11px] text-black/60">No fake countdowns, no manipulated reviews, and no hidden import duties.</p>
                </div>
              </div>
            </div>
          )}

          {/* FAQ */}
          {activePolicy === 'faq' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-[#242424]">Frequently Asked Questions</h3>
              <div className="space-y-2">
                {faqs.map((f, i) => (
                  <div key={i} className="bg-white rounded-xl border border-black/8 overflow-hidden">
                    <button
                      onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                      className="w-full text-left p-4 font-semibold text-xs text-[#242424] flex items-center justify-between cursor-pointer"
                    >
                      <span>{f.q}</span>
                      <ChevronDown className={`w-4 h-4 text-black/40 transition-transform ${openFaqIndex === i ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaqIndex === i && (
                      <div className="px-4 pb-4 text-xs text-black/70 border-t border-black/5 pt-3 leading-relaxed">
                        {f.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
