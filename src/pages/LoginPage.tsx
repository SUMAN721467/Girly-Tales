import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Phone, Eye, EyeOff, Sparkles, ShieldCheck, Heart, ShoppingBag, ArrowRight, CheckCircle2, Star, LogOut, Clock, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { DatabaseService, RealOrder } from '../lib/databaseService';
import slide1 from '../assets/slide1.jpg';

interface LoginPageProps {
  onNavigate: (page: string, category?: string) => void;
  initialTab?: 'login' | 'signup';
  initialSection?: 'overview' | 'orders' | 'addresses';
}

export const LoginPage: React.FC<LoginPageProps> = ({ 
  onNavigate, 
  initialTab = 'login',
  initialSection = 'overview'
}) => {
  const { user, isLoggedIn, login, signup, logout, resetPassword } = useAuth();
  const { wishlistCount } = useWishlist();

  const [accountTab, setAccountTab] = useState<'overview' | 'orders' | 'addresses'>(initialSection);
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'forgot'>(initialTab);
  const [userOrders, setUserOrders] = useState<RealOrder[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const allOrders = await DatabaseService.getOrders();
      if (user?.email) {
        const matching = allOrders.filter(
          (o) => o.email.toLowerCase() === user.email.toLowerCase()
        );
        setUserOrders(matching.length > 0 ? matching : allOrders);
      } else {
        setUserOrders(allOrders);
      }
    };
    fetchOrders();
  }, [user]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Status & loading
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!loginEmail || !loginPassword) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    setIsSubmitting(true);
    const res = await login(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Invalid credentials. Please try again.');
    } else {
      onNavigate('home');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!signupName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (signupPassword !== signupConfirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('Please agree to our Terms of Service & Privacy Policy.');
      return;
    }

    setIsSubmitting(true);
    const res = await signup(signupName, signupEmail, signupPassword, signupPhone);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to create account. Please try again.');
    } else {
      onNavigate('home');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!forgotEmail) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setIsSubmitting(true);
    const res = await resetPassword(forgotEmail);
    setIsSubmitting(false);

    if (res.success) {
      setForgotSuccess(true);
    } else {
      setErrorMsg(res.error || 'Failed to send reset link.');
    }
  };

  // If user is already logged in, show Account Profile view
  if (isLoggedIn && user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 animate-fade-in">
        <div className="bg-white border border-[#EAE6DB] rounded-3xl p-6 sm:p-10 shadow-sm space-y-8">
          {/* Header Profile Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-8 border-b border-[#EAE6DB] text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-[#967BB6] text-white font-serif font-bold text-3xl flex items-center justify-center shadow-md">
                {user.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="font-sans font-black text-2xl sm:text-3xl text-brand-charcoal uppercase">
                    Hello, {user.name || 'Sabara'}!
                  </h1>
                  <span className="bg-[#FFFDD0] text-[#967BB6] border border-[#EAE6DB] text-[10px] font-black uppercase px-2 py-0.5 rounded">
                    VIP Member
                  </span>
                </div>
                <p className="text-xs text-brand-muted">{user.email || 'contact.sabara@gmail.com'}</p>
                {user.phone && <p className="text-xs text-brand-muted">Phone: {user.phone}</p>}
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 border border-[#EAE6DB] hover:bg-rose-50 hover:border-rose-200 text-brand-charcoal hover:text-rose-600 text-xs font-bold uppercase transition-colors rounded-xl"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Account Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-[#EAE6DB] pb-3">
            <button
              onClick={() => setAccountTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                accountTab === 'overview'
                  ? 'bg-[#1A1821] text-white shadow-xs'
                  : 'bg-[#FAF8F2] text-brand-charcoal hover:bg-[#FFFDD0]'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setAccountTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                accountTab === 'orders'
                  ? 'bg-[#1A1821] text-white shadow-xs'
                  : 'bg-[#FAF8F2] text-brand-charcoal hover:bg-[#FFFDD0]'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>My Orders</span>
            </button>
          </div>

          {/* TAB 1: Overview */}
          {accountTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Shortcuts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => onNavigate('shop')}
                  className="p-5 bg-[#FFFDD0]/60 border border-[#EAE6DB] hover:border-[#967BB6] rounded-2xl cursor-pointer transition-all space-y-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#967BB6] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="font-sans font-black text-sm uppercase text-brand-charcoal">
                    Shop New Drops
                  </h3>
                  <p className="text-xs text-brand-muted">
                    Explore our latest 18K jewels &amp; mulberry silk sets.
                  </p>
                </div>

                <div
                  onClick={() => onNavigate('wishlist')}
                  className="p-5 bg-white border border-[#EAE6DB] hover:border-rose-400 rounded-2xl cursor-pointer transition-all space-y-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Heart className="w-5 h-5 fill-rose-500" />
                  </div>
                  <h3 className="font-sans font-black text-sm uppercase text-brand-charcoal">
                    My Wishlist ({wishlistCount})
                  </h3>
                  <p className="text-xs text-brand-muted">
                    Saved favorites ready for checkout anytime.
                  </p>
                </div>

                <div
                  onClick={() => setAccountTab('orders')}
                  className="p-5 bg-white border border-[#EAE6DB] hover:border-[#967BB6] rounded-2xl cursor-pointer transition-all space-y-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-charcoal text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <h3 className="font-sans font-black text-sm uppercase text-brand-charcoal">
                    My Orders
                  </h3>
                  <p className="text-xs text-brand-muted">
                    Track shipments &amp; download order invoices.
                  </p>
                </div>
              </div>

              {/* Member Exclusive Voucher Banner */}
              <div className="p-4 sm:p-5 bg-[#1A1821] text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[10px] font-bold text-[#FBB6CE] uppercase tracking-widest">
                    ✦ VIP EXCLUSIVE PERK ✦
                  </span>
                  <p className="text-sm font-bold">Use code <strong className="text-[#FFFDD0] underline">GIRLY10</strong> for 10% off today</p>
                </div>
                <button
                  onClick={() => onNavigate('shop')}
                  className="px-6 py-2.5 bg-[#FBB6CE] hover:bg-[#F89CBA] text-[#1A1821] text-xs font-black uppercase tracking-wider rounded-xl transition-colors shrink-0"
                >
                  Shop With Discount
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Orders View (Live Database Orders) */}
          {accountTab === 'orders' && (
            <div className="space-y-6">
              {userOrders.map((ord) => (
                <div key={ord.id} className="border border-[#EAE6DB] rounded-2xl p-5 bg-[#FAF8F2] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EAE6DB]">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-brand-muted">Order #{ord.id}</span>
                      <h4 className="font-bold text-sm text-brand-charcoal">
                        Placed {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </h4>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full w-fit ${
                      ord.status === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ord.status === 'Shipped'
                        ? 'bg-blue-100 text-blue-800'
                        : ord.status === 'Cancelled'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {ord.status === 'Delivered' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {ord.status === 'Shipped' && <Truck className="w-3.5 h-3.5" />}
                      {ord.status === 'Processing' && <Clock className="w-3.5 h-3.5" />}
                      <span>{ord.status}</span>
                    </span>
                  </div>

                  {/* Shipment Tracking Bar */}
                  <div className="py-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-brand-charcoal mb-2">
                      <span className="text-[#967BB6]">Order Placed ✓</span>
                      <span className={ord.status !== 'Pending' ? 'text-[#967BB6]' : 'text-brand-muted'}>
                        Packed {ord.status !== 'Pending' ? '✓' : ''}
                      </span>
                      <span className={ord.status === 'Shipped' || ord.status === 'Delivered' ? 'text-[#967BB6]' : 'text-brand-muted'}>
                        In Transit {ord.status === 'Shipped' || ord.status === 'Delivered' ? '✓' : ''}
                      </span>
                      <span className={ord.status === 'Delivered' ? 'text-emerald-700' : 'text-brand-muted'}>
                        Delivered {ord.status === 'Delivered' ? '✓' : ''}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          ord.status === 'Delivered'
                            ? 'bg-emerald-500 w-full'
                            : ord.status === 'Shipped'
                            ? 'bg-[#967BB6] w-3/4'
                            : ord.status === 'Processing'
                            ? 'bg-[#967BB6] w-2/5'
                            : 'bg-gray-400 w-1/5'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 pt-2 text-xs">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="font-medium text-brand-charcoal">{item}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t border-[#EAE6DB] font-black text-sm">
                      <span>Total ({ord.paymentMethod})</span>
                      <span>₹{ord.total}</span>
                    </div>
                  </div>
                </div>
              ))}

              {userOrders.length === 0 && (
                <div className="py-12 text-center text-brand-muted space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto text-brand-muted-light" />
                  <p className="text-sm font-bold">No orders found in your account.</p>
                  <button
                    onClick={() => onNavigate('shop')}
                    className="mt-2 px-5 py-2 bg-[#967BB6] text-white text-xs font-bold rounded-xl"
                  >
                    Start Shopping
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FFFDD0]/40 py-8 sm:py-14 select-none animate-fade-in">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Card Container */}
        <div className="bg-white border border-[#EAE6DB] shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
          
          {/* ================= LEFT EDITORIAL COLUMN (5 Cols) ================= */}
          <div className="lg:col-span-5 bg-[#1A1821] text-white p-6 sm:p-10 flex flex-col justify-between relative overflow-hidden">
            {/* Background Texture Overlay */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <img
                src={slide1}
                alt="Background"
                className="w-full h-full object-cover mix-blend-overlay"
              />
            </div>

            <div className="relative z-10 space-y-6">
              {/* Brand Logo and Subtitle */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#FBB6CE]">
                  WELCOME TO GIRLY TALES
                </span>
                <h2 className="font-sans font-black text-2xl sm:text-3xl text-white uppercase tracking-tight leading-snug">
                  EVERYDAY LUXURY &amp; RADIANT SHINE
                </h2>
                <p className="text-xs text-white/70 leading-relaxed max-w-sm">
                  Join our member circle to unlock secret sales, instant size exchanges, and 18K anti-tarnish jewelry perks.
                </p>
              </div>

              {/* VIP Member Perks Checklist */}
              <div className="space-y-3.5 pt-2 border-t border-white/10 text-xs text-white/90">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#967BB6] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-white block">10% Off First Order</strong>
                    <span className="text-white/60 text-[11px]">Automatically use code GIRLY10 at checkout</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#967BB6] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-white block">Fast Express Pan-India Delivery</strong>
                    <span className="text-white/60 text-[11px]">Free shipping on prepaid orders over ₹999</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#967BB6] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-white block">100% Anti-Tarnish Guarantee</strong>
                    <span className="text-white/60 text-[11px]">Shower-safe, waterproof &amp; hypoallergenic</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial Quote Box */}
            <div className="relative z-10 mt-8 p-4 bg-white/5 backdrop-blur-xs border border-white/10 space-y-2">
              <div className="flex items-center gap-1 text-[#E5A823]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#E5A823]" />
                ))}
              </div>
              <p className="text-xs text-white/90 italic">
                "The mulberry silk set is the softest sleepwear I've ever worn. Girly Tales is pure bliss!"
              </p>
              <div className="flex items-center justify-between text-[11px] text-white/60 pt-1">
                <span>— Ananya V., Mumbai</span>
                <span className="text-[#FBB6CE] font-bold">Verified Buyer</span>
              </div>
            </div>
          </div>

          {/* ================= RIGHT FORM COLUMN (7 Cols) ================= */}
          <div className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-center bg-white">
            
            {/* Top Navigation Tabs */}
            {activeTab !== 'forgot' && (
              <div className="flex border-b border-[#EAE6DB] mb-6 sm:mb-8">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-center transition-all border-b-2 ${
                    activeTab === 'login'
                      ? 'border-[#967BB6] text-[#967BB6]'
                      : 'border-transparent text-brand-muted hover:text-brand-charcoal'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup');
                    setErrorMsg('');
                  }}
                  className={`flex-1 py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-center transition-all border-b-2 ${
                    activeTab === 'signup'
                      ? 'border-[#967BB6] text-[#967BB6]'
                      : 'border-transparent text-brand-muted hover:text-brand-charcoal'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Error Notification Banner */}
            {errorMsg && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium flex items-center gap-2 animate-slide-up">
                <span className="font-bold">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* ================= 1. SIGN IN FORM ================= */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4 text-left animate-fade-in">
                <div>
                  <h3 className="font-sans font-black text-xl sm:text-2xl text-brand-charcoal uppercase tracking-tight">
                    Welcome Back
                  </h3>
                  <p className="text-xs text-brand-muted mt-1">
                    Enter your email and password to access your account.
                  </p>
                </div>

                <div className="space-y-3.5 pt-2">
                  {/* Email Field */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-muted">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-[#FFFDD0]/30 border border-[#EAE6DB] text-xs sm:text-sm text-brand-charcoal placeholder-brand-muted/60 focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('forgot');
                          setErrorMsg('');
                        }}
                        className="text-[11px] text-[#967BB6] font-bold hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-muted">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-10 py-3 bg-[#FFFDD0]/30 border border-[#EAE6DB] text-xs sm:text-sm text-brand-charcoal placeholder-brand-muted/60 focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-brand-muted hover:text-brand-charcoal"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 accent-[#967BB6] rounded cursor-pointer"
                      />
                      <span className="text-xs text-brand-muted">Remember me on this device</span>
                    </label>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-3 py-3.5 bg-[#1A1821] hover:bg-[#967BB6] text-white text-xs font-black uppercase tracking-widest transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Signing In...</span>
                  ) : (
                    <>
                      <span>Sign In to Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Switch to Signup Prompt */}
                <p className="text-center text-xs text-brand-muted pt-3">
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('signup');
                      setErrorMsg('');
                    }}
                    className="font-bold text-[#967BB6] hover:underline"
                  >
                    Create Account
                  </button>
                </p>
              </form>
            )}

            {/* ================= 2. CREATE ACCOUNT FORM ================= */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-3.5 text-left animate-fade-in">
                <div>
                  <h3 className="font-sans font-black text-xl sm:text-2xl text-brand-charcoal uppercase tracking-tight">
                    Create Your Account
                  </h3>
                  <p className="text-xs text-brand-muted mt-1">
                    Sign up now &amp; get 10% off your first order automatically!
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-muted">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        placeholder="Ananya Sharma"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDD0]/30 border border-[#EAE6DB] text-xs sm:text-sm text-brand-charcoal placeholder-brand-muted/60 focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Email & Phone in 2 Cols on Tablet/Desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-muted">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          placeholder="ananya@example.com"
                          required
                          className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDD0]/30 border border-[#EAE6DB] text-xs sm:text-sm text-brand-charcoal placeholder-brand-muted/60 focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                        Phone (Optional)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-muted">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="tel"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDD0]/30 border border-[#EAE6DB] text-xs sm:text-sm text-brand-charcoal placeholder-brand-muted/60 focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Passwords in 2 Cols */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-muted">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="Min. 6 chars"
                          required
                          className="w-full pl-10 pr-9 py-2.5 bg-[#FFFDD0]/30 border border-[#EAE6DB] text-xs sm:text-sm text-brand-charcoal placeholder-brand-muted/60 focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-brand-muted hover:text-brand-charcoal"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-muted">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={signupConfirm}
                          onChange={(e) => setSignupConfirm(e.target.value)}
                          placeholder="Re-enter password"
                          required
                          className="w-full pl-10 pr-9 py-2.5 bg-[#FFFDD0]/30 border border-[#EAE6DB] text-xs sm:text-sm text-brand-charcoal placeholder-brand-muted/60 focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-brand-muted hover:text-brand-charcoal"
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Agree Terms Checkbox */}
                  <div className="pt-1">
                    <label className="flex items-start gap-2 cursor-pointer text-[11px] text-brand-muted">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="w-4 h-4 mt-0.5 accent-[#967BB6] rounded cursor-pointer shrink-0"
                      />
                      <span>
                        I agree to the <a href="#terms" className="underline font-bold text-brand-charcoal">Terms of Service</a> and <a href="#privacy" className="underline font-bold text-brand-charcoal">Privacy Policy</a>.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Create Account Button (Pink / Lavender style) */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-3 py-3.5 bg-[#FBB6CE] hover:bg-[#F89CBA] text-[#1A1821] text-xs font-black uppercase tracking-widest transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Creating Account...</span>
                  ) : (
                    <>
                      <span>Join Girly Tales Circle</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Switch to Sign In */}
                <p className="text-center text-xs text-brand-muted pt-2">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setErrorMsg('');
                    }}
                    className="font-bold text-[#967BB6] hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </form>
            )}

            {/* ================= 3. FORGOT PASSWORD VIEW ================= */}
            {activeTab === 'forgot' && (
              <div className="space-y-4 text-left animate-fade-in">
                <div>
                  <h3 className="font-sans font-black text-xl sm:text-2xl text-brand-charcoal uppercase tracking-tight">
                    Reset Password
                  </h3>
                  <p className="text-xs text-brand-muted mt-1">
                    Enter your email address and we'll send you a recovery link.
                  </p>
                </div>

                {forgotSuccess ? (
                  <div className="p-5 bg-emerald-50 border border-emerald-200 text-center space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h4 className="font-bold text-sm text-emerald-900">Recovery Link Dispatched!</h4>
                    <p className="text-xs text-emerald-700">
                      We've sent password reset instructions to <strong>{forgotEmail}</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setForgotSuccess(false);
                      }}
                      className="mt-2 px-4 py-2 bg-[#1A1821] text-white text-xs font-bold uppercase tracking-wider"
                    >
                      Back to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                        Registered Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-muted">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          className="w-full pl-10 pr-4 py-3 bg-[#FFFDD0]/30 border border-[#EAE6DB] text-xs sm:text-sm text-brand-charcoal placeholder-brand-muted/60 focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-[#967BB6] hover:bg-brand-lavender-dark text-white text-xs font-black uppercase tracking-widest transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? <span>Sending...</span> : <span>Send Reset Instructions</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setErrorMsg('');
                      }}
                      className="w-full text-center text-xs font-bold text-brand-muted hover:text-brand-charcoal pt-2 block"
                    >
                      ← Return to Sign In
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Bottom Security Trust Badge */}
            <div className="flex items-center justify-center gap-2 pt-6 mt-6 border-t border-[#EAE6DB] text-[11px] text-brand-muted">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>256-bit Secure End-to-End SSL Encryption</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
