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
}

const FREE_SHIPPING_THRESHOLD = 999;
const STANDARD_SHIPPING_FEE = 99;
const CART_STORAGE_KEY = 'girly_tales_cart_v1';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn } = useAuth();
  const { toasts, triggerToast, dismissToast } = useToast();

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [isCartSyncing, setIsCartSyncing] = useState<boolean>(false);

  // Track if initial cloud load has completed for current user
  const loadedUserRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<any>(null);
  const isInternalUpdateRef = useRef<boolean>(false);

  // 1. Synchronize to localStorage whenever items state changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist cart locally:', e);
    }
  }, [items]);

  // 2. Fetch & Merge cart from Supabase when user logs in or switches account
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

        setItems((currentLocalItems) => {
          // If remote cart is empty and local items exist (e.g. added before login), save local items to remote
          if (remoteCart.length === 0 && currentLocalItems.length > 0) {
            CartService.saveUserCart(userId, currentLocalItems, currentUser.email);
            return currentLocalItems;
          }

          // If remote cart has items, intelligently merge with any guest items
          if (remoteCart.length > 0) {
            const mergedMap = new Map<string, CartItem>();

            // Populate remote items first
            remoteCart.forEach((item) => {
              mergedMap.set(item.id, item);
            });

            // Merge local guest items
            currentLocalItems.forEach((localItem) => {
              if (mergedMap.has(localItem.id)) {
                const existing = mergedMap.get(localItem.id)!;
                // Combine quantities or keep highest
                mergedMap.set(localItem.id, {
                  ...existing,
                  quantity: Math.max(existing.quantity, localItem.quantity),
                });
              } else {
                mergedMap.set(localItem.id, localItem);
              }
            });

            const mergedList = Array.from(mergedMap.values());

            // If merging resulted in additions, sync merged state back to Supabase
            if (mergedList.length !== remoteCart.length) {
              CartService.saveUserCart(userId, mergedList, currentUser.email);
            }

            return mergedList;
          }

          return currentLocalItems;
        });
      } catch (err) {
        console.warn('loadRemoteCart error:', err);
      } finally {
        setIsCartSyncing(false);
      }
    },
    []
  );

  // Trigger load when user auth state is established
  useEffect(() => {
    if (isLoggedIn && user) {
      const currentId = user.id || user.email;
      if (loadedUserRef.current !== currentId) {
        loadedUserRef.current = currentId;
        loadRemoteCart(user);
      }
    } else {
      loadedUserRef.current = null;
    }
  }, [isLoggedIn, user, loadRemoteCart]);

  // 3. Realtime Supabase Subscription & Window focus revalidation
  useEffect(() => {
    if (!isSupabaseConfigured || !isLoggedIn || !user) {
      return;
    }

    const userId = user.id || user.email;
    if (!userId) return;

    // A. Window focus / visibility change handler (e.g. user updated cart on phone and opened laptop tab)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadRemoteCart(user);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // B. Supabase Realtime channel
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
          // If remote table changed externally, reload remote cart
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

  // 4. Debounced Sync Helper to push cart changes to Supabase
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
          console.warn('Cloud cart sync error:', e);
        } finally {
          setIsCartSyncing(false);
          // Release internal update flag after short cooldown
          setTimeout(() => {
            isInternalUpdateRef.current = false;
          }, 1000);
        }
      }, 400); // 400ms debounce
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

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

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
