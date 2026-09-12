import { supabase, isSupabaseConfigured } from './supabase';
import { Product } from '../types/product';
import { CartService } from './cartService';

// Purge any legacy browser/local storage keys to guarantee pure direct Supabase operation
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
export const notifyDatabaseChange = (type: 'categories' | 'products' | 'orders' | 'reviews' | 'coupons' | 'all') => {
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
  verified: boolean;
  status: 'Approved' | 'Pending' | 'Featured';
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

export const SEED_CATEGORIES: RealCategory[] = [
  { id: 'cat-1', name: 'Floor', slug: 'floor', isActive: true, orderIndex: 0 },
  { id: 'cat-2', name: 'Foldable Mat', slug: 'foldable-mat', isActive: true, orderIndex: 1 },
  { id: 'cat-3', name: 'Cushion Mat', slug: 'cushion-mat', isActive: true, orderIndex: 2 },
  { id: 'cat-4', name: 'Doormat', slug: 'doormat', isActive: false, orderIndex: 3 },
  { id: 'cat-5', name: 'Yoga', slug: 'yoga', isActive: true, orderIndex: 4 },
];

const SEED_ORDERS: RealOrder[] = [
  {
    id: 'LW-2026-0078',
    customerName: 'Kartick Sau',
    email: 'karticksau701@gmail.com',
    phone: '+91 62972 91512',
    items: [
      {
        productId: 'prod-1',
        name: 'Mulberry Silk Satin Notch Collar Pajama Set',
        price: 1899,
        quantity: 1,
        size: 'M',
        variant: 'Blossom Pink',
        image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
      },
      {
        productId: 'prod-2',
        name: '18K Gold Plated Clover Pendant Chain',
        price: 999,
        quantity: 1,
        variant: '18K Gold',
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80',
      },
    ],
    total: 2898,
    subtotal: 2898,
    shippingFee: 0,
    discountAmount: 0,
    sellerStatus: 'Pending',
    customerStatus: 'Pending',
    status: 'Pending',
    paymentMethod: 'UPI / Prepaid',
    address: 'Barchahara, Sabang, Paschim Medinipur',
    city: 'Kharagpur',
    state: 'West Bengal',
    pincode: '721467',
    specialInstructions: 'Please deliver between 2 PM to 6 PM if possible.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'LW-2026-0077',
    customerName: 'Kartick Sau',
    email: 'karticksau701@gmail.com',
    phone: '+91 62972 91512',
    items: [
      {
        productId: 'prod-3',
        name: '18K Chunky Croissant Dome Ring',
        price: 1299,
        quantity: 1,
        size: 'Adjustable',
        image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80',
      },
    ],
    total: 1299,
    subtotal: 1299,
    shippingFee: 0,
    discountAmount: 0,
    sellerStatus: 'Cancelled by Seller',
    customerStatus: 'Cancelled by Customer',
    status: 'Cancelled',
    paymentMethod: 'UPI / Prepaid',
    address: 'Barchahara, Sabang, Paschim Medinipur',
    city: 'Kharagpur',
    state: 'West Bengal',
    pincode: '721467',
    createdAt: new Date(Date.now() - 3600000 * 16).toISOString(),
  },
  {
    id: 'LW-2026-0076',
    customerName: 'Suman Samanta',
    email: 'sumansamanta721467@gmail.com',
    phone: '+91 98112 34567',
    items: [
      {
        productId: 'prod-4',
        name: 'Celestial Constellation 18K Chain (Gold)',
        price: 1359,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80',
      },
    ],
    total: 1359,
    subtotal: 1359,
    shippingFee: 0,
    discountAmount: 0,
    sellerStatus: 'Pending',
    customerStatus: 'Paid',
    status: 'Pending',
    paymentMethod: 'UPI / Prepaid',
    address: 'GT Road, Model Town',
    city: 'Jalandhar',
    state: 'Punjab',
    pincode: '144003',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'LW-2026-0075',
    customerName: 'Sabara Admin',
    email: 'contact.sabara@gmail.com',
    phone: '+91 98201 45982',
    items: [
      {
        productId: 'prod-5',
        name: 'Cloud Soft Modal Nightshirt - Lavender Mist',
        price: 1564,
        quantity: 1,
        size: 'L',
        image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
      },
      {
        productId: 'prod-6',
        name: 'Pearl Aura Huggie Earrings',
        price: 899,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&q=80',
      },
    ],
    total: 2463,
    subtotal: 2463,
    shippingFee: 0,
    discountAmount: 0,
    sellerStatus: 'Pending',
    customerStatus: 'Paid',
    status: 'Pending',
    paymentMethod: 'UPI / Prepaid',
    address: 'Urban Estate Phase 2',
    city: 'Jalandhar',
    state: 'Punjab',
    pincode: '144022',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
];

const SEED_REVIEWS: RealReview[] = [
  {
    id: 'rev-1',
    productName: 'Mulberry Silk Satin Notch Collar Set',
    author: 'Sabara K.',
    rating: 5,
    comment: 'The softest silk pyjamas I have ever owned! Perfect tailoring and breathable for humid nights.',
    verified: true,
    status: 'Featured',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'rev-2',
    productName: 'Celestial Constellation 18K Chain',
    author: 'Pooja M.',
    rating: 5,
    comment: 'I showered with it for 3 weeks straight and it did not tarnish at all. 10/10 recommend!',
    verified: true,
    status: 'Approved',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'rev-3',
    productName: 'Cloud Soft Modal Nightshirt',
    author: 'Natasha R.',
    rating: 5,
    comment: 'Feels like wearing a soft cloud. Ordered a second color immediately.',
    verified: true,
    status: 'Approved',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  }
];

const SEED_COUPONS: RealCoupon[] = [
  { id: 'cp-1', code: 'GIRLY10', discount: '10% OFF', description: 'VIP Member Exclusive Welcome Perk', minSpend: 999, usedCount: 14, status: 'Active', expires: '2026-12-31' },
  { id: 'cp-2', code: 'SILKLOVE', discount: '15% OFF', description: 'Nightwear & Loungewear Collection', minSpend: 1499, usedCount: 8, status: 'Active', expires: '2026-11-30' },
  { id: 'cp-3', code: '18KGOLD', discount: '₹200 OFF', description: '18K Anti-Tarnish Jewellery Orders', minSpend: 1299, usedCount: 5, status: 'Active', expires: '2026-10-15' },
  { id: 'cp-4', code: 'FREESHIP', discount: 'Free Express Delivery', description: 'Prepaid Orders Across All Pincodes', minSpend: 0, usedCount: 22, status: 'Active', expires: 'Unlimited' },
];

// Runtime in-memory state (Direct Supabase data is authoritative source)
let inMemoryCategories: RealCategory[] = [...SEED_CATEGORIES];
let inMemoryProducts: Product[] = [];
let inMemoryOrders: RealOrder[] = [];
let inMemoryReviews: RealReview[] = [];
let inMemoryCoupons: RealCoupon[] = [];

export const DatabaseService = {
  // ==================== 1. ORDERS ====================
  async getOrders(): Promise<RealOrder[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const mapped: RealOrder[] = data
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
        }
      } catch (err) {
        console.warn('Supabase fetch orders error:', err);
      }
    }

    return inMemoryOrders;
  },

  async createOrder(order: Omit<RealOrder, 'createdAt' | 'sellerStatus' | 'customerStatus'> & { 
    createdAt?: string; 
    sellerStatus?: SellerStatus; 
    customerStatus?: CustomerStatus; 
  }): Promise<RealOrder> {
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

    inMemoryOrders = [fullOrder, ...inMemoryOrders.filter((o) => o.id !== fullOrder.id)];
    notifyDatabaseChange('orders');

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('orders').upsert(
          {
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
          },
          { onConflict: 'id' }
        );
        if (error) {
          console.warn('Supabase order insert fallback note:', error.message);
          // Fallback if courier columns don't exist yet
          await supabase.from('orders').upsert(
            {
              id: fullOrder.id,
              customer_name: fullOrder.customerName,
              email: fullOrder.email,
              phone: fullOrder.phone,
              items: fullOrder.items,
              total: fullOrder.total,
              subtotal: fullOrder.subtotal,
              shipping_fee: fullOrder.shippingFee,
              discount_amount: fullOrder.discountAmount,
              status: fullOrder.sellerStatus,
              payment_method: fullOrder.paymentMethod,
              address: fullOrder.address,
              city: fullOrder.city,
              state: fullOrder.state,
              pincode: fullOrder.pincode,
              created_at: fullOrder.createdAt,
            },
            { onConflict: 'id' }
          );
        }
      } catch (e) {
        console.warn('Supabase order insert note:', e);
      }
    }

    return fullOrder;
  },

  async updateSellerStatus(
    orderId: string,
    sellerStatus: SellerStatus,
    shippingInfo?: { courierName?: string; trackingNumber?: string; trackingUrl?: string }
  ): Promise<void> {
    const cleanId = String(orderId).trim();
    if (!cleanId) return;

    persistStatusOverride(cleanId, sellerStatus, shippingInfo);

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

    if (isSupabaseConfigured) {
      try {
        const updatePayload: any = { 
          seller_status: sellerStatus,
          status: sellerStatus,
        };
        if (shippingInfo?.courierName !== undefined) updatePayload.courier_name = shippingInfo.courierName;
        if (shippingInfo?.trackingNumber !== undefined) updatePayload.tracking_number = shippingInfo.trackingNumber;
        if (shippingInfo?.trackingUrl !== undefined) updatePayload.tracking_url = shippingInfo.trackingUrl;

        const { error } = await supabase
          .from('orders')
          .update(updatePayload)
          .eq('id', cleanId);

        if (error) {
          console.warn('Supabase primary status update failed, fallback to status:', error.message);
          await supabase
            .from('orders')
            .update({ status: sellerStatus })
            .eq('id', cleanId);
        }
      } catch (e) {
        console.warn('Supabase seller status update note:', e);
      }
    }
  },

  async updateSpecialInstructions(orderId: string, specialInstructions: string): Promise<void> {
    const cleanId = String(orderId).trim();

    inMemoryOrders = inMemoryOrders.map((o) =>
      o.id === cleanId ? { ...o, specialInstructions } : o
    );
    notifyDatabaseChange('orders');

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('orders')
          .update({ special_instructions: specialInstructions })
          .eq('id', cleanId);
        if (error) {
          console.warn('Supabase instructions update error:', error.message);
        }
      } catch (e) {
        console.warn('Supabase instructions update note:', e);
      }
    }
  },

  async updateOrderStatus(orderId: string, status: RealOrder['status']): Promise<void> {
    const validSellerStatus: SellerStatus = 
      status === 'Processing' ? 'Pending' :
      status === 'Cancelled' ? 'Cancelled by Seller' : 
      (status as SellerStatus);
    await this.updateSellerStatus(orderId, validSellerStatus);
  },

  async deleteOrder(orderId: string): Promise<boolean> {
    const cleanId = String(orderId).trim();
    if (!cleanId) return false;

    // 1. Remove immediately from runtime in-memory array
    inMemoryOrders = inMemoryOrders.filter((o) => o.id !== cleanId);

    // 2. Delete directly from Supabase orders table
    let supabaseSuccess = true;
    if (isSupabaseConfigured) {
      try {
        const { error, count } = await supabase
          .from('orders')
          .delete()
          .eq('id', cleanId);

        if (error) {
          console.error('Supabase delete order failed (Check RLS DELETE policy):', error.message);
          supabaseSuccess = false;
        } else {
          console.log(`Supabase order #${cleanId} deleted successfully. Affected rows:`, count);
        }
      } catch (e) {
        console.error('Supabase delete order exception:', e);
        supabaseSuccess = false;
      }
    }

    notifyDatabaseChange('orders');
    return supabaseSuccess;
  },

  // ==================== 2. PRODUCTS ====================
  async getProducts(): Promise<Product[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const mapped: Product[] = data.map((d: any) => ({
            id: String(d.id),
            name: d.name || 'Girly Tales Item',
            slug: d.slug || String(d.id),
            category: d.category || 'nightwear',
            subCategory: d.sub_category || d.subCategory || '',
            price: Number(d.price) || 0,
            originalPrice: Number(d.original_price || d.originalPrice || d.price) || 0,
            discount: Number(d.discount || 0),
            rating: Number(d.rating || 5.0),
            reviewCount: Number(d.review_count || d.reviewCount || 1),
            images: Array.isArray(d.images)
              ? d.images
              : typeof d.images === 'string'
              ? (d.images.startsWith('[') ? JSON.parse(d.images) : [d.images])
              : [d.image_url || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80'],
            description: d.description || '',
            shortDescription: d.short_description || d.shortDescription || '',
            material: d.material || '',
            inStock: d.in_stock !== false && d.inStock !== false,
            stockQuantity: Number(d.stock_quantity || d.stockQuantity || 10),
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
          }));

          inMemoryProducts = mapped;
          return mapped;
        } else if (error) {
          console.warn('Supabase getProducts error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase getProducts exception:', err);
      }
    }

    return inMemoryProducts;
  },

  async addProduct(product: Product): Promise<Product> {
    inMemoryProducts = [product, ...inMemoryProducts.filter((p) => p.id !== product.id)];
    notifyDatabaseChange('products');

    if (isSupabaseConfigured) {
      try {
        const fullPayload = {
          id: product.id,
          name: product.name,
          slug: product.slug,
          category: product.category,
          sub_category: product.subCategory,
          price: product.price,
          original_price: product.originalPrice,
          discount: product.discount,
          rating: product.rating,
          review_count: product.reviewCount,
          images: product.images,
          description: product.description,
          short_description: product.shortDescription,
          material: product.material,
          in_stock: product.inStock,
          stock_quantity: product.stockQuantity,
          sku: product.sku,
          dimensions: product.dimensions,
          variety: product.variety,
          tag: product.tag,
          highlights: product.highlights || [],
          care_instructions: product.careInstructions || [],
          delivery_policy: product.deliveryPolicy || '',
          features: product.features || [],
        };

        const { error } = await supabase.from('products').upsert(fullPayload, { onConflict: 'id' });
        if (error) {
          console.warn('Supabase full product upsert note, trying core schema:', error.message);
          await supabase.from('products').upsert({
            id: product.id,
            name: product.name,
            slug: product.slug,
            category: product.category,
            price: product.price,
            in_stock: product.inStock,
            images: product.images,
            description: product.description,
          }, { onConflict: 'id' });
        }
      } catch (e) {
        console.warn('Supabase add product exception:', e);
      }
    }

    return product;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    inMemoryProducts = inMemoryProducts.map((p) => (p.id === id ? { ...p, ...updates } : p));
    notifyDatabaseChange('products');

    if (isSupabaseConfigured) {
      try {
        const payload: any = { ...updates };
        if (updates.subCategory !== undefined) payload.sub_category = updates.subCategory;
        if (updates.originalPrice !== undefined) payload.original_price = updates.originalPrice;
        if (updates.shortDescription !== undefined) payload.short_description = updates.shortDescription;
        if (updates.stockQuantity !== undefined) payload.stock_quantity = updates.stockQuantity;
        if (updates.careInstructions !== undefined) payload.care_instructions = updates.careInstructions;
        if (updates.deliveryPolicy !== undefined) payload.delivery_policy = updates.deliveryPolicy;
        delete payload.subCategory;
        delete payload.originalPrice;
        delete payload.shortDescription;
        delete payload.stockQuantity;
        delete payload.careInstructions;
        delete payload.deliveryPolicy;

        await supabase.from('products').update(payload).eq('id', id);
      } catch (e) {
        console.warn('Supabase update product note:', e);
      }
    }

    return inMemoryProducts.find((p) => p.id === id) || null;
  },

  async uploadProductImage(file: File): Promise<string> {
    try {
      const optimizedBlob = await this.optimizeImageFile(file);
      const cleanExt = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
      const filePath = `products/${fileName}`;

      if (isSupabaseConfigured) {
        try {
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, optimizedBlob, {
              contentType: file.type || 'image/jpeg',
              cacheControl: '3600',
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicData } = supabase.storage
              .from('product-images')
              .getPublicUrl(filePath);
            if (publicData?.publicUrl) {
              return publicData.publicUrl;
            }
          } else {
            console.warn('Supabase storage upload note:', uploadError.message);
          }
        } catch (err) {
          console.warn('Supabase storage exception:', err);
        }
      }

      // Fallback data URL if storage bucket is not configured or in local offline mode
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(optimizedBlob);
      });
    } catch (err) {
      console.error('Error optimizing/uploading image:', err);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    }
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

  async updateProductStock(productId: string, inStock: boolean): Promise<void> {
    inMemoryProducts = inMemoryProducts.map((p) => (p.id === productId ? { ...p, inStock } : p));
    notifyDatabaseChange('products');

    if (isSupabaseConfigured) {
      try {
        await supabase.from('products').update({ in_stock: inStock }).eq('id', productId);
      } catch (e) {}
    }
  },

  async deleteProduct(productId: string): Promise<boolean> {
    const cleanId = String(productId).trim();
    if (!cleanId) return false;

    inMemoryProducts = inMemoryProducts.filter((p) => p.id !== cleanId && p.slug !== cleanId);
    notifyDatabaseChange('products');

    let deleted = true;
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .or(`id.eq.${cleanId},slug.eq.${cleanId}`);

        if (error) {
          console.warn('Supabase delete product error (trying id.eq):', error.message);
          const retry = await supabase.from('products').delete().eq('id', cleanId);
          if (retry.error) {
            console.error('Supabase retry delete failed:', retry.error.message);
            deleted = false;
          }
        }
      } catch (e) {
        console.error('Supabase delete product note:', e);
        deleted = false;
      }
    }

    return deleted;
  },

  // ==================== 3. CUSTOMERS (SUPABASE PROFILES + AUTH + ORDERS) ====================
  async getCustomers(orders?: RealOrder[], activeUser?: any): Promise<RealCustomer[]> {
    const allOrders = orders || (await this.getOrders());
    const allProducts = await this.getProducts();
    const customerMap = new Map<string, RealCustomer>();

    // 1. Fetch registered user profiles from Supabase
    let remoteProfiles: any[] = [];
    let remoteAddresses: any[] = [];
    if (isSupabaseConfigured) {
      try {
        const [profRes, addrRes, authUserRes] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('shipping_addresses').select('*'),
          supabase.auth.getUser(),
        ]);
        if (!profRes.error && Array.isArray(profRes.data)) {
          remoteProfiles = profRes.data;
        }
        if (!addrRes.error && Array.isArray(addrRes.data)) {
          remoteAddresses = addrRes.data;
        }

        // If authenticated user is logged in, ensure their profile is in remoteProfiles
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

            // Auto-persist to profiles table in Supabase
            supabase.from('profiles').upsert(newProf, { onConflict: 'id' }).then();
          }
        }
      } catch (e) {
        console.warn('Supabase profiles/addresses fetch note:', e);
      }
    }

    // Also check local activeUser if passed from context or storage
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

    // Helper to aggregate products purchased from a list of orders
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

    // 2. Populate registered members from Supabase profiles
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

    // 3. Populate or augment with customers from Orders
    allOrders.forEach((ord) => {
      const email = (ord.email || '').toLowerCase().trim();
      if (!email) return;

      const existing = customerMap.get(email);
      if (existing) {
        // Already registered, ensure orders list is complete
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
        // Guest customer from checkout
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

  // ==================== 3B. CUSTOMER ACTIVITY (CART & WISHLIST) ====================
  async getCustomerActivity(
    userId?: string,
    userEmail?: string
  ): Promise<{ cartItems: CustomerCartItem[]; wishlistItems: CustomerWishlistItem[] }> {
    const cleanId = userId?.trim();
    const cleanEmail = userEmail?.toLowerCase().trim();
    const allProducts = await this.getProducts();

    const resolveProduct = (productId: string, fallbackData?: any): Product | null => {
      let matched = allProducts.find((p) => p.id === productId || p.slug === productId);
      if (!matched && fallbackData && fallbackData.name && fallbackData.price) {
        matched = fallbackData as Product;
      }
      return matched || null;
    };

    const result: { cartItems: CustomerCartItem[]; wishlistItems: CustomerWishlistItem[] } = {
      cartItems: [],
      wishlistItems: [],
    };

    if (isSupabaseConfigured && (cleanId || cleanEmail)) {
      // 1. Fetch Cart Items from Supabase (multi-layer: cart_items table + user_metadata + local cache)
      try {
        const remoteCart = await CartService.fetchUserCart(cleanId, cleanEmail);
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
        } else {
          // Direct table query fallback
          let cartQuery = supabase.from('cart_items').select('*');
          if (cleanId && cleanEmail && cleanId !== cleanEmail) {
            cartQuery = cartQuery.or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
          } else if (cleanEmail) {
            cartQuery = cartQuery.eq('user_id', cleanEmail);
          } else if (cleanId) {
            cartQuery = cartQuery.eq('user_id', cleanId);
          }

          const { data: cartData } = await cartQuery;
          if (Array.isArray(cartData) && cartData.length > 0) {
            cartData.forEach((row: any) => {
              const prod = resolveProduct(row.product_id || row.productId, row.product_data);
              if (prod) {
                result.cartItems.push({
                  id: row.id || `${prod.id}-${row.selected_size || 'default'}`,
                  productId: prod.id,
                  name: prod.name,
                  image: prod.images?.[0] || 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
                  price: prod.price,
                  quantity: Number(row.quantity) || 1,
                  selectedSize: row.selected_size || row.selectedSize || undefined,
                  selectedColor: row.selected_color || row.selectedColor || undefined,
                  addedAt: row.created_at || new Date().toISOString(),
                });
              }
            });
          }
        }
      } catch (e) {
        console.warn('Fetch customer cart note:', e);
      }

      // 2. Fetch Wishlist Items from Supabase
      try {
        let wishQuery = supabase.from('wishlist').select('*');
        if (cleanId && cleanEmail && cleanId !== cleanEmail) {
          wishQuery = wishQuery.or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
        } else if (cleanEmail) {
          wishQuery = wishQuery.eq('user_id', cleanEmail);
        } else if (cleanId) {
          wishQuery = wishQuery.eq('user_id', cleanId);
        }

        const { data: wishData } = await wishQuery;
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
      } catch (e) {
        console.warn('Fetch customer wishlist note:', e);
      }
    }

    return result;
  },

  // ==================== 4. REVIEWS ====================
  async getReviews(): Promise<RealReview[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('reviews').select('*');
        if (!error && Array.isArray(data)) {
          const mapped: RealReview[] = data.map((d: any) => ({
            id: d.id,
            productName: d.product_name || d.productName,
            author: d.author,
            rating: Number(d.rating),
            comment: d.comment,
            verified: d.verified !== false,
            status: d.status || 'Approved',
            createdAt: d.created_at || new Date().toISOString(),
          }));
          inMemoryReviews = mapped;
          return mapped;
        }
      } catch (e) {}
    }
    return inMemoryReviews;
  },

  async deleteReview(id: string): Promise<void> {
    inMemoryReviews = inMemoryReviews.filter((r) => r.id !== id);
    notifyDatabaseChange('reviews');

    if (isSupabaseConfigured) {
      try {
        await supabase.from('reviews').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase delete review note:', e);
      }
    }
  },

  // ==================== 5. COUPONS ====================
  async getCoupons(): Promise<RealCoupon[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('coupons').select('*');
        if (!error && Array.isArray(data)) {
          const mapped: RealCoupon[] = data.map((d: any) => ({
            id: d.id,
            code: d.code,
            discount: d.discount,
            description: d.description,
            minSpend: Number(d.min_spend || d.minSpend || 0),
            usedCount: Number(d.used_count || d.usedCount || 0),
            status: d.status || 'Active',
            expires: d.expires || '2026-12-31',
          }));
          inMemoryCoupons = mapped;
          return mapped;
        }
      } catch (e) {}
    }
    return inMemoryCoupons;
  },

  async addCoupon(coupon: RealCoupon): Promise<void> {
    inMemoryCoupons = [coupon, ...inMemoryCoupons.filter((c) => c.id !== coupon.id)];
    notifyDatabaseChange('coupons');

    if (isSupabaseConfigured) {
      try {
        await supabase.from('coupons').insert({
          id: coupon.id,
          code: coupon.code,
          discount: coupon.discount,
          description: coupon.description,
          min_spend: coupon.minSpend,
          used_count: coupon.usedCount,
          status: coupon.status,
          expires: coupon.expires,
        });
      } catch (e) {}
    }
  },

  async deleteCoupon(id: string): Promise<void> {
    inMemoryCoupons = inMemoryCoupons.filter((c) => c.id !== id);
    notifyDatabaseChange('coupons');

    if (isSupabaseConfigured) {
      try {
        await supabase.from('coupons').delete().eq('id', id);
      } catch (e) {}
    }
  },

  // ==================== 6. CATEGORIES ====================
  async getCategories(): Promise<RealCategory[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('order_index', { ascending: true });

        if (!error && Array.isArray(data)) {
          const mapped: RealCategory[] = data.map((d: any, idx: number) => ({
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
      } catch (e) {
        console.warn('Supabase fetch categories note:', e);
      }
    }

    return inMemoryCategories;
  },

  async addCategory(categoryData: { name: string; isActive?: boolean }): Promise<RealCategory> {
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

    inMemoryCategories = [...current.filter((c) => c.id !== newCategory.id), newCategory];
    notifyDatabaseChange('categories');

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('categories').insert({
          id: newCategory.id,
          name: newCategory.name,
          slug: newCategory.slug,
          is_active: newCategory.isActive,
          order_index: newCategory.orderIndex,
          created_at: newCategory.createdAt,
        });
        if (error) {
          console.warn('Supabase insert category error:', error);
        }
      } catch (e) {
        console.warn('Supabase insert category note:', e);
      }
    }

    return newCategory;
  },

  async updateCategory(id: string, updates: Partial<RealCategory>): Promise<RealCategory | null> {
    const current = await this.getCategories();
    let updatedCat: RealCategory | null = null;
    const updated = current.map((c) => {
      if (c.id === id || c.slug === id) {
        updatedCat = {
          ...c,
          ...updates,
          ...(updates.name ? { slug: updates.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') } : {}),
        };
        return updatedCat;
      }
      return c;
    });

    inMemoryCategories = updated;
    notifyDatabaseChange('categories');

    if (isSupabaseConfigured && updatedCat) {
      try {
        const { error } = await supabase.from('categories').update({
          name: (updatedCat as RealCategory).name,
          slug: (updatedCat as RealCategory).slug,
          is_active: (updatedCat as RealCategory).isActive,
          order_index: (updatedCat as RealCategory).orderIndex,
        }).or(`id.eq.${id},slug.eq.${id}`);
        if (error) {
          console.warn('Supabase update category error:', error);
          await supabase.from('categories').update({
            name: (updatedCat as RealCategory).name,
            slug: (updatedCat as RealCategory).slug,
            is_active: (updatedCat as RealCategory).isActive,
            order_index: (updatedCat as RealCategory).orderIndex,
          }).eq('id', id);
        }
      } catch (e) {
        console.warn('Supabase update category note:', e);
      }
    }

    return updatedCat;
  },

  async deleteCategory(id: string): Promise<void> {
    inMemoryCategories = inMemoryCategories.filter(
      (c) => c.id !== id && c.slug !== id && c.name.toLowerCase() !== id.toLowerCase()
    );
    notifyDatabaseChange('categories');

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('categories').delete().or(`id.eq.${id},slug.eq.${id}`);
        if (error) {
          console.warn('Supabase delete category error:', error);
          await supabase.from('categories').delete().eq('id', id);
        }
      } catch (e) {
        console.warn('Supabase delete category note:', e);
      }
    }
  },

  async reorderCategories(reorderedList: RealCategory[]): Promise<void> {
    const indexed = reorderedList.map((cat, idx) => ({
      ...cat,
      orderIndex: idx,
    }));

    inMemoryCategories = indexed;
    notifyDatabaseChange('categories');

    if (isSupabaseConfigured) {
      try {
        for (const cat of indexed) {
          await supabase.from('categories').update({ order_index: cat.orderIndex }).or(`id.eq.${cat.id},slug.eq.${cat.slug}`);
        }
      } catch (e) {
        console.warn('Supabase reorder categories note:', e);
      }
    }
  },

  async resetDefaultCategories(): Promise<RealCategory[]> {
    inMemoryCategories = [...SEED_CATEGORIES];
    notifyDatabaseChange('categories');

    if (isSupabaseConfigured) {
      try {
        await supabase.from('categories').delete().neq('id', 'non-existent');
        for (const cat of SEED_CATEGORIES) {
          await supabase.from('categories').insert({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            is_active: cat.isActive,
            order_index: cat.orderIndex,
          });
        }
      } catch (e) {
        console.warn('Supabase reset categories note:', e);
      }
    }

    return SEED_CATEGORIES;
  },

  // ==================== 7. DATABASE HEALTH & TABLE STATUS ====================
  async checkSupabaseStatus(): Promise<{
    isConfigured: boolean;
    url: string;
    tables: { name: string; count: number; status: 'ready' | 'missing' | 'error'; message?: string }[];
  }> {
    const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!isSupabaseConfigured) {
      return {
        isConfigured: false,
        url: rawUrl || 'Not configured in environment variables',
        tables: [
          { name: 'categories', count: inMemoryCategories.length, status: 'missing', message: 'Using in-memory seed fallback' },
          { name: 'products', count: inMemoryProducts.length, status: 'missing', message: 'Using in-memory seed fallback' },
          { name: 'orders', count: inMemoryOrders.length, status: 'missing', message: 'Using in-memory seed fallback' },
          { name: 'reviews', count: inMemoryReviews.length, status: 'missing', message: 'Using in-memory seed fallback' },
          { name: 'coupons', count: inMemoryCoupons.length, status: 'missing', message: 'Using in-memory seed fallback' },
          { name: 'cart_items', count: 0, status: 'missing', message: 'Local storage fallback active' },
          { name: 'wishlist', count: 0, status: 'missing', message: 'Local storage fallback active' },
          { name: 'shipping_addresses', count: 0, status: 'missing', message: 'Local storage fallback active' },
        ],
      };
    }

    const tableNames = ['categories', 'products', 'orders', 'reviews', 'coupons', 'cart_items', 'wishlist', 'shipping_addresses'];
    const results: { name: string; count: number; status: 'ready' | 'missing' | 'error'; message?: string }[] = [];

    for (const tableName of tableNames) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: false });

        if (error) {
          if (error.code === '42P01' || error.message?.toLowerCase().includes('relation') || error.message?.toLowerCase().includes('does not exist')) {
            results.push({ name: tableName, count: 0, status: 'missing', message: 'Table does not exist. Run SQL script to create it.' });
          } else {
            results.push({ name: tableName, count: 0, status: 'error', message: error.message });
          }
        } else {
          results.push({
            name: tableName,
            count: typeof count === 'number' ? count : (Array.isArray(data) ? data.length : 0),
            status: 'ready',
            message: 'Active & connected in Supabase',
          });
        }
      } catch (err: any) {
        results.push({ name: tableName, count: 0, status: 'error', message: err?.message || 'Check failed' });
      }
    }

    return {
      isConfigured: true,
      url: rawUrl,
      tables: results,
    };
  },
};
