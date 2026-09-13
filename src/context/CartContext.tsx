import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Product, CartItem } from '../types/product';
import { useToast, ToastData } from './ToastContext';
import { useAuth } from './AuthContext';
import { CartService } from '../lib/cartService';
import { DatabaseService, RealCoupon } from '../lib/databaseService';
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
  activeCouponObj: RealCoupon | null;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  toasts: ToastData[];
  dismissToast: (id: string) => void;
  triggerToast: (message: string, submessage?: string, product?: Product, type?: 'cart' | 'wishlist' | 'info' | 'success' | 'error') => void;
  isCartSyncing: boolean;
  refreshCartFromCloud: () => Promise<void>;
}

const FREE_SHIPPING_THRESHOLD = 999;
const STANDARD_SHIPPING_FEE = 99;

const GUEST_CART_STORAGE_KEY = 'girly_tales_guest_cart';

const syncGuestCartStorage = (updated: CartItem[]) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn, openAuthModal } = useAuth();
  const { toasts, triggerToast, dismissToast } = useToast();

  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(GUEST_CART_STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [activeCouponObj, setActiveCouponObj] = useState<RealCoupon | null>(null);
  const [dynamicDiscountAmount, setDynamicDiscountAmount] = useState<number>(0);
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
        let guestItems: CartItem[] = [];
        try {
          const saved = localStorage.getItem(GUEST_CART_STORAGE_KEY);
          if (saved) guestItems = JSON.parse(saved);
        } catch {}

        loadRemoteCart(user).then(() => {
          if (guestItems.length > 0) {
            setItems((prev) => {
              const merged = [...prev];
              guestItems.forEach((g) => {
                const idx = merged.findIndex((m) => m.id === g.id);
                if (idx >= 0) {
                  merged[idx].quantity += g.quantity;
                } else {
                  merged.push(g);
                }
              });
              scheduleCloudSync(merged);
              try {
                localStorage.removeItem(GUEST_CART_STORAGE_KEY);
              } catch {}
              return merged;
            });
          }
        });
      }
    } else {
      loadedUserRef.current = null;
      try {
        const saved = localStorage.getItem(GUEST_CART_STORAGE_KEY);
        setItems(saved ? JSON.parse(saved) : []);
      } catch {
        setItems([]);
      }
      setAppliedCoupon(null);
      setActiveCouponObj(null);
      setDynamicDiscountAmount(0);
    }
  }, [isLoggedIn, user, loadRemoteCart]);

  // 3. Realtime Supabase Subscription & Window focus live revalidation
  useEffect(() => {
    if (!isSupabaseConfigured || !isLoggedIn || !user) {
      return;
    }

    const userId = user.id || user.email;
    if (!userId) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadRemoteCart(user);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

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

  // 4. Auto-purge deleted products from in-memory cart whenever products are modified/deleted in Supabase
  useEffect(() => {
    const handleSync = async (e: any) => {
      const type = e.detail?.type;
      if (!type || type === 'products' || type === 'cart' || type === 'all') {
        try {
          const prods = await DatabaseService.getProducts();
          const validIds = new Set(prods.map((p) => String(p.id).toLowerCase().trim()));
          const validSlugs = new Set(prods.map((p) => String(p.slug).toLowerCase().trim()));

          setItems((currentItems) => {
            const filtered = currentItems.filter(
              (it) =>
                validIds.has(String(it.product.id).toLowerCase().trim()) ||
                validSlugs.has(String(it.product.slug).toLowerCase().trim())
            );
            if (filtered.length !== currentItems.length) {
              if (isLoggedIn && user) {
                const userId = user.id || user.email;
                if (userId) {
                  CartService.saveUserCart(userId, filtered, user.email).catch(() => {});
                }
              }
              return filtered;
            }
            return currentItems;
          });
        } catch (err) {}
      }
    };

    window.addEventListener('gt_db_sync', handleSync);
    return () => window.removeEventListener('gt_db_sync', handleSync);
  }, [isLoggedIn, user]);

  // 5. Debounced Sync Helper to push live cart changes to Supabase
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
    const size = selectedSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);
    const defaultColor = (product.colors && product.colors.length > 0)
      ? (typeof product.colors[0] === 'object' ? (product.colors[0] as any)?.name : String(product.colors[0]))
      : undefined;
    const color = selectedColor || defaultColor;
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

      if (isLoggedIn && user) {
        scheduleCloudSync(updated);
      } else {
        syncGuestCartStorage(updated);
      }
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
      if (isLoggedIn && user) {
        scheduleCloudSync(updated);
      } else {
        syncGuestCartStorage(updated);
      }
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
      if (isLoggedIn && user) {
        scheduleCloudSync(updated);
      } else {
        syncGuestCartStorage(updated);
      }
      return updated;
    });
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    setActiveCouponObj(null);
    setDynamicDiscountAmount(0);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      } catch {}
    }
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

  // Recalculate discount whenever subtotal or appliedCoupon changes
  useEffect(() => {
    if (!appliedCoupon) {
      setDynamicDiscountAmount(0);
      return;
    }

    // Re-verify against current subtotal
    DatabaseService.validateCoupon(appliedCoupon, subtotal).then((result) => {
      if (result.valid) {
        setDynamicDiscountAmount(result.discountAmount);
      } else {
        // If minimum spend condition is no longer met after cart modification
        setDynamicDiscountAmount(0);
      }
    }).catch(() => {});
  }, [subtotal, appliedCoupon]);

  const discountAmount = dynamicDiscountAmount;
  const shippingFee =
    subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const freeShippingProgress = Math.min(
    100,
    Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100)
  );

  const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
    const res = await DatabaseService.validateCoupon(code, subtotal);
    if (res.valid && res.coupon) {
      setAppliedCoupon(res.coupon.code);
      setActiveCouponObj(res.coupon);
      setDynamicDiscountAmount(res.discountAmount);
      triggerToast('Coupon Applied! 🎉', res.message, undefined, 'success');
      return { success: true, message: res.message };
    } else {
      triggerToast('Coupon Error', res.message, undefined, 'error');
      return { success: false, message: res.message };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setActiveCouponObj(null);
    setDynamicDiscountAmount(0);
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
        activeCouponObj,
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
