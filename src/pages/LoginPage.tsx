import React, { useState, useEffect } from 'react';
import { 
  Mail, Phone, Sparkles, Heart, 
  ShoppingBag, CheckCircle2, LogOut, Clock, 
  Truck, Search, ArrowRight, User as UserIcon,
  ShieldCheck, Package, ChevronRight, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { DatabaseService, RealOrder } from '../lib/databaseService';

interface LoginPageProps {
  onNavigate: (page: string, category?: string) => void;
  initialTab?: 'login' | 'signup';
  initialSection?: 'overview' | 'orders' | 'addresses';
}

export const LoginPage: React.FC<LoginPageProps> = ({ 
  onNavigate, 
  initialSection = 'overview'
}) => {
  const { user, isLoggedIn, logout, openAuthModal } = useAuth();
  const { wishlistCount } = useWishlist();

  const [accountTab, setAccountTab] = useState<'overview' | 'orders' | 'tracker'>(
    initialSection === 'orders' ? 'orders' : 'overview'
  );
  const [userOrders, setUserOrders] = useState<RealOrder[]>([]);
  const [guestOrderId, setGuestOrderId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<RealOrder | null>(null);
  const [trackerError, setTrackerError] = useState('');
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);

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

  const handleTrackGuestOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackerError('');
    setTrackedOrder(null);
    const query = guestOrderId.trim().toUpperCase();

    if (!query) {
      setTrackerError('Please enter your Order ID (e.g. GT-849201).');
      return;
    }

    setIsSearchingOrder(true);
    try {
      const allOrders = await DatabaseService.getOrders();
      const found = allOrders.find(
        (o) => o.id.toUpperCase() === query || o.id.toUpperCase().includes(query)
      );

      if (found) {
        setTrackedOrder(found);
      } else {
        setTrackerError(`No order found matching "${query}". Please check the ID or contact support.`);
      }
    } catch (err) {
      setTrackerError('Failed to search order. Please try again.');
    } finally {
      setIsSearchingOrder(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 animate-fade-in space-y-8">
      
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAE6DB]">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#967BB6] bg-[#FFFDD0] border border-[#EAE6DB] px-3 py-1 rounded-full">
            ✦ Girly Tales Member Lounge ✦
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-brand-charcoal font-medium mt-2">
            {isLoggedIn && user ? `Hello, ${user.name || 'Member'}!` : 'My Account & Orders'}
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted mt-1">
            {isLoggedIn 
              ? 'Manage your orders, shipment status, and member perks.'
              : 'Track your deliveries or sign in to access your saved wishlist and VIP perks.'
            }
          </p>
        </div>

        {isLoggedIn ? (
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#EAE6DB] hover:bg-rose-50 hover:border-rose-200 text-brand-charcoal hover:text-rose-600 text-xs font-bold uppercase transition-colors rounded-2xl w-fit"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            className="flex items-center gap-2 px-6 py-3 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-xs transition-all w-fit active:scale-95"
          >
            <UserIcon className="w-4 h-4" />
            <span>Sign In / Register</span>
          </button>
        )}
      </div>

      {/* 2. LOGGED IN MEMBER VIEW */}
      {isLoggedIn && user ? (
        <div className="space-y-8">
          {/* Member Card */}
          <div className="bg-white border border-[#EAE6DB] rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#967BB6] to-[#7F62A1] text-white font-serif font-black text-2xl flex items-center justify-center shadow-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h3 className="font-bold text-lg text-brand-charcoal">{user.name}</h3>
                  <span className="bg-[#FFFDD0] text-[#967BB6] border border-[#EAE6DB] text-[10px] font-black uppercase px-2 py-0.5 rounded">
                    VIP Member
                  </span>
                </div>
                <p className="text-xs text-brand-muted">{user.email}</p>
                {user.phone && <p className="text-xs text-brand-muted font-mono">{user.phone}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-center">
                <span className="text-[10px] font-bold uppercase text-brand-muted block">Orders</span>
                <span className="text-base font-black text-brand-charcoal">{userOrders.length}</span>
              </div>
              <div className="px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-center">
                <span className="text-[10px] font-bold uppercase text-brand-muted block">Wishlist</span>
                <span className="text-base font-black text-rose-500">{wishlistCount}</span>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
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
              <span>My Orders ({userOrders.length})</span>
            </button>
          </div>

          {/* OVERVIEW TAB */}
          {accountTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => onNavigate('shop')}
                  className="p-5 bg-[#FFFDD0]/60 border border-[#EAE6DB] hover:border-[#967BB6] rounded-3xl cursor-pointer transition-all space-y-2 group shadow-xs"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#967BB6] text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
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
                  className="p-5 bg-white border border-[#EAE6DB] hover:border-rose-400 rounded-3xl cursor-pointer transition-all space-y-2 group shadow-xs"
                >
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
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
                  className="p-5 bg-white border border-[#EAE6DB] hover:border-[#967BB6] rounded-3xl cursor-pointer transition-all space-y-2 group shadow-xs"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#1A1821] text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <h3 className="font-sans font-black text-sm uppercase text-brand-charcoal">
                    My Orders ({userOrders.length})
                  </h3>
                  <p className="text-xs text-brand-muted">
                    Track shipments &amp; download order invoices.
                  </p>
                </div>
              </div>

              {/* VIP Promo Banner */}
              <div className="p-5 bg-[#1A1821] text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[10px] font-bold text-[#FBB6CE] uppercase tracking-widest">
                    ✦ VIP EXCLUSIVE CODE ✦
                  </span>
                  <p className="text-sm font-bold">Use code <strong className="text-[#FFFDD0] underline font-mono">GIRLY10</strong> for 10% off today</p>
                </div>
                <button
                  onClick={() => onNavigate('shop')}
                  className="px-6 py-2.5 bg-[#FBB6CE] hover:bg-[#F89CBA] text-[#1A1821] text-xs font-black uppercase tracking-wider rounded-xl transition-colors shrink-0"
                >
                  Shop Now
                </button>
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {accountTab === 'orders' && (
            <div className="space-y-6">
              {userOrders.map((ord) => (
                <div key={ord.id} className="border border-[#EAE6DB] rounded-3xl p-6 bg-white shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#EAE6DB]">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-brand-muted">Order ID</span>
                      <h4 className="font-mono font-bold text-sm text-brand-charcoal">{ord.id}</h4>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full w-fit ${
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

                  {/* Progress Bar */}
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
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
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
                      <div key={idx} className="flex items-center justify-between py-1 border-b border-[#FAF8F2]">
                        <span className="font-medium text-brand-charcoal">{item}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-3 font-black text-sm text-brand-charcoal">
                      <span>Total ({ord.paymentMethod})</span>
                      <span>₹{ord.total}</span>
                    </div>
                  </div>
                </div>
              ))}

              {userOrders.length === 0 && (
                <div className="py-14 text-center text-brand-muted space-y-3 bg-white rounded-3xl border border-[#EAE6DB]">
                  <ShoppingBag className="w-10 h-10 mx-auto text-brand-muted-light" />
                  <p className="text-sm font-bold text-brand-charcoal">No orders found in your account.</p>
                  <p className="text-xs text-brand-muted">Your purchase history will appear here once you place an order.</p>
                  <button
                    onClick={() => onNavigate('shop')}
                    className="mt-2 px-6 py-2.5 bg-[#967BB6] text-white text-xs font-bold rounded-2xl shadow-xs"
                  >
                    Explore Shop
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 3. GUEST VIEW: ORDER TRACKER + ONE-CLICK SIGN IN */
        <div className="space-y-8">
          {/* Guest Sign-in Card */}
          <div className="bg-[#FAF8F2] border border-[#EAE6DB] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="space-y-1.5 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Sparkles className="w-5 h-5 text-[#967BB6]" />
                <h3 className="font-serif text-xl font-medium text-brand-charcoal">
                  Sign In to Your Girly Tales Account
                </h3>
              </div>
              <p className="text-xs text-brand-muted max-w-lg">
                Log in with Email OTP or Google to unlock saved addresses, 1-click checkout, instant size exchanges, and secret member drops.
              </p>
            </div>

            <button
              onClick={() => openAuthModal('login')}
              className="px-8 py-3.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-sm transition-all shrink-0 active:scale-95 flex items-center gap-2"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          </div>

          {/* Guest Live Order Lookup */}
          <div className="bg-white border border-[#EAE6DB] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h3 className="font-serif text-xl text-brand-charcoal font-medium flex items-center gap-2">
                <Package className="w-5 h-5 text-[#967BB6]" />
                <span>Quick Order Tracker</span>
              </h3>
              <p className="text-xs text-brand-muted mt-0.5">
                Placed an order as guest? Enter your Order ID below to view live shipment and delivery updates.
              </p>
            </div>

            <form onSubmit={handleTrackGuestOrder} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-brand-muted absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={guestOrderId}
                  onChange={(e) => setGuestOrderId(e.target.value)}
                  placeholder="e.g. GT-849201"
                  className="w-full pl-11 pr-4 py-3.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm font-mono focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingOrder}
                className="px-6 py-3.5 bg-[#1A1821] hover:bg-[#967BB6] text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-2"
              >
                {isSearchingOrder ? 'Searching...' : 'Track Order'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {trackerError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl">
                {trackerError}
              </div>
            )}

            {/* Tracked Order Result */}
            {trackedOrder && (
              <div className="border border-[#967BB6]/40 bg-[#FAF8F2] rounded-2xl p-6 space-y-4 animate-scale-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EAE6DB]">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-brand-muted">Order ID</span>
                    <h4 className="font-mono font-bold text-sm text-brand-charcoal">{trackedOrder.id}</h4>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full w-fit">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{trackedOrder.status}</span>
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <p><strong className="text-brand-charcoal">Customer:</strong> {trackedOrder.customerName}</p>
                  <p><strong className="text-brand-charcoal">Delivery Address:</strong> {trackedOrder.address}, {trackedOrder.city}, {trackedOrder.state} {trackedOrder.pincode}</p>
                  <p><strong className="text-brand-charcoal">Payment:</strong> {trackedOrder.paymentMethod}</p>
                </div>

                <div className="pt-2 border-t border-[#EAE6DB] flex items-center justify-between font-black text-sm">
                  <span>Total Amount</span>
                  <span>₹{trackedOrder.total}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => onNavigate('shop')}
              className="p-5 bg-white border border-[#EAE6DB] hover:border-[#967BB6] rounded-3xl cursor-pointer transition-all space-y-1.5 shadow-xs group"
            >
              <h4 className="font-bold text-sm text-brand-charcoal group-hover:text-[#967BB6] flex items-center justify-between">
                <span>Browse Store Catalog</span>
                <ChevronRight className="w-4 h-4 text-brand-muted group-hover:translate-x-0.5 transition-transform" />
              </h4>
              <p className="text-xs text-brand-muted">
                Explore luxury Mulberry silk sets and 18K waterproof jewels.
              </p>
            </div>

            <div
              onClick={() => onNavigate('contact')}
              className="p-5 bg-white border border-[#EAE6DB] hover:border-[#967BB6] rounded-3xl cursor-pointer transition-all space-y-1.5 shadow-xs group"
            >
              <h4 className="font-bold text-sm text-brand-charcoal group-hover:text-[#967BB6] flex items-center justify-between">
                <span>WhatsApp Customer Care</span>
                <ChevronRight className="w-4 h-4 text-brand-muted group-hover:translate-x-0.5 transition-transform" />
              </h4>
              <p className="text-xs text-brand-muted">
                Need help with size selection or instant order changes? Chat with us.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
