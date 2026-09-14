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
  triggerToast: (message: string, submessage?: string, product?: Product, type?: 'cart' | 'wishlist' | 'info' | 'success' | 'error', duration?: number) => void;
  isCartSyncing: boolean;
  refreshCartFromCloud: () => Promise<void>;
}

const FREE_SHIPPING_THRESHOLD = 999;
const STANDARD_SHIPPING_FEE = 99;

const GUEST_CART_STORAGE_KEY = 'girly_tales_guest_cart';

const getUserCartKey = (email?: string | null) => {
  const clean = (email || '').toLowerCase().trim();
  return clean ? `girly_tales_user_cart_${clean}` : GUEST_CART_STORAGE_KEY;
};

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
        const savedUserStr = localStorage.getItem('girly_tales_user_v1');
        if (savedUserStr) {
          const u = JSON.parse(savedUserStr);
          const email = (u?.email || u?.id || '').toLowerCase().trim();
          if (email) {
            const userCartStr = localStorage.getItem(`girly_tales_user_cart_${email}`);
            if (userCartStr) {
              const parsed = JSON.parse(userCartStr);
              if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
              }
            }
          }
        }

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
  const lastLocalCartUpdateRef = useRef<number>(0);

  // Helper to persist in local browser storage instantly
  const persistLocally = useCallback((updated: CartItem[], currentUser: typeof user) => {
    if (typeof window === 'undefined') return;
    try {
      if (currentUser?.email) {
        localStorage.setItem(getUserCartKey(currentUser.email), JSON.stringify(updated));
      } else {
        localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {}
  }, []);

  // 1. Fetch cart directly from Supabase Cloud (with fast parallel race)
  const loadRemoteCart = useCallback(
    async (currentUser: typeof user) => {
      if (!isSupabaseConfigured || !currentUser) {
        return;
      }

      // If user performed an internal cart update in the last 4 seconds, do not clobber it!
      if (Date.now() - lastLocalCartUpdateRef.current < 4000 || isInternalUpdateRef.current) {
        return;
      }

      const userId = currentUser.id || currentUser.email;
      const cleanEmail = (currentUser.email || currentUser.id || '').toLowerCase().trim();
      if (!userId && !cleanEmail) return;

      try {
        const remoteCart = await CartService.fetchUserCart(userId, currentUser.email);
        if (Date.now() - lastLocalCartUpdateRef.current < 4000 || isInternalUpdateRef.current) {
          return;
        }

        if (Array.isArray(remoteCart)) {
          setItems((currentItems) => {
            // Guard: If remote returned empty but local has items updated recently, preserve local
            if (remoteCart.length === 0 && currentItems.length > 0 && Date.now() - lastLocalCartUpdateRef.current < 6000) {
              return currentItems;
            }
            return remoteCart;
          });
          if (cleanEmail && typeof window !== 'undefined') {
            try {
              localStorage.setItem(`girly_tales_user_cart_${cleanEmail}`, JSON.stringify(remoteCart));
            } catch {}
          }
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
    if (isLoggedIn && user && Date.now() - lastLocalCartUpdateRef.current >= 4000 && !isInternalUpdateRef.current) {
      await loadRemoteCart(user);
    }
  }, [isLoggedIn, user, loadRemoteCart]);

  // 2. Load from Supabase on Login / User Change
  useEffect(() => {
    if (isLoggedIn && user) {
      const currentId = (user.email || user.id || '').toLowerCase().trim();
      if (loadedUserRef.current !== currentId) {
        loadedUserRef.current = currentId;

        // Check local cache for 0ms instant display while cloud sync finishes
        try {
          const userSaved = localStorage.getItem(`girly_tales_user_cart_${currentId}`);
          if (userSaved) {
            const parsed = JSON.parse(userSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setItems(parsed);
            }
          }
        } catch {}

        // Check if there was an active guest cart to merge on first login
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
              persistLocally(merged, user);
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
  }, [isLoggedIn, user, loadRemoteCart, persistLocally]);

  // 3. Multi-Device Realtime Sync & Window focus live revalidation
  useEffect(() => {
    if (!isSupabaseConfigured || !isLoggedIn || !user) {
      return;
    }

    const userId = user.id || user.email;
    if (!userId) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && !isInternalUpdateRef.current) {
        loadRemoteCart(user);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Cross-tab broadcast listener on same device
    let bc: any = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('gt_cart_sync');
        bc.onmessage = (e: any) => {
          if (e.data?.type === 'cart_updated' || e.data?.type === 'cart_cleared') {
            loadRemoteCart(user);
          }
        };
      } catch {}
    }

    // Periodic lightweight background sync (every 12 seconds when tab is active)
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isInternalUpdateRef.current) {
        loadRemoteCart(user);
      }
    }, 12000);

    // Supabase Realtime channel
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
      clearInterval(pollInterval);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [isLoggedIn, user, loadRemoteCart]);

  // 4. Auto-purge deleted products from in-memory cart whenever products are modified/deleted in Supabase
  useEffect(() => {
    const handleSync = async (e: any) => {
      const type = e.detail?.type;
      if (!type || type === 'products' || type === 'cart' || type === 'all') {
        if (type === 'cart' && isLoggedIn && user && !isInternalUpdateRef.current) {
          loadRemoteCart(user);
          return;
        }

        try {
          const prods = await DatabaseService.getProducts();
          if (!Array.isArray(prods) || prods.length === 0) return;

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
        } catch {}
      }
    };

    window.addEventListener('gt_db_sync', handleSync);
    return () => window.removeEventListener('gt_db_sync', handleSync);
  }, [isLoggedIn, user, loadRemoteCart]);

  // 5. Cloud Sync Helper to push live cart changes to Supabase
  const scheduleCloudSync = useCallback(
    (updatedItems: CartItem[], immediate = false) => {
      if (!isSupabaseConfigured || !isLoggedIn || !user) {
        return;
      }

      const userId = user.id || user.email;
      if (!userId) return;

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      isInternalUpdateRef.current = true;
      lastLocalCartUpdateRef.current = Date.now();

      const doSync = async () => {
        try {
          await CartService.saveUserCart(userId, updatedItems, user.email);
        } catch (e) {
          console.warn('Supabase cloud cart sync error:', e);
        } finally {
          setTimeout(() => {
            isInternalUpdateRef.current = false;
          }, 1500);
        }
      };

      if (immediate) {
        doSync();
      } else {
        syncTimeoutRef.current = setTimeout(doSync, 200);
      }
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

    lastLocalCartUpdateRef.current = Date.now();
    isInternalUpdateRef.current = true;

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

      persistLocally(updated, user);
      if (isLoggedIn && user) {
        scheduleCloudSync(updated, true);
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
      persistLocally(updated, user);
      if (isLoggedIn && user) {
        scheduleCloudSync(updated);
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
      persistLocally(updated, user);
      if (isLoggedIn && user) {
        scheduleCloudSync(updated);
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
      const cleanEmail = (user.email || user.id || '').toLowerCase().trim();
      if (cleanEmail && typeof window !== 'undefined') {
        try {
          localStorage.removeItem(`girly_tales_user_cart_${cleanEmail}`);
        } catch {}
      }
      const userId = user.id || user.email;
      CartService.clearUserCart(userId, user.email);
    }
  };

  const openCart = () => {
    setIsCartOpen(true);
  };

  const closeCart = () => setIsCartOpen(false);

  const toggleCart = () => {
    setIsCartOpen((prev) => !prev);
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
