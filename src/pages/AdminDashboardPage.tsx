import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, ShoppingBag, Users, Layers,
  Search, CheckCircle2, Clock, Truck, 
  ArrowLeft, Eye, Plus, Trash2, Edit3,
  RefreshCw, X, Check, ArrowUp, ArrowDown, RotateCcw,
  Database, Copy, ExternalLink, ShieldCheck, AlertCircle, CheckCircle, Sparkles,
  UploadCloud, Image as ImageIcon, MoveLeft, MoveRight, Star, Loader2,
  MapPin, Send, Mail, Phone, Calendar, MessageSquare,
  Heart, ShoppingCart, User, Ticket, Quote,
  ChevronDown, ChevronUp, Smartphone
} from 'lucide-react';
import { Product } from '../types/product';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
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
  DEFAULT_REVIEWS,
  RealTestimonial,
  DEFAULT_TESTIMONIALS,
  RealCoupon,
  RealCategory,
  PromotionItem,
  ShippingRules,
  FAQItem,
  StoreSettings,
  HomepageConfig,
  HomeBanner,
  HomeCategoryCard,
  HomeInfluencerReel,
  HomeValueProp,
  DEFAULT_HOMEPAGE_CONFIG
} from '../lib/databaseService';
import { supabase, isSupabaseConfigured, testSupabaseConnection, SupabaseConnectivityStatus, normalizeStorageUrl } from '../lib/supabase';
import { SUPABASE_SCHEMA_SQL } from '../lib/supabaseSchemaSql';

interface AdminDashboardPageProps {
  onNavigate: (page: string, category?: string) => void;
}

type AdminTab = 
  | 'products'
  | 'orders'
  | 'customers'
  | 'reviews'
  | 'testimonials'
  | 'coupons'
  | 'homepage'
  | 'promotions'
  | 'shipping'
  | 'faqs'
  | 'categories'
  | 'database'
  | 'settings';


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
  const { wishlistProducts: currentWishlistProducts } = useWishlist();
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [isLoadingData, setIsLoadingData] = useState(false);

  // View state for Products tab: 'list' | 'create'
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Real Database States initialized immediately from local persistent cache (0ms instant boot)
  const [productsList, setProductsList] = useState<Product[]>(() => DatabaseService.getCachedProducts());
  const [orders, setOrders] = useState<RealOrder[]>(() => DatabaseService.getCachedOrders());
  const [customers, setCustomers] = useState<RealCustomer[]>(() => DatabaseService.getCachedCustomers());
  const [reviews, setReviews] = useState<RealReview[]>(() => DatabaseService.getCachedReviews());
  const [coupons, setCoupons] = useState<RealCoupon[]>(() => DatabaseService.getCachedCoupons());
  const [categoriesList, setCategoriesList] = useState<RealCategory[]>(() => DatabaseService.getCachedCategories());
  const [dbStatus, setDbStatus] = useState<{
    isConfigured: boolean;
    url: string;
    storageBucket: { name: string; status: 'ready' | 'missing' | 'error'; message?: string };
    tables: { name: string; count: number; status: 'ready' | 'missing' | 'error'; message?: string }[];
  } | null>(null);
  const [connectivityInfo, setConnectivityInfo] = useState<SupabaseConnectivityStatus | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
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

  // Dedicated Testimonials Section State (for "WHAT OUR CUSTOMERS SAY")
  const [testimonials, setTestimonials] = useState<RealTestimonial[]>(() => DatabaseService.getCachedTestimonials());
  const [testimonialSearch, setTestimonialSearch] = useState('');
  const [testimonialFilter, setTestimonialFilter] = useState<'all' | 'live' | 'hidden'>('all');
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [editingTestimonialId, setEditingTestimonialId] = useState<string | null>(null);
  const [testimonialForm, setTestimonialForm] = useState<{
    author: string;
    productName: string;
    location: string;
    rating: number;
    comment: string;
    verified: boolean;
    isLive: boolean;
  }>({
    author: '',
    productName: '',
    location: 'Verified Buyer',
    rating: 5,
    comment: '',
    verified: true,
    isLive: true,
  });
  const [isSavingTestimonial, setIsSavingTestimonial] = useState(false);

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

  // Coupon management state
  const [newCouponForm, setNewCouponForm] = useState({
    code: '',
    percent: '',
    minSpend: '',
    usageLimit: '',
    showInList: false,
  });
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);

  // Homepage Settings State (Legacy & Rich HomepageConfig)
  const [announcementText, setAnnouncementText] = useState('✦ BUY 3 SETS FOR ₹2,999 ✦ FREE 18K GOLD POLISH GUARANTEE ✦ FREE SHIPPING ON ORDERS OVER ₹999 ✦');
  const [heroHeadline, setHeroHeadline] = useState('EVERYDAY LUXURY NIGHTWEAR & 18K JEWELS');
  const [heroSubtext, setHeroSubtext] = useState('Indulge in feather-soft Mulberry Silk & 18K Anti-Tarnish jewellery crafted for graceful everyday living.');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Complete Homepage Visual Content Editor State
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig>(() => DatabaseService.getCachedHomepageConfig());
  const [activeHomeSubTab, setActiveHomeSubTab] = useState<'banners' | 'categories' | 'marquee' | 'reels' | 'features'>('banners');
  const [isSavingHomepage, setIsSavingHomepage] = useState(false);
  const [isUploadingBannerImg, setIsUploadingBannerImg] = useState(false);
  const [isUploadingCatCardImg, setIsUploadingCatCardImg] = useState<string | null>(null);
  const [isUploadingReelImg, setIsUploadingReelImg] = useState<string | null>(null);
  const [newMarqueeInput, setNewMarqueeInput] = useState('');

  // Banner Modal State
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState<HomeBanner>({
    id: '',
    image: '',
    mobileImage: '',
    alt: 'Girly Tales Exclusive',
    category: 'all',
    title: '',
    subtitle: '',
    active: true,
    orderIndex: 0,
  });

  // Reel Modal State
  const [isReelModalOpen, setIsReelModalOpen] = useState(false);
  const [editingReelId, setEditingReelId] = useState<string | null>(null);
  const [reelForm, setReelForm] = useState<HomeInfluencerReel>({
    id: '',
    image: '',
    tagText: 'Cute & comfy',
    subTag: "PJ's ft. Girly Tales",
    views: '10.5k',
    productId: '',
    orderIndex: 0,
    active: true,
  });

  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const bannerModalFileInputRef = useRef<HTMLInputElement>(null);
  const catCardFileInputRef = useRef<HTMLInputElement>(null);
  const reelFileInputRef = useRef<HTMLInputElement>(null);
  const [activeReplacingBannerId, setActiveReplacingBannerId] = useState<string | null>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<{ id: string; isMobile: boolean } | null>(null);
  const [isHeroSectionOpen, setIsHeroSectionOpen] = useState(true);
  const [uploadingTargetCardId, setUploadingTargetCardId] = useState<string | null>(null);
  const [uploadingTargetReelId, setUploadingTargetReelId] = useState<string | null>(null);

  // Promotions State
  const [promotions, setPromotions] = useState<PromotionItem[]>([
    { id: 'p-1', name: 'Monsoon Silk Comfort Bundle', discount: 'Buy Any 3 Sets for ₹2,999', badge: 'Best Deal', active: true, bannerText: 'Flat 35% Savings on Silk Lounge Combos' },
    { id: 'p-2', name: '18K Gold Jewellery Welcome Gift', discount: 'Free Luxury Jewellery Pouch with every ₹1,500+ order', badge: 'Freebie', active: true, bannerText: 'Complimentary Anti-Tarnish Pouch included' },
    { id: 'p-3', name: 'VIP Secret Drop Sale', discount: 'Extra 10% for Registered Members', badge: 'Members Only', active: true, bannerText: 'Use code GIRLY10 at instant checkout' },
  ]);

  // Shipping Rules State
  const [shippingRules, setShippingRules] = useState<ShippingRules>({
    id: 'default',
    freeThreshold: 999,
    standardRate: 99,
    expressRate: 199,
    codHandlingFee: 49,
    estimatedDays: '2 to 4 Business Days',
    couriers: ['BlueDart Express', 'Delhivery Surface', 'DTDC Prime'],
  });

  // FAQs State
  const [faqs, setFaqs] = useState<FAQItem[]>([
    { id: 'f-1', category: 'Nightwear & Loungewear', question: 'How do I care for Mulberry silk and modal sets?', answer: 'We recommend gentle machine wash in cold water using a laundry wash bag, or delicate hand wash with mild liquid detergent. Line dry in shade to preserve color luster.' },
    { id: 'f-2', category: '18K Anti-Tarnish Jewellery', question: 'Can I wear the 18K jewellery while bathing or swimming?', answer: 'Yes! Our pieces are crafted with premium stainless steel / brass cores with vacuum-plated 18K real gold and protective clear ceramic seal, making them 100% waterproof, sweatproof, and hypoallergenic.' },
    { id: 'f-3', category: 'Shipping & Delivery', question: 'How soon will my order be dispatched and delivered?', answer: 'Orders placed before 2 PM IST are dispatched on the same business day. Delivery takes 2-4 business days for metro cities and 3-5 days for other locations.' },
    { id: 'f-4', category: 'Returns & Exchanges', question: 'What is your size exchange and return policy?', answer: 'We offer hassle-free 7-day doorstep size exchanges. If the nightwear size does not fit comfortably, you can request an exchange in 1 click from your account.' },
  ]);

  // Fast Parallel Database Loader with non-blocking background status check (resilient to individual table latency/errors)
  const loadDatabaseData = async (showToast = false) => {
    setIsLoadingData(true);
    try {
      const [
        ordersResult, 
        productsResult, 
        reviewsResult, 
        testimonialsResult,
        couponsResult, 
        catsResult,
        settingsResult,
        promosResult,
        shippingResult,
        faqsResult,
        homepageResult,
      ] = await Promise.allSettled([
        DatabaseService.getOrders(),
        DatabaseService.getProducts(true),
        DatabaseService.getReviews(),
        DatabaseService.getTestimonials(true),
        DatabaseService.getCoupons(),
        DatabaseService.getCategories(),
        DatabaseService.getStoreSettings(),
        DatabaseService.getPromotions(),
        DatabaseService.getShippingRules(),
        DatabaseService.getFaqs(),
        DatabaseService.getHomepageConfig(true),
      ]);

      const failedTables: string[] = [];

      let fetchedOrders: RealOrder[] = orders;
      if (ordersResult.status === 'fulfilled') {
        fetchedOrders = ordersResult.value;
        setOrders(fetchedOrders);
      } else {
        console.error('[Admin Orders Load Error]', ordersResult.reason);
        failedTables.push(`Orders: ${ordersResult.reason?.message || 'Failed to load'}`);
      }

      let fetchedProducts: Product[] = productsList;
      if (productsResult.status === 'fulfilled') {
        fetchedProducts = productsResult.value;
        setProductsList(fetchedProducts);
      } else {
        console.error('[Admin Products Load Error]', productsResult.reason);
        failedTables.push(`Products: ${productsResult.reason?.message || 'Failed to load'}`);
      }

      if (reviewsResult.status === 'fulfilled') {
        setReviews(reviewsResult.value);
      } else {
        console.warn('[Admin Reviews Load Note]', reviewsResult.reason);
      }

      if (testimonialsResult.status === 'fulfilled') {
        setTestimonials(testimonialsResult.value);
      } else {
        console.warn('[Admin Testimonials Load Note]', testimonialsResult.reason);
      }

      if (couponsResult.status === 'fulfilled') {
        setCoupons(couponsResult.value);
      } else {
        console.warn('[Admin Coupons Load Note]', couponsResult.reason);
      }

      let fetchedCats: RealCategory[] = categoriesList;
      if (catsResult.status === 'fulfilled') {
        fetchedCats = catsResult.value;
        setCategoriesList(fetchedCats);
      } else {
        console.warn('[Admin Categories Load Note]', catsResult.reason);
      }

      if (settingsResult.status === 'fulfilled' && settingsResult.value) {
        setAnnouncementText(settingsResult.value.announcementText);
        setHeroHeadline(settingsResult.value.heroHeadline);
        setHeroSubtext(settingsResult.value.heroSubtext);
      }

      if (homepageResult.status === 'fulfilled' && homepageResult.value) {
        setHomepageConfig(homepageResult.value);
        if (homepageResult.value.announcementText) {
          setAnnouncementText(homepageResult.value.announcementText);
        }
      }

      if (promosResult.status === 'fulfilled' && promosResult.value && promosResult.value.length > 0) {
        setPromotions(promosResult.value);
      }

      if (shippingResult.status === 'fulfilled' && shippingResult.value) {
        setShippingRules(shippingResult.value);
      }

      if (faqsResult.status === 'fulfilled' && faqsResult.value && faqsResult.value.length > 0) {
        setFaqs(faqsResult.value);
      }

      // Derive Real Customers passing already fetched products (0 duplicate network requests)
      let derivedCustomers: RealCustomer[] = customers;
      try {
        derivedCustomers = await DatabaseService.getCustomers(fetchedOrders, user, fetchedProducts);
        setCustomers(derivedCustomers);
      } catch (custErr) {
        console.warn('[Admin Derive Customers Note]', custErr);
      }

      // Background check of table statuses and direct connectivity
      DatabaseService.checkSupabaseStatus()
        .then((statusInfo) => setDbStatus(statusInfo))
        .catch(() => {});

      testSupabaseConnection()
        .then((conn) => setConnectivityInfo(conn))
        .catch(() => {});

      if (failedTables.length > 0) {
        const errorSummary = failedTables.join(' | ');
        setDbError(errorSummary);
        if (showToast) {
          triggerToast('Partial Sync Warning', errorSummary, undefined, 'info');
        }
      } else {
        setDbError(null);
        if (showToast) {
          triggerToast('Database Synced! ⚡', `Loaded ${fetchedOrders.length} orders, ${derivedCustomers.length} customers, ${fetchedProducts.length} products & ${fetchedCats.length} categories.`, undefined, 'success');
        }
      }
    } catch (err: any) {
      console.error('[Admin Live Sync Error]', err);
      setDbError(err.message || 'Supabase connection failed. Admin data cannot load.');
      if (showToast) {
        triggerToast('Database Sync Error', err.message || 'Failed to sync database.', undefined, 'error');
      }
    } finally {
      setIsLoadingData(false);
    }
  };

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

    let safeNewCreatedAt = new Date().toISOString();
    if (adminNewReviewForm.date) {
      try {
        const d = new Date(adminNewReviewForm.date);
        if (!isNaN(d.getTime())) safeNewCreatedAt = d.toISOString();
      } catch {}
    }

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
        createdAt: safeNewCreatedAt,
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

    let safeCreatedAt: string | undefined = undefined;
    if (editReviewForm.date) {
      try {
        const d = new Date(editReviewForm.date);
        if (!isNaN(d.getTime())) safeCreatedAt = d.toISOString();
      } catch {}
    }

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
        createdAt: safeCreatedAt,
      });

      if (updated) {
        setReviews((prev) => {
          const exists = prev.some((r) => String(r.id).trim().toLowerCase() === String(updated.id).trim().toLowerCase());
          if (exists) {
            return prev.map((r) => (String(r.id).trim().toLowerCase() === String(updated.id).trim().toLowerCase() ? updated : r));
          }
          return [updated, ...prev];
        });
      }
      setEditingReview(null);
      triggerToast('Review Updated', 'Review modifications saved.', undefined, 'success');
    } catch (err: any) {
      triggerToast('Update Failed', err.message || 'Could not update review.', undefined, 'error');
    } finally {
      setIsSavingEditReview(false);
    }
  };

  // Dedicated Testimonials Section Handlers
  const handleOpenAddTestimonial = () => {
    setEditingTestimonialId(null);
    setTestimonialForm({
      author: '',
      productName: productsList[0]?.name || '18K Anti-Tarnish Necklace',
      location: 'Verified Buyer',
      rating: 5,
      comment: '',
      verified: true,
      isLive: true,
    });
    setIsTestimonialModalOpen(true);
  };

  const handleOpenEditTestimonial = (t: RealTestimonial) => {
    setEditingTestimonialId(t.id);
    setTestimonialForm({
      author: t.author || '',
      productName: t.productName || '18K Anti-Tarnish Jewels',
      location: t.location || 'Verified Buyer',
      rating: t.rating || 5,
      comment: t.comment || '',
      verified: t.verified !== false,
      isLive: t.status === 'Approved' || t.status === 'Featured',
    });
    setIsTestimonialModalOpen(true);
  };

  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonialForm.author.trim() || !testimonialForm.comment.trim()) {
      triggerToast('Validation Error', 'Customer name and testimonial quote are required.', undefined, 'error');
      return;
    }

    setIsSavingTestimonial(true);
    try {
      const statusValue: 'Approved' | 'Featured' | 'Hidden' = testimonialForm.isLive ? 'Featured' : 'Hidden';

      if (editingTestimonialId) {
        const updated = await DatabaseService.updateTestimonial(editingTestimonialId, {
          author: testimonialForm.author.trim(),
          productName: testimonialForm.productName.trim() || '18K Anti-Tarnish Jewels',
          location: testimonialForm.location.trim() || 'Verified Buyer',
          rating: testimonialForm.rating,
          comment: testimonialForm.comment.trim(),
          verified: testimonialForm.verified,
          status: statusValue,
        });
        if (updated) {
          setTestimonials((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        }
        triggerToast('Testimonial Updated', 'Saved and updated in database.', undefined, 'success');
      } else {
        const added = await DatabaseService.addTestimonial({
          author: testimonialForm.author.trim(),
          productName: testimonialForm.productName.trim() || '18K Anti-Tarnish Jewels',
          location: testimonialForm.location.trim() || 'Verified Buyer',
          rating: testimonialForm.rating,
          comment: testimonialForm.comment.trim(),
          verified: testimonialForm.verified,
          status: statusValue,
        });
        if (added) {
          setTestimonials((prev) => [added, ...prev]);
        }
        triggerToast('Testimonial Added', 'Stored in database and published to homepage.', undefined, 'success');
      }
      setIsTestimonialModalOpen(false);
    } catch (err: any) {
      triggerToast('Save Failed', err.message || 'Could not save testimonial.', undefined, 'error');
    } finally {
      setIsSavingTestimonial(false);
    }
  };

  const handleToggleTestimonialLive = async (t: RealTestimonial) => {
    const isCurrentlyLive = t.status === 'Approved' || t.status === 'Featured';
    const nextStatus: 'Approved' | 'Featured' | 'Hidden' = isCurrentlyLive ? 'Hidden' : 'Featured';
    try {
      const updated = await DatabaseService.updateTestimonial(t.id, { status: nextStatus });
      if (updated) {
        setTestimonials((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      }
      triggerToast(
        isCurrentlyLive ? 'Hidden from Homepage' : 'Live on Homepage',
        `Testimonial from ${t.author} is now ${isCurrentlyLive ? 'hidden' : 'live'}.`,
        undefined,
        'success'
      );
    } catch (err: any) {
      triggerToast('Update Failed', err.message || 'Could not update status.', undefined, 'error');
    }
  };

  const handleDeleteTestimonial = (t: RealTestimonial) => {
    setDeleteConfirmInput('');
    setDeleteTarget({
      type: 'Testimonial',
      name: t.author,
      id: t.id,
      description: `Testimonial quote: "${t.comment.slice(0, 60)}..."`,
      onConfirm: async () => {
        setIsDeletingItem(true);
        try {
          await DatabaseService.deleteTestimonial(t.id);
          setTestimonials((prev) => prev.filter((r) => r.id !== t.id));
          triggerToast('Testimonial Deleted', 'Removed permanently from database.', undefined, 'success');
        } catch (err: any) {
          triggerToast('Delete Failed', err.message || 'Could not delete testimonial.', undefined, 'error');
        } finally {
          setIsDeletingItem(false);
        }
      },
    });
  };

  const handleRestoreDefaultTestimonials = async () => {
    try {
      let restoredCount = 0;
      for (const def of DEFAULT_TESTIMONIALS) {
        const alreadyExists = testimonials.some(
          (r) => r.author.trim().toLowerCase() === def.author.trim().toLowerCase()
        );
        if (!alreadyExists) {
          const added = await DatabaseService.addTestimonial({
            author: def.author,
            productName: def.productName,
            rating: def.rating,
            comment: def.comment,
            location: def.location,
            verified: true,
            status: 'Approved',
          });
          if (added) {
            setTestimonials((prev) => [added, ...prev]);
            restoredCount++;
          }
        }
      }
      triggerToast(
        'Default Testimonials',
        restoredCount > 0 ? `Restored ${restoredCount} testimonials in database.` : 'All default testimonials already exist.',
        undefined,
        'success'
      );
    } catch (err: any) {
      triggerToast('Restore Failed', err.message || 'Could not restore defaults.', undefined, 'error');
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

    if (isSelf && currentWishlistProducts && currentWishlistProducts.length > 0) {
      setCustomerWishlistItems(
        currentWishlistProducts.map((p) => ({
          id: p.id,
          productId: p.id,
          name: p.name,
          image: p.images?.[0] || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80',
          price: p.price,
          addedAt: new Date().toISOString(),
        }))
      );
    } else {
      setCustomerWishlistItems([]);
    }

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
      if (activity.wishlistItems && activity.wishlistItems.length > 0) {
        setCustomerWishlistItems(activity.wishlistItems);
      } else if (isSelf && currentWishlistProducts && currentWishlistProducts.length > 0) {
        setCustomerWishlistItems(
          currentWishlistProducts.map((p) => ({
            id: p.id,
            productId: p.id,
            name: p.name,
            image: p.images?.[0] || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80',
            price: p.price,
            addedAt: new Date().toISOString(),
          }))
        );
      }
    } catch (e) {
      console.warn('Customer activity fetch error:', e);
    } finally {
      setIsLoadingCustomerActivity(false);
    }
  };

  // Keep customer detail view's cart & wishlist in sync if active items change
  useEffect(() => {
    if (selectedCustomerDetail && user) {
      const isSelf = Boolean(
        (user.email && selectedCustomerDetail.email && user.email.toLowerCase().trim() === selectedCustomerDetail.email.toLowerCase().trim()) ||
        (user.id && selectedCustomerDetail.id && user.id === selectedCustomerDetail.id) ||
        (user.id && selectedCustomerDetail.supabaseUid && user.id === selectedCustomerDetail.supabaseUid)
      );
      if (isSelf) {
        if (currentCartItems && currentCartItems.length > 0) {
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
        if (currentWishlistProducts && currentWishlistProducts.length > 0) {
          setCustomerWishlistItems(
            currentWishlistProducts.map((p) => ({
              id: p.id,
              productId: p.id,
              name: p.name,
              image: p.images?.[0] || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80',
              price: p.price,
              addedAt: new Date().toISOString(),
            }))
          );
        }
      }
    }
  }, [currentCartItems, currentWishlistProducts, selectedCustomerDetail, user]);





  // ==================== HOMEPAGE VISUAL CONTENT EDITOR HANDLERS ====================
  const handleSaveHomepageConfig = async () => {
    setIsSavingHomepage(true);
    try {
      const saved = await DatabaseService.updateHomepageConfig(homepageConfig);
      setHomepageConfig(saved);
      triggerToast('Homepage Saved! ✨', 'All changes published live to store homepage.', undefined, 'success');
    } catch (err: any) {
      triggerToast('Save Failed', err?.message || 'Could not save homepage changes.', undefined, 'error');
    } finally {
      setIsSavingHomepage(false);
    }
  };

  const handleResetHomepageConfig = () => {
    setDeleteConfirmInput('');
    setDeleteTarget({
      type: 'Homepage Configuration',
      name: 'All Homepage Content',
      description: 'This will reset all banners, category slider cards, marquee phrases, and influencer reels back to the original store design.',
      onConfirm: async () => {
        setIsDeletingItem(true);
        try {
          const resetCfg = await DatabaseService.resetDefaultHomepageConfig();
          setHomepageConfig(resetCfg);
          triggerToast('Homepage Reset ✦', 'Restored default homepage content.', undefined, 'success');
        } catch (err: any) {
          triggerToast('Reset Failed', err?.message || 'Could not reset homepage.', undefined, 'error');
        } finally {
          setIsDeletingItem(false);
        }
      },
    });
  };

  const handleUploadBannerImage = async (e: React.ChangeEvent<HTMLInputElement>, bannerId?: string, isMobile = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetId = bannerId || activeUploadTarget?.id;
    const targetIsMobile = isMobile || activeUploadTarget?.isMobile || false;

    setIsUploadingBannerImg(true);
    try {
      const url = await DatabaseService.uploadBannerImage(file, targetIsMobile);
      if (url) {
        if (targetId) {
          setHomepageConfig((prev) => ({
            ...prev,
            heroBanners: prev.heroBanners.map((b) =>
              b.id === targetId
                ? targetIsMobile
                  ? { ...b, mobileImage: url }
                  : { ...b, image: url }
                : b
            ),
          }));
          triggerToast(
            targetIsMobile ? 'Mobile Banner Uploaded! 📱' : 'Laptop Banner Uploaded! 💻',
            'Image stored in database bucket. Click "Save Hero Carousel Changes" to publish.',
            undefined,
            'success'
          );
        } else {
          setBannerForm((prev) =>
            targetIsMobile ? { ...prev, mobileImage: url } : { ...prev, image: url }
          );
          triggerToast('Banner Image Set! 📸', 'Stored in database bucket. Ready to save.', undefined, 'success');
        }
      }
    } catch (err: any) {
      triggerToast('Upload Failed', err?.message || 'Could not upload banner.', undefined, 'error');
    } finally {
      setIsUploadingBannerImg(false);
      setActiveUploadTarget(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleClearBannerImage = (bannerId: string, isMobile: boolean) => {
    setHomepageConfig((prev) => ({
      ...prev,
      heroBanners: prev.heroBanners.map((b) =>
        b.id === bannerId
          ? isMobile
            ? { ...b, mobileImage: '' }
            : { ...b, image: '' }
          : b
      ),
    }));
    triggerToast('Image Cleared', 'Remember to click Save Hero Carousel Changes.', undefined, 'info');
  };

  const handleUpdateBannerImageText = (bannerId: string, isMobile: boolean, val: string) => {
    setHomepageConfig((prev) => ({
      ...prev,
      heroBanners: prev.heroBanners.map((b) =>
        b.id === bannerId
          ? isMobile
            ? { ...b, mobileImage: val }
            : { ...b, image: val }
          : b
      ),
    }));
  };

  const handleAddNewSlide = () => {
    const newSlide: HomeBanner = {
      id: `b-${Date.now()}`,
      image: '',
      mobileImage: '',
      imageFit: 'contain',
      objectPosition: 'center',
      alt: 'Girly Tales Launch Offer',
      category: 'all',
      title: '',
      subtitle: '',
      active: true,
      orderIndex: homepageConfig.heroBanners.length,
    };
    setHomepageConfig((prev) => ({
      ...prev,
      heroBanners: [...prev.heroBanners, newSlide],
    }));
    triggerToast('Slide Added', `Added Slide #${homepageConfig.heroBanners.length + 1}`, undefined, 'info');
  };

  const handleUploadCatCardImage = async (e: React.ChangeEvent<HTMLInputElement>, cardId: string) => {
    const file = e.target.files?.[0];
    if (!file || !cardId) return;

    setIsUploadingCatCardImg(cardId);
    try {
      const url = await DatabaseService.uploadProductImage(file);
      if (url) {
        setHomepageConfig((prev) => ({
          ...prev,
          categoryCards: prev.categoryCards.map((c) => (c.id === cardId ? { ...c, image: url } : c)),
        }));
        triggerToast('Category Image Updated! 🖼️', 'Card image set. Remember to click "Save Homepage Changes".', undefined, 'success');
      }
    } catch (err: any) {
      triggerToast('Upload Failed', err?.message || 'Could not upload image.', undefined, 'error');
    } finally {
      setIsUploadingCatCardImg(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddCategoryCard = () => {
    const nextIdx = homepageConfig.categoryCards.length;
    const defaults = DEFAULT_HOMEPAGE_CONFIG.categoryCards;
    const template = defaults[nextIdx % defaults.length];
    const newCard: HomeCategoryCard = {
      id: `cat-${Date.now()}`,
      name: `CATEGORY ${nextIdx + 1}`,
      tagline: 'Cloud-Soft Luxury Living',
      image: '',
      category: template?.category || 'all',
      ctaText: `SHOP NOW`,
      orderIndex: nextIdx,
      active: true,
    };
    setHomepageConfig((prev) => ({
      ...prev,
      categoryCards: [...prev.categoryCards, newCard],
    }));
    triggerToast('Card Added! 🏷️', `Added Card #${nextIdx + 1}. You can now configure it.`, undefined, 'info');
  };

  const handleDeleteCategoryCard = (cardId: string) => {
    if (homepageConfig.categoryCards.length <= 1) {
      triggerToast('Cannot Delete', 'At least one category card must remain.', undefined, 'info');
      return;
    }
    setHomepageConfig((prev) => ({
      ...prev,
      categoryCards: prev.categoryCards
        .filter((c) => c.id !== cardId)
        .map((c, idx) => ({ ...c, orderIndex: idx })),
    }));
    triggerToast('Card Removed', 'Category card removed. Click "Save Homepage Changes" to persist.', undefined, 'info');
  };

  const handleMoveCategoryCard = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= homepageConfig.categoryCards.length) return;

    setHomepageConfig((prev) => {
      const cards = [...prev.categoryCards];
      const temp = cards[index];
      cards[index] = cards[targetIndex];
      cards[targetIndex] = temp;
      return {
        ...prev,
        categoryCards: cards.map((c, i) => ({ ...c, orderIndex: i })),
      };
    });
  };

  const handleResetFiveCategoryCards = () => {
    setHomepageConfig((prev) => ({
      ...prev,
      categoryCards: DEFAULT_HOMEPAGE_CONFIG.categoryCards.map((c, idx) => ({
        ...c,
        orderIndex: idx,
      })),
    }));
    triggerToast('Reset to 5 Defaults ✨', 'Restored the 5 default category cards. Click "Save Homepage Changes" to publish.', undefined, 'success');
  };

  const handleUploadReelImage = async (e: React.ChangeEvent<HTMLInputElement>, reelId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (reelId) setIsUploadingReelImg(reelId);
    try {
      const url = await DatabaseService.uploadProductImage(file);
      if (url) {
        if (reelId) {
          setHomepageConfig((prev) => ({
            ...prev,
            influencerReels: prev.influencerReels.map((r) => (r.id === reelId ? { ...r, image: url } : r)),
          }));
          triggerToast('Reel Poster Updated! 🎬', 'Image replaced.', undefined, 'success');
        } else {
          setReelForm((prev) => ({ ...prev, image: url }));
          triggerToast('Reel Photo Uploaded! 🎬', 'Ready to save.', undefined, 'success');
        }
      }
    } catch (err: any) {
      triggerToast('Upload Failed', err?.message || 'Could not upload image.', undefined, 'error');
    } finally {
      setIsUploadingReelImg(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleMoveBanner = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= homepageConfig.heroBanners.length) return;

    const list = [...homepageConfig.heroBanners];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    list.forEach((b, i) => (b.orderIndex = i));
    setHomepageConfig((prev) => ({ ...prev, heroBanners: list }));
  };

  const handleToggleBannerActive = (id: string) => {
    setHomepageConfig((prev) => ({
      ...prev,
      heroBanners: prev.heroBanners.map((b) => (b.id === id ? { ...b, active: !b.active } : b)),
    }));
  };

  const handleDeleteBanner = (id: string) => {
    setHomepageConfig((prev) => ({
      ...prev,
      heroBanners: prev.heroBanners.filter((b) => b.id !== id),
    }));
    triggerToast('Banner Removed', 'Slide deleted from carousel.', undefined, 'info');
  };

  const handleOpenAddBanner = () => {
    setEditingBannerId(null);
    setBannerForm({
      id: `b-${Date.now()}`,
      image: '',
      alt: 'Girly Tales Exclusive Offer',
      category: 'all',
      title: '',
      subtitle: '',
      active: true,
      orderIndex: homepageConfig.heroBanners.length,
    });
    setIsBannerModalOpen(true);
  };

  const handleSaveBannerModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.image.trim()) {
      triggerToast('Image Required', 'Please upload or paste an image URL for the banner.', undefined, 'error');
      return;
    }

    if (editingBannerId) {
      setHomepageConfig((prev) => ({
        ...prev,
        heroBanners: prev.heroBanners.map((b) => (b.id === editingBannerId ? { ...bannerForm } : b)),
      }));
      triggerToast('Banner Updated', 'Updated in carousel preview.', undefined, 'success');
    } else {
      const newBanner: HomeBanner = {
        ...bannerForm,
        id: bannerForm.id || `b-${Date.now()}`,
        orderIndex: homepageConfig.heroBanners.length,
      };
      setHomepageConfig((prev) => ({
        ...prev,
        heroBanners: [...prev.heroBanners, newBanner],
      }));
      triggerToast('Banner Added', 'New slide added to carousel.', undefined, 'success');
    }
    setIsBannerModalOpen(false);
  };

  const handleAddMarqueePhrase = () => {
    const trimmed = newMarqueeInput.trim().toUpperCase();
    if (!trimmed) return;
    if (homepageConfig.marqueePhrases.includes(trimmed)) {
      triggerToast('Phrase Exists', 'This phrase is already in the ticker.', undefined, 'info');
      return;
    }
    setHomepageConfig((prev) => ({
      ...prev,
      marqueePhrases: [...prev.marqueePhrases, trimmed],
    }));
    setNewMarqueeInput('');
    triggerToast('Phrase Added', `"${trimmed}" added to marquee ticker.`, undefined, 'success');
  };

  const handleRemoveMarqueePhrase = (index: number) => {
    setHomepageConfig((prev) => ({
      ...prev,
      marqueePhrases: prev.marqueePhrases.filter((_, i) => i !== index),
    }));
  };

  const handleOpenAddReel = () => {
    setEditingReelId(null);
    setReelForm({
      id: `reel-${Date.now()}`,
      image: '',
      tagText: 'Cute & comfy',
      subTag: "PJ's ft. Girly Tales",
      views: '10.5k',
      productId: productsList[0]?.id || '',
      orderIndex: homepageConfig.influencerReels.length,
      active: true,
    });
    setIsReelModalOpen(true);
  };

  const handleSaveReelModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelForm.image.trim()) {
      triggerToast('Image Required', 'Please upload or paste an image URL for the reel.', undefined, 'error');
      return;
    }

    if (editingReelId) {
      setHomepageConfig((prev) => ({
        ...prev,
        influencerReels: prev.influencerReels.map((r) => (r.id === editingReelId ? { ...reelForm } : r)),
      }));
      triggerToast('Reel Updated', 'Changes saved to reel card.', undefined, 'success');
    } else {
      const newReel: HomeInfluencerReel = {
        ...reelForm,
        id: reelForm.id || `reel-${Date.now()}`,
        orderIndex: homepageConfig.influencerReels.length,
      };
      setHomepageConfig((prev) => ({
        ...prev,
        influencerReels: [...prev.influencerReels, newReel],
      }));
      triggerToast('Reel Added', 'Added new influencer reel card.', undefined, 'success');
    }
    setIsReelModalOpen(false);
  };

  const handleDeleteReel = (id: string) => {
    setHomepageConfig((prev) => ({
      ...prev,
      influencerReels: prev.influencerReels.filter((r) => r.id !== id),
    }));
    triggerToast('Reel Deleted', 'Removed from homepage.', undefined, 'info');
  };

  const handleSeedCatalog = async () => {
    setIsLoadingData(true);
    try {
      const res = await DatabaseService.seedCatalogToSupabase();
      triggerToast('Catalog Seeded! 🚀', `Successfully populated ${res.productsCount} products and ${res.categoriesCount} categories.`, undefined, 'success');
      await loadDatabaseData(false);
    } catch (err: any) {
      triggerToast('Seed Error', err?.message || 'Could not seed database', undefined, 'error');
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
    // Initial fetch to sync any new remote database updates without blocking UI
    loadDatabaseData(false);
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
    } catch (e: any) {
      triggerToast('Error', e?.message || 'Failed to save category.', undefined, 'error');
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
    } catch (e: any) {
      triggerToast('Error', e?.message || 'Failed to add category.', undefined, 'error');
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
    } catch (e: any) {
      await loadDatabaseData();
      triggerToast('Error', e?.message || 'Failed to delete category.', undefined, 'error');
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categoriesList.length) return;
    const updated = [...categoriesList];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setCategoriesList(updated);
    try {
      await DatabaseService.reorderCategories(updated);
    } catch (e: any) {
      await loadDatabaseData();
      triggerToast('Error', e?.message || 'Failed to update category order.', undefined, 'error');
    }
  };

  const handleStartEditCategory = (cat: RealCategory) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
  };

  const handleSaveEditCategory = async (id: string) => {
    const trimmed = editingCategoryName.trim();
    if (!trimmed) return;
    try {
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
    } catch (e: any) {
      await loadDatabaseData();
      triggerToast('Error', e?.message || 'Failed to update category.', undefined, 'error');
    }
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleResetCategories = async () => {
    try {
      const reset = await DatabaseService.resetDefaultCategories();
      setCategoriesList(reset);
      triggerToast('Categories Reset', 'Default shop categories restored in database.', undefined, 'info');
    } catch (e: any) {
      await loadDatabaseData();
      triggerToast('Error', e?.message || 'Failed to reset categories.', undefined, 'error');
    }
  };

  // Product Handlers
  const handleToggleProductStock = async (id: string, currentStatus: boolean) => {
    try {
      await DatabaseService.updateProductStock(id, !currentStatus);
      setProductsList((prev) =>
        prev.map((p) => (p.id === id ? { ...p, inStock: !currentStatus } : p))
      );
      triggerToast('Stock Status Updated', 'Saved to database successfully.', undefined, 'info');
    } catch (err: any) {
      triggerToast('Update Failed', err.message || 'Could not update stock.', undefined, 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await DatabaseService.deleteProduct(id);
      setProductsList((prev) => prev.filter((p) => p.id !== id));
      triggerToast('Product & Photos Deleted', 'Product and all associated photos removed from database and storage.', undefined, 'info');
      await loadDatabaseData(false);
    } catch (err: any) {
      triggerToast('Delete Failed', err.message || 'Could not delete product.', undefined, 'error');
    }
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
    } catch (err: any) {
      triggerToast('Upload Failed', err?.message || 'Could not upload some images. Please try again.', undefined, 'error');
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
    } catch (err: any) {
      triggerToast('Replace Failed', err?.message || 'Failed to replace image.', undefined, 'error');
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

    const finalImages = (productForm.images.length > 0
      ? productForm.images
      : ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80']).map(normalizeStorageUrl);

    try {
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
    } catch (err: any) {
      triggerToast('Save Failed', err.message || 'Could not save product to database.', undefined, 'error');
    }
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
    } catch (e: any) {
      await loadDatabaseData();
      triggerToast('Update Failed', e?.message || 'Could not update order status in database.', undefined, 'error');
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
    } catch (e: any) {
      await loadDatabaseData();
      triggerToast('Save Failed', e?.message || 'Could not save instruction to database.', undefined, 'error');
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

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newCouponForm.code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanCode) {
      triggerToast('Invalid Code', 'Please enter a valid alphanumeric coupon code.', undefined, 'info');
      return;
    }

    const pct = parseFloat(newCouponForm.percent);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      triggerToast('Invalid Percentage', 'Discount percentage must be between 1 and 100.', undefined, 'info');
      return;
    }

    const minSpendNum = newCouponForm.minSpend ? Math.max(0, parseFloat(newCouponForm.minSpend) || 0) : 0;
    const usageLimitNum = newCouponForm.usageLimit ? Math.max(1, parseInt(newCouponForm.usageLimit, 10) || 1) : null;

    setIsAddingCoupon(true);
    const newCp: RealCoupon = {
      id: `cp-${Date.now()}`,
      code: cleanCode,
      discount: `${pct}% Discount`,
      description: '',
      minSpend: minSpendNum,
      usageLimit: usageLimitNum,
      usedCount: 0,
      status: 'Active',
      expires: '2026-12-31',
      showInList: Boolean(newCouponForm.showInList),
    };

    try {
      await DatabaseService.addCoupon(newCp);
      setCoupons((prev) => [newCp, ...prev.filter((c) => c.id !== newCp.id)]);
      setNewCouponForm({
        code: '',
        percent: '',
        minSpend: '',
        usageLimit: '',
        showInList: false,
      });
      triggerToast('Coupon Added! 🎉', `Coupon "${newCp.code}" is now active in database.`, undefined, 'success');
    } catch (err: any) {
      triggerToast('Save Failed', err.message || 'Could not save coupon to database.', undefined, 'error');
    } finally {
      setIsAddingCoupon(false);
    }
  };

  const handleToggleShowInList = async (promo: RealCoupon) => {
    const nextVal = !promo.showInList;
    setCoupons((prev) => prev.map((c) => (c.id === promo.id ? { ...c, showInList: nextVal } : c)));
    try {
      await DatabaseService.updateCoupon(promo.id, { showInList: nextVal });
      triggerToast(
        nextVal ? 'Added to Checkout 🏷️' : 'Removed from Checkout',
        `Code "${promo.code}" will ${nextVal ? 'now' : 'no longer'} be suggested to customers at checkout.`,
        undefined,
        'success'
      );
    } catch (err: any) {
      setCoupons((prev) => prev.map((c) => (c.id === promo.id ? { ...c, showInList: promo.showInList } : c)));
      triggerToast('Update Failed', err.message || 'Could not update coupon visibility.', undefined, 'error');
    }
  };

  const handleDeleteCoupon = (promo: RealCoupon) => {
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
  };

  const handleSaveStoreSettings = async () => {
    setIsSavingSettings(true);
    try {
      const updated = await DatabaseService.updateStoreSettings({
        announcementText,
        heroHeadline,
        heroSubtext,
      });
      setAnnouncementText(updated.announcementText);
      setHeroHeadline(updated.heroHeadline);
      setHeroSubtext(updated.heroSubtext);
      triggerToast('Saved to Database! ✨', 'Homepage settings updated live.', undefined, 'success');
    } catch (err: any) {
      triggerToast('Save Failed', err.message || 'Could not save store settings.', undefined, 'error');
    } finally {
      setIsSavingSettings(false);
    }
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
              Manage your catalog, fulfill orders, and view customer summaries.
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
              className="px-4 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              title="Refresh to sync"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Live Supabase Connection / Sync Error Banner with Direct Diagnostics */}
        {dbError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 sm:p-5 rounded-3xl flex flex-col gap-3 shadow-xs animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-100 rounded-xl text-rose-600 shrink-0 mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-rose-900">Supabase Connection Error</h4>
                    {connectivityInfo?.urlHost && (
                      <span className="bg-rose-100/80 border border-rose-300/60 text-rose-800 text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold">
                        Host: {connectivityInfo.urlHost}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-rose-800 font-medium">{dbError}</p>
                  {connectivityInfo?.message && connectivityInfo.status !== 'success' && (
                    <p className="text-[11px] text-rose-700 bg-rose-100/50 p-2 rounded-xl border border-rose-200/60 mt-1">
                      <strong>Diagnostics:</strong> {connectivityInfo.message}
                    </p>
                  )}
                  <p className="text-[11px] text-rose-600/90">
                    ✦ Note: If you recently edited <code className="bg-rose-100/90 px-1 py-0.5 rounded font-mono text-[10px]">.env</code>, restart your Vite dev server (<code className="bg-rose-100/90 px-1 py-0.5 rounded font-mono text-[10px]">Ctrl+C</code> then <code className="bg-rose-100/90 px-1 py-0.5 rounded font-mono text-[10px]">npm run dev</code>).
                  </p>
                </div>
              </div>
              <button
                onClick={() => loadDatabaseData(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 self-end sm:self-auto cursor-pointer"
              >
                Retry Sync
              </button>
            </div>
          </div>
        )}

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
              setActiveTab('testimonials');
              setIsCreatingProduct(false);
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'testimonials'
                ? 'bg-white text-brand-charcoal shadow-xs'
                : 'text-brand-muted hover:text-brand-charcoal hover:bg-white/40'
            }`}
          >
            <Quote className="w-3.5 h-3.5 text-[#967BB6]" />
            <span>Testimonials ({reviews.filter((r) => r.status === 'Approved' || r.status === 'Featured').length})</span>
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
                    <div className="py-14 text-center text-brand-muted space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#F3EEF9] text-[#967BB6] flex items-center justify-center mx-auto">
                        <Package className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-brand-charcoal">
                          {productSearch ? 'No products matching your search' : 'No products listed in database yet'}
                        </p>
                        <p className="text-xs text-brand-muted max-w-sm mx-auto">
                          {productSearch 
                            ? 'Try searching with a different keyword or clearing the filter.' 
                            : 'Click "+ Add New Product" to list your first product, or seed the catalog from the Database tab.'}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          onClick={() => {
                            setEditingProductId(null);
                            setProductForm(DEFAULT_PRODUCT_FORM);
                            setIsCreatingProduct(true);
                          }}
                          className="px-5 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Add New Product</span>
                        </button>
                      </div>
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
                        await DatabaseService.deleteOrder(selectedOrderDetail.id);
                        setOrders((prev) => prev.filter((o) => o.id !== selectedOrderDetail.id));
                        setSelectedOrderDetail(null);
                        triggerToast('Order Deleted', `Order #${selectedOrderDetail.id} removed permanently from Supabase database.`, undefined, 'info');
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
                                      await DatabaseService.deleteOrder(ord.id);
                                      setOrders((prev) => prev.filter((o) => o.id !== ord.id));
                                      if (selectedOrderDetail?.id === ord.id) {
                                        setSelectedOrderDetail(null);
                                      }
                                      triggerToast('Order Deleted', `Order #${ord.id} removed permanently from Supabase database.`, undefined, 'info');
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
                                    setReviews((prev) => prev.map((r) => (String(r.id).trim().toLowerCase() === String(rev.id).trim().toLowerCase() ? { ...r, status: st } : r)));
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
                                    setReviews((prev) => prev.filter((r) => String(r.id).trim().toLowerCase() !== String(rev.id).trim().toLowerCase()));
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

        {/* TAB: TESTIMONIALS (HOMEPAGE "WHAT OUR CUSTOMERS SAY" MANAGER) */}
        {activeTab === 'testimonials' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF8F2] border border-[#EAE6DB] flex items-center justify-center text-[#967BB6] shrink-0 shadow-2xs">
                    <Quote className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl text-brand-charcoal font-medium">Customer Testimonials</h3>
                    <p className="text-xs text-brand-muted">
                      Manage quotes displayed in the <span className="font-bold text-brand-charcoal">"WHAT OUR CUSTOMERS SAY"</span> section on the homepage.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleRestoreDefaultTestimonials}
                    className="px-4 py-2.5 bg-[#FAF8F2] hover:bg-[#F2EDE2] border border-[#EAE6DB] text-brand-charcoal text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    title="Restore standard 4 testimonials if missing"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-brand-muted" />
                    <span>Restore Defaults</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddTestimonial}
                    className="px-5 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Testimonial</span>
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards */}
              {(() => {
                const liveTestimonials = testimonials.filter((r) => r.status === 'Approved' || r.status === 'Featured');
                const avgRating = liveTestimonials.length > 0
                  ? liveTestimonials.reduce((acc, r) => acc + (r.rating || 5), 0) / liveTestimonials.length
                  : 5.0;

                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Live on Homepage</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl font-black text-brand-charcoal">{liveTestimonials.length}</span>
                        <span className="text-[10px] text-emerald-700 font-bold">Active</span>
                      </div>
                      <span className="text-[10px] text-brand-muted">First 4 shown on homepage</span>
                    </div>

                    <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Customer Rating</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-2xl font-black text-brand-charcoal">{avgRating.toFixed(1)}</span>
                        <div className="flex text-amber-500 text-xs">★★★★★</div>
                      </div>
                      <span className="text-[10px] text-brand-muted">Over 3,800+ happy buyers</span>
                    </div>

                    <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Verified Buyers</span>
                      <span className="text-2xl font-black text-emerald-700 mt-1 block">100%</span>
                      <span className="text-[10px] text-brand-muted">All have Verified badge</span>
                    </div>

                    <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Total Stored</span>
                      <span className="text-2xl font-black text-brand-charcoal mt-1 block">{testimonials.length}</span>
                      <span className="text-[10px] text-brand-muted">In testimonials database</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* LIVE HOMEPAGE PREVIEW (Matches exactly the homepage "WHAT OUR CUSTOMERS SAY") */}
            <div className="bg-[#FAF8F2] rounded-3xl border-2 border-[#967BB6]/30 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-[#EAE6DB]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-brand-charcoal">
                    Live Homepage Preview ("WHAT OUR CUSTOMERS SAY")
                  </span>
                </div>
                <span className="text-[11px] text-brand-muted font-medium">
                  Matches exact design shown on the homepage
                </span>
              </div>

              {/* Homepage Title Preview */}
              <div className="text-center py-2 space-y-1">
                <h4 className="font-sans font-black text-xl sm:text-2xl text-brand-charcoal uppercase tracking-tight">
                  WHAT OUR CUSTOMERS SAY
                </h4>
                <div className="flex items-center justify-center gap-1.5 text-xs text-brand-muted">
                  <div className="flex text-amber-500 text-xs">★★★★★</div>
                  <span className="font-bold text-brand-charcoal">4.9 / 5.0</span>
                  <span>•</span>
                  <span>Over 3,800+ happy buyers across India</span>
                </div>
              </div>

              {/* 4 Preview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                {(() => {
                  const live = testimonials.filter((r) => r.status === 'Approved' || r.status === 'Featured');
                  const displayList = live.slice(0, 4);

                  if (displayList.length === 0) {
                    return (
                      <div className="col-span-full py-8 text-center text-brand-muted bg-white rounded-2xl border border-dashed border-[#EAE6DB] space-y-1">
                        <p className="text-xs font-bold text-brand-charcoal">No live testimonials active</p>
                        <p className="text-[11px] text-brand-muted">
                          Testimonials deleted or hidden from the database won't appear on the homepage. Click "+ Add Testimonial" below to publish one.
                        </p>
                      </div>
                    );
                  }

                  return displayList.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-[#EAE6DB] flex flex-col justify-between hover:shadow-md transition-all relative group"
                    >
                      {/* Top: Stars & Verified Badge */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-0.5">
                            {[...Array(Number(item.rating) || 5)].map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        </div>

                        {/* Quote */}
                        <p className="text-brand-charcoal text-xs sm:text-[13px] font-medium leading-relaxed italic line-clamp-4">
                          "{item.comment}"
                        </p>
                      </div>

                      {/* Bottom Author & Product */}
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-xs font-bold text-brand-charcoal">
                          {item.author}{' '}
                          <span className="text-[10px] font-normal text-brand-muted">
                            ({item.location || 'Verified Buyer'})
                          </span>
                        </p>
                        <p className="text-[10px] font-medium text-[#967BB6] mt-0.5 truncate">
                          ✦ {item.productName || '18K Anti-Tarnish Jewels'}
                        </p>

                        {/* Action Toolbar on Preview Card */}
                        <div className="flex items-center justify-between gap-1.5 mt-3 pt-2.5 border-t border-dashed border-gray-200">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Slot #{idx + 1}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTestimonial(item)}
                              className="p-1 text-brand-muted hover:text-[#967BB6] hover:bg-[#FAF8F2] rounded-lg transition-colors cursor-pointer"
                              title="Edit Testimonial"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleTestimonialLive(item)}
                              className="p-1 text-brand-muted hover:text-amber-600 hover:bg-[#FAF8F2] rounded-lg transition-colors cursor-pointer"
                              title="Hide from Homepage"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTestimonial(item)}
                              className="p-1 text-brand-muted hover:text-rose-600 hover:bg-[#FAF8F2] rounded-lg transition-colors cursor-pointer"
                              title="Delete Testimonial"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Testimonials Management Table / Directory */}
            <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-5">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={testimonialSearch}
                    onChange={(e) => setTestimonialSearch(e.target.value)}
                    placeholder="Search testimonials by customer name, product, or review text..."
                    className="w-full pl-10 pr-4 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTestimonialFilter('all')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      testimonialFilter === 'all'
                        ? 'bg-[#967BB6] text-white shadow-xs'
                        : 'bg-[#FAF8F2] text-brand-muted hover:text-brand-charcoal'
                    }`}
                  >
                    All ({testimonials.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestimonialFilter('live')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      testimonialFilter === 'live'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-[#FAF8F2] text-brand-muted hover:text-brand-charcoal'
                    }`}
                  >
                    Live on Homepage ({testimonials.filter((r) => r.status === 'Approved' || r.status === 'Featured').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestimonialFilter('hidden')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      testimonialFilter === 'hidden'
                        ? 'bg-zinc-700 text-white shadow-xs'
                        : 'bg-[#FAF8F2] text-brand-muted hover:text-brand-charcoal'
                    }`}
                  >
                    Hidden ({testimonials.filter((r) => r.status === 'Hidden').length})
                  </button>
                </div>
              </div>

              {/* Testimonials List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#EAE6DB] text-brand-muted font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Rating</th>
                      <th className="py-3 px-3">Associated Product</th>
                      <th className="py-3 px-3">Testimonial Quote</th>
                      <th className="py-3 px-3">Homepage Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE6DB]/60">
                    {(() => {
                      const filtered = testimonials.filter((r) => {
                        const isLive = r.status === 'Approved' || r.status === 'Featured';
                        if (testimonialFilter === 'live' && !isLive) return false;
                        if (testimonialFilter === 'hidden' && isLive) return false;

                        if (testimonialSearch.trim()) {
                          const q = testimonialSearch.toLowerCase().trim();
                          return (
                            (r.author || '').toLowerCase().includes(q) ||
                            (r.productName || '').toLowerCase().includes(q) ||
                            (r.comment || '').toLowerCase().includes(q)
                          );
                        }
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-brand-muted">
                              No testimonials match your filter. Click "+ Add Testimonial" above to create one.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((t) => {
                        const isLive = t.status === 'Approved' || t.status === 'Featured';

                        return (
                          <tr key={t.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                            <td className="py-3 px-3 font-bold text-brand-charcoal">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#967BB6]/15 text-[#967BB6] font-black flex items-center justify-center text-[10px]">
                                  {getInitials(t.author)}
                                </div>
                                <div>
                                  <span className="block">{t.author}</span>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {t.location && (
                                      <span className="text-[9px] text-brand-muted font-normal">
                                        {t.location}
                                      </span>
                                    )}
                                    {t.verified !== false && (
                                      <span className="text-[9px] text-emerald-700 font-semibold flex items-center gap-0.5">
                                        <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1 text-amber-500">
                                <span>{'★'.repeat(t.rating || 5)}</span>
                                <span className="text-[10px] text-brand-muted font-bold">({t.rating || 5})</span>
                              </div>
                            </td>

                            <td className="py-3 px-3 font-medium text-brand-charcoal max-w-[180px] truncate">
                              <span className="text-[#967BB6] font-bold">✦ </span>
                              {t.productName || 'General Store'}
                            </td>

                            <td className="py-3 px-3 text-brand-muted max-w-[320px]">
                              <p className="italic line-clamp-2">"{t.comment}"</p>
                            </td>

                            <td className="py-3 px-3">
                              <button
                                type="button"
                                onClick={() => handleToggleTestimonialLive(t)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  isLive
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                }`}
                              >
                                {isLive ? '✓ Live on Homepage' : 'Hidden'}
                              </button>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTestimonial(t)}
                                  className="p-1.5 text-brand-muted hover:text-[#967BB6] hover:bg-[#FAF8F2] rounded-lg transition-colors cursor-pointer"
                                  title="Edit Testimonial"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTestimonial(t)}
                                  className="p-1.5 text-brand-muted hover:text-rose-600 hover:bg-[#FAF8F2] rounded-lg transition-colors cursor-pointer"
                                  title="Delete Testimonial"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal: Add / Edit Testimonial */}
            {isTestimonialModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scale-up">
                  <div className="flex items-center justify-between border-b border-[#EAE6DB] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#FAF8F2] border border-[#EAE6DB] flex items-center justify-center text-[#967BB6]">
                        <Quote className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-serif text-lg font-bold text-brand-charcoal">
                          {editingTestimonialId ? 'Edit Testimonial' : 'Add Customer Testimonial'}
                        </h4>
                        <p className="text-xs text-brand-muted">
                          Featured in the "WHAT OUR CUSTOMERS SAY" homepage section.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsTestimonialModalOpen(false)}
                      className="p-1.5 text-brand-muted hover:text-brand-charcoal rounded-xl hover:bg-[#FAF8F2] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveTestimonial} className="space-y-4">
                    {/* Customer Name and Location (2 columns) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                          Customer Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={testimonialForm.author}
                          onChange={(e) => setTestimonialForm((p) => ({ ...p, author: e.target.value }))}
                          placeholder="e.g. Ananya S."
                          className="w-full px-3.5 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                          Customer Location / City
                        </label>
                        <input
                          type="text"
                          value={testimonialForm.location}
                          onChange={(e) => setTestimonialForm((p) => ({ ...p, location: e.target.value }))}
                          placeholder="e.g. Mumbai, Bengaluru, Delhi"
                          className="w-full px-3.5 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                        />
                      </div>
                    </div>

                    {/* Associated Product */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                        Associated Product
                      </label>
                      <input
                        type="text"
                        value={testimonialForm.productName}
                        onChange={(e) => setTestimonialForm((p) => ({ ...p, productName: e.target.value }))}
                        placeholder="e.g. 18K Anti-Tarnish Necklace"
                        className="w-full px-3.5 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                      />
                    </div>

                    {/* Rating (1 to 5 stars) */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                        Star Rating ({testimonialForm.rating} of 5)
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setTestimonialForm((p) => ({ ...p, rating: star }))}
                            className="p-1 text-amber-400 hover:scale-125 transition-transform cursor-pointer"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= testimonialForm.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Testimonial Quote */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                        Testimonial Quote / Feedback *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={testimonialForm.comment}
                        onChange={(e) => setTestimonialForm((p) => ({ ...p, comment: e.target.value }))}
                        placeholder="Wore my necklace daily to the gym and in hot showers for 3 months — still 100% shiny gold with zero tarnish!"
                        className="w-full px-3.5 py-2 text-xs border border-[#EAE6DB] rounded-xl bg-[#FAF8F2] focus:bg-white focus:outline-none focus:border-[#967BB6] resize-none"
                      />
                    </div>

                    {/* Toggles */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <label className="flex items-center gap-2 p-3 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={testimonialForm.verified}
                          onChange={(e) => setTestimonialForm((p) => ({ ...p, verified: e.target.checked }))}
                          className="rounded text-[#967BB6] focus:ring-[#967BB6]"
                        />
                        <span className="text-xs font-bold text-brand-charcoal">Verified Buyer Badge</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={testimonialForm.isLive}
                          onChange={(e) => setTestimonialForm((p) => ({ ...p, isLive: e.target.checked }))}
                          className="rounded text-[#967BB6] focus:ring-[#967BB6]"
                        />
                        <span className="text-xs font-bold text-emerald-800">Show on Homepage</span>
                      </label>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE6DB]">
                      <button
                        type="button"
                        onClick={() => setIsTestimonialModalOpen(false)}
                        className="px-4 py-2 text-xs font-bold text-brand-muted hover:text-brand-charcoal rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingTestimonial}
                        className="px-6 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                      >
                        {isSavingTestimonial && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>{editingTestimonialId ? 'Save Changes' : 'Publish Testimonial'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: COUPONS (2-COLUMN REFERENCE LAYOUT) */}
        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-fade-in">
            {/* Left Card: Active Discount Coupons */}
            <div className="xl:col-span-7 bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF8F2] border border-[#EAE6DB] flex items-center justify-center text-[#967BB6] shrink-0 shadow-2xs">
                  <Ticket className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-brand-charcoal">Active Discount Coupons</h3>
                  <p className="text-xs text-brand-muted">Manage coupon codes and their corresponding percentage discount values.</p>
                </div>
              </div>

              <div className="border-t border-[#EAE6DB]" />

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#EAE6DB] text-brand-muted font-bold">
                      <th className="py-3 px-2">Coupon Code</th>
                      <th className="py-3 px-2">Discount Value</th>
                      <th className="py-3 px-2">Min Order</th>
                      <th className="py-3 px-2">Usage Limit / Stock</th>
                      <th className="py-3 px-2 text-center">Show in list</th>
                      <th className="py-3 px-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAE6DB]/60">
                    {coupons.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-brand-muted">
                          No discount coupons found. Create one using the form on the right.
                        </td>
                      </tr>
                    ) : (
                      coupons.map((promo) => {
                        const hasLimit = promo.usageLimit !== undefined && promo.usageLimit !== null;
                        const remaining = hasLimit ? Math.max(0, promo.usageLimit! - (promo.usedCount || 0)) : null;

                        return (
                          <tr key={promo.id} className="hover:bg-[#FAF8F2]/60 transition-colors">
                            <td className="py-3.5 px-2">
                              <span className="px-3 py-1 bg-[#FAF8F2] border border-[#EAE6DB] font-mono font-bold text-xs rounded-xl tracking-wider text-brand-charcoal inline-block shadow-2xs">
                                {promo.code}
                              </span>
                            </td>
                            <td className="py-3.5 px-2 font-bold text-emerald-700">
                              {promo.discount.includes('Discount') || promo.discount.includes('OFF')
                                ? promo.discount
                                : `${promo.discount} Discount`}
                            </td>
                            <td className="py-3.5 px-2 text-brand-charcoal font-medium">
                              {promo.minSpend > 0 ? `₹${promo.minSpend.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="py-3.5 px-2">
                              {hasLimit ? (
                                remaining === 0 ? (
                                  <span className="text-[11px] font-bold bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full inline-block">
                                    Depleted
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-full inline-block">
                                    {remaining} left
                                  </span>
                                )
                              ) : (
                                <span className="text-xs text-brand-muted">Unlimited</span>
                              )}
                            </td>
                            <td className="py-3.5 px-2 text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                <input
                                  type="checkbox"
                                  checked={Boolean(promo.showInList)}
                                  onChange={() => handleToggleShowInList(promo)}
                                  className="w-4 h-4 rounded text-[#967BB6] focus:ring-[#967BB6] border-[#D1CDC7] cursor-pointer"
                                  title={promo.showInList ? 'Visible in checkout suggestions' : 'Hidden from checkout suggestions'}
                                />
                              </label>
                            </td>
                            <td className="py-3.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteCoupon(promo)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                title="Delete Coupon"
                              >
                                <X className="w-4 h-4 stroke-[2.5]" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Card: Create New Coupon */}
            <div className="xl:col-span-5 bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-5">
              <h3 className="font-serif text-lg sm:text-xl font-bold text-brand-charcoal">Create New Coupon</h3>

              <form onSubmit={handleCreateCoupon} className="space-y-4">
                {/* 1. Coupon Code */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-charcoal">Coupon Code</label>
                  <input
                    type="text"
                    required
                    placeholder="E.G. SABARA30"
                    value={newCouponForm.code}
                    onChange={(e) => setNewCouponForm({ ...newCouponForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all placeholder:text-[#BBB6AE]"
                  />
                  <p className="text-[10px] text-brand-muted leading-tight">
                    Unique text identifying the discount. Alphanumeric, converted to uppercase.
                  </p>
                </div>

                {/* 2. Discount Percentage */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-charcoal">Discount Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    placeholder="e.g. 30"
                    value={newCouponForm.percent}
                    onChange={(e) => setNewCouponForm({ ...newCouponForm, percent: e.target.value })}
                    className="w-full bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all placeholder:text-[#BBB6AE]"
                  />
                  <p className="text-[10px] text-brand-muted leading-tight">
                    Percentage value between 1 and 100 deducted from the subtotal.
                  </p>
                </div>

                {/* 3. Minimum Order Amount */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-charcoal">Minimum Order Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500 (Optional)"
                    value={newCouponForm.minSpend}
                    onChange={(e) => setNewCouponForm({ ...newCouponForm, minSpend: e.target.value })}
                    className="w-full bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all placeholder:text-[#BBB6AE]"
                  />
                  <p className="text-[10px] text-brand-muted leading-tight">
                    Minimum cart subtotal required to apply this coupon. Leave empty for no minimum.
                  </p>
                </div>

                {/* 4. Usage Limit (Stock) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-charcoal">Usage Limit (Stock)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50 (Optional)"
                    value={newCouponForm.usageLimit}
                    onChange={(e) => setNewCouponForm({ ...newCouponForm, usageLimit: e.target.value })}
                    className="w-full bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all placeholder:text-[#BBB6AE]"
                  />
                  <p className="text-[10px] text-brand-muted leading-tight">
                    Number of times this coupon can be applied overall. Leave empty for unlimited.
                  </p>
                </div>

                {/* 5. Show in list checkbox */}
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={newCouponForm.showInList}
                    onChange={(e) => setNewCouponForm({ ...newCouponForm, showInList: e.target.checked })}
                    className="w-4 h-4 rounded text-[#967BB6] focus:ring-[#967BB6] border-[#D1CDC7]"
                  />
                  <span className="text-xs font-bold text-brand-charcoal">
                    Show in suggested list on checkout page
                  </span>
                </label>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isAddingCoupon}
                  className="w-full py-3 px-4 bg-[#967BB6] hover:bg-[#7F62A1] active:bg-[#6D528F] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isAddingCoupon ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Coupon...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Add Coupon Code</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 6: HOMEPAGE VISUAL CONTENT MANAGER */}
        {activeTab === 'homepage' && (
          <div className="space-y-6 animate-fade-in">
            {/* Hidden File Inputs for Direct Local Media Upload to Supabase Storage */}
            <input
              ref={bannerFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => {
                if (activeUploadTarget) {
                  handleUploadBannerImage(e, activeUploadTarget.id, activeUploadTarget.isMobile);
                } else if (activeReplacingBannerId) {
                  handleUploadBannerImage(e, activeReplacingBannerId, false);
                }
              }}
            />
            <input
              ref={bannerModalFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => handleUploadBannerImage(e)}
            />
            <input
              ref={catCardFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => {
                if (uploadingTargetCardId) {
                  handleUploadCatCardImage(e, uploadingTargetCardId);
                }
              }}
            />
            <input
              ref={reelFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
              onChange={(e) => {
                if (uploadingTargetReelId) {
                  handleUploadReelImage(e, uploadingTargetReelId);
                } else {
                  handleUploadReelImage(e);
                }
              }}
            />

            {/* Top Toolbar: Title & Save / Reset Actions */}
            <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="font-serif text-xl sm:text-2xl text-brand-charcoal font-bold">
                    Homepage Visual Content Manager
                  </h3>
                </div>
                <p className="text-xs text-brand-muted mt-1">
                  Change banners, category photos, marquee phrases, headlines, and influencer reels live from here.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetHomepageConfig}
                  className="px-4 py-2.5 bg-[#FAF8F2] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-[#EAE6DB] text-brand-charcoal text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-1.5"
                  title="Reset all sections to initial store design"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>

                <button
                  type="button"
                  disabled={isSavingHomepage}
                  onClick={handleSaveHomepageConfig}
                  className="px-6 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSavingHomepage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isSavingHomepage ? 'Saving Live...' : 'Save Homepage Changes'}</span>
                </button>
              </div>
            </div>

            {/* Sub-Tabs Navigation Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {[
                { id: 'banners', label: `Hero Banners (${homepageConfig.heroBanners.length})`, icon: ImageIcon },
                { id: 'categories', label: `Category Cards (${homepageConfig.categoryCards.length})`, icon: Layers },
                { id: 'marquee', label: 'Announcement & Marquee', icon: MessageSquare },
                { id: 'reels', label: `Influencer Reels (${homepageConfig.influencerReels.length})`, icon: Eye },
                { id: 'features', label: `Value Propositions (${homepageConfig.valueProps.length})`, icon: ShieldCheck },
              ].map((sub) => {
                const Icon = sub.icon;
                const isActive = activeHomeSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveHomeSubTab(sub.id as any)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-[#1A1821] text-white shadow-xs'
                        : 'bg-white border border-[#EAE6DB] text-brand-muted hover:text-brand-charcoal hover:bg-[#FAF8F2]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ================= SUB-TAB 1: HERO BANNERS ================= */}
            {activeHomeSubTab === 'banners' && (
              <div className="space-y-6">
                {/* 1. Hero Section Container */}
                <div className="bg-[#FAF8F2] rounded-3xl border border-[#EAE6DB] p-4 sm:p-7 shadow-xs space-y-6">
                  {/* Collapsible Accordion Header */}
                  <div
                    onClick={() => setIsHeroSectionOpen((prev) => !prev)}
                    className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-[#EAE6DB]/60"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-xl sm:text-2xl font-normal text-brand-charcoal">
                        1. Hero Section
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="p-1.5 rounded-full text-brand-charcoal hover:bg-[#EAE6DB]/60 transition-colors"
                      aria-label="Toggle Hero Section"
                    >
                      {isHeroSectionOpen ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {isHeroSectionOpen && (
                    <div className="space-y-5 animate-fade-in">
                      {homepageConfig.heroBanners.map((banner, idx) => (
                        <div
                          key={banner.id || idx}
                          className="bg-white rounded-2xl border border-[#EAE6DB] p-5 sm:p-6 shadow-xs space-y-4 hover:border-[#967BB6]/60 transition-all"
                        >
                          {/* Card Header Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EAE6DB]/70 gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="font-sans font-black text-sm tracking-wider text-brand-charcoal uppercase">
                                BANNER SLIDE <span className="text-[#967BB6]">{idx + 1}</span>
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  banner.active !== false
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-gray-100 text-gray-500 border-gray-200'
                                }`}
                              >
                                {banner.active !== false ? 'Live' : 'Hidden'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-brand-muted font-normal">
                                  Clickable banner leading to
                                </span>
                                <select
                                  value={banner.category || 'all'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setHomepageConfig((prev) => ({
                                      ...prev,
                                      heroBanners: prev.heroBanners.map((b) =>
                                        b.id === banner.id ? { ...b, category: val } : b
                                      ),
                                    }));
                                  }}
                                  className="px-2.5 py-1 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs font-bold text-[#967BB6] focus:outline-none focus:border-[#967BB6] cursor-pointer"
                                >
                                  <option value="all">/shop (All)</option>
                                  <option value="nightwear">/shop (Nightwear)</option>
                                  <option value="jewellery">/shop (Jewellery)</option>
                                  {categoriesList
                                    .filter((c) => c.slug !== 'nightwear' && c.slug !== 'jewellery')
                                    .map((c) => (
                                      <option key={c.id} value={c.slug}>
                                        /shop ({c.name})
                                      </option>
                                    ))}
                                </select>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteBanner(banner.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Slide"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* 2-Column Responsive Layout: Laptop vs Mobile */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 pt-1">
                            {/* Left Column: LAPTOP IMAGE */}
                            <div className="space-y-2 p-4 bg-[#FAF8F2] rounded-2xl border border-[#EAE6DB]">
                              <div className="flex items-center justify-between gap-2">
                                <label className="block text-xs font-black uppercase text-brand-charcoal tracking-wide">
                                  LAPTOP IMAGE (LANDSCAPE - E.G. 1600 X 650)
                                </label>
                                <span className="text-[10px] font-bold text-[#967BB6] bg-[#F5EEFA] px-2 py-0.5 rounded-full border border-[#967BB6]/30">
                                  Desktop / Laptop
                                </span>
                              </div>

                              <div className="flex items-center gap-3 sm:gap-4">
                                {/* Landscape Thumbnail with Red circular X */}
                                <div className="relative w-28 h-20 sm:w-36 sm:h-24 rounded-2xl bg-white border border-[#EAE6DB] shrink-0 overflow-hidden shadow-xs flex items-center justify-center">
                                  {banner.image ? (
                                    <>
                                      <img
                                        src={banner.image}
                                        alt={banner.alt || 'Laptop Banner'}
                                        className="w-full h-full object-cover object-center"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleClearBannerImage(banner.id, false)}
                                        className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#D93025] hover:bg-[#B3261E] text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer z-10 transition-transform active:scale-90"
                                        title="Remove laptop image"
                                      >
                                        <X className="w-3 h-3 stroke-[3]" />
                                      </button>
                                    </>
                                  ) : (
                                    <div
                                      onClick={() => {
                                        setActiveUploadTarget({ id: banner.id, isMobile: false });
                                        bannerFileInputRef.current?.click();
                                      }}
                                      className="w-full h-full flex flex-col items-center justify-center text-brand-muted hover:text-[#967BB6] cursor-pointer transition-colors p-2 text-center"
                                    >
                                      <ImageIcon className="w-6 h-6 opacity-40 mb-1" />
                                      <span className="text-[10px] font-bold">No Image</span>
                                    </div>
                                  )}
                                </div>

                                {/* URL Input & Upload Action */}
                                <div className="flex-1 space-y-1.5 min-w-0">
                                  <span className="block text-[11px] font-medium text-brand-muted">
                                    Upload landscape banner or paste URL:
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={banner.image || ''}
                                      onChange={(e) => handleUpdateBannerImageText(banner.id, false, e.target.value)}
                                      placeholder="https://... or click Upload"
                                      className="flex-1 min-w-0 px-3 py-2 bg-white border border-[#EAE6DB] rounded-xl text-xs text-brand-charcoal focus:outline-none focus:border-[#967BB6] transition-colors"
                                    />
                                    <button
                                      type="button"
                                      disabled={isUploadingBannerImg}
                                      onClick={() => {
                                        setActiveUploadTarget({ id: banner.id, isMobile: false });
                                        bannerFileInputRef.current?.click();
                                      }}
                                      className="px-3.5 py-2 bg-[#F5EEFA] hover:bg-[#967BB6] hover:text-white text-[#967BB6] border border-[#967BB6]/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                                      title="Upload landscape banner file from computer"
                                    >
                                      <UploadCloud className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Upload</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Right Column: MOBILE IMAGE */}
                            <div className="space-y-2 p-4 bg-[#FAF8F2] rounded-2xl border border-[#EAE6DB]">
                              <div className="flex items-center justify-between gap-2">
                                <label className="block text-xs font-black uppercase text-brand-charcoal tracking-wide">
                                  MOBILE IMAGE (PORTRAIT - E.G. 414 X 650)
                                </label>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Mobile Phones
                                </span>
                              </div>

                              <div className="flex items-center gap-3 sm:gap-4">
                                {/* Portrait Thumbnail with Red circular X */}
                                <div className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-2xl bg-white border border-[#EAE6DB] shrink-0 overflow-hidden shadow-xs flex items-center justify-center">
                                  {banner.mobileImage ? (
                                    <>
                                      <img
                                        src={banner.mobileImage}
                                        alt={banner.alt || 'Mobile Banner'}
                                        className="w-full h-full object-cover object-center"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleClearBannerImage(banner.id, true)}
                                        className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#D93025] hover:bg-[#B3261E] text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer z-10 transition-transform active:scale-90"
                                        title="Remove mobile image"
                                      >
                                        <X className="w-3 h-3 stroke-[3]" />
                                      </button>
                                    </>
                                  ) : (
                                    <div
                                      onClick={() => {
                                        setActiveUploadTarget({ id: banner.id, isMobile: true });
                                        bannerFileInputRef.current?.click();
                                      }}
                                      className="w-full h-full flex flex-col items-center justify-center text-brand-muted hover:text-[#967BB6] cursor-pointer transition-colors p-2 text-center"
                                    >
                                      <Smartphone className="w-6 h-6 opacity-40 mb-1" />
                                      <span className="text-[10px] font-bold">No Mobile</span>
                                    </div>
                                  )}
                                </div>

                                {/* Mobile URL Input & Upload Action */}
                                <div className="flex-1 space-y-1.5 min-w-0">
                                  <span className="block text-[11px] font-medium text-brand-muted">
                                    Upload mobile portrait banner or paste URL:
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={banner.mobileImage || ''}
                                      onChange={(e) => handleUpdateBannerImageText(banner.id, true, e.target.value)}
                                      placeholder="https://... or click Upload"
                                      className="flex-1 min-w-0 px-3 py-2 bg-white border border-[#EAE6DB] rounded-xl text-xs text-brand-charcoal focus:outline-none focus:border-[#967BB6] transition-colors"
                                    />
                                    <button
                                      type="button"
                                      disabled={isUploadingBannerImg}
                                      onClick={() => {
                                        setActiveUploadTarget({ id: banner.id, isMobile: true });
                                        bannerFileInputRef.current?.click();
                                      }}
                                      className="px-3.5 py-2 bg-[#F5EEFA] hover:bg-[#967BB6] hover:text-white text-[#967BB6] border border-[#967BB6]/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                                      title="Upload portrait mobile banner file from computer"
                                    >
                                      <UploadCloud className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Upload</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Card Sub-actions: Move & Live Toggle */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#EAE6DB]/50 text-xs text-brand-muted">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={banner.active !== false}
                                onChange={() => handleToggleBannerActive(banner.id)}
                                className="rounded text-[#967BB6] focus:ring-[#967BB6] cursor-pointer"
                              />
                              <span className="font-semibold text-brand-charcoal">Show in carousel</span>
                            </label>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveBanner(idx, 'left')}
                                className="p-1.5 rounded-lg border border-[#EAE6DB] text-brand-charcoal hover:bg-[#FAF8F2] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title="Move Up"
                              >
                                <MoveLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === homepageConfig.heroBanners.length - 1}
                                onClick={() => handleMoveBanner(idx, 'right')}
                                className="p-1.5 rounded-lg border border-[#EAE6DB] text-brand-charcoal hover:bg-[#FAF8F2] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                title="Move Down"
                              >
                                <MoveRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Add Slide & Autoplay Controls */}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={handleAddNewSlide}
                          className="px-4 py-2.5 bg-white hover:bg-[#F5EEFA] hover:text-[#967BB6] border border-[#EAE6DB] hover:border-[#967BB6]/40 text-brand-charcoal text-xs font-bold rounded-2xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-[#967BB6]" />
                          <span>Add Banner Slide</span>
                        </button>

                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-[#EAE6DB]">
                          <Clock className="w-3.5 h-3.5 text-brand-muted" />
                          <span className="text-[11px] font-bold text-brand-charcoal">Autoplay:</span>
                          <select
                            value={homepageConfig.bannerAutoplaySeconds || 2}
                            onChange={(e) =>
                              setHomepageConfig((p) => ({ ...p, bannerAutoplaySeconds: Number(e.target.value) }))
                            }
                            className="bg-transparent text-xs font-bold text-[#967BB6] focus:outline-none cursor-pointer"
                          >
                            <option value={2}>2 seconds</option>
                            <option value={3}>3 seconds</option>
                            <option value={4}>4 seconds</option>
                            <option value={5}>5 seconds</option>
                          </select>
                        </div>
                      </div>

                      {/* Save Hero Carousel Changes Button matching website colour theme */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleSaveHomepageConfig}
                          disabled={isSavingHomepage}
                          className="w-full py-3.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-sm sm:text-base font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isSavingHomepage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          <span>Save Hero Carousel Changes</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= SUB-TAB 2: CATEGORY CARDS ================= */}
            {activeHomeSubTab === 'categories' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <h4 className="font-serif text-lg font-bold text-brand-charcoal">"The Essentials - Shop by Category" Cards</h4>
                      <span className="bg-[#FAF8F2] text-[#967BB6] font-bold text-[11px] px-2.5 py-0.5 rounded-full border border-[#EAE6DB]">
                        {homepageConfig.categoryCards.length} Cards Active
                      </span>
                    </div>
                    <p className="text-xs text-brand-muted">
                      Full control over all 5 category cards right beneath the hero carousel. Upload custom high-res photography, update titles, taglines, CTA buttons, and links.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-full sm:w-56">
                      <label className="block text-[10px] font-bold uppercase text-brand-muted mb-1">
                        Section Sub-Headline
                      </label>
                      <input
                        type="text"
                        value={homepageConfig.categorySectionTitle || 'THE ESSENTIALS'}
                        onChange={(e) => setHomepageConfig((p) => ({ ...p, categorySectionTitle: e.target.value.toUpperCase() }))}
                        placeholder="THE ESSENTIALS"
                        className="w-full px-3.5 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs font-bold text-[#967BB6] focus:bg-white focus:outline-none focus:border-[#967BB6]"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={handleAddCategoryCard}
                        className="px-3.5 py-2 bg-[#967BB6] hover:bg-[#8368A3] text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Card</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetFiveCategoryCards}
                        title="Reset to 5 default categories"
                        className="px-3 py-2 bg-[#FAF8F2] hover:bg-[#F3EEF9] text-brand-charcoal hover:text-[#967BB6] border border-[#EAE6DB] rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset 5 Cards</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSavingHomepage}
                        onClick={handleSaveHomepageConfig}
                        className="px-4 py-2 bg-[#1A1821] hover:bg-black text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSavingHomepage ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-[#FBB6CE]" />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {homepageConfig.categoryCards.map((card, idx) => (
                    <div
                      key={card.id || idx}
                      className="bg-white rounded-3xl border border-[#EAE6DB] overflow-hidden shadow-xs flex flex-col justify-between hover:border-[#967BB6]/60 transition-all group/card"
                    >
                      {/* Image Preview Box */}
                      <div className="relative aspect-[4/3] bg-[#FAF8F2] overflow-hidden border-b border-[#EAE6DB] group">
                        {card.image ? (
                          <img
                            src={card.image}
                            alt={card.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-brand-muted text-xs p-4 text-center">
                            <ImageIcon className="w-8 h-8 opacity-30 mb-1.5" />
                            <span className="font-medium text-[11px]">No Photo Uploaded</span>
                            <span className="text-[10px] text-brand-muted/70 mt-0.5">Recommended: 600×800 or 800×600</span>
                          </div>
                        )}

                        {/* Top Badges & Controls */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                          <span className="bg-white/95 backdrop-blur-xs text-[#1A1821] text-[10px] font-black px-2.5 py-0.5 rounded-full border border-gray-200 shadow-xs pointer-events-auto">
                            CARD #{idx + 1}
                          </span>

                          <div className="flex items-center gap-1 pointer-events-auto">
                            {/* Reorder Left */}
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveCategoryCard(idx, 'left')}
                              title="Move card left"
                              className="w-6 h-6 rounded-full bg-white/95 hover:bg-white text-brand-charcoal disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-xs cursor-pointer border border-gray-200 transition-all text-xs"
                            >
                              <MoveLeft className="w-3 h-3" />
                            </button>

                            {/* Reorder Right */}
                            <button
                              type="button"
                              disabled={idx === homepageConfig.categoryCards.length - 1}
                              onClick={() => handleMoveCategoryCard(idx, 'right')}
                              title="Move card right"
                              className="w-6 h-6 rounded-full bg-white/95 hover:bg-white text-brand-charcoal disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-xs cursor-pointer border border-gray-200 transition-all text-xs"
                            >
                              <MoveRight className="w-3 h-3" />
                            </button>

                            {/* Delete card */}
                            <button
                              type="button"
                              disabled={homepageConfig.categoryCards.length <= 1}
                              onClick={() => handleDeleteCategoryCard(card.id)}
                              title="Delete this card"
                              className="w-6 h-6 rounded-full bg-white/95 hover:bg-red-50 text-red-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-xs cursor-pointer border border-gray-200 transition-all text-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Hover Overlay Buttons */}
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                          <button
                            type="button"
                            disabled={isUploadingCatCardImg === card.id}
                            onClick={() => {
                              setUploadingTargetCardId(card.id);
                              if (catCardFileInputRef.current) catCardFileInputRef.current.click();
                            }}
                            className="px-3.5 py-1.5 bg-white text-[#1A1821] hover:bg-[#F3EEF9] hover:text-[#967BB6] rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>{card.image ? 'Replace Photo' : 'Upload Photo'}</span>
                          </button>

                          {card.image && (
                            <button
                              type="button"
                              onClick={() => {
                                setHomepageConfig((prev) => ({
                                  ...prev,
                                  categoryCards: prev.categoryCards.map((c) => (c.id === card.id ? { ...c, image: '' } : c)),
                                }));
                              }}
                              className="px-2.5 py-1 bg-white/85 text-red-600 hover:bg-white rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer"
                            >
                              Remove Photo
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Fields */}
                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <label className="block text-[10px] font-bold uppercase text-brand-muted">
                            Card Title (e.g. JEWELLERY)
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={card.active !== false}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setHomepageConfig((prev) => ({
                                  ...prev,
                                  categoryCards: prev.categoryCards.map((c) => (c.id === card.id ? { ...c, active: checked } : c)),
                                }));
                              }}
                              className="rounded text-[#967BB6] focus:ring-[#967BB6] cursor-pointer w-3.5 h-3.5"
                            />
                            <span className="text-[10px] font-bold text-brand-charcoal">Visible on Store</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={card.name}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setHomepageConfig((prev) => ({
                              ...prev,
                              categoryCards: prev.categoryCards.map((c) => (c.id === card.id ? { ...c, name: val } : c)),
                            }));
                          }}
                          className="w-full px-3 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs font-bold text-brand-charcoal focus:bg-white focus:outline-none focus:border-[#967BB6]"
                        />

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-brand-muted mb-1">
                            Tagline Description
                          </label>
                          <input
                            type="text"
                            value={card.tagline}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHomepageConfig((prev) => ({
                                ...prev,
                                categoryCards: prev.categoryCards.map((c) => (c.id === card.id ? { ...c, tagline: val } : c)),
                              }));
                            }}
                            placeholder="Waterproof, Shower-Safe & Hypoallergenic"
                            className="w-full px-3 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs text-brand-charcoal focus:bg-white focus:outline-none focus:border-[#967BB6]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-brand-muted mb-1">
                              CTA Button Text
                            </label>
                            <input
                              type="text"
                              value={card.ctaText}
                              onChange={(e) => {
                                const val = e.target.value;
                                setHomepageConfig((prev) => ({
                                  ...prev,
                                  categoryCards: prev.categoryCards.map((c) => (c.id === card.id ? { ...c, ctaText: val } : c)),
                                }));
                              }}
                              className="w-full px-2.5 py-1.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs font-bold text-brand-charcoal focus:bg-white focus:outline-none focus:border-[#967BB6]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-brand-muted mb-1">
                              Link Target
                            </label>
                            <select
                              value={card.category}
                              onChange={(e) => {
                                const val = e.target.value;
                                setHomepageConfig((prev) => ({
                                  ...prev,
                                  categoryCards: prev.categoryCards.map((c) => (c.id === card.id ? { ...c, category: val } : c)),
                                }));
                              }}
                              className="w-full px-2.5 py-1.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#967BB6] cursor-pointer"
                            >
                              <option value="jewellery">jewellery</option>
                              <option value="nightwear">nightwear</option>
                              <option value="hair-accessories">hair-accessories</option>
                              <option value="daily-essentials">daily-essentials</option>
                              <option value="100-anti-tarnish">100-anti-tarnish</option>
                              {categoriesList.map((c) => (
                                <option key={c.id} value={c.slug}>
                                  {c.slug}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Image URL fallback */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-brand-muted mb-1">
                            Photo URL (or upload above)
                          </label>
                          <input
                            type="text"
                            value={card.image}
                            onChange={(e) => {
                              const val = e.target.value;
                              setHomepageConfig((prev) => ({
                                ...prev,
                                categoryCards: prev.categoryCards.map((c) => (c.id === card.id ? { ...c, image: val } : c)),
                              }));
                            }}
                            placeholder="https://..."
                            className="w-full px-3 py-1.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#967BB6] font-mono text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= SUB-TAB 3: ANNOUNCEMENT & MARQUEE ================= */}
            {activeHomeSubTab === 'marquee' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* 1. Header Top Announcement Bar */}
                <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-brand-charcoal">Top Announcement Ticker Bar</h4>
                      <p className="text-xs text-brand-muted">Visible at the very top of all store pages above the header.</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer bg-[#FAF8F2] px-3 py-1.5 rounded-xl border border-[#EAE6DB]">
                      <input
                        type="checkbox"
                        checked={homepageConfig.announcementActive !== false}
                        onChange={(e) => setHomepageConfig((p) => ({ ...p, announcementActive: e.target.checked }))}
                        className="rounded text-[#967BB6] focus:ring-[#967BB6] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-brand-charcoal">Visible</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-brand-charcoal mb-1.5">
                      Announcement Text Content
                    </label>
                    <textarea
                      rows={3}
                      value={homepageConfig.announcementText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHomepageConfig((p) => ({ ...p, announcementText: val }));
                        setAnnouncementText(val);
                      }}
                      placeholder="✦ BUY 3 SETS FOR ₹2,999 ✦ FREE 18K GOLD POLISH GUARANTEE..."
                      className="w-full px-4 py-3 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#967BB6] leading-relaxed"
                    />
                  </div>

                  {/* Live Mini Preview */}
                  <div className="p-3 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-brand-muted block">Preview:</span>
                    <div className="bg-[#1A1821] text-white text-[11px] py-1.5 px-3 rounded-lg text-center font-bold tracking-wider truncate">
                      {homepageConfig.announcementText}
                    </div>
                  </div>
                </div>

                {/* 2. Continuous Scrolling Marquee Ribbon */}
                <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-4">
                  <div>
                    <h4 className="font-serif text-lg font-bold text-brand-charcoal">Continuous Marquee Ribbon (Purple Strip)</h4>
                    <p className="text-xs text-brand-muted">
                      Infinite animated scrolling ribbon right below the hero banners. Add or remove phrases.
                    </p>
                  </div>

                  {/* Add New Phrase */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newMarqueeInput}
                      onChange={(e) => setNewMarqueeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMarqueePhrase();
                        }
                      }}
                      placeholder="Add phrase: e.g. 100% PURE BREATHABLE COTTON"
                      className="flex-1 px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs uppercase focus:bg-white focus:outline-none focus:border-[#967BB6]"
                    />
                    <button
                      type="button"
                      onClick={handleAddMarqueePhrase}
                      className="px-4 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* List of Current Phrases */}
                  <div className="space-y-2 pt-2">
                    <label className="block text-[11px] font-bold uppercase text-brand-muted">
                      Current Scrolling Phrases ({homepageConfig.marqueePhrases.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {homepageConfig.marqueePhrases.map((phrase, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 bg-[#F3EEF9] border border-[#967BB6]/30 text-[#967BB6] px-3 py-1.5 rounded-full text-xs font-bold"
                        >
                          <span>{phrase}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMarqueePhrase(idx)}
                            className="text-[#967BB6] hover:text-rose-600 rounded-full cursor-pointer p-0.5"
                            title="Remove phrase"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Live Marquee Strip Preview */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase text-brand-muted block mb-1">Live Ribbon Preview:</span>
                    <div className="w-full bg-[#967BB6] text-white py-2 rounded-xl overflow-hidden px-3 flex items-center gap-4 text-xs font-bold tracking-widest uppercase">
                      {homepageConfig.marqueePhrases.slice(0, 3).map((p, i) => (
                        <span key={i} className="flex items-center gap-2 shrink-0">
                          <span>{p}</span>
                          <span>✦</span>
                        </span>
                      ))}
                      <span>...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= SUB-TAB 4: INFLUENCER REELS & TRENDING ================= */}
            {activeHomeSubTab === 'reels' && (
              <div className="space-y-6">
                {/* 1. Trending Section Header Config */}
                <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-serif text-lg font-bold text-brand-charcoal">Trending Section Headlines</h4>
                    <p className="text-xs text-brand-muted">Customize section title and button for the Trending This Season section.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-brand-muted mb-1">
                        Section Headline
                      </label>
                      <input
                        type="text"
                        value={homepageConfig.trendingTitle || 'TRENDING THIS SEASON'}
                        onChange={(e) => setHomepageConfig((p) => ({ ...p, trendingTitle: e.target.value }))}
                        className="px-3.5 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs font-bold text-brand-charcoal focus:bg-white focus:outline-none focus:border-[#967BB6]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-brand-muted mb-1">
                        Button Label
                      </label>
                      <input
                        type="text"
                        value={homepageConfig.trendingCtaText || 'SHOP ALL TRENDING'}
                        onChange={(e) => setHomepageConfig((p) => ({ ...p, trendingCtaText: e.target.value }))}
                        className="px-3.5 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs font-bold text-brand-charcoal focus:bg-white focus:outline-none focus:border-[#967BB6]"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Influencer Reels Manager */}
                <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-brand-charcoal">Influencer-Approved Comfort Reels</h4>
                      <p className="text-xs text-brand-muted">
                        Vertical reel cards with stickers, view counters, and direct product buy buttons.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAddReel}
                      className="px-4 py-2 bg-[#1A1821] hover:bg-[#967BB6] text-white text-xs font-bold rounded-2xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Reel</span>
                    </button>
                  </div>

                  {/* Section Title / Subtitle Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-brand-muted mb-1">
                        Reels Section Title
                      </label>
                      <input
                        type="text"
                        value={homepageConfig.influencerTitle || 'Influencer-Approved Comfort'}
                        onChange={(e) => setHomepageConfig((p) => ({ ...p, influencerTitle: e.target.value }))}
                        className="w-full px-3.5 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs font-bold text-brand-charcoal focus:bg-white focus:outline-none focus:border-[#967BB6]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-brand-muted mb-1">
                        Reels Section Subtitle
                      </label>
                      <input
                        type="text"
                        value={homepageConfig.influencerSubtitle || ''}
                        onChange={(e) => setHomepageConfig((p) => ({ ...p, influencerSubtitle: e.target.value }))}
                        className="w-full px-3.5 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs text-brand-charcoal focus:bg-white focus:outline-none focus:border-[#967BB6]"
                      />
                    </div>
                  </div>

                  {/* Reels Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3">
                    {homepageConfig.influencerReels.map((reel, idx) => (
                      <div
                        key={reel.id || idx}
                        className="bg-[#FAF8F2] rounded-2xl border border-[#EAE6DB] overflow-hidden flex flex-col justify-between"
                      >
                        {/* Reel Aspect Ratio Preview */}
                        <div className="relative aspect-[9/14] bg-black overflow-hidden group">
                          {reel.image ? (
                            <img src={reel.image} alt={reel.tagText} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/40 text-xs">
                              No Poster Photo
                            </div>
                          )}

                          {/* Overlay Sticker */}
                          <div className="absolute top-3 left-3 text-white drop-shadow">
                            <span className="font-handwritten text-lg text-[#fffeea] block font-bold leading-tight">
                              {reel.tagText}
                            </span>
                            <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                              {reel.subTag}
                            </span>
                          </div>

                          <div className="absolute top-3 right-3 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            👁️ {reel.views}
                          </div>

                          {/* Hover Overlay to Replace Photo */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                setUploadingTargetReelId(reel.id);
                                if (reelFileInputRef.current) reelFileInputRef.current.click();
                              }}
                              className="px-3 py-1.5 bg-white text-brand-charcoal hover:bg-[#F3EEF9] rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer"
                            >
                              <UploadCloud className="w-3.5 h-3.5 text-[#967BB6]" />
                              <span>Upload Photo</span>
                            </button>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="p-3 bg-white space-y-2 border-t border-[#EAE6DB]">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-brand-muted">
                              Handwritten Tag Sticker
                            </label>
                            <input
                              type="text"
                              value={reel.tagText}
                              onChange={(e) => {
                                const val = e.target.value;
                                setHomepageConfig((prev) => ({
                                  ...prev,
                                  influencerReels: prev.influencerReels.map((r) => (r.id === reel.id ? { ...r, tagText: val } : r)),
                                }));
                              }}
                              className="w-full px-2 py-1 bg-[#FAF8F2] border border-[#EAE6DB] rounded-lg text-xs font-bold focus:outline-none focus:border-[#967BB6]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-brand-muted">
                              Sub-Tag Line
                            </label>
                            <input
                              type="text"
                              value={reel.subTag}
                              onChange={(e) => {
                                const val = e.target.value;
                                setHomepageConfig((prev) => ({
                                  ...prev,
                                  influencerReels: prev.influencerReels.map((r) => (r.id === reel.id ? { ...r, subTag: val } : r)),
                                }));
                              }}
                              className="w-full px-2 py-1 bg-[#FAF8F2] border border-[#EAE6DB] rounded-lg text-xs focus:outline-none focus:border-[#967BB6]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-brand-muted">
                              Views Badge (e.g. 8.4k)
                            </label>
                            <input
                              type="text"
                              value={reel.views}
                              onChange={(e) => {
                                const val = e.target.value;
                                setHomepageConfig((prev) => ({
                                  ...prev,
                                  influencerReels: prev.influencerReels.map((r) => (r.id === reel.id ? { ...r, views: val } : r)),
                                }));
                              }}
                              className="w-full px-2 py-1 bg-[#FAF8F2] border border-[#EAE6DB] rounded-lg text-xs focus:outline-none focus:border-[#967BB6]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-brand-muted">
                              Linked Catalog Product
                            </label>
                            <select
                              value={reel.productId || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setHomepageConfig((prev) => ({
                                  ...prev,
                                  influencerReels: prev.influencerReels.map((r) => (r.id === reel.id ? { ...r, productId: val } : r)),
                                }));
                              }}
                              className="w-full px-2 py-1 bg-[#FAF8F2] border border-[#EAE6DB] rounded-lg text-xs focus:outline-none focus:border-[#967BB6] cursor-pointer"
                            >
                              <option value="">Auto-cycle Product</option>
                              {productsList.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (₹{p.price})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-[#EAE6DB]">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={reel.active !== false}
                                onChange={() => {
                                  setHomepageConfig((prev) => ({
                                    ...prev,
                                    influencerReels: prev.influencerReels.map((r) => (r.id === reel.id ? { ...r, active: !r.active } : r)),
                                  }));
                                }}
                                className="rounded text-[#967BB6] focus:ring-[#967BB6] cursor-pointer"
                              />
                              <span className="text-[11px] font-bold text-brand-charcoal">Active</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => handleDeleteReel(reel.id)}
                              className="text-rose-500 hover:text-rose-700 text-[11px] font-bold cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================= SUB-TAB 5: BRAND FEATURES ================= */}
            {activeHomeSubTab === 'features' && (
              <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 shadow-xs space-y-6">
                <div>
                  <h4 className="font-serif text-lg font-bold text-brand-charcoal">Brand Value Proposition Feature Boxes</h4>
                  <p className="text-xs text-brand-muted">
                    The 4 trust badges and guarantee boxes displayed at the bottom of the homepage above the footer.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {homepageConfig.valueProps.map((vp, idx) => (
                    <div
                      key={vp.id || idx}
                      className="p-5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl space-y-3"
                    >
                      <span className="text-[10px] font-black uppercase text-[#967BB6] block">
                        BOX #{idx + 1}
                      </span>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-brand-muted mb-1">
                          Icon / Emoji
                        </label>
                        <input
                          type="text"
                          value={vp.icon}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHomepageConfig((prev) => ({
                              ...prev,
                              valueProps: prev.valueProps.map((v, i) => (i === idx ? { ...v, icon: val } : v)),
                            }));
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-[#EAE6DB] rounded-xl text-center text-lg focus:outline-none focus:border-[#967BB6]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-brand-muted mb-1">
                          Headline
                        </label>
                        <input
                          type="text"
                          value={vp.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHomepageConfig((prev) => ({
                              ...prev,
                              valueProps: prev.valueProps.map((v, i) => (i === idx ? { ...v, title: val } : v)),
                            }));
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-[#EAE6DB] rounded-xl text-xs font-bold text-brand-charcoal focus:outline-none focus:border-[#967BB6]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-brand-muted mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={vp.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHomepageConfig((prev) => ({
                              ...prev,
                              valueProps: prev.valueProps.map((v, i) => (i === idx ? { ...v, description: val } : v)),
                            }));
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-[#EAE6DB] rounded-xl text-xs text-brand-muted focus:outline-none focus:border-[#967BB6]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= MODAL: ADD HERO BANNER ================= */}
            {isBannerModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
                <div className="bg-white rounded-3xl border border-[#EAE6DB] max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl font-bold text-brand-charcoal">Add New Banner Slide</h3>
                    <button
                      type="button"
                      onClick={() => setIsBannerModalOpen(false)}
                      className="p-1 rounded-full text-brand-muted hover:text-brand-charcoal hover:bg-gray-100 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveBannerModal} className="space-y-4">
                    {/* Image URL & Upload Button */}
                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-1">
                        Banner Image (Upload or URL) *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={bannerForm.image}
                          onChange={(e) => setBannerForm({ ...bannerForm, image: e.target.value })}
                          placeholder="https://... or click Upload"
                          className="flex-1 px-3.5 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#967BB6]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (bannerModalFileInputRef.current) bannerModalFileInputRef.current.click();
                          }}
                          className="px-4 py-2.5 bg-[#F3EEF9] hover:bg-[#967BB6] text-[#967BB6] hover:text-white border border-[#967BB6]/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>Upload File</span>
                        </button>
                      </div>
                      <span className="text-[11px] text-brand-muted block mt-1">
                        Recommended size: 1920x600 px or aspect ratio ~16:5.
                      </span>
                    </div>

                    {/* Preview */}
                    {bannerForm.image && (
                      <div className="aspect-[16/6] bg-[#FAF8F2] rounded-xl overflow-hidden border border-[#EAE6DB]">
                        <img src={bannerForm.image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Alt description */}
                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-1">
                        Alt Text Description
                      </label>
                      <input
                        type="text"
                        value={bannerForm.alt}
                        onChange={(e) => setBannerForm({ ...bannerForm, alt: e.target.value })}
                        placeholder="Girly Tales Launch Offer"
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#967BB6]"
                      />
                    </div>

                    {/* Destination Category */}
                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-1">
                        Destination Page / Category
                      </label>
                      <select
                        value={bannerForm.category}
                        onChange={(e) => setBannerForm({ ...bannerForm, category: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#967BB6] cursor-pointer"
                      >
                        <option value="all">Shop All Products ('all')</option>
                        <option value="nightwear">Nightwear ('nightwear')</option>
                        <option value="jewellery">Jewellery ('jewellery')</option>
                        {categoriesList
                          .filter((c) => c.slug !== 'nightwear' && c.slug !== 'jewellery')
                          .map((c) => (
                            <option key={c.id} value={c.slug}>
                              {c.name} ('{c.slug}')
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE6DB]">
                      <button
                        type="button"
                        onClick={() => setIsBannerModalOpen(false)}
                        className="px-4 py-2 text-xs font-bold text-brand-muted hover:text-brand-charcoal cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-[#1A1821] hover:bg-[#967BB6] text-white text-xs font-bold uppercase rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        Add to Carousel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ================= MODAL: ADD INFLUENCER REEL ================= */}
            {isReelModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
                <div className="bg-white rounded-3xl border border-[#EAE6DB] max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl font-bold text-brand-charcoal">Add Influencer Reel Card</h3>
                    <button
                      type="button"
                      onClick={() => setIsReelModalOpen(false)}
                      className="p-1 rounded-full text-brand-muted hover:text-brand-charcoal hover:bg-gray-100 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveReelModal} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-1">
                        Reel Photo (Upload or URL) *
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={reelForm.image}
                          onChange={(e) => setReelForm({ ...reelForm, image: e.target.value })}
                          placeholder="https://... or click Upload"
                          className="flex-1 px-3.5 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#967BB6]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setUploadingTargetReelId(null);
                            if (reelFileInputRef.current) reelFileInputRef.current.click();
                          }}
                          className="px-4 py-2.5 bg-[#F3EEF9] hover:bg-[#967BB6] text-[#967BB6] hover:text-white border border-[#967BB6]/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          <UploadCloud className="w-4 h-4" />
                          <span>Upload File</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1">
                          Handwritten Tag Text
                        </label>
                        <input
                          type="text"
                          required
                          value={reelForm.tagText}
                          onChange={(e) => setReelForm({ ...reelForm, tagText: e.target.value })}
                          placeholder="Cute & comfy"
                          className="w-full px-3 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#967BB6]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1">
                          Sub-Tag Line
                        </label>
                        <input
                          type="text"
                          required
                          value={reelForm.subTag}
                          onChange={(e) => setReelForm({ ...reelForm, subTag: e.target.value })}
                          placeholder="PJ's ft. Girly Tales"
                          className="w-full px-3 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#967BB6]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1">
                          Views Count (e.g. 10.5k)
                        </label>
                        <input
                          type="text"
                          value={reelForm.views}
                          onChange={(e) => setReelForm({ ...reelForm, views: e.target.value })}
                          placeholder="10.5k"
                          className="w-full px-3 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#967BB6]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1">
                          Linked Product
                        </label>
                        <select
                          value={reelForm.productId}
                          onChange={(e) => setReelForm({ ...reelForm, productId: e.target.value })}
                          className="w-full px-3 py-2 bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl text-xs focus:bg-white focus:outline-none focus:border-[#967BB6] cursor-pointer"
                        >
                          <option value="">Auto-select Product</option>
                          {productsList.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (₹{p.price})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE6DB]">
                      <button
                        type="button"
                        onClick={() => setIsReelModalOpen(false)}
                        className="px-4 py-2 text-xs font-bold text-brand-muted hover:text-brand-charcoal cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-[#1A1821] hover:bg-[#967BB6] text-white text-xs font-bold uppercase rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        Add Reel Card
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Hidden File Inputs for Homepage Uploads */}
            <input
              type="file"
              ref={bannerFileInputRef}
              onChange={(e) => handleUploadBannerImage(e)}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
            />
            <input
              type="file"
              ref={bannerModalFileInputRef}
              onChange={(e) => handleUploadBannerImage(e)}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
            />
            <input
              type="file"
              ref={catCardFileInputRef}
              onChange={(e) => {
                if (uploadingTargetCardId) {
                  handleUploadCatCardImage(e, uploadingTargetCardId);
                }
              }}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
            />
            <input
              type="file"
              ref={reelFileInputRef}
              onChange={(e) => handleUploadReelImage(e, uploadingTargetReelId || undefined)}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
            />
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
                    <div className="text-center py-10 text-xs text-brand-muted bg-[#FAF8F2] rounded-2xl border border-dashed border-[#EAE6DB] space-y-1">
                      <p className="font-bold text-brand-charcoal">No custom categories in database yet.</p>
                      <p>Type a category name above and click "Add Category" to create your first category.</p>
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

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSeedCatalog}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  title="Manually import demo products and categories into Supabase tables"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Import Demo Products to Supabase</span>
                </button>
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

            {/* Storage Bucket & Table Status Matrix */}
            <div className="bg-white rounded-3xl border border-[#EAE6DB] p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg text-brand-charcoal font-medium">Database &amp; Storage Health</h3>
                  <p className="text-xs text-brand-muted">Real-time verification of required Supabase tables, row counts, and storage bucket.</p>
                </div>
                <span className="text-xs font-bold text-brand-muted">14 Schema Tables + Storage</span>
              </div>

              {/* Storage Bucket Indicator */}
              <div className="p-4 rounded-2xl border border-[#EAE6DB] bg-[#FAF8F2] flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-charcoal">Storage: product-images</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      dbStatus?.storageBucket?.status === 'ready'
                        ? 'bg-emerald-100 text-emerald-800'
                        : dbStatus?.storageBucket?.status === 'missing'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {dbStatus?.storageBucket?.status === 'ready' ? 'Bucket Active' : dbStatus?.storageBucket?.status || 'checking'}
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-muted truncate">
                    {dbStatus?.storageBucket?.message || 'Public storage bucket for permanent product photo uploads'}
                  </p>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  dbStatus?.storageBucket?.status === 'ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {dbStatus?.storageBucket?.status === 'ready' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <AlertCircle className="w-3.5 h-3.5" />}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {[
                  { name: 'categories', label: 'Categories Table', desc: 'Shop navigation & custom category ordering', count: categoriesList.length },
                  { name: 'products', label: 'Products Catalog', desc: 'Nightwear, 18K Jewellery, prices, stock & specs', count: productsList.length },
                  { name: 'orders', label: 'Customer Orders', desc: 'Customer checkout, payment status & delivery address', count: orders.length },
                  { name: 'reviews', label: 'Product Reviews', desc: 'Ratings, product reviews & moderation flags', count: reviews.length },
                  { name: 'testimonials', label: 'Testimonials Table', desc: 'Homepage quotes, ratings, author names & slots', count: testimonials.length },
                  { name: 'coupons', label: 'Coupons & Discounts', desc: 'Active promo codes, spend tiers & usage counts', count: coupons.length },
                  { name: 'profiles', label: 'User Profiles', desc: 'Synced with Supabase Auth users for avatars & phone', count: customers.length },
                  { name: 'shipping_addresses', label: 'Customer Addresses', desc: 'Saved delivery addresses per customer', count: 0 },
                  { name: 'wishlist', label: 'Customer Wishlist', desc: 'Saved favorites per customer across devices', count: 0 },
                  { name: 'cart_items', label: 'Persistent Cart', desc: 'Cross-device saved shopping bag records', count: 0 },
                  { name: 'store_settings', label: 'Store Settings', desc: 'Announcement bar, hero headline & store metadata', count: 1 },
                  { name: 'promotions', label: 'Promotions', desc: 'Flash deals, bundle offers & promo banners', count: promotions.length },
                  { name: 'shipping_rules', label: 'Shipping Rules', desc: 'Free threshold, standard rates & courier partners', count: 1 },
                  { name: 'faqs', label: 'FAQs Directory', desc: 'Product care, 18K guarantee & return policies', count: faqs.length },
                ].map((tbl) => {
                  const tableStatus = dbStatus?.tables?.find((t) => t.name === tbl.name);
                  const isReady = tableStatus ? tableStatus.status === 'ready' : true;
                  const isMissing = tableStatus ? tableStatus.status === 'missing' : false;

                  return (
                    <div key={tbl.name} className="p-4 rounded-2xl border border-[#EAE6DB] bg-[#FAF8F2] flex items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-brand-charcoal">{tbl.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isMissing ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {tableStatus ? `${tableStatus.count} rows` : `${tbl.count} rows`}
                          </span>
                        </div>
                        <p className="text-[11px] text-brand-muted truncate">{tbl.desc}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        isMissing ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`} title={isMissing ? 'Table Missing - Run SQL script' : 'Table Ready'}>
                        {isMissing ? <AlertCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
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
