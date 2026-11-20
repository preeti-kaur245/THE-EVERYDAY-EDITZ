import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { BRAND_LOGO_URL } from '../utils/assetUrl';
import authEditorialImg from '../assets/images/auth_editorial_pearl_1795102741911.jpg';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  KeyRound,
  ShoppingBag,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface PasswordStrengthResult {
  score: number; // 0-4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  barColor: string;
  textColor: string;
  checks: {
    length: boolean;
    upper: boolean;
    lower: boolean;
    number: boolean;
    special: boolean;
  };
}

function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  let score = 0;
  if (checks.length) score++;
  if (checks.upper && checks.lower) score++;
  if (checks.number) score++;
  if (checks.special || password.length >= 12) score++;

  if (!password) {
    return { score: 0, label: 'Weak', barColor: 'bg-[#E5DCD6]', textColor: 'text-[#6E6560]', checks };
  }
  if (score <= 1) {
    return { score: 1, label: 'Weak', barColor: 'bg-[#B9524C]', textColor: 'text-[#9F3D38]', checks };
  }
  if (score === 2) {
    return { score: 2, label: 'Fair', barColor: 'bg-[#C48B45]', textColor: 'text-[#9B6929]', checks };
  }
  if (score === 3) {
    return { score: 3, label: 'Good', barColor: 'bg-[#B8867C]', textColor: 'text-[#8C5F56]', checks };
  }
  return { score: 4, label: 'Strong', barColor: 'bg-[#536B57]', textColor: 'text-[#3F5543]', checks };
}

const PasswordStrengthMeter: React.FC<{ password: string }> = ({ password }) => {
  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);
  if (!password) return null;

  const rules = [
    { key: 'length', ok: strength.checks.length, label: '8+ characters' },
    { key: 'upper', ok: strength.checks.upper, label: 'Uppercase' },
    { key: 'lower', ok: strength.checks.lower, label: 'Lowercase' },
    { key: 'number', ok: strength.checks.number, label: 'Number' },
  ];

  return (
    <div className="mt-2.5 space-y-2" aria-live="polite">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[#6E6560]">Password strength</span>
        <span className={`font-medium ${strength.textColor}`}>{strength.label}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={`h-1 rounded-full transition-colors duration-200 ${
              strength.score >= segment ? strength.barColor : 'bg-[#EAE3DD]'
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5">
        {rules.map((r) => (
          <div
            key={r.key}
            className={`flex items-center gap-1.5 text-[11px] transition-colors ${
              r.ok ? 'text-[#465E4A]' : 'text-[#7A716B]'
            }`}
          >
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border ${
                r.ok ? 'bg-[#536B57] border-[#536B57] text-white' : 'border-[#D5CAC3] text-transparent'
              }`}
            >
              <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
            </span>
            <span>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CustomerAuthPages: React.FC = () => {
  const {
    routeView,
    currentCustomer,
    cartCount,
    authReturnTo,
    navigateToAuth,
    navigateToAccount,
    completeAuthRedirect,
    returnToHome,
    loginCustomer,
    registerCustomer,
    requestPasswordReset,
    confirmPasswordReset,
    setActivePolicy,
    showToast,
  } = useStore();

  // Sign In state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Create Account state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Forgot & Reset Password state (link-based)
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetLinkIssued, setResetLinkIssued] = useState<{ email: string; url: string; expiresInMinutes: number } | null>(null);
  const [resetToken, setResetToken] = useState('');
  const [resetTargetEmail, setResetTargetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetCompleted, setResetCompleted] = useState(false);

  // Shared UI states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync URL query params and clear transient banners when switching views
  useEffect(() => {
    setFieldErrors({});
    setFormError('');

    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email') || '';
    const tokenParam = params.get('token') || '';

    if (routeView === 'forgot-password') {
      setResetLinkIssued(null);
    }

    if (routeView === 'reset-password') {
      setResetCompleted(false);
      setResetTargetEmail(emailParam);
      setResetToken(tokenParam);
    }
  }, [routeView]);

  // Redirect already authenticated customer away from login/register
  useEffect(() => {
    if (currentCustomer && (routeView === 'login' || routeView === 'register')) {
      if (authReturnTo) {
        completeAuthRedirect();
      } else {
        navigateToAccount('profile');
      }
    }
  }, [currentCustomer, routeView]);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (formError) setFormError('');
  };

  // --- SIGN IN SUBMIT ---
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const cleanEmail = loginEmail.trim().toLowerCase();

    if (!cleanEmail) {
      errors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!loginPassword) {
      errors.password = 'Please enter your password.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    const res = await loginCustomer(cleanEmail, loginPassword, rememberMe);
    setIsSubmitting(false);

    if (!res.success) {
      if (res.field) {
        setFieldErrors({ [res.field]: res.error || 'Please check this field.' });
      } else {
        setFormError(res.error || 'Incorrect email address or password.');
      }
      return;
    }

    completeAuthRedirect();
  };

  // --- CREATE ACCOUNT SUBMIT ---
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const cleanName = fullName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (cleanName.length < 2) {
      errors.fullName = 'Please enter your full name (at least 2 characters).';
    }
    if (!cleanEmail) {
      errors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    const strength = evaluatePasswordStrength(regPassword);
    if (!strength.checks.length) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (!strength.checks.upper) {
      errors.password = 'Include at least one uppercase letter.';
    } else if (!strength.checks.lower) {
      errors.password = 'Include at least one lowercase letter.';
    } else if (!strength.checks.number) {
      errors.password = 'Include at least one number.';
    }

    if (!regConfirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (regPassword !== regConfirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    const res = await registerCustomer({
      fullName: cleanName,
      email: cleanEmail,
      password: regPassword,
      confirmPassword: regConfirmPassword,
    });
    setIsSubmitting(false);

    if (!res.success) {
      if (res.field) {
        setFieldErrors({ [res.field]: res.error || 'Please check this field.' });
      } else {
        setFormError(res.error || 'Could not create your account. Please try again.');
      }
      return;
    }

    completeAuthRedirect();
  };

  // --- FORGOT PASSWORD SUBMIT (Issues secure reset link) ---
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setFieldErrors({ forgotEmail: 'Please enter your registered email address.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFieldErrors({ forgotEmail: 'Please enter a valid email address.' });
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    const res = await requestPasswordReset(cleanEmail);
    setIsSubmitting(false);

    if (!res.success || !res.resetUrl) {
      setFieldErrors({ forgotEmail: res.error || 'No account found with that email address.' });
      return;
    }

    setResetLinkIssued({
      email: res.email || cleanEmail,
      url: res.resetUrl,
      expiresInMinutes: res.expiresInMinutes || 15,
    });
  };

  const handleOpenResetLink = () => {
    if (!resetLinkIssued?.url) return;
    const urlObj = new URL(resetLinkIssued.url, window.location.origin);
    const token = urlObj.searchParams.get('token') || '';
    const email = urlObj.searchParams.get('email') || '';
    navigateToAuth('reset-password', { token, email });
  };

  // --- RESET PASSWORD SUBMIT (Link token + new password) ---
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken) {
      setFormError('This password reset link is missing or invalid. Please request a new link.');
      return;
    }

    const errors: Record<string, string> = {};
    const strength = evaluatePasswordStrength(newPassword);
    if (!strength.checks.length) errors.newPassword = 'Password must be at least 8 characters long.';
    else if (!strength.checks.upper) errors.newPassword = 'Include at least one uppercase letter.';
    else if (!strength.checks.lower) errors.newPassword = 'Include at least one lowercase letter.';
    else if (!strength.checks.number) errors.newPassword = 'Include at least one number.';

    if (!confirmNewPassword) {
      errors.confirmNewPassword = 'Please confirm your new password.';
    } else if (newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    const res = await confirmPasswordReset(resetToken, newPassword, confirmNewPassword);
    setIsSubmitting(false);

    if (!res.success) {
      if (res.field) {
        setFieldErrors({ [res.field]: res.error || 'Please check this field.' });
      } else {
        setFormError(res.error || 'Could not reset password.');
      }
      return;
    }

    setResetCompleted(true);
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const destinationHint =
    authReturnTo?.type === 'checkout'
      ? 'Your shopping bag is saved and ready for checkout once you sign in.'
      : null;

  const inputBaseClass = (hasError?: boolean) =>
    `w-full h-12 px-4 bg-white rounded-xl border text-sm text-[#242424] placeholder:text-[#A49B95] transition-colors duration-150 focus:outline-hidden ${
      hasError
        ? 'border-[#B9524C] focus:border-[#B9524C] focus:ring-2 focus:ring-[#B9524C]/15'
        : 'border-[#E6DDD7] hover:border-[#CFB8AF] focus:border-[#B8867C] focus:ring-2 focus:ring-[#D9A6A0]/25'
    }`;

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-[#242424] lg:grid lg:grid-cols-12">
      {/* LEFT PANEL: Desktop Luxury Split-Screen Editorial Visual */}
      <aside className="hidden lg:flex lg:col-span-5 xl:col-span-6 relative bg-[#EDE7E1] overflow-hidden flex-col justify-between">
        <img
          src={authEditorialImg}
          alt="Curated everyday essentials arranged on warm travertine stone with rose-gold accents"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#24201E]/75 via-[#24201E]/18 to-[#24201E]/25"
          aria-hidden="true"
        />

        {/* Top Editorial Brand Mark */}
        <div className="relative z-10 p-10 xl:p-12 flex items-center justify-between">
          <button
            type="button"
            onClick={returnToHome}
            className="flex items-center gap-3 text-left group cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white/80 rounded-xl"
          >
            <img
              src={BRAND_LOGO_URL}
              alt="The Everyday Editz"
              className="w-10 h-10 rounded-full object-cover ring-1 ring-white/50 shadow-sm"
            />
            <div>
              <div className="text-sm font-semibold tracking-[0.16em] text-white uppercase">
                The Everyday Editz
              </div>
              <div className="text-[11px] text-white/75 tracking-wider">everyday_editz.in</div>
            </div>
          </button>
        </div>

        {/* Bottom Editorial Copy */}
        <div className="relative z-10 p-10 xl:p-12 max-w-lg space-y-5">
          <div className="w-10 h-px bg-[#D9A6A0]" aria-hidden="true" />
          <h2 className="font-serif-luxury text-4xl xl:text-[2.75rem] font-medium text-white leading-[1.12]">
            Thoughtful finds, crafted for calmer routines.
          </h2>
          <p className="text-sm text-white/82 leading-relaxed">
            Sign in to keep your shopping bag, saved addresses, and Delhivery order updates seamlessly in sync across every visit.
          </p>
          <div className="pt-3 border-t border-white/20 flex items-center gap-6 text-[11px] uppercase tracking-[0.14em] text-white/75">
            <span>Saved Bag</span>
            <span className="w-1 h-1 rounded-full bg-[#D9A6A0]" aria-hidden="true" />
            <span>Express Checkout</span>
            <span className="w-1 h-1 rounded-full bg-[#D9A6A0]" aria-hidden="true" />
            <span>Editz Rewards</span>
          </div>
        </div>
      </aside>

      {/* RIGHT PANEL: Pearl White Authentication Canvas */}
      <div className="lg:col-span-7 xl:col-span-6 min-h-screen flex flex-col justify-between bg-[#FAF8F6]">
        {/* Top Utility Header */}
        <header className="w-full px-5 sm:px-8 lg:px-12 pt-6 pb-4 flex items-center justify-between border-b border-[#EFE8E2] lg:border-b-0">
          <button
            type="button"
            onClick={returnToHome}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#5C534E] hover:text-[#242424] transition-colors cursor-pointer py-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </button>

          {/* Compact mobile brand mark */}
          <button
            type="button"
            onClick={returnToHome}
            className="flex lg:hidden items-center gap-2 cursor-pointer"
          >
            <img
              src={BRAND_LOGO_URL}
              alt="The Everyday Editz"
              className="w-7 h-7 rounded-full object-cover ring-1 ring-[#D9A6A0]/60"
            />
            <span className="text-xs font-bold tracking-[0.12em] uppercase text-[#242424]">
              Everyday Editz
            </span>
          </button>

          {/* Preserved Cart Indicator */}
          {cartCount > 0 ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-[#5C534E]">
              <ShoppingBag className="w-3.5 h-3.5 text-[#B8867C]" />
              <span className="tabular-nums font-medium">{cartCount} in bag</span>
            </div>
          ) : (
            <span className="text-[11px] tracking-[0.14em] uppercase text-[#9A8E87] hidden sm:inline">
              Member Access
            </span>
          )}
        </header>

        {/* Centered Form Canvas */}
        <main className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8 sm:py-12">
          <div key={routeView} className="w-full max-w-[432px] animate-auth-enter">
            {/* Segmented Mode Switcher for Sign In / Create Account */}
            {(routeView === 'login' || routeView === 'register') && (
              <div
                className="flex items-center gap-8 border-b border-[#E9E0D9] mb-8"
                role="tablist"
                aria-label="Authentication mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={routeView === 'login'}
                  onClick={() => navigateToAuth('login')}
                  className={`pb-3.5 text-sm font-medium transition-colors relative cursor-pointer ${
                    routeView === 'login'
                      ? 'text-[#242424]'
                      : 'text-[#847A74] hover:text-[#242424]'
                  }`}
                >
                  Sign In
                  {routeView === 'login' && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#B8867C]" />
                  )}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={routeView === 'register'}
                  onClick={() => navigateToAuth('register')}
                  className={`pb-3.5 text-sm font-medium transition-colors relative cursor-pointer ${
                    routeView === 'register'
                      ? 'text-[#242424]'
                      : 'text-[#847A74] hover:text-[#242424]'
                  }`}
                >
                  Create Account
                  {routeView === 'register' && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#B8867C]" />
                  )}
                </button>
              </div>
            )}

            {/* Preserved Cart / Checkout Destination Context */}
            {destinationHint && (routeView === 'login' || routeView === 'register') && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-[#F4ECE7] border border-[#E5D4CB] text-xs text-[#4F4641] flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-[#9E6E65] shrink-0" />
                <span>{destinationHint}</span>
              </div>
            )}

            {/* Global Form Error Banner */}
            {formError && (
              <div
                role="alert"
                className="mb-6 px-4 py-3 rounded-xl bg-[#FDF2F2] border border-[#EBCAC8] text-xs text-[#8D322D] flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-[#B9524C] shrink-0 mt-0.5" />
                <span className="leading-relaxed">{formError}</span>
              </div>
            )}

            {/* ===================================================== */}
            {/* VIEW 1: SIGN IN (/login)                              */}
            {/* ===================================================== */}
            {routeView === 'login' && (
              <div>
                <div className="mb-7">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#9E6E65] font-medium mb-2">
                    The Everyday Editz
                  </p>
                  <h1 className="font-serif-luxury text-4xl sm:text-[2.6rem] font-medium text-[#242424] leading-[1.08]">
                    Welcome Back
                  </h1>
                  <p className="text-sm text-[#6E6560] mt-2 leading-relaxed">
                    Sign in with your email and password to access orders, saved finds, and checkout.
                  </p>
                </div>

                <form onSubmit={handleSignInSubmit} noValidate className="space-y-5">
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-medium text-[#3D3632] mb-1.5"
                    >
                      Email Address
                    </label>
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        clearFieldError('email');
                      }}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                      className={inputBaseClass(Boolean(fieldErrors.email))}
                    />
                    {fieldErrors.email && (
                      <p id="login-email-error" className="mt-1.5 text-xs text-[#A33D38]">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-medium text-[#3D3632]"
                      >
                        Password
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        name="password"
                        type={showLoginPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          clearFieldError('password');
                        }}
                        aria-invalid={Boolean(fieldErrors.password)}
                        aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                        className={`${inputBaseClass(Boolean(fieldErrors.password))} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#7D736D] hover:text-[#242424] transition-colors cursor-pointer"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p id="login-password-error" className="mt-1.5 text-xs text-[#A33D38]">
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>

                  {/* Remember Me + Forgot Password */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-[#CFC4BC] accent-[#242424] cursor-pointer"
                      />
                      <span className="text-xs text-[#59504B]">Keep me signed in</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        if (loginEmail.includes('@')) setForgotEmail(loginEmail.trim());
                        navigateToAuth('forgot-password');
                      }}
                      className="text-xs font-medium text-[#9E6E65] hover:text-[#242424] transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Primary Sign In CTA */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-[#242424] hover:bg-[#141414] active:scale-[0.995] text-[#FAF8F6] text-sm font-medium tracking-wide transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed shadow-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#D9A6A0]" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4 text-[#D9A6A0]" />
                      </>
                    )}
                  </button>
                </form>

                {/* Link to Create Account */}
                <p className="mt-8 text-center text-xs text-[#6E6560]">
                  New to The Everyday Editz?{' '}
                  <button
                    type="button"
                    onClick={() => navigateToAuth('register')}
                    className="font-semibold text-[#242424] underline decoration-[#D9A6A0] underline-offset-4 hover:text-[#9E6E65] transition-colors cursor-pointer"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            )}

            {/* ===================================================== */}
            {/* VIEW 2: CREATE ACCOUNT (/register)                    */}
            {/* ===================================================== */}
            {routeView === 'register' && (
              <div>
                <div className="mb-6">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#9E6E65] font-medium mb-2">
                    Join The Everyday Editz
                  </p>
                  <h1 className="font-serif-luxury text-4xl sm:text-[2.5rem] font-medium text-[#242424] leading-[1.08]">
                    Create Account
                  </h1>
                  <p className="text-sm text-[#6E6560] mt-2 leading-relaxed">
                    Save your favourite finds, track parcels, and check out faster with one simple account.
                  </p>
                </div>

                <form onSubmit={handleRegisterSubmit} noValidate className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="reg-fullname" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="reg-fullname"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Ananya Sharma"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        clearFieldError('fullName');
                      }}
                      aria-invalid={Boolean(fieldErrors.fullName)}
                      aria-describedby={fieldErrors.fullName ? 'reg-fullname-error' : undefined}
                      className={inputBaseClass(Boolean(fieldErrors.fullName))}
                    />
                    {fieldErrors.fullName && (
                      <p id="reg-fullname-error" className="mt-1.5 text-xs text-[#A33D38]">
                        {fieldErrors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Email Address */}
                  <div>
                    <label htmlFor="reg-email" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="reg-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={regEmail}
                      onChange={(e) => {
                        setRegEmail(e.target.value);
                        clearFieldError('email');
                      }}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? 'reg-email-error' : undefined}
                      className={inputBaseClass(Boolean(fieldErrors.email))}
                    />
                    {fieldErrors.email && (
                      <p id="reg-email-error" className="mt-1.5 text-xs text-[#A33D38]">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="reg-password" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="reg-password"
                        name="password"
                        type={showRegPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          clearFieldError('password');
                        }}
                        aria-invalid={Boolean(fieldErrors.password)}
                        aria-describedby={fieldErrors.password ? 'reg-password-error' : undefined}
                        className={`${inputBaseClass(Boolean(fieldErrors.password))} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((prev) => !prev)}
                        aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#7D736D] hover:text-[#242424] transition-colors cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p id="reg-password-error" className="mt-1.5 text-xs text-[#A33D38]">
                        {fieldErrors.password}
                      </p>
                    )}
                    <PasswordStrengthMeter password={regPassword} />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="reg-confirm-password" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="reg-confirm-password"
                        name="confirmPassword"
                        type={showRegConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Re-enter your password"
                        value={regConfirmPassword}
                        onChange={(e) => {
                          setRegConfirmPassword(e.target.value);
                          clearFieldError('confirmPassword');
                        }}
                        aria-invalid={Boolean(fieldErrors.confirmPassword)}
                        aria-describedby={fieldErrors.confirmPassword ? 'reg-confirm-error' : undefined}
                        className={`${inputBaseClass(Boolean(fieldErrors.confirmPassword))} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword((prev) => !prev)}
                        aria-label={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#7D736D] hover:text-[#242424] transition-colors cursor-pointer"
                      >
                        {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p id="reg-confirm-error" className="mt-1.5 text-xs text-[#A33D38]">
                        {fieldErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Primary Create Account CTA */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 mt-2 rounded-xl bg-[#242424] hover:bg-[#141414] active:scale-[0.995] text-[#FAF8F6] text-sm font-medium tracking-wide transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed shadow-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#D9A6A0]" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight className="w-4 h-4 text-[#D9A6A0]" />
                      </>
                    )}
                  </button>
                </form>

                {/* Link to Sign In */}
                <p className="mt-7 text-center text-xs text-[#6E6560]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigateToAuth('login')}
                    className="font-semibold text-[#242424] underline decoration-[#D9A6A0] underline-offset-4 hover:text-[#9E6E65] transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            )}

            {/* ===================================================== */}
            {/* VIEW 3: FORGOT PASSWORD (/forgot-password)            */}
            {/* ===================================================== */}
            {routeView === 'forgot-password' && (
              <div>
                <div className="mb-7">
                  <div className="w-11 h-11 rounded-2xl bg-[#F4ECE7] border border-[#E5D4CB] text-[#9E6E65] flex items-center justify-center mb-5">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h1 className="font-serif-luxury text-4xl font-medium text-[#242424] leading-[1.08]">
                    {resetLinkIssued ? 'Reset Link Ready' : 'Forgot Password'}
                  </h1>
                  <p className="text-sm text-[#6E6560] mt-2 leading-relaxed">
                    {resetLinkIssued
                      ? `We created a secure password-reset link for ${resetLinkIssued.email} (valid for ${resetLinkIssued.expiresInMinutes} minutes).`
                      : 'Enter your registered email address and we will prepare a secure password-reset link.'}
                  </p>
                </div>

                {resetLinkIssued ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#F4ECE7] border border-[#E5D4CB] space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] uppercase tracking-[0.12em] text-[#8C5F56] font-medium">
                          Secure Reset Link
                        </span>
                        <span className="text-[11px] text-[#6E6560]">
                          Expires in {resetLinkIssued.expiresInMinutes} min
                        </span>
                      </div>
                      <p className="text-xs text-[#4F4641] break-all font-mono bg-white px-3 py-2 rounded-lg border border-[#E6DDD7]">
                        {typeof window !== 'undefined'
                          ? `${window.location.origin}${resetLinkIssued.url}`
                          : resetLinkIssued.url}
                      </p>
                      <div className="flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={handleOpenResetLink}
                          className="flex-1 min-h-[42px] px-4 py-2 rounded-xl bg-[#242424] hover:bg-[#141414] text-[#FAF8F6] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <span>Reset Password Now</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#D9A6A0]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const fullUrl =
                              typeof window !== 'undefined'
                                ? `${window.location.origin}${resetLinkIssued.url}`
                                : resetLinkIssued.url;
                            navigator.clipboard?.writeText(fullUrl).catch(() => {});
                            showToast('Reset link copied', 'info');
                          }}
                          className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white border border-[#DEC9BF] text-xs font-medium text-[#242424] hover:bg-[#FAF8F6] flex items-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#9E6E65]" />
                          <span>Copy Link</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setResetLinkIssued(null)}
                      className="w-full h-11 rounded-xl border border-[#E4D9D2] bg-white hover:bg-[#F5EFEA] text-xs font-medium text-[#242424] transition-colors cursor-pointer"
                    >
                      Try a Different Email
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} noValidate className="space-y-5">
                    <div>
                      <label htmlFor="forgot-email" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                        Email Address
                      </label>
                      <input
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          clearFieldError('forgotEmail');
                        }}
                        aria-invalid={Boolean(fieldErrors.forgotEmail)}
                        className={inputBaseClass(Boolean(fieldErrors.forgotEmail))}
                      />
                      {fieldErrors.forgotEmail && (
                        <p className="mt-1.5 text-xs text-[#A33D38]">{fieldErrors.forgotEmail}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 rounded-xl bg-[#242424] hover:bg-[#141414] text-[#FAF8F6] text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#D9A6A0]" />
                          <span>Generating reset link...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Reset Link</span>
                          <ArrowRight className="w-4 h-4 text-[#D9A6A0]" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                <p className="mt-7 text-center text-xs text-[#6E6560]">
                  Remembered your password?{' '}
                  <button
                    type="button"
                    onClick={() => navigateToAuth('login')}
                    className="font-semibold text-[#242424] underline decoration-[#D9A6A0] underline-offset-4 hover:text-[#9E6E65] cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </p>
              </div>
            )}

            {/* ===================================================== */}
            {/* VIEW 4: RESET PASSWORD (/reset-password?token=...)    */}
            {/* ===================================================== */}
            {routeView === 'reset-password' && (
              <div>
                <div className="mb-7">
                  <div className="w-11 h-11 rounded-2xl bg-[#F4ECE7] border border-[#E5D4CB] text-[#9E6E65] flex items-center justify-center mb-5">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h1 className="font-serif-luxury text-4xl font-medium text-[#242424] leading-[1.08]">
                    {resetCompleted ? 'Password Updated' : 'Choose New Password'}
                  </h1>
                  <p className="text-sm text-[#6E6560] mt-2 leading-relaxed">
                    {resetCompleted
                      ? 'Your password has been updated securely. You can now sign in with your new password.'
                      : resetTargetEmail
                        ? `Create a strong new password for ${resetTargetEmail}.`
                        : 'Create a strong new password for your Everyday Editz account.'}
                  </p>
                </div>

                {resetCompleted ? (
                  <button
                    type="button"
                    onClick={() => navigateToAuth('login')}
                    className="w-full h-12 rounded-xl bg-[#242424] hover:bg-[#141414] text-[#FAF8F6] text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Sign In Now</span>
                    <ArrowRight className="w-4 h-4 text-[#D9A6A0]" />
                  </button>
                ) : !resetToken ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#FDF2F2] border border-[#EBCAC8] text-xs text-[#8D322D] leading-relaxed">
                      This password reset link is incomplete or has expired. Please request a fresh reset link.
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateToAuth('forgot-password')}
                      className="w-full h-12 rounded-xl bg-[#242424] hover:bg-[#141414] text-[#FAF8F6] text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Request Reset Link</span>
                      <ArrowRight className="w-4 h-4 text-[#D9A6A0]" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetSubmit} noValidate className="space-y-4">
                    <div>
                      <label htmlFor="reset-new-password" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          id="reset-new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Create a strong password"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            clearFieldError('newPassword');
                          }}
                          className={`${inputBaseClass(Boolean(fieldErrors.newPassword))} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#7D736D] hover:text-[#242424] cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {fieldErrors.newPassword && (
                        <p className="mt-1.5 text-xs text-[#A33D38]">{fieldErrors.newPassword}</p>
                      )}
                      <PasswordStrengthMeter password={newPassword} />
                    </div>

                    <div>
                      <label htmlFor="reset-confirm-password" className="block text-xs font-medium text-[#3D3632] mb-1.5">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          id="reset-confirm-password"
                          type={showConfirmNewPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Re-enter your new password"
                          value={confirmNewPassword}
                          onChange={(e) => {
                            setConfirmNewPassword(e.target.value);
                            clearFieldError('confirmNewPassword');
                          }}
                          className={`${inputBaseClass(Boolean(fieldErrors.confirmNewPassword))} pr-11`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                          aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#7D736D] hover:text-[#242424] cursor-pointer"
                        >
                          {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {fieldErrors.confirmNewPassword && (
                        <p className="mt-1.5 text-xs text-[#A33D38]">{fieldErrors.confirmNewPassword}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 mt-2 rounded-xl bg-[#242424] hover:bg-[#141414] text-[#FAF8F6] text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#D9A6A0]" />
                          <span>Updating password...</span>
                        </>
                      ) : (
                        <span>Update Password</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Quiet Legal Footer */}
        <footer className="px-5 sm:px-8 lg:px-12 py-5 border-t border-[#EFE8E2] lg:border-t-0 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#847A74]">
          <span>© 2026 The Everyday Editz · Raftaar Solutions</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActivePolicy('privacy')}
              className="hover:text-[#242424] transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => setActivePolicy('terms')}
              className="hover:text-[#242424] transition-colors cursor-pointer"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => setActivePolicy('contact')}
              className="hover:text-[#242424] transition-colors cursor-pointer"
            >
              Support
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
