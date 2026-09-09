import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  MapPin,
  ShoppingBag,
  Camera,
  Trash2,
  Edit2,
  Plus,
  CheckCircle2,
  Truck,
  Clock,
  LogOut,
  Sparkles,
  ShieldCheck,
  Search,
  ArrowRight,
  Loader2,
  Package,
  Home,
  Briefcase,
  X,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { DatabaseService, RealOrder } from '../lib/databaseService';
import { AddressService } from '../lib/addressService';
import { ShippingAddress } from '../types/product';
import { Button } from '../components/common/Button';

interface AccountPageProps {
  onNavigate: (page: string, category?: string) => void;
  initialTab?: 'profile' | 'addresses' | 'orders';
}

// Fallback Indian postal prefix lookup when offline
const getFallbackLocationByPincode = (pin: string): { city: string; state: string } | null => {
  const prefix2 = pin.slice(0, 2);
  const prefix3 = pin.slice(0, 3);

  if (prefix3 === '400') return { city: 'Mumbai', state: 'Maharashtra' };
  if (prefix3 === '411') return { city: 'Pune', state: 'Maharashtra' };
  if (prefix3 === '440') return { city: 'Nagpur', state: 'Maharashtra' };
  if (prefix3 === '110') return { city: 'New Delhi', state: 'Delhi' };
  if (prefix3 === '560') return { city: 'Bengaluru', state: 'Karnataka' };
  if (prefix3 === '600') return { city: 'Chennai', state: 'Tamil Nadu' };
  if (prefix3 === '500') return { city: 'Hyderabad', state: 'Telangana' };
  if (prefix3 === '700') return { city: 'Kolkata', state: 'West Bengal' };
  if (prefix3 === '380') return { city: 'Ahmedabad', state: 'Gujarat' };
  if (prefix3 === '302') return { city: 'Jaipur', state: 'Rajasthan' };
  if (prefix3 === '226') return { city: 'Lucknow', state: 'Uttar Pradesh' };
  if (prefix3 === '201') return { city: 'Noida', state: 'Uttar Pradesh' };
  if (prefix3 === '122') return { city: 'Gurugram', state: 'Haryana' };
  if (prefix3 === '160') return { city: 'Chandigarh', state: 'Chandigarh' };
  if (prefix3 === '800') return { city: 'Patna', state: 'Bihar' };
  if (prefix3 === '751') return { city: 'Bhubaneswar', state: 'Odisha' };
  if (prefix3 === '682') return { city: 'Kochi', state: 'Kerala' };
  if (prefix3 === '781') return { city: 'Guwahati', state: 'Assam' };
  if (prefix3 === '403') return { city: 'Panaji', state: 'Goa' };

  const p2 = parseInt(prefix2, 10);
  if (p2 === 11) return { city: 'Delhi', state: 'Delhi' };
  if (p2 >= 12 && p2 <= 13) return { city: 'Haryana', state: 'Haryana' };
  if (p2 >= 14 && p2 <= 16) return { city: 'Punjab', state: 'Punjab' };
  if (p2 === 17) return { city: 'Shimla', state: 'Himachal Pradesh' };
  if (p2 >= 18 && p2 <= 19) return { city: 'Jammu', state: 'Jammu & Kashmir' };
  if (p2 >= 20 && p2 <= 28) return { city: 'Uttar Pradesh', state: 'Uttar Pradesh' };
  if (p2 >= 30 && p2 <= 34) return { city: 'Rajasthan', state: 'Rajasthan' };
  if (p2 >= 36 && p2 <= 39) return { city: 'Gujarat', state: 'Gujarat' };
  if (p2 >= 40 && p2 <= 44) return { city: 'Maharashtra', state: 'Maharashtra' };
  if (p2 >= 45 && p2 <= 48) return { city: 'Madhya Pradesh', state: 'Madhya Pradesh' };
  if (p2 === 49) return { city: 'Raipur', state: 'Chhattisgarh' };
  if (p2 >= 50 && p2 <= 53) return { city: 'Hyderabad / Amaravati', state: 'Andhra Pradesh' };
  if (p2 >= 56 && p2 <= 59) return { city: 'Karnataka', state: 'Karnataka' };
  if (p2 >= 60 && p2 <= 64) return { city: 'Tamil Nadu', state: 'Tamil Nadu' };
  if (p2 >= 67 && p2 <= 69) return { city: 'Kerala', state: 'Kerala' };
  if (p2 >= 70 && p2 <= 74) return { city: 'West Bengal', state: 'West Bengal' };
  if (p2 >= 75 && p2 <= 77) return { city: 'Odisha', state: 'Odisha' };
  if (p2 === 78) return { city: 'Assam', state: 'Assam' };
  if (p2 >= 80 && p2 <= 85) return { city: 'Bihar', state: 'Bihar' };

  return null;
};

export const AccountPage: React.FC<AccountPageProps> = ({
  onNavigate,
  initialTab = 'profile',
}) => {
  const { user, isLoggedIn, isAdmin, logout, openAuthModal, updateUserProfile } = useAuth();
  const { wishlistCount } = useWishlist();
  const { triggerToast } = useCart();

  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'orders'>(initialTab);

  // Profile Details State
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'Female',
    age: '',
    avatarUrl: '',
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shipping Addresses State
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<Omit<ShippingAddress, 'id'>>({
    fullName: '',
    phone: '',
    pincode: '',
    city: '',
    state: '',
    addressLine: '',
    type: 'Home',
    isDefault: false,
  });
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeDetected, setPincodeDetected] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Delete Address Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<ShippingAddress | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  // Orders State
  const [userOrders, setUserOrders] = useState<RealOrder[]>([]);
  const [guestOrderId, setGuestOrderId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<RealOrder | null>(null);
  const [trackerError, setTrackerError] = useState('');
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);

  // Sync profileForm with logged-in user
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || 'Female',
        age: user.age !== undefined && user.age !== null && user.age !== '' ? String(user.age) : '',
        avatarUrl: user.avatarUrl || '',
      });
    } else {
      setProfileForm({
        name: 'Ananya Verma',
        email: 'ananya@girlytales.com',
        phone: '9876543210',
        gender: 'Female',
        age: '24',
        avatarUrl: '',
      });
    }
  }, [user]);

  // Load Addresses & Orders
  const loadAddresses = async () => {
    const list = await AddressService.getAddresses(user?.email);
    setAddresses(list);
  };

  useEffect(() => {
    loadAddresses();
    window.addEventListener('gt_addresses_sync', loadAddresses);
    return () => window.removeEventListener('gt_addresses_sync', loadAddresses);
  }, [user]);

  useEffect(() => {
    const fetchOrders = async () => {
      const allOrders = await DatabaseService.getOrders();
      if (user?.email) {
        const matching = allOrders.filter(
          (o) => o.email.toLowerCase() === user.email.toLowerCase()
        );
        setUserOrders(matching.length > 0 ? matching : allOrders);
      } else {
        setUserOrders(allOrders);
      }
    };
    fetchOrders();

    const handleSync = () => fetchOrders();
    window.addEventListener('gt_db_sync', handleSync);
    return () => window.removeEventListener('gt_db_sync', handleSync);
  }, [user]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Handle Profile Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      triggerToast('File too large', 'Please choose an image under 5MB', undefined, 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setProfileForm((prev) => ({ ...prev, avatarUrl: result }));
      triggerToast('Photo selected! ✨', 'Click "Save Profile Details" to update.', undefined, 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProfileForm((prev) => ({ ...prev, avatarUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Cancel Editing Profile
  const handleCancelEditProfile = () => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || 'Female',
        age: user.age !== undefined && user.age !== null && user.age !== '' ? String(user.age) : '',
        avatarUrl: user.avatarUrl || '',
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsEditingProfile(false);
  };

  // Save Profile Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    const rawAge = profileForm.age ? profileForm.age.toString().trim() : '';
    const parsedAge = rawAge ? parseInt(rawAge, 10) : undefined;
    const finalAge = parsedAge !== undefined && !isNaN(parsedAge) ? parsedAge : undefined;

    const res = await updateUserProfile({
      name: profileForm.name.trim(),
      phone: profileForm.phone.trim(),
      gender: profileForm.gender,
      age: finalAge,
      avatarUrl: profileForm.avatarUrl,
    });

    setIsSavingProfile(false);
    if (res.success) {
      setIsEditingProfile(false);
    } else if (res.error) {
      triggerToast('Update failed', res.error, undefined, 'error');
    }
  };

  // PIN code lookup helper
  const lookupAddressPincode = async (pin: string) => {
    const cleanPin = pin.trim().replace(/\D/g, '');
    if (cleanPin.length !== 6) {
      setPincodeDetected(false);
      setPincodeLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    setPincodeLoading(true);

    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
        signal: abortControllerRef.current.signal,
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          const fetchedCity = po.District || po.Block || po.Circle || po.Name || '';
          const fetchedState = po.State || '';

          if (fetchedCity && fetchedState) {
            setAddressForm((prev) => ({
              ...prev,
              city: fetchedCity,
              state: fetchedState,
            }));
            setPincodeDetected(true);
            setPincodeLoading(false);
            return;
          }
        }
      }
    } catch (e) {}

    const fallback = getFallbackLocationByPincode(cleanPin);
    if (fallback) {
      setAddressForm((prev) => ({
        ...prev,
        city: prev.city || fallback.city,
        state: prev.state || fallback.state,
      }));
      setPincodeDetected(true);
    }
    setPincodeLoading(false);
  };

  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      fullName: user?.name || profileForm.name || '',
      phone: user?.phone || profileForm.phone || '',
      pincode: '',
      city: '',
      state: '',
      addressLine: '',
      type: 'Home',
      isDefault: addresses.length === 0,
    });
    setPincodeDetected(false);
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: ShippingAddress) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      fullName: addr.fullName,
      phone: addr.phone,
      pincode: addr.pincode,
      city: addr.city,
      state: addr.state,
      addressLine: addr.addressLine,
      type: addr.type || 'Home',
      isDefault: !!addr.isDefault,
    });
    setPincodeDetected(true);
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.fullName || !addressForm.phone || !addressForm.pincode || !addressForm.addressLine) {
      triggerToast('Incomplete Address', 'Please fill all required address fields.', undefined, 'error');
      return;
    }

    if (editingAddressId) {
      await AddressService.updateAddress(editingAddressId, addressForm, user?.email);
      triggerToast('Address Updated! 🏠', 'Shipping address saved to Supabase.', undefined, 'success');
    } else {
      await AddressService.addAddress(addressForm, user?.email);
      triggerToast('Address Added! 📍', 'New shipping address saved to Supabase.', undefined, 'success');
    }

    setIsAddressModalOpen(false);
    await loadAddresses();
  };

  // Open "Type delete" Confirmation Modal
  const handleOpenDeleteModal = (addr: ShippingAddress, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddressToDelete(addr);
    setDeleteConfirmationInput('');
    setIsDeleteModalOpen(true);
  };

  // Process Deletion after typing "delete"
  const handleConfirmDeleteAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressToDelete) return;

    if (deleteConfirmationInput.trim().toLowerCase() !== 'delete') {
      triggerToast('Confirmation required', 'Please type delete to confirm removal.', undefined, 'error');
      return;
    }

    await AddressService.deleteAddress(addressToDelete.id);
    setIsDeleteModalOpen(false);
    setAddressToDelete(null);
    setDeleteConfirmationInput('');
    await loadAddresses();
    triggerToast('Address Deleted 🗑️', 'Shipping address permanently removed from Supabase.', undefined, 'info');
  };

  const handleSetDefaultAddress = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await AddressService.setDefaultAddress(id, user?.email);
    await loadAddresses();
    triggerToast('Default Address Set ⭐', 'Primary shipping address updated in Supabase.', undefined, 'success');
  };

  // Guest Order Tracker
  const handleTrackGuestOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackerError('');
    setTrackedOrder(null);
    const query = guestOrderId.trim().toUpperCase();

    if (!query) {
      setTrackerError('Please enter your Order ID (e.g. GT-849201).');
      return;
    }

    setIsSearchingOrder(true);
    try {
      const allOrders = await DatabaseService.getOrders();
      const found = allOrders.find(
        (o) => o.id.toUpperCase() === query || o.id.toUpperCase().includes(query)
      );

      if (found) {
        setTrackedOrder(found);
      } else {
        setTrackerError(`No order found matching "${query}". Please check the ID or contact support.`);
      }
    } catch (err) {
      setTrackerError('Failed to search order. Please try again.');
    } finally {
      setIsSearchingOrder(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 animate-fade-in space-y-8">
      
      {/* 1. TOP HERO / PROFILE HEADER */}
      <div className="bg-white border border-[#EAE6DB] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left z-10">
          {/* Avatar with photo preview */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-3xl bg-[#FAF8F2] border-2 border-[#EAE6DB] p-1 shadow-md flex items-center justify-center overflow-hidden">
              {profileForm.avatarUrl || user?.avatarUrl ? (
                <img
                  src={profileForm.avatarUrl || user?.avatarUrl}
                  alt={profileForm.name || 'Profile'}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[#967BB6] to-[#7F62A1] text-white font-serif font-black text-2xl flex items-center justify-center shadow-xs">
                  {profileForm.name ? profileForm.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setActiveTab('profile');
                setIsEditingProfile(true);
                setTimeout(() => fileInputRef.current?.click(), 100);
              }}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#967BB6] hover:bg-[#7F62A1] text-white flex items-center justify-center shadow-md transition-transform active:scale-90 cursor-pointer"
              title="Change Profile Photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              <h1 className="font-serif text-2xl sm:text-3xl text-brand-charcoal font-semibold">
                {profileForm.name || (isLoggedIn ? user?.name : 'Valued Member')}
              </h1>
              {isAdmin ? (
                <span className="bg-[#967BB6] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-xs tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  ADMIN
                </span>
              ) : (
                <span className="bg-[#FFFDD0] text-[#967BB6] border border-[#EAE6DB] text-[10px] font-black uppercase px-2 py-0.5 rounded">
                  VIP Club Member
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-brand-muted">
              {profileForm.email || (isLoggedIn ? user?.email : 'Sign in to sync your saved items & addresses')}
            </p>
            {profileForm.phone && (
              <p className="text-xs text-brand-muted font-mono flex items-center justify-center sm:justify-start gap-1">
                <span>📱</span> +91 {profileForm.phone}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 flex-wrap justify-center">
          <div className="px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-center min-w-[80px]">
            <span className="text-[10px] font-bold uppercase text-brand-muted block">Saved Addr</span>
            <span className="text-base font-black text-brand-charcoal">{addresses.length}</span>
          </div>
          <div className="px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-center min-w-[80px]">
            <span className="text-[10px] font-bold uppercase text-brand-muted block">Orders</span>
            <span className="text-base font-black text-brand-charcoal">{userOrders.length}</span>
          </div>
          <div className="px-4 py-2.5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-center min-w-[80px]">
            <span className="text-[10px] font-bold uppercase text-brand-muted block">Wishlist</span>
            <span className="text-base font-black text-rose-500">{wishlistCount}</span>
          </div>

          {isLoggedIn ? (
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-2.5 border border-[#EAE6DB] hover:bg-rose-50 hover:border-rose-200 text-brand-charcoal hover:text-rose-600 text-xs font-bold uppercase transition-colors rounded-2xl cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit</span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. THE 3 MAIN TABS: PROFILE DETAILS, SHIPPING ADDRESS, MY ORDERS */}
      <div className="bg-[#FAF8F2] p-1.5 border border-[#EAE6DB] rounded-2xl grid grid-cols-3 gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold">
        {/* Tab 1: Profile Details */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3 px-3 sm:px-5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#967BB6] text-white shadow-md shadow-[#967BB6]/25 hover:bg-[#7F62A1]'
              : 'text-brand-charcoal hover:bg-white/80 hover:text-[#967BB6]'
          }`}
        >
          <UserIcon className={`w-4 h-4 ${activeTab === 'profile' ? 'text-white' : 'text-[#967BB6]'}`} />
          <span className="truncate">Profile Details</span>
        </button>

        {/* Tab 2: Shipping Address */}
        <button
          onClick={() => setActiveTab('addresses')}
          className={`py-3 px-3 sm:px-5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'addresses'
              ? 'bg-[#967BB6] text-white shadow-md shadow-[#967BB6]/25 hover:bg-[#7F62A1]'
              : 'text-brand-charcoal hover:bg-white/80 hover:text-[#967BB6]'
          }`}
        >
          <MapPin className={`w-4 h-4 ${activeTab === 'addresses' ? 'text-white' : 'text-[#967BB6]'}`} />
          <span className="truncate">Shipping Address ({addresses.length})</span>
        </button>

        {/* Tab 3: My Orders */}
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3 px-3 sm:px-5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-[#967BB6] text-white shadow-md shadow-[#967BB6]/25 hover:bg-[#7F62A1]'
              : 'text-brand-charcoal hover:bg-white/80 hover:text-[#967BB6]'
          }`}
        >
          <ShoppingBag className={`w-4 h-4 ${activeTab === 'orders' ? 'text-white' : 'text-[#967BB6]'}`} />
          <span className="truncate">My Orders ({userOrders.length})</span>
        </button>
      </div>

      {/* 3. TAB CONTENT SECTIONS */}

      {/* ========================================================= */}
      {/* SECTION 1: PROFILE DETAILS                               */}
      {/* ========================================================= */}
      {activeTab === 'profile' && (
        <>
          {/* 1A. READ-ONLY SAVED PROFILE VIEW */}
          {!isEditingProfile ? (
            <div className="bg-white border border-[#EAE6DB] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE6DB]">
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl text-brand-charcoal font-semibold flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-[#967BB6]" />
                    <span>Personal Profile Details</span>
                  </h3>
                  <p className="text-xs text-brand-muted mt-0.5">
                    Your saved personal account details. You can update or edit them anytime.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Saved Profile</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="px-5 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] active:bg-[#6D528F] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>

              {/* Profile Card Banner */}
              <div className="p-6 bg-gradient-to-br from-[#FAF8F2] via-white to-[#FAF8F2] border border-[#EAE6DB] rounded-2xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                  <div className="w-20 h-20 rounded-2xl bg-white border-2 border-[#EAE6DB] p-1 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                    {profileForm.avatarUrl || user?.avatarUrl ? (
                      <img
                        src={profileForm.avatarUrl || user?.avatarUrl}
                        alt={profileForm.name || 'Avatar'}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#967BB6] to-[#7F62A1] text-white font-serif font-black text-2xl flex items-center justify-center">
                        {profileForm.name ? profileForm.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                      <h4 className="font-serif text-xl sm:text-2xl font-bold text-brand-charcoal">
                        {profileForm.name || 'Member'}
                      </h4>
                      {isAdmin ? (
                        <span className="bg-[#967BB6] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-xs tracking-wider flex items-center gap-1">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          ADMIN
                        </span>
                      ) : (
                        <span className="bg-[#FFFDD0] text-[#967BB6] border border-[#EAE6DB] text-[10px] font-black uppercase px-2 py-0.5 rounded">
                          VIP Club Member
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brand-muted font-medium">{profileForm.email || user?.email}</p>
                    <div className="pt-1 flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                      <span className="text-[11px] font-semibold text-brand-charcoal bg-white border border-[#EAE6DB] px-2.5 py-0.5 rounded-lg shadow-2xs">
                        Gender: {profileForm.gender || 'Female'}
                      </span>
                      {profileForm.age ? (
                        <span className="text-[11px] font-semibold text-brand-charcoal bg-white border border-[#EAE6DB] px-2.5 py-0.5 rounded-lg shadow-2xs">
                          Age: {profileForm.age} yrs
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="px-4 py-2 bg-white hover:bg-[#FFFDD0] border border-[#EAE6DB] text-brand-charcoal font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#967BB6]" />
                  <span>Modify Details</span>
                </button>
              </div>

              {/* Saved Details Display Grid (5 fields) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Full Name */}
                <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted flex items-center gap-1">
                    <UserIcon className="w-3.5 h-3.5 text-[#967BB6]" /> Full Name
                  </span>
                  <p className="font-bold text-sm text-brand-charcoal">{profileForm.name || 'Not provided'}</p>
                </div>

                {/* 2. Mobile Number */}
                <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#967BB6]" /> Mobile Number
                  </span>
                  <p className="font-bold text-sm text-brand-charcoal font-mono">
                    {profileForm.phone ? `+91 ${profileForm.phone}` : 'Not provided'}
                  </p>
                </div>

                {/* 3. Email Address */}
                <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#967BB6]" /> Email Address
                  </span>
                  <p className="font-bold text-xs text-brand-charcoal truncate">{profileForm.email || user?.email}</p>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 pt-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                  </span>
                </div>

                {/* 4. Gender */}
                <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#967BB6]" /> Gender
                  </span>
                  <p className="font-bold text-sm text-brand-charcoal">{profileForm.gender || 'Female'}</p>
                </div>

                {/* 5. Age */}
                <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl space-y-1 sm:col-span-2 lg:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#967BB6]" /> Age
                  </span>
                  <p className="font-bold text-sm text-brand-charcoal">
                    {profileForm.age ? `${profileForm.age} Years Old` : 'Not specified'}
                  </p>
                </div>
              </div>

              {/* Bottom Footer Notice & Edit CTA */}
              <div className="pt-4 border-t border-[#EAE6DB] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brand-muted">
                <p className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#967BB6]" />
                  <span>Your personal information is secure and can be updated at any time.</span>
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="px-6 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] active:bg-[#6D528F] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile Details</span>
                </button>
              </div>
            </div>
          ) : (
            /* 1B. EDIT PROFILE FORM VIEW */
            <div className="bg-white border border-[#EAE6DB] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAE6DB]">
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl text-brand-charcoal font-semibold flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-[#967BB6]" />
                    <span>Edit Profile Details</span>
                  </h3>
                  <p className="text-xs text-brand-muted mt-0.5">
                    Update your name, mobile number, age, gender, and profile photo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEditProfile}
                  className="px-4 py-2 bg-[#FAF8F2] hover:bg-gray-100 border border-[#EAE6DB] text-brand-charcoal text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 w-fit"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>

              {/* Profile Photo Uploader Section */}
              <div className="p-5 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-[#EAE6DB] shadow-xs flex items-center justify-center overflow-hidden">
                      {profileForm.avatarUrl ? (
                        <img
                          src={profileForm.avatarUrl}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-8 h-8 text-brand-muted" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-sm text-brand-charcoal">Profile Picture</h4>
                    <p className="text-xs text-brand-muted">JPG, PNG or WEBP (Max 5MB)</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-bold uppercase rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{profileForm.avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>
                  {profileForm.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Full Name */}
                  <div>
                    <label className="block text-brand-charcoal font-bold mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      placeholder="e.g. Ananya Verma"
                      className="w-full bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl px-4 py-3 text-brand-charcoal font-medium focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                      required
                    />
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-brand-charcoal font-bold mb-1.5">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-xs font-bold text-brand-muted select-none">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                          })
                        }
                        placeholder="10-digit mobile number"
                        className="w-full bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl pl-12 pr-4 py-3 text-brand-charcoal font-mono font-medium focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-brand-charcoal font-bold mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="w-full bg-gray-100 border border-[#EAE6DB] rounded-xl px-4 py-3 text-brand-muted font-medium cursor-not-allowed"
                    />
                    <span className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified Account Email
                    </span>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-brand-charcoal font-bold mb-1.5">
                      Gender
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Female', 'Male', 'Prefer not to say'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setProfileForm({ ...profileForm, gender: g })}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all truncate cursor-pointer ${
                            profileForm.gender === g
                              ? 'bg-[#967BB6] text-white border-[#967BB6] shadow-xs'
                              : 'bg-[#FAF8F2] border-[#EAE6DB] text-brand-charcoal hover:bg-[#FFFDD0]'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-brand-charcoal font-bold mb-1.5">
                      Age
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={120}
                      value={profileForm.age}
                      onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                      placeholder="e.g. 24"
                      className="w-full bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl px-4 py-3 text-brand-charcoal font-medium focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#EAE6DB] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCancelEditProfile}
                    className="px-5 py-3 border border-[#EAE6DB] hover:bg-gray-50 text-brand-charcoal text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-8 py-3.5 bg-[#967BB6] hover:bg-[#7F62A1] active:bg-[#6D528F] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Save Profile Details</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* SECTION 2: SHIPPING ADDRESSES                            */}
      {/* ========================================================= */}
      {activeTab === 'addresses' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white border border-[#EAE6DB] rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-xl sm:text-2xl text-brand-charcoal font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#967BB6]" />
                <span>My Saved Shipping Addresses</span>
              </h3>
              <p className="text-xs text-brand-muted mt-0.5">
                Add multiple addresses for home, work, or gifting. These will appear in your checkout for 1-click delivery.
              </p>
            </div>
            <button
              onClick={handleOpenAddAddress}
              className="px-6 py-3 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Address</span>
            </button>
          </div>

          {/* Address Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`bg-white border rounded-3xl p-5 sm:p-6 transition-all shadow-xs flex flex-col justify-between relative ${
                  addr.isDefault
                    ? 'border-[#967BB6] ring-2 ring-[#967BB6]/20 bg-gradient-to-b from-white to-[#FAF8F2]'
                    : 'border-[#EAE6DB] hover:border-brand-muted'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-brand-charcoal">{addr.fullName}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FAF8F2] border border-[#EAE6DB] text-brand-charcoal flex items-center gap-1">
                        {addr.type === 'Work' ? <Briefcase className="w-3 h-3 text-[#967BB6]" /> : <Home className="w-3 h-3 text-[#967BB6]" />}
                        {addr.type || 'Home'}
                      </span>
                    </div>

                    {addr.isDefault && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        DEFAULT
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-brand-charcoal font-medium leading-relaxed mb-1">
                    {addr.addressLine}
                  </p>
                  <p className="text-xs text-brand-muted font-medium">
                    {addr.city}, {addr.state} - <strong className="font-mono text-brand-charcoal">{addr.pincode}</strong>
                  </p>
                  <p className="text-xs text-brand-muted mt-2 font-mono">
                    Phone: <strong className="text-brand-charcoal">+91 {addr.phone}</strong>
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#EAE6DB] flex items-center justify-between gap-2 text-xs">
                  {!addr.isDefault ? (
                    <button
                      onClick={(e) => handleSetDefaultAddress(addr.id, e)}
                      className="text-xs font-bold text-[#967BB6] hover:underline cursor-pointer"
                    >
                      Set as Default
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-bold">✓ Primary Delivery Address</span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditAddress(addr)}
                      className="px-3 py-1.5 bg-[#FAF8F2] hover:bg-[#FFFDD0] border border-[#EAE6DB] text-brand-charcoal font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3 h-3 text-[#967BB6]" />
                      <span>Edit</span>
                    </button>

                    {/* Delete Address Button - triggers "Type delete" confirmation modal */}
                    <button
                      onClick={(e) => handleOpenDeleteModal(addr, e)}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                      title="Delete Address Permanently"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {addresses.length === 0 && (
            <div className="py-14 text-center text-brand-muted space-y-3 bg-white rounded-3xl border border-[#EAE6DB]">
              <MapPin className="w-12 h-12 mx-auto text-brand-muted-light" />
              <p className="text-sm font-bold text-brand-charcoal">No shipping addresses saved yet.</p>
              <p className="text-xs text-brand-muted">Add your home or office address to speed up checkout.</p>
              <button
                onClick={handleOpenAddAddress}
                className="mt-2 px-6 py-2.5 bg-[#967BB6] text-white text-xs font-bold uppercase rounded-2xl shadow-xs cursor-pointer"
              >
                + Add Address Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECTION 3: MY ORDERS                                      */}
      {/* ========================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white border border-[#EAE6DB] rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-xl sm:text-2xl text-brand-charcoal font-semibold flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#967BB6]" />
                <span>My Purchase History</span>
              </h3>
              <p className="text-xs text-brand-muted mt-0.5">
                Track your active shipments, view delivery timelines, and reorder favorites.
              </p>
            </div>

            <button
              onClick={() => onNavigate('shop')}
              className="px-5 py-2.5 bg-[#FAF8F2] hover:bg-[#FFFDD0] border border-[#EAE6DB] text-brand-charcoal text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-xs shrink-0 cursor-pointer"
            >
              Continue Shopping 🛍️
            </button>
          </div>

          {/* User Orders List */}
          {userOrders.map((ord) => (
            <div key={ord.id} className="border border-[#EAE6DB] rounded-3xl p-6 bg-white shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#EAE6DB]">
                <div>
                  <span className="text-[10px] font-bold uppercase text-brand-muted">Order ID</span>
                  <h4 className="font-mono font-bold text-sm text-brand-charcoal">{ord.id}</h4>
                  <span className="text-[11px] text-brand-muted">
                    Placed on {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full w-fit ${
                  ord.status === 'Delivered'
                    ? 'bg-emerald-100 text-emerald-800'
                    : ord.status === 'Shipped'
                    ? 'bg-blue-100 text-blue-800'
                    : ord.status === 'Cancelled'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {ord.status === 'Delivered' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {ord.status === 'Shipped' && <Truck className="w-3.5 h-3.5" />}
                  {ord.status === 'Processing' && <Clock className="w-3.5 h-3.5" />}
                  <span>{ord.status}</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="py-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-brand-charcoal mb-2">
                  <span className="text-[#967BB6]">Order Placed ✓</span>
                  <span className={ord.status !== 'Pending' ? 'text-[#967BB6]' : 'text-brand-muted'}>
                    Packed {ord.status !== 'Pending' ? '✓' : ''}
                  </span>
                  <span className={ord.status === 'Shipped' || ord.status === 'Delivered' ? 'text-[#967BB6]' : 'text-brand-muted'}>
                    In Transit {ord.status === 'Shipped' || ord.status === 'Delivered' ? '✓' : ''}
                  </span>
                  <span className={ord.status === 'Delivered' ? 'text-emerald-700' : 'text-brand-muted'}>
                    Delivered {ord.status === 'Delivered' ? '✓' : ''}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      ord.status === 'Delivered'
                        ? 'bg-emerald-500 w-full'
                        : ord.status === 'Shipped'
                        ? 'bg-[#967BB6] w-3/4'
                        : ord.status === 'Processing'
                        ? 'bg-[#967BB6] w-2/5'
                        : 'bg-gray-400 w-1/5'
                    }`}
                  />
                </div>
              </div>

              {/* Items & Shipping Snapshot */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="space-y-1.5 bg-[#FAF8F2] p-3.5 rounded-2xl border border-[#EAE6DB]/70">
                  <span className="font-bold text-brand-charcoal block mb-1">Purchased Products:</span>
                  {ord.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-brand-charcoal py-0.5">
                      <span>• {item}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[#EAE6DB] flex justify-between font-black text-sm text-brand-charcoal">
                    <span>Total Paid</span>
                    <span className="text-[#967BB6]">₹{ord.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="space-y-1.5 bg-[#FAF8F2] p-3.5 rounded-2xl border border-[#EAE6DB]/70">
                  <span className="font-bold text-brand-charcoal block mb-1">Delivered To:</span>
                  <p className="font-medium text-brand-charcoal">{ord.customerName} ({ord.phone})</p>
                  <p className="text-brand-muted">{ord.address}, {ord.city}, {ord.state} - {ord.pincode}</p>
                  <p className="text-brand-muted pt-1 text-[11px]">Payment: <strong className="text-brand-charcoal">{ord.paymentMethod}</strong></p>
                </div>
              </div>
            </div>
          ))}

          {userOrders.length === 0 && (
            <div className="py-14 text-center text-brand-muted space-y-3 bg-white rounded-3xl border border-[#EAE6DB]">
              <ShoppingBag className="w-10 h-10 mx-auto text-brand-muted-light" />
              <p className="text-sm font-bold text-brand-charcoal">No orders found in your account.</p>
              <p className="text-xs text-brand-muted">Your purchase history will appear here once you place an order.</p>
              <button
                onClick={() => onNavigate('shop')}
                className="mt-2 px-6 py-2.5 bg-[#967BB6] text-white text-xs font-bold rounded-2xl shadow-xs cursor-pointer"
              >
                Explore Shop
              </button>
            </div>
          )}

          {/* Quick Order Tracker Form */}
          <div className="bg-white border border-[#EAE6DB] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 mt-6">
            <div>
              <h3 className="font-serif text-lg text-brand-charcoal font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-[#967BB6]" />
                <span>Instant Order Status Lookup</span>
              </h3>
              <p className="text-xs text-brand-muted mt-0.5">
                Have an Order ID from SMS/WhatsApp? Enter it below to check delivery progress.
              </p>
            </div>

            <form onSubmit={handleTrackGuestOrder} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-brand-muted absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={guestOrderId}
                  onChange={(e) => setGuestOrderId(e.target.value)}
                  placeholder="e.g. GT-849201"
                  className="w-full pl-11 pr-4 py-3 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl text-xs sm:text-sm font-mono focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingOrder}
                className="px-6 py-3 bg-[#1A1821] hover:bg-[#967BB6] text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-xs transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSearchingOrder ? 'Searching...' : 'Track Order'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {trackerError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl">
                {trackerError}
              </div>
            )}

            {trackedOrder && (
              <div className="border border-[#967BB6]/40 bg-[#FAF8F2] rounded-2xl p-5 space-y-3 animate-scale-in">
                <div className="flex justify-between items-center pb-2 border-b border-[#EAE6DB]">
                  <span className="font-mono font-bold text-sm text-brand-charcoal">#{trackedOrder.id}</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    {trackedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-brand-charcoal">
                  <strong>Delivery to:</strong> {trackedOrder.customerName}, {trackedOrder.address}, {trackedOrder.city}, {trackedOrder.state} ({trackedOrder.pincode})
                </p>
                <div className="flex justify-between text-xs font-bold text-brand-charcoal pt-1 border-t border-[#EAE6DB]">
                  <span>Total Amount:</span>
                  <span>₹{trackedOrder.total}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT SHIPPING ADDRESS                         */}
      {/* ========================================================= */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAddressModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FAF8F2] hover:bg-[#FFFDD0] flex items-center justify-center text-brand-charcoal transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#EAE6DB]">
              <div className="w-10 h-10 rounded-2xl bg-[#967BB6] text-white flex items-center justify-center shadow-soft">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-semibold text-brand-charcoal">
                  {editingAddressId ? 'Edit Shipping Address' : 'Add New Shipping Address'}
                </h3>
                <p className="text-xs text-brand-muted">
                  Auto-fetches city & state upon entering 6-digit PIN.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-brand-charcoal font-bold mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressForm.fullName}
                    onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                    placeholder="e.g. Ananya Verma"
                    className="w-full bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl px-3.5 py-2.5 text-brand-charcoal font-medium focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                    required
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-brand-charcoal font-bold mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={addressForm.phone}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                      })
                    }
                    placeholder="10-digit mobile number"
                    className="w-full bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl px-3.5 py-2.5 text-brand-charcoal font-medium focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                    required
                  />
                </div>

                {/* PIN Code with Auto-fetch */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-brand-charcoal font-bold">
                      Pin Code <span className="text-rose-500">*</span>
                    </label>
                    {pincodeLoading && (
                      <span className="text-[10px] text-[#967BB6] font-bold flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Fetching...
                      </span>
                    )}
                    {pincodeDetected && !pincodeLoading && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Auto-detected
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={addressForm.pincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setAddressForm({ ...addressForm, pincode: val });
                      if (val.length === 6) {
                        lookupAddressPincode(val);
                      } else {
                        setPincodeDetected(false);
                      }
                    }}
                    placeholder="6-digit PIN code"
                    className={`w-full bg-[#FAF8F2] border rounded-xl px-3.5 py-2.5 text-brand-charcoal font-medium focus:outline-none focus:bg-white transition-all ${
                      pincodeDetected ? 'border-emerald-400 bg-emerald-50/20' : 'border-[#EAE6DB] focus:border-[#967BB6]'
                    }`}
                    required
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-brand-charcoal font-bold mb-1">
                    City / District <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    placeholder="Auto-detected from PIN"
                    className="w-full bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl px-3.5 py-2.5 text-brand-charcoal font-medium focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                    required
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-brand-charcoal font-bold mb-1">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    placeholder="Auto-detected from PIN"
                    className="w-full bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl px-3.5 py-2.5 text-brand-charcoal font-medium focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all"
                    required
                  />
                </div>

                {/* Address Type (Home / Work / Other) */}
                <div>
                  <label className="block text-brand-charcoal font-bold mb-1">
                    Address Type
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Home', 'Work', 'Other'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAddressForm({ ...addressForm, type: t })}
                        className={`py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                          addressForm.type === t
                            ? 'bg-[#967BB6] text-white border-[#967BB6]'
                            : 'bg-[#FAF8F2] border-[#EAE6DB] text-brand-charcoal hover:bg-[#FFFDD0]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Full Address */}
              <div>
                <label className="block text-brand-charcoal font-bold mb-1">
                  Flat, House no., Building, Street Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={addressForm.addressLine}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine: e.target.value })}
                  placeholder="e.g. B-402, Sea Green Heights, Bandra West"
                  className="w-full bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl px-3.5 py-2.5 text-brand-charcoal font-medium focus:outline-none focus:border-[#967BB6] focus:bg-white transition-all resize-none"
                  required
                />
              </div>

              {/* Make Default Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded text-[#967BB6] focus:ring-[#967BB6]"
                />
                <span className="text-brand-charcoal font-medium text-xs">
                  Set as default shipping address for checkout
                </span>
              </label>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-[#EAE6DB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2.5 border border-[#EAE6DB] hover:bg-gray-50 text-brand-charcoal text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#967BB6] hover:bg-[#7F62A1] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {editingAddressId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DELETE SHIPPING ADDRESS CONFIRMATION ("type delete") */}
      {/* ========================================================= */}
      {isDeleteModalOpen && addressToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative animate-scale-in space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#FAF8F2] hover:bg-[#FFFDD0] flex items-center justify-center text-brand-charcoal transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-[#EAE6DB]">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-brand-charcoal">
                  Delete Shipping Address?
                </h3>
                <p className="text-xs text-rose-600 font-medium">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            {/* Address Summary */}
            <div className="p-3.5 bg-[#FAF8F2] rounded-2xl border border-[#EAE6DB] text-xs space-y-1">
              <p className="font-bold text-brand-charcoal">{addressToDelete.fullName} (+91 {addressToDelete.phone})</p>
              <p className="text-brand-muted">{addressToDelete.addressLine}</p>
              <p className="text-brand-muted">{addressToDelete.city}, {addressToDelete.state} - {addressToDelete.pincode}</p>
            </div>

            <form onSubmit={handleConfirmDeleteAddress} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-brand-charcoal">
                  To confirm permanent deletion, type <strong className="text-rose-600 font-mono">delete</strong> below:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={deleteConfirmationInput}
                  onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                  placeholder='Type "delete"'
                  className="w-full bg-[#FAF8F2] border border-[#EAE6DB] rounded-xl px-3.5 py-2.5 text-xs text-brand-charcoal font-mono font-medium focus:outline-none focus:border-rose-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2.5 border border-[#EAE6DB] hover:bg-gray-50 text-brand-charcoal font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteConfirmationInput.trim().toLowerCase() !== 'delete'}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Address</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
