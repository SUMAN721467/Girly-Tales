import { supabase, isSupabaseConfigured } from './supabase';
import { ShippingAddress } from '../types/product';

// Purge any legacy browser storage keys to guarantee NO local/browser storage is used
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('girly_tales_shipping_addresses_v1');
    localStorage.removeItem('girly_tales_saved_addresses_v1');
    sessionStorage.removeItem('girly_tales_shipping_addresses_v1');
    sessionStorage.removeItem('girly_tales_saved_addresses_v1');
  } catch (e) {}
}

// In-memory runtime cache for seamless UI reactivity (never written to browser storage)
let inMemoryAddresses: ShippingAddress[] = [
  {
    id: 'addr-default-1',
    fullName: 'Ananya Verma',
    phone: '9876543210',
    pincode: '400050',
    city: 'Mumbai',
    state: 'Maharashtra',
    addressLine: 'B-402, Sea Green Heights, Bandra West',
    type: 'Home',
    isDefault: true,
  },
];

export const notifyAddressChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gt_addresses_sync'));
  }
};

export const AddressService = {
  // Fetch shipping addresses directly from Supabase Database
  async getAddresses(userEmail?: string): Promise<ShippingAddress[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('shipping_addresses')
          .select('*')
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (userEmail) {
          query = query.or(`user_email.eq.${userEmail.toLowerCase().trim()},user_email.is.null,user_email.eq.`);
        }

        const { data, error } = await query;

        if (!error && Array.isArray(data)) {
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
        } else if (error) {
          console.warn('Supabase fetch shipping_addresses note:', error.message);
        }
      } catch (err) {
        console.warn('Supabase getAddresses exception:', err);
      }
    }

    return inMemoryAddresses;
  },

  // Synchronous getter for quick in-memory reads
  getAddressesSync(): ShippingAddress[] {
    return inMemoryAddresses;
  },

  // Save new shipping address into Supabase Database
  async addAddress(addressData: Omit<ShippingAddress, 'id'>, userEmail?: string): Promise<ShippingAddress> {
    const newId = 'addr-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const shouldBeDefault = addressData.isDefault || inMemoryAddresses.length === 0;

    const newAddress: ShippingAddress = {
      ...addressData,
      id: newId,
      isDefault: shouldBeDefault,
    };

    if (isSupabaseConfigured) {
      try {
        // If new address is set as default, set other addresses is_default to false
        if (shouldBeDefault) {
          if (userEmail) {
            await supabase
              .from('shipping_addresses')
              .update({ is_default: false })
              .eq('user_email', userEmail.toLowerCase().trim());
          } else {
            await supabase
              .from('shipping_addresses')
              .update({ is_default: false })
              .neq('id', newId);
          }
        }

        const { error } = await supabase.from('shipping_addresses').insert({
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
          console.warn('Supabase insert shipping address note:', error.message);
        }
      } catch (e) {
        console.warn('Supabase addAddress error:', e);
      }
    }

    // Update in-memory runtime cache
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
  ): Promise<ShippingAddress | null> {
    const isSettingDefault = updatedFields.isDefault;

    if (isSupabaseConfigured) {
      try {
        if (isSettingDefault) {
          if (userEmail) {
            await supabase
              .from('shipping_addresses')
              .update({ is_default: false })
              .eq('user_email', userEmail.toLowerCase().trim());
          } else {
            await supabase
              .from('shipping_addresses')
              .update({ is_default: false })
              .neq('id', id);
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

        const { error } = await supabase
          .from('shipping_addresses')
          .update(updatePayload)
          .eq('id', id);

        if (error) {
          console.warn('Supabase update shipping address note:', error.message);
        }
      } catch (e) {
        console.warn('Supabase updateAddress error:', e);
      }
    }

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
    return inMemoryAddresses.find((a) => a.id === id) || null;
  },

  // Permanently delete address from Supabase Database
  async deleteAddress(id: string): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('shipping_addresses').delete().eq('id', id);
        if (error) {
          console.warn('Supabase delete shipping address note:', error.message);
        }
      } catch (e) {
        console.warn('Supabase deleteAddress error:', e);
      }
    }

    const remaining = inMemoryAddresses.filter((a) => a.id !== id);

    // If we deleted the default address, make the first remaining address the default
    if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
      remaining[0].isDefault = true;
      if (isSupabaseConfigured) {
        supabase
          .from('shipping_addresses')
          .update({ is_default: true })
          .eq('id', remaining[0].id)
          .then();
      }
    }

    inMemoryAddresses = remaining;
    notifyAddressChange();
  },

  // Set default shipping address in Supabase Database
  async setDefaultAddress(id: string, userEmail?: string): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        if (userEmail) {
          await supabase
            .from('shipping_addresses')
            .update({ is_default: false })
            .eq('user_email', userEmail.toLowerCase().trim());
        } else {
          await supabase
            .from('shipping_addresses')
            .update({ is_default: false })
            .neq('id', id);
        }

        await supabase
          .from('shipping_addresses')
          .update({ is_default: true })
          .eq('id', id);
      } catch (e) {
        console.warn('Supabase setDefaultAddress error:', e);
      }
    }

    inMemoryAddresses = inMemoryAddresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));

    notifyAddressChange();
  },
};
