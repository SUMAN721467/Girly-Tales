import { supabase, isSupabaseConfigured } from './supabase';
import { Product } from '../types/product';
import { MOCK_PRODUCTS } from '../data/products';

// Clear legacy browser storage keys to guarantee no stale caches interfere with Supabase
if (typeof window !== 'undefined') {
  try {
    const keysToRemove = [
      'girly_tales_db_orders_v1',
      'girly_tales_db_products_v1',
      'girly_tales_db_reviews_v1',
      'girly_tales_db_coupons_v1',
      'girly_tales_db_categories_v1',
      'girly_tales_db_settings_v1',
      'girly_tales_db_promotions_v1',
      'girly_tales_db_shipping_v1',
      'girly_tales_db_faqs_v1',
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {}
}

// Global live sync broadcaster for real-time reactivity across components
export const notifyDatabaseChange = (type: 'categories' | 'products' | 'orders' | 'reviews' | 'coupons' | 'all') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gt_db_sync', { detail: { type } }));
  }
};

export interface RealOrder {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  items: string[];
  total: number;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentMethod: 'UPI / Prepaid' | 'Cash on Delivery' | 'Credit / Debit Card';
  address: string;
  city: string;
  state: string;
  pincode: string;
  createdAt: string;
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

export interface RealCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  ordersCount: number;
  totalSpent: number;
  tier: 'VIP Platinum' | 'VIP Gold' | 'Member';
  joinedDate: string;
  lastOrderDate: string;
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
    id: 'GT-849201',
    customerName: 'Sabara Khan',
    email: 'contact.sabara@gmail.com',
    phone: '+91 98201 45982',
    items: ['Mulberry Silk Pajama Set - Blossom Pink (M)', '18K Gold Clover Pendant Necklace'],
    total: 2998,
    subtotal: 2998,
    shippingFee: 0,
    discountAmount: 0,
    status: 'Processing',
    paymentMethod: 'UPI / Prepaid',
    address: 'Flat 402, Sea View Apartments, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'GT-849188',
    customerName: 'Priya Sharma',
    email: 'priya.s@gmail.com',
    phone: '+91 98112 34567',
    items: ['Celestial Constellation 18K Chain (Gold)'],
    total: 899,
    subtotal: 899,
    shippingFee: 0,
    discountAmount: 0,
    status: 'Shipped',
    paymentMethod: 'UPI / Prepaid',
    address: 'House 14, Greater Kailash 1',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110048',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'GT-849140',
    customerName: 'Ananya Verma',
    email: 'ananya.v@yahoo.com',
    phone: '+91 97234 56789',
    items: ['Cloud Soft Modal Nightshirt - Lavender Mist (L)', 'Pearl Aura Huggie Earrings'],
    total: 1998,
    subtotal: 1998,
    shippingFee: 0,
    discountAmount: 0,
    status: 'Delivered',
    paymentMethod: 'Cash on Delivery',
    address: 'B-104, Palm Meadows, Whitefield',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560066',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  }
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

// In-memory runtime state for network fallbacks (ZERO browser storage persistence)
let inMemoryCategories: RealCategory[] = [...SEED_CATEGORIES];
let inMemoryProducts: Product[] = [...MOCK_PRODUCTS];
let inMemoryOrders: RealOrder[] = [...SEED_ORDERS];
let inMemoryReviews: RealReview[] = [...SEED_REVIEWS];
let inMemoryCoupons: RealCoupon[] = [...SEED_COUPONS];
let hasInitializedCategoriesInSupabase = false;

export const DatabaseService = {
  // ==================== 1. ORDERS (SUPABASE DIRECT) ====================
  async getOrders(): Promise<RealOrder[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const mapped: RealOrder[] = data.map((d: any) => ({
            id: d.id || d.order_id,
            customerName: d.customer_name || d.customerName || 'Customer',
            email: d.email || '',
            phone: d.phone || '',
            items: Array.isArray(d.items) ? d.items : typeof d.items === 'string' ? JSON.parse(d.items) : [],
            total: Number(d.total) || 0,
            subtotal: Number(d.subtotal) || Number(d.total) || 0,
            shippingFee: Number(d.shipping_fee) || 0,
            discountAmount: Number(d.discount_amount) || 0,
            status: d.status || 'Processing',
            paymentMethod: d.payment_method || d.paymentMethod || 'UPI / Prepaid',
            address: d.address || '',
            city: d.city || 'Mumbai',
            state: d.state || 'Maharashtra',
            pincode: d.pincode || '',
            createdAt: d.created_at || new Date().toISOString(),
          }));
          inMemoryOrders = mapped;
          return mapped;
        }
      } catch (err) {
        console.warn('Supabase fetch orders error:', err);
      }
    }
    return inMemoryOrders;
  },

  async createOrder(order: Omit<RealOrder, 'createdAt'> & { createdAt?: string }): Promise<RealOrder> {
    const fullOrder: RealOrder = {
      ...order,
      createdAt: order.createdAt || new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('orders').insert({
          id: fullOrder.id,
          customer_name: fullOrder.customerName,
          email: fullOrder.email,
          phone: fullOrder.phone,
          items: fullOrder.items,
          total: fullOrder.total,
          subtotal: fullOrder.subtotal,
          shipping_fee: fullOrder.shippingFee,
          discount_amount: fullOrder.discountAmount,
          status: fullOrder.status,
          payment_method: fullOrder.paymentMethod,
          address: fullOrder.address,
          city: fullOrder.city,
          state: fullOrder.state,
          pincode: fullOrder.pincode,
          created_at: fullOrder.createdAt,
        });
      } catch (e) {
        console.warn('Supabase order insert note:', e);
      }
    }

    inMemoryOrders = [fullOrder, ...inMemoryOrders.filter((o) => o.id !== fullOrder.id)];
    notifyDatabaseChange('orders');
    return fullOrder;
  },

  async updateOrderStatus(orderId: string, status: RealOrder['status']): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('orders').update({ status }).eq('id', orderId);
      } catch (e) {
        console.warn('Supabase order status update note:', e);
      }
    }

    inMemoryOrders = inMemoryOrders.map((o) => (o.id === orderId ? { ...o, status } : o));
    notifyDatabaseChange('orders');
  },

  // ==================== 2. PRODUCTS (SUPABASE DIRECT) ====================
  async getProducts(): Promise<Product[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: Product[] = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            slug: d.slug || d.id,
            category: d.category,
            subCategory: d.sub_category || d.subCategory || '',
            price: Number(d.price),
            originalPrice: Number(d.original_price || d.originalPrice || d.price),
            discount: Number(d.discount || 0),
            rating: Number(d.rating || 5.0),
            reviewCount: Number(d.review_count || d.reviewCount || 1),
            images: Array.isArray(d.images) ? d.images : typeof d.images === 'string' ? JSON.parse(d.images) : [d.image_url || ''],
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
            careInstructions: d.care_instructions || d.careInstructions || [],
            specs: d.specs || {},
          }));
          inMemoryProducts = mapped;
          return mapped;
        }
      } catch (err) {
        console.warn('Supabase getProducts note:', err);
      }
    }
    return inMemoryProducts;
  },

  async addProduct(product: Product): Promise<Product> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('products').insert({
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
        });
      } catch (e) {
        console.warn('Supabase add product note:', e);
      }
    }

    inMemoryProducts = [product, ...inMemoryProducts.filter((p) => p.id !== product.id)];
    notifyDatabaseChange('products');
    return product;
  },

  async updateProductStock(productId: string, inStock: boolean): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('products').update({ in_stock: inStock }).eq('id', productId);
      } catch (e) {}
    }

    inMemoryProducts = inMemoryProducts.map((p) => (p.id === productId ? { ...p, inStock } : p));
    notifyDatabaseChange('products');
  },

  async deleteProduct(productId: string): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('products').delete().eq('id', productId);
      } catch (e) {}
    }

    inMemoryProducts = inMemoryProducts.filter((p) => p.id !== productId);
    notifyDatabaseChange('products');
  },

  // ==================== 3. CUSTOMERS (DERIVED FROM SUPABASE RECORDS) ====================
  async getCustomers(orders?: RealOrder[]): Promise<RealCustomer[]> {
    const allOrders = orders || (await this.getOrders());
    const customerMap = new Map<string, RealCustomer>();

    allOrders.forEach((ord) => {
      const email = ord.email.toLowerCase().trim();
      if (!email) return;

      const existing = customerMap.get(email);
      if (existing) {
        existing.ordersCount += 1;
        existing.totalSpent += ord.total;
        if (existing.totalSpent >= 5000) existing.tier = 'VIP Platinum';
        else if (existing.totalSpent >= 2000) existing.tier = 'VIP Gold';
      } else {
        const tier = ord.total >= 5000 ? 'VIP Platinum' : ord.total >= 2000 ? 'VIP Gold' : 'Member';
        const formattedDate = new Date(ord.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        customerMap.set(email, {
          id: `cust-${email}`,
          name: ord.customerName || 'Customer',
          email: ord.email,
          phone: ord.phone,
          city: ord.city || 'India',
          ordersCount: 1,
          totalSpent: ord.total,
          tier,
          joinedDate: formattedDate,
          lastOrderDate: ord.createdAt,
        });
      }
    });

    return Array.from(customerMap.values());
  },

  // ==================== 4. REVIEWS (SUPABASE DIRECT) ====================
  async getReviews(): Promise<RealReview[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('reviews').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
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

  // ==================== 5. COUPONS (SUPABASE DIRECT) ====================
  async getCoupons(): Promise<RealCoupon[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('coupons').select('*');
        if (!error && Array.isArray(data) && data.length > 0) {
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

    inMemoryCoupons = [coupon, ...inMemoryCoupons.filter((c) => c.id !== coupon.id)];
    notifyDatabaseChange('coupons');
  },

  // ==================== 6. CATEGORIES (SUPABASE DIRECT, NO LOCAL STORAGE) ====================
  async getCategories(): Promise<RealCategory[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('order_index', { ascending: true });

        if (!error && Array.isArray(data)) {
          // If table is newly created and completely empty on initial run, insert seed rows once into Supabase
          if (data.length === 0 && !hasInitializedCategoriesInSupabase) {
            hasInitializedCategoriesInSupabase = true;
            for (const cat of SEED_CATEGORIES) {
              await supabase.from('categories').insert({
                id: cat.id,
                name: cat.name,
                slug: cat.slug,
                is_active: cat.isActive,
                order_index: cat.orderIndex,
              });
            }
            inMemoryCategories = SEED_CATEGORIES;
            return SEED_CATEGORIES;
          }

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

    if (isSupabaseConfigured) {
      try {
        await supabase.from('categories').insert({
          id: newCategory.id,
          name: newCategory.name,
          slug: newCategory.slug,
          is_active: newCategory.isActive,
          order_index: newCategory.orderIndex,
          created_at: newCategory.createdAt,
        });
      } catch (e) {
        console.warn('Supabase insert category note:', e);
      }
    }

    inMemoryCategories = [...current.filter((c) => c.id !== newCategory.id), newCategory];
    notifyDatabaseChange('categories');
    return newCategory;
  },

  async updateCategory(id: string, updates: Partial<RealCategory>): Promise<RealCategory | null> {
    const current = await this.getCategories();
    let updatedCat: RealCategory | null = null;
    const updated = current.map((c) => {
      if (c.id === id) {
        updatedCat = {
          ...c,
          ...updates,
          ...(updates.name ? { slug: updates.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') } : {}),
        };
        return updatedCat;
      }
      return c;
    });

    if (isSupabaseConfigured && updatedCat) {
      try {
        await supabase.from('categories').update({
          name: (updatedCat as RealCategory).name,
          slug: (updatedCat as RealCategory).slug,
          is_active: (updatedCat as RealCategory).isActive,
          order_index: (updatedCat as RealCategory).orderIndex,
        }).eq('id', id);
      } catch (e) {
        console.warn('Supabase update category note:', e);
      }
    }

    inMemoryCategories = updated;
    notifyDatabaseChange('categories');
    return updatedCat;
  },

  async deleteCategory(id: string): Promise<void> {
    inMemoryCategories = inMemoryCategories.filter((c) => c.id !== id);
    notifyDatabaseChange('categories');

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) {
          console.warn('Supabase delete error:', error);
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

    if (isSupabaseConfigured) {
      try {
        for (const cat of indexed) {
          await supabase.from('categories').update({ order_index: cat.orderIndex }).eq('id', cat.id);
        }
      } catch (e) {
        console.warn('Supabase reorder categories note:', e);
      }
    }

    inMemoryCategories = indexed;
    notifyDatabaseChange('categories');
  },

  async resetDefaultCategories(): Promise<RealCategory[]> {
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

    inMemoryCategories = [...SEED_CATEGORIES];
    notifyDatabaseChange('categories');
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
        ],
      };
    }

    const tableNames = ['categories', 'products', 'orders', 'reviews', 'coupons'];
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
