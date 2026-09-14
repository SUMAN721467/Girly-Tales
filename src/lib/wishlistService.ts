import {
  supabase,
  isSupabaseConfigured,
  getEffectiveSupabaseUrl,
  getRawSupabaseUrl,
  getSupabaseAnonKey,
} from './supabase';

async function fetchWishlistRowsRest(cleanEmail?: string, cleanId?: string): Promise<any[] | null> {
  const anonKey = getSupabaseAnonKey();
  const candidateUrls = [getEffectiveSupabaseUrl(), getRawSupabaseUrl()].filter(Boolean);

  let filterQuery = '';
  if (cleanId && cleanEmail && cleanId !== cleanEmail) {
    filterQuery = `or=(user_id.eq.${encodeURIComponent(cleanId)},user_id.eq.${encodeURIComponent(cleanEmail)})`;
  } else if (cleanEmail) {
    filterQuery = `user_id=eq.${encodeURIComponent(cleanEmail)}`;
  } else if (cleanId) {
    filterQuery = `user_id=eq.${encodeURIComponent(cleanId)}`;
  }

  for (const base of candidateUrls) {
    try {
      const cleanBase = base.replace(/\/+$/, '');
      const url = `${cleanBase}/rest/v1/wishlist?${filterQuery}&select=*`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(url, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) return rows;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function insertWishlistRowRest(userId: string, productId: string): Promise<boolean> {
  const anonKey = getSupabaseAnonKey();
  const candidateUrls = [getEffectiveSupabaseUrl(), getRawSupabaseUrl()].filter(Boolean);

  for (const base of candidateUrls) {
    try {
      const cleanBase = base.replace(/\/+$/, '');
      const url = `${cleanBase}/rest/v1/wishlist`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify([{ user_id: userId, product_id: productId }]),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok || res.status === 201) return true;
    } catch {
      // try next
    }
  }
  return false;
}

async function deleteWishlistRowRest(cleanEmail?: string, cleanId?: string, productId?: string): Promise<boolean> {
  const anonKey = getSupabaseAnonKey();
  const candidateUrls = [getEffectiveSupabaseUrl(), getRawSupabaseUrl()].filter(Boolean);

  let filterQuery = '';
  if (productId) {
    filterQuery = `product_id=eq.${encodeURIComponent(productId)}&`;
  }
  if (cleanId && cleanEmail && cleanId !== cleanEmail) {
    filterQuery += `or=(user_id.eq.${encodeURIComponent(cleanId)},user_id.eq.${encodeURIComponent(cleanEmail)})`;
  } else if (cleanEmail) {
    filterQuery += `user_id=eq.${encodeURIComponent(cleanEmail)}`;
  } else if (cleanId) {
    filterQuery += `user_id=eq.${encodeURIComponent(cleanId)}`;
  }

  for (const base of candidateUrls) {
    try {
      const cleanBase = base.replace(/\/+$/, '');
      const url = `${cleanBase}/rest/v1/wishlist?${filterQuery}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok || res.status === 204) return true;
    } catch {
      // try next
    }
  }
  return false;
}

export const WishlistService = {
  /**
   * Fetches user's saved wishlist product IDs from Supabase via high-speed parallel race
   */
  async fetchUserWishlist(userId?: string, userEmail?: string): Promise<string[]> {
    const cleanEmail = userEmail?.toLowerCase().trim();
    const cleanId = userId?.trim();

    if (!isSupabaseConfigured || (!cleanId && !cleanEmail)) {
      return [];
    }

    try {
      // Branch A: Direct REST candidate
      const restPromise = fetchWishlistRowsRest(cleanEmail, cleanId);

      // Branch B: Supabase JS Client with 2.5s timeout
      const clientPromise = new Promise<any[] | null>(async (resolve) => {
        try {
          let query = supabase.from('wishlist').select('product_id');
          if (cleanId && cleanEmail && cleanId !== cleanEmail) {
            query = query.or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
          } else if (cleanEmail) {
            query = query.eq('user_id', cleanEmail);
          } else if (cleanId) {
            query = query.eq('user_id', cleanId);
          }

          const timerPromise = new Promise<null>((res) => setTimeout(() => res(null), 2500));
          const result: any = await Promise.race([query, timerPromise]);
          if (result && !result.error && Array.isArray(result.data)) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });

      const rawRows = await Promise.race([
        restPromise.then((rows) => (rows !== null ? rows : clientPromise)),
        clientPromise.then((rows) => (rows !== null ? rows : restPromise)),
      ]);

      if (Array.isArray(rawRows)) {
        return Array.from(new Set(rawRows.map((r: any) => String(r.product_id || r.productId)).filter(Boolean)));
      }
    } catch (e) {
      console.warn('WishlistService fetch error:', e);
    }

    return [];
  },

  /**
   * Adds an item to the user's wishlist in Supabase
   */
  async addToWishlist(userId?: string, userEmail?: string, productId?: string): Promise<boolean> {
    if (!productId) return false;
    const cleanEmail = userEmail?.toLowerCase().trim();
    const cleanId = userId?.trim();
    const primaryKey = cleanEmail || cleanId;

    if (!isSupabaseConfigured || !primaryKey) {
      return false;
    }

    try {
      const restInserted = await insertWishlistRowRest(primaryKey, productId);
      if (!restInserted) {
        await supabase.from('wishlist').upsert(
          { user_id: primaryKey, product_id: productId },
          { onConflict: 'user_id,product_id' }
        );
      }
    } catch (err) {
      console.warn('WishlistService add note:', err);
    }

    // Broadcast across windows and tabs
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('gt_db_sync', { detail: { type: 'wishlist' } }));
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('gt_wishlist_sync');
          bc.postMessage({ type: 'wishlist_added', productId, email: cleanEmail });
          bc.close();
        }
      } catch {}
    }

    return true;
  },

  /**
   * Removes an item from the user's wishlist in Supabase
   */
  async removeFromWishlist(userId?: string, userEmail?: string, productId?: string): Promise<boolean> {
    if (!productId) return false;
    const cleanEmail = userEmail?.toLowerCase().trim();
    const cleanId = userId?.trim();
    const primaryKey = cleanEmail || cleanId;

    if (!isSupabaseConfigured || !primaryKey) {
      return false;
    }

    try {
      const restDeleted = await deleteWishlistRowRest(cleanEmail, cleanId, productId);
      if (!restDeleted) {
        if (cleanId && cleanEmail && cleanId !== cleanEmail) {
          await supabase
            .from('wishlist')
            .delete()
            .eq('product_id', productId)
            .or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
        } else {
          await supabase
            .from('wishlist')
            .delete()
            .eq('product_id', productId)
            .eq('user_id', primaryKey);
        }
      }
    } catch (err) {
      console.warn('WishlistService remove note:', err);
    }

    // Broadcast across windows and tabs
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('gt_db_sync', { detail: { type: 'wishlist' } }));
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('gt_wishlist_sync');
          bc.postMessage({ type: 'wishlist_removed', productId, email: cleanEmail });
          bc.close();
        }
      } catch {}
    }

    return true;
  },

  /**
   * Clears the user's wishlist in Supabase
   */
  async clearUserWishlist(userId?: string, userEmail?: string): Promise<boolean> {
    const cleanEmail = userEmail?.toLowerCase().trim();
    const cleanId = userId?.trim();
    const primaryKey = cleanEmail || cleanId;

    if (!isSupabaseConfigured || !primaryKey) {
      return false;
    }

    try {
      const restDeleted = await deleteWishlistRowRest(cleanEmail, cleanId);
      if (!restDeleted) {
        if (cleanId && cleanEmail && cleanId !== cleanEmail) {
          await supabase
            .from('wishlist')
            .delete()
            .or(`user_id.eq.${cleanId},user_id.eq.${cleanEmail}`);
        } else {
          await supabase.from('wishlist').delete().eq('user_id', primaryKey);
        }
      }
    } catch {}

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('gt_db_sync', { detail: { type: 'wishlist' } }));
        if ('BroadcastChannel' in window) {
          const bc = new BroadcastChannel('gt_wishlist_sync');
          bc.postMessage({ type: 'wishlist_cleared', email: cleanEmail });
          bc.close();
        }
      } catch {}
    }

    return true;
  },
};
