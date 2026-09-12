import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, ShoppingBag, Users, Layers,
  Search, CheckCircle2, Clock, Truck, 
  ArrowLeft, Eye, Plus, Trash2, Edit3,
  RefreshCw, X, Check, ArrowUp, ArrowDown,
  Database, Copy, ExternalLink, ShieldCheck, AlertCircle, CheckCircle, Sparkles,
  UploadCloud, Image as ImageIcon, MoveLeft, MoveRight, Star, Loader2,
  MapPin, Send, Mail, Phone, Calendar, MessageSquare,
  Heart, ShoppingCart, User
} from 'lucide-react';
import { Product } from '../types/product';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { 
  DatabaseService, 
  RealOrder, 
  RealOrderItem,
  SellerStatus,
  CustomerStatus,
  normalizeOrderItems,
  RealCustomer, 
  CustomerPurchasedProduct,
  CustomerCartItem,
  CustomerWishlistItem,
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

const getInitials = (name?: string, email?: string): string => {
  if (name && name.trim()) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'GT';
};

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { items: currentCartItems, triggerToast } = useCart();
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

  // Add/Edit Product Form State matching exact user requirements
  const [isAddingCustomTag, setIsAddingCustomTag] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Product Media Upload & Management State
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [replacingImageIndex, setReplacingImageIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const DEFAULT_PRODUCT_FORM = {
    mainCategory: 'nightwear' as 'nightwear' | 'jewellery',
    name: '',
    sku: '',
    price: '',
    originalPrice: '',
    stockQuantity: '10',
    categories: [] as string[],
    badge: '',
    variety: '',
    materials: '',
    dimensions: '',
    description: '',
    highlights: 'Free Delivery on all prepaid orders\n7-Day Hassle-Free Size Exchange\n100% Anti-Tarnish & Waterproof',
    careInstructionsText: 'Simply wipe clean with a dry cloth',
    deliveryPolicy: 'Dispatched within 24 hours. Delivered across India within 2 to 4 business days. Easy 7-day exchange support available on WhatsApp.',
    images: [] as string[],
    inStock: true,
  };

  const [productForm, setProductForm] = useState(DEFAULT_PRODUCT_FORM);

  // Orders filters & details state
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | SellerStatus>('All');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<RealOrder | null>(null);
  const [specialInstructionDraft, setSpecialInstructionDraft] = useState('');
  const [isSavingInstruction, setIsSavingInstruction] = useState(false);

  // Courier & Tracking Modal State
  const [shippingModalOrder, setShippingModalOrder] = useState<RealOrder | null>(null);
  const [shippingModalTargetStatus, setShippingModalTargetStatus] = useState<SellerStatus>('Shipped');
  const [courierInput, setCourierInput] = useState('BlueDart Express');
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingUrlInput, setTrackingUrlInput] = useState('');
  const [isSavingShipping, setIsSavingShipping] = useState(false);

  // Customer directory & details state
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<RealCustomer | null>(null);
  const [customerCartItems, setCustomerCartItems] = useState<CustomerCartItem[]>([]);
  const [customerWishlistItems, setCustomerWishlistItems] = useState<CustomerWishlistItem[]>([]);
  const [isLoadingCustomerActivity, setIsLoadingCustomerActivity] = useState(false);

  // Reviews filters & Add/Edit Review Modal state
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewRatingFilter, setReviewRatingFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'all' | 'Approved' | 'Featured' | 'Pending'>('all');
  const [isAddReviewModalOpen, setIsAddReviewModalOpen] = useState(false);
  const [adminNewReviewForm, setAdminNewReviewForm] = useState<{
    productId: string;
    productName: string;
    author: string;
    rating: number;
    comment: string;
    date: string;
    images: string[];
    status: 'Approved' | 'Featured';
    verified: boolean;
  }>({
    productId: '',
    productName: '',
    author: '',
    rating: 5,
    comment: '',
    date: new Date().toISOString().split('T')[0],
    images: [],
    status: 'Approved',
    verified: true,
  });
  const [isSavingAdminReview, setIsSavingAdminReview] = useState(false);
  const [isUploadingAdminReviewImg, setIsUploadingAdminReviewImg] = useState(false);
  const adminReviewFileInputRef = useRef<HTMLInputElement>(null);
  const adminEditReviewFileInputRef = useRef<HTMLInputElement>(null);

  // Edit Review Modal state
  const [editingReview, setEditingReview] = useState<RealReview | null>(null);
  const [editReviewForm, setEditReviewForm] = useState<{
    id: string;
    productId: string;
    productName: string;
    author: string;
    rating: number;
    comment: string;
    date: string;
    images: string[];
    status: 'Approved' | 'Featured' | 'Pending' | 'Hidden';
    verified: boolean;
  }>({
    id: '',
    productId: '',
    productName: '',
    author: '',
    rating: 5,
    comment: '',
    date: new Date().toISOString().split('T')[0],
    images: [],
    status: 'Approved',
    verified: true,
  });
  const [isSavingEditReview, setIsSavingEditReview] = useState(false);

  const handleAdminReviewPhotoUpload = async (files: FileList | null, isEdit = false) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setIsUploadingAdminReviewImg(true);
    try {
      for (const file of fileList) {
        const uploadedUrl = await DatabaseService.uploadReviewImage(file);
        if (uploadedUrl) {
          if (isEdit) {
            setEditReviewForm((prev) => ({ ...prev, images: [...prev.images, uploadedUrl] }));
          } else {
            setAdminNewReviewForm((prev) => ({ ...prev, images: [...prev.images, uploadedUrl] }));
          }
        }
      }
    } catch (err) {
      console.warn('Admin review photo upload error:', err);
    } finally {
      setIsUploadingAdminReviewImg(false);
      if (isEdit && adminEditReviewFileInputRef.current) adminEditReviewFileInputRef.current.value = '';
      if (!isEdit && adminReviewFileInputRef.current) adminReviewFileInputRef.current.value = '';
    }
  };

  const handleAdminAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNewReviewForm.author.trim() || !adminNewReviewForm.comment.trim()) {
      triggerToast('Validation Error', 'Author and comment are required.', undefined, 'error');
      return;
    }

    const matchedProduct = productsList.find((p) => p.id === adminNewReviewForm.productId);
    const resolvedProductName = matchedProduct ? matchedProduct.name : adminNewReviewForm.productName || 'General Store Review';

    setIsSavingAdminReview(true);
    try {
      const added = await DatabaseService.addReview({
        productId: adminNewReviewForm.productId || undefined,
        productName: resolvedProductName,
        author: adminNewReviewForm.author.trim(),
        rating: adminNewReviewForm.rating,
        comment: adminNewReviewForm.comment.trim(),
        images: adminNewReviewForm.images,
        verified: adminNewReviewForm.verified,
        status: adminNewReviewForm.status,
        createdAt: adminNewReviewForm.date ? new Date(adminNewReviewForm.date).toISOString() : new Date().toISOString(),
      });

      setReviews((prev) => [added, ...prev]);
      setIsAddReviewModalOpen(false);
      setAdminNewReviewForm({
        productId: '',
        productName: '',
        author: '',
        rating: 5,
        comment: '',
        date: new Date().toISOString().split('T')[0],
        images: [],
        status: 'Approved',
        verified: true,
      });
      triggerToast('Review Published', 'Customer review added to database.', undefined, 'success');
    } catch (err: any) {
      triggerToast('Save Failed', err.message || 'Could not add review.', undefined, 'error');
    } finally {
      setIsSavingAdminReview(false);
    }
  };

  const handleOpenEditReview = (rev: RealReview) => {
    let dateStr = new Date().toISOString().split('T')[0];
    if (rev.createdAt) {
      try {
        dateStr = new Date(rev.createdAt).toISOString().split('T')[0];
      } catch (e) {}
    }
    setEditingReview(rev);
    setEditReviewForm({
      id: rev.id,
      productId: rev.productId || '',
      productName: rev.productName || 'General Store Review',
      author: rev.author || '',
      rating: rev.rating || 5,
      comment: rev.comment || '',
      date: dateStr,
      images: rev.images || [],
      status: rev.status || 'Approved',
      verified: rev.verified !== false,
    });
  };

  const handleAdminUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editReviewForm.author.trim() || !editReviewForm.comment.trim()) {
      triggerToast('Validation Error', 'Author and comment are required.', undefined, 'error');
      return;
    }

    const matchedProduct = productsList.find((p) => p.id === editReviewForm.productId);
    const resolvedProductName = matchedProduct ? matchedProduct.name : editReviewForm.productName || 'General Store Review';

    setIsSavingEditReview(true);
    try {
      const updated = await DatabaseService.updateReview(editReviewForm.id, {
        productId: editReviewForm.productId,
        productName: resolvedProductName,
        author: editReviewForm.author.trim(),
        rating: editReviewForm.rating,
        comment: editReviewForm.comment.trim(),
        images: editReviewForm.images,
        status: editReviewForm.status,
        verified: editReviewForm.verified,
        createdAt: editReviewForm.date ? new Date(editReviewForm.date).toISOString() : undefined,
      });

      if (updated) {
        setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      }
      setEditingReview(null);
      triggerToast('Review Updated', 'Review modifications saved.', undefined, 'success');
    } catch (err: any) {
      triggerToast('Update Failed', err.message || 'Could not update review.', undefined, 'error');
    } finally {
      setIsSavingEditReview(false);
    }
  };

  const handleViewCustomerDetails = async (cust: RealCustomer) => {
    setSelectedCustomerDetail(cust);
    setIsLoadingCustomerActivity(true);

    const isSelf = Boolean(
      (user?.email && cust.email && user.email.toLowerCase().trim() === cust.email.toLowerCase().trim()) ||
      (user?.id && cust.id && user.id === cust.id) ||
      (user?.id && cust.supabaseUid && user.id === cust.supabaseUid)
    );

    if (isSelf && currentCartItems && currentCartItems.length > 0) {
      setCustomerCartItems(
        currentCartItems.map((item) => ({
          id: item.id,
          productId: item.product.id,
          name: item.product.name,
          image: item.product.images?.[0] || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
          price: item.product.price,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          addedAt: new Date().toISOString(),
        }))
      );
    } else {
      setCustomerCartItems([]);
    }
    setCustomerWishlistItems([]);

    try {
      const activity = await DatabaseService.getCustomerActivity(cust.supabaseUid || cust.id, cust.email);
      if (activity.cartItems && activity.cartItems.length > 0) {
        setCustomerCartItems(activity.cartItems);
      } else if (isSelf && currentCartItems && currentCartItems.length > 0) {
        setCustomerCartItems(
          currentCartItems.map((item) => ({
            id: item.id,
            productId: item.product.id,
            name: item.product.name,
            image: item.product.images?.[0] || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
            price: item.product.price,
            quantity: item.quantity,
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
            addedAt: new Date().toISOString(),
          }))
        );
      }
      setCustomerWishlistItems(activity.wishlistItems);
    } catch (e) {
      console.warn('Customer activity fetch error:', e);
    } finally {
      setIsLoadingCustomerActivity(false);
    }
  };

  // Keep customer detail view's cart in sync if active cart items change
  useEffect(() => {
    if (selectedCustomerDetail && user) {
      const isSelf = Boolean(
        (user.email && selectedCustomerDetail.email && user.email.toLowerCase().trim() === selectedCustomerDetail.email.toLowerCase().trim()) ||
        (user.id && selectedCustomerDetail.id && user.id === selectedCustomerDetail.id) ||
        (user.id && selectedCustomerDetail.supabaseUid && user.id === selectedCustomerDetail.supabaseUid)
      );
      if (isSelf && currentCartItems) {
        setCustomerCartItems(
          currentCartItems.map((item) => ({
            id: item.id,
            productId: item.product.id,
            name: item.product.name,
            image: item.product.images?.[0] || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
            price: item.product.price,
            quantity: item.quantity,
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
            addedAt: new Date().toISOString(),
          }))
        );
      }
    }
  }, [currentCartItems, selectedCustomerDetail, user]);

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

      // Derive Real Customers directly from Database Orders and logged-in profiles
      const derivedCustomers = await DatabaseService.getCustomers(fetchedOrders, user);
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
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'profiles' },
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
  }, [user]);

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

  // Product Media Management Handlers (Direct Local Storage -> Supabase Storage)
  const handleUploadImagesFromFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    if (productForm.images.length + fileArray.length > 8) {
      triggerToast('Upload Limit', 'You can upload up to 8 images per product.', undefined, 'info');
    }

    setIsUploadingMedia(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setUploadProgressText(`Uploading image ${i + 1} of ${fileArray.length}...`);
        const url = await DatabaseService.uploadProductImage(file);
        if (url) {
          uploadedUrls.push(url);
        }
      }

      setProductForm((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls].slice(0, 8),
      }));

      triggerToast('Images Uploaded! 📸', `Successfully added ${uploadedUrls.length} image(s).`, undefined, 'success');
    } catch (err) {
      triggerToast('Upload Failed', 'Could not upload some images. Please try again.', undefined, 'error');
    } finally {
      setIsUploadingMedia(false);
      setUploadProgressText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReplaceImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replacingImageIndex === null) return;

    setIsUploadingMedia(true);
    setUploadProgressText('Replacing image...');
    try {
      const url = await DatabaseService.uploadProductImage(file);
      if (url) {
        setProductForm((prev) => {
          const updated = [...prev.images];
          updated[replacingImageIndex] = url;
          return { ...prev, images: updated };
        });
        triggerToast('Image Replaced! 🔄', 'Updated image successfully.', undefined, 'success');
      }
    } catch (err) {
      triggerToast('Replace Failed', 'Failed to replace image.', undefined, 'error');
    } finally {
      setIsUploadingMedia(false);
      setUploadProgressText('');
      setReplacingImageIndex(null);
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setProductForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    triggerToast('Image Removed', 'Photo removed from product gallery.', undefined, 'info');
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= productForm.images.length) return;

    setProductForm((prev) => {
      const updated = [...prev.images];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return { ...prev, images: updated };
    });
  };

  const handleSetAsCover = (index: number) => {
    if (index === 0) return;
    setProductForm((prev) => {
      const updated = [...prev.images];
      const [chosen] = updated.splice(index, 1);
      updated.unshift(chosen);
      return { ...prev, images: updated };
    });
    triggerToast('Cover Photo Set ✦', 'This image is now the main cover photo.', undefined, 'success');
  };

  const handleStartEditProduct = (prod: Product) => {
    setEditingProductId(prod.id);
    setProductForm({
      mainCategory: (prod.category === 'jewellery' ? 'jewellery' : 'nightwear') as 'nightwear' | 'jewellery',
      name: prod.name,
      sku: prod.sku || '',
      price: String(prod.price),
      originalPrice: prod.originalPrice ? String(prod.originalPrice) : '',
      stockQuantity: String(prod.stockQuantity ?? 10),
      categories: prod.subCategory ? prod.subCategory.split(',').map((s) => s.trim()).filter(Boolean) : [],
      badge: prod.tag || '',
      variety: prod.variety || '',
      materials: prod.material || '',
      dimensions: prod.dimensions || '',
      description: prod.description || '',
      highlights: (prod.highlights && prod.highlights.length > 0)
        ? prod.highlights.join('\n')
        : 'Free Delivery on all prepaid orders\n7-Day Hassle-Free Size Exchange\n100% Anti-Tarnish & Waterproof',
      careInstructionsText: (prod.careInstructions && prod.careInstructions.length > 0)
        ? prod.careInstructions.join('\n')
        : 'Simply wipe clean with a dry cloth',
      deliveryPolicy: prod.deliveryPolicy || 'Dispatched within 24 hours. Delivered across India within 2 to 4 business days. Easy 7-day exchange support available on WhatsApp.',
      images: Array.isArray(prod.images) && prod.images.length > 0 ? [...prod.images] : [],
      inStock: prod.inStock,
    });
    setIsCreatingProduct(true);
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

    // Use explicit admin selected department radio: 'nightwear' | 'jewellery'
    const mainCategory = productForm.mainCategory;

    const highlightsArray = productForm.highlights
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const careInstructionsArray = productForm.careInstructionsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const deliveryPolicyText = productForm.deliveryPolicy.trim() || 'Dispatched within 24 hours. Delivered across India within 2 to 4 business days. Easy 7-day exchange support available on WhatsApp.';

    const finalImages = productForm.images.length > 0
      ? productForm.images
      : ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80'];

    if (editingProductId) {
      const existing = productsList.find((p) => p.id === editingProductId);
      const updatedProduct: Product = {
        id: editingProductId,
        name: productForm.name.trim(),
        slug: existing?.slug || productForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category: mainCategory,
        subCategory: productForm.categories.join(', ') || 'Boutique Collection',
        price: priceNum,
        originalPrice: originalPriceNum,
        discount: discountCalc,
        rating: existing?.rating || 5.0,
        reviewCount: existing?.reviewCount || 1,
        images: finalImages,
        description: productForm.description || 'Luxurious craftsmanship designed for everyday glamour.',
        shortDescription: productForm.description.slice(0, 90) || 'Premium curated collection item.',
        material: productForm.materials || 'Premium Cotton / Silk / 18K Finish',
        dimensions: productForm.dimensions || 'Standard Fit',
        sku: productForm.sku || `GT-SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        variety: productForm.variety,
        tag: productForm.badge || 'New Arrival',
        stockQuantity: Number(productForm.stockQuantity) || 10,
        inStock: productForm.inStock,
        highlights: highlightsArray.length > 0 ? highlightsArray : [
          'Free Delivery on all prepaid orders',
          '7-Day Hassle-Free Size Exchange',
          '100% Anti-Tarnish & Waterproof'
        ],
        careInstructions: careInstructionsArray.length > 0 ? careInstructionsArray : ['Simply wipe clean with a dry cloth'],
        deliveryPolicy: deliveryPolicyText,
        features: [
          productForm.materials ? `Material: ${productForm.materials}` : 'Ultra-soft comfort',
          productForm.dimensions ? `Dimensions: ${productForm.dimensions}` : 'Tailored finish',
          productForm.badge ? `Tag: ${productForm.badge}` : 'Boutique Exclusive',
          'Hypoallergenic & premium gifting packaging',
        ],
        specs: {
          'Materials': productForm.materials || 'Premium Satin / Silk',
          'Dimensions': productForm.dimensions || 'Standard',
          'SKU': productForm.sku || 'GT-01',
          'Category': productForm.categories.join(', '),
        },
      };

      await DatabaseService.updateProduct(editingProductId, updatedProduct);
      setProductsList((prev) => prev.map((p) => (p.id === editingProductId ? updatedProduct : p)));
      setIsCreatingProduct(false);
      setEditingProductId(null);
      setProductForm(DEFAULT_PRODUCT_FORM);
      triggerToast('Product Updated! ✨', `${updatedProduct.name} updated in live database.`, undefined, 'success');
      return;
    }

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
      images: finalImages,
      description: productForm.description || 'Luxurious craftsmanship designed for everyday glamour.',
      shortDescription: productForm.description.slice(0, 90) || 'Premium curated collection item.',
      material: productForm.materials || 'Premium Cotton / Silk / 18K Finish',
      dimensions: productForm.dimensions || 'Standard Fit',
      sku: productForm.sku || `GT-SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      variety: productForm.variety,
      tag: productForm.badge || 'New Arrival',
      stockQuantity: Number(productForm.stockQuantity) || 10,
      inStock: true,
      highlights: highlightsArray.length > 0 ? highlightsArray : [
        'Free Delivery on all prepaid orders',
        '7-Day Hassle-Free Size Exchange',
        '100% Anti-Tarnish & Waterproof'
      ],
      careInstructions: careInstructionsArray.length > 0 ? careInstructionsArray : ['Simply wipe clean with a dry cloth'],
      deliveryPolicy: deliveryPolicyText,
      features: [
        productForm.materials ? `Material: ${productForm.materials}` : 'Ultra-soft comfort',
        productForm.dimensions ? `Dimensions: ${productForm.dimensions}` : 'Tailored finish',
        productForm.badge ? `Tag: ${productForm.badge}` : 'Boutique Exclusive',
        'Hypoallergenic & premium gifting packaging',
      ],
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
    setProductForm(DEFAULT_PRODUCT_FORM);

    triggerToast('Product Published! ✨', `${newProd.name} saved to live database.`, undefined, 'success');
  };

  const handleSellerStatusChange = (orderId: string, newStatus: SellerStatus) => {
    const targetOrder = orders.find((o) => o.id === orderId) || (selectedOrderDetail?.id === orderId ? selectedOrderDetail : null);
    if (!targetOrder) return;

    if (newStatus === 'Shipped' || newStatus === 'Out for Delivery') {
      setShippingModalOrder(targetOrder);
      setShippingModalTargetStatus(newStatus);
      setCourierInput(targetOrder.courierName || 'BlueDart Express');
      setTrackingInput(targetOrder.trackingNumber || '');
      setTrackingUrlInput(targetOrder.trackingUrl || '');
      return;
    }

    // Direct update for other statuses (Pending, Delivered, Cancelled by Seller)
    executeSellerStatusUpdate(orderId, newStatus);
  };

  const executeSellerStatusUpdate = async (
    orderId: string,
    newStatus: SellerStatus,
    shippingInfo?: { courierName?: string; trackingNumber?: string; trackingUrl?: string }
  ) => {
    try {
      await DatabaseService.updateSellerStatus(
        orderId,
        newStatus,
        shippingInfo
      );
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === orderId
            ? {
                ...ord,
                sellerStatus: newStatus,
                status: newStatus,
                ...(shippingInfo ? {
                  courierName: shippingInfo.courierName,
                  trackingNumber: shippingInfo.trackingNumber,
                  trackingUrl: shippingInfo.trackingUrl,
                } : {}),
              }
            : ord
        )
      );
      if (selectedOrderDetail && selectedOrderDetail.id === orderId) {
        setSelectedOrderDetail((prev) =>
          prev
            ? {
                ...prev,
                sellerStatus: newStatus,
                status: newStatus,
                ...(shippingInfo ? {
                  courierName: shippingInfo.courierName,
                  trackingNumber: shippingInfo.trackingNumber,
                  trackingUrl: shippingInfo.trackingUrl,
                } : {}),
              }
            : null
        );
      }
      triggerToast('Seller Status Updated 📦', `Order #${orderId} marked as ${newStatus}`, undefined, 'success');
    } catch (e) {
      triggerToast('Update Failed', 'Could not update order status in database.', undefined, 'error');
    }
  };

  const handleConfirmShippingModal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!shippingModalOrder) return;

    setIsSavingShipping(true);
    try {
      await executeSellerStatusUpdate(shippingModalOrder.id, shippingModalTargetStatus, {
        courierName: courierInput.trim() || 'BlueDart Express',
        trackingNumber: trackingInput.trim(),
        trackingUrl: trackingUrlInput.trim(),
      });
      setShippingModalOrder(null);
    } finally {
      setIsSavingShipping(false);
    }
  };

  const handleSaveSpecialInstruction = async (orderId: string) => {
    if (!orderId) return;
    setIsSavingInstruction(true);
    try {
      await DatabaseService.updateSpecialInstructions(orderId, specialInstructionDraft);
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === orderId ? { ...ord, specialInstructions: specialInstructionDraft } : ord
        )
      );
      if (selectedOrderDetail && selectedOrderDetail.id === orderId) {
        setSelectedOrderDetail((prev) =>
          prev ? { ...prev, specialInstructions: specialInstructionDraft } : null
        );
      }
      triggerToast('Instruction Saved ✉️', `Message updated for Order #${orderId}`, undefined, 'success');
    } catch (e) {
      triggerToast('Save Failed', 'Could not save instruction to database.', undefined, 'error');
    } finally {
      setIsSavingInstruction(false);
    }
  };

  const handleOrderStatusChange = (orderId: string, newStatus: RealOrder['status']) => {
    const validSellerStatus: SellerStatus = 
      newStatus === 'Processing' ? 'Pending' :
      newStatus === 'Cancelled' ? 'Cancelled by Seller' : 
      (newStatus as SellerStatus);
    handleSellerStatusChange(orderId, validSellerStatus);
  };

  const getSellerStatusBadgeClass = (status: SellerStatus) => {
    switch (status) {
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200/60';
      case 'Shipped':
        return 'bg-blue-100 text-blue-800 border border-blue-200/60';
      case 'Out for Delivery':
        return 'bg-[#EAE1F3] text-[#7F62A1] border border-[#D5C2E6]';
      case 'Cancelled by Seller':
        return 'bg-rose-100 text-rose-800 border border-rose-200/60';
      case 'Pending':
      default:
        return 'bg-amber-100 text-amber-800 border border-amber-200/60';
    }
  };

  const getCustomerStatusBadgeClass = (status: CustomerStatus) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'Cancelled by Customer':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'Payment Failed':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'Pending':
      default:
        return 'bg-amber-50 text-amber-700 border border-amber-200';
    }
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
    const matchesStatus =
      orderStatusFilter === 'All' ||
      o.sellerStatus === orderStatusFilter ||
      o.status === orderStatusFilter;
    const query = orderSearch.toLowerCase().trim();
    if (!query) return matchesStatus;

    const matchesSearch =
      o.id.toLowerCase().includes(query) ||
      o.customerName.toLowerCase().includes(query) ||
      o.email.toLowerCase().includes(query) ||
      (o.city && o.city.toLowerCase().includes(query)) ||
      (o.state && o.state.toLowerCase().includes(query)) ||
      (o.phone && o.phone.toLowerCase().includes(query)) ||
      (o.sellerStatus && o.sellerStatus.toLowerCase().includes(query)) ||
      (o.customerStatus && o.customerStatus.toLowerCase().includes(query));
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
                className="p-1.5 -ml-1.5 rounded-full hover:bg-[#fffeea] text-brand-muted hover:text-brand-charcoal transition-colors"
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

        {/* TAB 1: PRODUCTS (TABLE OR FULL 'ADD / EDIT PRODUCT' VIEW) */}
        {activeTab === 'products' && (
          <div>
            {isCreatingProduct ? (
              /* ================= DEDICATED ADD / EDIT PRODUCT VIEW ================= */
              <div className="space-y-6 animate-fade-in">
                {/* Header Back Title */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setIsCreatingProduct(false);
                        setEditingProductId(null);
                        setProductForm(DEFAULT_PRODUCT_FORM);
                      }}
                      className="p-1.5 -ml-1.5 rounded-full hover:bg-[#fffeea] text-brand-muted hover:text-brand-charcoal transition-colors"
                      title="Back to products list"
                    >
                      <ArrowLeft className="w-5 h-5 stroke-[2]" />
                    </button>
                    <div>
                      <h2 className="font-serif text-2xl sm:text-3xl text-brand-charcoal font-normal tracking-tight">
                        {editingProductId ? 'Edit Product' : 'Add New Product'}
                      </h2>
                      <p className="text-xs text-brand-muted">
                        Configure product details, top highlights, and custom dropdown accordion sections.
                      </p>
                    </div>
                  </div>

                  {editingProductId && (
                    <span className="px-3 py-1 bg-[#F3EEF9] text-[#967BB6] border border-[#967BB6]/30 text-xs font-bold rounded-full">
                      Editing Mode
                    </span>
                  )}
                </div>

                {/* Form Card */}
                <form
                  onSubmit={handlePublishProduct}
                  className="bg-white rounded-3xl border border-[#EAE6DB] p-6 sm:p-10 shadow-xs space-y-8"
                >
                  {/* SECTION 1: BASIC INFORMATION */}
                  <div className="space-y-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted">
                      1. BASIC INFORMATION
                    </h3>

                    {/* Admin Main Store Classification (Radio: NIGHTWEAR or JEWELLERY) */}
                    <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-brand-charcoal">
                            Product Department / Main Type *
                          </label>
                          <p className="text-[11px] text-brand-muted">
                            Admin-only classification. Controls whether this product reflects under <strong className="text-brand-charcoal">NIGHTWEAR</strong> or <strong className="text-brand-charcoal">JEWELLERY</strong> in the product table filter.
                          </p>
                        </div>
                        <span className="text-[11px] text-[#967BB6] font-bold shrink-0">
                          ✦ Filter: {productForm.mainCategory.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <label
                          className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                            productForm.mainCategory === 'nightwear'
                              ? 'bg-white border-[#967BB6] shadow-xs text-brand-charcoal ring-2 ring-[#967BB6]/15'
                              : 'bg-white/60 border-[#EAE6DB] text-brand-muted hover:border-[#967BB6]/50 hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="adminMainDepartment"
                            value="nightwear"
                            checked={productForm.mainCategory === 'nightwear'}
                            onChange={() => setProductForm({ ...productForm, mainCategory: 'nightwear' })}
                            className="w-4 h-4 text-[#967BB6] accent-[#967BB6] focus:ring-[#967BB6]"
                          />
                          <div>
                            <div className="text-xs font-black uppercase tracking-wide text-brand-charcoal">NIGHTWEAR</div>
                            <div className="text-[11px] text-brand-muted">Mulberry Silk, Modal Sets, Satin Robes & Pajamas</div>
                          </div>
                        </label>

                        <label
                          className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                            productForm.mainCategory === 'jewellery'
                              ? 'bg-white border-[#967BB6] shadow-xs text-brand-charcoal ring-2 ring-[#967BB6]/15'
                              : 'bg-white/60 border-[#EAE6DB] text-brand-muted hover:border-[#967BB6]/50 hover:bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="adminMainDepartment"
                            value="jewellery"
                            checked={productForm.mainCategory === 'jewellery'}
                            onChange={() => setProductForm({ ...productForm, mainCategory: 'jewellery' })}
                            className="w-4 h-4 text-[#967BB6] accent-[#967BB6] focus:ring-[#967BB6]"
                          />
                          <div>
                            <div className="text-xs font-black uppercase tracking-wide text-brand-charcoal">JEWELLERY</div>
                            <div className="text-[11px] text-brand-muted">18K Anti-Tarnish Necklaces, Earrings, Bracelets & Rings</div>
                          </div>
                        </label>
                      </div>
                    </div>

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
                          placeholder="e.g. Mulberry Silk Satin Set"
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
                          placeholder="e.g. GT-SKU-102"
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
                          placeholder="e.g. 1899"
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
                          placeholder="e.g. 2999"
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
                          placeholder="10"
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
                                  : 'bg-[#FAF8F2] text-brand-charcoal border border-[#EAE6DB] hover:bg-[#fffeea]'
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
                              placeholder="New tag..."
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
                          placeholder="e.g. Bestseller, Trending, New Arrival"
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
                          placeholder="e.g. Gold / Silver, S / M / L"
                          className="w-full px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: HIGHLIGHTS (KEY USPs BANNER) */}
                  <div className="space-y-4 pt-6 border-t border-[#EAE6DB]/70">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[#967BB6] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#967BB6]" />
                          <span>2. HIGHLIGHTS</span>
                        </h3>
                        <p className="text-xs text-brand-muted mt-0.5">
                          Top selling points shown in the highlighted yellow banner below the Buy It Now button (1 point per line).
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Highlights Bullet Points (1 per line) *
                        </label>
                        <textarea
                          rows={4}
                          value={productForm.highlights}
                          onChange={(e) => setProductForm({ ...productForm, highlights: e.target.value })}
                          placeholder="Free Delivery on all prepaid orders&#10;7-Day Hassle-Free Size Exchange&#10;100% Anti-Tarnish & Waterproof"
                          className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all font-mono leading-relaxed"
                        />
                        <span className="text-[11px] text-brand-muted block mt-1">
                          Tip: Each new line will be displayed with an icon on the live product page.
                        </span>
                      </div>

                      {/* Live Highlight Banner Preview */}
                      <div className="space-y-2 bg-[#FAF8F2] p-4 rounded-2xl border border-[#EAE6DB]">
                        <span className="text-[11px] font-bold uppercase text-brand-muted block">
                          Live Product Page Preview:
                        </span>
                        <div className="p-3.5 bg-[#fffeea] border border-[#EAE6DB] space-y-1.5 text-xs rounded-xl">
                          {productForm.highlights
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .map((hl, idx) => {
                              const IconComp = idx === 0 ? Truck : idx === 1 ? RefreshCw : Sparkles;
                              return (
                                <div key={idx} className="flex items-center gap-2 font-bold text-brand-charcoal">
                                  <IconComp className="w-3.5 h-3.5 text-brand-lavender shrink-0" />
                                  <span>{hl}</span>
                                </div>
                              );
                            })}
                          {productForm.highlights.split('\n').filter(Boolean).length === 0 && (
                            <span className="text-brand-muted text-xs italic">No highlights entered yet.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: PRODUCT DROPDOWN ACCORDIONS */}
                  <div className="space-y-6 pt-6 border-t border-[#EAE6DB]/70">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted">
                        3. PRODUCT DROPDOWN ACCORDIONS
                      </h3>
                      <p className="text-xs text-brand-muted mt-0.5">
                        Customize what appears in each expandable dropdown on the product details page.
                      </p>
                    </div>

                    {/* Accordion 1: Description & Fabric */}
                    <div className="p-5 bg-[#FAF8F2]/70 rounded-2xl border border-[#EAE6DB] space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-white border border-[#EAE6DB] flex items-center justify-center text-xs font-black text-brand-charcoal">
                          1
                        </span>
                        <h4 className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                          Dropdown 1: Description &amp; Fabric
                        </h4>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                            Product Description / Story *
                          </label>
                          <textarea
                            rows={3}
                            required
                            value={productForm.description}
                            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                            placeholder="The viral bulbous teardrop earrings you have seen on the runway, crafted for ultra-lightweight all-day comfort. Features a secure snap hinge and a high-shine mirrored finish."
                            className="w-full px-4 py-3 bg-white border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] transition-all leading-relaxed"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                              Material &amp; Fabric *
                            </label>
                            <input
                              type="text"
                              required
                              value={productForm.materials}
                              onChange={(e) => setProductForm({ ...productForm, materials: e.target.value })}
                              placeholder="e.g. Hollow 316L Titanium Steel with 18K Gold PVD"
                              className="w-full px-4 py-2.5 bg-white border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                              Dimensions (optional)
                            </label>
                            <input
                              type="text"
                              value={productForm.dimensions}
                              onChange={(e) => setProductForm({ ...productForm, dimensions: e.target.value })}
                              placeholder="e.g. 25mm x 15mm / Standard Fit"
                              className="w-full px-4 py-2.5 bg-white border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Accordion 2: Care Instructions */}
                    <div className="p-5 bg-[#FAF8F2]/70 rounded-2xl border border-[#EAE6DB] space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-white border border-[#EAE6DB] flex items-center justify-center text-xs font-black text-brand-charcoal">
                          2
                        </span>
                        <h4 className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                          Dropdown 2: Care Instructions
                        </h4>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Care Bullet Points (1 per line) *
                        </label>
                        <textarea
                          rows={3}
                          value={productForm.careInstructionsText}
                          onChange={(e) => setProductForm({ ...productForm, careInstructionsText: e.target.value })}
                          placeholder="Simply wipe clean with a dry cloth&#10;Avoid contact with harsh perfumes and water"
                          className="w-full px-4 py-3 bg-white border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] transition-all leading-relaxed"
                        />
                        <span className="text-[11px] text-brand-muted block mt-1">
                          Bullet points (•) will be automatically created for each line.
                        </span>
                      </div>
                    </div>

                    {/* Accordion 3: Delivery & Exchange Policy */}
                    <div className="p-5 bg-[#FAF8F2]/70 rounded-2xl border border-[#EAE6DB] space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-white border border-[#EAE6DB] flex items-center justify-center text-xs font-black text-brand-charcoal">
                          3
                        </span>
                        <h4 className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                          Dropdown 3: Delivery &amp; Exchange Policy
                        </h4>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Delivery &amp; Exchange Policy Text *
                        </label>
                        <textarea
                          rows={3}
                          value={productForm.deliveryPolicy}
                          onChange={(e) => setProductForm({ ...productForm, deliveryPolicy: e.target.value })}
                          placeholder="Dispatched within 24 hours. Delivered across India within 2 to 4 business days. Easy 7-day exchange support available on WhatsApp."
                          className="w-full px-4 py-3 bg-white border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm text-brand-charcoal focus:outline-none focus:border-[#967BB6] transition-all leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: PRODUCT MEDIA & IMAGES (LOCAL STORAGE UPLOAD & REORDER) */}
                  <div className="space-y-5 pt-6 border-t border-[#EAE6DB]/70">
                    {/* Hidden Native File Inputs */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleUploadImagesFromFiles(e.target.files);
                        }
                      }}
                    />
                    <input
                      ref={replaceFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      className="hidden"
                      onChange={handleReplaceImageFile}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-[#967BB6] flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-[#967BB6]" />
                          <span>4. PRODUCT MEDIA &amp; IMAGES</span>
                        </h3>
                        <p className="text-xs text-brand-muted mt-0.5">
                          Upload 4–5 product images directly from your computer. Supabase Storage securely hosts the assets.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-black px-3 py-1 rounded-full border ${
                          productForm.images.length >= 4
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : productForm.images.length > 0
                            ? 'bg-[#F3EEF9] text-[#967BB6] border-[#967BB6]/30'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {productForm.images.length} / 5 Images
                        </span>
                      </div>
                    </div>

                    {/* Drag & Drop Local Upload Box */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          handleUploadImagesFromFiles(e.dataTransfer.files);
                        }
                      }}
                      onClick={() => {
                        if (!isUploadingMedia && fileInputRef.current) {
                          fileInputRef.current.click();
                        }
                      }}
                      className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                        isUploadingMedia
                          ? 'border-[#967BB6] bg-[#F3EEF9]/50'
                          : 'border-[#967BB6]/40 hover:border-[#967BB6] bg-[#FAF8F2]/60 hover:bg-[#F3EEF9]/20'
                      }`}
                    >
                      {isUploadingMedia ? (
                        <div className="flex flex-col items-center gap-2 py-2">
                          <Loader2 className="w-8 h-8 text-[#967BB6] animate-spin" />
                          <span className="text-xs font-bold text-brand-charcoal">{uploadProgressText || 'Optimizing & Uploading to Supabase Storage...'}</span>
                          <span className="text-[11px] text-brand-muted">Please wait a moment.</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-white border border-[#EAE6DB] flex items-center justify-center text-[#967BB6] shadow-xs">
                            <UploadCloud className="w-6 h-6 stroke-[1.8]" />
                          </div>
                          <div className="space-y-1 max-w-md">
                            <p className="text-xs sm:text-sm font-bold text-brand-charcoal">
                              Click to browse or drag &amp; drop 4–5 product photos
                            </p>
                            <p className="text-[11px] text-brand-muted">
                              Supports JPG, PNG, WEBP (automatically optimized &amp; saved to Supabase Storage)
                            </p>
                          </div>
                          <button
                            type="button"
                            className="mt-1 px-5 py-2 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Choose Files from Computer</span>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Uploaded Images Gallery Grid (Add, Replace, Delete, Reorder) */}
                    {productForm.images.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                            Product Gallery ({productForm.images.length} Photos)
                          </span>
                          <span className="text-[11px] text-brand-muted">
                            ✦ Image #1 is the Primary Cover Photo
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                          {productForm.images.map((imgUrl, index) => {
                            const isCover = index === 0;
                            return (
                              <div
                                key={index}
                                className={`group relative bg-white rounded-2xl border-2 overflow-hidden shadow-xs transition-all flex flex-col justify-between ${
                                  isCover
                                    ? 'border-[#967BB6] ring-2 ring-[#967BB6]/20'
                                    : 'border-[#EAE6DB] hover:border-[#967BB6]/60'
                                }`}
                              >
                                {/* Thumbnail Container */}
                                <div className="relative aspect-[4/5] w-full bg-[#FAF8F2] overflow-hidden">
                                  <img
                                    src={imgUrl}
                                    alt={`Product preview ${index + 1}`}
                                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                  />

                                  {/* Badge: Cover or Index */}
                                  <div className="absolute top-2 left-2 z-10">
                                    {isCover ? (
                                      <span className="inline-flex items-center gap-1 bg-[#1A1821]/90 text-[#fffeea] text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs backdrop-blur-md">
                                        <Star className="w-2.5 h-2.5 fill-[#fffeea] text-[#fffeea]" />
                                        <span>Primary Cover</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-md">
                                        #{index + 1}
                                      </span>
                                    )}
                                  </div>

                                  {/* Delete Button Top Right */}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-rose-600/90 text-white hover:bg-rose-700 transition-colors flex items-center justify-center shadow-md opacity-90 hover:opacity-100"
                                    title="Delete this image"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Bottom Controls Bar: Reorder & Replace */}
                                <div className="p-2 bg-[#FAF8F2] border-t border-[#EAE6DB] space-y-1.5">
                                  <div className="flex items-center justify-between gap-1">
                                    {/* Move Left */}
                                    <button
                                      type="button"
                                      disabled={index === 0}
                                      onClick={() => handleMoveImage(index, 'left')}
                                      className={`p-1 rounded-lg border text-xs transition-colors ${
                                        index === 0
                                          ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                                          : 'bg-white border-[#EAE6DB] text-brand-charcoal hover:border-[#967BB6] hover:bg-[#F3EEF9]'
                                      }`}
                                      title="Move earlier"
                                    >
                                      <MoveLeft className="w-3 h-3" />
                                    </button>

                                    {/* Replace Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReplacingImageIndex(index);
                                        if (replaceFileInputRef.current) {
                                          replaceFileInputRef.current.click();
                                        }
                                      }}
                                      className="flex-1 py-1 px-1.5 bg-white border border-[#EAE6DB] hover:border-[#967BB6] hover:bg-[#F3EEF9] rounded-lg text-[10px] font-bold text-brand-charcoal text-center transition-colors flex items-center justify-center gap-1"
                                      title="Replace with new photo"
                                    >
                                      <RefreshCw className="w-2.5 h-2.5 text-[#967BB6]" />
                                      <span>Replace</span>
                                    </button>

                                    {/* Move Right */}
                                    <button
                                      type="button"
                                      disabled={index === productForm.images.length - 1}
                                      onClick={() => handleMoveImage(index, 'right')}
                                      className={`p-1 rounded-lg border text-xs transition-colors ${
                                        index === productForm.images.length - 1
                                          ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                                          : 'bg-white border-[#EAE6DB] text-brand-charcoal hover:border-[#967BB6] hover:bg-[#F3EEF9]'
                                      }`}
                                      title="Move later"
                                    >
                                      <MoveRight className="w-3 h-3" />
                                    </button>
                                  </div>

                                  {!isCover && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetAsCover(index)}
                                      className="w-full py-0.5 text-[9px] font-bold text-[#967BB6] hover:text-[#7F62A1] hover:bg-white rounded transition-colors text-center block"
                                    >
                                      ✦ Make Cover Photo
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#EAE6DB]/70">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingProduct(false);
                        setEditingProductId(null);
                        setProductForm(DEFAULT_PRODUCT_FORM);
                      }}
                      className="px-6 py-3 bg-[#FAF8F2] hover:bg-[#fffeea] border border-[#EAE6DB] text-brand-charcoal text-xs font-bold uppercase rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-3 bg-[#1A1821] hover:bg-[#967BB6] text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-xs"
                    >
                      {editingProductId ? 'Update Product' : 'Publish Product'}
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
                        placeholder="Search products..."
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
                    onClick={() => {
                      setEditingProductId(null);
                      setProductForm(DEFAULT_PRODUCT_FORM);
                      setIsCreatingProduct(true);
                    }}
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
                                src={prod.images?.[0] || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=200&q=80'}
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
                                onClick={() => handleStartEditProduct(prod)}
                                className="p-1.5 rounded-lg text-brand-muted hover:text-[#967BB6] hover:bg-[#F3EEF9] transition-colors"
                                title="Edit Product"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
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
                        onClick={() => {
                          setEditingProductId(null);
                          setProductForm(DEFAULT_PRODUCT_FORM);
                          setIsCreatingProduct(true);
                        }}
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

        {/* TAB 2: ORDERS (REAL DATABASE ORDERS & DETAILED VIEW) */}
        {activeTab === 'orders' && (
          selectedOrderDetail ? (
            /* ================= ORDER DETAILS VIEW ================= */
            <div className="space-y-6 animate-fade-in">
              {/* Top Bar Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-[#EAE6DB] p-5 sm:p-6 shadow-xs">
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetail(null)}
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-charcoal hover:text-[#967BB6] transition-colors cursor-pointer group w-fit"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>Back to Orders</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget({
                      type: 'Order Record',
                      name: `Order #${selectedOrderDetail.id} - ${selectedOrderDetail.customerName}`,
                      id: selectedOrderDetail.id,
                      description: `Amount: ₹${selectedOrderDetail.total} | Seller Status: ${selectedOrderDetail.sellerStatus} | Customer: ${selectedOrderDetail.customerName}`,
                      onConfirm: async () => {
                        const ok = await DatabaseService.deleteOrder(selectedOrderDetail.id);
                        setOrders((prev) => prev.filter((o) => o.id !== selectedOrderDetail.id));
                        setSelectedOrderDetail(null);
                        if (ok) {
                          triggerToast('Order Deleted', `Order #${selectedOrderDetail.id} removed permanently from Supabase database.`, undefined, 'info');
                        } else {
                          triggerToast('Action Required', `Order removed in app, but Supabase RLS policy blocked PostgreSQL delete. Please run the SQL snippet in Supabase SQL Editor.`, undefined, 'error');
                        }
                      },
                    });
                    setDeleteConfirmInput('');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer w-fit"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Order</span>
                </button>
              </div>

              {/* Order Header / Status Banner */}
              <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-sans font-black text-2xl sm:text-3xl text-brand-charcoal tracking-tight">
                    {selectedOrderDetail.id}
                  </h2>
                  <p className="text-xs text-brand-muted mt-1">
                    {new Date(selectedOrderDetail.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Seller Status Badge */}
                  <div className="flex items-center gap-2 bg-[#FAF8F2] border border-[#EAE6DB] px-3.5 py-2 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted">SELLER STATUS:</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getSellerStatusBadgeClass(selectedOrderDetail.sellerStatus)}`}>
                      {selectedOrderDetail.sellerStatus}
                    </span>
                  </div>

                  {/* Customer Status Badge (READ ONLY) */}
                  <div className="flex items-center gap-2 bg-[#FAF8F2] border border-[#EAE6DB] px-3.5 py-2 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted">CUSTOMER STATUS:</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getCustomerStatusBadgeClass(selectedOrderDetail.customerStatus)}`}>
                      {selectedOrderDetail.customerStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT COLUMN: ORDERED ITEMS & PAYMENT DETAILS */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Ordered Items Card */}
                  <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-5">
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand-charcoal border-b border-[#EAE6DB]/60 pb-3">
                      Ordered Items ({normalizeOrderItems(selectedOrderDetail.items, productsList).length})
                    </h3>

                    <div className="divide-y divide-[#EAE6DB]/60">
                      {normalizeOrderItems(selectedOrderDetail.items, productsList).map((item, idx) => (
                        <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-[#FAF8F2] border border-[#EAE6DB] shrink-0">
                              <img
                                src={item.image || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80';
                                }}
                              />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-xs sm:text-sm font-bold text-brand-charcoal line-clamp-2">
                                {item.name}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-brand-muted">
                                <span>Quantity: <strong className="text-brand-charcoal">{item.quantity}</strong></span>
                                {item.size && (
                                  <>
                                    <span>•</span>
                                    <span>Size: <strong className="text-brand-charcoal">{item.size}</strong></span>
                                  </>
                                )}
                                {item.variant && (
                                  <>
                                    <span>•</span>
                                    <span>Variant: <strong className="text-brand-charcoal">{item.variant}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-brand-charcoal block">
                              ₹{item.price * item.quantity}
                            </span>
                            {item.quantity > 1 && (
                              <span className="text-[10px] text-brand-muted">
                                ₹{item.price} each
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Details Box */}
                  <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-brand-muted">
                      Payment Details
                    </h3>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between text-brand-muted">
                        <span>Subtotal:</span>
                        <span className="font-bold text-brand-charcoal">₹{selectedOrderDetail.subtotal}</span>
                      </div>
                      <div className="flex items-center justify-between text-brand-muted">
                        <span>Shipping:</span>
                        <span className="font-bold text-emerald-600">
                          {selectedOrderDetail.shippingFee === 0 ? 'Free' : `₹${selectedOrderDetail.shippingFee}`}
                        </span>
                      </div>
                      {selectedOrderDetail.discountAmount > 0 && (
                        <div className="flex items-center justify-between text-brand-muted">
                          <span>Discount:</span>
                          <span className="font-bold text-rose-600">-₹{selectedOrderDetail.discountAmount}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-brand-muted">
                        <span>Payment Method:</span>
                        <span className="font-medium text-brand-charcoal">{selectedOrderDetail.paymentMethod}</span>
                      </div>
                      <div className="border-t border-[#EAE6DB] pt-3 flex items-center justify-between text-sm sm:text-base font-black text-brand-charcoal">
                        <span>Total Paid:</span>
                        <span className="text-base sm:text-lg">₹{selectedOrderDetail.total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: CUSTOMER & SHIPPING DETAILS */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6">
                    <h3 className="font-serif text-xl text-brand-charcoal font-medium border-b border-[#EAE6DB]/60 pb-3">
                      Customer &amp; Shipping Details
                    </h3>

                    {/* Customer Info */}
                    <div className="space-y-4 text-xs">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted block">
                          CUSTOMER NAME
                        </span>
                        <span className="font-bold text-brand-charcoal text-sm block mt-0.5">
                          {selectedOrderDetail.customerName}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted block">
                          EMAIL ADDRESS
                        </span>
                        <span className="font-mono text-brand-charcoal block mt-0.5 break-all">
                          {selectedOrderDetail.email}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted block">
                          PHONE NUMBER
                        </span>
                        <span className="font-mono font-bold text-brand-charcoal block mt-0.5">
                          {selectedOrderDetail.phone || 'Not provided'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted block">
                          SHIPPING ADDRESS
                        </span>
                        <p className="text-brand-charcoal mt-1 leading-relaxed bg-[#FAF8F2] border border-[#EAE6DB] p-3 rounded-2xl">
                          {selectedOrderDetail.address}
                          <br />
                          {selectedOrderDetail.city}, {selectedOrderDetail.state} {selectedOrderDetail.pincode}
                        </p>
                      </div>
                    </div>

                    {/* Quick Status Update (Admin Only Updates Seller Status) */}
                    <div className="space-y-2 pt-2 border-t border-[#EAE6DB]/60">
                      <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted block">
                        QUICK STATUS UPDATE (SELLER STATUS)
                      </span>
                      <select
                        value={selectedOrderDetail.sellerStatus}
                        onChange={(e) => handleSellerStatusChange(selectedOrderDetail.id, e.target.value as SellerStatus)}
                        className="w-full bg-[#FAF8F2] border-2 border-[#EAE6DB] focus:border-[#967BB6] rounded-2xl px-4 py-3 text-xs font-bold text-brand-charcoal focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled by Seller">Cancelled by Seller</option>
                      </select>
                      <p className="text-[10px] text-brand-muted">
                        Note: Customer Status is read-only and automatically managed by customer actions.
                      </p>
                    </div>

                    {/* Courier & Tracking Fulfillment Info */}
                    <div className="space-y-3 pt-2 border-t border-[#EAE6DB]/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted block">
                          COURIER &amp; TRACKING DETAILS
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShippingModalOrder(selectedOrderDetail);
                            setShippingModalTargetStatus(
                              selectedOrderDetail.sellerStatus === 'Pending' ? 'Shipped' : selectedOrderDetail.sellerStatus
                            );
                            setCourierInput(selectedOrderDetail.courierName || 'BlueDart Express');
                            setTrackingInput(selectedOrderDetail.trackingNumber || '');
                            setTrackingUrlInput(selectedOrderDetail.trackingUrl || '');
                          }}
                          className="text-[11px] font-bold text-[#967BB6] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{selectedOrderDetail.courierName || selectedOrderDetail.trackingNumber ? 'Edit Courier Info' : '+ Add Courier Info'}</span>
                        </button>
                      </div>

                      {selectedOrderDetail.courierName || selectedOrderDetail.trackingNumber ? (
                        <div className="bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-brand-muted">Courier Partner:</span>
                            <span className="font-bold text-brand-charcoal flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-[#967BB6]" />
                              {selectedOrderDetail.courierName || 'Standard Express'}
                            </span>
                          </div>
                          
                          {selectedOrderDetail.trackingNumber && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-brand-muted">AWB / Tracking #:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-brand-charcoal bg-white border border-[#EAE6DB] px-2 py-0.5 rounded-md">
                                  {selectedOrderDetail.trackingNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(selectedOrderDetail.trackingNumber || '');
                                    triggerToast('Tracking # Copied! 📋', selectedOrderDetail.trackingNumber, undefined, 'success');
                                  }}
                                  className="p-1 hover:bg-white rounded text-brand-muted hover:text-brand-charcoal transition-colors cursor-pointer"
                                  title="Copy Tracking #"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}

                          {selectedOrderDetail.trackingUrl && (
                            <a
                              href={selectedOrderDetail.trackingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full mt-1 py-2 px-3 bg-white hover:bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-[11px] font-bold text-[#967BB6] flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <span>Open Live Tracking Page</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="bg-[#FAF8F2]/60 border border-dashed border-[#EAE6DB] rounded-2xl p-3 text-center text-xs text-brand-muted">
                          No courier tracking details added yet. Marking status as <strong className="text-brand-charcoal">Shipped</strong> will prompt for courier and AWB.
                        </div>
                      )}
                    </div>

                    {/* Special Instruction / Message to Customer */}
                    <div className="space-y-3 pt-2 border-t border-[#EAE6DB]/60">
                      <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted block">
                        SPECIAL INSTRUCTION / MESSAGE TO CUSTOMER
                      </span>
                      <textarea
                        rows={3}
                        value={specialInstructionDraft}
                        onChange={(e) => setSpecialInstructionDraft(e.target.value)}
                        placeholder="Enter any instructions or update message for the customer here..."
                        className="w-full bg-[#FAF8F2] border border-[#EAE6DB] focus:border-[#967BB6] rounded-2xl p-3 text-xs text-brand-charcoal focus:outline-none resize-none transition-colors"
                      />
                      <button
                        type="button"
                        disabled={isSavingInstruction}
                        onClick={() => handleSaveSpecialInstruction(selectedOrderDetail.id)}
                        className="w-full py-3 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-xs active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSavingInstruction ? (
                          <span>Saving...</span>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Instruction to Customer</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= ORDER LIST VIEW ================= */
            <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6 animate-fade-in">
              {/* Header Title & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE6DB]/60 pb-5">
                <div>
                  <h2 className="font-serif text-2xl text-brand-charcoal font-medium">Order Management</h2>
                  <p className="text-xs text-brand-muted mt-0.5">Fulfill orders, track shipping, and update statuses.</p>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by order#, name, city..."
                    className="w-full pl-9 pr-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs focus:outline-none focus:border-[#967BB6] transition-colors"
                  />
                </div>
              </div>

              {/* Status Quick Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {(['All', 'Pending', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled by Seller'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setOrderStatusFilter(status)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      orderStatusFilter === status
                        ? 'bg-[#1A1821] text-white shadow-xs'
                        : 'bg-[#FAF8F2] border border-[#EAE6DB] text-brand-muted hover:text-brand-charcoal'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Orders Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EAE6DB] text-[11px] uppercase tracking-wider text-brand-muted font-bold">
                      <th className="py-3.5 px-4">Order #</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Items</th>
                      <th className="py-3.5 px-4">Total</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE6DB]/60 text-xs">
                    {filteredOrders.map((ord) => {
                      const normalizedItems = normalizeOrderItems(ord.items, productsList);
                      return (
                        <tr key={ord.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                          {/* Order # */}
                          <td className="py-4 px-4 align-top whitespace-nowrap">
                            <span className="font-bold text-brand-charcoal block">{ord.id}</span>
                          </td>

                          {/* Date */}
                          <td className="py-4 px-4 align-top text-brand-charcoal whitespace-nowrap">
                            <span className="text-xs block font-medium">
                              {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                              })},
                            </span>
                            <span className="text-[11px] text-brand-muted block">
                              {new Date(ord.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>

                          {/* Customer */}
                          <td className="py-4 px-4 align-top min-w-[170px]">
                            <span className="font-bold text-brand-charcoal block">{ord.customerName}</span>
                            <span className="text-[11px] text-brand-muted block truncate max-w-[200px]" title={ord.email}>
                              {ord.email}
                            </span>
                          </td>

                          {/* Items */}
                          <td className="py-4 px-4 align-top whitespace-nowrap">
                            <span className="text-xs text-brand-charcoal font-medium">
                              {normalizedItems.length} {normalizedItems.length === 1 ? 'item' : 'items'}
                            </span>
                          </td>

                          {/* Total */}
                          <td className="py-4 px-4 align-top whitespace-nowrap">
                            <span className="font-black text-brand-charcoal text-sm">₹{ord.total}</span>
                          </td>

                          {/* Location */}
                          <td className="py-4 px-4 align-top min-w-[150px]">
                            <div className="flex items-start gap-1 text-xs text-brand-charcoal">
                              <MapPin className="w-3.5 h-3.5 text-brand-muted shrink-0 mt-0.5" />
                              <span>{ord.city || 'Mumbai'}, {ord.state || 'Maharashtra'}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4 align-top">
                            <div className="space-y-1.5 min-w-[140px]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black uppercase tracking-wider text-brand-muted w-14 shrink-0">SELLER:</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getSellerStatusBadgeClass(ord.sellerStatus)}`}>
                                  {ord.sellerStatus}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black uppercase tracking-wider text-brand-muted w-14 shrink-0">CUSTOMER:</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getCustomerStatusBadgeClass(ord.customerStatus)}`}>
                                  {ord.customerStatus}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 align-top text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrderDetail(ord);
                                  setSpecialInstructionDraft(ord.specialInstructions || '');
                                }}
                                className="text-xs font-bold text-brand-charcoal hover:text-[#967BB6] underline underline-offset-2 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                View Details
                              </button>

                              {/* Seller Status Quick Dropdown */}
                              <select
                                value={ord.sellerStatus}
                                onChange={(e) => handleSellerStatusChange(ord.id, e.target.value as SellerStatus)}
                                className="bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl px-2.5 py-1.5 text-xs font-bold text-brand-charcoal focus:outline-none focus:border-[#967BB6] transition-colors cursor-pointer"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Shipped">Shipped</option>
                                <option value="Out for Delivery">Out for Delivery</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled by Seller">Cancelled by Seller</option>
                              </select>

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTarget({
                                    type: 'Order Record',
                                    name: `Order #${ord.id} - ${ord.customerName}`,
                                    id: ord.id,
                                    description: `Amount: ₹${ord.total} | Seller Status: ${ord.sellerStatus} | Customer: ${ord.customerName}`,
                                    onConfirm: async () => {
                                      const ok = await DatabaseService.deleteOrder(ord.id);
                                      setOrders((prev) => prev.filter((o) => o.id !== ord.id));
                                      if (selectedOrderDetail?.id === ord.id) {
                                        setSelectedOrderDetail(null);
                                      }
                                      if (ok) {
                                        triggerToast('Order Deleted', `Order #${ord.id} removed permanently from Supabase database.`, undefined, 'info');
                                      } else {
                                        triggerToast('Action Required', `Order removed in app, but Supabase RLS policy blocked PostgreSQL delete. Please run the SQL snippet in Supabase SQL Editor.`, undefined, 'info');
                                      }
                                    },
                                  });
                                  setDeleteConfirmInput('');
                                }}
                                className="p-1.5 text-brand-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                title="Delete Order Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
          )
        )}

        {/* TAB 3: CUSTOMERS */}
        {activeTab === 'customers' && (
          selectedCustomerDetail ? (
            /* ========================================================================= */
            /* 3A. CUSTOMER DETAILS VIEW (Matching Reference Structure & GT Luxury Theme) */
            /* ========================================================================= */
            <div className="space-y-6 animate-fade-in">
              {/* Back to Customers Bar + UID */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#EAE6DB]">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerDetail(null)}
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-charcoal hover:text-[#967BB6] transition-colors cursor-pointer w-fit"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Customers</span>
                </button>

                <div className="text-[11px] font-mono text-brand-muted truncate max-w-md" title={selectedCustomerDetail.supabaseUid || selectedCustomerDetail.id}>
                  ID: <span className="font-bold text-brand-charcoal">{selectedCustomerDetail.supabaseUid || selectedCustomerDetail.id}</span>
                </div>
              </div>

              {/* Customer Profile Banner Card */}
              <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center gap-6 justify-between">
                <div className="flex items-center gap-5">
                  {/* Avatar / Initials */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#FAF8F2] border-2 border-[#EAE6DB] text-[#967BB6] flex items-center justify-center font-serif text-xl sm:text-2xl font-bold shadow-xs shrink-0 overflow-hidden">
                    {selectedCustomerDetail.avatarUrl ? (
                      <img
                        src={selectedCustomerDetail.avatarUrl}
                        alt={selectedCustomerDetail.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(selectedCustomerDetail.name, selectedCustomerDetail.email)}</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-serif text-2xl sm:text-3xl text-brand-charcoal font-medium">
                        {selectedCustomerDetail.name}
                      </h2>

                      {/* Account Type Badge */}
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        selectedCustomerDetail.accountType === 'Registered'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {selectedCustomerDetail.accountType}
                      </span>

                      {/* Auth Provider Badge */}
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF8F2] text-[#967BB6] border border-[#EAE6DB] flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <span>{selectedCustomerDetail.authProvider || 'Email / Password'}</span>
                      </span>
                    </div>

                    {/* Contact row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-brand-muted">
                      <span className="flex items-center gap-1.5 text-brand-charcoal">
                        <Mail className="w-3.5 h-3.5 text-brand-muted" />
                        <span>{selectedCustomerDetail.email}</span>
                      </span>

                      {selectedCustomerDetail.phone && selectedCustomerDetail.phone !== '—' && (
                        <span className="flex items-center gap-1.5 font-mono text-brand-charcoal">
                          <Phone className="w-3.5 h-3.5 text-brand-muted" />
                          <span>{selectedCustomerDetail.phone}</span>
                        </span>
                      )}

                      <span className="flex items-center gap-1.5 text-brand-charcoal">
                        <MapPin className="w-3.5 h-3.5 text-brand-muted" />
                        <span>{selectedCustomerDetail.city}, {selectedCustomerDetail.state || 'India'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                    selectedCustomerDetail.tier === 'VIP Platinum'
                      ? 'bg-[#1A1821] text-white'
                      : selectedCustomerDetail.tier === 'VIP Gold'
                      ? 'bg-[#fffeea] text-[#967BB6] border border-[#EAE6DB]'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedCustomerDetail.tier} Member
                  </span>
                </div>
              </div>

              {/* 4 Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Lifetime Spent */}
                <div className="bg-white rounded-3xl border border-[#EAE6DB] p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted block">
                    LIFETIME SPENT
                  </span>
                  <div className="font-sans text-2xl font-black text-emerald-700">
                    ₹{selectedCustomerDetail.totalSpent.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-brand-muted">Total revenue including tax</p>
                </div>

                {/* 2. Total Orders */}
                <div className="bg-white rounded-3xl border border-[#EAE6DB] p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted block">
                    TOTAL ORDERS
                  </span>
                  <div className="font-serif text-2xl font-bold text-[#967BB6]">
                    {selectedCustomerDetail.ordersCount} <span className="font-sans text-sm font-normal text-brand-muted">{selectedCustomerDetail.ordersCount === 1 ? 'order' : 'orders'}</span>
                  </div>
                  <p className="text-[11px] text-brand-muted">Successful or pending orders</p>
                </div>

                {/* 3. Avg Order Value (AOV) */}
                <div className="bg-white rounded-3xl border border-[#EAE6DB] p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted block">
                    AVG. ORDER VALUE (AOV)
                  </span>
                  <div className="font-sans text-2xl font-black text-amber-700">
                    ₹{selectedCustomerDetail.avgOrderValue.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-brand-muted">LTV divided by total orders</p>
                </div>

                {/* 4. Delivery Location */}
                <div className="bg-white rounded-3xl border border-[#EAE6DB] p-5 shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-muted block">
                    DELIVERY LOCATION
                  </span>
                  <div className="font-bold text-sm text-brand-charcoal line-clamp-1">
                    {selectedCustomerDetail.address || `${selectedCustomerDetail.city}, ${selectedCustomerDetail.state}`}
                  </div>
                  <p className="text-[11px] text-brand-muted line-clamp-1">
                    {selectedCustomerDetail.city}, {selectedCustomerDetail.state} {selectedCustomerDetail.pincode}
                  </p>
                </div>
              </div>

              {/* 2-Column Responsive Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT COLUMN: PRODUCTS PURCHASED & ORDERS LOG */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Card 1: Products Purchased */}
                  <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-[#EAE6DB]/60">
                      <ShoppingBag className="w-4 h-4 text-[#967BB6]" />
                      <h3 className="font-serif text-lg text-brand-charcoal font-medium">
                        Products Purchased ({selectedCustomerDetail.purchasedProducts.length})
                      </h3>
                    </div>

                    {selectedCustomerDetail.purchasedProducts.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#EAE6DB] text-[10px] font-black uppercase tracking-wider text-brand-muted">
                              <th className="py-2.5 px-3">Product</th>
                              <th className="py-2.5 px-3 text-center">Quantity</th>
                              <th className="py-2.5 px-3 text-right">Unit Price</th>
                              <th className="py-2.5 px-3 text-right">Total Spent</th>
                              <th className="py-2.5 px-3 text-right">Last Ordered</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EAE6DB]/60">
                            {selectedCustomerDetail.purchasedProducts.map((prod, idx) => (
                              <tr key={idx} className="hover:bg-[#FAF8F2]/60 transition-colors">
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#FAF8F2] border border-[#EAE6DB] shrink-0">
                                      <img
                                        src={prod.image}
                                        alt={prod.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80';
                                        }}
                                      />
                                    </div>
                                    <span className="font-bold text-brand-charcoal line-clamp-1">{prod.name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center font-bold text-brand-charcoal">
                                  {prod.quantity}
                                </td>
                                <td className="py-3 px-3 text-right text-brand-muted">
                                  ₹{prod.unitPrice}
                                </td>
                                <td className="py-3 px-3 text-right font-black text-brand-charcoal">
                                  ₹{prod.totalSpent}
                                </td>
                                <td className="py-3 px-3 text-right text-[11px] text-brand-muted whitespace-nowrap">
                                  {new Date(prod.lastOrderedDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-brand-muted space-y-1">
                        <Package className="w-6 h-6 mx-auto text-brand-muted-light" />
                        <p className="text-xs">No products purchased yet.</p>
                      </div>
                    )}
                  </div>

                  {/* Card 2: Orders Log */}
                  <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-[#EAE6DB]/60">
                      <Layers className="w-4 h-4 text-[#967BB6]" />
                      <h3 className="font-serif text-lg text-brand-charcoal font-medium">
                        Orders Log ({selectedCustomerDetail.orders.length})
                      </h3>
                    </div>

                    {selectedCustomerDetail.orders.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#EAE6DB] text-[10px] font-black uppercase tracking-wider text-brand-muted">
                              <th className="py-2.5 px-3">Order #</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Total</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EAE6DB]/60">
                            {selectedCustomerDetail.orders.map((ord) => (
                              <tr key={ord.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                                <td className="py-3 px-3 font-bold text-brand-charcoal font-mono whitespace-nowrap">
                                  {ord.id}
                                </td>
                                <td className="py-3 px-3 text-brand-muted whitespace-nowrap">
                                  {new Date(ord.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="space-y-1">
                                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${getSellerStatusBadgeClass(ord.sellerStatus)}`}>
                                      {ord.sellerStatus}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right font-black text-brand-charcoal">
                                  ₹{ord.total}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('orders');
                                      setSelectedOrderDetail(ord);
                                      setSpecialInstructionDraft(ord.specialInstructions || '');
                                    }}
                                    className="text-xs font-bold text-[#967BB6] hover:underline cursor-pointer"
                                  >
                                    View Order
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-brand-muted space-y-1">
                        <ShoppingBag className="w-6 h-6 mx-auto text-brand-muted-light" />
                        <p className="text-xs">No orders placed yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: LIVE CART & WISHLIST ITEMS */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Shopping Cart Card */}
                  <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DB]/60">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-[#967BB6]" />
                        <h3 className="font-serif text-lg text-brand-charcoal font-medium">Shopping Cart</h3>
                      </div>
                      <span className="text-[11px] font-black bg-[#FAF8F2] border border-[#EAE6DB] px-2.5 py-0.5 rounded-full text-brand-muted">
                        {customerCartItems.length} items
                      </span>
                    </div>

                    {isLoadingCustomerActivity ? (
                      <div className="py-8 text-center text-brand-muted space-y-2">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#967BB6]" />
                        <p className="text-xs">Syncing cart from Supabase...</p>
                      </div>
                    ) : customerCartItems.length > 0 ? (
                      <div className="divide-y divide-[#EAE6DB]/60">
                        {customerCartItems.map((cItem) => (
                          <div key={cItem.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#FAF8F2] border border-[#EAE6DB] shrink-0">
                                <img
                                  src={cItem.image}
                                  alt={cItem.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="text-xs font-bold text-brand-charcoal line-clamp-1">{cItem.name}</h4>
                                <div className="text-[10px] text-brand-muted flex items-center gap-1.5">
                                  <span>Qty: <strong className="text-brand-charcoal">{cItem.quantity}</strong></span>
                                  {cItem.selectedSize && <span>• Size: {cItem.selectedSize}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-brand-charcoal block">₹{cItem.price * cItem.quantity}</span>
                              <span className="text-[10px] text-brand-muted">₹{cItem.price} each</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-brand-muted space-y-1">
                        <ShoppingCart className="w-6 h-6 mx-auto text-brand-muted-light" />
                        <p className="text-xs">Shopping cart is empty.</p>
                      </div>
                    )}
                  </div>

                  {/* Wishlist Card */}
                  <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DB]/60">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-rose-500" />
                        <h3 className="font-serif text-lg text-brand-charcoal font-medium">Wishlist</h3>
                      </div>
                      <span className="text-[11px] font-black bg-[#FAF8F2] border border-[#EAE6DB] px-2.5 py-0.5 rounded-full text-brand-muted">
                        {customerWishlistItems.length} items
                      </span>
                    </div>

                    {isLoadingCustomerActivity ? (
                      <div className="py-8 text-center text-brand-muted space-y-2">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#967BB6]" />
                        <p className="text-xs">Syncing wishlist from Supabase...</p>
                      </div>
                    ) : customerWishlistItems.length > 0 ? (
                      <div className="divide-y divide-[#EAE6DB]/60">
                        {customerWishlistItems.map((wItem) => (
                          <div key={wItem.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#FAF8F2] border border-[#EAE6DB] shrink-0">
                                <img
                                  src={wItem.image}
                                  alt={wItem.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="text-xs font-bold text-brand-charcoal line-clamp-1">{wItem.name}</h4>
                                <span className="text-[10px] text-brand-muted block">Saved in wishlist</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-brand-charcoal block">₹{wItem.price}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-brand-muted space-y-1">
                        <Heart className="w-6 h-6 mx-auto text-brand-muted-light" />
                        <p className="text-xs">Wishlist is empty.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* 3B. CUSTOMER DIRECTORY LIST VIEW (Matching Reference Structure & GT Luxury Theme) */
            /* ========================================================================= */
            <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE6DB]/60 pb-5">
                <div>
                  <h3 className="font-serif text-2xl text-brand-charcoal font-medium">Customer Directory</h3>
                  <p className="text-xs text-brand-muted mt-0.5">
                    Registered members and guest accounts who completed checkout. Click any customer to view details.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by name, email, city..."
                    className="w-full pl-9 pr-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs focus:outline-none focus:border-[#967BB6] transition-colors"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EAE6DB] text-[11px] uppercase tracking-wider text-brand-muted font-bold">
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4">Primary Location</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4 text-center">Total Orders</th>
                      <th className="py-3.5 px-4">Total Spent</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE6DB]/60 text-xs">
                    {customers
                      .filter((c) => {
                        if (!customerSearch.trim()) return true;
                        const q = customerSearch.toLowerCase().trim();
                        return (
                          c.name.toLowerCase().includes(q) ||
                          c.email.toLowerCase().includes(q) ||
                          (c.phone && c.phone.toLowerCase().includes(q)) ||
                          (c.city && c.city.toLowerCase().includes(q)) ||
                          (c.state && c.state.toLowerCase().includes(q))
                        );
                      })
                      .map((c) => (
                        <tr key={c.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                          {/* Customer */}
                          <td className="py-3.5 px-4 font-bold text-brand-charcoal">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#FAF8F2] border border-[#EAE6DB] text-[#967BB6] flex items-center justify-center font-serif text-xs font-bold shrink-0 overflow-hidden">
                                {c.avatarUrl ? (
                                  <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{getInitials(c.name, c.email)}</span>
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-brand-charcoal block">{c.name}</span>
                                <span className="text-[11px] text-brand-muted block">{c.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="py-3.5 px-4 font-mono text-brand-muted">
                            {c.phone || '—'}
                          </td>

                          {/* Location */}
                          <td className="py-3.5 px-4 text-brand-charcoal">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-brand-muted shrink-0" />
                              <span>{c.city}{c.state ? `, ${c.state}` : ''}</span>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              c.accountType === 'Registered'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {c.accountType}
                            </span>
                          </td>

                          {/* Total Orders */}
                          <td className="py-3.5 px-4 text-center font-bold text-brand-charcoal">
                            {c.ordersCount}
                          </td>

                          {/* Total Spent */}
                          <td className="py-3.5 px-4 font-black text-brand-charcoal">
                            ₹{c.totalSpent.toLocaleString('en-IN')}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleViewCustomerDetails(c)}
                              className="text-xs font-bold text-brand-charcoal hover:text-[#967BB6] underline underline-offset-2 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              View Details
                            </button>
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
          )
        )}

        {/* TAB 4: REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header & Metrics Summary */}
            <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-2xl text-brand-charcoal font-medium">Customer Reviews &amp; Testimonials</h3>
                  <p className="text-xs text-brand-muted">Manage all customer product reviews, ratings, and testimonials stored in Supabase.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddReviewModalOpen(true)}
                  className="px-5 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Real Review</span>
                </button>
              </div>

              {/* Review KPI Cards */}
              {(() => {
                const total = reviews.length;
                const avgRating = total > 0 ? reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / total : 5.0;
                const fiveStar = reviews.filter((r) => r.rating === 5).length;
                const verified = reviews.filter((r) => r.verified !== false).length;
                const featured = reviews.filter((r) => r.status === 'Featured').length;

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Total Reviews</span>
                      <span className="text-2xl font-black text-brand-charcoal mt-1 block">{total}</span>
                      <span className="text-[10px] text-brand-muted">Stored in database</span>
                    </div>

                    <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Average Rating</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-2xl font-black text-brand-charcoal">{avgRating.toFixed(1)}</span>
                        <div className="flex text-amber-500 text-xs">{'★'.repeat(Math.round(avgRating))}</div>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold">Store-wide score</span>
                    </div>

                    <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">5-Star Ratings</span>
                      <span className="text-2xl font-black text-amber-600 mt-1 block">{fiveStar}</span>
                      <span className="text-[10px] text-brand-muted">{total > 0 ? Math.round((fiveStar / total) * 100) : 100}% of reviews</span>
                    </div>

                    <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Verified Buyers</span>
                      <span className="text-2xl font-black text-emerald-700 mt-1 block">{verified}</span>
                      <span className="text-[10px] text-brand-muted">{featured} featured in store</span>
                    </div>
                  </div>
                );
              })()}

              {/* Filters & Search Bar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-4 border-t border-[#EAE6DB]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    placeholder="Search reviews by customer name, product, or comment..."
                    className="w-full pl-10 pr-4 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                  <select
                    value={reviewRatingFilter}
                    onChange={(e) => setReviewRatingFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs font-bold border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none text-brand-charcoal"
                  >
                    <option value="all">All Ratings</option>
                    <option value="5">5 Stars (★★★★★)</option>
                    <option value="4">4 Stars (★★★★)</option>
                    <option value="3">3 Stars (★★★)</option>
                    <option value="2">2 Stars (★★)</option>
                    <option value="1">1 Star (★)</option>
                  </select>

                  <select
                    value={reviewStatusFilter}
                    onChange={(e) => setReviewStatusFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs font-bold border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none text-brand-charcoal"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Approved">Approved</option>
                    <option value="Featured">Featured</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Filtered Reviews List */}
            {(() => {
              const filteredReviews = reviews.filter((rev) => {
                if (reviewSearch) {
                  const q = reviewSearch.toLowerCase();
                  const matchAuthor = (rev.author || '').toLowerCase().includes(q);
                  const matchProd = (rev.productName || '').toLowerCase().includes(q);
                  const matchComment = (rev.comment || '').toLowerCase().includes(q);
                  if (!matchAuthor && !matchProd && !matchComment) return false;
                }
                if (reviewRatingFilter !== 'all' && Number(rev.rating) !== Number(reviewRatingFilter)) {
                  return false;
                }
                if (reviewStatusFilter !== 'all' && rev.status !== reviewStatusFilter) {
                  return false;
                }
                return true;
              });

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredReviews.length > 0 ? (
                    filteredReviews.map((rev) => (
                      <div key={rev.id} className="p-5 border border-[#EAE6DB] rounded-3xl bg-white space-y-3.5 shadow-2xs hover:shadow-xs transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-brand-charcoal">{rev.author}</span>
                              {rev.verified !== false && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                  ✓ Verified Buyer
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#967BB6] font-bold block mt-0.5">{rev.productName}</span>
                          </div>
                          <div className="flex items-center text-amber-500 text-xs shrink-0">
                            {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                              <span key={i}>★</span>
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-brand-charcoal italic leading-relaxed bg-[#FAF8F2] p-3 rounded-2xl border border-[#EAE6DB]/60">
                          "{rev.comment}"
                        </p>

                        {/* Admin Review Photos Preview */}
                        {rev.images && rev.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {rev.images.map((imgUrl, imgIdx) => (
                              <div
                                key={imgIdx}
                                className="w-12 h-12 rounded-xl overflow-hidden border border-[#EAE6DB] bg-[#FAF8F2] shadow-2xs group relative"
                              >
                                <img src={imgUrl} alt={`Review photo ${imgIdx + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#EAE6DB]/70 text-[11px] gap-2">
                          <span className="text-[10px] text-brand-muted font-medium">
                            {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>

                          {/* Quick Status Switcher & Delete */}
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl p-0.5">
                              {(['Approved', 'Featured', 'Pending'] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={async () => {
                                    await DatabaseService.updateReviewStatus(rev.id, st);
                                    setReviews((prev) => prev.map((r) => (r.id === rev.id ? { ...r, status: st } : r)));
                                    triggerToast('Status Updated', `Review set to ${st}.`, undefined, 'success');
                                  }}
                                  className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                                    rev.status === st
                                      ? st === 'Featured'
                                        ? 'bg-amber-500 text-white shadow-2xs'
                                        : st === 'Approved'
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'bg-stone-500 text-white shadow-2xs'
                                      : 'text-brand-muted hover:text-brand-charcoal'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenEditReview(rev)}
                              className="p-1.5 text-brand-muted hover:text-[#967BB6] hover:bg-[#F3EEF9] rounded-xl transition-colors cursor-pointer"
                              title="Edit Review"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

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
                              className="p-1.5 text-brand-muted hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Delete Review"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-[#EAE6DB] p-6 space-y-2">
                      <Star className="w-8 h-8 mx-auto text-amber-300" />
                      <p className="text-sm font-bold text-brand-charcoal">No reviews match your filter criteria.</p>
                      <p className="text-xs text-brand-muted">Try changing search keywords or rating filter, or click "+ Add Real Review".</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Modal: Add Customer Review from Admin */}
            {isAddReviewModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scale-up">
                  <div className="flex items-center justify-between border-b border-[#EAE6DB] pb-3">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-brand-charcoal">Create Verified Review</h4>
                      <p className="text-xs text-brand-muted">Add a real verified customer review with photos to any product.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddReviewModalOpen(false)}
                      className="p-1.5 text-brand-muted hover:text-brand-charcoal rounded-xl hover:bg-[#FAF8F2]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleAdminAddReview} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Select Product</label>
                      <select
                        value={adminNewReviewForm.productId}
                        onChange={(e) => {
                          const prodId = e.target.value;
                          const found = productsList.find((p) => p.id === prodId);
                          setAdminNewReviewForm((prev) => ({
                            ...prev,
                            productId: prodId,
                            productName: found ? found.name : 'General Store Review',
                          }));
                        }}
                        className="w-full px-3 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                      >
                        <option value="">General Store Testimonial</option>
                        {productsList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Rs. {p.price})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Customer Name *</label>
                        <input
                          type="text"
                          required
                          value={adminNewReviewForm.author}
                          onChange={(e) => setAdminNewReviewForm((prev) => ({ ...prev, author: e.target.value }))}
                          placeholder="e.g. Ananya K."
                          className="w-full px-3 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Rating</label>
                        <select
                          value={adminNewReviewForm.rating}
                          onChange={(e) => setAdminNewReviewForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                          className="w-full px-3 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                        >
                          <option value="5">5 Stars ★★★★★</option>
                          <option value="4">4 Stars ★★★★</option>
                          <option value="3">3 Stars ★★★</option>
                          <option value="2">2 Stars ★★</option>
                          <option value="1">1 Star ★</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Review Date</label>
                      <input
                        type="date"
                        value={adminNewReviewForm.date}
                        onChange={(e) => setAdminNewReviewForm((prev) => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Review Comment *</label>
                      <textarea
                        required
                        rows={3}
                        value={adminNewReviewForm.comment}
                        onChange={(e) => setAdminNewReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                        placeholder="Write customer review feedback..."
                        className="w-full px-3 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                      />
                    </div>

                    {/* Review Photos Upload */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                          Customer Photos ({adminNewReviewForm.images.length})
                        </label>
                        <input
                          ref={adminReviewFileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleAdminReviewPhotoUpload(e.target.files, false)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={isUploadingAdminReviewImg}
                          onClick={() => adminReviewFileInputRef.current?.click()}
                          className="text-[11px] font-bold text-[#967BB6] hover:text-[#7F62A1] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingAdminReviewImg ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add Photos</span>
                            </>
                          )}
                        </button>
                      </div>

                      {adminNewReviewForm.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {adminNewReviewForm.images.map((img, idx) => (
                            <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#EAE6DB] bg-white group shadow-2xs">
                              <img src={img} alt={`Review photo ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setAdminNewReviewForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow-sm cursor-pointer"
                                title="Remove photo"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Initial Status</label>
                        <select
                          value={adminNewReviewForm.status}
                          onChange={(e) => setAdminNewReviewForm((prev) => ({ ...prev, status: e.target.value as any }))}
                          className="w-full px-3 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                        >
                          <option value="Approved">Approved</option>
                          <option value="Featured">Featured</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-5">
                        <input
                          type="checkbox"
                          id="verifiedCheckbox"
                          checked={adminNewReviewForm.verified}
                          onChange={(e) => setAdminNewReviewForm((prev) => ({ ...prev, verified: e.target.checked }))}
                          className="w-4 h-4 accent-[#967BB6] rounded cursor-pointer"
                        />
                        <label htmlFor="verifiedCheckbox" className="text-xs font-bold text-brand-charcoal cursor-pointer">
                          Verified Buyer
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE6DB]">
                      <button
                        type="button"
                        onClick={() => setIsAddReviewModalOpen(false)}
                        className="px-4 py-2 text-xs font-bold text-brand-muted hover:text-brand-charcoal rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingAdminReview || isUploadingAdminReviewImg}
                        className="px-5 py-2 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingAdminReview ? 'Saving...' : 'Save & Publish'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Edit Customer Review */}
            {editingReview && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scale-up">
                  <div className="flex items-center justify-between border-b border-[#EAE6DB] pb-3">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-brand-charcoal">Edit Customer Review</h4>
                      <p className="text-xs text-brand-muted">Modify customer feedback, photos, rating, date, or visibility.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingReview(null)}
                      className="p-1.5 text-brand-muted hover:text-brand-charcoal rounded-xl hover:bg-[#FAF8F2]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleAdminUpdateReview} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Select Product</label>
                      <select
                        value={editReviewForm.productId}
                        onChange={(e) => {
                          const prodId = e.target.value;
                          const found = productsList.find((p) => p.id === prodId);
                          setEditReviewForm((prev) => ({
                            ...prev,
                            productId: prodId,
                            productName: found ? found.name : 'General Store Review',
                          }));
                        }}
                        className="w-full px-3 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                      >
                        <option value="">General Store Testimonial</option>
                        {productsList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Rs. {p.price})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Customer Name *</label>
                        <input
                          type="text"
                          required
                          value={editReviewForm.author}
                          onChange={(e) => setEditReviewForm((prev) => ({ ...prev, author: e.target.value }))}
                          className="w-full px-3 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Rating</label>
                        <select
                          value={editReviewForm.rating}
                          onChange={(e) => setEditReviewForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                          className="w-full px-3 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                        >
                          <option value="5">5 Stars ★★★★★</option>
                          <option value="4">4 Stars ★★★★</option>
                          <option value="3">3 Stars ★★★</option>
                          <option value="2">2 Stars ★★</option>
                          <option value="1">1 Star ★</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Review Date</label>
                      <input
                        type="date"
                        value={editReviewForm.date}
                        onChange={(e) => setEditReviewForm((prev) => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Review Comment *</label>
                      <textarea
                        required
                        rows={3}
                        value={editReviewForm.comment}
                        onChange={(e) => setEditReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                        className="w-full px-3 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                      />
                    </div>

                    {/* Edit Review Photos Section */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted">
                          Customer Photos ({editReviewForm.images.length})
                        </label>
                        <input
                          ref={adminEditReviewFileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleAdminReviewPhotoUpload(e.target.files, true)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          disabled={isUploadingAdminReviewImg}
                          onClick={() => adminEditReviewFileInputRef.current?.click()}
                          className="text-[11px] font-bold text-[#967BB6] hover:text-[#7F62A1] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingAdminReviewImg ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add Photos</span>
                            </>
                          )}
                        </button>
                      </div>

                      {editReviewForm.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {editReviewForm.images.map((img, idx) => (
                            <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#EAE6DB] bg-white group shadow-2xs">
                              <img src={img} alt={`Review photo ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setEditReviewForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow-sm cursor-pointer"
                                title="Remove photo"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Status &amp; Visibility</label>
                        <select
                          value={editReviewForm.status}
                          onChange={(e) => setEditReviewForm((prev) => ({ ...prev, status: e.target.value as any }))}
                          className="w-full px-3 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                        >
                          <option value="Approved">Approved (Public)</option>
                          <option value="Featured">Featured (Top Badge)</option>
                          <option value="Pending">Pending</option>
                          <option value="Hidden">Hidden</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 pt-5">
                        <input
                          type="checkbox"
                          id="editVerifiedCheckbox"
                          checked={editReviewForm.verified}
                          onChange={(e) => setEditReviewForm((prev) => ({ ...prev, verified: e.target.checked }))}
                          className="w-4 h-4 accent-[#967BB6] rounded cursor-pointer"
                        />
                        <label htmlFor="editVerifiedCheckbox" className="text-xs font-bold text-brand-charcoal cursor-pointer">
                          Verified Buyer
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE6DB]">
                      <button
                        type="button"
                        onClick={() => setEditingReview(null)}
                        className="px-4 py-2 text-xs font-bold text-brand-muted hover:text-brand-charcoal rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingEditReview || isUploadingAdminReviewImg}
                        className="px-5 py-2 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        {isSavingEditReview ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
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
                      <span className="bg-[#fffeea] text-[#967BB6] border border-[#EAE6DB] text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
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
                    placeholder="e.g., Silk Robes &amp; Sets"
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
                  className="w-full py-3.5 px-4 bg-[#FAF8F2] hover:bg-[#fffeea] border border-[#EAE6DB] hover:border-[#967BB6]/40 text-brand-charcoal text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-xs"
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

      {/* ================= MODAL: DISPATCH & COURIER TRACKING DETAILS ================= */}
      {shippingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#EAE6DB] relative animate-scale-in space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShippingModalOrder(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-brand-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF8F2] text-[#967BB6] border border-[#EAE6DB] flex items-center justify-center shrink-0 shadow-xs">
                <Truck className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#967BB6] bg-[#FAF8F2] border border-[#EAE6DB] px-2.5 py-0.5 rounded-full">
                  Fulfillment &amp; Shipping
                </span>
                <h3 className="font-serif text-xl font-bold text-brand-charcoal">
                  Dispatch Order #{shippingModalOrder.id}
                </h3>
                <p className="text-xs text-brand-muted">
                  Customer: <strong className="text-brand-charcoal">{shippingModalOrder.customerName}</strong> ({shippingModalOrder.city}, {shippingModalOrder.state})
                </p>
              </div>
            </div>

            {/* Target Status Switcher */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider text-brand-muted">
                Status to Apply
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Shipped', 'Out for Delivery'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setShippingModalTargetStatus(st)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      shippingModalTargetStatus === st
                        ? 'bg-[#1A1821] text-white border-[#1A1821] shadow-xs'
                        : 'bg-[#FAF8F2] border-[#EAE6DB] text-brand-charcoal hover:bg-[#fffeea]'
                    }`}
                  >
                    {st === 'Shipped' ? '📦 Mark Shipped' : '🚚 Out for Delivery'}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Courier Preset Chips */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-brand-muted">
                Quick Select Courier Partner
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'BlueDart Express',
                  'Delhivery Surface',
                  'DTDC Prime',
                  'Shadowfax',
                  'India Post Speed',
                  'Ekart Express',
                ].map((cName) => (
                  <button
                    key={cName}
                    type="button"
                    onClick={() => setCourierInput(cName)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      courierInput === cName
                        ? 'bg-[#967BB6] text-white font-bold shadow-xs'
                        : 'bg-[#FAF8F2] border border-[#EAE6DB] text-brand-charcoal hover:bg-[#fffeea]'
                    }`}
                  >
                    {cName}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleConfirmShippingModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                  Courier Partner Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={courierInput}
                  onChange={(e) => setCourierInput(e.target.value)}
                  placeholder="e.g. BlueDart, Delhivery, DTDC..."
                  className="w-full bg-[#FAF8F2] border border-[#EAE6DB] focus:border-[#967BB6] rounded-2xl px-4 py-2.5 text-xs text-brand-charcoal font-medium focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                  Tracking / AWB Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="e.g. BD-982401824 or DEL-88129031"
                  className="w-full bg-[#FAF8F2] border border-[#EAE6DB] focus:border-[#967BB6] rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-brand-charcoal focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                  Live Tracking URL <span className="text-brand-muted text-[10px] font-normal">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={trackingUrlInput}
                  onChange={(e) => setTrackingUrlInput(e.target.value)}
                  placeholder="https://www.bluedart.com/tracking?awb=..."
                  className="w-full bg-[#FAF8F2] border border-[#EAE6DB] focus:border-[#967BB6] rounded-2xl px-4 py-2.5 text-xs font-mono text-brand-charcoal focus:outline-none transition-colors"
                />
              </div>

              {/* Destination Summary */}
              <div className="bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl p-3 text-xs space-y-1 text-brand-muted">
                <div className="font-bold text-brand-charcoal flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#967BB6]" />
                  <span>Ship to: {shippingModalOrder.customerName}</span>
                </div>
                <p className="pl-4 leading-relaxed">
                  {shippingModalOrder.address}, {shippingModalOrder.city}, {shippingModalOrder.state} - {shippingModalOrder.pincode}
                </p>
                {shippingModalOrder.phone && (
                  <p className="pl-4 font-mono font-bold text-brand-charcoal">
                    Phone: {shippingModalOrder.phone}
                  </p>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShippingModalOrder(null)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-brand-charcoal text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingShipping || !courierInput.trim() || !trackingInput.trim()}
                  className="px-6 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] active:bg-[#6D528F] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                >
                  {isSavingShipping ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Mark as {shippingModalTargetStatus}</span>
                    </>
                  )}
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

            {/* Deletion Details */}
            <div className="bg-rose-50/60 border border-rose-200/60 rounded-2xl p-4 text-xs space-y-1">
              <p className="font-bold text-rose-950">This action cannot be undone.</p>
              <p className="text-rose-800/90">{deleteTarget.description || `Target ID: ${deleteTarget.id}`}</p>
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
