import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MOCK_PRODUCTS } from '../data/products';
import { Product } from '../types/product';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DatabaseService } from '../lib/databaseService';

interface WishlistContextType {
  wishlistIds: string[];
  wishlistProducts: Product[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  wishlistCount: number;
  clearWishlist: () => void;
}

const WISHLIST_STORAGE_KEY = 'girly_tales_wishlist_v1';

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : ['nw-1', 'jw-1'];
    } catch {
      return ['nw-1', 'jw-1'];
    }
  });

  const [allProducts, setAllProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const { triggerToast } = useToast();
  const { user, isLoggedIn } = useAuth();

  // Load dynamic catalog products
  useEffect(() => {
    DatabaseService.getProducts().then((prods) => {
      if (prods && prods.length > 0) {
        setAllProducts(prods);
      }
    });
  }, []);

  // Fetch from Supabase when user logs in
  const fetchRemoteWishlist = useCallback(async () => {
    if (!isSupabaseConfigured || !isLoggedIn || !user) return;
    const userId = user.id || user.email;
    const userEmail = user.email;

    try {
      let query = supabase.from('wishlist').select('product_id');
      if (userId && userEmail && userId !== userEmail) {
        query = query.or(`user_id.eq.${userId},user_id.eq.${userEmail}`);
      } else {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        const remoteIds = data.map((d: any) => d.product_id).filter(Boolean);
        setWishlistIds((prev) => {
          // Merge local and remote IDs without duplicates
          const combined = Array.from(new Set([...remoteIds, ...prev]));
          return combined;
        });
      }
    } catch (e) {
      console.warn('Supabase fetch wishlist note:', e);
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (isLoggedIn && user) {
      fetchRemoteWishlist();
    }
  }, [isLoggedIn, user, fetchRemoteWishlist]);

  // Persist locally
  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch (e) {
      console.error('Failed to save wishlist:', e);
    }
  }, [wishlistIds]);

  const toggleWishlist = async (productId: string) => {
    const product = allProducts.find((p) => p.id === productId || p.slug === productId) ||
      MOCK_PRODUCTS.find((p) => p.id === productId || p.slug === productId);

    const exists = wishlistIds.includes(productId);

    if (exists) {
      setWishlistIds((prev) => prev.filter((id) => id !== productId));
      if (product) {
        triggerToast('Removed from Wishlist 💔', product.name, product, 'info');
      }

      if (isSupabaseConfigured && isLoggedIn && user) {
        const userId = user.id || user.email;
        try {
          await supabase
            .from('wishlist')
            .delete()
            .eq('product_id', productId)
            .or(`user_id.eq.${userId},user_id.eq.${user.email}`);
        } catch (e) {}
      }
    } else {
      setWishlistIds((prev) => [...prev, productId]);
      if (product) {
        triggerToast('Saved to Wishlist 💕', product.name, product, 'wishlist');
      }

      if (isSupabaseConfigured && isLoggedIn && user) {
        const userId = user.id || user.email;
        try {
          await supabase.from('wishlist').insert({
            user_id: userId,
            product_id: productId,
          });
        } catch (e) {}
      }
    }
  };

  const isInWishlist = (productId: string) => wishlistIds.includes(productId);

  const clearWishlist = async () => {
    setWishlistIds([]);
    if (isSupabaseConfigured && isLoggedIn && user) {
      const userId = user.id || user.email;
      try {
        await supabase
          .from('wishlist')
          .delete()
          .or(`user_id.eq.${userId},user_id.eq.${user.email}`);
      } catch (e) {}
    }
  };

  const wishlistProducts = allProducts.filter((p) => wishlistIds.includes(p.id) || wishlistIds.includes(p.slug));

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistProducts,
        toggleWishlist,
        isInWishlist,
        wishlistCount: wishlistIds.length,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
