import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { AdminDashboardModal } from './AdminDashboardModal';
import { Lock, ShieldAlert, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';

export const AdminPortalPage: React.FC = () => {
  const {
    isAdminAuthenticated,
    isAdminSessionChecked,
    adminToken,
    currentCustomer,
    adminLogin,
    returnToHome,
  } = useStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAdminSessionChecked) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#9E6E65]" />
      </div>
    );
  }

  // Verified Admin: render full operations dashboard directly in page mode
  if (isAdminAuthenticated && adminToken) {
    return <AdminDashboardModal variant="page" />;
  }

  // Regular signed-in customer attempting to reach /admin: explicit 403 block
  if (currentCustomer && !isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8DFD9] p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-[#FDF2F2] border border-[#EBCAC8] text-[#A33D38] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#A33D38]">403 · Access Restricted</p>
            <h1 className="font-serif-luxury text-3xl font-medium text-[#242424] mt-1">
              Administrator Access Required
            </h1>
            <p className="text-xs text-[#6E6560] mt-2 leading-relaxed">
              This private operations portal is restricted to authorized store administrators. Your customer session does not grant access to this area.
            </p>
          </div>
          <button
            type="button"
            onClick={returnToHome}
            className="w-full h-11 rounded-xl bg-[#242424] hover:bg-[#141414] text-white text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Storefront</span>
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter your administrator username and password.');
      return;
    }
    setLoading(true);
    const res = await adminLogin(password, username.trim());
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Authentication failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F6] flex flex-col justify-between p-6">
      <div>
        <button
          type="button"
          onClick={returnToHome}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#6E6560] hover:text-[#242424] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Storefront</span>
        </button>
      </div>

      <div className="w-full max-w-sm mx-auto bg-white rounded-2xl border border-[#E8DFD9] p-8 shadow-xs">
        <div className="mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#242424] text-[#D9A6A0] flex items-center justify-center mb-4">
            <Lock className="w-4 h-4" />
          </div>
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#847A74]">Private Portal</p>
          <h1 className="font-serif-luxury text-3xl font-medium text-[#242424] mt-1">
            Store Operations
          </h1>
          <p className="text-xs text-[#6E6560] mt-1">
            Sign in with your authorized administrator credentials.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 px-3.5 py-2.5 rounded-xl bg-[#FDF2F2] border border-[#EBCAC8] text-xs text-[#8D322D]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-user" className="block text-xs font-medium text-[#3D3632] mb-1.5">
              Username
            </label>
            <input
              id="admin-user"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-11 px-3.5 bg-[#FAF8F6] rounded-xl border border-[#E6DDD7] text-sm text-[#242424] focus:outline-hidden focus:border-[#242424] focus:bg-white"
            />
          </div>

          <div>
            <label htmlFor="admin-pass" className="block text-xs font-medium text-[#3D3632] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="admin-pass"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3.5 pr-10 bg-[#FAF8F6] rounded-xl border border-[#E6DDD7] text-sm text-[#242424] focus:outline-hidden focus:border-[#242424] focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7D736D] hover:text-[#242424] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#242424] hover:bg-[#141414] text-white text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-55"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D9A6A0]" />}
            <span>Sign In to Operations</span>
          </button>
        </form>
      </div>

      <div className="text-center text-[11px] text-[#9A8E87]">
        The Everyday Editz · Authorized Personnel Only
      </div>
    </div>
  );
};
