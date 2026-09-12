import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

// Purge any legacy browser storage for wishlist
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('girly_tales_wishlist_v1');
    sessionStorage.removeItem('girly_tales_wishlist_v1');
  } catch (e) {}
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pure in-memory React state - Zero localStorage / browser storage
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const { triggerToast } = useToast();
  const { user, isLoggedIn } = useAuth();

  // Load dynamic catalog products
  useEffect(() => {
    DatabaseService.getProducts().then((prods) => {
      if (Array.isArray(prods)) {
        setAllProducts(prods);
      }
    });
  }, []);

  // Fetch from Supabase when user logs in
  const fetchRemoteWishlist = useCallback(async () => {
    if (!isSupabaseConfigured || !isLoggedIn || !user) {
      return;
    }
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
      if (!error && Array.isArray(data)) {
        const remoteIds = data.map((d: any) => d.product_id).filter(Boolean);
        setWishlistIds(remoteIds);
      }
    } catch (e) {
      console.warn('Supabase fetch wishlist note:', e);
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    if (isLoggedIn && user) {
      fetchRemoteWishlist();
    } else {
      setWishlistIds([]); // Clear in-memory wishlist on logout
    }
  }, [isLoggedIn, user, fetchRemoteWishlist]);

  const toggleWishlist = async (productId: string) => {
    const product = allProducts.find((p) => p.id === productId || p.slug === productId);

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
