import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  ShieldCheck, 
  Sparkles, 
  Eye, 
  Lock, 
  Headphones, 
  Mail, 
  ArrowRight, 
  Instagram, 
  MessageSquare,
  Check
} from 'lucide-react';

export const WhyEverydayEditz: React.FC = () => {
  const { 
    setActivePolicy, 
    setIsReturnClaimOpen, 
    navigateToCollection,
    navigateToDepartment,
    navigateToStaffPortal,
    showToast 
  } = useStore();
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const pillars = [
    {
      title: 'Carefully Selected Finds',
      description: 'Hand-tested personally by Raftaar Solutions curators before reaching the catalog. No drop-shipped junk.',
      icon: Sparkles,
    },
    {
      title: 'Clear Product Information',
      description: 'Exact materials, real dimensions, and honest limitations. Zero fabricated specifications.',
      icon: Eye,
    },
    {
      title: 'Transparent Pricing',
      description: 'No inflated fake MRPs or countdown tricks. Clear discounts and inclusive GST pricing.',
      icon: ShieldCheck,
    },
    {
      title: 'Secure Indian Checkout',
      description: 'Bank-grade 256-bit encryption with instant UPI QR, RuPay, Netbanking & Cards. 100% Secure Prepaid.',
      icon: Lock,
    },
    {
      title: 'Responsive Human Support',
      description: 'Direct email support with Raftaar Solutions. Real humans, prompt 24–48h response.',
      icon: Headphones,
    },
  ];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSubscribed(true);
    showToast('Subscribed! Check your inbox for your 10% welcome voucher.');
  };

  return (
    <section className="bg-white border-b border-black/8 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section 1: Why Everyday Editz & Small-Business Positioning */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono uppercase tracking-wider text-[#536B57]">
              Smart Finds. Fair Prices. Everyday Value.
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#242424] tracking-tight mt-1">
              Everyday Finds. Small-Business-Friendly Prices.
            </h2>
            <p className="text-xs sm:text-sm text-[#242424]/75 mt-2 leading-relaxed">
              We believe great everyday essentials should be accessible to everyone. Explore thoughtfully selected products, practical finds, and exciting offers at prices designed to make everyday shopping easier.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {pillars.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div 
                  key={idx}
                  className="bg-[#F7F5F0] p-5 rounded-2xl border border-black/5 flex flex-col justify-between hover:border-black/15 transition-all"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-white text-[#536B57] flex items-center justify-center mb-4 shadow-xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-[#242424]">
                      {p.title}
                    </h3>
                    <p className="text-xs text-[#242424]/70 mt-1.5 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-black/5 text-[10px] font-mono text-[#536B57]">
                    0{idx + 1} · Studio Standard
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Newsletter & Community Signup */}
        <div className="bg-[#242424] text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-md">
            <span className="text-xs font-mono text-[#D9A6A0] uppercase tracking-wider">
              The Sunday Dispatch
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 text-white">
              Little Finds, Delivered to Your Inbox.
            </h3>
            <p className="text-xs sm:text-sm text-white/70 mt-2 leading-relaxed">
              Every Sunday morning, we share 3 functional discoveries, desk setup ideas, and exclusive subscriber batch pricing.
            </p>
          </div>

          <div className="w-full md:max-w-md">
            {subscribed ? (
              <div className="bg-white/10 p-4 rounded-2xl border border-white/20 flex items-center space-x-3 text-white">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium">
                  Welcome to the Club! Your 10% promo code <strong>FIRST10</strong> is active.
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder:text-white/40 focus:outline-hidden focus:ring-1 focus:ring-[#D9A6A0]"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#D9A6A0] hover:bg-[#c9958f] text-[#242424] font-semibold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    Join Club
                  </button>
                </div>
                <p className="text-[10px] text-white/40">
                  Zero spam. Unsubscribe anytime in 1-click.
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Section 3: Site Footer Links */}
        <div className="pt-8 border-t border-black/8 grid grid-cols-1 md:grid-cols-5 gap-8 text-xs text-[#242424]/75">
          <div className="md:col-span-2 space-y-3">
            <div className="text-lg font-bold text-[#242424] tracking-tight">
              The Everyday Editz
            </div>
            <p className="text-xs text-black/60 max-w-sm leading-relaxed">
              Little Finds. Big Everyday Upgrades. Curated functional lifestyle essentials for women, men, kids, and households across India.
            </p>
            <div className="space-y-1.5 text-xs text-black/70 pt-1">
              <div>
                <span className="font-semibold text-[#242424]">Operations:</span> Raftaar Solutions
              </div>
              <div className="flex items-start space-x-1.5">
                <span className="font-semibold text-[#242424] shrink-0">Location:</span>
                <span className="leading-relaxed">Delhi–Jalandhar GT Road (NH-1), Sirhind Side, Mandi Gobindgarh, Punjab – 147301, India.</span>
              </div>
              <div className="flex items-center space-x-1.5 pt-0.5">
                <span className="font-semibold text-[#242424]">Email:</span>
                <a 
                  href="mailto:manpreetkaurdeveloper2@gmail.com" 
                  className="text-[#536B57] font-semibold hover:underline"
                >
                  manpreetkaurdeveloper2@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2 text-[#242424]">
              <a 
                href="https://www.instagram.com/everyday_editz.in/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#F7F5F0] hover:bg-[#B7A18D]/20 transition-colors text-xs font-medium" 
                title="Follow us on Instagram"
              >
                <Instagram className="w-3.5 h-3.5 text-[#D9A6A0]" />
                <span>@everyday_editz.in</span>
              </a>
              <a 
                href="mailto:manpreetkaurdeveloper2@gmail.com" 
                className="p-2 rounded-full bg-[#F7F5F0] hover:bg-[#B7A18D]/20 transition-colors text-[#242424]" 
                title="Send Support Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <span className="font-bold text-[#242424] block mb-3 font-mono text-[11px] uppercase tracking-wider">
              Explore
            </span>
            <ul className="space-y-2">
              <li><button type="button" onClick={() => navigateToDepartment('women')} className="hover:text-black cursor-pointer">Women’s Essentials</button></li>
              <li><button type="button" onClick={() => navigateToDepartment('men')} className="hover:text-black cursor-pointer">Men’s Gear</button></li>
              <li><button type="button" onClick={() => navigateToDepartment('kids')} className="hover:text-black cursor-pointer">Kids’ Studio</button></li>
              <li><button type="button" onClick={() => navigateToCollection('everyday-essentials')} className="hover:text-black cursor-pointer">Everyday Essentials</button></li>
              <li><button type="button" onClick={() => navigateToCollection('new-arrivals')} className="hover:text-black cursor-pointer">New Arrivals</button></li>
            </ul>
          </div>

          <div>
            <span className="font-bold text-[#242424] block mb-3 font-mono text-[11px] uppercase tracking-wider">
              Customer Care
            </span>
            <ul className="space-y-2">
              <li><button onClick={() => setActivePolicy('shipping')} className="hover:text-black cursor-pointer">Shipping & Delivery Policy</button></li>
              <li><button onClick={() => setActivePolicy('returns')} className="hover:text-black cursor-pointer">Return & Replacement Policy</button></li>
              <li><button onClick={() => setIsReturnClaimOpen(true)} className="text-[#536B57] font-semibold hover:underline cursor-pointer">Submit a Claim (7-Day)</button></li>
              <li><button onClick={() => setActivePolicy('refunds')} className="hover:text-black cursor-pointer">Refund Policy</button></li>
              <li><button onClick={() => setActivePolicy('grievance')} className="hover:text-black cursor-pointer">Grievance Redressal Officer</button></li>
              <li><button onClick={() => setActivePolicy('faq')} className="hover:text-black cursor-pointer">Help & FAQs</button></li>
            </ul>
          </div>

          <div>
            <span className="font-bold text-[#242424] block mb-3 font-mono text-[11px] uppercase tracking-wider">
              About & Legal
            </span>
            <ul className="space-y-2">
              <li><button onClick={() => setActivePolicy('about')} className="hover:text-black cursor-pointer">About The Everyday Editz</button></li>
              <li><button onClick={() => setActivePolicy('privacy')} className="hover:text-black cursor-pointer">Privacy Policy (DPDP Act)</button></li>
              <li><button onClick={() => setActivePolicy('terms')} className="hover:text-black cursor-pointer">Terms & Conditions</button></li>
              <li className="pt-1.5 border-t border-black/6">
                <button
                  type="button"
                  onClick={navigateToStaffPortal}
                  className="text-[11px] text-[#7D736D] hover:text-[#242424] transition-colors cursor-pointer"
                >
                  Staff Portal
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-6 border-t border-black/8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-black/50 font-mono gap-2">
          <span>© 2026 The Everyday Editz (everyday_editz.in) · Operated by Raftaar Solutions. All Rights Reserved.</span>
          <span>Delhi–Jalandhar GT Road (NH-1), Sirhind Side, Mandi Gobindgarh, Punjab – 147301, India</span>
        </div>

      </div>
    </section>
  );
};
