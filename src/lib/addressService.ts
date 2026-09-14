import { supabase, isSupabaseConfigured, requireSupabase } from './supabase';
import { ShippingAddress } from '../types/product';
import { fetchSupabaseRestFallback, supabaseRestMutation, formatQueryError } from './databaseService';

// Purge legacy browser storage keys
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('girly_tales_shipping_addresses_v1');
    localStorage.removeItem('girly_tales_saved_addresses_v1');
    sessionStorage.removeItem('girly_tales_shipping_addresses_v1');
    sessionStorage.removeItem('girly_tales_saved_addresses_v1');
  } catch (e) {}
}

// In-memory runtime cache for fast synchronous reads
let inMemoryAddresses: ShippingAddress[] = [];

export const notifyAddressChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gt_addresses_sync'));
  }
};

export const AddressService = {
  clearCache() {
    inMemoryAddresses = [];
    notifyAddressChange();
  },

  // Fetch shipping addresses directly from Supabase Database for a specific user (by email or user_id)
  async getAddresses(userEmail?: string, userId?: string): Promise<ShippingAddress[]> {
    const cleanEmail = (userEmail || '').toLowerCase().trim();
    const cleanUserId = (userId || '').trim();

    if (!cleanEmail && !cleanUserId) {
      inMemoryAddresses = [];
      return [];
    }

    let rows: any[] | null = null;

    if (isSupabaseConfigured) {
      // 1. First attempt via Supabase Client
      try {
        const client = requireSupabase();
        let query = client.from('shipping_addresses').select('*');

        if (cleanEmail && cleanUserId) {
          query = query.or(`user_email.eq.${cleanEmail},user_id.eq.${cleanUserId}`);
        } else if (cleanEmail) {
          query = query.eq('user_email', cleanEmail);
        } else {
          query = query.eq('user_id', cleanUserId);
        }

        const { data, error } = await query
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          rows = data;
        } else if (error) {
          console.warn('[AddressService getAddresses Supabase client failed, trying REST fallback]', error);
        }
      } catch (clientErr) {
        console.warn('[AddressService getAddresses Supabase client threw, trying REST fallback]', clientErr);
      }

      // 2. Direct REST Fallback (uses Anon Key without session cookie issues)
      if (!rows) {
        try {
          let restQuery = '';
          if (cleanEmail && cleanUserId) {
            restQuery = `shipping_addresses?or=(user_email.eq.${encodeURIComponent(cleanEmail)},user_id.eq.${encodeURIComponent(cleanUserId)})&order=is_default.desc,created_at.desc`;
          } else if (cleanEmail) {
            restQuery = `shipping_addresses?user_email=eq.${encodeURIComponent(cleanEmail)}&order=is_default.desc,created_at.desc`;
          } else {
            restQuery = `shipping_addresses?user_id=eq.${encodeURIComponent(cleanUserId)}&order=is_default.desc,created_at.desc`;
          }

          const fallbackData = await fetchSupabaseRestFallback<any[]>(restQuery);
          if (Array.isArray(fallbackData)) {
            rows = fallbackData;
          }
        } catch (restErr) {
          console.warn('[AddressService getAddresses REST fallback error]', restErr);
        }
      }
    }

    if (Array.isArray(rows)) {
      const mapped: ShippingAddress[] = rows.map((d: any) => ({
        id: String(d.id),
        fullName: d.full_name || d.fullName || 'Customer',
        phone: d.phone || '',
        pincode: d.pincode || '',
        city: d.city || '',
        state: d.state || '',
        addressLine: d.address_line || d.addressLine || d.address || '',
        type: (d.type as 'Home' | 'Work' | 'Other') || 'Home',
        isDefault: Boolean(d.is_default || d.isDefault),
        userId: d.user_id || undefined,
        userEmail: d.user_email || undefined,
      }));

      inMemoryAddresses = mapped;
      return mapped;
    }

    return inMemoryAddresses;
  },

  getAddressesSync(): ShippingAddress[] {
    return inMemoryAddresses;
  },

  // Save new shipping address into Supabase Database linked with userEmail and userId
  async addAddress(
    addressData: Omit<ShippingAddress, 'id'>,
    userEmail?: string,
    userId?: string
  ): Promise<ShippingAddress> {
    const cleanEmail = (userEmail || '').toLowerCase().trim();
    const cleanUserId = (userId || '').trim();
    const newId = 'addr-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const shouldBeDefault = addressData.isDefault || inMemoryAddresses.length === 0;

    const newAddress: ShippingAddress = {
      ...addressData,
      id: newId,
      isDefault: shouldBeDefault,
      userEmail: cleanEmail || undefined,
      userId: cleanUserId || undefined,
    };

    const payload = {
      id: newId,
      user_email: cleanEmail,
      user_id: cleanUserId || null,
      full_name: addressData.fullName,
      phone: addressData.phone,
      pincode: addressData.pincode,
      city: addressData.city,
      state: addressData.state,
      address_line: addressData.addressLine,
      type: addressData.type || 'Home',
      is_default: shouldBeDefault,
      created_at: new Date().toISOString(),
    };

    // If new address is set as default, reset other addresses is_default in Supabase
    if (shouldBeDefault && (cleanEmail || cleanUserId)) {
      try {
        const client = requireSupabase();
        let query = client.from('shipping_addresses').update({ is_default: false });
        if (cleanEmail && cleanUserId) {
          await query.or(`user_email.eq.${cleanEmail},user_id.eq.${cleanUserId}`);
        } else if (cleanEmail) {
          await query.eq('user_email', cleanEmail);
        } else {
          await query.eq('user_id', cleanUserId);
        }
      } catch {
        const resetFilter = cleanEmail && cleanUserId
          ? `or=(user_email.eq.${encodeURIComponent(cleanEmail)},user_id.eq.${encodeURIComponent(cleanUserId)})`
          : cleanEmail
          ? `user_email=eq.${encodeURIComponent(cleanEmail)}`
          : `user_id=eq.${encodeURIComponent(cleanUserId)}`;
        await supabaseRestMutation('shipping_addresses', 'PATCH', resetFilter, { is_default: false });
      }
    }

    // 1. Call Supabase Client
    let insertErr: any = null;
    try {
      const client = requireSupabase();
      const { error } = await client.from('shipping_addresses').insert(payload);
      insertErr = error;
    } catch (err) {
      insertErr = err;
    }

    // 2. Direct REST Fallback
    if (insertErr) {
      console.warn('[AddressService addAddress Supabase client failed, trying REST mutation]', insertErr);
      const ok = await supabaseRestMutation('shipping_addresses', 'POST', '', payload, 'return=representation');
      if (!ok) {
        console.error('Supabase addAddress failed completely:', insertErr);
        throw new Error(`Failed to save shipping address: ${formatQueryError(insertErr)}`);
      }
    }

    // 3. Update in-memory runtime cache
    const updated = shouldBeDefault
      ? inMemoryAddresses.map((a) => ({ ...a, isDefault: false }))
      : [...inMemoryAddresses];

    inMemoryAddresses = [newAddress, ...updated];
    notifyAddressChange();
    return newAddress;
  },

  // Update existing address in Supabase Database
  async updateAddress(
    id: string,
    updatedFields: Partial<ShippingAddress>,
    userEmail?: string,
    userId?: string
  ): Promise<ShippingAddress> {
    const cleanEmail = (userEmail || '').toLowerCase().trim();
    const cleanUserId = (userId || '').trim();
    const isSettingDefault = updatedFields.isDefault;

    if (isSettingDefault && (cleanEmail || cleanUserId)) {
      try {
        const client = requireSupabase();
        let query = client.from('shipping_addresses').update({ is_default: false });
        if (cleanEmail && cleanUserId) {
          await query.or(`user_email.eq.${cleanEmail},user_id.eq.${cleanUserId}`);
        } else if (cleanEmail) {
          await query.eq('user_email', cleanEmail);
        } else {
          await query.eq('user_id', cleanUserId);
        }
      } catch {
        const resetFilter = cleanEmail && cleanUserId
          ? `or=(user_email.eq.${encodeURIComponent(cleanEmail)},user_id.eq.${encodeURIComponent(cleanUserId)})`
          : cleanEmail
          ? `user_email=eq.${encodeURIComponent(cleanEmail)}`
          : `user_id=eq.${encodeURIComponent(cleanUserId)}`;
        await supabaseRestMutation('shipping_addresses', 'PATCH', resetFilter, { is_default: false });
      }
    }

    const updatePayload: any = {};
    if (updatedFields.fullName !== undefined) updatePayload.full_name = updatedFields.fullName;
    if (updatedFields.phone !== undefined) updatePayload.phone = updatedFields.phone;
    if (updatedFields.pincode !== undefined) updatePayload.pincode = updatedFields.pincode;
    if (updatedFields.city !== undefined) updatePayload.city = updatedFields.city;
    if (updatedFields.state !== undefined) updatePayload.state = updatedFields.state;
    if (updatedFields.addressLine !== undefined) updatePayload.address_line = updatedFields.addressLine;
    if (updatedFields.type !== undefined) updatePayload.type = updatedFields.type;
    if (updatedFields.isDefault !== undefined) updatePayload.is_default = updatedFields.isDefault;
    if (cleanEmail) updatePayload.user_email = cleanEmail;
    if (cleanUserId) updatePayload.user_id = cleanUserId;

    // 1. Call Supabase Client
    let updateErr: any = null;
    try {
      const client = requireSupabase();
      const { error } = await client.from('shipping_addresses').update(updatePayload).eq('id', id);
      updateErr = error;
    } catch (err) {
      updateErr = err;
    }

    // 2. Direct REST Fallback
    if (updateErr) {
      console.warn('[AddressService updateAddress Supabase client failed, trying REST mutation]', updateErr);
      const ok = await supabaseRestMutation(
        'shipping_addresses',
        'PATCH',
        `id=eq.${encodeURIComponent(id)}`,
        updatePayload,
        'return=representation'
      );
      if (!ok) {
        throw new Error(`Failed to update shipping address: ${formatQueryError(updateErr)}`);
      }
    }

    // 3. Update cache
    inMemoryAddresses = inMemoryAddresses.map((addr) => {
      if (addr.id === id) {
        return {
          ...addr,
          ...updatedFields,
          userEmail: cleanEmail || addr.userEmail,
          userId: cleanUserId || addr.userId,
        };
      }
      if (isSettingDefault) {
        return { ...addr, isDefault: false };
      }
      return addr;
    });

    notifyAddressChange();
    const updated = inMemoryAddresses.find((a) => a.id === id);
    if (!updated) throw new Error('Address not found after update');
    return updated;
  },

  // Permanently delete address from Supabase Database
  async deleteAddress(id: string): Promise<void> {
    let delErr: any = null;
    try {
      const client = requireSupabase();
      const { error } = await client.from('shipping_addresses').delete().eq('id', id);
      delErr = error;
    } catch (err) {
      delErr = err;
    }

    if (delErr) {
      console.warn('[AddressService deleteAddress Supabase client failed, trying REST mutation]', delErr);
      const ok = await supabaseRestMutation('shipping_addresses', 'DELETE', `id=eq.${encodeURIComponent(id)}`);
      if (!ok) {
        throw new Error(`Failed to delete shipping address: ${formatQueryError(delErr)}`);
      }
    }

    // Update cache
    const remaining = inMemoryAddresses.filter((a) => a.id !== id);
    if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
      remaining[0].isDefault = true;
      this.setDefaultAddress(remaining[0].id).catch(() => {});
    }

    inMemoryAddresses = remaining;
    notifyAddressChange();
  },

  // Set default shipping address in Supabase Database
  async setDefaultAddress(id: string, userEmail?: string, userId?: string): Promise<void> {
    const cleanEmail = (userEmail || '').toLowerCase().trim();
    const cleanUserId = (userId || '').trim();

    if (cleanEmail || cleanUserId) {
      try {
        const client = requireSupabase();
        let query = client.from('shipping_addresses').update({ is_default: false });
        if (cleanEmail && cleanUserId) {
          await query.or(`user_email.eq.${cleanEmail},user_id.eq.${cleanUserId}`);
        } else if (cleanEmail) {
          await query.eq('user_email', cleanEmail);
        } else {
          await query.eq('user_id', cleanUserId);
        }
      } catch {
        const resetFilter = cleanEmail && cleanUserId
          ? `or=(user_email.eq.${encodeURIComponent(cleanEmail)},user_id.eq.${encodeURIComponent(cleanUserId)})`
          : cleanEmail
          ? `user_email=eq.${encodeURIComponent(cleanEmail)}`
          : `user_id=eq.${encodeURIComponent(cleanUserId)}`;
        await supabaseRestMutation('shipping_addresses', 'PATCH', resetFilter, { is_default: false });
      }
    }

    let setErr: any = null;
    try {
      const client = requireSupabase();
      const { error } = await client.from('shipping_addresses').update({ is_default: true }).eq('id', id);
      setErr = error;
    } catch (err) {
      setErr = err;
    }

    if (setErr) {
      const ok = await supabaseRestMutation(
        'shipping_addresses',
        'PATCH',
        `id=eq.${encodeURIComponent(id)}`,
        { is_default: true }
      );
      if (!ok) {
        throw new Error(`Failed to set default address: ${formatQueryError(setErr)}`);
      }
    }

    inMemoryAddresses = inMemoryAddresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));

    notifyAddressChange();
  },
};
