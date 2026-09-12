import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Product, CartItem } from '../types/product';
import { useToast, ToastData } from './ToastContext';
import { useAuth } from './AuthContext';
import { CartService } from '../lib/cartService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedSize?: string, selectedColor?: string) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQuantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  totalItems: number;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  finalTotal: number;
  freeShippingThreshold: number;
  freeShippingProgress: number;
  appliedCoupon: string | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  toasts: ToastData[];
  dismissToast: (id: string) => void;
  triggerToast: (message: string, submessage?: string, product?: Product, type?: 'cart' | 'wishlist' | 'info' | 'success' | 'error') => void;
  isCartSyncing: boolean;
  refreshCartFromCloud: () => Promise<void>;
}

const FREE_SHIPPING_THRESHOLD = 999;
const STANDARD_SHIPPING_FEE = 99;

// Purge any legacy browser storage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('girly_tales_cart_v1');
    localStorage.removeItem('girly_tales_cart_items');
    sessionStorage.removeItem('girly_tales_cart_v1');
    sessionStorage.removeItem('girly_tales_cart_items');
  } catch (e) {}
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn } = useAuth();
  const { toasts, triggerToast, dismissToast } = useToast();

  // Pure in-memory React state + Realtime Supabase Cloud Cart (No localStorage)
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isCartSyncing, setIsCartSyncing] = useState<boolean>(false);

  const loadedUserRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<any>(null);
  const isInternalUpdateRef = useRef<boolean>(false);

  // 1. Fetch cart directly from Supabase Cloud
  const loadRemoteCart = useCallback(
    async (currentUser: typeof user) => {
      if (!isSupabaseConfigured || !currentUser) {
        return;
      }

      const userId = currentUser.id || currentUser.email;
      if (!userId) return;

      setIsCartSyncing(true);

      try {
        const remoteCart = await CartService.fetchUserCart(userId, currentUser.email);
        if (remoteCart && remoteCart.length > 0) {
          setItems(remoteCart);
        }
      } catch (err) {
        console.warn('loadRemoteCart from Supabase error:', err);
      } finally {
        setIsCartSyncing(false);
      }
    },
    []
  );

  const refreshCartFromCloud = useCallback(async () => {
    if (isLoggedIn && user) {
      await loadRemoteCart(user);
    }
  }, [isLoggedIn, user, loadRemoteCart]);

  // 2. Load from Supabase on Login / User Change
  useEffect(() => {
    if (isLoggedIn && user) {
      const currentId = (user.id || user.email || '').toLowerCase().trim();
      if (loadedUserRef.current !== currentId) {
        loadedUserRef.current = currentId;
        loadRemoteCart(user);
      }
    } else {
      loadedUserRef.current = null;
    }
  }, [isLoggedIn, user, loadRemoteCart]);

  // 3. Realtime Supabase Subscription & Window focus live revalidation
  useEffect(() => {
    if (!isSupabaseConfigured || !isLoggedIn || !user) {
      return;
    }

    const userId = user.id || user.email;
    if (!userId) return;

    // Window focus / visibility change handler
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadRemoteCart(user);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Supabase Realtime channel for instant cross-device updates
    const channelName = `cart_realtime_${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
        },
        () => {
          if (!isInternalUpdateRef.current) {
            loadRemoteCart(user);
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, [isLoggedIn, user, loadRemoteCart]);

  // 4. Debounced Sync Helper to push live in-memory cart changes directly to Supabase
  const scheduleCloudSync = useCallback(
    (updatedItems: CartItem[]) => {
      if (!isSupabaseConfigured || !isLoggedIn || !user) {
        return;
      }

      const userId = user.id || user.email;
      if (!userId) return;

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      isInternalUpdateRef.current = true;

      syncTimeoutRef.current = setTimeout(async () => {
        setIsCartSyncing(true);
        try {
          await CartService.saveUserCart(userId, updatedItems, user.email);
        } catch (e) {
          console.warn('Supabase cloud cart sync error:', e);
        } finally {
          setIsCartSyncing(false);
          setTimeout(() => {
            isInternalUpdateRef.current = false;
          }, 1000);
        }
      }, 300);
    },
    [isLoggedIn, user]
  );

  const addToCart = (
    product: Product,
    quantity: number = 1,
    selectedSize?: string,
    selectedColor?: string
  ) => {
    const size = selectedSize || (product.sizes ? product.sizes[0] : undefined);
    const color = selectedColor || (product.colors ? product.colors[0].name : undefined);
    const itemId = `${product.id}-${size || 'default'}-${color || 'default'}`;

    setItems((prev) => {
      let updated: CartItem[];
      const existing = prev.find((item) => item.id === itemId);
      if (existing) {
        updated = prev.map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        updated = [...prev, { id: itemId, product, quantity, selectedSize: size, selectedColor: color }];
      }

      scheduleCloudSync(updated);
      return updated;
    });

    triggerToast(
      'Added to Cart! ✨',
      `${product.name} ${size ? `(${size})` : ''}`,
      product,
      'cart'
    );
  };

  const removeFromCart = (cartItemId: string) => {
    const item = items.find((i) => i.id === cartItemId);
    setItems((prev) => {
      const updated = prev.filter((i) => i.id !== cartItemId);
      scheduleCloudSync(updated);
      return updated;
    });

    if (item) {
      triggerToast('Removed from cart', item.product.name, undefined, 'info');
    }
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      );
      scheduleCloudSync(updated);
      return updated;
    });
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    if (isLoggedIn && user) {
      const userId = user.id || user.email;
      CartService.clearUserCart(userId, user.email);
    }
  };

  const openCart = () => {
    setIsCartOpen(true);
    if (isLoggedIn && user) {
      loadRemoteCart(user);
    }
  };

  const closeCart = () => setIsCartOpen(false);

  const toggleCart = () => {
    setIsCartOpen((prev) => {
      const next = !prev;
      if (next && isLoggedIn && user) {
        loadRemoteCart(user);
      }
      return next;
    });
  };

  // Totals calculations
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  let discountAmount = 0;
  if (appliedCoupon === 'GIRLY10' || appliedCoupon === 'GIRLYTALES10') {
    discountAmount = Math.round(subtotal * 0.1); // 10% OFF
  } else if (appliedCoupon === 'WELCOME15') {
    discountAmount = Math.round(subtotal * 0.15); // 15% OFF
  } else if (appliedCoupon === 'SHINE200' && subtotal >= 1200) {
    discountAmount = 200; // Flat 200 OFF
  }

  const shippingFee =
    subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const freeShippingProgress = Math.min(
    100,
    Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100)
  );

  const applyCoupon = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode === 'GIRLY10' || cleanCode === 'GIRLYTALES10') {
      setAppliedCoupon('GIRLY10');
      triggerToast('Coupon Applied! 🎉', '10% discount applied to your order', undefined, 'success');
      return { success: true, message: '10% discount applied successfully!' };
    }
    if (cleanCode === 'WELCOME15') {
      setAppliedCoupon('WELCOME15');
      triggerToast('Welcome Offer Applied! 🎉', '15% discount applied', undefined, 'success');
      return { success: true, message: '15% discount applied!' };
    }
    if (cleanCode === 'SHINE200') {
      if (subtotal < 1200) {
        return { success: false, message: 'Requires minimum order value of ₹1,200' };
      }
      setAppliedCoupon('SHINE200');
      triggerToast('Coupon Applied! 🎉', 'Flat ₹200 OFF applied', undefined, 'success');
      return { success: true, message: 'Flat ₹200 discount applied!' };
    }
    return { success: false, message: 'Invalid coupon code. Try GIRLY10 or WELCOME15' };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    triggerToast('Coupon removed', undefined, undefined, 'info');
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
        totalItems,
        subtotal,
        discountAmount,
        shippingFee,
        finalTotal,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
        freeShippingProgress,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        toasts,
        dismissToast,
        triggerToast,
        isCartSyncing,
        refreshCartFromCloud,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
