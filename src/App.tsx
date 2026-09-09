import React, { useState, useEffect } from 'react';
import { Product } from './types/product';
import { MOCK_PRODUCTS } from './data/products';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

// Layout Components
import { AnnouncementBar } from './components/layout/AnnouncementBar';
import { Navbar } from './components/layout/Navbar';
import { MobileNav } from './components/layout/MobileNav';
import { Footer } from './components/layout/Footer';

// Modals & Overlays
import { CartDrawer } from './components/cart/CartDrawer';
import { CheckoutModal } from './components/cart/CheckoutModal';
import { SearchModal } from './components/search/SearchModal';
import { AuthModal } from './components/auth/AuthModal';
import { QuickViewModal } from './components/common/QuickViewModal';
import { ToastContainer } from './components/common/ToastNotification';

// Pages
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { CartPage } from './pages/CartPage';
import { WishlistPage } from './pages/WishlistPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { AccountPage } from './pages/AccountPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

import { useAuth } from './context/AuthContext';

export const AppContent: React.FC = () => {
  const { user, isLoggedIn, isAdmin, openAuthModal } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Overlay states
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Handle URL hash routing and browser back button
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('product/')) {
        const slug = hash.replace('product/', '');
        const found = MOCK_PRODUCTS.find((p) => p.slug === slug || p.id === slug);
        if (found) {
          setSelectedProduct(found);
          setCurrentPage('product');
        }
      } else if (hash === 'nightwear' || hash === 'jewellery') {
        setSelectedCategory(hash);
        setCurrentPage('shop');
      } else if (['home', 'shop', 'cart', 'wishlist', 'about', 'contact', 'login', 'account', 'orders', 'admin'].includes(hash)) {
        setCurrentPage(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    if (window.location.hash) {
      handleHashChange();
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page: string, category: string = 'all') => {
    setCurrentPage(page);
    setSelectedCategory(category);
    if (page !== 'product') {
      window.location.hash = category !== 'all' ? category : page;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentPage('product');
    window.location.hash = `product/${product.slug}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-brand-ivory text-brand-charcoal selection:bg-brand-lilac selection:text-white relative">
      {/* 1. Header & Navigation */}
      <div>
        <AnnouncementBar />
        <Navbar
          currentPage={currentPage}
          onNavigate={navigateTo}
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleMobileMenu={() => setIsMobileNavOpen(true)}
        />
      </div>

      {/* 2. Main Page View Content */}
      <main className="flex-1 animate-fade-in">
        {currentPage === 'home' && (
          <HomePage
            onNavigate={navigateTo}
            onSelectProduct={handleSelectProduct}
            onQuickView={handleQuickView}
          />
        )}

        {currentPage === 'shop' && (
          <ShopPage
            key={selectedCategory}
            initialCategory={selectedCategory}
            onSelectProduct={handleSelectProduct}
            onQuickView={handleQuickView}
          />
        )}

        {currentPage === 'product' && selectedProduct && (
          <ProductDetailsPage
            product={selectedProduct}
            onSelectProduct={handleSelectProduct}
            onBackToShop={() => navigateTo('shop', selectedProduct.category)}
            onOpenCheckout={() => setIsCheckoutOpen(true)}
          />
        )}

        {currentPage === 'cart' && (
          <CartPage
            onNavigateToShop={() => navigateTo('shop')}
            onOpenCheckout={() => setIsCheckoutOpen(true)}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {currentPage === 'wishlist' && (
          <WishlistPage
            onNavigateToShop={() => navigateTo('shop')}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {currentPage === 'about' && (
          <AboutPage onNavigateToShop={() => navigateTo('shop')} />
        )}

        {currentPage === 'contact' && <ContactPage />}

        {currentPage === 'login' && (
          <LoginPage onNavigate={navigateTo} />
        )}

        {currentPage === 'account' && (
          <AccountPage
            onNavigate={navigateTo}
            initialTab={
              selectedCategory === 'addresses'
                ? 'addresses'
                : selectedCategory === 'orders'
                ? 'orders'
                : 'profile'
            }
          />
        )}

        {currentPage === 'orders' && (
          <AccountPage onNavigate={navigateTo} initialTab="orders" />
        )}

        {currentPage === 'admin' && (
          isAdmin ? (
            <AdminDashboardPage onNavigate={navigateTo} />
          ) : (
            <div className="max-w-xl mx-auto px-4 py-20 text-center animate-fade-in space-y-6">
              <div className="w-18 h-18 mx-auto rounded-3xl bg-[#FAF8F2] border border-[#EAE6DB] flex items-center justify-center text-[#967BB6] shadow-sm">
                <span className="text-3xl">🔒</span>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#967BB6] bg-[#FFFDD0] border border-[#EAE6DB] px-3 py-1 rounded-full">
                  Admin Access Required
                </span>
                <h2 className="font-serif font-black text-2xl sm:text-3xl text-brand-charcoal uppercase">
                  Restricted Control Center
                </h2>
                <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto leading-relaxed">
                  The Admin Dashboard is strictly reserved for authorized store administrators. Please log in with your administrator email.
                </p>
              </div>

              {isLoggedIn ? (
                <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#EAE6DB] text-xs text-brand-muted space-y-2">
                  <p>Currently logged in as: <strong className="text-brand-charcoal">{user?.email}</strong></p>
                  <p className="text-[11px] text-rose-500 font-semibold">This account does not have store administrator privileges.</p>
                  <button
                    onClick={() => openAuthModal('login')}
                    className="mt-2 px-5 py-2 bg-[#967BB6] hover:bg-[#7F62A1] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                  >
                    Switch to Admin Account
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="w-full sm:w-auto px-6 py-3 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all"
                  >
                    Log In as Admin
                  </button>
                  <button
                    onClick={() => navigateTo('home')}
                    className="w-full sm:w-auto px-6 py-3 bg-[#FAF8F2] hover:bg-[#FFFDD0] border border-[#EAE6DB] text-brand-charcoal text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                  >
                    Return to Store
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </main>

      {/* 3. Footer */}
      <Footer onNavigate={navigateTo} />

      {/* 4. Global Modals & Drawers */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        onNavigate={navigateTo}
      />

      <CartDrawer
        onNavigateToShop={() => navigateTo('shop')}
        onNavigateToCartPage={() => navigateTo('cart')}
        onOpenCheckout={() => setIsCheckoutOpen(true)}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={handleSelectProduct}
      />

      <AuthModal />

      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onViewFullDetails={(prod) => {
          setQuickViewProduct(null);
          handleSelectProduct(prod);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={() => {}}
      />

      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <AppContent />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
