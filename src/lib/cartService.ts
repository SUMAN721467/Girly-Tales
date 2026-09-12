import { supabase, isSupabaseConfigured } from './supabase';
import { CartItem, Product } from '../types/product';
import { DatabaseService } from './databaseService';

export const CartService = {
  /**
   * Fetches the user's cart directly from Supabase:
   * 1. Supabase Database `cart_items` table
   * 2. Supabase Auth `user_metadata.cart`
   */
  async fetchUserCart(userId?: string, userEmail?: string): Promise<CartItem[]> {
    const cleanEmail = userEmail?.toLowerCase().trim();
    const cleanId = userId?.trim();

    let allProducts: Product[] = [];
    try {
      const dynamicProds = await DatabaseService.getProducts();
      if (Array.isArray(dynamicProds)) {
        allProducts = dynamicProds;
      }
    } catch (e) {}

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

    if (isSupabaseConfigured && (cleanId || cleanEmail)) {
      // --- 1. First priority: Check Supabase Database `cart_items` table ---
      try {
        let query = supabase.from('cart_items').select('*');
        if (cleanId && cleanEmail && cleanId !== cleanEmail) {
          query = query.or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
        } else if (cleanEmail) {
          query = query.eq('user_id', cleanEmail);
        } else if (cleanId) {
          query = query.eq('user_id', cleanId);
        }

        const { data, error } = await query;

        if (!error && Array.isArray(data) && data.length > 0) {
          const dbItems: CartItem[] = [];
          const staleRowIds: string[] = [];

          for (const row of data) {
            const productId = row.product_id || row.productId;
            const size = row.selected_size || row.selectedSize || undefined;
            const color = row.selected_color || row.selectedColor || undefined;
            const quantity = Number(row.quantity) || 1;

            const product = resolveProduct(productId);
            if (product) {
              const itemId = `${product.id}-${size || 'default'}-${color || 'default'}`;
              dbItems.push({
                id: itemId,
                product,
                quantity,
                selectedSize: size || undefined,
                selectedColor: color || undefined,
              });
            } else {
              // Product was deleted from database
              if (row.id) staleRowIds.push(row.id);
            }
          }

          // Clean up stale rows in background
          if (staleRowIds.length > 0) {
            try {
              await supabase.from('cart_items').delete().in('id', staleRowIds);
            } catch (e) {}
          }

          return dbItems;
        }
      } catch (e) {
        console.warn('CartService cart_items table check note:', e);
      }

      // --- 2. Second priority: Check Supabase Auth user_metadata ---
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
              const quantity = Number(item.quantity) || 1;

              const product = resolveProduct(prodId);
              if (product) {
                const itemId = `${product.id}-${size || 'default'}-${color || 'default'}`;
                metaItems.push({
                  id: itemId,
                  product,
                  quantity,
                  selectedSize: size || undefined,
                  selectedColor: color || undefined,
                });
              }
            }

            return metaItems;
          }
        }
      } catch (e) {
        console.warn('CartService auth user_metadata check note:', e);
      }
    }

    return [];
  },

  /**
   * Persists the user's cart to Supabase Database and Auth metadata
   */
  async saveUserCart(userId: string | undefined, items: CartItem[], userEmail?: string): Promise<boolean> {
    const cleanEmail = userEmail?.toLowerCase().trim();
    const cleanId = userId?.trim();
    const primaryKey = cleanEmail || cleanId;

    if (!isSupabaseConfigured || !primaryKey) {
      return false;
    }

    // 1. Sync to Supabase Auth user_metadata
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

      await supabase.auth.updateUser({
        data: {
          cart: serializedCart,
          cart_updated_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.warn('Supabase auth metadata cart update note:', err);
    }

    // 2. Sync to Supabase Database `cart_items` table
    try {
      if (cleanId && cleanEmail && cleanId !== cleanEmail) {
        await supabase
          .from('cart_items')
          .delete()
          .or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
      } else {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', primaryKey);
      }

      if (items.length > 0) {
        const rows = items.map((item) => ({
          user_id: cleanEmail || cleanId,
          product_id: item.product.id,
          quantity: item.quantity,
          selected_size: item.selectedSize || '',
          selected_color: item.selectedColor || '',
        }));

        await supabase.from('cart_items').insert(rows);
      }
    } catch (err) {
      console.warn('Supabase database cart_items insert note:', err);
    }

    return true;
  },

  async clearUserCart(userId: string | undefined, userEmail?: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    const cleanEmail = userEmail?.toLowerCase().trim();
    const cleanId = userId?.trim();

    try {
      await supabase.auth.updateUser({
        data: {
          cart: [],
          cart_updated_at: new Date().toISOString(),
        },
      });
    } catch (e) {}

    try {
      if (cleanId && cleanEmail && cleanId !== cleanEmail) {
        await supabase
          .from('cart_items')
          .delete()
          .or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
      } else if (cleanEmail || cleanId) {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', cleanEmail || cleanId);
      }
    } catch (e) {}

    return true;
  },
};
