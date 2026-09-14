import {
  supabase,
  isSupabaseConfigured,
  getEffectiveSupabaseUrl,
  getRawSupabaseUrl,
  getSupabaseAnonKey,
} from './supabase';
import { CartItem, Product } from '../types/product';
import { DatabaseService } from './databaseService';
import { MOCK_PRODUCTS } from '../data/products';

// Helper for fast REST cart fetch with candidate URL fallback
async function fetchCartRowsRest(cleanEmail?: string, cleanId?: string): Promise<any[] | null> {
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
      const cleanBase = base.replace(/\/+$/, '');
      const url = `${cleanBase}/rest/v1/cart_items?${filterQuery}&select=*`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(url, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          return rows;
        }
      }
    } catch {
      // try next candidate url
    }
  }
  return null;
}

// Helper for fast REST cart rows deletion
async function deleteCartRowsRest(cleanEmail?: string, cleanId?: string): Promise<boolean> {
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
      const cleanBase = base.replace(/\/+$/, '');
      const url = `${cleanBase}/rest/v1/cart_items?${filterQuery}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok || res.status === 204) return true;
    } catch {
      // continue to fallback
    }
  }
  return false;
}

// Helper for fast REST cart rows insertion
async function insertCartRowsRest(rows: any[]): Promise<boolean> {
  if (!rows || rows.length === 0) return true;
  const anonKey = getSupabaseAnonKey();
  const candidateUrls = [getEffectiveSupabaseUrl(), getRawSupabaseUrl()].filter(Boolean);

  for (const base of candidateUrls) {
    try {
      const cleanBase = base.replace(/\/+$/, '');
      const url = `${cleanBase}/rest/v1/cart_items`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(rows),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok || res.status === 201) return true;
    } catch {
      // continue to fallback
    }
  }
  return false;
}

export const CartService = {
  /**
   * Fetches the user's cart directly from Supabase Cloud:
   * 1. Parallel race: Supabase JS client and Direct PostgREST endpoint
   * 2. Fallback: Supabase Auth user_metadata.cart
   */
  async fetchUserCart(userId?: string, userEmail?: string): Promise<CartItem[]> {
    const cleanEmail = userEmail?.toLowerCase().trim();
    const cleanId = userId?.trim();

    if (!isSupabaseConfigured || (!cleanId && !cleanEmail)) {
      return [];
    }

    // Build product lookup map immediately from cache and mock products for 0ms resolution
    let allProducts: Product[] = [];
    try {
      const cached = DatabaseService.getCachedProducts();
      if (Array.isArray(cached) && cached.length > 0) {
        allProducts = cached;
      }
    } catch {}

    if (allProducts.length === 0) {
      allProducts = MOCK_PRODUCTS;
    }

    const createFallbackProduct = (productId: string, name: string = 'Curated Item'): Product => ({
      id: productId || 'item',
      name,
      slug: productId || 'item',
      category: 'nightwear',
      subCategory: 'Curated Essentials',
      price: 0,
      originalPrice: 0,
      discount: 0,
      rating: 5,
      reviewCount: 0,
      images: ['/assets/logo-line-AXAz0AbL.PNG'],
      description: 'Curated piece from Girly Tales collection.',
      shortDescription: 'Premium essentials for every mood.',
      material: 'Cotton / Silk',
      features: ['Premium Stitching', 'Soft Touch'],
      careInstructions: ['Gentle wash'],
      specs: {},
      inStock: true,
      isNewArrival: false,
      isBestSeller: false,
    });

    const resolveProduct = (productId: string): Product => {
      if (!productId) {
        return createFallbackProduct('unknown', 'Cart Item');
      }
      const cleanPid = String(productId).trim().toLowerCase();
      const matched = allProducts.find(
        (p) =>
          String(p.id).trim().toLowerCase() === cleanPid ||
          String(p.slug).trim().toLowerCase() === cleanPid
      );
      if (matched) return matched;

      // Safe fallback product placeholder so the item is NEVER lost
      return createFallbackProduct(productId);
    };

    // --- 1. Query Supabase Database `cart_items` table via Parallel Race ---
    try {
      // Branch A: Direct REST
      const restPromise = fetchCartRowsRest(cleanEmail, cleanId);

      // Branch B: Supabase JS Client with 2.5s timeout
      const clientPromise = new Promise<any[] | null>(async (resolve) => {
        try {
          let query = supabase.from('cart_items').select('*');
          if (cleanId && cleanEmail && cleanId !== cleanEmail) {
            query = query.or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
          } else if (cleanEmail) {
            query = query.eq('user_id', cleanEmail);
          } else if (cleanId) {
            query = query.eq('user_id', cleanId);
          }

          const timeoutPromise = new Promise<null>((res) => setTimeout(() => res(null), 2500));
          const result: any = await Promise.race([query, timeoutPromise]);
          if (result && !result.error && Array.isArray(result.data)) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });

      // Race both queries
      const rawRows = await Promise.race([
        restPromise.then((rows) => (rows !== null ? rows : clientPromise)),
        clientPromise.then((rows) => (rows !== null ? rows : restPromise)),
      ]);

      if (Array.isArray(rawRows)) {
        if (rawRows.length === 0) {
          return [];
        }

        const dbItems: CartItem[] = [];
        for (const row of rawRows) {
          const productId = row.product_id || row.productId;
          const size = row.selected_size || row.selectedSize || undefined;
          const color = row.selected_color || row.selectedColor || undefined;
          const quantity = Math.max(1, Number(row.quantity) || 1);

          const product = resolveProduct(productId);
          const itemId = `${product.id}-${size || 'default'}-${color || 'default'}`;

          dbItems.push({
            id: itemId,
            product,
            quantity,
            selectedSize: size || undefined,
            selectedColor: color || undefined,
          });
        }

        return dbItems;
      }
    } catch (e) {
      console.warn('CartService database query note:', e);
    }

    // --- 2. Fallback: Check Supabase Auth user_metadata ---
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.user_metadata?.cart) {
        const rawMetaCart = user.user_metadata.cart;
        const parsedList: any[] = Array.isArray(rawMetaCart)
          ? rawMetaCart
          : typeof rawMetaCart === 'string'
          ? JSON.parse(rawMetaCart)
          : [];

        if (parsedList.length > 0) {
          const metaItems: CartItem[] = [];
          for (const item of parsedList) {
            const prodId = item.product?.id || item.productId || item.id;
            const size = item.selectedSize || item.selected_size || undefined;
            const color = item.selectedColor || item.selected_color || undefined;
            const quantity = Math.max(1, Number(item.quantity) || 1);

            const product = item.product?.name ? item.product : resolveProduct(prodId);
            const itemId = `${product.id}-${size || 'default'}-${color || 'default'}`;

            metaItems.push({
              id: itemId,
              product,
              quantity,
              selectedSize: size || undefined,
              selectedColor: color || undefined,
            });
          }

          return metaItems;
        }
      }
    } catch (e) {
      console.warn('CartService auth user_metadata fallback note:', e);
    }

    return [];
  },

  /**
   * Persists the user's cart across devices:
   * 1. Writes to Supabase Database `cart_items` table (with fast REST + client delete & insert)
   * 2. Saves to local user-specific cache for instant 0ms offline boot
   * 3. Syncs to Supabase Auth metadata in background
   */
  async saveUserCart(userId: string | undefined, items: CartItem[], userEmail?: string): Promise<boolean> {
    const cleanEmail = userEmail?.toLowerCase().trim();
    const cleanId = userId?.trim();
    const primaryKey = cleanEmail || cleanId;

    if (!isSupabaseConfigured || !primaryKey) {
      return false;
    }

    // 1. Immediately cache locally for this user
    if (cleanEmail && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`girly_tales_user_cart_${cleanEmail}`, JSON.stringify(items));
      } catch {}
    }

    // 2. Delete existing cart rows for both cleanEmail and cleanId in Supabase
    try {
      const restDeleted = await deleteCartRowsRest(cleanEmail, cleanId);
      if (!restDeleted) {
        if (cleanId && cleanEmail && cleanId !== cleanEmail) {
          await supabase
            .from('cart_items')
            .delete()
            .or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
        } else {
          await supabase.from('cart_items').delete().eq('user_id', primaryKey);
        }
      }
    } catch (delErr) {
      console.warn('CartService database delete note:', delErr);
    }

    // 3. Insert new rows into `cart_items` table
    if (items.length > 0) {
      const rows = items.map((item) => ({
        user_id: primaryKey,
        product_id: item.product.id,
        quantity: item.quantity,
        selected_size: item.selectedSize || '',
        selected_color: item.selectedColor || '',
      }));

      try {
        const restInserted = await insertCartRowsRest(rows);
        if (!restInserted) {
          await supabase.from('cart_items').insert(rows);
        }
      } catch (insErr) {
        console.warn('CartService database insert note:', insErr);
      }
    }

    // 4. Background non-blocking sync to Supabase Auth user_metadata
    try {
      const serializedCart = items.map((i) => ({
        id: i.id,
        productId: i.product.id,
        quantity: i.quantity,
        selectedSize: i.selectedSize || null,
        selectedColor: i.selectedColor || null,
        product: {
          id: i.product.id,
          name: i.product.name,
          slug: i.product.slug,
          price: i.product.price,
          originalPrice: i.product.originalPrice,
          images: i.product.images,
          category: i.product.category,
        },
      }));

      supabase.auth
        .updateUser({
          data: {
            cart: serializedCart,
            cart_updated_at: new Date().toISOString(),
          },
        })
        .catch(() => {});
    } catch {}

    // 5. Broadcast change across open tabs on this device
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('gt_db_sync', { detail: { type: 'cart' } }));
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('gt_cart_sync');
          channel.postMessage({ type: 'cart_updated', email: cleanEmail });
          channel.close();
        }
      } catch {}
    }

    return true;
  },

  /**
   * Clears the user's cart across all devices
   */
  async clearUserCart(userId: string | undefined, userEmail?: string): Promise<boolean> {
    const cleanEmail = userEmail?.toLowerCase().trim();
    const cleanId = userId?.trim();
    const primaryKey = cleanEmail || cleanId;

    if (cleanEmail && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`girly_tales_user_cart_${cleanEmail}`);
      } catch {}
    }

    if (!isSupabaseConfigured) return false;

    // Delete rows in database
    try {
      const restDeleted = await deleteCartRowsRest(cleanEmail, cleanId);
      if (!restDeleted) {
        if (cleanId && cleanEmail && cleanId !== cleanEmail) {
          await supabase
            .from('cart_items')
            .delete()
            .or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
        } else if (primaryKey) {
          await supabase.from('cart_items').delete().eq('user_id', primaryKey);
        }
      }
    } catch {}

    // Update metadata in background
    try {
      supabase.auth
        .updateUser({
          data: {
            cart: [],
            cart_updated_at: new Date().toISOString(),
          },
        })
        .catch(() => {});
    } catch {}

    // Broadcast change
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('gt_db_sync', { detail: { type: 'cart' } }));
        if ('BroadcastChannel' in window) {
          const channel = new BroadcastChannel('gt_cart_sync');
          channel.postMessage({ type: 'cart_cleared', email: cleanEmail });
          channel.close();
        }
      } catch {}
    }

    return true;
  },
};
