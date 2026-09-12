import React from 'react';
import { X, ArrowRight, Heart, Sparkles, Moon, Phone, HelpCircle, User as UserIcon, ShoppingBag } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import logoLine from '../../assets/logo-line.PNG';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string, category?: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose, onNavigate }) => {
  const { wishlistCount } = useWishlist();
  const { user, isLoggedIn, isAdmin, openAuthModal } = useAuth();

  if (!isOpen) return null;

  const handleLinkClick = (page: string, category?: string) => {
    onNavigate(page, category);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex modal-backdrop animate-fade-in" onClick={onClose}>
      <div
        className="w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col justify-between p-6 animate-slide-up relative overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#EAE6DB]">
            <div className="flex items-center gap-2">
              <img src={logoLine} alt="Girly Tales" className="h-8 w-auto object-contain" />
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-[#fffeea] hover:bg-brand-lavender-subtle text-brand-charcoal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Categories Navigation */}
          <nav className="py-6 space-y-1 text-sm font-bold uppercase tracking-wider text-brand-charcoal">
            <button
              onClick={() => handleLinkClick('home')}
              className="w-full text-left py-3 px-3 rounded-xl hover:bg-[#fffeea] flex items-center justify-between transition-colors"
            >
              <span>Home</span>
              <ArrowRight className="w-4 h-4 text-brand-muted-light" />
            </button>

            <button
              onClick={() => handleLinkClick('shop', 'all')}
              className="w-full text-left py-3 px-3 rounded-xl hover:bg-[#fffeea] flex items-center justify-between transition-colors"
            >
              <span>Shop All</span>
              <ArrowRight className="w-4 h-4 text-brand-muted-light" />
            </button>

            <button
              onClick={() => handleLinkClick('shop', 'nightwear')}
              className="w-full text-left py-3 px-3 rounded-xl hover:bg-[#fffeea] flex items-center justify-between text-brand-lavender transition-colors"
            >
              <span className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-brand-lavender" />
                Nightwear &amp; Pyjamas
              </span>
              <ArrowRight className="w-4 h-4 text-brand-lavender" />
            </button>

            <button
              onClick={() => handleLinkClick('shop', 'jewellery')}
              className="w-full text-left py-3 px-3 rounded-xl hover:bg-[#fffeea] flex items-center justify-between text-amber-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                18K Anti-Tarnish Jewels
              </span>
              <ArrowRight className="w-4 h-4 text-amber-700" />
            </button>

            {isLoggedIn && user ? (
              <>
                <button
                  onClick={() => handleLinkClick('account', 'profile')}
                  className="w-full text-left py-3 px-3 rounded-xl hover:bg-[#fffeea] flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-[#967BB6]" />
                    <span>Profile Details</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-brand-muted-light" />
                </button>

                <button
                  onClick={() => handleLinkClick('account', 'addresses')}
                  className="w-full text-left py-3 px-3 rounded-xl hover:bg-[#fffeea] flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">📍</span>
                    <span>Shipping Address</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-brand-muted-light" />
                </button>

                <button
                  onClick={() => handleLinkClick('account', 'orders')}
                  className="w-full text-left py-3 px-3 rounded-xl hover:bg-[#fffeea] flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#967BB6]" />
                    <span>My Orders</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-brand-muted-light" />
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  openAuthModal('login');
                }}
                className="w-full text-left py-3 px-3 rounded-xl bg-[#FAF8F2] hover:bg-[#fffeea] flex items-center justify-between transition-colors text-[#967BB6] font-black"
              >
                <span className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-[#967BB6]" />
                  <span>Sign In / Register</span>
                </span>
                <ArrowRight className="w-4 h-4 text-[#967BB6]" />
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => handleLinkClick('admin')}
                className="w-full text-left py-3 px-3 rounded-xl hover:bg-[#fffeea] flex items-center justify-between transition-colors bg-[#FAF8F2]"
              >
                <span className="flex items-center gap-2">
                  <span className="text-[10px] bg-[#967BB6] text-white px-1.5 py-0.5 rounded font-black">ADMIN</span>
                  <span>Admin Dashboard</span>
                </span>
                <ArrowRight className="w-4 h-4 text-brand-muted-light" />
              </button>
            )}

            <button
              onClick={() => handleLinkClick('wishlist')}
              className="w-full text-left py-3 px-3 rounded-xl hover:bg-[#fffeea] flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                Wishlist
              </span>
              {wishlistCount > 0 && (
                <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {wishlistCount}
                </span>
              )}
            </button>

            <div className="pt-4 border-t border-[#EAE6DB] space-y-1">
              <button
                onClick={() => handleLinkClick('about')}
                className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-[#fffeea] text-xs text-brand-muted font-bold flex items-center gap-2"
              >
                <HelpCircle className="w-4 h-4 text-brand-lavender" />
                <span>Our Story</span>
              </button>
              <button
                onClick={() => handleLinkClick('contact')}
                className="w-full text-left py-2.5 px-3 rounded-xl hover:bg-[#fffeea] text-xs text-brand-muted font-bold flex items-center gap-2"
              >
                <Phone className="w-4 h-4 text-brand-lavender" />
                <span>Contact &amp; Help</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};
