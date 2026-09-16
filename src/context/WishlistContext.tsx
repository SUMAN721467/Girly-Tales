import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../types/product';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DatabaseService } from '../lib/databaseService';
import { WishlistService } from '../lib/wishlistService';

interface WishlistContextType {
  wishlistIds: string[];
  wishlistProducts: Product[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  wishlistCount: number;
  clearWishlist: () => void;
  refreshWishlist: () => Promise<void>;
}

const GUEST_WISHLIST_KEY = 'girly_tales_guest_wishlist_v1';

const getUserWishlistKey = (email?: string | null) => {
  const clean = (email || '').toLowerCase().trim();
  return clean ? `girly_tales_user_wishlist_${clean}` : GUEST_WISHLIST_KEY;
};

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn } = useAuth();
  const { triggerToast } = useToast();

  // Instant local bootstrap (user-specific cache if logged in, otherwise guest)
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUserStr = localStorage.getItem('girly_tales_user_v1');
        if (savedUserStr) {
          const u = JSON.parse(savedUserStr);
          const email = (u?.email || u?.id || '').toLowerCase().trim();
          if (email) {
            const userSaved = localStorage.getItem(`girly_tales_user_wishlist_${email}`);
            if (userSaved) {
              const parsed = JSON.parse(userSaved);
              if (Array.isArray(parsed)) return parsed;
            }
          }
        }
        const guestSaved = localStorage.getItem(GUEST_WISHLIST_KEY);
        return guestSaved ? JSON.parse(guestSaved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [allProducts, setAllProducts] = useState<Product[]>(() => DatabaseService.getCachedProducts());
  const loadedUserRef = useRef<string | null>(null);
  const isInternalUpdateRef = useRef<boolean>(false);

  // Helper to persist in local browser storage instantly
  const persistWishlistLocally = useCallback((ids: string[], currentUser: typeof user) => {
    if (typeof window === 'undefined') return;
    try {
      if (currentUser?.email) {
        localStorage.setItem(getUserWishlistKey(currentUser.email), JSON.stringify(ids));
      } else {
        localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(ids));
      }
    } catch {}
  }, []);

  // Load catalog products into state
  useEffect(() => {
    const refreshProducts = () => {
      DatabaseService.getProducts().then((prods) => {
        if (Array.isArray(prods) && prods.length > 0) {
          setAllProducts(prods);
        }
      });
    };

    refreshProducts();

    const handleSync = (e: any) => {
      const type = e.detail?.type;
      if (!type || type === 'products' || type === 'all') {
        refreshProducts();
      }
    };

    window.addEventListener('gt_db_sync', handleSync);
    return () => window.removeEventListener('gt_db_sync', handleSync);
  }, []);

  // Fetch remote wishlist from Supabase
  const fetchRemoteWishlist = useCallback(async (): Promise<string[]> => {
    if (!isSupabaseConfigured || !isLoggedIn || !user) {
      return [];
    }
    const cleanEmail = (user.email || user.id || '').toLowerCase().trim();

    try {
      const remoteIds = await WishlistService.fetchUserWishlist(user.id, user.email);
      if (Array.isArray(remoteIds)) {
        setWishlistIds(remoteIds);
        if (cleanEmail && typeof window !== 'undefined') {
          try {
            localStorage.setItem(`girly_tales_user_wishlist_${cleanEmail}`, JSON.stringify(remoteIds));
          } catch {}
        }
        return remoteIds;
      }
    } catch (e) {
      console.warn('Supabase fetch wishlist note:', e);
    }
    return [];
  }, [isLoggedIn, user]);

  const refreshWishlist = useCallback(async () => {
    if (isLoggedIn && user) {
      await fetchRemoteWishlist();
    }
  }, [isLoggedIn, user, fetchRemoteWishlist]);

  // Load from Supabase on Login / User Change & merge guest wishlist
  useEffect(() => {
    if (isLoggedIn && user) {
      const cleanEmail = (user.email || user.id || '').toLowerCase().trim();
      if (loadedUserRef.current !== cleanEmail) {
        loadedUserRef.current = cleanEmail;

        // Check local user cache for 0ms boot
        try {
          const cached = localStorage.getItem(`girly_tales_user_wishlist_${cleanEmail}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setWishlistIds(parsed);
            }
          }
        } catch {}

        // Check guest wishlist to merge
        let guestIds: string[] = [];
        try {
          const guestStr = localStorage.getItem(GUEST_WISHLIST_KEY);
          if (guestStr) guestIds = JSON.parse(guestStr);
        } catch {}

        fetchRemoteWishlist().then((remoteIds) => {
          if (guestIds.length > 0) {
            const merged = Array.from(new Set([...(remoteIds || []), ...guestIds]));
            setWishlistIds(merged);
            persistWishlistLocally(merged, user);
            // Push guest items to cloud
            guestIds.forEach((gid) => {
              WishlistService.addToWishlist(user.id, user.email, gid);
            });
            try {
              localStorage.removeItem(GUEST_WISHLIST_KEY);
            } catch {}
          }
        });
      }
    } else {
      loadedUserRef.current = null;
      try {
        const guestSaved = localStorage.getItem(GUEST_WISHLIST_KEY);
        setWishlistIds(guestSaved ? JSON.parse(guestSaved) : []);
      } catch {
        setWishlistIds([]);
      }
    }
  }, [isLoggedIn, user, fetchRemoteWishlist, persistWishlistLocally]);

  // Multi-Device Realtime Sync & Window focus live revalidation
  useEffect(() => {
    if (!isSupabaseConfigured || !isLoggedIn || !user) {
      return;
    }

    const userId = user.id || user.email;
    if (!userId) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && !isInternalUpdateRef.current) {
        fetchRemoteWishlist();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Cross-tab broadcast listener on same device
    let bc: any = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('gt_wishlist_sync');
        bc.onmessage = (e: any) => {
          if (e.data?.type === 'wishlist_added' || e.data?.type === 'wishlist_removed' || e.data?.type === 'wishlist_cleared') {
            fetchRemoteWishlist();
          }
        };
      } catch {}
    }

    // Periodic lightweight background sync (every 12 seconds when tab is active)
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !isInternalUpdateRef.current) {
        fetchRemoteWishlist();
      }
    }, 12000);

    // Supabase Realtime channel
    const channelName = `wishlist_realtime_${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wishlist',
        },
        () => {
          if (!isInternalUpdateRef.current) {
            fetchRemoteWishlist();
          }
        }
      )
      .subscribe();

    // Listen for global sync events
    const handleGlobalSync = (e: any) => {
      if (e.detail?.type === 'wishlist' && !isInternalUpdateRef.current) {
        fetchRemoteWishlist();
      }
    };
    window.addEventListener('gt_db_sync', handleGlobalSync);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('gt_db_sync', handleGlobalSync);
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
  }, [isLoggedIn, user, fetchRemoteWishlist]);

  const toggleWishlist = async (productId: string) => {
    const product = allProducts.find((p) => p.id === productId || p.slug === productId);
    const exists = wishlistIds.includes(productId);
    const updated = exists
      ? wishlistIds.filter((id) => id !== productId)
      : [...wishlistIds, productId];

    setWishlistIds(updated);
    persistWishlistLocally(updated, user);

    isInternalUpdateRef.current = true;
    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 800);

    if (exists) {
      if (product) {
        triggerToast('Removed from Wishlist 💔', product.name, product, 'info');
      }
      if (isSupabaseConfigured) {
        const uid = (isLoggedIn && user) ? (user.id || user.email) : (typeof window !== 'undefined' ? localStorage.getItem('girly_tales_guest_session_id') : null);
        if (uid) {
          WishlistService.removeFromWishlist(uid, user?.email || 'Guest Shopper', productId);
        }
      }
    } else {
      if (product) {
        triggerToast('Saved to Wishlist 💕', product.name, product, 'wishlist');
      }
      if (isSupabaseConfigured) {
        let uid = (isLoggedIn && user) ? (user.id || user.email) : null;
        if (!uid && typeof window !== 'undefined') {
          uid = localStorage.getItem('girly_tales_guest_session_id');
          if (!uid) {
            uid = `guest_${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('girly_tales_guest_session_id', uid);
          }
        }
        if (uid) {
          WishlistService.addToWishlist(uid, user?.email || 'Guest Shopper', productId);
        }
      }
    }
  };

  const isInWishlist = (productId: string) => wishlistIds.includes(productId);

  const clearWishlist = async () => {
    setWishlistIds([]);
    persistWishlistLocally([], user);
    if (isSupabaseConfigured && isLoggedIn && user) {
      WishlistService.clearUserWishlist(user.id, user.email);
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
        refreshWishlist,
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

