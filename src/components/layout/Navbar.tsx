import React, { useState } from 'react';
import { Search, ShoppingBag, Menu, Heart, User as UserIcon } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { ProfileDropdown } from './ProfileDropdown';
import logoLine from '../../assets/logo-line.PNG';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string, category?: string) => void;
  onOpenSearch: () => void;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  onOpenSearch,
  onToggleMobileMenu,
}) => {
  const { totalItems, openCart } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, isLoggedIn, isAdmin } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#EAE6DB] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* LEFT: Logo position on the left top side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="p-1 -ml-1 text-brand-charcoal hover:text-brand-lavender lg:hidden transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 stroke-[2.2]" />
          </button>

          <div
            onClick={() => onNavigate('home')}
            className="flex items-center cursor-pointer select-none group"
          >
            <img
              src={logoLine}
              alt="Girly Tales"
              className="h-9 sm:h-12 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </div>
        </div>

        {/* MIDDLE-RIGHT: Navigation links in mid-right + Action icons on right */}
        <div className="flex items-center gap-6 sm:gap-8">
          {/* Desktop Navigation Links in Mid-Right */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8 text-xs font-bold uppercase tracking-wider text-brand-charcoal">
            <button
              onClick={() => onNavigate('home')}
              className={`hover:text-[#967BB6] transition-colors ${
                currentPage === 'home' ? 'text-[#967BB6] font-black' : ''
              }`}
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('shop', 'all')}
              className={`hover:text-[#967BB6] transition-colors ${
                currentPage === 'shop' ? 'text-[#967BB6] font-black' : ''
              }`}
            >
              Shop All
            </button>
            <button
              onClick={() => onNavigate('shop', 'nightwear')}
              className="hover:text-[#967BB6] transition-colors flex items-center gap-1"
            >
              <span>Nightwear</span>
            </button>
            <button
              onClick={() => onNavigate('shop', 'jewellery')}
              className="hover:text-[#967BB6] transition-colors flex items-center gap-1"
            >
              <span>18K Jewellery</span>
            </button>
            <button
              onClick={() => onNavigate('about')}
              className={`hover:text-[#967BB6] transition-colors ${
                currentPage === 'about' ? 'text-[#967BB6] font-black' : ''
              }`}
            >
              Our Story
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className={`hover:text-[#967BB6] transition-colors ${
                currentPage === 'contact' ? 'text-[#967BB6] font-black' : ''
              }`}
            >
              Contact
            </button>
          </nav>

          {/* Right Action Icons: Search, Wishlist, Cart */}
          <div className="flex items-center space-x-2 sm:space-x-4 pl-2">
            <button
              onClick={onOpenSearch}
              className="p-2 text-brand-charcoal hover:text-[#967BB6] transition-colors"
              aria-label="Search"
              title="Search"
            >
              <Search className="w-5 h-5 stroke-[2.2]" />
            </button>

            <button
              onClick={() => onNavigate('wishlist')}
              className="p-2 text-brand-charcoal hover:text-rose-500 transition-colors relative hidden sm:block"
              aria-label="Wishlist"
              title="Saved Items"
            >
              <Heart className={`w-5 h-5 stroke-[2.2] ${wishlistCount > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Profile Dropdown Container */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className={`p-1.5 transition-all flex items-center justify-center rounded-full border ${
                  isProfileOpen
                    ? 'border-[#967BB6] bg-[#fffee3]/40 text-[#967BB6]'
                    : 'border-[#EAE6DB] hover:border-[#967BB6] text-brand-charcoal hover:text-[#967BB6]'
                } relative`}
                aria-label="Account Menu"
                title={isLoggedIn && user ? (isAdmin ? `Admin (${user.name || user.email})` : `Account (${user.name})`) : 'Profile Menu'}
              >
                {isLoggedIn && user ? (
                  <div className="w-6 h-6 min-w-[24px] min-h-[24px] aspect-square shrink-0 rounded-full bg-[#967BB6] text-white text-[10px] font-black flex items-center justify-center shadow-xs select-none">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <div className="w-6 h-6 min-w-[24px] min-h-[24px] aspect-square shrink-0 rounded-full bg-gradient-to-br from-[#fffee3] to-[#E8DCF3] flex items-center justify-center text-brand-charcoal text-[10px] font-black select-none">
                    <UserIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                )}
                {/* Active online green dot if logged in */}
                {isLoggedIn && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#10B981] border-2 border-white rounded-full shadow-xs" />
                )}
              </button>

              {/* Profile Dropdown Card */}
              <ProfileDropdown
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                onNavigate={onNavigate}
              />
            </div>

            <button
              onClick={openCart}
              className="p-2 text-brand-charcoal hover:text-[#967BB6] transition-colors relative"
              aria-label="Shopping Bag"
              title="View Cart"
            >
              <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
              {totalItems > 0 && (
                <span className="absolute top-1 right-1 bg-[#967BB6] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
