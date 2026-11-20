import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { StaffDashboard } from './StaffDashboard';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, ShieldAlert } from 'lucide-react';

export const StaffPortalPage: React.FC = () => {
  const {
    routeView,
    isStaffAuthenticated,
    isStaffSessionChecked,
    staffToken,
    currentCustomer,
    staffLogin,
    navigateToStaffLogin,
    returnToHome,
  } = useStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Enforce redirect: unauthenticated visitors trying to open /staff are sent to /staff/login
  useEffect(() => {
    if (!isStaffSessionChecked) return;
    if (routeView === 'staff' && (!isStaffAuthenticated || !staffToken)) {
      navigateToStaffLogin();
    }
  }, [isStaffSessionChecked, routeView, isStaffAuthenticated, staffToken, navigateToStaffLogin]);

  if (!isStaffSessionChecked) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-xs text-[#6E6560]">
          <Loader2 className="w-4 h-4 animate-spin text-[#9E6E65]" />
          <span>Verifying staff session...</span>
        </div>
      </div>
    );
  }

  // Verified Staff session -> render compact Staff Dashboard
  if (isStaffAuthenticated && staffToken) {
    return <StaffDashboard />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter your staff username and password.');
      return;
    }
    setSubmitting(true);
    const res = await staffLogin(username.trim(), password);
    setSubmitting(false);
    if (!res.success) {
      setError(res.error || 'Authentication failed. Please check your credentials.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-[#242424] flex flex-col justify-between p-6 sm:p-10 animate-auth-enter">
      {/* Top quiet back navigation */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={returnToHome}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#6E6560] hover:text-[#242424] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Storefront</span>
        </button>

        <span className="text-xs text-[#8C807A] whitespace-nowrap shrink-0">
          The Everyday Editz
        </span>
      </header>

      {/* Center Minimal Luxury Staff Sign-In Card */}
      <main className="w-full max-w-md mx-auto my-8">
        <div className="bg-white rounded-2xl border border-[#EAE1DB] p-8 sm:p-10">
          <div className="mb-7">
            <div className="w-10 h-10 rounded-xl bg-[#F3E7E4] text-[#9E6E65] flex items-center justify-center mb-5">
              <Lock className="w-4 h-4" />
            </div>

            <p className="text-xs text-[#9E6E65] font-medium tracking-wide">
              Everyday Editz · Internal Workspace
            </p>
            <h1 className="font-serif-luxury text-3xl sm:text-4xl font-medium text-[#242424] tracking-tight mt-1 text-balance">
              Staff Portal
            </h1>
            <p className="text-sm text-[#6E6560] mt-2 leading-relaxed">
              Sign in with your authorized staff credentials to manage catalogue products, orders, homepage banners, and promotional reels.
            </p>
          </div>

          {currentCustomer && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#FAF6F4] border border-[#E6D5CE] flex items-start gap-2.5 text-xs text-[#6E5650]">
              <ShieldAlert className="w-4 h-4 text-[#9E6E65] shrink-0 mt-0.5" />
              <span>
                You are currently signed in as customer <strong>{currentCustomer.email}</strong>. Customer accounts do not grant staff permissions — please authenticate with authorized staff credentials below.
              </span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 px-4 py-3 rounded-xl bg-[#FDF2F2] border border-[#EBCAC8] text-xs text-[#8D322D] leading-relaxed"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="staff-username"
                className="block text-xs font-medium text-[#3D3632] mb-1.5"
              >
                Staff Username
              </label>
              <input
                id="staff-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full h-11 px-3.5 bg-[#FAF8F6] rounded-xl border border-[#E6DDD7] text-sm text-[#242424] placeholder:text-[#9E938D] focus:outline-hidden focus:border-[#B8867C] focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="staff-password"
                className="block text-xs font-medium text-[#3D3632] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="staff-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-11 px-3.5 pr-11 bg-[#FAF8F6] rounded-xl border border-[#E6DDD7] text-sm text-[#242424] placeholder:text-[#9E938D] focus:outline-hidden focus:border-[#B8867C] focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#7D736D] hover:text-[#242424] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 mt-2 rounded-xl bg-[#242424] hover:bg-[#141414] text-[#FAF8F6] text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin text-[#D9A6A0]" />}
              <span>{submitting ? 'Verifying Credentials...' : 'Sign In to Staff Portal'}</span>
            </button>
          </form>
        </div>
      </main>

      {/* Quiet footer */}
      <footer className="max-w-5xl w-full mx-auto text-center text-[11px] text-[#9A8E87]">
        The Everyday Editz · Authorized Personnel Only
      </footer>
    </div>
  );
};
