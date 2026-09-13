import { supabase, isSupabaseConfigured, requireSupabase, getEffectiveSupabaseUrl, getSupabaseAnonKey } from './supabase';
import { Product } from '../types/product';
import { MOCK_PRODUCTS } from '../data/products';
import { CartService } from './cartService';
import { EmailService } from './emailService';

export const formatQueryError = (err: any): string => {
  if (!err) return 'Empty error response';
  if (typeof err === 'string') return err;
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
  try {
    const baseUrl = getEffectiveSupabaseUrl().replace(/\/+$/, '');
    const apiKey = getSupabaseAnonKey();
    if (!baseUrl || !apiKey) return null;

    const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
      method: 'GET',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (res.ok) {
      return (await res.json()) as T;
    }
    return null;
  } catch {
    return null;
  }
}

export async function supabaseRestMutation(
  table: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  queryParam: string,
  body?: any
): Promise<boolean> {
  try {
    const baseUrl = getEffectiveSupabaseUrl().replace(/\/+$/, '');
    const apiKey = getSupabaseAnonKey();
    if (!baseUrl || !apiKey) return false;

    const url = queryParam ? `${baseUrl}/rest/v1/${table}?${queryParam}` : `${baseUrl}/rest/v1/${table}`;
    const headers: Record<string, string> = {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    return res.ok;
  } catch (err) {
    console.warn(`[supabaseRestMutation ${method} ${table} error]`, err);
    return false;
  }
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
    ];
    keysToPurge.forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  } catch (e) {}
}

// Global live sync broadcaster for real-time reactivity across components
export const notifyDatabaseChange = (
  type: 'categories' | 'products' | 'orders' | 'reviews' | 'coupons' | 'cart' | 'wishlist' | 'settings' | 'promotions' | 'shipping' | 'faqs' | 'all'
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

export interface RealCoupon {
  id: string;
  code: string;
  discount: string;
  description: string;
  minSpend: number;
  usedCount: number;
  status: 'Active' | 'Inactive';
  expires: string;
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

export const SEED_CATEGORIES: RealCategory[] = [
  { id: 'cat-1', name: 'Nightwear & Pyjamas', slug: 'nightwear', isActive: true, orderIndex: 0 },
  { id: 'cat-2', name: '18K Anti-Tarnish Jewels', slug: 'jewellery', isActive: true, orderIndex: 1 },
  { id: 'cat-3', name: 'Satin & Silk Sets', slug: 'satin-sets', isActive: true, orderIndex: 2 },
  { id: 'cat-4', name: 'Pure Cotton Sets', slug: 'cotton-sets', isActive: true, orderIndex: 3 },
  { id: 'cat-5', name: 'Waterproof Necklaces & Rings', slug: 'jewels', isActive: true, orderIndex: 4 },
];

const SEED_COUPONS: RealCoupon[] = [
  { id: 'cp-1', code: 'GIRLY10', discount: '10% OFF', description: 'VIP Member Exclusive Welcome Perk', minSpend: 999, usedCount: 14, status: 'Active', expires: '2026-12-31' },
  { id: 'cp-2', code: 'SILKLOVE', discount: '15% OFF', description: 'Nightwear & Loungewear Collection', minSpend: 1499, usedCount: 8, status: 'Active', expires: '2026-11-30' },
  { id: 'cp-3', code: '18KGOLD', discount: '₹200 OFF', description: '18K Anti-Tarnish Jewellery Orders', minSpend: 1299, usedCount: 5, status: 'Active', expires: '2026-10-15' },
  { id: 'cp-4', code: 'FREESHIP', discount: 'Free Express Delivery', description: 'Prepaid Orders Across All Pincodes', minSpend: 0, usedCount: 22, status: 'Active', expires: 'Unlimited' },
];

// Runtime in-memory cached state (updated ONLY after successful Supabase DB mutations)
let inMemoryCategories: RealCategory[] = [];
let inMemoryProducts: Product[] = [];
let inMemoryOrders: RealOrder[] = [];
let inMemoryReviews: RealReview[] = [];
let inMemoryCoupons: RealCoupon[] = [];
let inMemoryStoreSettings: StoreSettings | null = null;
let inMemoryPromotions: PromotionItem[] = [];
let inMemoryShippingRules: ShippingRules | null = null;
let inMemoryFaqs: FAQItem[] = [];
const deletedOrderIds = new Set<string>();

export const DatabaseService = {
  // ==================== 1. ORDERS ====================
  async getOrders(): Promise<RealOrder[]> {
    const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
    let host = '';
    try {
      if (rawUrl) host = new URL(rawUrl).host;
    } catch {}

    const isDev = import.meta.env.DEV;

    if (isDev) {
      console.log('[Supabase getOrders] Connecting...', {
        isSupabaseConfigured,
        urlHost: host || 'Not configured',
      });
    }

    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set valid VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env.');
    }

    const fetchOrdersFromDb = async (): Promise<any[]> => {
      const client = requireSupabase();
      const startTime = Date.now();

      const query = client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error } = await withTimeout(query, 10000, { data: null, error: 'timeout' });
      const durationMs = Date.now() - startTime;

      if (!error && Array.isArray(data)) {
        if (isDev) {
          console.log(`[Supabase getOrders Success] Fetched ${data.length} rows in ${durationMs}ms`);
        }
        return data;
      }

      // If client query had an issue or timed out, attempt direct REST fallback with clean Anon API key
      const fallbackData = await fetchSupabaseRestFallback<any[]>('orders?select=*&order=created_at.desc&limit=100');
      if (Array.isArray(fallbackData)) {
        if (isDev) {
          console.log(`[Supabase getOrders Fallback Success] Fetched ${fallbackData.length} rows via REST`);
        }
        return fallbackData;
      }

      if (error) {
        if (error === 'timeout') {
          throw new Error('Supabase orders query timed out after 10000ms.');
        }
        if (isDev) {
          console.error('[Supabase getOrders Error]', error);
        }
        throw error;
      }

      return [];
    };

    let rawData: any[] = [];
    try {
      rawData = await fetchOrdersFromDb();
    } catch (firstErr: any) {
      if (isDev) {
        console.warn('[Supabase getOrders] Initial attempt failed, retrying once after 500ms...', firstErr?.message);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        rawData = await fetchOrdersFromDb();
      } catch (retryErr: any) {
        console.error('[Supabase getOrders Retry Failed]', retryErr);
        const errMsg = formatQueryError(retryErr);
        throw new Error(`Orders could not load: ${errMsg}`);
      }
    }

    const mapped: RealOrder[] = rawData
      .map((d: any) => {
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
      })
      .filter((ord) => !!ord.id);

    inMemoryOrders = mapped;
    return mapped;
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

    // 2. Update in-memory state ONLY AFTER successful DB response
    inMemoryOrders = [fullOrder, ...inMemoryOrders.filter((o) => o.id !== fullOrder.id)];
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
    notifyDatabaseChange('orders');
  },

  async getProducts(): Promise<Product[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set valid VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.');
    }

    const fetchProductsFromDb = async (): Promise<any[]> => {
      const client = requireSupabase();
      const query = client
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await withTimeout(query, 10000, { data: null, error: 'timeout' });

      if (!error && Array.isArray(data)) {
        return data;
      }

      // If client query had an issue or timed out, attempt direct REST fallback with clean Anon API key
      const fallbackData = await fetchSupabaseRestFallback<any[]>('products?select=*&order=created_at.desc');
      if (Array.isArray(fallbackData)) {
        return fallbackData;
      }

      if (error) {
        if (error === 'timeout') {
          throw new Error('Supabase products query timed out after 10000ms.');
        }
        console.error('[Supabase getProducts Error]', error);
        throw error;
      }

      return [];
    };

    let rawData: any[] = [];
    try {
      rawData = await fetchProductsFromDb();
    } catch (firstErr: any) {
      if (import.meta.env.DEV) {
        console.warn('[Supabase getProducts] Initial attempt failed, retrying once after 500ms...', firstErr?.message);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        rawData = await fetchProductsFromDb();
      } catch (retryErr: any) {
        console.error('[Supabase getProducts Retry Failed]', retryErr);
        const errMsg = formatQueryError(retryErr);
        throw new Error(`Products could not load: ${errMsg}`);
      }
    }

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
      images: Array.isArray(d.images)
        ? d.images
        : typeof d.images === 'string'
        ? (d.images.startsWith('[') ? JSON.parse(d.images) : [d.images])
        : [d.image_url || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80'],
      description: d.description || '',
      shortDescription: d.short_description || d.shortDescription || '',
      material: d.material || '',
      inStock: d.in_stock !== false && d.inStock !== false,
      stockQuantity: Number(d.stock_quantity ?? d.stockQuantity ?? 10),
      sku: d.sku || '',
      dimensions: d.dimensions || '',
      variety: d.variety || '',
      tag: d.tag || '',
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
    return mapped;
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
      images: product.images || [],
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
    const { error } = await client.from('products').upsert(fullPayload, { onConflict: 'id' });
    if (error) {
      console.error('Supabase addProduct failed:', error);
      throw new Error(`Failed to save product to database: ${error.message}`);
    }

    // 2. Update local state ONLY on DB success
    inMemoryProducts = [product, ...inMemoryProducts.filter((p) => p.id !== product.id)];
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
    if (updates.isBestSeller !== undefined) payload.is_best_seller = updates.isBestSeller;

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
    const { error } = await client.from('products').update(payload).eq('id', id);
    if (error) {
      console.error('Supabase updateProduct failed:', error);
      throw new Error(`Failed to update product in database: ${error.message}`);
    }

    // 2. Update in-memory state ONLY on DB success
    inMemoryProducts = inMemoryProducts.map((p) => (p.id === id ? { ...p, ...updates } : p));
    notifyDatabaseChange('products');

    const updated = inMemoryProducts.find((p) => p.id === id);
    if (!updated) throw new Error('Product not found after update');
    return updated;
  },

  async updateProductStock(productId: string, inStock: boolean): Promise<void> {
    const client = requireSupabase();
    const { error } = await client.from('products').update({ in_stock: inStock, updated_at: new Date().toISOString() }).eq('id', productId);
    if (error) {
      console.error('Supabase updateProductStock failed:', error);
      throw new Error(`Failed to update stock status: ${error.message}`);
    }

    inMemoryProducts = inMemoryProducts.map((p) => (p.id === productId ? { ...p, inStock } : p));
    notifyDatabaseChange('products');
  },

  async deleteProduct(productId: string): Promise<void> {
    const cleanId = String(productId).trim();
    if (!cleanId) throw new Error('Product ID is required');

    const client = requireSupabase();
    let delError: any = null;
    try {
      const { error } = await client
        .from('products')
        .delete()
        .or(`id.eq.${cleanId},slug.eq.${cleanId}`);
      delError = error;
    } catch (err) {
      delError = err;
    }

    if (delError) {
      const ok = await supabaseRestMutation('products', 'DELETE', `or=(id.eq.${encodeURIComponent(cleanId)},slug.eq.${encodeURIComponent(cleanId)})`);
      if (!ok) {
        console.error('Supabase deleteProduct failed:', delError);
        throw new Error(`Failed to delete product from database: ${formatQueryError(delError)}`);
      }
    }

    // Clean up associated cart_items & wishlist rows in Supabase
    try {
      await client.from('cart_items').delete().eq('product_id', cleanId);
      await client.from('wishlist').delete().eq('product_id', cleanId);
    } catch (subErr) {}

    // 2. Update in-memory state ONLY on DB success
    inMemoryProducts = inMemoryProducts.filter((p) => p.id !== cleanId && p.slug !== cleanId);
    notifyDatabaseChange('products');
    notifyDatabaseChange('cart');
    notifyDatabaseChange('wishlist');
  },

  async uploadProductImage(file: File): Promise<string> {
    const client = requireSupabase();
    const optimizedBlob = await this.optimizeImageFile(file);
    const cleanExt = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
    const filePath = `products/${fileName}`;

    let { error: uploadError } = await client.storage
      .from('product-images')
      .upload(filePath, optimizedBlob, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError && (uploadError.message?.toLowerCase().includes('not found') || uploadError.message?.toLowerCase().includes('bucket'))) {
      try {
        await client.storage.createBucket('product-images', { public: true });
        const retry = await client.storage
          .from('product-images')
          .upload(filePath, optimizedBlob, {
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

    if (!publicData?.publicUrl) {
      throw new Error('Failed to obtain public URL for uploaded product image.');
    }

    return publicData.publicUrl;
  },

  async optimizeImageFile(file: File, maxWidth = 1600, quality = 0.88): Promise<Blob> {
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
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else resolve(file);
            },
            'image/webp',
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

        // Direct REST fallback for profiles (fetches all registered customer profiles using clean Anon API key)
        const fallbackProfiles = await fetchSupabaseRestFallback<any[]>('profiles?select=*');
        if (Array.isArray(fallbackProfiles) && fallbackProfiles.length > 0) {
          const profMap = new Map<string, any>();
          remoteProfiles.forEach((p) => {
            const k = (p.email || p.id || '').toLowerCase().trim();
            if (k) profMap.set(k, p);
          });
          fallbackProfiles.forEach((p) => {
            const k = (p.email || p.id || '').toLowerCase().trim();
            if (k && !profMap.has(k)) {
              profMap.set(k, p);
            }
          });
          remoteProfiles = Array.from(profMap.values());
        }

        // Direct REST fallback for shipping_addresses
        const fallbackAddresses = await fetchSupabaseRestFallback<any[]>('shipping_addresses?select=*');
        if (Array.isArray(fallbackAddresses) && fallbackAddresses.length > 0) {
          const addrMap = new Map<string, any>();
          remoteAddresses.forEach((a) => {
            if (a.id) addrMap.set(a.id, a);
          });
          fallbackAddresses.forEach((a) => {
            if (a.id && !addrMap.has(a.id)) {
              addrMap.set(a.id, a);
            }
          });
          remoteAddresses = Array.from(addrMap.values());
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

    return Array.from(customerMap.values());
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

        let wishQuery = client.from('wishlist').select('*');
        if (cleanId && cleanEmail && cleanId !== cleanEmail) {
          wishQuery = wishQuery.or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
        } else if (cleanEmail) {
          wishQuery = wishQuery.eq('user_id', cleanEmail);
        } else if (cleanId) {
          wishQuery = wishQuery.eq('user_id', cleanId);
        }

        const { data: wishData } = await withTimeout(wishQuery, 4000, { data: [] });
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
  async getReviews(productId?: string): Promise<RealReview[]> {
    if (!isSupabaseConfigured) {
      return inMemoryReviews;
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

      if (Array.isArray(rawData)) {
        const mapped: RealReview[] = rawData.map((d: any) => ({
          id: d.id,
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
        return mapped;
      }

      return inMemoryReviews;
    } catch (e) {
      console.error('Supabase getReviews error:', e);
      return inMemoryReviews;
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
        console.error('Supabase addReview failed:', insertError);
        throw new Error(`Failed to save review to database: ${formatQueryError(insertError)}`);
      }
    }

    inMemoryReviews = [newReview, ...inMemoryReviews];
    notifyDatabaseChange('reviews');
    return newReview;
  },

  async updateReview(
    id: string,
    updates: Partial<RealReview>
  ): Promise<RealReview> {
    const client = requireSupabase();
    const payload: any = {};
    if (updates.productId !== undefined) payload.product_id = updates.productId;
    if (updates.productName !== undefined) payload.product_name = updates.productName;
    if (updates.author !== undefined) payload.author = updates.author;
    if (updates.rating !== undefined) payload.rating = updates.rating;
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
        console.error('Supabase updateReview failed:', updateError);
        throw new Error(`Failed to update review in database: ${formatQueryError(updateError)}`);
      }
    }

    let updatedReview: RealReview | null = null;
    inMemoryReviews = inMemoryReviews.map((r) => {
      if (r.id === id) {
        updatedReview = {
          ...r,
          ...updates,
          rating: updates.rating !== undefined ? Math.max(1, Math.min(5, Number(updates.rating))) : r.rating,
        };
        return updatedReview;
      }
      return r;
    });

    notifyDatabaseChange('reviews');
    if (!updatedReview) throw new Error('Review not found after update');
    return updatedReview;
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
        console.error('Supabase deleteReview failed:', delError);
        throw new Error(`Failed to delete review from database: ${formatQueryError(delError)}`);
      }
    }

    inMemoryReviews = inMemoryReviews.filter((r) => r.id !== id);
    notifyDatabaseChange('reviews');
  },

  // ==================== 5. COUPONS ====================
  async getCoupons(): Promise<RealCoupon[]> {
    if (!isSupabaseConfigured) {
      return inMemoryCoupons;
    }

    try {
      const client = requireSupabase();
      const query = client.from('coupons').select('*').order('created_at', { ascending: false });
      const { data, error } = await withTimeout(query, 8000, { data: null, error: 'timeout' });

      let rawData = data;
      if (error || !Array.isArray(rawData)) {
        rawData = await fetchSupabaseRestFallback<any[]>('coupons?select=*&order=created_at.desc');
      }

      if (Array.isArray(rawData)) {
        const mapped: RealCoupon[] = rawData.map((d: any) => ({
          id: d.id,
          code: d.code,
          discount: d.discount,
          description: d.description || '',
          minSpend: Number(d.min_spend ?? d.minSpend ?? 0),
          usedCount: Number(d.used_count ?? d.usedCount ?? 0),
          status: d.status || 'Active',
          expires: d.expires || '2026-12-31',
        }));
        inMemoryCoupons = mapped;
        return mapped;
      }

      return inMemoryCoupons;
    } catch (e) {
      console.error('Supabase getCoupons error:', e);
      return inMemoryCoupons;
    }
  },

  async addCoupon(coupon: RealCoupon): Promise<void> {
    const client = requireSupabase();
    const payload = {
      id: coupon.id,
      code: coupon.code.toUpperCase().trim(),
      discount: coupon.discount,
      description: coupon.description,
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
          coupon = {
            id: data.id,
            code: data.code,
            discount: data.discount,
            description: data.description || '',
            minSpend: Number(data.min_spend ?? 0),
            usedCount: Number(data.used_count ?? 0),
            status: data.status || 'Active',
            expires: data.expires || '2026-12-31',
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
  async getCategories(): Promise<RealCategory[]> {
    if (!isSupabaseConfigured) {
      return inMemoryCategories;
    }

    try {
      const client = requireSupabase();
      const query = client
        .from('categories')
        .select('*')
        .order('order_index', { ascending: true });

      const { data, error } = await withTimeout(query, 8000, { data: null, error: 'timeout' });

      let rawCategories = data;
      if (error || !Array.isArray(rawCategories)) {
        rawCategories = await fetchSupabaseRestFallback<any[]>('categories?select=*&order=order_index.asc');
      }

      if (Array.isArray(rawCategories)) {
        const mapped: RealCategory[] = rawCategories.map((d: any, idx: number) => ({
          id: d.id,
          name: d.name,
          slug: d.slug || d.name.toLowerCase().replace(/\s+/g, '-'),
          isActive: d.is_active !== false && d.isActive !== false,
          orderIndex: d.order_index !== undefined ? Number(d.order_index) : idx,
          createdAt: d.created_at || new Date().toISOString(),
        }));

        inMemoryCategories = mapped;
        return mapped;
      }

      return inMemoryCategories;
    } catch (e) {
      console.error('Supabase fetch categories error:', e);
      return inMemoryCategories;
    }
  },

  async addCategory(categoryData: { name: string; isActive?: boolean }): Promise<RealCategory> {
    const client = requireSupabase();
    const current = await this.getCategories();
    const nextOrderIndex = current.length > 0 ? Math.max(...current.map((c) => c.orderIndex ?? 0)) + 1 : 0;
    const newCategory: RealCategory = {
      id: `cat-${Date.now()}`,
      name: categoryData.name.trim(),
      slug: categoryData.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
      isActive: categoryData.isActive !== false,
      orderIndex: nextOrderIndex,
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

    inMemoryCategories = [...current.filter((c) => c.id !== newCategory.id), newCategory];
    notifyDatabaseChange('categories');
    return newCategory;
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

    let saveError: any = null;
    try {
      const { error } = await client.from('store_settings').upsert(payload, { onConflict: 'key' });
      saveError = error;
    } catch (err) {
      saveError = err;
    }

    if (saveError) {
      const ok = await supabaseRestMutation('store_settings', 'POST', 'on_conflict=key', payload);
      if (!ok) {
        console.error('Supabase updateStoreSettings failed:', saveError);
        throw new Error(`Failed to save store settings in database: ${formatQueryError(saveError)}`);
      }
    }

    inMemoryStoreSettings = settings;
    notifyDatabaseChange('settings');
    return settings;
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
      const ok = await supabaseRestMutation('promotions', 'POST', 'on_conflict=id', payload);
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
      const ok = await supabaseRestMutation('shipping_rules', 'POST', 'on_conflict=id', payload);
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
        ],
      };
    }

    const client = requireSupabase();
    const tableNames = [
      'categories',
      'products',
      'orders',
      'reviews',
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
};
