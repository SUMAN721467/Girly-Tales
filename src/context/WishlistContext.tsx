import React, { createContext, useContext, useState, useEffect } from 'react';
import { MOCK_PRODUCTS } from '../data/products';
import { Product } from '../types/product';
import { useCart } from './CartContext';

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
      return saved ? JSON.parse(saved) : ['nw-1', 'jw-1']; // seed 2 default favorites
    } catch {
      return ['nw-1', 'jw-1'];
    }
  });

  const { triggerToast } = useCart();

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch (e) {
      console.error('Failed to save wishlist:', e);
    }
  }, [wishlistIds]);

  const toggleWishlist = (productId: string) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    setWishlistIds((prev) => {
      if (prev.includes(productId)) {
        if (product) {
          triggerToast('Removed from Wishlist 💔', product.name, product, 'info');
        }
        return prev.filter((id) => id !== productId);
      } else {
        if (product) {
          triggerToast('Saved to Wishlist 💕', product.name, product, 'wishlist');
        }
        return [...prev, productId];
      }
    });
  };

  const isInWishlist = (productId: string) => wishlistIds.includes(productId);

  const clearWishlist = () => setWishlistIds([]);

  const wishlistProducts = MOCK_PRODUCTS.filter((p) => wishlistIds.includes(p.id));

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
