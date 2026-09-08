import React, { useState, useEffect } from 'react';
import { Product } from './types/product';
import { MOCK_PRODUCTS } from './data/products';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';

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
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export const AppContent: React.FC = () => {
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

        {(currentPage === 'login' || currentPage === 'account') && (
          <LoginPage onNavigate={navigateTo} initialSection="overview" />
        )}

        {currentPage === 'orders' && (
          <LoginPage onNavigate={navigateTo} initialSection="orders" />
        )}

        {currentPage === 'admin' && (
          <AdminDashboardPage onNavigate={navigateTo} />
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
    <CartProvider>
      <WishlistProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </WishlistProvider>
    </CartProvider>
  );
};

export default App;
