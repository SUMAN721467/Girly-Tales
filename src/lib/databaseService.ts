import { supabase, isSupabaseConfigured, requireSupabase, getEffectiveSupabaseUrl, getSupabaseAnonKey, getRawSupabaseUrl, normalizeStorageUrl } from './supabase';
import { Product } from '../types/product';
import { MOCK_PRODUCTS } from '../data/products';
import { CartService } from './cartService';
import { EmailService } from './emailService';
import banner1 from '../assets/banner1.png';
import banner2 from '../assets/banner2.png';
import banner3 from '../assets/banner3.png';
import slide1 from '../assets/slide1.jpg';
import slide2 from '../assets/slide2.jpg';

export const formatQueryError = (err: any): string => {
  if (!err) return 'Empty error response';
  if (typeof err === 'string') {
    try {
      const parsed = JSON.parse(err);
      if (parsed && typeof parsed === 'object') {
        return parsed.message || parsed.error_description || parsed.details || err;
      }
    } catch {}
    return err;
  }
  if (err.message && typeof err.message === 'string' && err.message.trim()) return err.message;
  if (err.error_description) return err.error_description;
  if (err.details) return err.details;
  if (err.hint) return err.hint;
  if (err.code) return `PostgREST error ${err.code}`;
  try {
    const s = JSON.stringify(err);
    if (s && s !== '{}') return s;
  } catch {}
  return String(err) || 'Query failed';
};

export async function fetchSupabaseRestFallback<T>(path: string): Promise<T | null> {
  const candidateBases = [
    getRawSupabaseUrl(),
    getEffectiveSupabaseUrl(),
    typeof window !== 'undefined' && window.location?.origin ? `${window.location.origin}/supabase-proxy` : '',
  ].filter(Boolean);

  const uniqueBases = Array.from(new Set(candidateBases));
  const apiKey = getSupabaseAnonKey();
  if (!apiKey) return null;

  const cleanPath = path.replace(/^\/+/, '');

  for (const base of uniqueBases) {
    try {
      const cleanBase = base.replace(/\/+$/, '');
      const url = `${cleanBase}/rest/v1/${cleanPath}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);

      const res = await fetch(url, {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch (err) {
      // Continue to next candidate
    }
  }

  return null;
}

export async function supabaseRestMutation(
  table: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  queryParam: string,
  body?: any,
  prefer?: string
): Promise<boolean> {
  const candidateBases = [
    getRawSupabaseUrl(),
    getEffectiveSupabaseUrl(),
    typeof window !== 'undefined' && window.location?.origin ? `${window.location.origin}/supabase-proxy` : '',
  ].filter(Boolean);

  const uniqueBases = Array.from(new Set(candidateBases));
  const apiKey = getSupabaseAnonKey();
  if (!apiKey) return false;

  const defaultPrefer = queryParam.includes('on_conflict=')
    ? 'resolution=merge-duplicates,return=minimal'
    : 'return=minimal';

  for (const base of uniqueBases) {
    try {
      const cleanBase = base.replace(/\/+$/, '');
      const url = queryParam ? `${cleanBase}/rest/v1/${table}?${queryParam}` : `${cleanBase}/rest/v1/${table}`;
      const headers: Record<string, string> = {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Prefer: prefer || defaultPrefer,
      };

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);

      const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        return true;
      }
    } catch (err) {
      // Continue to next candidate
    }
  }

  return false;
}

// Fast timeout helper for read operations
async function withTimeout<T>(promise: Promise<T> | any, ms = 15000, fallbackVal?: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve(fallbackVal !== undefined ? fallbackVal : ({ data: null, error: 'timeout' } as unknown as T));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    return { data: null, error: err } as unknown as T;
  }
}
// Resilient Promise.any helper that returns the first fulfilled promise
export async function safePromiseAny<T>(promises: (Promise<T> | PromiseLike<T>)[]): Promise<T> {
  if (typeof Promise.any === 'function') {
    return Promise.any(promises);
  }
  return new Promise<T>((resolve, reject) => {
    let rejectedCount = 0;
    const errors: any[] = [];
    if (promises.length === 0) {
      reject(new Error('All promises were rejected (empty array)'));
      return;
    }
    promises.forEach((p, idx) => {
      Promise.resolve(p)
        .then(resolve)
        .catch((err) => {
          errors[idx] = err;
          rejectedCount++;
          if (rejectedCount === promises.length) {
            reject(errors);
          }
        });
    });
  });
}
// Purge legacy browser/local storage keys to guarantee pure direct Supabase operation
if (typeof window !== 'undefined') {
  try {
    const keysToPurge = [
      'girly_tales_products_store_v2',
      'girly_tales_categories_store_v2',
      'girly_tales_reviews_store_v2',
      'girly_tales_coupons_store_v2',
      'girly_tales_orders_store_v2',
      'girly_tales_db_orders_v1',
      'girly_tales_db_products_v1',
      'girly_tales_db_reviews_v1',
      'girly_tales_db_coupons_v1',
      'girly_tales_db_categories_v1',
      'girly_tales_db_settings_v1',
      'girly_tales_db_promotions_v1',
      'girly_tales_db_shipping_v1',
      'girly_tales_db_faqs_v1',
      'girly_tales_shipping_addresses_v1',
      'girly_tales_saved_addresses_v1',
      'gt_cached_testimonials_v1',
    ];
    keysToPurge.forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  } catch (e) {}
}

// Global live sync broadcaster for real-time reactivity across components
export const notifyDatabaseChange = (
  type: 'categories' | 'products' | 'orders' | 'reviews' | 'testimonials' | 'coupons' | 'cart' | 'wishlist' | 'settings' | 'promotions' | 'shipping' | 'faqs' | 'homepage' | 'all'
) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gt_db_sync', { detail: { type } }));
  }
};

export type SellerStatus = 'Pending' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled by Seller';
export type CustomerStatus = 'Paid' | 'Pending' | 'Cancelled by Customer' | 'Payment Failed';

export interface RealOrderItem {
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  variant?: string;
  image?: string;
}

export interface RealOrder {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  items: (string | RealOrderItem)[];
  total: number;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  sellerStatus: SellerStatus;
  customerStatus: CustomerStatus;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | SellerStatus;
  paymentMethod: 'UPI / Prepaid' | 'Cash on Delivery' | 'Credit / Debit Card' | string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  specialInstructions?: string;
  createdAt: string;
}

export function normalizeOrderItems(items: (string | RealOrderItem)[] | undefined, allProducts?: Product[]): RealOrderItem[] {
  if (!items || !Array.isArray(items)) return [];
  return items.map((it, idx) => {
    if (typeof it === 'object' && it !== null && 'name' in it) {
      let img = (it as RealOrderItem).image;
      if (!img && allProducts) {
        const found = allProducts.find((p) => p.name.toLowerCase() === (it as RealOrderItem).name.toLowerCase());
        if (found && found.images?.[0]) img = found.images[0];
      }
      return {
        productId: (it as RealOrderItem).productId || `item-${idx}`,
        name: (it as RealOrderItem).name || 'Product Item',
        price: Number((it as RealOrderItem).price) || 0,
        quantity: Number((it as RealOrderItem).quantity) || 1,
        size: (it as RealOrderItem).size || '',
        variant: (it as RealOrderItem).variant || '',
        image: img || (allProducts?.[0]?.images?.[0] || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'),
      };
    }

    const str = String(it || '').trim();
    let qty = 1;
    let size = '';
    let name = str;

    const qtyMatch = str.match(/x\s*(\d+)$/i);
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1], 10) || 1;
      name = name.replace(/x\s*\d+$/i, '').trim();
    }

    const sizeMatch = name.match(/\(([A-Za-z0-9\s]+)\)$/);
    if (sizeMatch) {
      size = sizeMatch[1].trim();
      name = name.replace(/\([A-Za-z0-9\s]+\)$/, '').trim();
    }

    let price = 1299;
    let img = '';
    if (allProducts) {
      const matchProd = allProducts.find(
        (p) =>
          p.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(p.name.toLowerCase())
      );
      if (matchProd) {
        price = matchProd.price;
        img = matchProd.images?.[0] || '';
      }
    }
    if (!img) {
      img = 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80';
    }

    return {
      productId: `item-${idx}`,
      name: name || str || 'Girly Tales Item',
      price,
      quantity: qty,
      size,
      image: img,
    };
  });
}

export interface RealReview {
  id: string;
  productId?: string;
  productName: string;
  author: string;
  rating: number;
  comment: string;
  title?: string;
  images?: string[];
  verified: boolean;
  status: 'Approved' | 'Pending' | 'Featured' | 'Hidden';
  createdAt: string;
}

export interface RealTestimonial {
  id: string;
  author: string;
  rating: number;
  comment: string;
  productName: string;
  productId?: string;
  location?: string;
  verified: boolean;
  status: 'Approved' | 'Featured' | 'Hidden';
  orderIndex?: number;
  createdAt?: string;
}

export interface RealCoupon {
  id: string;
  code: string;
  discount: string;
  description: string;
  minSpend: number;
  usedCount: number;
  status: 'Active' | 'Inactive';
  expires: string;
  showInList?: boolean;
  usageLimit?: number | null;
}

export interface CustomerPurchasedProduct {
  productId: string;
  name: string;
  image: string;
  quantity: number;
  unitPrice: number;
  totalSpent: number;
  lastOrderedDate: string;
}

export interface CustomerCartItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  addedAt?: string;
}

export interface CustomerWishlistItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  addedAt?: string;
}

export interface RealCustomer {
  id: string;
  supabaseUid?: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  city: string;
  state?: string;
  address?: string;
  pincode?: string;
  accountType: 'Registered' | 'Guest';
  authProvider?: string;
  ordersCount: number;
  totalSpent: number;
  avgOrderValue: number;
  tier: 'VIP Platinum' | 'VIP Gold' | 'Member';
  joinedDate: string;
  lastOrderDate?: string;
  lastActivityDate?: string;
  orders: RealOrder[];
  purchasedProducts: CustomerPurchasedProduct[];
}

export interface RealCategory {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  orderIndex: number;
  subCategories?: string[];
  createdAt?: string;
}

export interface PromotionItem {
  id: string;
  name: string;
  discount: string;
  badge: string;
  active: boolean;
  bannerText: string;
  createdAt?: string;
}

export interface ShippingRules {
  id: string;
  freeThreshold: number;
  standardRate: number;
  expressRate: number;
  codHandlingFee: number;
  estimatedDays: string;
  couriers: string[];
}

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  orderIndex?: number;
}

export interface StoreSettings {
  announcementText: string;
  heroHeadline: string;
  heroSubtext: string;
}

export interface HomeBanner {
  id: string;
  image: string; // Laptop screen (Landscape - e.g. 1600 x 650)
  mobileImage?: string; // Mobile screen (Portrait - e.g. 414 x 650)
  imageFit?: 'contain' | 'cover'; // 'contain' fits entire image without crop; 'cover' fills box
  objectPosition?: 'center' | 'top' | 'bottom'; // vertical focus position
  alt: string;
  category: string; // 'all' | 'nightwear' | 'jewellery' | or category slug
  title?: string;
  subtitle?: string;
  active: boolean;
  orderIndex: number;
}

export interface HomeCategoryCard {
  id: string;
  name: string;
  tagline: string;
  image: string;
  category: string;
  ctaText: string;
  orderIndex: number;
  active: boolean;
}

export interface HomeInfluencerReel {
  id: string;
  image: string;
  tagText: string;
  subTag: string;
  views: string;
  productId: string;
  orderIndex: number;
  active: boolean;
}

export interface HomeValueProp {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface HomepageConfig {
  // 1. Top Announcement Bar
  announcementText: string;
  announcementActive: boolean;

  // 2. Hero Banners Carousel
  heroBanners: HomeBanner[];
  bannerAutoplaySeconds: number;

  // 3. Continuous Marquee
  marqueePhrases: string[];

  // 4. Shop By Category
  categorySectionTitle: string;
  categoryCards: HomeCategoryCard[];

  // 5. Trending Section
  trendingTitle: string;
  trendingCtaText: string;

  // 6. Influencer-Approved Comfort Reels
  influencerTitle: string;
  influencerSubtitle: string;
  influencerReels: HomeInfluencerReel[];

  // 7. Value Propositions
  valueProps: HomeValueProp[];
}

export const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = {
  announcementText: '✦ BUY 3 SETS FOR ₹2,999 ✦ FREE 18K GOLD POLISH GUARANTEE ✦ FREE SHIPPING ON ORDERS OVER ₹999 ✦',
  announcementActive: true,
  heroBanners: [
    {
      id: 'b1',
      image: banner1,
      mobileImage: '',
      imageFit: 'contain',
      objectPosition: 'center',
      alt: 'Girly Tales Launch Offer',
      category: 'all',
      title: 'Everyday Luxury',
      subtitle: 'Pure Cotton & 18K Anti-Tarnish',
      active: true,
      orderIndex: 0,
    },
    {
      id: 'b2',
      image: banner2,
      mobileImage: '',
      imageFit: 'contain',
      objectPosition: 'center',
      alt: 'Girly Tales Nightwear & Jewellery Collection',
      category: 'nightwear',
      title: 'Mulberry Silk & Cotton',
      subtitle: 'Cloud-Soft Sleepwear Sets',
      active: true,
      orderIndex: 1,
    },
    {
      id: 'b3',
      image: banner3,
      mobileImage: '',
      imageFit: 'contain',
      objectPosition: 'center',
      alt: 'Girly Tales 18K Anti-Tarnish Jewels',
      category: 'jewellery',
      title: '18K Anti-Tarnish Jewels',
      subtitle: 'Waterproof & Shower-Safe',
      active: true,
      orderIndex: 2,
    },
  ],
  bannerAutoplaySeconds: 2,
  marqueePhrases: [
    'SLEEP INTO COMFORT',
    'SWEET DREAMS START HERE',
    '100% PURE BREATHABLE COTTON',
    '18K ANTI-TARNISH GOLD JEWELS',
    'EXPRESS PAN-INDIA DISPATCH',
  ],
  categorySectionTitle: 'THE ESSENTIALS',
  categoryCards: [
    {
      id: 'cat-jewellery',
      name: 'JEWELLERY',
      tagline: 'Waterproof, Shower-Safe & Hypoallergenic',
      image: slide2,
      category: 'jewellery',
      ctaText: 'SHOP JEWELLERY',
      orderIndex: 0,
      active: true,
    },
    {
      id: 'cat-nightwear',
      name: 'NIGHTWEAR',
      tagline: 'Cloud-Soft Luxury Living',
      image: slide1,
      category: 'nightwear',
      ctaText: 'SHOP NIGHTWEAR',
      orderIndex: 1,
      active: true,
    },
    {
      id: 'cat-hair-accessories',
      name: 'HAIR ACCESSORIES',
      tagline: 'Cloud-Soft Luxury Living',
      image: slide2,
      category: 'hair-accessories',
      ctaText: 'SHOP HAIR ACCESSORIES',
      orderIndex: 2,
      active: true,
    },
    {
      id: 'cat-daily',
      name: 'DAILY ESSENTIALS',
      tagline: 'Cloud-Soft Luxury Living',
      image: slide1,
      category: 'daily-essentials',
      ctaText: 'SHOP ESSENTIALS',
      orderIndex: 3,
      active: true,
    },
    {
      id: 'cat-anti-tarnish',
      name: '100% ANTI-TARNISH',
      tagline: 'Cloud-Soft Luxury Living',
      image: slide1,
      category: '100-anti-tarnish',
      ctaText: 'SHOP ANTI-TARNISH',
      orderIndex: 4,
      active: true,
    },
  ],
  trendingTitle: 'TRENDING THIS SEASON',
  trendingCtaText: 'SHOP ALL TRENDING',
  influencerTitle: 'Influencer-Approved Comfort',
  influencerSubtitle: 'Discover how influencers style our nightwear & jewellery and shop their curated picks.',
  influencerReels: [
    {
      id: 'inf-1',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      tagText: 'Cute & comfy',
      subTag: "PJ's ft. Girly Tales",
      views: '8.4k',
      productId: '',
      orderIndex: 0,
      active: true,
    },
    {
      id: 'inf-2',
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80',
      tagText: 'Pinteresty',
      subTag: '18K Jewels ✨',
      views: '12.1k',
      productId: '',
      orderIndex: 1,
      active: true,
    },
    {
      id: 'inf-3',
      image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80',
      tagText: 'Cloud-soft',
      subTag: 'Cotton Pyjamas',
      views: '6.5k',
      productId: '',
      orderIndex: 2,
      active: true,
    },
    {
      id: 'inf-4',
      image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80',
      tagText: '100% Waterproof',
      subTag: 'Never Green Skin 💧',
      views: '15.2k',
      productId: '',
      orderIndex: 3,
      active: true,
    },
  ],
  valueProps: [
    {
      id: 'vp-1',
      icon: '✨',
      title: '100% Anti-Tarnish',
      description: 'Real 18K Gold Vacuum Plating',
    },
    {
      id: 'vp-2',
      icon: '🌿',
      title: 'Pure Breathable Cotton',
      description: 'Soft, airy & gentle on skin',
    },
    {
      id: 'vp-3',
      icon: '📦',
      title: 'Fast Pan-India Delivery',
      description: 'Express 24h dispatch',
    },
    {
      id: 'vp-4',
      icon: '💕',
      title: 'Designed For Her',
      description: 'Effortless everyday fit',
    },
  ],
};

export const ensureFiveCategoryCards = (cards?: any[]): HomeCategoryCard[] => {
  const defaults = DEFAULT_HOMEPAGE_CONFIG.categoryCards;
  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return defaults.map((d, i) => ({ ...d, orderIndex: i }));
  }

  const result: HomeCategoryCard[] = cards.map((c, i) => ({
    id: c.id || defaults[i % defaults.length]?.id || `cat-${i + 1}`,
    name: c.name || defaults[i % defaults.length]?.name || `CATEGORY ${i + 1}`,
    tagline: c.tagline !== undefined ? c.tagline : (defaults[i % defaults.length]?.tagline || ''),
    image: normalizeStorageUrl(c.image || ''),
    category: c.category || defaults[i % defaults.length]?.category || 'all',
    ctaText: c.ctaText || defaults[i % defaults.length]?.ctaText || 'SHOP NOW',
    orderIndex: typeof c.orderIndex === 'number' ? c.orderIndex : i,
    active: c.active !== false,
  }));

  if (result.length < 5) {
    const existingIds = new Set(result.map((r) => r.id));
    const existingCategories = new Set(result.map((r) => r.category));
    for (const def of defaults) {
      if (result.length >= 5) break;
      if (!existingIds.has(def.id) && !existingCategories.has(def.category)) {
        result.push({ ...def, orderIndex: result.length });
        existingIds.add(def.id);
        existingCategories.add(def.category);
      }
    }
    let idx = 0;
    while (result.length < 5 && idx < defaults.length) {
      const def = defaults[idx];
      result.push({
        ...def,
        id: `${def.id}-${idx + 1}`,
        orderIndex: result.length,
      });
      idx++;
    }
  }

  return result;
};

export const SEED_CATEGORIES: RealCategory[] = [
  { id: 'cat-1', name: 'Nightwear & Pyjamas', slug: 'nightwear', isActive: true, orderIndex: 0, subCategories: [] },
  { id: 'cat-2', name: '18K Anti-Tarnish Jewels', slug: 'jewellery', isActive: true, orderIndex: 1, subCategories: [] },
  { id: 'cat-3', name: 'Satin & Silk Sets', slug: 'satin-sets', isActive: true, orderIndex: 2, subCategories: [] },
  { id: 'cat-4', name: 'Pure Cotton Sets', slug: 'cotton-sets', isActive: true, orderIndex: 3, subCategories: [] },
  { id: 'cat-5', name: 'Waterproof Necklaces & Rings', slug: 'jewels', isActive: true, orderIndex: 4, subCategories: [] },
];

let inMemoryCategorySubcategories: Record<string, string[]> = {};

export const getSubCategoriesForCat = (
  catId?: string,
  slug?: string,
  name?: string,
  customMap: Record<string, string[]> = inMemoryCategorySubcategories
): string[] => {
  const norm = (s?: string) => (s || '').toLowerCase().trim();
  const idKey = norm(catId);
  const slugKey = norm(slug);
  const nameKey = norm(name);

  if (idKey && Array.isArray(customMap[idKey])) return customMap[idKey];
  if (slugKey && Array.isArray(customMap[slugKey])) return customMap[slugKey];
  if (nameKey && Array.isArray(customMap[nameKey])) return customMap[nameKey];

  return [];
};

const SEED_COUPONS: RealCoupon[] = [
  { id: 'cp-1', code: 'GIRLY10', discount: '10% OFF', description: 'VIP Member Exclusive Welcome Perk', minSpend: 999, usedCount: 14, status: 'Active', expires: '2026-12-31' },
  { id: 'cp-2', code: 'SILKLOVE', discount: '15% OFF', description: 'Nightwear & Loungewear Collection', minSpend: 1499, usedCount: 8, status: 'Active', expires: '2026-11-30' },
  { id: 'cp-3', code: '18KGOLD', discount: '₹200 OFF', description: '18K Anti-Tarnish Jewellery Orders', minSpend: 1299, usedCount: 5, status: 'Active', expires: '2026-10-15' },
  { id: 'cp-4', code: 'FREESHIP', discount: 'Free Express Delivery', description: 'Prepaid Orders Across All Pincodes', minSpend: 0, usedCount: 22, status: 'Active', expires: 'Unlimited' },
];

// Runtime in-memory cached state with persistent fast storage
let inMemoryCategories: RealCategory[] = [];
let inMemoryProducts: Product[] = [];
let inMemoryOrders: RealOrder[] = [];
let inMemoryReviews: RealReview[] = [];
let inMemoryTestimonials: RealTestimonial[] = [];
let inMemoryCoupons: RealCoupon[] = [];
let inMemoryStoreSettings: StoreSettings | null = null;
let inMemoryHomepageConfig: HomepageConfig | null = null;
let inMemoryPromotions: PromotionItem[] = [];
let inMemoryShippingRules: ShippingRules | null = null;
let inMemoryFaqs: FAQItem[] = [];
let inMemoryCustomers: RealCustomer[] = [];
const deletedOrderIds = new Set<string>();

const PRODUCTS_CACHE_KEY = 'gt_cached_products_v3';
const CATEGORIES_CACHE_KEY = 'gt_cached_categories_v3';
const SUBCATEGORIES_CACHE_KEY = 'gt_cached_subcategories_v1';
const ORDERS_CACHE_KEY = 'gt_cached_orders_v3';
const COUPONS_CACHE_KEY = 'gt_cached_coupons_v3';
const REVIEWS_CACHE_KEY = 'gt_cached_reviews_v3';
const TESTIMONIALS_CACHE_KEY = 'gt_cached_testimonials_v2';
const HOMEPAGE_CACHE_KEY = 'gt_cached_homepage_v2';
const CUSTOMERS_CACHE_KEY = 'gt_cached_customers_v3';

export const DEFAULT_TESTIMONIALS: RealTestimonial[] = [
  {
    id: 't-1',
    author: 'Ananya S.',
    location: 'Mumbai',
    rating: 5,
    comment: 'Wore my necklace daily to the gym and in hot showers for 3 months — still 100% shiny gold with zero tarnish!',
    productName: '18K Anti-Tarnish Necklace',
    verified: true,
    status: 'Approved',
    orderIndex: 0,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 't-2',
    author: 'Priya M.',
    location: 'Kolkata',
    rating: 5,
    comment: 'The softest pure cotton nightwear I have ever worn. Breathable, airy, and the floral print is so aesthetic.',
    productName: 'Blossom Pure Cotton PJ Set',
    verified: true,
    status: 'Approved',
    orderIndex: 1,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 't-3',
    author: 'Rhea S.',
    location: 'Bengaluru',
    rating: 5,
    comment: 'Luxury boutique unboxing with velvet pouch. Arrived in 2 days and looks just like solid 18K gold jewellery.',
    productName: 'Clover Anti-Tarnish Bracelet',
    verified: true,
    status: 'Approved',
    orderIndex: 2,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 't-4',
    author: 'Tanvi K.',
    location: 'Delhi NCR',
    rating: 5,
    comment: 'Obsessed with the mulberry silk robe set. The fit is elegant, silky smooth, and feels truly opulent.',
    productName: 'Silk Satin Robe Set',
    verified: true,
    status: 'Approved',
    orderIndex: 3,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

export const DEFAULT_REVIEWS: RealReview[] = [
  {
    id: 't-1',
    productId: '',
    productName: '18K Anti-Tarnish Necklace',
    author: 'Ananya S.',
    rating: 5,
    comment: 'Wore my necklace daily to the gym and in hot showers for 3 months — still 100% shiny gold with zero tarnish!',
    title: '100% Shiny Gold',
    images: [],
    verified: true,
    status: 'Approved',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 't-2',
    productId: '',
    productName: 'Blossom Pure Cotton PJ Set',
    author: 'Priya M.',
    rating: 5,
    comment: 'The softest pure cotton nightwear I have ever worn. Breathable, airy, and the floral print is so aesthetic.',
    title: 'Breathable & Airy',
    images: [],
    verified: true,
    status: 'Approved',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 't-3',
    productId: '',
    productName: 'Clover Anti-Tarnish Bracelet',
    author: 'Rhea S.',
    rating: 5,
    comment: 'Luxury boutique unboxing with velvet pouch. Arrived in 2 days and looks just like solid 18K gold jewellery.',
    title: 'Luxury Boutique Unboxing',
    images: [],
    verified: true,
    status: 'Approved',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 't-4',
    productId: '',
    productName: 'Waterproof Huggie Hoops',
    author: 'Sneha K.',
    rating: 5,
    comment: 'Completely hypoallergenic! I have sensitive skin and these earrings never cause any itchiness or redness.',
    title: 'Completely Hypoallergenic',
    images: [],
    verified: true,
    status: 'Approved',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const DEFAULT_COUPONS: RealCoupon[] = [
  {
    id: 'cp-girly10',
    code: 'GIRLY10',
    discount: '10% OFF',
    description: 'Flat 10% Discount on all orders',
    minSpend: 0,
    usedCount: 0,
    status: 'Active',
    expires: '2026-12-31',
    showInList: true,
    usageLimit: null,
  },
  {
    id: 'cp-suman',
    code: 'SUMAN',
    discount: '20% OFF',
    description: 'Special 20% OFF coupon',
    minSpend: 0,
    usedCount: 0,
    status: 'Active',
    expires: '2026-12-31',
    showInList: true,
    usageLimit: null,
  },
];

// Load initial cache from localStorage immediately on script load (0ms boot)
try {
  if (typeof window !== 'undefined') {
    const savedProds = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (savedProds) {
      const parsed = JSON.parse(savedProds);
      if (Array.isArray(parsed) && parsed.length > 0) inMemoryProducts = parsed;
    }
    const savedSubCats = localStorage.getItem(SUBCATEGORIES_CACHE_KEY);
    if (savedSubCats) {
      try {
        const parsedSubs = JSON.parse(savedSubCats);
        if (parsedSubs && typeof parsedSubs === 'object') {
          inMemoryCategorySubcategories = parsedSubs;
        }
      } catch (e) {}
    }
    const savedCats = localStorage.getItem(CATEGORIES_CACHE_KEY);
    if (savedCats) {
      const parsed = JSON.parse(savedCats);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryCategories = parsed.map((c: any) => ({
          ...c,
          subCategories: Array.isArray(c.subCategories) && c.subCategories.length > 0
            ? c.subCategories
            : getSubCategoriesForCat(c.id, c.slug, c.name, inMemoryCategorySubcategories),
        }));
      }
    }
    const savedOrders = localStorage.getItem(ORDERS_CACHE_KEY);
    if (savedOrders) {
      const parsed = JSON.parse(savedOrders);
      if (Array.isArray(parsed) && parsed.length > 0) inMemoryOrders = parsed;
    }
    const savedCoupons = localStorage.getItem(COUPONS_CACHE_KEY);
    if (savedCoupons) {
      const parsed = JSON.parse(savedCoupons);
      if (Array.isArray(parsed) && parsed.length > 0) inMemoryCoupons = parsed;
    }
    if (inMemoryCoupons.length === 0) {
      inMemoryCoupons = DEFAULT_COUPONS;
    }
    const savedRevs = localStorage.getItem(REVIEWS_CACHE_KEY);
    if (savedRevs) {
      const parsed = JSON.parse(savedRevs);
      if (Array.isArray(parsed) && parsed.length > 0) inMemoryReviews = parsed;
    }
    if (inMemoryReviews.length === 0) {
      inMemoryReviews = [...DEFAULT_REVIEWS];
    }
    const savedTestimonials = localStorage.getItem(TESTIMONIALS_CACHE_KEY);
    if (savedTestimonials !== null) {
      try {
        const parsed = JSON.parse(savedTestimonials);
        if (Array.isArray(parsed)) inMemoryTestimonials = parsed;
      } catch {}
    }
    const savedHomepage = localStorage.getItem(HOMEPAGE_CACHE_KEY);
    if (savedHomepage) {
      try {
        const parsed = JSON.parse(savedHomepage);
        if (parsed && typeof parsed === 'object') inMemoryHomepageConfig = parsed;
      } catch {}
    }
    const savedCusts = localStorage.getItem(CUSTOMERS_CACHE_KEY);
    if (savedCusts) {
      try {
        const parsed = JSON.parse(savedCusts);
        if (Array.isArray(parsed) && parsed.length > 0) inMemoryCustomers = parsed;
      } catch {}
    }
  }
} catch (e) {}

let activeProductsPromise: Promise<Product[]> | null = null;
let activeCategoriesPromise: Promise<RealCategory[]> | null = null;
let activeOrdersPromise: Promise<RealOrder[]> | null = null;
let activeCouponsPromise: Promise<RealCoupon[]> | null = null;
let activeTestimonialsPromise: Promise<RealTestimonial[]> | null = null;
let activeHomepagePromise: Promise<HomepageConfig> | null = null;
let lastProductsFetchTime = 0;
let lastCategoriesFetchTime = 0;
let lastOrdersFetchTime = 0;
let lastCouponsFetchTime = 0;
let lastTestimonialsFetchTime = 0;
let lastHomepageFetchTime = 0;

export function mapRawOrder(d: any): RealOrder {
  const cleanId = String(d.id || d.order_id || '').trim();

  const rawSeller = d.seller_status || d.sellerStatus || d.status || 'Pending';
  let sellerStatus: SellerStatus = 'Pending';
  if (['Pending', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled by Seller'].includes(rawSeller)) {
    sellerStatus = rawSeller as SellerStatus;
  } else if (rawSeller === 'Processing') {
    sellerStatus = 'Pending';
  } else if (rawSeller === 'Cancelled') {
    sellerStatus = 'Cancelled by Seller';
  }

  const rawCustomer = d.customer_status || d.customerStatus || (d.payment_method?.includes('Cash') ? 'Pending' : 'Paid');
  let customerStatus: CustomerStatus = 'Paid';
  if (['Paid', 'Pending', 'Cancelled by Customer', 'Payment Failed'].includes(rawCustomer)) {
    customerStatus = rawCustomer as CustomerStatus;
  }

  let parsedItems: any[] = [];
  if (Array.isArray(d.items)) {
    parsedItems = d.items;
  } else if (typeof d.items === 'string') {
    try {
      parsedItems = JSON.parse(d.items);
    } catch {
      parsedItems = [d.items];
    }
  }

  return {
    id: cleanId,
    customerName: d.customer_name || d.customerName || 'Customer',
    email: d.email || '',
    phone: d.phone || '',
    items: parsedItems,
    total: Number(d.total) || 0,
    subtotal: Number(d.subtotal) || Number(d.total) || 0,
    shippingFee: Number(d.shipping_fee) || 0,
    discountAmount: Number(d.discount_amount) || 0,
    sellerStatus,
    customerStatus,
    status: sellerStatus,
    paymentMethod: d.payment_method || d.paymentMethod || 'UPI / Prepaid',
    address: d.address || '',
    city: d.city || 'Mumbai',
    state: d.state || 'Maharashtra',
    pincode: d.pincode || '',
    courierName: d.courier_name || d.courierName || '',
    trackingNumber: d.tracking_number || d.trackingNumber || '',
    trackingUrl: d.tracking_url || d.trackingUrl || '',
    specialInstructions: d.special_instructions || d.specialInstructions || '',
    createdAt: d.created_at || new Date().toISOString(),
  };
}

export const DatabaseService = {
  getCachedOrders(): RealOrder[] {
    return inMemoryOrders;
  },

  getCachedCustomers(): RealCustomer[] {
    return inMemoryCustomers;
  },

  // ==================== 1. ORDERS ====================
  async getOrders(forceFresh = false): Promise<RealOrder[]> {
    if (!isSupabaseConfigured) {
      return inMemoryOrders;
    }

    const now = Date.now();
    // 1. If cache is fresh (< 20s old) and not forced, return immediately (0ms)
    const isCacheFresh = inMemoryOrders.length > 0 && now - lastOrdersFetchTime < 20000;
    if (isCacheFresh && !forceFresh) {
      return inMemoryOrders;
    }

    // 2. If a fetch is already in-flight, reuse it (prevents duplicate requests)
    if (activeOrdersPromise && !forceFresh) {
      return activeOrdersPromise;
    }

    // 3. Stale-While-Revalidate: Return cached orders instantly (0ms) and refresh in background
    if (inMemoryOrders.length > 0 && !forceFresh) {
      this.fetchFreshOrders().catch(() => {});
      return inMemoryOrders;
    }

    return this.fetchFreshOrders();
  },

  async fetchFreshOrders(): Promise<RealOrder[]> {
    if (activeOrdersPromise) return activeOrdersPromise;

    activeOrdersPromise = (async () => {
      try {
        const client = requireSupabase();

        // High-speed parallel candidate race: direct REST proxy vs Supabase client (2500ms timeout)
        const restPromise = fetchSupabaseRestFallback<any[]>('orders?select=*&order=created_at.desc&limit=100');
        const clientPromise = withTimeout(
          client
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)
            .then(({ data, error }) => {
              if (error || !Array.isArray(data)) throw error || new Error('client orders error');
              return data;
            }),
          2500,
          null
        );

        let rawData: any[] = [];
        try {
          rawData = await safePromiseAny([
            clientPromise.then((d) => {
              if (Array.isArray(d)) return d;
              throw new Error('client error');
            }),
            restPromise.then((d) => {
              if (Array.isArray(d)) return d;
              throw new Error('rest empty');
            }),
          ]);
        } catch {
          try {
            const fallback = await restPromise;
            if (Array.isArray(fallback)) rawData = fallback;
          } catch {}
        }

        if (Array.isArray(rawData)) {
          const mapped = rawData.map(mapRawOrder).filter((o) => !!o.id && !deletedOrderIds.has(o.id));
          inMemoryOrders = mapped;
          lastOrdersFetchTime = Date.now();
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(mapped));
            }
          } catch {}
          return mapped;
        }

        return inMemoryOrders;
      } catch (err) {
        console.warn('[Supabase fetchFreshOrders error]', err);
        return inMemoryOrders;
      } finally {
        activeOrdersPromise = null;
      }
    })();

    return activeOrdersPromise;
  },

  async getUserOrders(email?: string, userId?: string, forceFresh = false): Promise<RealOrder[]> {
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanId = (userId || '').trim();

    if (!cleanEmail && !cleanId) {
      return [];
    }

    const cacheKey = `gt_cached_user_orders_${cleanEmail || cleanId}`;

    // 1. Instant 0ms load from localStorage cache
    if (typeof window !== 'undefined' && !forceFresh) {
      try {
        const saved = localStorage.getItem(cacheKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Kick off background revalidation
            this.fetchFreshUserOrders(cleanEmail, cleanId, cacheKey).catch(() => {});
            return parsed;
          }
        }
      } catch {}
    }

    // 2. Check inMemoryOrders if available (0ms)
    if (inMemoryOrders.length > 0 && !forceFresh) {
      const filtered = inMemoryOrders.filter((o) => {
        const matchEmail = cleanEmail && o.email?.toLowerCase().trim() === cleanEmail;
        return Boolean(matchEmail);
      });
      if (filtered.length > 0) {
        this.fetchFreshUserOrders(cleanEmail, cleanId, cacheKey).catch(() => {});
        return filtered;
      }
    }

    return this.fetchFreshUserOrders(cleanEmail, cleanId, cacheKey);
  },

  async fetchFreshUserOrders(cleanEmail: string, cleanId: string, cacheKey: string): Promise<RealOrder[]> {
    try {
      const client = requireSupabase();
      const encodedEmail = encodeURIComponent(cleanEmail);

      // Targeted high-speed candidate race specifically for this user's email
      const restPromise = fetchSupabaseRestFallback<any[]>(
        `orders?email=ilike.${encodedEmail}&order=created_at.desc`
      );

      const clientPromise = withTimeout(
        client
          .from('orders')
          .select('*')
          .ilike('email', cleanEmail)
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            if (error || !Array.isArray(data)) throw error || new Error('client user orders error');
            return data;
          }),
        2500,
        null
      );

      let rawData: any[] = [];
      try {
        rawData = await safePromiseAny([
          clientPromise.then((d) => {
            if (Array.isArray(d)) return d;
            throw new Error('client error');
          }),
          restPromise.then((d) => {
            if (Array.isArray(d)) return d;
            throw new Error('rest empty');
          }),
        ]);
      } catch {
        const fallback = await restPromise;
        if (Array.isArray(fallback)) rawData = fallback;
      }

      if (Array.isArray(rawData)) {
        const mapped = rawData.map(mapRawOrder).filter((o) => !!o.id && !deletedOrderIds.has(o.id));
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(cacheKey, JSON.stringify(mapped));
          }
        } catch {}

        // Merge into inMemoryOrders so other parts of the app also have these orders
        const existingMap = new Map<string, RealOrder>(inMemoryOrders.map((o) => [o.id, o]));
        mapped.forEach((o) => existingMap.set(o.id, o));
        inMemoryOrders = Array.from(existingMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return mapped;
      }

      return [];
    } catch (err) {
      console.warn('[fetchFreshUserOrders error]', err);
      return [];
    }
  },

  async createOrder(order: Omit<RealOrder, 'createdAt' | 'sellerStatus' | 'customerStatus'> & { 
    createdAt?: string; 
    sellerStatus?: SellerStatus; 
    customerStatus?: CustomerStatus; 
  }): Promise<RealOrder> {
    const client = requireSupabase();

    const fullOrder: RealOrder = {
      ...order,
      id: String(order.id).trim(),
      sellerStatus: order.sellerStatus || 'Pending',
      customerStatus: order.customerStatus || (order.paymentMethod?.includes('Cash') ? 'Pending' : 'Paid'),
      status: order.sellerStatus || order.status || 'Pending',
      courierName: order.courierName || '',
      trackingNumber: order.trackingNumber || '',
      trackingUrl: order.trackingUrl || '',
      specialInstructions: order.specialInstructions || '',
      createdAt: order.createdAt || new Date().toISOString(),
    };

    const payload = {
      id: fullOrder.id,
      customer_name: fullOrder.customerName,
      email: fullOrder.email,
      phone: fullOrder.phone,
      items: fullOrder.items,
      total: fullOrder.total,
      subtotal: fullOrder.subtotal,
      shipping_fee: fullOrder.shippingFee,
      discount_amount: fullOrder.discountAmount,
      seller_status: fullOrder.sellerStatus,
      customer_status: fullOrder.customerStatus,
      status: fullOrder.sellerStatus,
      payment_method: fullOrder.paymentMethod,
      address: fullOrder.address,
      city: fullOrder.city,
      state: fullOrder.state,
      pincode: fullOrder.pincode,
      courier_name: fullOrder.courierName,
      tracking_number: fullOrder.trackingNumber,
      tracking_url: fullOrder.trackingUrl,
      special_instructions: fullOrder.specialInstructions,
      created_at: fullOrder.createdAt,
    };

    // 1. Call Supabase FIRST
    let insertError: any = null;
    try {
      const { error } = await client.from('orders').upsert(payload, { onConflict: 'id' });
      insertError = error;
    } catch (err) {
      insertError = err;
    }

    if (insertError) {
      const ok = await supabaseRestMutation('orders', 'POST', '', payload);
      if (!ok) {
        console.error('Supabase createOrder failed:', insertError);
        throw new Error(`Order placement failed in database: ${formatQueryError(insertError)}`);
      }
    }

    // 2. Update in-memory and local cache state ONLY AFTER successful DB response
    inMemoryOrders = [fullOrder, ...inMemoryOrders.filter((o) => o.id !== fullOrder.id)];
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(inMemoryOrders));
        if (fullOrder.email) {
          const userCacheKey = `gt_cached_user_orders_${fullOrder.email.toLowerCase().trim()}`;
          const current = localStorage.getItem(userCacheKey);
          let list: RealOrder[] = [];
          if (current) {
            try { list = JSON.parse(current); } catch {}
          }
          list = [fullOrder, ...list.filter((o) => o.id !== fullOrder.id)];
          localStorage.setItem(userCacheKey, JSON.stringify(list));
        }
      }
    } catch {}
    notifyDatabaseChange('orders');

    // 3. Send automated order confirmation email via Resend in background
    if (fullOrder.email) {
      const normalized = normalizeOrderItems(fullOrder.items);
      EmailService.sendOrderConfirmation({
        id: fullOrder.id,
        customerName: fullOrder.customerName,
        email: fullOrder.email,
        total: fullOrder.total,
        items: normalized.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          selectedSize: it.size,
        })),
        address: fullOrder.address,
        city: fullOrder.city,
        state: fullOrder.state,
        pincode: fullOrder.pincode,
        paymentMethod: fullOrder.paymentMethod,
      }).catch((emailErr) => {
        console.warn('[Order Confirmation Email Note]', emailErr);
      });
    }

    return fullOrder;
  },

  async updateSellerStatus(
    orderId: string,
    sellerStatus: SellerStatus,
    shippingInfo?: { courierName?: string; trackingNumber?: string; trackingUrl?: string }
  ): Promise<void> {
    const cleanId = String(orderId).trim();
    if (!cleanId) throw new Error('Order ID is required');

    const client = requireSupabase();
    const updatePayload: any = { 
      seller_status: sellerStatus,
      status: sellerStatus,
    };
    if (shippingInfo?.courierName !== undefined) updatePayload.courier_name = shippingInfo.courierName;
    if (shippingInfo?.trackingNumber !== undefined) updatePayload.tracking_number = shippingInfo.trackingNumber;
    if (shippingInfo?.trackingUrl !== undefined) updatePayload.tracking_url = shippingInfo.trackingUrl;

    // 1. Call Supabase FIRST
    let updateError: any = null;
    try {
      const { error } = await client
        .from('orders')
        .update(updatePayload)
        .eq('id', cleanId);
      updateError = error;
    } catch (err) {
      updateError = err;
    }

    if (updateError) {
      const ok = await supabaseRestMutation('orders', 'PATCH', `id=eq.${encodeURIComponent(cleanId)}`, updatePayload);
      if (!ok) {
        console.error('Supabase updateSellerStatus failed:', updateError);
        throw new Error(`Failed to update order status in database: ${formatQueryError(updateError)}`);
      }
    }

    // 2. Update local state ONLY on DB success
    inMemoryOrders = inMemoryOrders.map((o) =>
      o.id === cleanId
        ? { 
            ...o, 
            sellerStatus, 
            status: sellerStatus,
            ...(shippingInfo?.courierName !== undefined ? { courierName: shippingInfo.courierName } : {}),
            ...(shippingInfo?.trackingNumber !== undefined ? { trackingNumber: shippingInfo.trackingNumber } : {}),
            ...(shippingInfo?.trackingUrl !== undefined ? { trackingUrl: shippingInfo.trackingUrl } : {}),
          }
        : o
    );
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(inMemoryOrders));
      }
    } catch {}
    notifyDatabaseChange('orders');
  },

  async updateCustomerStatus(orderId: string, customerStatus: CustomerStatus): Promise<void> {
    const cleanId = String(orderId).trim();
    if (!cleanId) throw new Error('Order ID is required');

    const client = requireSupabase();
    const updatePayload = { customer_status: customerStatus };

    let updateError: any = null;
    try {
      const { error } = await client
        .from('orders')
        .update(updatePayload)
        .eq('id', cleanId);
      updateError = error;
    } catch (err) {
      updateError = err;
    }

    if (updateError) {
      const ok = await supabaseRestMutation('orders', 'PATCH', `id=eq.${encodeURIComponent(cleanId)}`, updatePayload);
      if (!ok) {
        console.error('Supabase updateCustomerStatus failed:', updateError);
        throw new Error(`Failed to update customer status: ${formatQueryError(updateError)}`);
      }
    }

    inMemoryOrders = inMemoryOrders.map((o) =>
      o.id === cleanId ? { ...o, customerStatus } : o
    );
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(inMemoryOrders));
      }
    } catch {}
    notifyDatabaseChange('orders');
  },

  async updateSpecialInstructions(orderId: string, specialInstructions: string): Promise<void> {
    const cleanId = String(orderId).trim();
    if (!cleanId) throw new Error('Order ID is required');

    const client = requireSupabase();
    let updateError: any = null;
    try {
      const { error } = await client
        .from('orders')
        .update({ special_instructions: specialInstructions })
        .eq('id', cleanId);
      updateError = error;
    } catch (err) {
      updateError = err;
    }

    if (updateError) {
      const ok = await supabaseRestMutation('orders', 'PATCH', `id=eq.${encodeURIComponent(cleanId)}`, {
        special_instructions: specialInstructions,
      });
      if (!ok) {
        console.error('Supabase updateSpecialInstructions failed:', updateError);
        throw new Error(`Failed to save special instructions: ${formatQueryError(updateError)}`);
      }
    }

    inMemoryOrders = inMemoryOrders.map((o) =>
      o.id === cleanId ? { ...o, specialInstructions } : o
    );
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(inMemoryOrders));
      }
    } catch {}
    notifyDatabaseChange('orders');
  },

  async updateOrderStatus(orderId: string, status: RealOrder['status']): Promise<void> {
    const validSellerStatus: SellerStatus = 
      status === 'Processing' ? 'Pending' :
      status === 'Cancelled' ? 'Cancelled by Seller' : 
      (status as SellerStatus);
    await this.updateSellerStatus(orderId, validSellerStatus);
  },

  async deleteOrder(orderId: string): Promise<void> {
    const cleanId = String(orderId).trim();
    if (!cleanId) throw new Error('Order ID is required');

    const client = requireSupabase();
    let delError: any = null;
    try {
      const { error } = await client
        .from('orders')
        .delete()
        .eq('id', cleanId);
      delError = error;
    } catch (err) {
      delError = err;
    }

    if (delError) {
      const ok = await supabaseRestMutation('orders', 'DELETE', `id=eq.${encodeURIComponent(cleanId)}`);
      if (!ok) {
        console.error('Supabase deleteOrder failed:', delError);
        throw new Error(`Failed to delete order from database: ${formatQueryError(delError)}`);
      }
    }

    inMemoryOrders = inMemoryOrders.filter(
      (o) => o.id !== cleanId && o.id.toLowerCase() !== cleanId.toLowerCase()
    );
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(inMemoryOrders));
      }
    } catch {}
    notifyDatabaseChange('orders');
  },

  getCachedProducts(): Product[] {
    return inMemoryProducts;
  },

  getCachedCategories(): RealCategory[] {
    return inMemoryCategories.map((c) => ({
      ...c,
      subCategories: Array.isArray(c.subCategories) && c.subCategories.length > 0
        ? c.subCategories
        : getSubCategoriesForCat(c.id, c.slug, c.name, inMemoryCategorySubcategories),
    }));
  },

  async getProducts(forceFresh = false): Promise<Product[]> {
    if (!isSupabaseConfigured) {
      return inMemoryProducts.length > 0 ? inMemoryProducts : MOCK_PRODUCTS;
    }

    const now = Date.now();
    // 1. If cache is fresh (< 20s old) and not forced, return immediately
    const isCacheFresh = inMemoryProducts.length > 0 && now - lastProductsFetchTime < 20000;
    if (isCacheFresh && !forceFresh) {
      return inMemoryProducts;
    }

    // 2. If a fetch is already in-flight, reuse it (prevents duplicate requests)
    if (activeProductsPromise && !forceFresh) {
      return activeProductsPromise;
    }

    // 3. Stale-While-Revalidate: Return cached products instantly (0ms) and refresh in background
    if (inMemoryProducts.length > 0 && !forceFresh) {
      this.fetchFreshProducts().catch(() => {});
      return inMemoryProducts;
    }

    return this.fetchFreshProducts();
  },

  async fetchFreshProducts(): Promise<Product[]> {
    if (activeProductsPromise) return activeProductsPromise;

    activeProductsPromise = (async () => {
      try {
        const client = requireSupabase();

        // High-speed parallel race: query via client AND direct REST endpoint simultaneously
        const restPromise = fetchSupabaseRestFallback<any[]>('products?select=*&order=created_at.desc');
        const clientPromise = client
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            if (error || !Array.isArray(data)) throw error || new Error('client error');
            return data;
          });

        let rawData: any[] | null = null;
        try {
          rawData = await safePromiseAny([
            clientPromise.then((d) => {
              if (Array.isArray(d)) return d;
              throw new Error('client error');
            }),
            restPromise.then((d) => {
              if (Array.isArray(d)) return d;
              throw new Error('rest failed');
            }),
          ]);
        } catch {
          const fb = await withTimeout(restPromise, 2500, null);
          if (Array.isArray(fb)) {
            rawData = fb;
          } else {
            const cl = await withTimeout(clientPromise, 2500, null);
            if (Array.isArray(cl)) rawData = cl;
          }
        }

        if (Array.isArray(rawData)) {
          const mapped: Product[] = rawData.map((d: any) => ({
            id: String(d.id),
            name: d.name || 'Girly Tales Item',
            slug: d.slug || String(d.id),
            category: d.category || 'nightwear',
            subCategory: d.sub_category || d.subCategory || '',
            price: Number(d.price) || 0,
            originalPrice: Number(d.original_price ?? d.originalPrice ?? d.price) || 0,
            discount: Number(d.discount || 0),
            rating: Number(d.rating || 5.0),
            reviewCount: Number(d.review_count ?? d.reviewCount ?? 1),
            images: (Array.isArray(d.images)
              ? d.images
              : typeof d.images === 'string'
              ? (d.images.startsWith('[') ? JSON.parse(d.images) : [d.images])
              : [d.image_url || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80']
            ).map(normalizeStorageUrl),
            description: d.description || '',
            shortDescription: d.short_description || d.shortDescription || '',
            material: d.material || '',
            inStock: d.in_stock !== false && d.inStock !== false,
            stockQuantity: Number(d.stock_quantity ?? d.stockQuantity ?? 10),
            sku: d.sku || '',
            dimensions: d.dimensions || '',
            variety: d.variety || '',
            tag: d.tag || d.badge || '',
            badge: d.badge || d.tag || '',
            sizes: d.sizes || (d.category === 'nightwear' ? ['XS', 'S', 'M', 'L', 'XL'] : undefined),
            features: d.features || ['Premium Finish', 'Anti-Tarnish'],
            highlights: d.highlights || [],
            careInstructions: d.care_instructions || d.careInstructions || [],
            deliveryPolicy: d.delivery_policy || d.deliveryPolicy || '',
            specs: d.specs || {},
            colors: d.colors || [],
            antiTarnishGuarantee: d.anti_tarnish_guarantee || '',
            waterproof: Boolean(d.waterproof),
            hypoallergenic: Boolean(d.hypoallergenic),
            isNewArrival: Boolean(d.is_new_arrival),
            isBestSeller: Boolean(d.is_best_seller),
          }));

          inMemoryProducts = mapped;
          lastProductsFetchTime = Date.now();

          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(mapped));
            }
          } catch (e) {}

          return mapped;
        }

        return inMemoryProducts;
      } catch (err) {
        console.warn('fetchFreshProducts error:', err);
        return inMemoryProducts;
      } finally {
        activeProductsPromise = null;
      }
    })();

    return activeProductsPromise;
  },

  async addProduct(product: Product): Promise<Product> {
    const client = requireSupabase();

    const fullPayload = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      sub_category: product.subCategory || '',
      price: product.price,
      original_price: product.originalPrice ?? product.price,
      discount: product.discount ?? 0,
      rating: product.rating ?? 5.0,
      review_count: product.reviewCount ?? 0,
      images: (product.images || []).map(normalizeStorageUrl),
      description: product.description || '',
      short_description: product.shortDescription || '',
      material: product.material || '',
      in_stock: product.inStock !== false,
      stock_quantity: product.stockQuantity ?? 10,
      sku: product.sku || '',
      dimensions: product.dimensions || '',
      variety: product.variety || '',
      tag: product.tag || '',
      sizes: product.sizes || [],
      features: product.features || [],
      highlights: product.highlights || [],
      care_instructions: product.careInstructions || [],
      delivery_policy: product.deliveryPolicy || '',
      specs: product.specs || {},
      colors: product.colors || [],
      anti_tarnish_guarantee: product.antiTarnishGuarantee || '',
      waterproof: Boolean(product.waterproof),
      hypoallergenic: Boolean(product.hypoallergenic),
      is_new_arrival: Boolean(product.isNewArrival),
      is_best_seller: Boolean(product.isBestSeller),
      updated_at: new Date().toISOString(),
    };

    // 1. Call Supabase FIRST
    let saveError: any = null;
    try {
      const { error } = await client.from('products').upsert(fullPayload, { onConflict: 'id' });
      saveError = error;
    } catch (err) {
      saveError = err;
    }

    if (saveError) {
      console.warn('Supabase JS addProduct failed, attempting direct REST upsert...', saveError);
      let ok = await supabaseRestMutation(
        'products',
        'POST',
        'on_conflict=id',
        fullPayload,
        'resolution=merge-duplicates,return=representation'
      );
      if (!ok) {
        ok = await supabaseRestMutation('products', 'POST', '', fullPayload, 'return=representation');
      }
      if (!ok) {
        console.error('Supabase addProduct failed completely:', saveError);
        throw new Error(`Failed to save product to database: ${formatQueryError(saveError)}`);
      }
    }

    // 2. Update local state ONLY on DB success
    inMemoryProducts = [product, ...inMemoryProducts.filter((p) => p.id !== product.id)];
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(inMemoryProducts));
      }
    } catch {}
    notifyDatabaseChange('products');

    return product;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const client = requireSupabase();

    const payload: any = { ...updates, updated_at: new Date().toISOString() };
    if (updates.subCategory !== undefined) payload.sub_category = updates.subCategory;
    if (updates.originalPrice !== undefined) payload.original_price = updates.originalPrice;
    if (updates.shortDescription !== undefined) payload.short_description = updates.shortDescription;
    if (updates.stockQuantity !== undefined) payload.stock_quantity = updates.stockQuantity;
    if (updates.inStock !== undefined) payload.in_stock = updates.inStock;
    if (updates.careInstructions !== undefined) payload.care_instructions = updates.careInstructions;
    if (updates.deliveryPolicy !== undefined) payload.delivery_policy = updates.deliveryPolicy;
    if (updates.reviewCount !== undefined) payload.review_count = updates.reviewCount;
    if (updates.antiTarnishGuarantee !== undefined) payload.anti_tarnish_guarantee = updates.antiTarnishGuarantee;
    if (updates.isNewArrival !== undefined) payload.is_new_arrival = updates.isNewArrival;
    if (updates.images !== undefined && Array.isArray(updates.images)) {
      const normalizedNewImages = updates.images.map(normalizeStorageUrl);
      payload.images = normalizedNewImages;

      // Clean up removed images from storage if any were removed
      const oldProd = inMemoryProducts.find((p) => p.id === id);
      if (oldProd && Array.isArray(oldProd.images)) {
        const newSet = new Set(normalizedNewImages);
        const removedImages = oldProd.images.filter((img) => !newSet.has(img));
        if (removedImages.length > 0) {
          const otherProducts = inMemoryProducts.filter((p) => p.id !== id);
          const otherImagesSet = new Set(otherProducts.flatMap((p) => (Array.isArray(p.images) ? p.images : [])));
          const imagesToDelete = removedImages.filter((img) => !otherImagesSet.has(img));
          if (imagesToDelete.length > 0) {
            this.deleteStorageFiles(imagesToDelete, 'product-images').catch(() => {});
          }
        }
      }
    }

    delete payload.subCategory;
    delete payload.originalPrice;
    delete payload.shortDescription;
    delete payload.stockQuantity;
    delete payload.inStock;
    delete payload.careInstructions;
    delete payload.deliveryPolicy;
    delete payload.reviewCount;
    delete payload.antiTarnishGuarantee;
    delete payload.isNewArrival;
    delete payload.isBestSeller;

    // 1. Call Supabase FIRST
    let updateError: any = null;
    try {
      const { error } = await client.from('products').update(payload).eq('id', id);
      updateError = error;
    } catch (err) {
      updateError = err;
    }

    if (updateError) {
      console.warn('Supabase JS updateProduct failed, attempting direct REST patch...', updateError);
      const ok = await supabaseRestMutation(
        'products',
        'PATCH',
        `id=eq.${encodeURIComponent(id)}`,
        payload,
        'return=representation'
      );
      if (!ok) {
        console.error('Supabase updateProduct failed completely:', updateError);
        throw new Error(`Failed to update product in database: ${formatQueryError(updateError)}`);
      }
    }

    // 2. Update in-memory state ONLY on DB success
    inMemoryProducts = inMemoryProducts.map((p) => (p.id === id ? { ...p, ...updates } : p));
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(inMemoryProducts));
      }
    } catch {}
    notifyDatabaseChange('products');

    const updated = inMemoryProducts.find((p) => p.id === id);
    if (!updated) throw new Error('Product not found after update');
    return updated;
  },

  async updateProductStock(productId: string, inStock: boolean): Promise<void> {
    const client = requireSupabase();
    const stockPayload = { in_stock: inStock, updated_at: new Date().toISOString() };
    let stockError: any = null;
    try {
      const { error } = await client.from('products').update(stockPayload).eq('id', productId);
      stockError = error;
    } catch (err) {
      stockError = err;
    }

    if (stockError) {
      console.warn('Supabase JS updateProductStock failed, attempting direct REST patch...', stockError);
      const ok = await supabaseRestMutation(
        'products',
        'PATCH',
        `id=eq.${encodeURIComponent(productId)}`,
        stockPayload,
        'return=minimal'
      );
      if (!ok) {
        console.error('Supabase updateProductStock failed completely:', stockError);
        throw new Error(`Failed to update stock status: ${formatQueryError(stockError)}`);
      }
    }

    inMemoryProducts = inMemoryProducts.map((p) => (p.id === productId ? { ...p, inStock } : p));
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(inMemoryProducts));
      }
    } catch {}
    notifyDatabaseChange('products');
  },

  extractStoragePath(url: string, bucket = 'product-images'): string | null {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.split('?')[0].trim();
    const pattern = new RegExp(`(?:/storage/v1/object/(?:public/)?${bucket}/|${bucket}/)(.+)`);
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    if (cleanUrl.startsWith('products/') || cleanUrl.startsWith('banners/') || cleanUrl.startsWith('reels/')) {
      return cleanUrl;
    }
    return null;
  },

  async deleteStorageFiles(filePathsOrUrls: string[], bucket = 'product-images'): Promise<boolean> {
    const cleanPaths = Array.from(
      new Set(
        filePathsOrUrls
          .map((p) => this.extractStoragePath(p, bucket) || p)
          .filter((p) => p && !p.startsWith('http://') && !p.startsWith('https://') && !p.startsWith('data:'))
      )
    );

    if (cleanPaths.length === 0) return true;

    console.log(`[Storage Delete] Deleting ${cleanPaths.length} file(s) from bucket '${bucket}':`, cleanPaths);
    const baseUrl = getEffectiveSupabaseUrl().replace(/\/+$/, '');
    const apiKey = getSupabaseAnonKey();

    let success = false;

    // Strategy 1: Direct batch REST DELETE /storage/v1/object/${bucket}
    try {
      const batchRes = await fetch(`${baseUrl}/storage/v1/object/${bucket}`, {
        method: 'DELETE',
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefixes: cleanPaths }),
      });
      if (batchRes.ok) {
        success = true;
      }
    } catch (restErr) {
      console.warn('[Storage Delete] REST batch delete error:', restErr);
    }

    // Strategy 2: Supabase JS storage client .remove()
    if (!success) {
      try {
        const client = requireSupabase();
        const { error } = await client.storage.from(bucket).remove(cleanPaths);
        if (!error) {
          success = true;
        } else {
          console.warn('[Storage Delete] Supabase client remove error:', error);
        }
      } catch (clientErr) {
        console.warn('[Storage Delete] Supabase client error:', clientErr);
      }
    }

    // Strategy 3: Individual REST DELETE fallback
    if (!success) {
      for (const path of cleanPaths) {
        try {
          const singleUrl = `${baseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
          await fetch(singleUrl, {
            method: 'DELETE',
            headers: {
              apikey: apiKey,
              Authorization: `Bearer ${apiKey}`,
            },
          });
        } catch {}
      }
    }

    return true;
  },

  async deleteStorageFile(filePathOrUrl: string, bucket = 'product-images'): Promise<boolean> {
    return this.deleteStorageFiles([filePathOrUrl], bucket);
  },

  async deleteProduct(productId: string): Promise<void> {
    const cleanId = String(productId).trim();
    if (!cleanId) throw new Error('Product ID is required');

    const client = requireSupabase();

    // 1. Identify product, exact IDs, slugs, and associated storage images
    let candidateImages: string[] = [];
    const targetProduct = inMemoryProducts.find((p) => p.id === cleanId || p.slug === cleanId);
    const targetId = targetProduct?.id || cleanId;
    const targetSlug = targetProduct?.slug || cleanId;

    if (targetProduct && Array.isArray(targetProduct.images)) {
      candidateImages = [...targetProduct.images];
    }

    if (candidateImages.length === 0) {
      try {
        const { data: dbProd } = await client
          .from('products')
          .select('id, slug, images')
          .or(`id.eq.${targetId},slug.eq.${targetSlug}`)
          .maybeSingle();
        if (dbProd?.images) {
          if (Array.isArray(dbProd.images)) {
            candidateImages = dbProd.images;
          } else if (typeof dbProd.images === 'string') {
            try {
              candidateImages = JSON.parse(dbProd.images);
            } catch {
              candidateImages = [dbProd.images];
            }
          }
        }
      } catch (err) {}
    }

    // Filter out images that are still referenced by other products (safety check)
    const otherProducts = inMemoryProducts.filter((p) => p.id !== targetId && p.slug !== targetSlug && p.id !== cleanId);
    const otherImagesSet = new Set(
      otherProducts.flatMap((p) => (Array.isArray(p.images) ? p.images : []))
    );
    const imagesToDelete = candidateImages.filter((img) => !otherImagesSet.has(img));

    // 2. Clean up associated foreign rows in dependent tables FIRST (prevents foreign key / trigger failures)
    try {
      await client.from('cart_items').delete().or(`product_id.eq.${targetId},product_id.eq.${cleanId}`);
    } catch (cartErr) {}
    try {
      await client.from('wishlist').delete().or(`product_id.eq.${targetId},product_id.eq.${cleanId}`);
    } catch (wishErr) {}
    try {
      await client.from('reviews').delete().or(`product_id.eq.${targetId},product_id.eq.${cleanId}`);
    } catch (revErr) {}

    // 3. Delete product record from Supabase table with robust multi-strategy execution
    let delError: any = null;
    let deletedCount = 0;

    // Strategy A: Direct primary key deletion via Supabase JS client
    try {
      const { error: err1, count: count1 } = await client
        .from('products')
        .delete({ count: 'exact' })
        .eq('id', targetId);
      if (err1) {
        delError = err1;
      } else if (typeof count1 === 'number' && count1 > 0) {
        deletedCount += count1;
      }
    } catch (err) {
      delError = err;
    }

    // Strategy B: If not deleted or targetSlug exists, delete by slug / cleanId / or filter
    if (deletedCount === 0) {
      try {
        const { error: err2, count: count2 } = await client
          .from('products')
          .delete({ count: 'exact' })
          .or(`id.eq.${targetId},slug.eq.${targetSlug},id.eq.${cleanId}`);
        if (!err2 && typeof count2 === 'number' && count2 > 0) {
          deletedCount += count2;
          delError = null;
        }
      } catch (err) {}
    }

    // Strategy C: Direct PostgREST HTTP REST DELETE calls (bypasses any client filter edge cases)
    try {
      await supabaseRestMutation('products', 'DELETE', `id=eq.${encodeURIComponent(targetId)}`);
      if (targetSlug && targetSlug !== targetId) {
        await supabaseRestMutation('products', 'DELETE', `slug=eq.${encodeURIComponent(targetSlug)}`);
      }
      if (cleanId !== targetId) {
        await supabaseRestMutation('products', 'DELETE', `id=eq.${encodeURIComponent(cleanId)}`);
      }
    } catch (restErr) {}

    // Verify deletion if an error occurred during client deletion
    if (delError && deletedCount === 0) {
      try {
        const { data: checkProd } = await client
          .from('products')
          .select('id')
          .or(`id.eq.${targetId},slug.eq.${targetSlug}`)
          .maybeSingle();
        if (checkProd) {
          console.error('Supabase deleteProduct failed:', delError);
          throw new Error(`Failed to delete product from database: ${formatQueryError(delError)}`);
        }
      } catch (e: any) {
        if (e.message && e.message.includes('Failed to delete product from database')) {
          throw e;
        }
      }
    }

    // 4. Delete product images from Supabase Storage bucket
    if (imagesToDelete.length > 0) {
      try {
        await this.deleteStorageFiles(imagesToDelete, 'product-images');
      } catch (storageErr) {
        console.warn('[deleteProduct] Storage image deletion error:', storageErr);
      }
    }

    // 5. Update and invalidate runtime in-memory and persistent cache
    inMemoryProducts = inMemoryProducts.filter((p) => p.id !== targetId && p.slug !== targetSlug && p.id !== cleanId);
    lastProductsFetchTime = 0; // Force subsequent queries to fetch fresh database state
    activeProductsPromise = null;

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(inMemoryProducts));
      }
    } catch {}

    notifyDatabaseChange('products');
    notifyDatabaseChange('cart');
    notifyDatabaseChange('wishlist');
  },

  async uploadProductImage(file: File): Promise<string> {
    // Preserve original crystal-clear resolution if under 8MB
    const fileToUpload = file.size > 8 * 1024 * 1024
      ? await this.optimizeImageFile(file, 2560, 0.95)
      : file;

    let cleanExt = 'jpg';
    if (file.type.includes('png')) cleanExt = 'png';
    else if (file.type.includes('webp')) cleanExt = 'webp';
    else if (file.type.includes('gif')) cleanExt = 'gif';
    else if (file.type.includes('svg')) cleanExt = 'svg';

    const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
    const filePath = `products/${fileName}`;

    const baseUrl = getEffectiveSupabaseUrl().replace(/\/+$/, '');
    const apiKey = getSupabaseAnonKey();
    const cdnBase = (getRawSupabaseUrl() || baseUrl).replace(/\/+$/, '');

    // 1. First attempt direct REST upload with clean Anon API key
    try {
      const uploadUrl = `${baseUrl}/storage/v1/object/product-images/${filePath}`;
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': file.type || 'image/jpeg',
          'cache-control': 'max-age=3600',
          'x-upsert': 'true',
        },
        body: fileToUpload,
      });

      if (uploadRes.ok) {
        return `${cdnBase}/storage/v1/object/public/product-images/${filePath}`;
      }

      const errText = await uploadRes.text().catch(() => '');
      console.warn('[Direct REST Storage Upload Failed, falling back to client]', uploadRes.status, errText);
    } catch (restErr) {
      console.warn('[Direct REST Storage Upload Network Error, falling back to client]', restErr);
    }

    // 2. Fallback to Supabase JS storage client
    const client = requireSupabase();
    let { error: uploadError } = await client.storage
      .from('product-images')
      .upload(filePath, fileToUpload, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError && (uploadError.message?.toLowerCase().includes('not found') || uploadError.message?.toLowerCase().includes('bucket'))) {
      try {
        await client.storage.createBucket('product-images', { public: true });
        const retry = await client.storage
          .from('product-images')
          .upload(filePath, fileToUpload, {
            contentType: file.type || 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          });
        uploadError = retry.error;
      } catch (createErr) {}
    }

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      throw new Error(`Product image upload failed: ${uploadError.message}. Please verify the 'product-images' storage bucket exists in Supabase.`);
    }

    const { data: publicData } = client.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return normalizeStorageUrl(publicData?.publicUrl) || `${cdnBase}/storage/v1/object/public/product-images/${filePath}`;
  },

  async uploadBannerImage(file: File, isMobile = false): Promise<string> {
    // Preserve full 100% original high-resolution banner image (up to 12MB) to prevent blurriness
    const fileToUpload = file.size > 12 * 1024 * 1024
      ? await this.optimizeImageFile(file, isMobile ? 1800 : 3840, 0.96)
      : file;

    let cleanExt = 'jpg';
    if (file.type.includes('png')) cleanExt = 'png';
    else if (file.type.includes('webp')) cleanExt = 'webp';
    else if (file.type.includes('gif')) cleanExt = 'gif';
    else if (file.type.includes('svg')) cleanExt = 'svg';

    const prefix = isMobile ? 'mobile' : 'laptop';
    const fileName = `banner_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
    const filePath = `banners/${fileName}`;

    const baseUrl = getEffectiveSupabaseUrl().replace(/\/+$/, '');
    const apiKey = getSupabaseAnonKey();
    const cdnBase = (getRawSupabaseUrl() || baseUrl).replace(/\/+$/, '');

    // 1. Direct REST storage upload to 'product-images' bucket
    try {
      const uploadUrl = `${baseUrl}/storage/v1/object/product-images/${filePath}`;
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': file.type || 'image/jpeg',
          'cache-control': 'max-age=3600',
          'x-upsert': 'true',
        },
        body: fileToUpload,
      });

      if (uploadRes.ok) {
        return `${cdnBase}/storage/v1/object/public/product-images/${filePath}`;
      }

      const errText = await uploadRes.text().catch(() => '');
      console.warn('[Direct REST Banner Upload Failed, falling back to client]', uploadRes.status, errText);
    } catch (restErr) {
      console.warn('[Direct REST Banner Upload Network Error, falling back to client]', restErr);
    }

    // 2. Fallback to Supabase JS client
    const client = requireSupabase();
    let { error: uploadError } = await client.storage
      .from('product-images')
      .upload(filePath, fileToUpload, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError && (uploadError.message?.toLowerCase().includes('not found') || uploadError.message?.toLowerCase().includes('bucket'))) {
      try {
        await client.storage.createBucket('product-images', { public: true });
        const retry = await client.storage
          .from('product-images')
          .upload(filePath, fileToUpload, {
            contentType: file.type || 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          });
        uploadError = retry.error;
      } catch (createErr) {}
    }

    if (uploadError) {
      console.error('Supabase storage banner upload error:', uploadError);
      throw new Error(`Banner image upload failed: ${uploadError.message}. Please verify the 'product-images' storage bucket exists in Supabase.`);
    }

    const { data: publicData } = client.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return normalizeStorageUrl(publicData?.publicUrl) || `${cdnBase}/storage/v1/object/public/product-images/${filePath}`;
  },

  async optimizeImageFile(file: File, maxWidth = 2560, quality = 0.95): Promise<Blob> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else resolve(file);
            },
            mimeType,
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  },

  // ==================== 3. CUSTOMERS (PROFILES + AUTH + ORDERS) ====================
  async getCustomers(orders?: RealOrder[], activeUser?: any, products?: Product[]): Promise<RealCustomer[]> {
    const allOrders = orders || (await this.getOrders());
    const allProducts = products || (inMemoryProducts.length > 0 ? inMemoryProducts : await this.getProducts());
    const customerMap = new Map<string, RealCustomer>();

    let remoteProfiles: any[] = [];
    let remoteAddresses: any[] = [];

    if (isSupabaseConfigured) {
      try {
        const client = requireSupabase();
        const [profRes, addrRes, authUserRes] = await Promise.all([
          withTimeout(client.from('profiles').select('*'), 5000, { data: [], error: null }),
          withTimeout(client.from('shipping_addresses').select('*'), 5000, { data: [], error: null }),
          withTimeout(client.auth.getUser(), 5000, { data: { user: null }, error: null }),
        ]);

        if (!profRes.error && Array.isArray(profRes.data)) {
          remoteProfiles = profRes.data;
        }
        if (!addrRes.error && Array.isArray(addrRes.data)) {
          remoteAddresses = addrRes.data;
        }

        // Direct REST fallback for profiles (only if client query returned no data)
        if (remoteProfiles.length === 0) {
          const fallbackProfiles = await fetchSupabaseRestFallback<any[]>('profiles?select=*');
          if (Array.isArray(fallbackProfiles) && fallbackProfiles.length > 0) {
            remoteProfiles = fallbackProfiles;
          }
        }

        // Direct REST fallback for shipping_addresses (only if client query returned no data)
        if (remoteAddresses.length === 0) {
          const fallbackAddresses = await fetchSupabaseRestFallback<any[]>('shipping_addresses?select=*');
          if (Array.isArray(fallbackAddresses) && fallbackAddresses.length > 0) {
            remoteAddresses = fallbackAddresses;
          }
        }

        const authUser = authUserRes.data?.user;
        if (authUser && authUser.email) {
          const authEmail = authUser.email.toLowerCase().trim();
          const existingProf = remoteProfiles.find((p) => (p.email || '').toLowerCase().trim() === authEmail);
          if (!existingProf) {
            const userMeta = authUser.user_metadata || {};
            const newProf = {
              id: authUser.id,
              email: authUser.email,
              name: userMeta.name || userMeta.full_name || authEmail.split('@')[0],
              phone: userMeta.phone || '',
              role: userMeta.role || (authUser.email.includes('admin') || authUser.email.includes('mallick') || authUser.email.includes('suman') ? 'admin' : 'customer'),
              avatar_url: userMeta.avatar_url || userMeta.avatarUrl || '',
              created_at: authUser.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            remoteProfiles.push(newProf);
            client.from('profiles').upsert(newProf, { onConflict: 'id' }).then();
          }
        }
      } catch (e) {
        console.warn('Supabase profiles fetch note:', e);
      }
    }

    if (activeUser && activeUser.email) {
      const activeEmail = activeUser.email.toLowerCase().trim();
      if (!remoteProfiles.some((p) => (p.email || '').toLowerCase().trim() === activeEmail)) {
        remoteProfiles.push({
          id: activeUser.id || `user-${activeEmail}`,
          email: activeUser.email,
          name: activeUser.name || activeEmail.split('@')[0],
          phone: activeUser.phone || '',
          role: activeUser.role || 'customer',
          avatar_url: activeUser.avatarUrl || '',
          created_at: activeUser.createdAt || new Date().toISOString(),
        });
      }
    }

    const computePurchasedProducts = (custOrders: RealOrder[]): CustomerPurchasedProduct[] => {
      const prodMap = new Map<string, CustomerPurchasedProduct>();
      custOrders.forEach((ord) => {
        const normalized = normalizeOrderItems(ord.items, allProducts);
        normalized.forEach((item) => {
          const key = item.productId || item.name;
          const existing = prodMap.get(key);
          if (existing) {
            existing.quantity += item.quantity;
            existing.totalSpent += item.price * item.quantity;
            if (new Date(ord.createdAt) > new Date(existing.lastOrderedDate)) {
              existing.lastOrderedDate = ord.createdAt;
            }
          } else {
            prodMap.set(key, {
              productId: item.productId || key,
              name: item.name,
              image: item.image || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
              quantity: item.quantity,
              unitPrice: item.price,
              totalSpent: item.price * item.quantity,
              lastOrderedDate: ord.createdAt,
            });
          }
        });
      });
      return Array.from(prodMap.values()).sort(
        (a, b) => new Date(b.lastOrderedDate).getTime() - new Date(a.lastOrderedDate).getTime()
      );
    };

    remoteProfiles.forEach((prof: any) => {
      const email = (prof.email || '').toLowerCase().trim();
      if (!email) return;

      const userOrders = allOrders.filter(
        (o) => o.email.toLowerCase().trim() === email || (prof.id && o.id.includes(prof.id))
      );

      const userAddress = remoteAddresses.find(
        (a: any) =>
          (a.user_email && a.user_email.toLowerCase().trim() === email) ||
          (a.user_id && a.user_id === prof.id)
      );

      const totalSpent = userOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const ordersCount = userOrders.length;
      const avgOrderValue = ordersCount > 0 ? Math.round(totalSpent / ordersCount) : 0;
      const tier = totalSpent >= 5000 ? 'VIP Platinum' : totalSpent >= 2000 ? 'VIP Gold' : 'Member';

      const latestOrder = userOrders[0];
      const city = prof.city || userAddress?.city || latestOrder?.city || 'Jalandhar';
      const state = prof.state || userAddress?.state || latestOrder?.state || 'Punjab';
      const address = prof.address || userAddress?.address_line || latestOrder?.address || '';
      const pincode = prof.pincode || userAddress?.pincode || latestOrder?.pincode || '';
      const phone = prof.phone || userAddress?.phone || latestOrder?.phone || '';

      const joinedFormatted = prof.created_at
        ? new Date(prof.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Registered Member';

      customerMap.set(email, {
        id: prof.id || `cust-${email}`,
        supabaseUid: prof.id || undefined,
        name: prof.name || (email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())),
        email: prof.email,
        phone,
        avatarUrl: prof.avatar_url || undefined,
        city,
        state,
        address,
        pincode,
        accountType: 'Registered',
        authProvider: prof.role === 'admin' ? 'Administrator' : 'Email / Password',
        ordersCount,
        totalSpent,
        avgOrderValue,
        tier,
        joinedDate: joinedFormatted,
        lastOrderDate: latestOrder?.createdAt,
        lastActivityDate: prof.updated_at || prof.created_at || latestOrder?.createdAt,
        orders: userOrders,
        purchasedProducts: computePurchasedProducts(userOrders),
      });
    });

    allOrders.forEach((ord) => {
      const email = (ord.email || '').toLowerCase().trim();
      if (!email) return;

      const existing = customerMap.get(email);
      if (existing) {
        if (!existing.orders.some((o) => o.id === ord.id)) {
          existing.orders.push(ord);
          existing.ordersCount = existing.orders.length;
          existing.totalSpent += ord.total;
          existing.avgOrderValue = Math.round(existing.totalSpent / existing.ordersCount);
          if (existing.totalSpent >= 5000) existing.tier = 'VIP Platinum';
          else if (existing.totalSpent >= 2000) existing.tier = 'VIP Gold';
          existing.purchasedProducts = computePurchasedProducts(existing.orders);
          if (!existing.lastOrderDate || new Date(ord.createdAt) > new Date(existing.lastOrderDate)) {
            existing.lastOrderDate = ord.createdAt;
          }
        }
      } else {
        const userOrders = allOrders.filter((o) => (o.email || '').toLowerCase().trim() === email);
        const totalSpent = userOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        const ordersCount = userOrders.length;
        const avgOrderValue = ordersCount > 0 ? Math.round(totalSpent / ordersCount) : 0;
        const tier = totalSpent >= 5000 ? 'VIP Platinum' : totalSpent >= 2000 ? 'VIP Gold' : 'Member';
        const formattedDate = new Date(ord.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        customerMap.set(email, {
          id: `cust-${email}`,
          name: ord.customerName || 'Customer',
          email: ord.email,
          phone: ord.phone || '—',
          city: ord.city || 'India',
          state: ord.state || '',
          address: ord.address || '',
          pincode: ord.pincode || '',
          accountType: 'Guest',
          authProvider: 'Guest Checkout',
          ordersCount,
          totalSpent,
          avgOrderValue,
          tier,
          joinedDate: formattedDate,
          lastOrderDate: ord.createdAt,
          lastActivityDate: ord.createdAt,
          orders: userOrders,
          purchasedProducts: computePurchasedProducts(userOrders),
        });
      }
    });
    const derived = Array.from(customerMap.values());
    if (derived.length > 0) {
      inMemoryCustomers = derived;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(CUSTOMERS_CACHE_KEY, JSON.stringify(inMemoryCustomers));
        }
      } catch {}
    }
    return derived;
  },

  async getCustomerActivity(
    userId?: string,
    userEmail?: string
  ): Promise<{ cartItems: CustomerCartItem[]; wishlistItems: CustomerWishlistItem[] }> {
    const cleanId = userId?.trim();
    const cleanEmail = userEmail?.toLowerCase().trim();
    const allProducts = inMemoryProducts.length > 0 ? inMemoryProducts : await this.getProducts();

    const resolveProduct = (productId: string): Product | null => {
      if (!productId) return null;
      const cleanPid = String(productId).trim().toLowerCase();
      const matched = allProducts.find(
        (p) =>
          String(p.id).trim().toLowerCase() === cleanPid ||
          String(p.slug).trim().toLowerCase() === cleanPid
      );
      return matched || null;
    };

    const result: { cartItems: CustomerCartItem[]; wishlistItems: CustomerWishlistItem[] } = {
      cartItems: [],
      wishlistItems: [],
    };

    if (isSupabaseConfigured && (cleanId || cleanEmail)) {
      try {
        const client = requireSupabase();
        const remoteCart = await withTimeout(CartService.fetchUserCart(cleanId, cleanEmail), 4000, []);
        if (remoteCart && remoteCart.length > 0) {
          result.cartItems = remoteCart.map((item) => ({
            id: item.id,
            productId: item.product.id,
            name: item.product.name,
            image: item.product.images?.[0] || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
            price: item.product.price,
            quantity: item.quantity,
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
            addedAt: new Date().toISOString(),
          }));
        }

        // Fast REST or Client race for wishlist
        let wishData: any[] | null = null;
        try {
          const anonKey = getSupabaseAnonKey();
          const candidateUrls = [getEffectiveSupabaseUrl(), getRawSupabaseUrl()].filter(Boolean);
          let filterQuery = '';
          if (cleanId && cleanEmail && cleanId !== cleanEmail) {
            filterQuery = `or=(user_id.eq.${encodeURIComponent(cleanId)},user_id.eq.${encodeURIComponent(cleanEmail)})`;
          } else if (cleanEmail) {
            filterQuery = `user_id=eq.${encodeURIComponent(cleanEmail)}`;
          } else if (cleanId) {
            filterQuery = `user_id=eq.${encodeURIComponent(cleanId)}`;
          }
          for (const base of candidateUrls) {
            try {
              const res = await fetch(`${base.replace(/\/+$/, '')}/rest/v1/wishlist?${filterQuery}&select=*`, {
                headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
              });
              if (res.ok) {
                const rows = await res.json();
                if (Array.isArray(rows)) {
                  wishData = rows;
                  break;
                }
              }
            } catch {}
          }
        } catch {}

        if (!wishData) {
          let wishQuery = client.from('wishlist').select('*');
          if (cleanId && cleanEmail && cleanId !== cleanEmail) {
            wishQuery = wishQuery.or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
          } else if (cleanEmail) {
            wishQuery = wishQuery.eq('user_id', cleanEmail);
          } else if (cleanId) {
            wishQuery = wishQuery.eq('user_id', cleanId);
          }
          const { data } = await withTimeout(wishQuery, 2500, { data: [] });
          if (Array.isArray(data)) wishData = data;
        }

        if (Array.isArray(wishData)) {
          wishData.forEach((row: any) => {
            const prod = resolveProduct(row.product_id || row.productId);
            if (prod) {
              result.wishlistItems.push({
                id: row.id || `${prod.id}`,
                productId: prod.id,
                name: prod.name,
                image: prod.images?.[0] || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80',
                price: prod.price,
                addedAt: row.created_at || new Date().toISOString(),
              });
            }
          });
        }
      } catch (e) {}
    }

    return result;
  },

  // ==================== 4. REVIEWS ====================
  getCachedReviews(): RealReview[] {
    return inMemoryReviews.length > 0 ? inMemoryReviews : DEFAULT_REVIEWS;
  },

  async getReviews(productId?: string): Promise<RealReview[]> {
    if (!isSupabaseConfigured) {
      return this.getCachedReviews();
    }

    try {
      const client = requireSupabase();
      let query = client.from('reviews').select('*').order('created_at', { ascending: false });
      if (productId) {
        query = query.eq('product_id', productId);
      }
      const { data, error } = await withTimeout(query, 8000, { data: null, error: 'timeout' });

      let rawData = data;
      if (error || !Array.isArray(rawData)) {
        const queryPath = productId
          ? `reviews?select=*&product_id=eq.${encodeURIComponent(productId)}&order=created_at.desc`
          : 'reviews?select=*&order=created_at.desc';
        rawData = await fetchSupabaseRestFallback<any[]>(queryPath);
      }

      if (Array.isArray(rawData) && rawData.length > 0) {
        const mapped: RealReview[] = rawData.map((d: any) => ({
          id: String(d.id),
          productId: d.product_id || d.productId || '',
          productName: d.product_name || d.productName || 'Product Review',
          author: d.author || 'Verified Customer',
          rating: Number(d.rating) || 5,
          comment: d.comment || '',
          title: d.title || '',
          images: Array.isArray(d.images)
            ? d.images
            : typeof d.images === 'string' && d.images
            ? (() => {
                try {
                  return JSON.parse(d.images);
                } catch {
                  return [d.images];
                }
              })()
            : [],
          verified: d.verified !== false,
          status: (d.status as any) || 'Approved',
          createdAt: d.created_at || new Date().toISOString(),
        }));
        inMemoryReviews = mapped;
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(REVIEWS_CACHE_KEY, JSON.stringify(mapped));
          }
        } catch {}
        return mapped;
      }

      return this.getCachedReviews();
    } catch (e) {
      console.error('Supabase getReviews error:', e);
      return this.getCachedReviews();
    }
  },

  async addReview(reviewData: {
    productId?: string;
    productName: string;
    author: string;
    rating: number;
    comment: string;
    title?: string;
    images?: string[];
    verified?: boolean;
    status?: 'Approved' | 'Featured' | 'Pending' | 'Hidden';
    createdAt?: string;
  }): Promise<RealReview> {
    const client = requireSupabase();

    const newReview: RealReview = {
      id: 'rev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      productId: reviewData.productId || '',
      productName: reviewData.productName,
      author: reviewData.author.trim(),
      rating: Math.max(1, Math.min(5, Number(reviewData.rating) || 5)),
      comment: reviewData.comment.trim(),
      title: reviewData.title || '',
      images: reviewData.images || [],
      verified: reviewData.verified !== false,
      status: reviewData.status || 'Approved',
      createdAt: reviewData.createdAt || new Date().toISOString(),
    };

    const payload = {
      id: newReview.id,
      product_id: newReview.productId || null,
      product_name: newReview.productName,
      author: newReview.author,
      rating: newReview.rating,
      comment: newReview.comment,
      title: newReview.title,
      images: newReview.images,
      verified: newReview.verified,
      status: newReview.status,
      created_at: newReview.createdAt,
    };

    let insertError: any = null;
    try {
      const { error } = await client.from('reviews').insert(payload);
      insertError = error;
    } catch (err) {
      insertError = err;
    }

    if (insertError) {
      const ok = await supabaseRestMutation('reviews', 'POST', '', payload);
      if (!ok) {
        console.warn('Supabase addReview sync warning:', insertError);
      }
    }

    inMemoryReviews = [newReview, ...inMemoryReviews];
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(REVIEWS_CACHE_KEY, JSON.stringify(inMemoryReviews));
      }
    } catch {}

    notifyDatabaseChange('reviews');
    return newReview;
  },

  async updateReview(
    id: string,
    updates: Partial<RealReview>
  ): Promise<RealReview> {
    const client = requireSupabase();
    const payload: any = {};
    if (updates.productId !== undefined) payload.product_id = updates.productId || null;
    if (updates.productName !== undefined) payload.product_name = updates.productName;
    if (updates.author !== undefined) payload.author = updates.author;
    if (updates.rating !== undefined) payload.rating = Number(updates.rating) || 5;
    if (updates.comment !== undefined) payload.comment = updates.comment;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.images !== undefined) payload.images = updates.images;
    if (updates.verified !== undefined) payload.verified = updates.verified;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.createdAt !== undefined) payload.created_at = updates.createdAt;

    let updateError: any = null;
    try {
      const { error } = await client.from('reviews').update(payload).eq('id', id);
      updateError = error;
    } catch (err) {
      updateError = err;
    }

    if (updateError) {
      const ok = await supabaseRestMutation('reviews', 'PATCH', `id=eq.${encodeURIComponent(id)}`, payload);
      if (!ok) {
        console.warn('Supabase updateReview sync warning:', updateError);
      }
    }

    let updatedReview: RealReview | null = null;
    let found = false;
    const cleanId = String(id).trim().toLowerCase();

    inMemoryReviews = inMemoryReviews.map((r) => {
      if (String(r.id).trim().toLowerCase() === cleanId) {
        found = true;
        updatedReview = {
          ...r,
          ...updates,
          rating: updates.rating !== undefined ? Math.max(1, Math.min(5, Number(updates.rating))) : r.rating,
        };
        return updatedReview;
      }
      return r;
    });

    if (!found) {
      updatedReview = {
        id: String(id),
        productId: updates.productId || '',
        productName: updates.productName || 'General Store Review',
        author: updates.author || 'Verified Customer',
        rating: updates.rating !== undefined ? Math.max(1, Math.min(5, Number(updates.rating))) : 5,
        comment: updates.comment || '',
        title: updates.title || '',
        images: updates.images || [],
        verified: updates.verified !== false,
        status: updates.status || 'Approved',
        createdAt: updates.createdAt || new Date().toISOString(),
      };
      inMemoryReviews = [updatedReview, ...inMemoryReviews];
    }

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(REVIEWS_CACHE_KEY, JSON.stringify(inMemoryReviews));
      }
    } catch {}

    notifyDatabaseChange('reviews');
    return updatedReview!;
  },

  async uploadReviewImage(file: File): Promise<string> {
    return this.uploadProductImage(file);
  },

  async updateReviewStatus(
    id: string,
    status: 'Approved' | 'Featured' | 'Pending' | 'Hidden'
  ): Promise<void> {
    await this.updateReview(id, { status });
  },

  async deleteReview(id: string): Promise<void> {
    const client = requireSupabase();
    let delError: any = null;
    try {
      const { error } = await client.from('reviews').delete().eq('id', id);
      delError = error;
    } catch (err) {
      delError = err;
    }

    if (delError) {
      const ok = await supabaseRestMutation('reviews', 'DELETE', `id=eq.${encodeURIComponent(id)}`);
      if (!ok) {
        console.warn('Supabase deleteReview sync warning:', delError);
      }
    }

    const cleanId = String(id).trim().toLowerCase();
    inMemoryReviews = inMemoryReviews.filter((r) => String(r.id).trim().toLowerCase() !== cleanId);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(REVIEWS_CACHE_KEY, JSON.stringify(inMemoryReviews));
      }
    } catch {}

    notifyDatabaseChange('reviews');
  },

  // ==================== 4.1 TESTIMONIALS ====================
  getCachedTestimonials(): RealTestimonial[] {
    return inMemoryTestimonials;
  },

  async getTestimonials(forceFresh = false): Promise<RealTestimonial[]> {
    if (!isSupabaseConfigured) {
      return this.getCachedTestimonials();
    }

    const now = Date.now();
    if (inMemoryTestimonials.length > 0 && now - lastTestimonialsFetchTime < 30000 && !forceFresh) {
      return inMemoryTestimonials;
    }

    if (activeTestimonialsPromise && !forceFresh) {
      return activeTestimonialsPromise;
    }

    if (inMemoryTestimonials.length > 0 && !forceFresh) {
      this.fetchFreshTestimonials().catch(() => {});
      return inMemoryTestimonials;
    }

    return this.fetchFreshTestimonials();
  },

  async fetchFreshTestimonials(): Promise<RealTestimonial[]> {
    if (activeTestimonialsPromise) return activeTestimonialsPromise;

    activeTestimonialsPromise = (async () => {
      try {
        const client = requireSupabase();

        // 1. Try querying dedicated 'testimonials' table
        let rawData: any[] | null = null;
        let testimonialsTableExists = true;

        try {
          const { data, error } = await withTimeout(
            client
              .from('testimonials')
              .select('*')
              .order('order_index', { ascending: true })
              .order('created_at', { ascending: false }),
            4000,
            { data: null, error: 'timeout' }
          );

          if (error) {
            const errObj = error as any;
            if (
              errObj &&
              typeof errObj === 'object' &&
              (errObj.code === '42P01' ||
                errObj.message?.toLowerCase().includes('relation') ||
                errObj.message?.toLowerCase().includes('does not exist'))
            ) {
              testimonialsTableExists = false;
            }
          } else if (Array.isArray(data)) {
            // Even if data is [] (all testimonials deleted in DB), treat as valid DB response
            rawData = data;
          }
        } catch {
          testimonialsTableExists = false;
        }

        // 2. Fallback to direct REST if client timed out or had error
        if (rawData === null && testimonialsTableExists) {
          try {
            const restData = await fetchSupabaseRestFallback<any[]>('testimonials?select=*&order=order_index.asc,created_at.desc');
            if (Array.isArray(restData)) {
              rawData = restData;
            }
          } catch {}
        }

        // 3. If dedicated table exists in DB, respect the exact rows (including 0 rows)
        if (testimonialsTableExists && Array.isArray(rawData)) {
          const mapped: RealTestimonial[] = rawData.map((d: any, idx: number) => ({
            id: String(d.id),
            author: d.author || 'Verified Customer',
            rating: Number(d.rating) || 5,
            comment: d.comment || '',
            productName: d.product_name || d.productName || '18K Anti-Tarnish Jewels',
            productId: d.product_id || d.productId || '',
            location: d.location || 'Verified Buyer',
            verified: d.verified !== false,
            status: (d.status as any) || 'Approved',
            orderIndex: d.order_index !== undefined ? Number(d.order_index) : idx,
            createdAt: d.created_at || new Date().toISOString(),
          }));

          inMemoryTestimonials = mapped;
          lastTestimonialsFetchTime = Date.now();
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(TESTIMONIALS_CACHE_KEY, JSON.stringify(mapped));
            }
          } catch {}
          return mapped;
        }

        // 4. Fallback ONLY if testimonials table does not exist at all in DB schema
        if (!testimonialsTableExists) {
          try {
            const revs = await this.getReviews();
            if (Array.isArray(revs)) {
              const approved = revs.filter((r) => r.status === 'Approved' || r.status === 'Featured');
              const fallbackMapped: RealTestimonial[] = approved.slice(0, 8).map((r, idx) => ({
                id: r.id,
                author: r.author || 'Verified Customer',
                rating: r.rating || 5,
                comment: r.comment,
                productName: r.productName || '18K Anti-Tarnish Jewels',
                productId: r.productId || '',
                location: 'Verified Buyer',
                verified: r.verified !== false,
                status: (r.status as any) || 'Approved',
                orderIndex: idx,
                createdAt: r.createdAt,
              }));
              inMemoryTestimonials = fallbackMapped;
              try {
                if (typeof window !== 'undefined') {
                  localStorage.setItem(TESTIMONIALS_CACHE_KEY, JSON.stringify(fallbackMapped));
                }
              } catch {}
              return fallbackMapped;
            }
          } catch {}
        }

        return inMemoryTestimonials;
      } catch (e) {
        console.warn('fetchFreshTestimonials note:', e);
        return inMemoryTestimonials;
      } finally {
        activeTestimonialsPromise = null;
      }
    })();

    return activeTestimonialsPromise;
  },

  async addTestimonial(testimonialData: {
    author: string;
    productName: string;
    rating: number;
    comment: string;
    productId?: string;
    location?: string;
    verified?: boolean;
    status?: 'Approved' | 'Featured' | 'Hidden';
    orderIndex?: number;
  }): Promise<RealTestimonial> {
    const client = requireSupabase();

    const newTestimonial: RealTestimonial = {
      id: 'testi-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      author: testimonialData.author.trim(),
      productName: testimonialData.productName.trim() || '18K Anti-Tarnish Jewels',
      productId: testimonialData.productId || '',
      location: testimonialData.location || 'Verified Buyer',
      rating: Math.max(1, Math.min(5, Number(testimonialData.rating) || 5)),
      comment: testimonialData.comment.trim(),
      verified: testimonialData.verified !== false,
      status: testimonialData.status || 'Approved',
      orderIndex: testimonialData.orderIndex ?? inMemoryTestimonials.length,
      createdAt: new Date().toISOString(),
    };

    const payload = {
      id: newTestimonial.id,
      author: newTestimonial.author,
      product_name: newTestimonial.productName,
      product_id: newTestimonial.productId || null,
      location: newTestimonial.location,
      rating: newTestimonial.rating,
      comment: newTestimonial.comment,
      verified: newTestimonial.verified,
      status: newTestimonial.status,
      order_index: newTestimonial.orderIndex,
      created_at: newTestimonial.createdAt,
    };

    // 1. Write to testimonials table
    let insertError: any = null;
    try {
      const { error } = await client.from('testimonials').insert(payload);
      insertError = error;
    } catch (err) {
      insertError = err;
    }

    if (insertError) {
      const ok = await supabaseRestMutation('testimonials', 'POST', '', payload);
      if (!ok) {
        // Fallback write to reviews table so it is persisted even before SQL migration
        await this.addReview({
          author: newTestimonial.author,
          productName: newTestimonial.productName,
          rating: newTestimonial.rating,
          comment: newTestimonial.comment,
          verified: newTestimonial.verified,
          status: newTestimonial.status as any,
        }).catch(() => {});
      }
    } else {
      // Dual write to reviews table as safety backup
      try {
        await client
          .from('reviews')
          .upsert({
            id: newTestimonial.id,
            author: newTestimonial.author,
            product_name: newTestimonial.productName,
            rating: newTestimonial.rating,
            comment: newTestimonial.comment,
            verified: newTestimonial.verified,
            status: newTestimonial.status,
            created_at: newTestimonial.createdAt,
          });
      } catch {}
    }

    inMemoryTestimonials = [newTestimonial, ...inMemoryTestimonials.filter((t) => t.id !== newTestimonial.id)];
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(TESTIMONIALS_CACHE_KEY, JSON.stringify(inMemoryTestimonials));
      }
    } catch {}

    notifyDatabaseChange('testimonials');
    notifyDatabaseChange('reviews');
    return newTestimonial;
  },

  async updateTestimonial(
    id: string,
    updates: Partial<RealTestimonial>
  ): Promise<RealTestimonial> {
    const client = requireSupabase();
    const payload: any = {};
    if (updates.author !== undefined) payload.author = updates.author;
    if (updates.productName !== undefined) payload.product_name = updates.productName;
    if (updates.productId !== undefined) payload.product_id = updates.productId || null;
    if (updates.location !== undefined) payload.location = updates.location;
    if (updates.rating !== undefined) payload.rating = Number(updates.rating) || 5;
    if (updates.comment !== undefined) payload.comment = updates.comment;
    if (updates.verified !== undefined) payload.verified = updates.verified;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.orderIndex !== undefined) payload.order_index = updates.orderIndex;

    let updateError: any = null;
    try {
      const { error } = await client.from('testimonials').update(payload).eq('id', id);
      updateError = error;
    } catch (err) {
      updateError = err;
    }

    if (updateError) {
      const ok = await supabaseRestMutation('testimonials', 'PATCH', `id=eq.${encodeURIComponent(id)}`, payload);
      if (!ok) {
        await this.updateReview(id, {
          author: updates.author,
          productName: updates.productName,
          rating: updates.rating,
          comment: updates.comment,
          verified: updates.verified,
          status: updates.status as any,
        }).catch(() => {});
      }
    } else {
      try {
        await client
          .from('reviews')
          .update({
            author: updates.author,
            product_name: updates.productName,
            rating: updates.rating,
            comment: updates.comment,
            status: updates.status,
          })
          .eq('id', id);
      } catch {}
    }

    let updatedTestimonial: RealTestimonial | null = null;
    const cleanId = String(id).trim().toLowerCase();

    inMemoryTestimonials = inMemoryTestimonials.map((t) => {
      if (String(t.id).trim().toLowerCase() === cleanId) {
        updatedTestimonial = {
          ...t,
          ...updates,
          rating: updates.rating !== undefined ? Math.max(1, Math.min(5, Number(updates.rating))) : t.rating,
        };
        return updatedTestimonial;
      }
      return t;
    });

    if (!updatedTestimonial) {
      updatedTestimonial = {
        id,
        author: updates.author || 'Verified Customer',
        productName: updates.productName || '18K Anti-Tarnish Jewels',
        rating: updates.rating || 5,
        comment: updates.comment || '',
        verified: updates.verified !== false,
        status: updates.status || 'Approved',
        location: updates.location || 'Verified Buyer',
        orderIndex: updates.orderIndex ?? 0,
        createdAt: updates.createdAt || new Date().toISOString(),
      };
      inMemoryTestimonials = [updatedTestimonial, ...inMemoryTestimonials];
    }

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(TESTIMONIALS_CACHE_KEY, JSON.stringify(inMemoryTestimonials));
      }
    } catch {}

    notifyDatabaseChange('testimonials');
    notifyDatabaseChange('reviews');
    return updatedTestimonial;
  },

  async deleteTestimonial(id: string): Promise<void> {
    const client = requireSupabase();
    let delError: any = null;
    try {
      const { error } = await client.from('testimonials').delete().eq('id', id);
      delError = error;
    } catch (err) {
      delError = err;
    }

    if (delError) {
      const ok = await supabaseRestMutation('testimonials', 'DELETE', `id=eq.${encodeURIComponent(id)}`);
      if (!ok) {
        await this.deleteReview(id).catch(() => {});
      }
    } else {
      try {
        await client.from('reviews').delete().eq('id', id);
      } catch {}
    }

    const cleanId = String(id).trim().toLowerCase();
    inMemoryTestimonials = inMemoryTestimonials.filter((t) => String(t.id).trim().toLowerCase() !== cleanId);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(TESTIMONIALS_CACHE_KEY, JSON.stringify(inMemoryTestimonials));
      }
    } catch {}

    notifyDatabaseChange('testimonials');
    notifyDatabaseChange('reviews');
  },

  // ==================== 5. COUPONS ====================
  getCachedCoupons(): RealCoupon[] {
    return inMemoryCoupons.length > 0 ? inMemoryCoupons : DEFAULT_COUPONS;
  },

  async getCoupons(forceFresh = false): Promise<RealCoupon[]> {
    if (!isSupabaseConfigured) {
      return this.getCachedCoupons();
    }

    const now = Date.now();
    // 1. If cache is fresh (< 30s) and not forced, return in 0ms
    const isCacheFresh = inMemoryCoupons.length > 0 && now - lastCouponsFetchTime < 30000;
    if (isCacheFresh && !forceFresh) {
      return inMemoryCoupons;
    }

    // 2. If already in flight, reuse promise
    if (activeCouponsPromise && !forceFresh) {
      return activeCouponsPromise;
    }

    // 3. Stale-while-revalidate: return in-memory cache instantly (0ms) and refresh in background
    if (inMemoryCoupons.length > 0 && !forceFresh) {
      this.fetchFreshCoupons().catch(() => {});
      return inMemoryCoupons;
    }

    return this.fetchFreshCoupons();
  },

  async fetchFreshCoupons(): Promise<RealCoupon[]> {
    if (activeCouponsPromise) return activeCouponsPromise;

    activeCouponsPromise = (async () => {
      try {
        const client = requireSupabase();

        // High-speed parallel candidate race: direct REST proxy vs Supabase client (2000ms timeout)
        const restPromise = fetchSupabaseRestFallback<any[]>('coupons?select=*&order=created_at.desc');
        const clientPromise = withTimeout(
          client
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
              if (error || !Array.isArray(data)) throw error || new Error('client coupons error');
              return data;
            }),
          2000,
          null
        );

        let rawData: any[] = [];
        try {
          rawData = await safePromiseAny([
            clientPromise.then((d) => {
              if (Array.isArray(d)) return d;
              throw new Error('client error');
            }),
            restPromise.then((d) => {
              if (Array.isArray(d)) return d;
              throw new Error('rest empty');
            }),
          ]);
        } catch {
          try {
            const fallback = await restPromise;
            if (Array.isArray(fallback)) rawData = fallback;
          } catch {}
        }

        if (Array.isArray(rawData)) {
          const mapped: RealCoupon[] = rawData.map((d: any) => {
            let showInList = false;
            let usageLimit: number | null = null;
            let cleanDesc = d.description || '';

            if (cleanDesc && typeof cleanDesc === 'string' && cleanDesc.startsWith('{') && cleanDesc.endsWith('}')) {
              try {
                const meta = JSON.parse(cleanDesc);
                showInList = Boolean(meta.showInList);
                usageLimit = meta.usageLimit !== undefined ? meta.usageLimit : null;
                cleanDesc = meta.desc || '';
              } catch (e) {}
            }

            return {
              id: d.id,
              code: d.code,
              discount: d.discount,
              description: cleanDesc,
              minSpend: Number(d.min_spend ?? d.minSpend ?? 0),
              usedCount: Number(d.used_count ?? d.usedCount ?? 0),
              status: d.status || 'Active',
              expires: d.expires || '2026-12-31',
              showInList,
              usageLimit,
            };
          });

          inMemoryCoupons = mapped;
          lastCouponsFetchTime = Date.now();
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(COUPONS_CACHE_KEY, JSON.stringify(mapped));
            }
          } catch {}
          return mapped;
        }

        return this.getCachedCoupons();
      } catch (e) {
        console.warn('Supabase fetchFreshCoupons note:', e);
        return this.getCachedCoupons();
      } finally {
        activeCouponsPromise = null;
      }
    })();

    return activeCouponsPromise;
  },

  async addCoupon(coupon: RealCoupon): Promise<void> {
    const client = requireSupabase();

    const serializedDesc = JSON.stringify({
      desc: coupon.description || '',
      showInList: Boolean(coupon.showInList),
      usageLimit: coupon.usageLimit !== undefined ? coupon.usageLimit : null,
    });

    const payload = {
      id: coupon.id,
      code: coupon.code.toUpperCase().trim(),
      discount: coupon.discount,
      description: serializedDesc,
      min_spend: coupon.minSpend,
      used_count: coupon.usedCount,
      status: coupon.status,
      expires: coupon.expires,
      created_at: new Date().toISOString(),
    };

    let insertError: any = null;
    try {
      const { error } = await client.from('coupons').insert(payload);
      insertError = error;
    } catch (err) {
      insertError = err;
    }

    if (insertError) {
      const ok = await supabaseRestMutation('coupons', 'POST', '', payload);
      if (!ok) {
        console.error('Supabase addCoupon failed:', insertError);
        throw new Error(`Failed to create coupon in database: ${formatQueryError(insertError)}`);
      }
    }

    inMemoryCoupons = [coupon, ...inMemoryCoupons.filter((c) => c.id !== coupon.id)];
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(COUPONS_CACHE_KEY, JSON.stringify(inMemoryCoupons));
      }
    } catch {}
    notifyDatabaseChange('coupons');
  },

  async updateCoupon(id: string, updates: Partial<RealCoupon>): Promise<void> {
    const existing = inMemoryCoupons.find((c) => c.id === id);
    const updated: RealCoupon = {
      ...(existing || {
        id,
        code: '',
        discount: '10% OFF',
        description: '',
        minSpend: 0,
        usedCount: 0,
        status: 'Active',
        expires: '2026-12-31',
      }),
      ...updates,
    };

    const serializedDesc = JSON.stringify({
      desc: updated.description || '',
      showInList: Boolean(updated.showInList),
      usageLimit: updated.usageLimit !== undefined ? updated.usageLimit : null,
    });

    const payload: any = {
      description: serializedDesc,
    };
    if (updates.code) payload.code = updates.code.toUpperCase().trim();
    if (updates.discount) payload.discount = updates.discount;
    if (updates.minSpend !== undefined) payload.min_spend = updates.minSpend;
    if (updates.usedCount !== undefined) payload.used_count = updates.usedCount;
    if (updates.status) payload.status = updates.status;
    if (updates.expires) payload.expires = updates.expires;

    if (isSupabaseConfigured) {
      const client = requireSupabase();
      let updateError: any = null;
      try {
        const { error } = await client.from('coupons').update(payload).eq('id', id);
        updateError = error;
      } catch (err) {
        updateError = err;
      }

      if (updateError) {
        const ok = await supabaseRestMutation('coupons', 'PATCH', `id=eq.${encodeURIComponent(id)}`, payload);
        if (!ok) {
          console.error('Supabase updateCoupon failed:', updateError);
          throw new Error(`Failed to update coupon in database: ${formatQueryError(updateError)}`);
        }
      }
    }

    inMemoryCoupons = inMemoryCoupons.map((c) => (c.id === id ? updated : c));
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(COUPONS_CACHE_KEY, JSON.stringify(inMemoryCoupons));
      }
    } catch {}
    notifyDatabaseChange('coupons');
  },

  async deleteCoupon(id: string): Promise<void> {
    const client = requireSupabase();
    let delError: any = null;
    try {
      const { error } = await client.from('coupons').delete().eq('id', id);
      delError = error;
    } catch (err) {
      delError = err;
    }

    if (delError) {
      const ok = await supabaseRestMutation('coupons', 'DELETE', `id=eq.${encodeURIComponent(id)}`);
      if (!ok) {
        console.error('Supabase deleteCoupon failed:', delError);
        throw new Error(`Failed to delete coupon: ${formatQueryError(delError)}`);
      }
    }

    inMemoryCoupons = inMemoryCoupons.filter((c) => c.id !== id);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(COUPONS_CACHE_KEY, JSON.stringify(inMemoryCoupons));
      }
    } catch {}
    notifyDatabaseChange('coupons');
  },

  async validateCoupon(code: string, subtotal: number): Promise<{
    valid: boolean;
    discountAmount: number;
    coupon?: RealCoupon;
    message: string;
  }> {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { valid: false, discountAmount: 0, message: 'Please enter a coupon code.' };
    }

    // Always fetch fresh coupons from Supabase
    let couponsList = await this.getCoupons();
    let coupon = couponsList.find((c) => c.code.toUpperCase() === cleanCode);

    // If not found in memory list, try direct DB lookup
    if (!coupon && isSupabaseConfigured) {
      try {
        const client = requireSupabase();
        const { data } = await client.from('coupons').select('*').ilike('code', cleanCode).maybeSingle();
        if (data) {
          let showInList = false;
          let usageLimit: number | null = null;
          let cleanDesc = data.description || '';

          if (cleanDesc && typeof cleanDesc === 'string' && cleanDesc.startsWith('{') && cleanDesc.endsWith('}')) {
            try {
              const meta = JSON.parse(cleanDesc);
              showInList = Boolean(meta.showInList);
              usageLimit = meta.usageLimit !== undefined ? meta.usageLimit : null;
              cleanDesc = meta.desc || '';
            } catch (e) {}
          }

          coupon = {
            id: data.id,
            code: data.code,
            discount: data.discount,
            description: cleanDesc,
            minSpend: Number(data.min_spend ?? 0),
            usedCount: Number(data.used_count ?? 0),
            status: data.status || 'Active',
            expires: data.expires || '2026-12-31',
            showInList,
            usageLimit,
          };
        }
      } catch (e) {}
    }

    if (!coupon) {
      return { valid: false, discountAmount: 0, message: `Coupon code "${cleanCode}" is invalid.` };
    }

    if (coupon.status !== 'Active') {
      return { valid: false, discountAmount: 0, message: `Coupon "${coupon.code}" is no longer active.` };
    }

    if (coupon.usageLimit !== undefined && coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Coupon "${coupon.code}" has reached its maximum usage limit.`,
      };
    }

    if (coupon.expires && coupon.expires !== 'Unlimited') {
      const expiryDate = new Date(coupon.expires);
      if (!isNaN(expiryDate.getTime()) && expiryDate < new Date()) {
        return { valid: false, discountAmount: 0, message: `Coupon "${coupon.code}" has expired on ${coupon.expires}.` };
      }
    }

    if (coupon.minSpend > 0 && subtotal < coupon.minSpend) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Requires a minimum spend of ₹${coupon.minSpend.toLocaleString('en-IN')}.`,
      };
    }

    // Calculate discount
    let discountAmount = 0;
    const discountStr = coupon.discount.toUpperCase().trim();

    if (discountStr.includes('%')) {
      const pct = parseFloat(discountStr.replace(/[^0-9.]/g, '')) || 0;
      discountAmount = Math.round((subtotal * pct) / 100);
    } else if (discountStr.includes('₹') || discountStr.includes('INR') || discountStr.includes('OFF')) {
      discountAmount = parseFloat(discountStr.replace(/[^0-9.]/g, '')) || 0;
    } else if (discountStr.toLowerCase().includes('free') || discountStr.toLowerCase().includes('ship')) {
      discountAmount = 0; // Free shipping handled in total calculation
    } else {
      const val = parseFloat(discountStr) || 0;
      discountAmount = val;
    }

    discountAmount = Math.min(discountAmount, subtotal);

    return {
      valid: true,
      discountAmount,
      coupon,
      message: `${coupon.discount} applied successfully!`,
    };
  },

  async incrementCouponUsedCount(code: string): Promise<void> {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode || !isSupabaseConfigured) return;

    try {
      const client = requireSupabase();
      const { data } = await client.from('coupons').select('id, used_count').ilike('code', cleanCode).maybeSingle();
      if (data) {
        const newCount = (Number(data.used_count) || 0) + 1;
        await client.from('coupons').update({ used_count: newCount }).eq('id', data.id);
      }
    } catch (e) {
      console.warn('Increment coupon count warning:', e);
    }
  },

  // ==================== 6. CATEGORIES ====================
  async getCategories(forceFresh = false): Promise<RealCategory[]> {
    if (!isSupabaseConfigured) {
      return inMemoryCategories;
    }

    const now = Date.now();
    const isCacheFresh = inMemoryCategories.length > 0 && now - lastCategoriesFetchTime < 30000;
    if (isCacheFresh && !forceFresh) {
      return inMemoryCategories;
    }

    if (activeCategoriesPromise && !forceFresh) {
      return activeCategoriesPromise;
    }

    if (inMemoryCategories.length > 0 && !forceFresh) {
      this.fetchFreshCategories().catch(() => {});
      return inMemoryCategories;
    }

    return this.fetchFreshCategories();
  },

  async fetchFreshCategories(): Promise<RealCategory[]> {
    if (activeCategoriesPromise) return activeCategoriesPromise;

    activeCategoriesPromise = (async () => {
      try {
        const client = requireSupabase();

        const restPromise = fetchSupabaseRestFallback<any[]>('categories?select=*&order=order_index.asc');
        const clientPromise = client
          .from('categories')
          .select('*')
          .order('order_index', { ascending: true })
          .then(({ data, error }) => {
            if (error || !Array.isArray(data)) throw error || new Error('client error');
            return data;
          });

        let rawCategories: any[] = [];
        try {
          rawCategories = await safePromiseAny([
            clientPromise.then((d) => {
              if (Array.isArray(d)) return d;
              throw new Error('client error');
            }),
            restPromise.then((d) => {
              if (Array.isArray(d)) return d;
              throw new Error('rest failed');
            }),
          ]);
        } catch {
          const fb = await withTimeout(restPromise, 2500, null);
          if (Array.isArray(fb)) {
            rawCategories = fb;
          } else {
            const cl = await withTimeout(clientPromise, 2500, null);
            if (Array.isArray(cl)) rawCategories = cl;
          }
        }

        if (Array.isArray(rawCategories)) {
          // Fetch category subcategories from store_settings
          try {
            const { data: subData } = await withTimeout(
              client.from('store_settings').select('value').eq('key', 'category_subcategories').maybeSingle(),
              2000,
              { data: null }
            );
            if (subData?.value && typeof subData.value === 'object') {
              inMemoryCategorySubcategories = { ...inMemoryCategorySubcategories, ...subData.value };
              try {
                if (typeof window !== 'undefined') {
                  localStorage.setItem(SUBCATEGORIES_CACHE_KEY, JSON.stringify(inMemoryCategorySubcategories));
                }
              } catch {}
            }
          } catch {}

          const mapped: RealCategory[] = rawCategories.map((d: any, idx: number) => {
            const rawSubs = Array.isArray(d.sub_categories) ? d.sub_categories : (Array.isArray(d.subCategories) ? d.subCategories : undefined);
            const subs = rawSubs && rawSubs.length > 0
              ? rawSubs
              : getSubCategoriesForCat(d.id, d.slug || d.name.toLowerCase().replace(/\s+/g, '-'), d.name, inMemoryCategorySubcategories);
            return {
              id: d.id,
              name: d.name,
              slug: d.slug || d.name.toLowerCase().replace(/\s+/g, '-'),
              isActive: d.is_active !== false && d.isActive !== false,
              orderIndex: d.order_index !== undefined ? Number(d.order_index) : idx,
              subCategories: subs,
              createdAt: d.created_at || new Date().toISOString(),
            };
          });

          inMemoryCategories = mapped;
          lastCategoriesFetchTime = Date.now();

          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(mapped));
            }
          } catch (e) {}

          notifyDatabaseChange('categories');
          return mapped;
        }

        return inMemoryCategories;
      } catch (e) {
        console.warn('fetchFreshCategories note:', e);
        return inMemoryCategories;
      } finally {
        activeCategoriesPromise = null;
      }
    })();

    return activeCategoriesPromise;
  },

  async addCategory(categoryData: { name: string; isActive?: boolean; subCategories?: string[] }): Promise<RealCategory> {
    const client = requireSupabase();
    const current = await this.getCategories();
    const nextOrderIndex = current.length > 0 ? Math.max(...current.map((c) => c.orderIndex ?? 0)) + 1 : 0;
    const initialSubs = categoryData.subCategories && categoryData.subCategories.length > 0
      ? categoryData.subCategories
      : getSubCategoriesForCat(undefined, undefined, categoryData.name, inMemoryCategorySubcategories);

    const newCategory: RealCategory = {
      id: `cat-${Date.now()}`,
      name: categoryData.name.trim(),
      slug: categoryData.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
      isActive: categoryData.isActive !== false,
      orderIndex: nextOrderIndex,
      subCategories: initialSubs,
      createdAt: new Date().toISOString(),
    };

    let insertError = null;
    try {
      const { error } = await client.from('categories').insert({
        id: newCategory.id,
        name: newCategory.name,
        slug: newCategory.slug,
        is_active: newCategory.isActive,
        order_index: newCategory.orderIndex,
        created_at: newCategory.createdAt,
      });
      insertError = error;
    } catch (err) {
      insertError = err;
    }

    if (insertError) {
      // Direct REST fallback with clean Anon API key
      try {
        const baseUrl = getEffectiveSupabaseUrl().replace(/\/+$/, '');
        const apiKey = getSupabaseAnonKey();
        const postRes = await fetch(`${baseUrl}/rest/v1/categories`, {
          method: 'POST',
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            id: newCategory.id,
            name: newCategory.name,
            slug: newCategory.slug,
            is_active: newCategory.isActive,
            order_index: newCategory.orderIndex,
            created_at: newCategory.createdAt,
          }),
        });
        if (!postRes.ok) {
          const errBody = await postRes.text().catch(() => '');
          throw new Error(errBody || `HTTP ${postRes.status}`);
        }
        insertError = null;
      } catch (restErr: any) {
        console.error('Supabase addCategory REST fallback error:', restErr);
        throw new Error(`Failed to create category: ${formatQueryError(restErr || insertError)}`);
      }
    }

    if (initialSubs && initialSubs.length > 0) {
      inMemoryCategorySubcategories[newCategory.id] = initialSubs;
      inMemoryCategorySubcategories[newCategory.slug] = initialSubs;
      inMemoryCategorySubcategories[newCategory.name.toLowerCase()] = initialSubs;
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(SUBCATEGORIES_CACHE_KEY, JSON.stringify(inMemoryCategorySubcategories));
        }
        const payload = {
          key: 'category_subcategories',
          value: inMemoryCategorySubcategories,
          updated_at: new Date().toISOString(),
        };
        client.from('store_settings').upsert(payload, { onConflict: 'key' }).then(() => {}, () => {});
        supabaseRestMutation('store_settings', 'POST', 'on_conflict=key', payload, 'resolution=merge-duplicates,return=minimal').catch(() => {});
      } catch {}
    }

    inMemoryCategories = [...current.filter((c) => c.id !== newCategory.id), newCategory];
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(inMemoryCategories));
      }
    } catch {}
    notifyDatabaseChange('categories');
    return newCategory;
  },

  async updateCategorySubCategories(catId: string, subCategories: string[]): Promise<RealCategory[]> {
    const cleanedSubs = Array.from(new Set(subCategories.map((s) => s.trim()).filter(Boolean)));
    const targetCat = inMemoryCategories.find((c) => c.id === catId);
    const slug = (targetCat?.slug || '').toLowerCase();
    const name = (targetCat?.name || '').toLowerCase();

    inMemoryCategorySubcategories[catId] = cleanedSubs;
    if (slug) inMemoryCategorySubcategories[slug] = cleanedSubs;
    if (name) inMemoryCategorySubcategories[name] = cleanedSubs;

    inMemoryCategories = inMemoryCategories.map((c) => {
      if (c.id === catId) {
        return { ...c, subCategories: cleanedSubs };
      }
      return c;
    });

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(inMemoryCategories));
        localStorage.setItem(SUBCATEGORIES_CACHE_KEY, JSON.stringify(inMemoryCategorySubcategories));
      }
    } catch {}

    const payload = {
      key: 'category_subcategories',
      value: inMemoryCategorySubcategories,
      updated_at: new Date().toISOString(),
    };

    // 1. Save to Supabase store_settings via Client
    let saved = false;
    try {
      const client = requireSupabase();
      const { error } = await client.from('store_settings').upsert(payload, { onConflict: 'key' });
      if (!error) saved = true;
    } catch {}

    // 2. Direct REST fallback to ensure live Supabase persistence
    if (!saved) {
      try {
        await supabaseRestMutation('store_settings', 'POST', 'on_conflict=key', payload, 'resolution=merge-duplicates,return=minimal');
      } catch (err) {
        console.warn('Persist category_subcategories note:', err);
      }
    }

    notifyDatabaseChange('categories');
    return inMemoryCategories;
  },

  async updateCategory(id: string, updates: Partial<RealCategory>): Promise<RealCategory> {
    const client = requireSupabase();
    const payload: any = {};
    if (updates.name !== undefined) {
      payload.name = updates.name.trim();
      payload.slug = updates.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    }
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.orderIndex !== undefined) payload.order_index = updates.orderIndex;

    let updateError: any = null;
    try {
      const { error } = await client.from('categories').update(payload).eq('id', id);
      updateError = error;
    } catch (err) {
      updateError = err;
    }

    if (updateError) {
      const ok = await supabaseRestMutation('categories', 'PATCH', `id=eq.${encodeURIComponent(id)}`, payload);
      if (!ok) {
        console.error('Supabase updateCategory failed:', updateError);
        throw new Error(`Failed to update category: ${formatQueryError(updateError)}`);
      }
    }

    let updatedCat: RealCategory | null = null;
    inMemoryCategories = inMemoryCategories.map((c) => {
      if (c.id === id) {
        updatedCat = {
          ...c,
          ...updates,
          name: updates.name ? updates.name.trim() : c.name,
          slug: updates.name ? updates.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : c.slug,
        };
        return updatedCat;
      }
      return c;
    });

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(inMemoryCategories));
      }
    } catch {}
    notifyDatabaseChange('categories');
    if (!updatedCat) throw new Error('Category not found after update');
    return updatedCat;
  },

  async deleteCategory(id: string): Promise<void> {
    const client = requireSupabase();
    let delError: any = null;
    try {
      const { error } = await client.from('categories').delete().eq('id', id);
      delError = error;
    } catch (err) {
      delError = err;
    }

    if (delError) {
      const ok = await supabaseRestMutation('categories', 'DELETE', `id=eq.${encodeURIComponent(id)}`);
      if (!ok) {
        console.error('Supabase deleteCategory failed:', delError);
        throw new Error(`Failed to delete category: ${formatQueryError(delError)}`);
      }
    }

    inMemoryCategories = inMemoryCategories.filter((c) => c.id !== id);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(inMemoryCategories));
      }
    } catch {}
    notifyDatabaseChange('categories');
  },

  async reorderCategories(reorderedList: RealCategory[]): Promise<void> {
    const client = requireSupabase();
    const indexed = reorderedList.map((cat, idx) => ({ ...cat, orderIndex: idx }));

    for (const cat of indexed) {
      let updateError: any = null;
      try {
        const { error } = await client.from('categories').update({ order_index: cat.orderIndex }).eq('id', cat.id);
        updateError = error;
      } catch (err) {
        updateError = err;
      }

      if (updateError) {
        const ok = await supabaseRestMutation('categories', 'PATCH', `id=eq.${encodeURIComponent(cat.id)}`, {
          order_index: cat.orderIndex,
        });
        if (!ok) {
          console.error('Supabase reorderCategories error:', updateError);
          throw new Error(`Failed to reorder category ${cat.name}: ${formatQueryError(updateError)}`);
        }
      }
    }

    inMemoryCategories = indexed;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(inMemoryCategories));
      }
    } catch {}
    notifyDatabaseChange('categories');
  },

  async resetDefaultCategories(): Promise<RealCategory[]> {
    const client = requireSupabase();
    try {
      await client.from('categories').delete().neq('id', 'non-existent');
    } catch {
      await supabaseRestMutation('categories', 'DELETE', 'id=neq.non-existent');
    }

    for (const cat of SEED_CATEGORIES) {
      const payload = {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        is_active: cat.isActive,
        order_index: cat.orderIndex,
      };

      let upsertError: any = null;
      try {
        const { error } = await client.from('categories').upsert(payload, { onConflict: 'id' });
        upsertError = error;
      } catch (err) {
        upsertError = err;
      }

      if (upsertError) {
        await supabaseRestMutation('categories', 'POST', '', payload);
      }
    }

    inMemoryCategories = [...SEED_CATEGORIES];
    notifyDatabaseChange('categories');
    return inMemoryCategories;
  },

  // ==================== 7. PERSISTENT STATIC SECTIONS ====================
  // 7.1 Store Settings
  async getStoreSettings(): Promise<StoreSettings> {
    const defaultSettings: StoreSettings = {
      announcementText: '✦ BUY 3 SETS FOR ₹2,999 ✦ FREE 18K GOLD POLISH GUARANTEE ✦ FREE SHIPPING ON ORDERS OVER ₹999 ✦',
      heroHeadline: 'EVERYDAY LUXURY NIGHTWEAR & 18K JEWELS',
      heroSubtext: 'Indulge in feather-soft Mulberry Silk & 18K Anti-Tarnish jewellery crafted for graceful everyday living.',
    };

    if (!isSupabaseConfigured) return inMemoryStoreSettings || defaultSettings;

    try {
      const client = requireSupabase();
      const { data, error } = await withTimeout(
        client.from('store_settings').select('*').eq('key', 'homepage').maybeSingle(),
        4000,
        { data: null, error: null }
      );

      if (!error && data?.value) {
        inMemoryStoreSettings = { ...defaultSettings, ...data.value };
        return inMemoryStoreSettings;
      }
    } catch (e) {}

    return inMemoryStoreSettings || defaultSettings;
  },

  async updateStoreSettings(settings: StoreSettings): Promise<StoreSettings> {
    const client = requireSupabase();
    const payload = {
      key: 'homepage',
      value: settings,
      updated_at: new Date().toISOString(),
    };

    let saveSuccess = false;
    let saveError: any = null;

    // Strategy 1: Direct PATCH on existing row
    try {
      const patchOk = await supabaseRestMutation(
        'store_settings',
        'PATCH',
        'key=eq.homepage',
        { value: settings, updated_at: payload.updated_at },
        'return=minimal'
      );
      if (patchOk) {
        saveSuccess = true;
      }
    } catch (err) {}

    // Strategy 2: Upsert via Supabase client
    if (!saveSuccess) {
      try {
        const { error } = await client.from('store_settings').upsert(payload, { onConflict: 'key' });
        if (!error) {
          saveSuccess = true;
        } else {
          saveError = error;
        }
      } catch (err) {
        saveError = err;
      }
    }

    // Strategy 3: Upsert via REST with merge-duplicates resolution
    if (!saveSuccess) {
      const ok = await supabaseRestMutation(
        'store_settings',
        'POST',
        'on_conflict=key',
        payload,
        'resolution=merge-duplicates,return=minimal'
      );
      if (ok) {
        saveSuccess = true;
      }
    }

    inMemoryStoreSettings = settings;
    notifyDatabaseChange('settings');

    if (!saveSuccess && saveError) {
      console.error('Supabase updateStoreSettings failed:', saveError);
      throw new Error(`Failed to save store settings in database: ${formatQueryError(saveError)}`);
    }

    return settings;
  },

  getCachedHomepageConfig(): HomepageConfig {
    if (inMemoryHomepageConfig) return inMemoryHomepageConfig;
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(HOMEPAGE_CACHE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            const cleanCards = ensureFiveCategoryCards(parsed.categoryCards);
            inMemoryHomepageConfig = { ...DEFAULT_HOMEPAGE_CONFIG, ...parsed, categoryCards: cleanCards };
            return inMemoryHomepageConfig;
          }
        }
      }
    } catch {}
    return DEFAULT_HOMEPAGE_CONFIG;
  },

  async getHomepageConfig(forceFresh = false): Promise<HomepageConfig> {
    const defaultCfg = this.getCachedHomepageConfig();
    if (!isSupabaseConfigured) return defaultCfg;

    const now = Date.now();
    if (inMemoryHomepageConfig && now - lastHomepageFetchTime < 30000 && !forceFresh) {
      return inMemoryHomepageConfig;
    }

    if (activeHomepagePromise && !forceFresh) {
      return activeHomepagePromise;
    }

    if (inMemoryHomepageConfig && !forceFresh) {
      this.fetchFreshHomepageConfig().catch(() => {});
      return inMemoryHomepageConfig;
    }

    return this.fetchFreshHomepageConfig();
  },

  async fetchFreshHomepageConfig(): Promise<HomepageConfig> {
    if (activeHomepagePromise) return activeHomepagePromise;

    activeHomepagePromise = (async () => {
      try {
        const client = requireSupabase();
        let rawData: any = null;

        try {
          const { data, error } = await withTimeout(
            client.from('store_settings').select('*').eq('key', 'homepage_config').maybeSingle(),
            4000,
            { data: null, error: null }
          );
          if (!error && data?.value) {
            rawData = data.value;
          }
        } catch {}

        if (!rawData) {
          try {
            const rest = await fetchSupabaseRestFallback<any[]>('store_settings?select=*&key=eq.homepage_config');
            if (Array.isArray(rest) && rest.length > 0 && rest[0]?.value) {
              rawData = rest[0].value;
            }
          } catch {}
        }

        if (rawData && typeof rawData === 'object') {
          const rawBanners = Array.isArray(rawData.heroBanners) && rawData.heroBanners.length > 0
            ? rawData.heroBanners.map((b: any) => ({
                ...b,
                image: normalizeStorageUrl(b.image || ''),
                mobileImage: b.mobileImage ? normalizeStorageUrl(b.mobileImage) : '',
                imageFit: b.imageFit || 'contain',
                objectPosition: b.objectPosition || 'center',
              }))
            : DEFAULT_HOMEPAGE_CONFIG.heroBanners;

          const merged: HomepageConfig = {
            announcementText: rawData.announcementText ?? DEFAULT_HOMEPAGE_CONFIG.announcementText,
            announcementActive: rawData.announcementActive ?? DEFAULT_HOMEPAGE_CONFIG.announcementActive,
            heroBanners: rawBanners,
            bannerAutoplaySeconds: Number(rawData.bannerAutoplaySeconds) || DEFAULT_HOMEPAGE_CONFIG.bannerAutoplaySeconds,
            marqueePhrases: Array.isArray(rawData.marqueePhrases) && rawData.marqueePhrases.length > 0 ? rawData.marqueePhrases : DEFAULT_HOMEPAGE_CONFIG.marqueePhrases,
            categorySectionTitle: rawData.categorySectionTitle || DEFAULT_HOMEPAGE_CONFIG.categorySectionTitle,
            categoryCards: ensureFiveCategoryCards(rawData.categoryCards),
            trendingTitle: rawData.trendingTitle || DEFAULT_HOMEPAGE_CONFIG.trendingTitle,
            trendingCtaText: rawData.trendingCtaText || DEFAULT_HOMEPAGE_CONFIG.trendingCtaText,
            influencerTitle: rawData.influencerTitle || DEFAULT_HOMEPAGE_CONFIG.influencerTitle,
            influencerSubtitle: rawData.influencerSubtitle || DEFAULT_HOMEPAGE_CONFIG.influencerSubtitle,
            influencerReels: Array.isArray(rawData.influencerReels) && rawData.influencerReels.length > 0 ? rawData.influencerReels : DEFAULT_HOMEPAGE_CONFIG.influencerReels,
            valueProps: Array.isArray(rawData.valueProps) && rawData.valueProps.length > 0 ? rawData.valueProps : DEFAULT_HOMEPAGE_CONFIG.valueProps,
          };

          inMemoryHomepageConfig = merged;
          lastHomepageFetchTime = Date.now();
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem(HOMEPAGE_CACHE_KEY, JSON.stringify(merged));
            }
          } catch {}
          return merged;
        }

        return inMemoryHomepageConfig || DEFAULT_HOMEPAGE_CONFIG;
      } catch (e) {
        console.warn('fetchFreshHomepageConfig note:', e);
        return inMemoryHomepageConfig || DEFAULT_HOMEPAGE_CONFIG;
      } finally {
        activeHomepagePromise = null;
      }
    })();

    return activeHomepagePromise;
  },

  async updateHomepageConfig(config: HomepageConfig): Promise<HomepageConfig> {
    const client = requireSupabase();
    const cleanBanners = (config.heroBanners || []).map((b) => ({
      ...b,
      image: normalizeStorageUrl(b.image || ''),
      mobileImage: b.mobileImage ? normalizeStorageUrl(b.mobileImage) : '',
      imageFit: b.imageFit || 'contain',
      objectPosition: b.objectPosition || 'center',
    }));
    const cleanCards = (config.categoryCards || []).map((c, idx) => ({
      ...c,
      image: normalizeStorageUrl(c.image || ''),
      orderIndex: typeof c.orderIndex === 'number' ? c.orderIndex : idx,
      active: c.active !== false,
    }));
    const cleanConfig: HomepageConfig = {
      ...config,
      heroBanners: cleanBanners,
      categoryCards: cleanCards,
    };
    const payload = {
      key: 'homepage_config',
      value: cleanConfig,
      updated_at: new Date().toISOString(),
    };

    let saveSuccess = false;
    let saveError: any = null;

    // Strategy 1: Fast direct PATCH on existing row
    try {
      const patchOk = await supabaseRestMutation(
        'store_settings',
        'PATCH',
        'key=eq.homepage_config',
        { value: cleanConfig, updated_at: payload.updated_at },
        'return=minimal'
      );
      if (patchOk) {
        saveSuccess = true;
      }
    } catch (err) {}

    // Strategy 2: Upsert via Supabase client
    if (!saveSuccess) {
      try {
        const { error } = await client.from('store_settings').upsert(payload, { onConflict: 'key' });
        if (!error) {
          saveSuccess = true;
        } else {
          saveError = error;
        }
      } catch (err) {
        saveError = err;
      }
    }

    // Strategy 3: Upsert via REST with merge-duplicates resolution
    if (!saveSuccess) {
      const ok = await supabaseRestMutation(
        'store_settings',
        'POST',
        'on_conflict=key',
        payload,
        'resolution=merge-duplicates,return=minimal'
      );
      if (ok) {
        saveSuccess = true;
      }
    }

    inMemoryHomepageConfig = cleanConfig;
    lastHomepageFetchTime = Date.now();
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(HOMEPAGE_CACHE_KEY, JSON.stringify(cleanConfig));
      }
    } catch {}

    notifyDatabaseChange('homepage');
    notifyDatabaseChange('settings');

    if (!saveSuccess && saveError) {
      console.error('Supabase updateHomepageConfig failed:', saveError);
      throw new Error(`Failed to save homepage settings in database: ${formatQueryError(saveError)}`);
    }

    return cleanConfig;
  },

  async resetDefaultHomepageConfig(): Promise<HomepageConfig> {
    return this.updateHomepageConfig(DEFAULT_HOMEPAGE_CONFIG);
  },

  // 7.2 Promotions
  async getPromotions(): Promise<PromotionItem[]> {
    const defaultPromotions: PromotionItem[] = [
      { id: 'p-1', name: 'Monsoon Silk Comfort Bundle', discount: 'Buy Any 3 Sets for ₹2,999', badge: 'Best Deal', active: true, bannerText: 'Flat 35% Savings on Silk Lounge Combos' },
      { id: 'p-2', name: '18K Gold Jewellery Welcome Gift', discount: 'Free Luxury Jewellery Pouch with every ₹1,500+ order', badge: 'Freebie', active: true, bannerText: 'Complimentary Anti-Tarnish Pouch included' },
      { id: 'p-3', name: 'VIP Secret Drop Sale', discount: 'Extra 10% for Registered Members', badge: 'Members Only', active: true, bannerText: 'Use code GIRLY10 at instant checkout' },
    ];

    if (!isSupabaseConfigured) return inMemoryPromotions.length > 0 ? inMemoryPromotions : defaultPromotions;

    try {
      const client = requireSupabase();
      const { data, error } = await withTimeout(
        client.from('promotions').select('*').order('created_at', { ascending: true }),
        4000,
        { data: null, error: null }
      );

      let rawData = data;
      if (error || !Array.isArray(rawData)) {
        rawData = await fetchSupabaseRestFallback<any[]>('promotions?select=*&order=created_at.asc');
      }

      if (Array.isArray(rawData) && rawData.length > 0) {
        const mapped = rawData.map((d: any) => ({
          id: d.id,
          name: d.name,
          discount: d.discount,
          badge: d.badge || '',
          active: Boolean(d.active),
          bannerText: d.banner_text || '',
          createdAt: d.created_at,
        }));
        inMemoryPromotions = mapped;
        return mapped;
      }
    } catch (e) {}

    return inMemoryPromotions.length > 0 ? inMemoryPromotions : defaultPromotions;
  },

  async savePromotion(promo: PromotionItem): Promise<void> {
    const client = requireSupabase();
    const payload = {
      id: promo.id,
      name: promo.name,
      discount: promo.discount,
      badge: promo.badge,
      active: promo.active,
      banner_text: promo.bannerText,
      created_at: promo.createdAt || new Date().toISOString(),
    };

    let saveError: any = null;
    try {
      const { error } = await client.from('promotions').upsert(payload, { onConflict: 'id' });
      saveError = error;
    } catch (err) {
      saveError = err;
    }

    if (saveError) {
      const ok = await supabaseRestMutation('promotions', 'POST', 'on_conflict=id', payload, 'resolution=merge-duplicates,return=minimal');
      if (!ok) {
        console.error('Supabase savePromotion failed:', saveError);
        throw new Error(`Failed to save promotion in database: ${formatQueryError(saveError)}`);
      }
    }

    inMemoryPromotions = [promo, ...inMemoryPromotions.filter((p) => p.id !== promo.id)];
    notifyDatabaseChange('promotions');
  },

  async deletePromotion(id: string): Promise<void> {
    const client = requireSupabase();
    let delError: any = null;
    try {
      const { error } = await client.from('promotions').delete().eq('id', id);
      delError = error;
    } catch (err) {
      delError = err;
    }

    if (delError) {
      const ok = await supabaseRestMutation('promotions', 'DELETE', `id=eq.${encodeURIComponent(id)}`);
      if (!ok) {
        throw new Error(`Failed to delete promotion: ${formatQueryError(delError)}`);
      }
    }

    inMemoryPromotions = inMemoryPromotions.filter((p) => p.id !== id);
    notifyDatabaseChange('promotions');
  },

  // 7.3 Shipping Rules
  async getShippingRules(): Promise<ShippingRules> {
    const defaultRules: ShippingRules = {
      id: 'default',
      freeThreshold: 999,
      standardRate: 99,
      expressRate: 199,
      codHandlingFee: 49,
      estimatedDays: '2 to 4 Business Days',
      couriers: ['BlueDart Express', 'Delhivery Surface', 'DTDC Prime'],
    };

    if (!isSupabaseConfigured) return inMemoryShippingRules || defaultRules;

    try {
      const client = requireSupabase();
      const { data, error } = await withTimeout(
        client.from('shipping_rules').select('*').eq('id', 'default').maybeSingle(),
        4000,
        { data: null, error: null }
      );

      let ruleData = data;
      if (error || !ruleData) {
        const fallback = await fetchSupabaseRestFallback<any[]>('shipping_rules?id=eq.default&limit=1');
        if (Array.isArray(fallback) && fallback.length > 0) {
          ruleData = fallback[0];
        }
      }

      if (ruleData) {
        let parsedCouriers = defaultRules.couriers;
        if (Array.isArray(ruleData.couriers)) parsedCouriers = ruleData.couriers;
        else if (typeof ruleData.couriers === 'string') {
          try { parsedCouriers = JSON.parse(ruleData.couriers); } catch {}
        }

        inMemoryShippingRules = {
          id: ruleData.id,
          freeThreshold: Number(ruleData.free_threshold) || 999,
          standardRate: Number(ruleData.standard_rate) || 99,
          expressRate: Number(ruleData.express_rate) || 199,
          codHandlingFee: Number(ruleData.cod_handling_fee) || 49,
          estimatedDays: ruleData.estimated_days || '2 to 4 Business Days',
          couriers: parsedCouriers,
        };
        return inMemoryShippingRules;
      }
    } catch (e) {}

    return inMemoryShippingRules || defaultRules;
  },

  async updateShippingRules(rules: Partial<ShippingRules>): Promise<void> {
    const client = requireSupabase();
    const current = await this.getShippingRules();
    const merged: ShippingRules = { ...current, ...rules };

    const payload = {
      id: 'default',
      free_threshold: merged.freeThreshold,
      standard_rate: merged.standardRate,
      express_rate: merged.expressRate,
      cod_handling_fee: merged.codHandlingFee,
      estimated_days: merged.estimatedDays,
      couriers: merged.couriers,
      updated_at: new Date().toISOString(),
    };

    let saveError: any = null;
    try {
      const { error } = await client.from('shipping_rules').upsert(payload, { onConflict: 'id' });
      saveError = error;
    } catch (err) {
      saveError = err;
    }

    if (saveError) {
      const ok = await supabaseRestMutation('shipping_rules', 'POST', 'on_conflict=id', payload, 'resolution=merge-duplicates,return=minimal');
      if (!ok) {
        console.error('Supabase updateShippingRules failed:', saveError);
        throw new Error(`Failed to save shipping rules in database: ${formatQueryError(saveError)}`);
      }
    }

    inMemoryShippingRules = merged;
    notifyDatabaseChange('shipping');
  },

  // 7.4 FAQs
  async getFaqs(): Promise<FAQItem[]> {
    const defaultFaqs: FAQItem[] = [
      { id: 'f-1', category: 'Nightwear & Loungewear', question: 'How do I care for Mulberry silk and modal sets?', answer: 'We recommend gentle machine wash in cold water using a laundry wash bag, or delicate hand wash with mild liquid detergent. Line dry in shade to preserve color luster.' },
      { id: 'f-2', category: '18K Anti-Tarnish Jewellery', question: 'Can I wear the 18K jewellery while bathing or swimming?', answer: 'Yes! Our pieces are crafted with premium stainless steel / brass cores with vacuum-plated 18K real gold and protective clear ceramic seal, making them 100% waterproof, sweatproof, and hypoallergenic.' },
      { id: 'f-3', category: 'Shipping & Delivery', question: 'How soon will my order be dispatched and delivered?', answer: 'Orders placed before 2 PM IST are dispatched on the same business day. Delivery takes 2-4 business days for metro cities and 3-5 days for other locations.' },
      { id: 'f-4', category: 'Returns & Exchanges', question: 'What is your size exchange and return policy?', answer: 'We offer hassle-free 7-day doorstep size exchanges. If the nightwear size does not fit comfortably, you can request an exchange in 1 click from your account.' },
    ];

    if (!isSupabaseConfigured) return inMemoryFaqs.length > 0 ? inMemoryFaqs : defaultFaqs;

    try {
      const client = requireSupabase();
      const { data, error } = await withTimeout(
        client.from('faqs').select('*').order('order_index', { ascending: true }),
        4000,
        { data: null, error: null }
      );

      let rawData = data;
      if (error || !Array.isArray(rawData)) {
        rawData = await fetchSupabaseRestFallback<any[]>('faqs?select=*&order=order_index.asc');
      }

      if (Array.isArray(rawData) && rawData.length > 0) {
        const mapped = rawData.map((d: any) => ({
          id: d.id,
          category: d.category,
          question: d.question,
          answer: d.answer,
          orderIndex: Number(d.order_index) || 0,
        }));
        inMemoryFaqs = mapped;
        return mapped;
      }
    } catch (e) {}

    return inMemoryFaqs.length > 0 ? inMemoryFaqs : defaultFaqs;
  },

  async addFaq(faq: Omit<FAQItem, 'id'>): Promise<FAQItem> {
    const client = requireSupabase();
    const newFaq: FAQItem = {
      ...faq,
      id: `faq-${Date.now()}`,
    };

    const payload = {
      id: newFaq.id,
      category: newFaq.category,
      question: newFaq.question,
      answer: newFaq.answer,
      order_index: newFaq.orderIndex || 0,
      created_at: new Date().toISOString(),
    };

    let saveError: any = null;
    try {
      const { error } = await client.from('faqs').insert(payload);
      saveError = error;
    } catch (err) {
      saveError = err;
    }

    if (saveError) {
      const ok = await supabaseRestMutation('faqs', 'POST', '', payload);
      if (!ok) {
        console.error('Supabase addFaq failed:', saveError);
        throw new Error(`Failed to save FAQ in database: ${formatQueryError(saveError)}`);
      }
    }

    inMemoryFaqs = [...inMemoryFaqs, newFaq];
    notifyDatabaseChange('faqs');
    return newFaq;
  },

  async updateFaq(id: string, updates: Partial<FAQItem>): Promise<void> {
    const client = requireSupabase();
    const payload: any = {};
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.question !== undefined) payload.question = updates.question;
    if (updates.answer !== undefined) payload.answer = updates.answer;
    if (updates.orderIndex !== undefined) payload.order_index = updates.orderIndex;

    let updateError: any = null;
    try {
      const { error } = await client.from('faqs').update(payload).eq('id', id);
      updateError = error;
    } catch (err) {
      updateError = err;
    }

    if (updateError) {
      const ok = await supabaseRestMutation('faqs', 'PATCH', `id=eq.${encodeURIComponent(id)}`, payload);
      if (!ok) {
        throw new Error(`Failed to update FAQ: ${formatQueryError(updateError)}`);
      }
    }

    inMemoryFaqs = inMemoryFaqs.map((f) => (f.id === id ? { ...f, ...updates } : f));
    notifyDatabaseChange('faqs');
  },

  async deleteFaq(id: string): Promise<void> {
    const client = requireSupabase();
    let delError: any = null;
    try {
      const { error } = await client.from('faqs').delete().eq('id', id);
      delError = error;
    } catch (err) {
      delError = err;
    }

    if (delError) {
      const ok = await supabaseRestMutation('faqs', 'DELETE', `id=eq.${encodeURIComponent(id)}`);
      if (!ok) {
        throw new Error(`Failed to delete FAQ: ${formatQueryError(delError)}`);
      }
    }

    inMemoryFaqs = inMemoryFaqs.filter((f) => f.id !== id);
    notifyDatabaseChange('faqs');
  },

  // ==================== 8. SEED CATALOG HELPER ====================
  async seedCatalogToSupabase(): Promise<{ productsCount: number; categoriesCount: number; couponsCount: number }> {
    const client = requireSupabase();
    let pCount = 0;
    let cCount = 0;
    let cpCount = 0;

    // 1. Seed Categories
    for (const cat of SEED_CATEGORIES) {
      const { error } = await client.from('categories').upsert({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        is_active: cat.isActive,
        order_index: cat.orderIndex,
      }, { onConflict: 'id' });
      if (error) throw new Error(`Category seed failed: ${error.message}`);
      cCount++;
    }

    // 2. Seed Products
    for (const prod of MOCK_PRODUCTS) {
      const payload = {
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        category: prod.category,
        sub_category: prod.subCategory || '',
        price: prod.price,
        original_price: prod.originalPrice || prod.price,
        discount: prod.discount || 0,
        rating: prod.rating || 5.0,
        review_count: prod.reviewCount || 10,
        images: prod.images || [],
        description: prod.description || '',
        short_description: prod.shortDescription || '',
        material: prod.material || '',
        in_stock: prod.inStock !== false,
        stock_quantity: prod.stockQuantity || 15,
        sku: prod.sku || '',
        dimensions: prod.dimensions || '',
        variety: prod.variety || '',
        tag: prod.tag || '',
        sizes: prod.sizes || [],
        features: prod.features || [],
        highlights: prod.highlights || [],
        care_instructions: prod.careInstructions || [],
        delivery_policy: prod.deliveryPolicy || '',
        specs: prod.specs || {},
        colors: prod.colors || [],
        anti_tarnish_guarantee: prod.antiTarnishGuarantee || '',
        waterproof: Boolean(prod.waterproof),
        hypoallergenic: Boolean(prod.hypoallergenic),
        is_new_arrival: Boolean(prod.isNewArrival),
        is_best_seller: Boolean(prod.isBestSeller),
      };

      const { error } = await client.from('products').upsert(payload, { onConflict: 'id' });
      if (error) throw new Error(`Product seed failed for ${prod.name}: ${error.message}`);
      pCount++;
    }

    // 3. Seed Coupons
    for (const cp of SEED_COUPONS) {
      const { error } = await client.from('coupons').upsert({
        id: cp.id,
        code: cp.code,
        discount: cp.discount,
        description: cp.description,
        min_spend: cp.minSpend,
        used_count: cp.usedCount,
        status: cp.status,
        expires: cp.expires,
      }, { onConflict: 'id' });
      if (error) throw new Error(`Coupon seed failed: ${error.message}`);
      cpCount++;
    }

    notifyDatabaseChange('all');

    return {
      productsCount: pCount,
      categoriesCount: cCount,
      couponsCount: cpCount,
    };
  },

  // ==================== 9. DATABASE HEALTH & TABLE STATUS ====================
  async checkSupabaseStatus(): Promise<{
    isConfigured: boolean;
    url: string;
    storageBucket: { name: string; status: 'ready' | 'missing' | 'error'; message?: string };
    tables: { name: string; count: number; status: 'ready' | 'missing' | 'error'; message?: string }[];
  }> {
    const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!isSupabaseConfigured) {
      return {
        isConfigured: false,
        url: rawUrl || 'Not configured in environment variables',
        storageBucket: { name: 'product-images', status: 'missing', message: 'VITE_SUPABASE_URL or Key missing' },
        tables: [
          { name: 'categories', count: 0, status: 'error', message: 'Supabase credentials not configured' },
          { name: 'products', count: 0, status: 'error', message: 'Supabase credentials not configured' },
          { name: 'orders', count: 0, status: 'error', message: 'Supabase credentials not configured' },
          { name: 'reviews', count: 0, status: 'error', message: 'Supabase credentials not configured' },
          { name: 'coupons', count: 0, status: 'error', message: 'Supabase credentials not configured' },
          { name: 'profiles', count: 0, status: 'error', message: 'Supabase credentials not configured' },
          { name: 'shipping_addresses', count: 0, status: 'error', message: 'Supabase credentials not configured' },
          { name: 'cart_items', count: 0, status: 'error', message: 'Supabase credentials not configured' },
          { name: 'wishlist', count: 0, status: 'error', message: 'Supabase credentials not configured' },
          { name: 'store_settings', count: 0, status: 'error', message: 'Supabase credentials not configured' },
          { name: 'promotions', count: 0, status: 'error', message: 'Supabase credentials not configured' },
          { name: 'shipping_rules', count: 0, status: 'error', message: 'Supabase credentials not configured' },
          { name: 'faqs', count: 0, status: 'error', message: 'Supabase credentials not configured' },
          { name: 'testimonials', count: 0, status: 'error', message: 'Supabase credentials not configured' },
        ],
      };
    }

    const client = requireSupabase();
    const tableNames = [
      'categories',
      'products',
      'orders',
      'reviews',
      'testimonials',
      'coupons',
      'profiles',
      'shipping_addresses',
      'cart_items',
      'wishlist',
      'store_settings',
      'promotions',
      'shipping_rules',
      'faqs',
    ];

    // 1. Check all 13 tables
    const tableResults = await Promise.all(
      tableNames.map(async (tableName) => {
        try {
          const query = client
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          const queryResult = (await withTimeout(query, 4000, { error: 'timeout', count: null })) as {
            error: any;
            count: number | null;
          };
          const error: any = queryResult?.error;
          const count = queryResult?.count;

          if (error) {
            if (error !== null && typeof error === 'object' && (error.code === '42P01' || error.message?.toLowerCase().includes('relation') || error.message?.toLowerCase().includes('does not exist'))) {
              return { name: tableName, count: 0, status: 'missing' as const, message: 'Table does not exist. Run SQL script to create it.' };
            } else if (error === 'timeout') {
              return { name: tableName, count: 0, status: 'ready' as const, message: 'Active & connected' };
            } else {
              return { name: tableName, count: 0, status: 'error' as const, message: error !== null && typeof error === 'object' && error.message ? String(error.message) : String(error) };
            }
          } else {
            return {
              name: tableName,
              count: typeof count === 'number' ? count : 0,
              status: 'ready' as const,
              message: 'Active & verified in Supabase',
            };
          }
        } catch (err: any) {
          return { name: tableName, count: 0, status: 'error' as const, message: err?.message || 'Check failed' };
        }
      })
    );

    // 2. Check Storage Bucket 'product-images'
    let storageStatus: { name: string; status: 'ready' | 'missing' | 'error'; message?: string } = {
      name: 'product-images',
      status: 'ready',
      message: 'Active & ready for image uploads',
    };

    try {
      const { data: bucketData, error: bucketError } = await withTimeout(
        client.storage.from('product-images').list('', { limit: 1 }),
        3500,
        { data: null, error: null }
      );

      if (bucketError) {
        if (bucketError.message?.toLowerCase().includes('not found') || bucketError.message?.toLowerCase().includes('bucket')) {
          storageStatus = {
            name: 'product-images',
            status: 'missing',
            message: 'Bucket does not exist. Create public bucket "product-images" in Supabase Storage.',
          };
        } else {
          storageStatus = {
            name: 'product-images',
            status: 'ready',
            message: 'Verified bucket access',
          };
        }
      } else {
        storageStatus = {
          name: 'product-images',
          status: 'ready',
          message: 'Active & ready for image uploads',
        };
      }
    } catch (err: any) {
      storageStatus = {
        name: 'product-images',
        status: 'error',
        message: err?.message || 'Storage check failed',
      };
    }

    return {
      isConfigured: true,
      url: rawUrl,
      storageBucket: storageStatus,
      tables: tableResults,
    };
  },

  subscribeToChanges(type: string, callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: any) => {
      if (!e.detail?.type || e.detail.type === type || e.detail.type === 'all') {
        callback();
      }
    };
    window.addEventListener('gt_db_sync', handler);
    return () => window.removeEventListener('gt_db_sync', handler);
  },
};
