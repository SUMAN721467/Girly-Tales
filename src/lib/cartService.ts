import { supabase, isSupabaseConfigured } from './supabase';
import { CartItem, Product } from '../types/product';
import { MOCK_PRODUCTS } from '../data/products';
import { DatabaseService } from './databaseService';

export const CartService = {
  /**
   * Fetches the user's cart from Supabase.
   * Looks up products in MOCK_PRODUCTS or dynamic products from DatabaseService.
   */
  async fetchUserCart(userId: string, userEmail?: string): Promise<CartItem[]> {
    if (!isSupabaseConfigured || !userId) {
      return [];
    }

    try {
      let query = supabase.from('cart_items').select('*');

      if (userId && userEmail && userId !== userEmail) {
        query = query.or(`user_id.eq.${userId},user_id.eq.${userEmail}`);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
          console.warn('Supabase fetchUserCart note:', error.message);
        }
        return [];
      }

      if (!Array.isArray(data) || data.length === 0) {
        return [];
      }

      // Fetch dynamic products to ensure custom admin-created products can also be reconstructed
      let allProducts: Product[] = MOCK_PRODUCTS;
      try {
        const dynamicProds = await DatabaseService.getProducts();
        if (dynamicProds && dynamicProds.length > 0) {
          allProducts = dynamicProds;
        }
      } catch (e) {
        // Fallback to MOCK_PRODUCTS
      }

      const cartItems: CartItem[] = [];

      for (const row of data) {
        const productId = row.product_id || row.productId;
        const size = row.selected_size || row.selectedSize || undefined;
        const color = row.selected_color || row.selectedColor || undefined;
        const quantity = Number(row.quantity) || 1;

        // Find product definition
        let matchedProduct = allProducts.find(
          (p) => p.id === productId || p.slug === productId
        );

        // Fallback if product data is stored in jsonb
        if (!matchedProduct && row.product_data && typeof row.product_data === 'object') {
          matchedProduct = row.product_data as Product;
        }

        // Fallback to mock product search
        if (!matchedProduct) {
          matchedProduct = MOCK_PRODUCTS.find(
            (p) => p.id === productId || p.slug === productId
          );
        }

        if (matchedProduct) {
          const itemId = `${matchedProduct.id}-${size || 'default'}-${color || 'default'}`;
          cartItems.push({
            id: itemId,
            product: matchedProduct,
            quantity,
            selectedSize: size || undefined,
            selectedColor: color || undefined,
          });
        }
      }

      return cartItems;
    } catch (err: any) {
      console.warn('CartService.fetchUserCart exception:', err);
      return [];
    }
  },

  /**
   * Overwrites the user's remote cart in Supabase with the current items list.
   */
  async saveUserCart(userId: string, items: CartItem[], userEmail?: string): Promise<boolean> {
    if (!isSupabaseConfigured || !userId) {
      return false;
    }

    try {
      // 1. Delete existing cart records for this user
      if (userId && userEmail && userId !== userEmail) {
        await supabase
          .from('cart_items')
          .delete()
          .or(`user_id.eq.${userId},user_id.eq.${userEmail}`);
      } else {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', userId);
      }

      // 2. If cart is not empty, insert the updated items
      if (items.length > 0) {
        const rowsToInsert = items.map((item) => ({
          user_id: userId,
          product_id: item.product.id,
          quantity: item.quantity,
          selected_size: item.selectedSize || '',
          selected_color: item.selectedColor || '',
        }));

        const { error } = await supabase.from('cart_items').insert(rowsToInsert);

        if (error) {
          if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
            console.warn('Supabase saveUserCart error:', error.message);
          }
          return false;
        }
      }

      return true;
    } catch (err: any) {
      console.warn('CartService.saveUserCart exception:', err);
      return false;
    }
  },

  /**
   * Clears the user's cart in Supabase.
   */
  async clearUserCart(userId: string, userEmail?: string): Promise<boolean> {
    if (!isSupabaseConfigured || !userId) {
      return false;
    }

    try {
      if (userId && userEmail && userId !== userEmail) {
        await supabase
          .from('cart_items')
          .delete()
          .or(`user_id.eq.${userId},user_id.eq.${userEmail}`);
      } else {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', userId);
      }
      return true;
    } catch (err) {
      console.warn('CartService.clearUserCart exception:', err);
      return false;
    }
  },
};
