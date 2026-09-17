import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Heart, Users, TrendingUp, Search, 
  ExternalLink, Mail, MessageSquare, Phone, MapPin, 
  RefreshCw, CheckCircle, Clock, AlertTriangle, 
  ChevronDown, ChevronUp, Package, Sparkles, Filter,
  Share2, ArrowUpRight, ShieldCheck, Tag
} from 'lucide-react';
import { Product } from '../../types/product';
import { 
  DatabaseService, 
  AllCartsWishlistsData, 
  CustomerIntentItem, 
  CustomerCartWishlistSummary, 
  ProductDemandItem,
  RealCustomer
} from '../../lib/databaseService';

interface AdminCartsWishlistsSectionProps {
  productsList: Product[];
  customers: RealCustomer[];
  triggerToast: (title: string, message?: string, product?: any, type?: any) => void;
  onNavigateToProduct?: (productId: string) => void;
}

type ViewMode = 'by_customer' | 'all_carts' | 'all_wishlists' | 'product_demand';
type ShopperFilter = 'all' | 'registered' | 'guest';

export const AdminCartsWishlistsSection: React.FC<AdminCartsWishlistsSectionProps> = ({
  productsList,
  customers,
  triggerToast,
}) => {
  const [data, setData] = useState<AllCartsWishlistsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('by_customer');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [shopperFilter, setShopperFilter] = useState<ShopperFilter>('all');
  const [expandedCustomerUid, setExpandedCustomerUid] = useState<string | null>(null);

  const loadData = async (isRefresh = false) => {
    setIsLoading(true);
    try {
      const result = await DatabaseService.getAllCartsAndWishlists(productsList, customers);
      setData(result);
      if (isRefresh) {
        triggerToast('Live Activity Synced! ⚡', `Fetched ${result.stats.totalCartItemsCount} cart items & ${result.stats.totalWishlistCount} wishlist items across ${result.stats.activeShoppersCount} shoppers.`, undefined, 'success');
      }
    } catch (err: any) {
      console.warn('Failed to load carts & wishlists:', err);
      triggerToast('Sync Error', err?.message || 'Failed to load carts and wishlists.', undefined, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);

    const handleSync = (e: any) => {
      const type = e.detail?.type;
      if (!type || type === 'cart' || type === 'wishlist' || type === 'all') {
        loadData(false);
      }
    };

    window.addEventListener('gt_db_sync', handleSync);
    return () => window.removeEventListener('gt_db_sync', handleSync);
  }, [productsList, customers]);

  // WhatsApp recovery message builder
  const openWhatsAppRecovery = (cust: CustomerCartWishlistSummary, specificItem?: string) => {
    const rawPhone = (cust.customerPhone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    
    let text = `Hi ${cust.customerName}! ✨ Greetings from Girly Tales.\n\n`;
    if (specificItem) {
      text += `We noticed you left *${specificItem}* in your shopping bag.\n`;
    } else if (cust.cartItems.length > 0) {
      const itemsList = cust.cartItems.map((i) => `• ${i.name} (x${i.quantity})`).join('\n');
      text += `We noticed you left some lovely items in your shopping bag:\n${itemsList}\n\n`;
    } else if (cust.wishlistItems.length > 0) {
      const itemsList = cust.wishlistItems.map((i) => `• ${i.name}`).join('\n');
      text += `We noticed you saved these pieces to your wishlist:\n${itemsList}\n\n`;
    }
    text += `Would you like any assistance with sizing, delivery details, or applying a special discount code? We are here to help! 💖\n\nVisit: https://girlytales.in`;

    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!data) return [];
    const query = searchQuery.toLowerCase().trim();
    return data.customers.filter((c) => {
      const matchesFilter =
        shopperFilter === 'all' ||
        (shopperFilter === 'registered' && c.customerType === 'Registered') ||
        (shopperFilter === 'guest' && c.customerType === 'Guest');

      if (!matchesFilter) return false;
      if (!query) return true;

      const hasMatchingCartItem = c.cartItems.some((i) => i.name.toLowerCase().includes(query));
      const hasMatchingWishlistItem = c.wishlistItems.some((i) => i.name.toLowerCase().includes(query));

      return (
        c.customerName.toLowerCase().includes(query) ||
        c.customerEmail.toLowerCase().includes(query) ||
        (c.customerPhone && c.customerPhone.toLowerCase().includes(query)) ||
        (c.city && c.city.toLowerCase().includes(query)) ||
        hasMatchingCartItem ||
        hasMatchingWishlistItem
      );
    });
  }, [data, searchQuery, shopperFilter]);

  // Filtered cart items
  const filteredCartItems = useMemo(() => {
    if (!data) return [];
    const query = searchQuery.toLowerCase().trim();
    return data.items.filter((i) => {
      if (i.type !== 'cart') return false;
      const matchesFilter =
        shopperFilter === 'all' ||
        (shopperFilter === 'registered' && i.customerType === 'Registered') ||
        (shopperFilter === 'guest' && i.customerType === 'Guest');

      if (!matchesFilter) return false;
      if (!query) return true;

      return (
        i.product.name.toLowerCase().includes(query) ||
        i.customerName.toLowerCase().includes(query) ||
        i.customerEmail.toLowerCase().includes(query) ||
        (i.customerPhone && i.customerPhone.toLowerCase().includes(query)) ||
        (i.product.category && i.product.category.toLowerCase().includes(query))
      );
    });
  }, [data, searchQuery, shopperFilter]);

  // Filtered wishlist items
  const filteredWishlistItems = useMemo(() => {
    if (!data) return [];
    const query = searchQuery.toLowerCase().trim();
    return data.items.filter((i) => {
      if (i.type !== 'wishlist') return false;
      const matchesFilter =
        shopperFilter === 'all' ||
        (shopperFilter === 'registered' && i.customerType === 'Registered') ||
        (shopperFilter === 'guest' && i.customerType === 'Guest');

      if (!matchesFilter) return false;
      if (!query) return true;

      return (
        i.product.name.toLowerCase().includes(query) ||
        i.customerName.toLowerCase().includes(query) ||
        i.customerEmail.toLowerCase().includes(query) ||
        (i.customerPhone && i.customerPhone.toLowerCase().includes(query)) ||
        (i.product.category && i.product.category.toLowerCase().includes(query))
      );
    });
  }, [data, searchQuery, shopperFilter]);

  // Filtered product demand (only active products from catalog)
  const filteredProductDemands = useMemo(() => {
    if (!data) return [];
    const query = searchQuery.toLowerCase().trim();
    const validProductIds = new Set(productsList.map((prod) => String(prod.id).toLowerCase().trim()));
    const validProductSlugs = new Set(productsList.map((prod) => String(prod.slug).toLowerCase().trim()));

    return data.productDemands.filter((p) => {
      const cleanPid = String(p.productId).toLowerCase().trim();
      const existsInCatalog = validProductIds.has(cleanPid) || validProductSlugs.has(cleanPid);
      if (!existsInCatalog) return false;
      if (!query) return true;
      return (
        p.productName.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    });
  }, [data, searchQuery, productsList]);

  const topDemandProduct = filteredProductDemands[0];

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* 1. Header Hero Banner */}
      <div className="bg-gradient-to-r from-[#967BB6]/10 via-[#FCE7ED]/40 to-white rounded-3xl p-6 border border-[#EAE6DB] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#967BB6] text-white rounded-2xl shadow-xs">
              <ShoppingCart className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-brand-charcoal">
              Live Customer Carts &amp; Wishlists
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live Sync Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-brand-muted">
            Track real-time shopper intent, abandonments, and wishlist demand across registered &amp; guest customers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => loadData(true)}
            disabled={isLoading}
            className="px-4 py-2.5 bg-white hover:bg-[#F3EEF9] border border-[#EAE6DB] hover:border-[#967BB6] text-brand-charcoal text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 text-[#967BB6] ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Sync Live'}</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total In-Cart Value */}
        <div className="bg-white rounded-3xl p-5 border border-[#EAE6DB] shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-brand-muted">Active Cart Value</span>
            <div className="w-9 h-9 rounded-2xl bg-[#967BB6]/15 text-[#967BB6] flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-0.5">
            <div className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">
              ₹{(data?.stats.totalCartValue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-brand-muted font-normal">
              {data?.stats.totalCartItemsCount || 0} product units in customer carts
            </p>
          </div>
        </div>

        {/* Total Wishlist Value */}
        <div className="bg-white rounded-3xl p-5 border border-[#EAE6DB] shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-brand-muted">Wishlisted Value</span>
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-rose-500/20" />
            </div>
          </div>
          <div className="mt-3 space-y-0.5">
            <div className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">
              ₹{(data?.stats.totalWishlistValue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-brand-muted font-normal">
              {data?.stats.totalWishlistCount || 0} saved products
            </p>
          </div>
        </div>

        {/* Active Shoppers */}
        <div className="bg-white rounded-3xl p-5 border border-[#EAE6DB] shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-brand-muted">Active Shoppers</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-0.5">
            <div className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">
              {data?.stats.activeShoppersCount || 0}
            </div>
            <p className="text-[11px] text-brand-muted font-normal">
              With active carts or wishlists
            </p>
          </div>
        </div>

        {/* Top In-Demand Item */}
        <div className="bg-white rounded-3xl p-5 border border-[#EAE6DB] shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-brand-muted">Top Demand Item</span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-0.5">
            <div className="text-sm font-bold text-brand-charcoal truncate" title={topDemandProduct?.productName || 'None'}>
              {topDemandProduct ? topDemandProduct.productName : 'No activity yet'}
            </div>
            <p className="text-[11px] text-brand-muted font-normal">
              {topDemandProduct ? `${topDemandProduct.cartCount} in carts • ${topDemandProduct.wishlistUsersCount} saved` : '—'}
            </p>
          </div>
        </div>

      </div>

      {/* 3. Navigation View Switcher & Search Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EAE6DB] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* View Mode Pills */}
        <div className="bg-[#FAF8F2] p-1 rounded-2xl flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setViewMode('by_customer')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'by_customer'
                ? 'bg-[#967BB6] text-white shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer-Wise ({data?.customers.length || 0})</span>
          </button>

          <button
            onClick={() => setViewMode('all_carts')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'all_carts'
                ? 'bg-[#967BB6] text-white shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/60'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Active Carts ({data?.stats.totalCartItemsCount || 0})</span>
          </button>

          <button
            onClick={() => setViewMode('all_wishlists')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'all_wishlists'
                ? 'bg-[#967BB6] text-white shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/60'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Wishlists ({data?.stats.totalWishlistCount || 0})</span>
          </button>

          <button
            onClick={() => setViewMode('product_demand')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              viewMode === 'product_demand'
                ? 'bg-[#967BB6] text-white shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Product Demand ({filteredProductDemands.length})</span>
          </button>
        </div>

        {/* Search & Shopper Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product, customer, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs text-brand-charcoal placeholder:text-brand-muted/70 focus:outline-none focus:border-[#967BB6] transition-all"
            />
          </div>

          <select
            value={shopperFilter}
            onChange={(e) => setShopperFilter(e.target.value as ShopperFilter)}
            className="px-3 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs text-brand-charcoal font-medium focus:outline-none focus:border-[#967BB6] transition-all"
          >
            <option value="all">All Shoppers</option>
            <option value="registered">Registered Only</option>
            <option value="guest">Guest Shoppers</option>
          </select>
        </div>

      </div>

      {/* 4. Tab Content Views */}
      
      {/* VIEW A: CUSTOMER-WISE VIEW (Cards with Expandable Cart & Wishlist Items + Quick WhatsApp Contact) */}
      {viewMode === 'by_customer' && (
        <div className="space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-[#EAE6DB] text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#FAF8F2] flex items-center justify-center mx-auto text-brand-muted">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-brand-charcoal">No customer activity found</h3>
              <p className="text-xs text-brand-muted max-w-md mx-auto">
                When customers add items to their cart or save to wishlist, they will automatically show up here in real time.
              </p>
            </div>
          ) : (
            filteredCustomers.map((cust) => {
              const isExpanded = expandedCustomerUid === cust.userId;
              const hasCart = cust.cartItems.length > 0;
              const hasWishlist = cust.wishlistItems.length > 0;

              return (
                <div 
                  key={cust.userId}
                  className="bg-white rounded-3xl border border-[#EAE6DB] shadow-xs hover:border-[#967BB6]/40 transition-all overflow-hidden"
                >
                  {/* Customer Card Header */}
                  <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#967BB6] to-[#7F62A1] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 mt-0.5">
                        {cust.customerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-brand-charcoal">
                            {cust.customerName}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            cust.customerType === 'Registered' 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {cust.customerType}
                          </span>
                          {cust.city && (
                            <span className="text-[11px] text-brand-muted flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#967BB6]" />
                              {cust.city}{cust.state ? `, ${cust.state}` : ''}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-brand-muted flex-wrap">
                          {cust.customerEmail && cust.customerEmail !== 'Guest Session' && (
                            <span className="flex items-center gap-1 hover:text-brand-charcoal">
                              <Mail className="w-3 h-3 text-[#967BB6]" />
                              {cust.customerEmail}
                            </span>
                          )}
                          {cust.customerPhone && cust.customerPhone !== '—' && (
                            <span className="flex items-center gap-1 hover:text-brand-charcoal">
                              <Phone className="w-3 h-3 text-[#967BB6]" />
                              {cust.customerPhone}
                            </span>
                          )}
                          <span className="text-[11px] text-brand-muted/70 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Active: {new Date(cust.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Totals & Action Buttons */}
                    <div className="flex items-center gap-3 flex-wrap lg:justify-end">
                      {hasCart && (
                        <div className="bg-[#FAF8F2] px-3.5 py-1.5 rounded-2xl border border-[#EAE6DB] flex items-center gap-2">
                          <ShoppingCart className="w-3.5 h-3.5 text-[#967BB6]" />
                          <div className="text-right">
                            <div className="text-[10px] text-brand-muted font-semibold">In Cart ({cust.cartItems.length})</div>
                            <div className="text-xs font-bold text-brand-charcoal">₹{cust.cartTotalValue.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      )}

                      {hasWishlist && (
                        <div className="bg-rose-50/50 px-3.5 py-1.5 rounded-2xl border border-rose-100 flex items-center gap-2">
                          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                          <div className="text-right">
                            <div className="text-[10px] text-brand-muted font-semibold">Wishlist ({cust.wishlistItems.length})</div>
                            <div className="text-xs font-bold text-brand-charcoal">₹{cust.wishlistTotalValue.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      )}

                      {/* WhatsApp Recovery Button */}
                      <button
                        onClick={() => openWhatsAppRecovery(cust)}
                        className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Contact customer on WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      {/* Expand / Collapse Button */}
                      <button
                        onClick={() => setExpandedCustomerUid(isExpanded ? null : cust.userId)}
                        className="px-3 py-2 bg-[#FAF8F2] hover:bg-[#F3EEF9] border border-[#EAE6DB] text-brand-charcoal text-xs font-bold rounded-2xl transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Items' : 'View Items'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Items Section */}
                  {isExpanded && (
                    <div className="border-t border-[#EAE6DB] bg-[#FAF8F2]/60 p-5 sm:p-6 space-y-6 animate-fade-in">
                      
                      {/* Active Cart Items */}
                      {hasCart && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-[#967BB6]/15 text-[#967BB6] rounded-lg">
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </span>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                              Active Cart Items ({cust.cartItems.length})
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {cust.cartItems.map((item) => (
                              <div 
                                key={item.id}
                                className="bg-white rounded-2xl p-3 border border-[#EAE6DB] shadow-xs flex items-center gap-3"
                              >
                                <img
                                  src={item.image || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'}
                                  alt={item.name}
                                  className="w-14 h-14 object-cover rounded-xl border border-[#EAE6DB]/60 shrink-0"
                                />
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <h5 className="text-xs font-bold text-brand-charcoal truncate" title={item.name}>
                                    {item.name}
                                  </h5>
                                  <div className="text-[11px] text-brand-muted flex items-center gap-2">
                                    <span>₹{item.price.toLocaleString('en-IN')} × {item.quantity}</span>
                                    {item.selectedSize && (
                                      <span className="bg-[#FAF8F2] px-1.5 py-0.2 rounded border border-[#EAE6DB] text-[10px] font-bold">
                                        {item.selectedSize}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs font-bold text-[#967BB6]">
                                    Subtotal: ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Active Wishlist Items */}
                      {hasWishlist && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-rose-50 text-rose-500 rounded-lg">
                              <Heart className="w-3.5 h-3.5 fill-rose-500/20" />
                            </span>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                              Saved Wishlist Items ({cust.wishlistItems.length})
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {cust.wishlistItems.map((item) => (
                              <div 
                                key={item.id}
                                className="bg-white rounded-2xl p-3 border border-[#EAE6DB] shadow-xs flex items-center gap-3"
                              >
                                <img
                                  src={item.image || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80'}
                                  alt={item.name}
                                  className="w-14 h-14 object-cover rounded-xl border border-[#EAE6DB]/60 shrink-0"
                                />
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <h5 className="text-xs font-bold text-brand-charcoal truncate" title={item.name}>
                                    {item.name}
                                  </h5>
                                  <div className="text-xs font-bold text-brand-charcoal">
                                    ₹{item.price.toLocaleString('en-IN')}
                                  </div>
                                  <div className="text-[10px] text-brand-muted">
                                    Saved: {item.addedAt ? new Date(item.addedAt).toLocaleDateString() : 'Recently'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW B: ALL ACTIVE CARTS (Flat list / Table of each cart item) */}
      {viewMode === 'all_carts' && (
        <div className="bg-white rounded-3xl border border-[#EAE6DB] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#EAE6DB] flex items-center justify-between">
            <h3 className="text-sm font-bold text-brand-charcoal">
              All Active In-Cart Items ({filteredCartItems.length})
            </h3>
            <span className="text-xs font-bold text-[#967BB6]">
              Total Value: ₹{filteredCartItems.reduce((s, i) => s + i.totalPrice, 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F2] text-brand-muted font-semibold uppercase tracking-wider text-[10px] border-b border-[#EAE6DB]">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Variant / Size</th>
                  <th className="px-5 py-3.5 text-center">Qty</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Total</th>
                  <th className="px-5 py-3.5">Added Date</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DB]/60">
                {filteredCartItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-brand-muted">
                      No active items in customer carts right now.
                    </td>
                  </tr>
                ) : (
                  filteredCartItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.product.images?.[0] || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'}
                            alt={item.product.name}
                            className="w-10 h-10 object-cover rounded-xl border border-[#EAE6DB]/60 shrink-0"
                          />
                          <div className="space-y-0.5 max-w-[200px]">
                            <div className="font-bold text-brand-charcoal truncate" title={item.product.name}>
                              {item.product.name}
                            </div>
                            <span className="text-[10px] text-brand-muted capitalize">
                              {item.product.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <div className="font-bold text-brand-charcoal">{item.customerName}</div>
                          <div className="text-[11px] text-brand-muted">{item.customerEmail}</div>
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            item.customerType === 'Registered' ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {item.customerType}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-brand-charcoal font-medium">
                        {item.selectedSize || item.selectedColor ? (
                          <span className="bg-[#FAF8F2] px-2 py-0.5 rounded border border-[#EAE6DB] font-bold text-[11px]">
                            {item.selectedSize || 'Free Size'} {item.selectedColor ? `• ${item.selectedColor}` : ''}
                          </span>
                        ) : (
                          <span className="text-brand-muted">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center font-bold text-brand-charcoal">
                        {item.quantity}
                      </td>

                      <td className="px-5 py-3.5 font-medium text-brand-charcoal">
                        ₹{item.unitPrice.toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-3.5 font-bold text-[#967BB6]">
                        ₹{item.totalPrice.toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-3.5 text-brand-muted text-[11px]">
                        {new Date(item.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => openWhatsAppRecovery({
                            userId: item.userId,
                            customerName: item.customerName,
                            customerEmail: item.customerEmail,
                            customerPhone: item.customerPhone,
                            customerType: item.customerType,
                            cartItems: [{
                              id: item.id,
                              productId: item.product.id,
                              name: item.product.name,
                              image: item.product.images?.[0] || '',
                              price: item.unitPrice,
                              quantity: item.quantity,
                            }],
                            wishlistItems: [],
                            cartTotalValue: item.totalPrice,
                            wishlistTotalValue: 0,
                            lastActive: item.addedAt,
                          }, item.product.name)}
                          className="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-[11px] font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Recover</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW C: ALL WISHLISTS (Flat list / Table of each saved wishlist item) */}
      {viewMode === 'all_wishlists' && (
        <div className="bg-white rounded-3xl border border-[#EAE6DB] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#EAE6DB] flex items-center justify-between">
            <h3 className="text-sm font-bold text-brand-charcoal">
              All Customer Wishlist Saves ({filteredWishlistItems.length})
            </h3>
            <span className="text-xs font-bold text-rose-500">
              Total Wishlist Value: ₹{filteredWishlistItems.reduce((s, i) => s + i.totalPrice, 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F2] text-brand-muted font-semibold uppercase tracking-wider text-[10px] border-b border-[#EAE6DB]">
                <tr>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">Stock Status</th>
                  <th className="px-5 py-3.5">Saved Date</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DB]/60">
                {filteredWishlistItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-brand-muted">
                      No saved wishlist items right now.
                    </td>
                  </tr>
                ) : (
                  filteredWishlistItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.product.images?.[0] || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80'}
                            alt={item.product.name}
                            className="w-10 h-10 object-cover rounded-xl border border-[#EAE6DB]/60 shrink-0"
                          />
                          <div className="space-y-0.5 max-w-[200px]">
                            <div className="font-bold text-brand-charcoal truncate" title={item.product.name}>
                              {item.product.name}
                            </div>
                            <span className="text-[10px] text-brand-muted capitalize">
                              {item.product.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <div className="font-bold text-brand-charcoal">{item.customerName}</div>
                          <div className="text-[11px] text-brand-muted">{item.customerEmail}</div>
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            item.customerType === 'Registered' ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {item.customerType}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-bold text-brand-charcoal">
                        ₹{item.unitPrice.toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-3.5">
                        {item.product.inStock !== false && (item.product.stockQuantity === undefined || item.product.stockQuantity > 0) ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            In Stock ({item.product.stockQuantity ?? 10})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                            Out of Stock
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-brand-muted text-[11px]">
                        {new Date(item.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => openWhatsAppRecovery({
                            userId: item.userId,
                            customerName: item.customerName,
                            customerEmail: item.customerEmail,
                            customerPhone: item.customerPhone,
                            customerType: item.customerType,
                            cartItems: [],
                            wishlistItems: [{
                              id: item.id,
                              productId: item.product.id,
                              name: item.product.name,
                              image: item.product.images?.[0] || '',
                              price: item.unitPrice,
                            }],
                            cartTotalValue: 0,
                            wishlistTotalValue: item.unitPrice,
                            lastActive: item.addedAt,
                          }, item.product.name)}
                          className="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-[11px] font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Engage</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW D: PRODUCT DEMAND LEADERBOARD */}
      {viewMode === 'product_demand' && (
        <div className="bg-white rounded-3xl border border-[#EAE6DB] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#EAE6DB] flex items-center justify-between">
            <h3 className="text-sm font-bold text-brand-charcoal">
              Product Demand &amp; Intent Ranking ({filteredProductDemands.length})
            </h3>
            <span className="text-xs text-brand-muted">
              Ranked by total customer cart additions &amp; wishlist saves
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F2] text-brand-muted font-semibold uppercase tracking-wider text-[10px] border-b border-[#EAE6DB]">
                <tr>
                  <th className="px-5 py-3.5">Rank</th>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5 text-center">In Carts (Units)</th>
                  <th className="px-5 py-3.5 text-center">In Wishlists</th>
                  <th className="px-5 py-3.5">Total Cart Potential</th>
                  <th className="px-5 py-3.5">Inventory Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE6DB]/60">
                {filteredProductDemands.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-brand-muted">
                      No demand activity recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredProductDemands.map((prod, idx) => (
                    <tr key={prod.productId} className="hover:bg-[#FAF8F2]/60 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-brand-charcoal">
                        #{idx + 1}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.image || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'}
                            alt={prod.productName}
                            className="w-10 h-10 object-cover rounded-xl border border-[#EAE6DB]/60 shrink-0"
                          />
                          <div className="font-bold text-brand-charcoal max-w-[220px] truncate" title={prod.productName}>
                            {prod.productName}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 capitalize text-brand-muted">
                        {prod.category}
                      </td>

                      <td className="px-5 py-3.5 font-bold text-brand-charcoal">
                        ₹{prod.price.toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-3.5 text-center font-bold text-[#967BB6]">
                        {prod.cartCount} units ({prod.cartUsersCount} shoppers)
                      </td>

                      <td className="px-5 py-3.5 text-center font-bold text-rose-500">
                        {prod.wishlistUsersCount} shoppers
                      </td>

                      <td className="px-5 py-3.5 font-bold text-emerald-700">
                        ₹{prod.totalCartValue.toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-3.5">
                        {prod.inStock ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            In Stock ({prod.stockQuantity})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                            Out of Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
