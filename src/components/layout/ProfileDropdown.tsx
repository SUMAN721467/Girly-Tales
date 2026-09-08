import React, { useEffect, useRef } from 'react';
import { User as UserIcon, ShoppingBag, Heart, Settings, LogOut, LogIn, ChevronRight, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';

interface ProfileDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string, category?: string) => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const { user, isLoggedIn, isAdmin, logout, openAuthModal } = useAuth();
  const { wishlistCount } = useWishlist();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click or ESC key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMenuClick = (action: () => void) => {
    action();
    onClose();
  };

  const handleOpenAuth = (tab: 'login' | 'signup' = 'login') => {
    openAuthModal(tab);
    onClose();
  };

  const handleSignOut = async () => {
    await logout();
    onClose();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-[#EAE6DB] overflow-hidden z-50 animate-scale-in"
      style={{
        boxShadow: '0 20px 40px -10px rgba(26, 24, 33, 0.15), 0 0 0 1px rgba(234, 230, 219, 0.6)',
      }}
    >
      {/* Header Profile Section */}
      {isLoggedIn && user ? (
        <div className="bg-[#FAF8F2] px-5 py-4.5 border-b border-[#EAE6DB]/70 flex items-center gap-3.5">
          {/* Avatar with subtle circular ring */}
          <div className="relative shrink-0">
            <div className="w-13 h-13 rounded-full bg-white p-0.5 border border-[#EAE6DB] shadow-xs flex items-center justify-center overflow-hidden">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className={`w-full h-full rounded-full flex items-center justify-center font-serif font-black text-lg ${
                  isAdmin 
                    ? 'bg-gradient-to-br from-[#967BB6] to-[#7F62A1] text-white shadow-sm'
                    : 'bg-gradient-to-br from-[#FFFDD0] to-[#E8DCF3] text-brand-charcoal'
                }`}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            {/* Active status indicator dot */}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#10B981] border-2 border-white rounded-full shadow-xs" />
          </div>

          {/* User Name & Email */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h4 className="font-sans font-bold text-base text-brand-charcoal tracking-tight truncate">
                {user.name || (isAdmin ? 'Admin' : 'Valued Member')}
              </h4>
              {isAdmin ? (
                <span className="shrink-0 bg-[#967BB6] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-xs tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  ADMIN
                </span>
              ) : (
                <span className="shrink-0 bg-[#FFFDD0] text-[#967BB6] border border-[#EAE6DB] text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                  VIP
                </span>
              )}
            </div>
            <p className="text-xs text-brand-muted truncate font-normal mt-0.5">
              {user.email}
            </p>
          </div>
        </div>
      ) : (
        /* Guest / Not logged in Header */
        <div className="bg-[#FAF8F2] px-5 py-4.5 border-b border-[#EAE6DB]/70 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFFDD0] border border-[#EAE6DB] flex items-center justify-center text-[#967BB6] shadow-xs shrink-0">
              <Sparkles className="w-5 h-5 text-[#967BB6]" />
            </div>
            <div>
              <h4 className="font-sans font-bold text-sm text-brand-charcoal tracking-tight">
                Welcome to Girly Tales ✦
              </h4>
              <p className="text-[11px] text-brand-muted mt-0.5">
                Sign in to track orders &amp; unlock VIP perks
              </p>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => handleOpenAuth('login')}
            className="w-full py-2.5 px-4 bg-[#967BB6] hover:bg-[#7F62A1] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In / Register</span>
          </button>
        </div>
      )}

      {/* Menu Options List */}
      <div className="p-2.5 space-y-1">
        {/* 1. Admin Dashboard (ONLY visible for authorized Admins) */}
        {isAdmin && (
          <button
            onClick={() => handleMenuClick(() => onNavigate('admin'))}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-[#FAF8F2] hover:bg-[#FFFDD0] border border-[#EAE6DB] transition-all group text-left shadow-xs"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#967BB6] text-white flex items-center justify-center group-hover:scale-105 transition-all shadow-xs">
                <Settings className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-sm font-bold text-brand-charcoal block">
                  Admin Dashboard
                </span>
                <span className="text-[10px] text-[#967BB6] font-bold block">
                  Manage Products, Orders &amp; DB
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#967BB6] group-hover:translate-x-0.5 transition-all" />
          </button>
        )}

        {/* 2. My Account */}
        <button
          onClick={() => handleMenuClick(() => onNavigate('account'))}
          className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#FFFDD0]/50 transition-all group text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EEF4F0] flex items-center justify-center text-brand-charcoal group-hover:bg-[#E2ECE5] group-hover:scale-105 transition-all shadow-xs">
              <UserIcon className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <span className="text-sm font-semibold text-brand-charcoal block group-hover:text-brand-charcoal">
                My Account
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-brand-muted-light group-hover:text-brand-charcoal group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* 3. My Orders */}
        <button
          onClick={() => handleMenuClick(() => onNavigate('orders'))}
          className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#FFFDD0]/50 transition-all group text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EEF4F0] flex items-center justify-center text-brand-charcoal group-hover:bg-[#E2ECE5] group-hover:scale-105 transition-all shadow-xs">
              <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <span className="text-sm font-semibold text-brand-charcoal block">
                My Orders
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-brand-muted-light group-hover:text-brand-charcoal group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* 4. My Wishlist */}
        <button
          onClick={() => handleMenuClick(() => onNavigate('wishlist'))}
          className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#FFFDD0]/50 transition-all group text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EEF4F0] flex items-center justify-center text-brand-charcoal group-hover:bg-[#E2ECE5] group-hover:scale-105 transition-all shadow-xs">
              <Heart className="w-5 h-5 stroke-[1.8] group-hover:text-rose-500 transition-colors" />
            </div>
            <div>
              <span className="text-sm font-semibold text-brand-charcoal block">
                My Wishlist
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {wishlistCount > 0 && (
              <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">
                {wishlistCount}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-brand-muted-light group-hover:text-brand-charcoal group-hover:translate-x-0.5 transition-all" />
          </div>
        </button>

        {/* Subtle Divider */}
        <div className="my-1.5 border-t border-[#EAE6DB]/70 mx-1" />

        {/* 5. Sign out (if logged in) or Sign in (if guest) */}
        {isLoggedIn ? (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-rose-50/70 transition-all group text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FCE7ED] flex items-center justify-center text-[#E05263] group-hover:bg-[#FBB6CE]/50 group-hover:scale-105 transition-all shadow-xs">
                <LogOut className="w-5 h-5 stroke-[2] text-[#E05263]" />
              </div>
              <span className="text-sm font-semibold text-[#E05263]">
                Sign out
              </span>
            </div>
          </button>
        ) : (
          <button
            onClick={() => handleOpenAuth('login')}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#FAF8F2] transition-all group text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#EFEAF6] flex items-center justify-center text-[#967BB6] group-hover:bg-[#E8DCF3] group-hover:scale-105 transition-all shadow-xs">
                <LogIn className="w-5 h-5 stroke-[2] text-[#967BB6]" />
              </div>
              <span className="text-sm font-semibold text-[#967BB6]">
                Sign In
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-brand-muted-light group-hover:text-[#967BB6] group-hover:translate-x-0.5 transition-all" />
          </button>
        )}
      </div>
    </div>
  );
};
