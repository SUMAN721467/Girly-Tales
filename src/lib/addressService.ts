import { supabase, isSupabaseConfigured, requireSupabase } from './supabase';
import { ShippingAddress } from '../types/product';

// Purge any legacy browser storage keys
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('girly_tales_shipping_addresses_v1');
    localStorage.removeItem('girly_tales_saved_addresses_v1');
    sessionStorage.removeItem('girly_tales_shipping_addresses_v1');
    sessionStorage.removeItem('girly_tales_saved_addresses_v1');
  } catch (e) {}
}

// In-memory runtime cache for fast synchronous reads (updated ONLY after successful DB operations)
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

  // Fetch shipping addresses directly from Supabase Database for a specific user
  async getAddresses(userEmail?: string): Promise<ShippingAddress[]> {
    if (!userEmail) {
      inMemoryAddresses = [];
      return [];
    }

    const normalizedEmail = userEmail.toLowerCase().trim();

    if (isSupabaseConfigured) {
      try {
        const client = requireSupabase();
        const { data, error } = await client
          .from('shipping_addresses')
          .select('*')
          .eq('user_email', normalizedEmail)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (Array.isArray(data)) {
          const mapped: ShippingAddress[] = data.map((d: any) => ({
            id: String(d.id),
            fullName: d.full_name || d.fullName || 'Customer',
            phone: d.phone || '',
            pincode: d.pincode || '',
            city: d.city || '',
            state: d.state || '',
            addressLine: d.address_line || d.addressLine || d.address || '',
            type: (d.type as 'Home' | 'Work' | 'Other') || 'Home',
            isDefault: Boolean(d.is_default || d.isDefault),
          }));

          inMemoryAddresses = mapped;
          return mapped;
        }
      } catch (err) {
        console.error('Supabase getAddresses error:', err);
        throw err;
      }
    }

    return inMemoryAddresses;
  },

  getAddressesSync(): ShippingAddress[] {
    return inMemoryAddresses;
  },

  // Save new shipping address into Supabase Database
  async addAddress(addressData: Omit<ShippingAddress, 'id'>, userEmail?: string): Promise<ShippingAddress> {
    const client = requireSupabase();
    const newId = 'addr-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const shouldBeDefault = addressData.isDefault || inMemoryAddresses.length === 0;

    const newAddress: ShippingAddress = {
      ...addressData,
      id: newId,
      isDefault: shouldBeDefault,
    };

    // If new address is set as default, reset other addresses is_default in Supabase
    if (shouldBeDefault && userEmail) {
      await client
        .from('shipping_addresses')
        .update({ is_default: false })
        .eq('user_email', userEmail.toLowerCase().trim());
    }

    // 1. Call Supabase FIRST
    const { error } = await client.from('shipping_addresses').insert({
      id: newId,
      user_email: userEmail ? userEmail.toLowerCase().trim() : '',
      full_name: addressData.fullName,
      phone: addressData.phone,
      pincode: addressData.pincode,
      city: addressData.city,
      state: addressData.state,
      address_line: addressData.addressLine,
      type: addressData.type || 'Home',
      is_default: shouldBeDefault,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase addAddress failed:', error);
      throw new Error(`Failed to save shipping address: ${error.message}`);
    }

    // 2. Update in-memory runtime cache ONLY on DB success
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
    userEmail?: string
  ): Promise<ShippingAddress> {
    const client = requireSupabase();
    const isSettingDefault = updatedFields.isDefault;

    if (isSettingDefault && userEmail) {
      await client
        .from('shipping_addresses')
        .update({ is_default: false })
        .eq('user_email', userEmail.toLowerCase().trim());
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

    // 1. Call Supabase FIRST
    const { error } = await client
      .from('shipping_addresses')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Supabase updateAddress failed:', error);
      throw new Error(`Failed to update shipping address: ${error.message}`);
    }

    // 2. Update cache ONLY on DB success
    inMemoryAddresses = inMemoryAddresses.map((addr) => {
      if (addr.id === id) {
        return { ...addr, ...updatedFields };
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
    const client = requireSupabase();
    // 1. Call Supabase FIRST
    const { error } = await client.from('shipping_addresses').delete().eq('id', id);
    if (error) {
      console.error('Supabase deleteAddress failed:', error);
      throw new Error(`Failed to delete shipping address: ${error.message}`);
    }

    // 2. Update cache ONLY on DB success
    const remaining = inMemoryAddresses.filter((a) => a.id !== id);
    if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
      remaining[0].isDefault = true;
      client
        .from('shipping_addresses')
        .update({ is_default: true })
        .eq('id', remaining[0].id)
        .then();
    }

    inMemoryAddresses = remaining;
    notifyAddressChange();
  },

  // Set default shipping address in Supabase Database
  async setDefaultAddress(id: string, userEmail?: string): Promise<void> {
    const client = requireSupabase();
    if (userEmail) {
      await client
        .from('shipping_addresses')
        .update({ is_default: false })
        .eq('user_email', userEmail.toLowerCase().trim());
    }

    const { error } = await client
      .from('shipping_addresses')
      .update({ is_default: true })
      .eq('id', id);

    if (error) {
      console.error('Supabase setDefaultAddress failed:', error);
      throw new Error(`Failed to set default address: ${error.message}`);
    }

    inMemoryAddresses = inMemoryAddresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));

    notifyAddressChange();
  },
};
