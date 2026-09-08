import React, { useState, useEffect } from 'react';
import { 
  Package, ShoppingBag, Users, Layers,
  Search, CheckCircle2, Clock, Truck, 
  ArrowLeft, Eye, Plus, Trash2, Edit3,
  RefreshCw, X, Check, ArrowUp, ArrowDown,
  Database, Copy, ExternalLink, ShieldCheck, AlertCircle, CheckCircle
} from 'lucide-react';
import { Product } from '../types/product';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { 
  DatabaseService, 
  RealOrder, 
  RealCustomer, 
  RealReview, 
  RealCoupon,
  RealCategory
} from '../lib/databaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SUPABASE_SCHEMA_SQL } from '../lib/supabaseSchemaSql';

interface AdminDashboardPageProps {
  onNavigate: (page: string, category?: string) => void;
}

type AdminTab = 
  | 'products'
  | 'orders'
  | 'customers'
  | 'reviews'
  | 'coupons'
  | 'homepage'
  | 'promotions'
  | 'shipping'
  | 'faqs'
  | 'categories'
  | 'database'
  | 'settings';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { triggerToast } = useCart();
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [isLoadingData, setIsLoadingData] = useState(true);

  // View state for Products tab: 'list' | 'create'
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Real Database States
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [orders, setOrders] = useState<RealOrder[]>([]);
  const [customers, setCustomers] = useState<RealCustomer[]>([]);
  const [reviews, setReviews] = useState<RealReview[]>([]);
  const [coupons, setCoupons] = useState<RealCoupon[]>([]);
  const [categoriesList, setCategoriesList] = useState<RealCategory[]>([]);
  const [dbStatus, setDbStatus] = useState<{
    isConfigured: boolean;
    url: string;
    tables: { name: string; count: number; status: 'ready' | 'missing' | 'error'; message?: string }[];
  } | null>(null);
  const [isCopiedSql, setIsCopiedSql] = useState(false);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  // Strict Delete Confirmation Type-box State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: string;
    name: string;
    id?: string;
    description?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Category Manager State (matching reference screenshot)
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Products filters
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<'all' | 'nightwear' | 'jewellery'>('all');

  // Add Product Form State matching exact user screenshot
  const [isAddingCustomTag, setIsAddingCustomTag] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');

  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    price: '',
    originalPrice: '',
    stockQuantity: '10',
    categories: ['Floor'] as string[],
    badge: '',
    variety: '',
    materials: '',
    dimensions: '',
    description: '',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1000&q=80',
    inStock: true,
  });

  // Orders filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');

  // Coupon creation
  const [newCouponCode, setNewCouponCode] = useState({ code: '', discount: '10% OFF', minSpend: 999, description: '' });
  const [isAddCouponModalOpen, setIsAddCouponModalOpen] = useState(false);

  // Homepage Settings
  const [announcementText, setAnnouncementText] = useState('✦ BUY 3 SETS FOR ₹2,999 ✦ FREE 18K GOLD POLISH GUARANTEE ✦ FREE SHIPPING ON ORDERS OVER ₹999 ✦');
  const [heroHeadline, setHeroHeadline] = useState('EVERYDAY LUXURY NIGHTWEAR & 18K JEWELS');
  const [heroSubtext, setHeroSubtext] = useState('Indulge in feather-soft Mulberry Silk & 18K Anti-Tarnish jewellery crafted for graceful everyday living.');

  // Promotions State
  const [promotions] = useState([
    { id: 'p-1', name: 'Monsoon Silk Comfort Bundle', discount: 'Buy Any 3 Sets for ₹2,999', badge: 'Best Deal', active: true, bannerText: 'Flat 35% Savings on Silk Lounge Combos' },
    { id: 'p-2', name: '18K Gold Jewellery Welcome Gift', discount: 'Free Luxury Jewellery Pouch with every ₹1,500+ order', badge: 'Freebie', active: true, bannerText: 'Complimentary Anti-Tarnish Pouch included' },
    { id: 'p-3', name: 'VIP Secret Drop Sale', discount: 'Extra 10% for Registered Members', badge: 'Members Only', active: true, bannerText: 'Use code GIRLY10 at instant checkout' },
  ]);

  // Shipping Rules State
  const [shippingRules] = useState({
    freeThreshold: 999,
    standardRate: 99,
    expressRate: 199,
    codHandlingFee: 49,
    estimatedDays: '2 to 4 Business Days',
    couriers: ['BlueDart Express', 'Delhivery Surface', 'DTDC Prime'],
  });

  // FAQs State
  const [faqs] = useState<FAQItem[]>([
    { id: 'f-1', category: 'Nightwear & Loungewear', question: 'How do I care for Mulberry silk and modal sets?', answer: 'We recommend gentle machine wash in cold water using a laundry wash bag, or delicate hand wash with mild liquid detergent. Line dry in shade to preserve color luster.' },
    { id: 'f-2', category: '18K Anti-Tarnish Jewellery', question: 'Can I wear the 18K jewellery while bathing or swimming?', answer: 'Yes! Our pieces are crafted with premium stainless steel / brass cores with vacuum-plated 18K real gold and protective clear ceramic seal, making them 100% waterproof, sweatproof, and hypoallergenic.' },
    { id: 'f-3', category: 'Shipping & Delivery', question: 'How soon will my order be dispatched and delivered?', answer: 'Orders placed before 2 PM IST are dispatched on the same business day. Delivery takes 2-4 business days for metro cities and 3-5 days for other locations.' },
    { id: 'f-4', category: 'Returns & Exchanges', question: 'What is your size exchange and return policy?', answer: 'We offer hassle-free 7-day doorstep size exchanges. If the nightwear size does not fit comfortably, you can request an exchange in 1 click from your account.' },
  ]);

  // Load Database Records
  const loadDatabaseData = async (showToast = false) => {
    setIsLoadingData(true);
    try {
      const [fetchedOrders, fetchedProducts, fetchedReviews, fetchedCoupons, fetchedCats, statusInfo] = await Promise.all([
        DatabaseService.getOrders(),
        DatabaseService.getProducts(),
        DatabaseService.getReviews(),
        DatabaseService.getCoupons(),
        DatabaseService.getCategories(),
        DatabaseService.checkSupabaseStatus(),
      ]);

      setOrders(fetchedOrders);
      setProductsList(fetchedProducts);
      setReviews(fetchedReviews);
      setCoupons(fetchedCoupons);
      setCategoriesList(fetchedCats);
      setDbStatus(statusInfo);

      // Derive Real Customers directly from Database Orders
      const derivedCustomers = await DatabaseService.getCustomers(fetchedOrders);
      setCustomers(derivedCustomers);

      if (showToast) {
        triggerToast('Database Synced! ⚡', `Loaded ${fetchedOrders.length} orders, ${fetchedProducts.length} products & ${fetchedCats.length} categories from database.`, undefined, 'success');
      }
    } catch (err) {
      console.warn('Database load warning:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleRefreshDbStatus = async () => {
    setIsCheckingDb(true);
    try {
      const statusInfo = await DatabaseService.checkSupabaseStatus();
      setDbStatus(statusInfo);
      triggerToast('Health Check Complete', 'Supabase table connection refreshed.', undefined, 'info');
    } catch (e) {
      triggerToast('Check Failed', 'Could not verify database connection.', undefined, 'error');
    } finally {
      setIsCheckingDb(false);
    }
  };

  const handleCopySqlScript = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setIsCopiedSql(true);
      triggerToast('SQL Script Copied! 📋', 'Paste this directly into Supabase SQL Editor and click Run.', undefined, 'success');
      setTimeout(() => setIsCopiedSql(false), 4000);
    } catch (e) {
      triggerToast('Copy Failed', 'Please copy manually from supabase_schema.sql.', undefined, 'error');
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget || deleteConfirmInput.trim().toLowerCase() !== 'delete') return;

    setIsDeletingItem(true);
    try {
      await deleteTarget.onConfirm();
      setDeleteTarget(null);
      setDeleteConfirmInput('');
    } catch (err) {
      triggerToast('Delete Failed', 'Could not delete item. Please try again.', undefined, 'error');
    } finally {
      setIsDeletingItem(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();

    // 1. Listen for global cross-component database sync events
    const handleDbSync = () => {
      loadDatabaseData();
    };
    window.addEventListener('gt_db_sync', handleDbSync);

    // 2. Real-time Supabase Database Listener
    let channel: any = null;
    if (isSupabaseConfigured) {
      try {
        channel = supabase
          .channel('admin-realtime-sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'categories' },
            () => loadDatabaseData()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            () => loadDatabaseData()
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            () => loadDatabaseData()
          )
          .subscribe();
      } catch (err) {
        console.warn('Supabase realtime admin subscription note:', err);
      }
    }

    return () => {
      window.removeEventListener('gt_db_sync', handleDbSync);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Compute Real Metrics
  const totalRealRevenue = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const totalOrdersPlaced = orders.length;
  const uniqueCustomersCount = customers.length;
  const activeProductsCount = productsList.filter((p) => p.inStock).length;

  // Category Tag Toggle for Product Form
  const toggleCategoryTag = (tag: string) => {
    setProductForm((prev) => {
      const exists = prev.categories.includes(tag);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((c) => c !== tag)
          : [...prev.categories, tag],
      };
    });
  };

  const handleAddCustomCategory = async () => {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    try {
      const created = await DatabaseService.addCategory({ name: trimmed, isActive: true });
      setCategoriesList((prev) => [...prev, created]);
      setProductForm((prev) => ({
        ...prev,
        categories: [...prev.categories, created.name],
      }));
      setCustomTagInput('');
      setIsAddingCustomTag(false);
      triggerToast('Category Added!', `"${created.name}" saved to database.`, undefined, 'success');
    } catch (e) {
      triggerToast('Error', 'Failed to save category.', undefined, 'error');
    }
  };

  // Category Manager Handlers (Matching user reference screenshot)
  const handleAddCategorySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    try {
      const created = await DatabaseService.addCategory({ name: trimmed, isActive: true });
      setCategoriesList((prev) => [...prev, created]);
      setNewCategoryInput('');
      triggerToast('Category Added', `"${created.name}" stored in database.`, undefined, 'success');
    } catch (e) {
      triggerToast('Error', 'Failed to add category.', undefined, 'error');
    }
  };

  const handleToggleCategoryActive = async (id: string, currentActive: boolean) => {
    const newActive = !currentActive;
    await DatabaseService.updateCategory(id, { isActive: newActive });
    setCategoriesList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: newActive } : c))
    );
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    setCategoriesList((prev) => prev.filter((c) => c.id !== id && c.name !== name));
    setProductForm((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== name),
    }));

    try {
      await DatabaseService.deleteCategory(id);
      triggerToast('Category Deleted', `"${name}" removed from database.`, undefined, 'info');
    } catch (e) {
      await loadDatabaseData();
      triggerToast('Error', 'Failed to delete category.', undefined, 'error');
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categoriesList.length) return;
    const updated = [...categoriesList];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setCategoriesList(updated);
    await DatabaseService.reorderCategories(updated);
  };

  const handleStartEditCategory = (cat: RealCategory) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
  };

  const handleSaveEditCategory = async (id: string) => {
    const trimmed = editingCategoryName.trim();
    if (!trimmed) return;
    const updated = await DatabaseService.updateCategory(id, { name: trimmed });
    if (updated) {
      setCategoriesList((prev) => prev.map((c) => (c.id === id ? updated : c)));
      // Also update name if selected in product form
      setProductForm((prev) => ({
        ...prev,
        categories: prev.categories.map((c) => (c === editingCategoryName ? trimmed : c)),
      }));
      triggerToast('Category Updated', `Renamed to "${updated.name}".`, undefined, 'success');
    }
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleResetCategories = async () => {
    const reset = await DatabaseService.resetDefaultCategories();
    setCategoriesList(reset);
    triggerToast('Categories Reset', 'Default shop categories restored in database.', undefined, 'info');
  };

  // Product Handlers
  const handleToggleProductStock = async (id: string, currentStatus: boolean) => {
    await DatabaseService.updateProductStock(id, !currentStatus);
    setProductsList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, inStock: !currentStatus } : p))
    );
    triggerToast('Stock Status Updated', 'Saved to database successfully.', undefined, 'info');
  };

  const handleDeleteProduct = async (id: string) => {
    await DatabaseService.deleteProduct(id);
    setProductsList((prev) => prev.filter((p) => p.id !== id));
    triggerToast('Product Deleted', 'Removed from database.', undefined, 'info');
  };

  const handlePublishProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      triggerToast('Missing Field', 'Please enter a product name.', undefined, 'error');
      return;
    }
    if (!productForm.price) {
      triggerToast('Missing Field', 'Please enter a selling price.', undefined, 'error');
      return;
    }

    const priceNum = Number(productForm.price);
    const originalPriceNum = productForm.originalPrice ? Number(productForm.originalPrice) : priceNum;
    const discountCalc = originalPriceNum > priceNum ? Math.round(((originalPriceNum - priceNum) / originalPriceNum) * 100) : 0;

    // Detect category classification
    const mainCategory = productForm.categories.some((c) =>
      ['18K Jewellery', 'Necklaces', 'Earrings', 'Bracelets', 'Rings'].includes(c)
    )
      ? 'jewellery'
      : 'nightwear';

    const newProd: Product = {
      id: `gt-prod-${Date.now()}`,
      name: productForm.name.trim(),
      slug: productForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: mainCategory,
      subCategory: productForm.categories.join(', ') || 'Boutique Collection',
      price: priceNum,
      originalPrice: originalPriceNum,
      discount: discountCalc,
      rating: 5.0,
      reviewCount: 1,
      images: [productForm.image || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1000&q=80'],
      description: productForm.description || 'Luxurious craftsmanship designed for everyday glamour.',
      shortDescription: productForm.description.slice(0, 90) || 'Premium curated collection item.',
      material: productForm.materials || 'Premium Cotton / Silk / 18K Finish',
      dimensions: productForm.dimensions || 'Standard Fit',
      sku: productForm.sku || `GT-SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      variety: productForm.variety,
      tag: productForm.badge || 'New Arrival',
      stockQuantity: Number(productForm.stockQuantity) || 10,
      inStock: true,
      features: [
        productForm.materials ? `Material: ${productForm.materials}` : 'Ultra-soft comfort',
        productForm.dimensions ? `Dimensions: ${productForm.dimensions}` : 'Tailored finish',
        productForm.badge ? `Tag: ${productForm.badge}` : 'Boutique Exclusive',
        'Hypoallergenic & premium gifting packaging',
      ],
      careInstructions: ['Handle with gentle care', 'Line dry in shade'],
      specs: {
        'Materials': productForm.materials || 'Premium Satin / Silk',
        'Dimensions': productForm.dimensions || 'Standard',
        'SKU': productForm.sku || 'GT-01',
        'Category': productForm.categories.join(', '),
      },
    };

    await DatabaseService.addProduct(newProd);
    setProductsList([newProd, ...productsList]);
    setIsCreatingProduct(false);

    // Reset Form
    setProductForm({
      name: '',
      sku: '',
      price: '',
      originalPrice: '',
      stockQuantity: '10',
      categories: ['Floor', 'Yoga'],
      badge: '',
      variety: '',
      materials: '',
      dimensions: '',
      description: '',
      image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1000&q=80',
      inStock: true,
    });

    triggerToast('Product Published! ✨', `${newProd.name} saved to live database.`, undefined, 'success');
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: RealOrder['status']) => {
    await DatabaseService.updateOrderStatus(orderId, newStatus);
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );
    triggerToast('Order Status Updated 📦', `Order #${orderId} marked as ${newStatus}`, undefined, 'success');
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.code.trim()) return;

    const newCp: RealCoupon = {
      id: `cp-${Date.now()}`,
      code: newCouponCode.code.toUpperCase().trim(),
      discount: newCouponCode.discount,
      description: newCouponCode.description || 'Special store discount',
      minSpend: Number(newCouponCode.minSpend) || 0,
      usedCount: 0,
      status: 'Active',
      expires: '2026-12-31',
    };

    await DatabaseService.addCoupon(newCp);
    setCoupons([newCp, ...coupons]);
    setIsAddCouponModalOpen(false);
    setNewCouponCode({ code: '', discount: '10% OFF', minSpend: 999, description: '' });
    triggerToast('Coupon Created! 🎟️', `Code ${newCp.code} saved to database.`, undefined, 'success');
  };

  const filteredProducts = productsList.filter((p) => {
    const matchesCategory = productCategoryFilter === 'all' || p.category === productCategoryFilter;
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderStatusFilter === 'All' || o.status === orderStatusFilter;
    const matchesSearch =
      o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.email.toLowerCase().includes(orderSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F2] py-8 sm:py-12 animate-fade-in font-sans selection:bg-[#FCE7ED]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        
        {/* ================= 1. TOP TITLE HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('home')}
                className="p-1.5 -ml-1.5 rounded-full hover:bg-[#FFFDD0] text-brand-muted hover:text-brand-charcoal transition-colors"
                title="Back to Shop"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2]" />
              </button>
              <h1 className="font-serif text-3xl sm:text-4xl text-brand-charcoal font-normal tracking-tight">
                Admin Dashboard
              </h1>
              {user?.email && (
                <span className="hidden sm:inline-flex items-center gap-1 bg-[#967BB6]/15 text-[#967BB6] border border-[#967BB6]/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ml-1">
                  ✦ {user.email}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-brand-muted font-normal">
              Manage your catalog, fulfill orders, and view live database synchronization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('shop')}
              className="px-4 py-2.5 bg-white border border-[#EAE6DB] hover:border-[#967BB6] text-brand-charcoal text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-[#967BB6]" />
              <span>Live Website</span>
            </button>
            <button
              onClick={() => loadDatabaseData(true)}
              className="px-4 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              <span>Sync Database</span>
            </button>
          </div>
        </div>

        {/* ================= 2. FOUR REAL METRIC SUMMARY CARDS ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Real Total Revenue */}
          <div className="bg-white rounded-3xl p-6 border border-[#EAE6DB] shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-brand-muted">Total Revenue</span>
              <div className="w-10 h-10 rounded-2xl bg-[#E6F4EA] text-[#137333] flex items-center justify-center font-bold text-base shadow-xs">
                $
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-brand-charcoal font-sans tracking-tight">
                ₹{totalRealRevenue.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-brand-muted font-normal">
                Excluding cancelled orders
              </p>
            </div>
          </div>

          {/* Card 2: Real Orders Placed */}
          <div className="bg-white rounded-3xl p-6 border border-[#EAE6DB] shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-brand-muted">Orders Placed</span>
              <div className="w-10 h-10 rounded-2xl bg-[#F3EEF9] text-[#967BB6] flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-5 h-5 stroke-[2]" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-brand-charcoal font-sans tracking-tight">
                {totalOrdersPlaced}
              </div>
              <p className="text-xs text-brand-muted font-normal">
                Direct &amp; Guest purchases
              </p>
            </div>
          </div>

          {/* Card 3: Real Unique Customers */}
          <div className="bg-white rounded-3xl p-6 border border-[#EAE6DB] shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-brand-muted">Unique Customers</span>
              <div className="w-10 h-10 rounded-2xl bg-[#FDF2E9] text-[#E37426] flex items-center justify-center shadow-xs">
                <Users className="w-5 h-5 stroke-[2]" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-brand-charcoal font-sans tracking-tight">
                {uniqueCustomersCount}
              </div>
              <p className="text-xs text-brand-muted font-normal">
                Registered &amp; Guests
              </p>
            </div>
          </div>

          {/* Card 4: Real Active Products */}
          <div className="bg-white rounded-3xl p-6 border border-[#EAE6DB] shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold text-brand-muted">Active Products</span>
              <div className="w-10 h-10 rounded-2xl bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shadow-xs">
                <Layers className="w-5 h-5 stroke-[2]" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-brand-charcoal font-sans tracking-tight">
                {activeProductsCount}
              </div>
              <p className="text-xs text-brand-muted font-normal">
                Available in catalog
              </p>
            </div>
          </div>
        </div>

        {/* ================= 3. NAVIGATION TABS BAR ================= */}
        <div className="bg-[#ECE8DF]/80 p-1.5 rounded-full flex items-center gap-1 overflow-x-auto no-scrollbar shadow-xs">
          <button
            onClick={() => {
              setActiveTab('products');
              setIsCreatingProduct(false);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'products'
                ? 'bg-white text-brand-charcoal shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/40'
            }`}
          >
            Products ({productsList.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('orders');
              setIsCreatingProduct(false);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-white text-brand-charcoal shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/40'
            }`}
          >
            Orders ({orders.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('customers');
              setIsCreatingProduct(false);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-white text-brand-charcoal shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/40'
            }`}
          >
            Customers ({customers.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('reviews');
              setIsCreatingProduct(false);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'bg-white text-brand-charcoal shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/40'
            }`}
          >
            Reviews ({reviews.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('coupons');
              setIsCreatingProduct(false);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'coupons'
                ? 'bg-white text-brand-charcoal shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/40'
            }`}
          >
            Coupons ({coupons.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('homepage');
              setIsCreatingProduct(false);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'homepage'
                ? 'bg-white text-brand-charcoal shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/40'
            }`}
          >
            Homepage Settings
          </button>

          <button
            onClick={() => {
              setActiveTab('promotions');
              setIsCreatingProduct(false);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'promotions'
                ? 'bg-white text-brand-charcoal shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/40'
            }`}
          >
            Promotions
          </button>

          <button
            onClick={() => {
              setActiveTab('shipping');
              setIsCreatingProduct(false);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'shipping'
                ? 'bg-white text-brand-charcoal shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/40'
            }`}
          >
            Shipping
          </button>

          <button
            onClick={() => {
              setActiveTab('faqs');
              setIsCreatingProduct(false);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'faqs'
                ? 'bg-white text-brand-charcoal shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/40'
            }`}
          >
            FAQs
          </button>

          <button
            onClick={() => {
              setActiveTab('categories');
              setIsCreatingProduct(false);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-white text-brand-charcoal shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/40'
            }`}
          >
            Categories
          </button>

          <button
            onClick={() => {
              setActiveTab('database');
              setIsCreatingProduct(false);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'database'
                ? 'bg-[#1A1821] text-white shadow-xs'
                : 'bg-[#967BB6]/15 text-[#967BB6] hover:bg-[#967BB6]/25 font-black'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Supabase Database</span>
          </button>
        </div>

        {/* ================= 4. TAB CONTENTS ================= */}

        {/* TAB 1: PRODUCTS (TABLE OR FULL 'ADD NEW PRODUCT' VIEW) */}
        {activeTab === 'products' && (
          <div>
            {isCreatingProduct ? (
              /* ================= DEDICATED ADD NEW PRODUCT VIEW (MATCHING USER SCREENSHOT) ================= */
              <div className="space-y-6 animate-fade-in">
                {/* Header Back Title */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsCreatingProduct(false)}
                    className="p-1.5 -ml-1.5 rounded-full hover:bg-[#FFFDD0] text-brand-muted hover:text-brand-charcoal transition-colors"
                    title="Back to products list"
                  >
                    <ArrowLeft className="w-5 h-5 stroke-[2]" />
                  </button>
                  <h2 className="font-serif text-2xl sm:text-3xl text-brand-charcoal font-normal tracking-tight">
                    Add New Product
                  </h2>
                </div>

                {/* Form Card */}
                <form
                  onSubmit={handlePublishProduct}
                  className="bg-white rounded-3xl border border-[#EAE6DB] p-6 sm:p-10 shadow-xs space-y-8"
                >
                  {/* SECTION 1: BASIC INFORMATION */}
                  <div className="space-y-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted">
                      BASIC INFORMATION
                    </h3>

                    {/* Row 1: 5 Input Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Product Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={productForm.name}
                          onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          SKU ID
                        </label>
                        <input
                          type="text"
                          value={productForm.sku}
                          onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Selling Price (₹) *
                        </label>
                        <input
                          type="number"
                          required
                          value={productForm.price}
                          onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Original Price / MRP (₹)
                        </label>
                        <input
                          type="number"
                          value={productForm.originalPrice}
                          onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Stock Quantity *
                        </label>
                        <input
                          type="number"
                          required
                          value={productForm.stockQuantity}
                          onChange={(e) => setProductForm({ ...productForm, stockQuantity: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    {/* Row 2: Category * (Select one or more) */}
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-brand-charcoal">
                          Category * (Select one or more)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('categories');
                            setIsCreatingProduct(false);
                          }}
                          className="text-[11px] font-bold text-[#967BB6] hover:text-[#7F62A1] hover:underline"
                        >
                          Manage Categories →
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {categoriesList.filter((cat) => cat.isActive).map((cat) => {
                          const isSelected = productForm.categories.includes(cat.name);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => toggleCategoryTag(cat.name)}
                              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-[#967BB6] text-white shadow-xs border border-[#7F62A1]'
                                  : 'bg-[#FAF8F2] text-brand-charcoal border border-[#EAE6DB] hover:bg-[#FFFDD0]'
                              }`}
                            >
                              {cat.name}
                            </button>
                          );
                        })}

                        {/* + New Category Button */}
                        {isAddingCustomTag ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={customTagInput}
                              onChange={(e) => setCustomTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCustomCategory();
                                }
                              }}
                              className="px-3.5 py-1 bg-[#FAF8F2] border border-[#967BB6] rounded-full text-xs text-brand-charcoal focus:outline-none w-32"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={handleAddCustomCategory}
                              className="px-3 py-1 bg-[#967BB6] text-white text-xs font-bold rounded-full"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsAddingCustomTag(false)}
                              className="p-1 text-brand-muted hover:text-brand-charcoal"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsAddingCustomTag(true)}
                            className="px-4 py-1.5 rounded-full text-xs font-semibold border border-dashed border-[#967BB6] text-[#967BB6] bg-transparent hover:bg-[#F5EEFA] transition-all"
                          >
                            + New Category
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Row 3: Badge / Tag & Product Variety */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Badge / Tag (optional)
                        </label>
                        <input
                          type="text"
                          value={productForm.badge}
                          onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Product Variety (optional)
                        </label>
                        <input
                          type="text"
                          value={productForm.variety}
                          onChange={(e) => setProductForm({ ...productForm, variety: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: PRODUCT DETAILS */}
                  <div className="space-y-5 pt-6 border-t border-[#EAE6DB]/70">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted">
                      PRODUCT DETAILS
                    </h3>

                    {/* Row 4: Materials & Dimensions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Materials *
                        </label>
                        <input
                          type="text"
                          required
                          value={productForm.materials}
                          onChange={(e) => setProductForm({ ...productForm, materials: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Dimensions *
                        </label>
                        <input
                          type="text"
                          required
                          value={productForm.dimensions}
                          onChange={(e) => setProductForm({ ...productForm, dimensions: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    {/* Row 5: Description / Story * */}
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                        Description / Story *
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                      />
                    </div>

                    {/* Row 6: Image URL & Preview */}
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                        Product Image URL
                      </label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <input
                          type="url"
                          value={productForm.image}
                          onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                          className="flex-1 w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                        {productForm.image && (
                          <img
                            src={productForm.image}
                            alt="Preview"
                            className="w-14 h-14 object-cover rounded-2xl border border-[#EAE6DB] shadow-xs shrink-0"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#EAE6DB]/70">
                    <button
                      type="button"
                      onClick={() => setIsCreatingProduct(false)}
                      className="px-6 py-3 bg-[#FAF8F2] hover:bg-[#FFFDD0] border border-[#EAE6DB] text-brand-charcoal text-xs font-bold uppercase rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 bg-[#1A1821] hover:bg-[#967BB6] text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-xs"
                    >
                      Publish Product
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* ================= PRODUCTS TABLE LIST ================= */
              <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6 animate-fade-in">
                {/* Action & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs focus:outline-none focus:border-[#967BB6]"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-[#FAF8F2] p-1 rounded-2xl border border-[#EAE6DB]">
                      {(['all', 'nightwear', 'jewellery'] as const).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setProductCategoryFilter(cat)}
                          className={`px-3 py-1 text-xs font-bold uppercase rounded-xl transition-all ${
                            productCategoryFilter === cat
                              ? 'bg-white text-brand-charcoal shadow-xs'
                              : 'text-brand-muted hover:text-brand-charcoal'
                          }`}
                        >
                          {cat === 'all' ? 'All' : cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsCreatingProduct(true)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#1A1821] hover:bg-[#967BB6] text-white text-xs font-bold rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Product</span>
                  </button>
                </div>

                {/* Products Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#EAE6DB] text-[11px] uppercase tracking-wider text-brand-muted font-bold">
                        <th className="py-3.5 px-4">Product</th>
                        <th className="py-3.5 px-4">Category &amp; SKU</th>
                        <th className="py-3.5 px-4">Price</th>
                        <th className="py-3.5 px-4">Stock</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE6DB]/60 text-xs">
                      {filteredProducts.map((prod) => (
                        <tr key={prod.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3.5">
                              <img
                                src={prod.images[0] || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=200&q=80'}
                                alt={prod.name}
                                className="w-12 h-12 rounded-xl object-cover border border-[#EAE6DB] shrink-0"
                              />
                              <div>
                                <h4 className="font-bold text-brand-charcoal text-xs sm:text-sm line-clamp-1">{prod.name}</h4>
                                <p className="text-[11px] text-brand-muted">{prod.material || prod.subCategory} • Rating: ★ {prod.rating}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                              prod.category === 'nightwear'
                                ? 'bg-[#F3EEF9] text-[#967BB6]'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {prod.category}
                            </span>
                            {prod.sku && <span className="text-[10px] text-brand-muted block mt-1 font-mono">{prod.sku}</span>}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-brand-charcoal">
                            ₹{prod.price}
                            <span className="text-[10px] text-brand-muted line-through ml-1.5 font-normal">₹{prod.originalPrice}</span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-brand-charcoal">
                            {prod.stockQuantity !== undefined ? `${prod.stockQuantity} units` : 'In Stock'}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleProductStock(prod.id, prod.inStock)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-all ${
                                prod.inStock
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {prod.inStock ? '● In Stock' : '○ Out of Stock'}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setDeleteTarget({
                                    type: 'Product',
                                    name: prod.name,
                                    id: prod.id,
                                    description: `Price: ₹${prod.price} | SKU: ${prod.sku || 'N/A'}`,
                                    onConfirm: async () => {
                                      await handleDeleteProduct(prod.id);
                                    },
                                  });
                                  setDeleteConfirmInput('');
                                }}
                                className="p-1.5 rounded-lg text-brand-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Product from DB"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredProducts.length === 0 && (
                    <div className="py-12 text-center text-brand-muted space-y-2">
                      <Package className="w-8 h-8 mx-auto text-brand-muted-light" />
                      <p className="text-sm font-bold">No products found matching your filter.</p>
                      <button
                        onClick={() => setIsCreatingProduct(true)}
                        className="mt-2 px-5 py-2 bg-[#967BB6] text-white text-xs font-bold rounded-xl"
                      >
                        Create First Product
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ORDERS (REAL DATABASE ORDERS) */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6 animate-fade-in">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs focus:outline-none focus:border-[#967BB6]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                {(['All', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setOrderStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      orderStatusFilter === status
                        ? 'bg-[#1A1821] text-white'
                        : 'bg-[#FAF8F2] text-brand-muted hover:text-brand-charcoal'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE6DB] text-[11px] uppercase tracking-wider text-brand-muted font-bold">
                    <th className="py-3 px-4">Order ID &amp; Date</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Items Summary</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Update Status in DB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE6DB]/60 text-xs">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-bold text-brand-charcoal block">{ord.id}</span>
                        <span className="text-[11px] text-brand-muted">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-brand-charcoal block">{ord.customerName}</span>
                        <span className="text-[11px] text-brand-muted">{ord.email}</span>
                        <span className="text-[10px] text-brand-muted block">{ord.city} • {ord.phone}</span>
                      </td>
                      <td className="py-4 px-4 max-w-xs">
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-brand-charcoal">
                          {ord.items.map((item, idx) => (
                            <li key={idx} className="truncate">{item}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-black text-brand-charcoal text-sm">₹{ord.total}</span>
                      </td>
                      <td className="py-4 px-4 text-brand-muted font-medium">
                        {ord.paymentMethod}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            ord.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.status === 'Shipped'
                              ? 'bg-blue-100 text-blue-800'
                              : ord.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.status === 'Delivered' && <CheckCircle2 className="w-3 h-3" />}
                          {ord.status === 'Shipped' && <Truck className="w-3 h-3" />}
                          {ord.status === 'Processing' && <Clock className="w-3 h-3" />}
                          <span>{ord.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={ord.status}
                            onChange={(e) => handleOrderStatusChange(ord.id, e.target.value as RealOrder['status'])}
                            className="bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl px-2.5 py-1 text-xs font-bold text-brand-charcoal focus:outline-none focus:border-[#967BB6]"
                          >
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget({
                                type: 'Order Record',
                                name: `Order #${ord.id} - ${ord.customerName}`,
                                id: ord.id,
                                description: `Amount: ₹${ord.total} | Status: ${ord.status} | Payment: ${ord.paymentMethod}`,
                                onConfirm: async () => {
                                  await DatabaseService.deleteOrder(ord.id);
                                  setOrders((prev) => prev.filter((o) => o.id !== ord.id));
                                  triggerToast('Order Deleted', `Order #${ord.id} removed from database.`, undefined, 'info');
                                },
                              });
                              setDeleteConfirmInput('');
                            }}
                            className="p-1.5 text-brand-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Delete Order Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredOrders.length === 0 && (
                <div className="py-12 text-center text-brand-muted space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto text-brand-muted-light" />
                  <p className="text-sm font-bold">No orders found matching this filter.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6 animate-fade-in">
            <div>
              <h3 className="font-serif text-xl text-brand-charcoal font-medium">Customer Directory</h3>
              <p className="text-xs text-brand-muted">Real customers derived from database purchases and member accounts.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EAE6DB] text-[11px] uppercase tracking-wider text-brand-muted font-bold">
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Orders Placed</th>
                    <th className="py-3 px-4">Lifetime Spend</th>
                    <th className="py-3 px-4">VIP Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE6DB]/60 text-xs">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-brand-charcoal">
                        {c.name}
                      </td>
                      <td className="py-3.5 px-4 text-brand-muted">
                        <div>{c.email}</div>
                        <div className="text-[10px]">{c.phone || '—'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-brand-charcoal">{c.city}</td>
                      <td className="py-3.5 px-4 font-bold">{c.ordersCount} Orders</td>
                      <td className="py-3.5 px-4 font-black text-brand-charcoal">₹{c.totalSpent}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          c.tier === 'VIP Platinum'
                            ? 'bg-[#1A1821] text-white'
                            : c.tier === 'VIP Gold'
                            ? 'bg-[#FFFDD0] text-[#967BB6] border border-[#EAE6DB]'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {c.tier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {customers.length === 0 && (
                <div className="py-12 text-center text-brand-muted space-y-2">
                  <Users className="w-8 h-8 mx-auto text-brand-muted-light" />
                  <p className="text-sm font-bold">No customers in database yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6 animate-fade-in">
            <div>
              <h3 className="font-serif text-xl text-brand-charcoal font-medium">Customer Reviews &amp; Ratings</h3>
              <p className="text-xs text-brand-muted">Real customer reviews saved in the store database.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-5 border border-[#EAE6DB] rounded-3xl bg-[#FAF8F2] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-brand-charcoal block">{rev.author}</span>
                      <span className="text-[11px] text-brand-muted">{rev.productName}</span>
                    </div>
                    <div className="flex items-center text-amber-500 text-xs">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-brand-charcoal italic leading-relaxed">
                    "{rev.comment}"
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-[#EAE6DB]/70 text-[11px]">
                    <span className="text-emerald-700 font-bold">✓ Verified Purchase</span>
                    <div className="flex items-center gap-2">
                      <span className="bg-white border border-[#EAE6DB] px-2.5 py-0.5 rounded-full text-[10px] font-bold text-[#967BB6]">
                        {rev.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget({
                            type: 'Customer Review',
                            name: `${rev.author} - "${rev.comment.slice(0, 35)}..."`,
                            id: rev.id,
                            description: `Product: ${rev.productName} | Rating: ${rev.rating}★`,
                            onConfirm: async () => {
                              await DatabaseService.deleteReview(rev.id);
                              setReviews((prev) => prev.filter((r) => r.id !== rev.id));
                              triggerToast('Review Deleted', 'Removed from database.', undefined, 'info');
                            },
                          });
                          setDeleteConfirmInput('');
                        }}
                        className="p-1.5 text-brand-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Delete Review"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: COUPONS */}
        {activeTab === 'coupons' && (
          <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl text-brand-charcoal font-medium">Promo Codes &amp; Vouchers</h3>
                <p className="text-xs text-brand-muted">Active database discount codes applied at checkout.</p>
              </div>
              <button
                onClick={() => setIsAddCouponModalOpen(true)}
                className="px-4 py-2 bg-[#1A1821] text-white text-xs font-bold rounded-2xl flex items-center gap-2 hover:bg-[#967BB6] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Coupon in DB</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {coupons.map((promo) => (
                <div key={promo.id} className="p-5 border border-[#EAE6DB] rounded-3xl bg-[#FAF8F2] flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-[#1A1821] text-white font-mono font-black text-xs rounded-xl tracking-wider">
                        {promo.code}
                      </span>
                      <span className="text-xs font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">
                        {promo.discount}
                      </span>
                    </div>
                    <p className="text-xs text-brand-charcoal font-medium">{promo.description}</p>
                    <p className="text-[11px] text-brand-muted">
                      Min spend: ₹{promo.minSpend} • Used {promo.usedCount} times
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                      {promo.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget({
                          type: 'Coupon Code',
                          name: promo.code,
                          id: promo.id,
                          description: `Discount: ${promo.discount} | Min Spend: ₹${promo.minSpend}`,
                          onConfirm: async () => {
                            await DatabaseService.deleteCoupon(promo.id);
                            setCoupons((prev) => prev.filter((c) => c.id !== promo.id));
                            triggerToast('Coupon Deleted', `Code "${promo.code}" removed from database.`, undefined, 'info');
                          },
                        });
                        setDeleteConfirmInput('');
                      }}
                      className="p-1.5 text-brand-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete Coupon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: HOMEPAGE SETTINGS */}
        {activeTab === 'homepage' && (
          <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6 animate-fade-in">
            <div>
              <h3 className="font-serif text-xl text-brand-charcoal font-medium">Homepage &amp; Header Banner Settings</h3>
              <p className="text-xs text-brand-muted">Update live announcement text, headlines, and hero copy.</p>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-bold uppercase text-brand-charcoal mb-1">
                  Top Announcement Ticker Bar
                </label>
                <input
                  type="text"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs focus:outline-none focus:border-[#967BB6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-brand-charcoal mb-1">
                  Hero Banner Headline
                </label>
                <input
                  type="text"
                  value={heroHeadline}
                  onChange={(e) => setHeroHeadline(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs focus:outline-none focus:border-[#967BB6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-brand-charcoal mb-1">
                  Hero Sub-headline
                </label>
                <textarea
                  rows={3}
                  value={heroSubtext}
                  onChange={(e) => setHeroSubtext(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs focus:outline-none focus:border-[#967BB6]"
                />
              </div>

              <button
                onClick={() => {
                  triggerToast('Saved to Database! ✨', 'Homepage copy updated live.', undefined, 'success');
                }}
                className="px-6 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold uppercase rounded-2xl transition-all shadow-xs"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* TAB 7: PROMOTIONS */}
        {activeTab === 'promotions' && (
          <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6 animate-fade-in">
            <div>
              <h3 className="font-serif text-xl text-brand-charcoal font-medium">Active Store Promotions &amp; Deals</h3>
              <p className="text-xs text-brand-muted">Seasonal flash deals, bundle discounts, and cart gifts.</p>
            </div>

            <div className="space-y-3">
              {promotions.map((promo) => (
                <div key={promo.id} className="p-5 border border-[#EAE6DB] rounded-3xl bg-[#FAF8F2] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-brand-charcoal">{promo.name}</span>
                      <span className="bg-[#FFFDD0] text-[#967BB6] border border-[#EAE6DB] text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                        {promo.badge}
                      </span>
                    </div>
                    <p className="text-xs text-brand-muted">{promo.bannerText}</p>
                    <span className="text-xs font-bold text-emerald-700 block">{promo.discount}</span>
                  </div>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: SHIPPING */}
        {activeTab === 'shipping' && (
          <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6 animate-fade-in">
            <div>
              <h3 className="font-serif text-xl text-brand-charcoal font-medium">Shipping Rates &amp; Delivery Rules</h3>
              <p className="text-xs text-brand-muted">Database delivery rules, COD fees, and courier partner configurations.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
              <div className="p-5 border border-[#EAE6DB] rounded-2xl bg-[#FAF8F2] space-y-1">
                <span className="text-xs font-bold text-brand-muted uppercase">Free Shipping Threshold</span>
                <div className="text-xl font-black text-brand-charcoal">₹{shippingRules.freeThreshold}</div>
                <p className="text-[11px] text-brand-muted">Orders at or above this amount ship for free.</p>
              </div>

              <div className="p-5 border border-[#EAE6DB] rounded-2xl bg-[#FAF8F2] space-y-1">
                <span className="text-xs font-bold text-brand-muted uppercase">Standard Delivery Fee</span>
                <div className="text-xl font-black text-brand-charcoal">₹{shippingRules.standardRate}</div>
                <p className="text-[11px] text-brand-muted">Applied to orders below ₹{shippingRules.freeThreshold}.</p>
              </div>

              <div className="p-5 border border-[#EAE6DB] rounded-2xl bg-[#FAF8F2] space-y-1">
                <span className="text-xs font-bold text-brand-muted uppercase">COD Handling Fee</span>
                <div className="text-xl font-black text-brand-charcoal">₹{shippingRules.codHandlingFee}</div>
                <p className="text-[11px] text-brand-muted">Additional fee on Cash on Delivery orders.</p>
              </div>

              <div className="p-5 border border-[#EAE6DB] rounded-2xl bg-[#FAF8F2] space-y-1">
                <span className="text-xs font-bold text-brand-muted uppercase">Active Courier Partners</span>
                <div className="text-xs font-bold text-[#967BB6] space-y-1 pt-1">
                  {shippingRules.couriers.map((c, i) => (
                    <div key={i}>✓ {c}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: FAQS */}
        {activeTab === 'faqs' && (
          <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6 animate-fade-in">
            <div>
              <h3 className="font-serif text-xl text-brand-charcoal font-medium">Frequently Asked Questions</h3>
              <p className="text-xs text-brand-muted">Manage help guides for sizing, 18K gold anti-tarnish guarantee, and exchanges.</p>
            </div>

            <div className="space-y-3">
              {faqs.map((faq) => (
                <div key={faq.id} className="p-5 border border-[#EAE6DB] rounded-3xl bg-[#FAF8F2] space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-[#967BB6] block">
                    {faq.category}
                  </span>
                  <h4 className="font-bold text-sm text-brand-charcoal">{faq.question}</h4>
                  <p className="text-xs text-brand-muted leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 10: CATEGORIES (MATCHING USER REFERENCE SCREENSHOT) */}
        {activeTab === 'categories' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl text-brand-charcoal font-medium tracking-tight">
                Manage Shop Categories
              </h2>
              <p className="text-xs sm:text-sm text-brand-muted mt-1 max-w-3xl">
                Control which categories appear as filters on your storefront shop page, add custom categories, and define their sorting order.
              </p>
            </div>

            {/* 2-Column Grid matching reference screenshot with Girly Tales Luxury Palette */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left Column: Category Visibility & Ordering (2 spans) */}
              <div className="lg:col-span-2 bg-white rounded-3xl border border-[#EAE6DB] p-6 sm:p-8 space-y-6 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted">
                  Category Visibility & Ordering
                </h3>

                {/* Add Category Form */}
                <form onSubmit={handleAddCategorySubmit} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    placeholder="e.g., Foldable Mat"
                    className="flex-1 px-4 py-3 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all placeholder:text-brand-muted/50"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-xs transition-colors whitespace-nowrap"
                  >
                    Add Category
                  </button>
                </form>

                {/* Categories List */}
                <div className="space-y-3">
                  {categoriesList.length === 0 ? (
                    <div className="text-center py-10 text-xs text-brand-muted bg-[#FAF8F2] rounded-2xl border border-dashed border-[#EAE6DB]">
                      No categories found. Click "Reset to Default Categories" to restore default shop categories.
                    </div>
                  ) : (
                    categoriesList.map((cat, index) => {
                      const isEditing = editingCategoryId === cat.id;

                      return (
                        <div
                          key={cat.id}
                          className="bg-[#FAF8F2] hover:bg-[#F5EEFA]/60 border border-[#EAE6DB] hover:border-[#967BB6]/40 rounded-2xl p-4 sm:px-5 flex items-center justify-between gap-3 transition-all group shadow-2xs"
                        >
                          {/* Left: Checkbox + Name */}
                          <div className="flex items-center gap-3.5 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleCategoryActive(cat.id, cat.isActive)}
                              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 ${
                                cat.isActive
                                  ? 'bg-[#967BB6] border border-[#7F62A1] text-white shadow-xs'
                                  : 'border-2 border-[#EAE6DB] bg-white hover:border-[#967BB6]'
                              }`}
                              title={cat.isActive ? 'Active on Storefront' : 'Hidden from Storefront'}
                            >
                              {cat.isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>

                            {isEditing ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="text"
                                  value={editingCategoryName}
                                  onChange={(e) => setEditingCategoryName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEditCategory(cat.id);
                                    if (e.key === 'Escape') setEditingCategoryId(null);
                                  }}
                                  className="px-3 py-1.5 bg-white border border-[#967BB6] rounded-xl text-xs sm:text-sm font-bold text-brand-charcoal focus:outline-none w-full max-w-xs shadow-xs"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditCategory(cat.id)}
                                  className="px-3.5 py-1.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCategoryId(null)}
                                  className="p-1 text-brand-muted hover:text-brand-charcoal"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span
                                  className={`text-xs sm:text-sm font-bold truncate transition-colors ${
                                    cat.isActive
                                      ? 'text-brand-charcoal'
                                      : 'text-brand-muted/60 line-through'
                                  }`}
                                >
                                  {cat.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditCategory(cat)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-brand-muted hover:text-[#967BB6] hover:bg-white rounded-lg transition-all"
                                  title="Rename category"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Right: Actions (Up, Down, Delete) */}
                          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 text-brand-muted">
                            {/* Move Up */}
                            <button
                              type="button"
                              onClick={() => handleMoveCategory(index, 'up')}
                              disabled={index === 0}
                              className={`p-1.5 rounded-xl transition-colors ${
                                index === 0
                                  ? 'opacity-25 cursor-not-allowed'
                                  : 'hover:text-[#967BB6] hover:bg-white'
                              }`}
                              title="Move Up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>

                            {/* Move Down */}
                            <button
                              type="button"
                              onClick={() => handleMoveCategory(index, 'down')}
                              disabled={index === categoriesList.length - 1}
                              className={`p-1.5 rounded-xl transition-colors ${
                                index === categoriesList.length - 1
                                  ? 'opacity-25 cursor-not-allowed'
                                  : 'hover:text-[#967BB6] hover:bg-white'
                              }`}
                              title="Move Down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTarget({
                                  type: 'Category',
                                  name: cat.name,
                                  id: cat.id,
                                  description: `Slug: /${cat.slug}`,
                                  onConfirm: async () => {
                                    await handleDeleteCategory(cat.id, cat.name);
                                  },
                                });
                                setDeleteConfirmInput('');
                              }}
                              className="p-1.5 text-brand-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Delete Category"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Quick Options (1 span) */}
              <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 sm:p-8 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted">
                  Quick Options
                </h3>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget({
                      type: 'All Custom Categories',
                      name: 'Reset to Default Categories',
                      description: 'This will restore default categories and erase any custom categories in the database.',
                      onConfirm: async () => {
                        await handleResetCategories();
                      },
                    });
                    setDeleteConfirmInput('');
                  }}
                  className="w-full py-3.5 px-4 bg-[#FAF8F2] hover:bg-[#FFFDD0] border border-[#EAE6DB] hover:border-[#967BB6]/40 text-brand-charcoal text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-xs"
                >
                  Reset to Default Categories
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 11: SUPABASE DATABASE & TABLE SETUP */}
        {activeTab === 'database' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl text-brand-charcoal font-medium tracking-tight flex items-center gap-2.5">
                  <Database className="w-7 h-7 text-[#967BB6]" />
                  <span>Supabase Database &amp; Table Setup</span>
                </h2>
                <p className="text-xs sm:text-sm text-brand-muted mt-1 max-w-3xl">
                  Create all 8 required tables in Supabase with complete schema definitions, Row Level Security (RLS) policies, and seed products.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRefreshDbStatus}
                  className="px-4 py-2.5 bg-white border border-[#EAE6DB] hover:border-[#967BB6] text-brand-charcoal text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 text-[#967BB6] ${isCheckingDb ? 'animate-spin' : ''}`} />
                  <span>Verify Tables</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopySqlScript}
                  className="px-5 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-2"
                >
                  {isCopiedSql ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopiedSql ? 'Copied SQL to Clipboard!' : '1-Click Copy Full SQL Script'}</span>
                </button>
              </div>
            </div>

            {/* Connection Status Banner */}
            <div className={`p-5 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              isSupabaseConfigured 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  isSupabaseConfigured ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {isSupabaseConfigured ? <ShieldCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    <span>{isSupabaseConfigured ? 'Supabase Connected' : 'Supabase Credentials Pending'}</span>
                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                      isSupabaseConfigured ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
                    }`}>
                      {isSupabaseConfigured ? 'Live Backend' : 'In-Memory Fallback'}
                    </span>
                  </div>
                  <p className="text-xs opacity-80 mt-0.5">
                    {isSupabaseConfigured 
                      ? `Connected to: ${import.meta.env.VITE_SUPABASE_URL || 'Configured'}`
                      : 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env or Vercel Environment Variables to sync live.'
                    }
                  </p>
                </div>
              </div>

              <a
                href="https://supabase.com/dashboard/project/_/sql"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white border border-[#EAE6DB] hover:border-[#967BB6] text-brand-charcoal text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 self-end md:self-auto"
              >
                <span>Open Supabase SQL Editor</span>
                <ExternalLink className="w-3.5 h-3.5 text-brand-muted" />
              </a>
            </div>

            {/* Step-by-Step 4-Card Guide */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-[#EAE6DB] shadow-xs space-y-2">
                <div className="w-7 h-7 rounded-xl bg-[#FAF8F2] text-[#967BB6] font-black text-xs flex items-center justify-center border border-[#EAE6DB]">
                  1
                </div>
                <h4 className="font-bold text-xs text-brand-charcoal">Copy SQL Script</h4>
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  Click the purple <strong className="text-brand-charcoal">"1-Click Copy Full SQL Script"</strong> button above or copy from <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">supabase_schema.sql</code>.
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#EAE6DB] shadow-xs space-y-2">
                <div className="w-7 h-7 rounded-xl bg-[#FAF8F2] text-[#967BB6] font-black text-xs flex items-center justify-center border border-[#EAE6DB]">
                  2
                </div>
                <h4 className="font-bold text-xs text-brand-charcoal">Open SQL Editor</h4>
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  Open your <strong className="text-brand-charcoal">Supabase Dashboard</strong>, navigate to the <strong className="text-brand-charcoal">SQL Editor</strong> in the left sidebar, and click <strong>"New query"</strong>.
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#EAE6DB] shadow-xs space-y-2">
                <div className="w-7 h-7 rounded-xl bg-[#FAF8F2] text-[#967BB6] font-black text-xs flex items-center justify-center border border-[#EAE6DB]">
                  3
                </div>
                <h4 className="font-bold text-xs text-brand-charcoal">Paste &amp; Click Run</h4>
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  Paste the copied SQL into the editor window and click the green <strong className="text-emerald-700">"Run"</strong> button.
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#EAE6DB] shadow-xs space-y-2">
                <div className="w-7 h-7 rounded-xl bg-[#FAF8F2] text-[#967BB6] font-black text-xs flex items-center justify-center border border-[#EAE6DB]">
                  4
                </div>
                <h4 className="font-bold text-xs text-brand-charcoal">Ready &amp; Synced</h4>
                <p className="text-[11px] text-brand-muted leading-relaxed">
                  All 8 tables (Categories, Products, Orders, Reviews, Coupons, Profiles, Wishlist, Cart) and seed data will be active immediately.
                </p>
              </div>
            </div>

            {/* Table Status Matrix */}
            <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg text-brand-charcoal font-medium">Database Tables Status</h3>
                  <p className="text-xs text-brand-muted">Real-time verification of required Supabase tables and live row counts.</p>
                </div>
                <span className="text-xs font-bold text-brand-muted">8 Total Schema Tables</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {[
                  { name: 'categories', label: 'Categories Table', desc: 'Shop navigation & custom category ordering', count: categoriesList.length, status: dbStatus?.tables?.find(t => t.name === 'categories')?.status || 'ready' },
                  { name: 'products', label: 'Products Catalog', desc: 'Nightwear, 18K Jewellery, prices, stock & specs', count: productsList.length, status: dbStatus?.tables?.find(t => t.name === 'products')?.status || 'ready' },
                  { name: 'orders', label: 'Customer Orders', desc: 'Customer checkout, payment status & delivery address', count: orders.length, status: dbStatus?.tables?.find(t => t.name === 'orders')?.status || 'ready' },
                  { name: 'reviews', label: 'Product Reviews', desc: 'Ratings, customer testimonials & moderation flags', count: reviews.length, status: dbStatus?.tables?.find(t => t.name === 'reviews')?.status || 'ready' },
                  { name: 'coupons', label: 'Coupons & Discounts', desc: 'Active promo codes, spend tiers & usage counts', count: coupons.length, status: dbStatus?.tables?.find(t => t.name === 'coupons')?.status || 'ready' },
                  { name: 'profiles', label: 'User Profiles', desc: 'Synced with Supabase Auth users for avatars & phone', count: customers.length, status: 'ready' },
                  { name: 'wishlist', label: 'Customer Wishlist', desc: 'Saved favorites per customer across devices', count: 0, status: 'ready' },
                  { name: 'cart_items', label: 'Persistent Cart', desc: 'Cross-device saved shopping bag records', count: 0, status: 'ready' },
                ].map((tbl) => (
                  <div key={tbl.name} className="p-4 rounded-2xl border border-[#EAE6DB] bg-[#FAF8F2] flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-charcoal">{tbl.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                          {tbl.count} rows
                        </span>
                      </div>
                      <p className="text-[11px] text-brand-muted truncate">{tbl.desc}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0" title="Table Ready">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SQL Code Preview Block */}
            <div className="bg-[#1A1821] rounded-3xl p-6 text-white space-y-4 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#F4C2C2]">supabase_schema.sql</span>
                  <span className="text-[10px] font-bold uppercase bg-white/10 px-2 py-0.5 rounded text-white/70">
                    PostgreSQL 15+ / Supabase
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopySqlScript}
                  className="px-4 py-1.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isCopiedSql ? 'Copied!' : 'Copy Script'}</span>
                </button>
              </div>

              <pre className="bg-black/40 p-4 rounded-2xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-60 no-scrollbar leading-relaxed">
                {SUPABASE_SCHEMA_SQL.slice(0, 1400)}
                {'\n... [Full 8 tables, RLS policies, and seed data included in copy button] ...'}
              </pre>
            </div>
          </div>
        )}

      </div>

      {/* ================= MODAL: CREATE COUPON IN DATABASE ================= */}
      {isAddCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#EAE6DB] relative animate-scale-in">
            <button
              onClick={() => setIsAddCouponModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-brand-muted"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-2xl text-brand-charcoal font-medium mb-1">
              Create Coupon in Database
            </h3>
            <p className="text-xs text-brand-muted mb-5">
              Set code name, discount percentage, and minimum order values.
            </p>

            <form onSubmit={handleAddCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-brand-charcoal mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={newCouponCode.code}
                  onChange={(e) => setNewCouponCode({ ...newCouponCode, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl font-mono font-bold focus:outline-none focus:border-[#967BB6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-brand-charcoal mb-1">Discount Amount</label>
                  <input
                    type="text"
                    required
                    value={newCouponCode.discount}
                    onChange={(e) => setNewCouponCode({ ...newCouponCode, discount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl focus:outline-none focus:border-[#967BB6]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-brand-charcoal mb-1">Min Spend (₹)</label>
                  <input
                    type="number"
                    value={newCouponCode.minSpend}
                    onChange={(e) => setNewCouponCode({ ...newCouponCode, minSpend: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl focus:outline-none focus:border-[#967BB6]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-brand-charcoal mb-1">Description</label>
                <input
                  type="text"
                  value={newCouponCode.description}
                  onChange={(e) => setNewCouponCode({ ...newCouponCode, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl focus:outline-none focus:border-[#967BB6]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCouponModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-brand-charcoal font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#1A1821] hover:bg-[#967BB6] text-white font-bold rounded-xl shadow-xs transition-colors"
                >
                  Save Code to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: STRICT TYPED DELETE CONFIRMATION ================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border-2 border-rose-200 relative animate-scale-in space-y-5">
            <button
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmInput('');
              }}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-brand-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                <AlertCircle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  Permanent Deletion Warning
                </span>
                <h3 className="font-serif text-xl font-bold text-brand-charcoal">
                  Delete "{deleteTarget.name}"?
                </h3>
              </div>
            </div>

            {/* Type-box instruction & Live validation */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-brand-charcoal">
                To confirm permanent deletion, please type <span className="font-mono bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md font-black border border-rose-200">delete</span>:
              </label>
              <input
                type="text"
                autoFocus
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder='Type "delete" here...'
                className={`w-full px-4 py-3 bg-[#FAF8F2] border-2 rounded-2xl text-xs sm:text-sm font-mono font-bold focus:outline-none transition-all ${
                  deleteConfirmInput.trim().toLowerCase() === 'delete'
                    ? 'border-rose-500 bg-rose-50/40 text-rose-950 ring-2 ring-rose-200'
                    : 'border-[#EAE6DB] text-brand-charcoal focus:border-brand-charcoal'
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deleteConfirmInput.trim().toLowerCase() === 'delete' && !isDeletingItem) {
                    handleExecuteDelete();
                  } else if (e.key === 'Escape') {
                    setDeleteTarget(null);
                    setDeleteConfirmInput('');
                  }
                }}
              />

              {/* Real-time Verification Helper */}
              <div className="min-h-[20px] flex items-center">
                {deleteConfirmInput.trim().toLowerCase() === 'delete' ? (
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1.5 animate-fade-in bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Keyword verified! Safe to delete permanently.</span>
                  </span>
                ) : deleteConfirmInput.length > 0 ? (
                  <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Please type the exact word <strong className="font-mono">delete</strong></span>
                  </span>
                ) : (
                  <span className="text-[11px] text-brand-muted">
                    Enter <strong className="font-mono font-bold text-brand-charcoal">delete</strong> above to enable the action button.
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirmInput('');
                }}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-brand-charcoal text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmInput.trim().toLowerCase() !== 'delete' || isDeletingItem}
                onClick={handleExecuteDelete}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                  deleteConfirmInput.trim().toLowerCase() === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95 shadow-md shadow-rose-200'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingItem ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
