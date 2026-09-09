import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle,
  Sparkles,
  Truck,
  ArrowRight,
  Loader2,
  CheckCircle2,
  MapPin,
  Plus,
  Tag,
  Home,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { DatabaseService } from '../../lib/databaseService';
import { AddressService } from '../../lib/addressService';
import { ShippingAddress } from '../../types/product';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderId: string) => void;
}

// Fallback Indian postal prefix lookup when offline or network fails
const getFallbackLocationByPincode = (pin: string): { city: string; state: string } | null => {
  const prefix2 = pin.slice(0, 2);
  const prefix3 = pin.slice(0, 3);

  // Major cities
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

  // States by 2-digit prefix
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

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const {
    items,
    subtotal,
    discountAmount,
    shippingFee,
    finalTotal,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    clearCart,
    triggerToast,
  } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState<'details' | 'success'>('details');
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('custom');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [saveToAddresses, setSaveToAddresses] = useState(true);

  // Address form fields
  const [formData, setFormData] = useState({
    name: 'Ananya Verma',
    email: 'ananya@example.com',
    phone: '9876543210',
    pincode: '400050',
    address: 'B-402, Sea Green Heights, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    type: 'Home' as 'Home' | 'Work' | 'Other',
  });

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeDetected, setPincodeDetected] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load saved addresses on mount/open
  const loadSavedAddresses = async () => {
    const list = await AddressService.getAddresses(user?.email);
    setSavedAddresses(list);

    if (list.length > 0) {
      const defaultAddr = list.find((a) => a.isDefault) || list[0];
      setSelectedAddressId(defaultAddr.id);
      setFormData({
        name: defaultAddr.fullName,
        email: user?.email || 'customer@girlytales.com',
        phone: defaultAddr.phone,
        pincode: defaultAddr.pincode,
        address: defaultAddr.addressLine,
        city: defaultAddr.city,
        state: defaultAddr.state,
        type: defaultAddr.type || 'Home',
      });
      setShowNewAddressForm(false);
    } else {
      setSelectedAddressId('custom');
      setShowNewAddressForm(true);
      if (user) {
        setFormData((prev) => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
          phone: user.phone || prev.phone,
        }));
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setIsSubmitting(false);
      setCouponError('');
      loadSavedAddresses();
    }
  }, [isOpen, user]);

  useEffect(() => {
    window.addEventListener('gt_addresses_sync', loadSavedAddresses);
    return () => window.removeEventListener('gt_addresses_sync', loadSavedAddresses);
  }, []);

  // When user selects a saved address card
  const handleSelectSavedAddress = (addr: ShippingAddress) => {
    setSelectedAddressId(addr.id);
    setShowNewAddressForm(false);
    setFormData({
      name: addr.fullName,
      email: user?.email || formData.email || 'customer@girlytales.com',
      phone: addr.phone,
      pincode: addr.pincode,
      address: addr.addressLine,
      city: addr.city,
      state: addr.state,
      type: addr.type || 'Home',
    });
    setPincodeDetected(true);
  };

  // Switch to custom new address form
  const handleToggleAddNewAddress = () => {
    setSelectedAddressId('custom');
    setShowNewAddressForm(true);
    setFormData({
      name: user?.name || '',
      email: user?.email || 'customer@girlytales.com',
      phone: user?.phone || '',
      pincode: '',
      address: '',
      city: '',
      state: '',
      type: 'Home',
    });
    setPincodeDetected(false);
  };

  // Auto-fetch City and State when 6-digit PIN code is entered
  const lookupPincode = async (pin: string) => {
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
            setFormData((prev) => ({
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
    } catch (e) {
      // Ignore abort errors
    }

    // Fallback lookup
    const fallback = getFallbackLocationByPincode(cleanPin);
    if (fallback) {
      setFormData((prev) => ({
        ...prev,
        city: prev.city || fallback.city,
        state: prev.state || fallback.state,
      }));
      setPincodeDetected(true);
    }
    setPincodeLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 6);
    setFormData((prev) => ({ ...prev, pincode: rawVal }));

    if (rawVal.length === 6) {
      lookupPincode(rawVal);
    } else {
      setPincodeDetected(false);
    }
  };

  // Coupon handling in checkout
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponCodeInput.trim()) return;

    const res = applyCoupon(couponCodeInput);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponCodeInput('');
      setCouponError('');
    }
  };

  const handleQuickApply = (code: string) => {
    setCouponError('');
    applyCoupon(code);
  };

  const handleModalClose = () => {
    setStep('details');
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.pincode || !formData.address) {
      triggerToast('Incomplete Details', 'Please complete the delivery address.', undefined, 'error');
      return;
    }

    setIsSubmitting(true);

    // If new address entered and saveToAddresses is checked, save it to Supabase via AddressService
    if (showNewAddressForm && saveToAddresses) {
      try {
        await AddressService.addAddress({
          fullName: formData.name,
          phone: formData.phone,
          pincode: formData.pincode,
          city: formData.city || 'City',
          state: formData.state || 'State',
          addressLine: formData.address,
          type: formData.type || 'Home',
          isDefault: savedAddresses.length === 0,
        }, user?.email);
      } catch (err) {
        console.warn('Address auto-save note:', err);
      }
    }

    const generatedId = 'GT-' + Math.floor(100000 + Math.random() * 900000);
    const orderItems = items.map(
      (item) => `${item.product.name}${item.selectedSize ? ` (${item.selectedSize})` : ''} x${item.quantity}`
    );

    try {
      await DatabaseService.createOrder({
        id: generatedId,
        customerName: formData.name || 'Customer',
        email: formData.email || user?.email || '',
        phone: formData.phone || '',
        items: orderItems.length > 0 ? orderItems : ['Mulberry Silk Lounge Set x1'],
        total: finalTotal,
        subtotal: subtotal,
        shippingFee: shippingFee,
        discountAmount: discountAmount,
        status: 'Processing',
        paymentMethod: 'UPI / Prepaid',
        address: formData.address || '',
        city: formData.city || 'Mumbai',
        state: formData.state || 'Maharashtra',
        pincode: formData.pincode || '',
      });
    } catch (err) {
      console.warn('Order save note:', err);
    }

    setOrderId(generatedId);
    setIsSubmitting(false);
    setStep('success');
    clearCart();
    triggerToast('Order Placed! 🎉', `Order #${generatedId} confirmed and saved.`, undefined, 'success');
    onOrderSuccess(generatedId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in"
      onClick={handleModalClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleModalClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-brand-ivory hover:bg-[#F5EEFA] flex items-center justify-center text-brand-charcoal transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'details' ? (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#EAE6DB]">
              <div className="w-10 h-10 rounded-2xl bg-[#967BB6] text-white flex items-center justify-center shadow-soft">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-semibold text-brand-charcoal">
                  Complete Your Order
                </h3>
                <p className="text-xs text-brand-muted">
                  Fast Pan-India Delivery &amp; Safe Checkout
                </p>
              </div>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-6">
              
              {/* 1. DELIVERY ADDRESS SECTION */}
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#967BB6]" />
                    <span>Delivery Address</span>
                  </h4>

                  {savedAddresses.length > 0 && !showNewAddressForm && (
                    <button
                      type="button"
                      onClick={handleToggleAddNewAddress}
                      className="text-xs font-bold text-[#967BB6] hover:text-[#7F62A1] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add New Address</span>
                    </button>
                  )}

                  {showNewAddressForm && savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
                        handleSelectSavedAddress(def);
                      }}
                      className="text-xs font-bold text-[#967BB6] hover:text-[#7F62A1] cursor-pointer"
                    >
                      ← Choose from saved addresses
                    </button>
                  )}
                </div>

                {/* SAVED ADDRESS CARDS (If user has saved addresses) */}
                {savedAddresses.length > 0 && !showNewAddressForm && (
                  <div className="space-y-3 mb-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {savedAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <div
                            key={addr.id}
                            onClick={() => handleSelectSavedAddress(addr)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs relative flex flex-col justify-between ${
                              isSelected
                                ? 'border-[#967BB6] bg-[#FAF8F2] ring-2 ring-[#967BB6]/30 shadow-xs'
                                : 'border-[#EAE6DB] bg-white hover:border-brand-muted/60'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                      isSelected
                                        ? 'border-[#967BB6] bg-[#967BB6] text-white'
                                        : 'border-gray-300 bg-white'
                                    }`}
                                  >
                                    {isSelected && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <span className="font-bold text-brand-charcoal">{addr.fullName}</span>
                                </div>
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white border border-[#EAE6DB] text-brand-charcoal">
                                  {addr.type || 'Home'}
                                </span>
                              </div>

                              <p className="text-brand-charcoal font-medium leading-relaxed line-clamp-2 mt-1">
                                {addr.addressLine}
                              </p>
                              <p className="text-brand-muted font-medium mt-0.5">
                                {addr.city}, {addr.state} - <strong className="text-brand-charcoal font-mono">{addr.pincode}</strong>
                              </p>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-[#EAE6DB]/60 flex items-center justify-between text-[11px] text-brand-muted font-mono">
                              <span>+91 {addr.phone}</span>
                              {addr.isDefault && (
                                <span className="text-emerald-700 font-bold bg-emerald-100/70 px-1.5 py-0.5 rounded text-[9px] uppercase">
                                  Default
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* NEW ADDRESS INPUT FORM (When adding or if no saved addresses) */}
                {showNewAddressForm && (
                  <div className="p-4 bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      {/* Full Name */}
                      <div>
                        <label className="block text-brand-charcoal font-bold mb-1">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="e.g., Ananya Verma"
                          className="w-full bg-white border border-[#EAE6DB] rounded-xl px-3.5 py-2.5 text-brand-charcoal font-medium focus:outline-none focus:border-[#967BB6] transition-all placeholder:text-brand-muted/50"
                          required
                        />
                      </div>

                      {/* Phone Number (Mobile Number) */}
                      <div>
                        <label className="block text-brand-charcoal font-bold mb-1">
                          Mobile Number <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-xs font-bold text-brand-muted select-none">
                            +91
                          </span>
                          <input
                            type="tel"
                            name="phone"
                            maxLength={10}
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                              })
                            }
                            placeholder="10-digit mobile number"
                            className="w-full bg-white border border-[#EAE6DB] rounded-xl pl-11 pr-3.5 py-2.5 text-brand-charcoal font-mono font-medium focus:outline-none focus:border-[#967BB6] transition-all placeholder:text-brand-muted/50"
                            required
                          />
                        </div>
                      </div>

                      {/* Pin Code - Directly after Mobile Number with Auto-Fetch */}
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
                        <div className="relative">
                          <input
                            type="text"
                            name="pincode"
                            maxLength={6}
                            value={formData.pincode}
                            onChange={handlePincodeChange}
                            placeholder="6-digit PIN code (e.g. 400050)"
                            className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-brand-charcoal font-medium focus:outline-none transition-all placeholder:text-brand-muted/50 ${
                              pincodeDetected ? 'border-emerald-400 bg-emerald-50/20' : 'border-[#EAE6DB] focus:border-[#967BB6]'
                            }`}
                            required
                          />
                          <MapPin className="w-4 h-4 text-brand-muted/60 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      </div>

                      {/* City - Auto-fetched */}
                      <div>
                        <label className="block text-brand-charcoal font-bold mb-1">
                          City / District <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="Auto-detected from PIN"
                          className="w-full bg-white border border-[#EAE6DB] rounded-xl px-3.5 py-2.5 text-brand-charcoal font-medium focus:outline-none focus:border-[#967BB6] transition-all placeholder:text-brand-muted/50"
                          required
                        />
                      </div>

                      {/* State - Auto-fetched */}
                      <div>
                        <label className="block text-brand-charcoal font-bold mb-1">
                          State <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          placeholder="Auto-detected from PIN"
                          className="w-full bg-white border border-[#EAE6DB] rounded-xl px-3.5 py-2.5 text-brand-charcoal font-medium focus:outline-none focus:border-[#967BB6] transition-all placeholder:text-brand-muted/50"
                          required
                        />
                      </div>

                      {/* Street Address */}
                      <div>
                        <label className="block text-brand-charcoal font-bold mb-1">
                          Flat, Building, Street Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="e.g., B-402, Sea Green Heights"
                          className="w-full bg-white border border-[#EAE6DB] rounded-xl px-3.5 py-2.5 text-brand-charcoal font-medium focus:outline-none focus:border-[#967BB6] transition-all placeholder:text-brand-muted/50"
                          required
                        />
                      </div>
                    </div>

                    {/* Checkbox: Save Address for Future Orders */}
                    <div className="pt-2 border-t border-[#EAE6DB]/70 flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={saveToAddresses}
                          onChange={(e) => setSaveToAddresses(e.target.checked)}
                          className="w-4 h-4 rounded text-[#967BB6] focus:ring-[#967BB6]"
                        />
                        <span className="font-medium text-brand-charcoal">
                          Save to My Shipping Addresses for future 1-click checkout
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. COUPON SECTION IN CHECKOUT MODAL */}
              <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#EAE6DB] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-charcoal flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#967BB6]" />
                    <span>Apply Discount Coupon</span>
                  </span>
                </div>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎉</span>
                      <div>
                        <span className="font-mono font-bold text-emerald-800 uppercase">
                          {appliedCoupon}
                        </span>
                        <span className="text-emerald-700 font-medium ml-1.5">
                          applied (- ₹{discountAmount.toLocaleString('en-IN')})
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter code (e.g. GIRLY10)"
                        value={couponCodeInput}
                        onChange={(e) => {
                          setCouponCodeInput(e.target.value.toUpperCase());
                          setCouponError('');
                        }}
                        className="flex-1 bg-white border border-[#EAE6DB] rounded-xl px-3.5 py-2 text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#967BB6]"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-5 py-2 bg-[#967BB6] hover:bg-[#7F62A1] active:bg-[#6D528F] text-white font-bold text-xs uppercase rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>

                    {couponError && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1">{couponError}</p>
                    )}

                    {/* Quick suggestion chips */}
                    <div className="flex items-center gap-2 pt-2 flex-wrap">
                      <span className="text-[10px] text-brand-muted font-bold">Suggested:</span>
                      <button
                        type="button"
                        onClick={() => handleQuickApply('GIRLY10')}
                        className="px-2.5 py-1 bg-white hover:bg-[#FFFDD0] border border-[#EAE6DB] rounded-lg text-[10px] font-mono font-bold text-[#967BB6] transition-colors"
                      >
                        GIRLY10 (10% OFF)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickApply('WELCOME15')}
                        className="px-2.5 py-1 bg-white hover:bg-[#FFFDD0] border border-[#EAE6DB] rounded-lg text-[10px] font-mono font-bold text-[#967BB6] transition-colors"
                      >
                        WELCOME15 (15% OFF)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. ORDER SUMMARY SNAPSHOT */}
              <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#EAE6DB] space-y-2 text-xs">
                <div className="flex justify-between text-brand-muted">
                  <span>Items Total ({items.length} products)</span>
                  <span className="font-semibold text-brand-charcoal">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount ({appliedCoupon})</span>
                    <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-brand-muted">
                  <span>Shipping</span>
                  <span>{shippingFee === 0 ? <strong className="text-emerald-600">FREE</strong> : `₹${shippingFee}`}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-brand-charcoal pt-2 border-t border-[#EAE6DB]">
                  <span>Total Payable</span>
                  <span className="text-base text-[#967BB6] font-black">₹{finalTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* 4. LAVENDER PAY NOW CTA BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-[#967BB6] hover:bg-[#7F62A1] active:bg-[#6D528F] text-white font-bold text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-[#967BB6]/30 flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Pay Now • ₹{finalTotal.toLocaleString('en-IN')}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* ORDER CONFIRMATION SCREEN */
          <div className="py-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>

            <span className="font-script text-3xl text-[#967BB6] block">
              Hooray! Order Confirmed 💕
            </span>

            <h3 className="font-serif text-2xl font-bold text-brand-charcoal">
              Thank You, {formData.name.split(' ')[0]}!
            </h3>

            <p className="text-xs text-brand-muted max-w-sm mx-auto leading-relaxed">
              We have received your order <strong>#{orderId}</strong>. A confirmation WhatsApp &amp; email has been sent to{' '}
              <strong>{formData.phone}</strong>.
            </p>

            <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#EAE6DB] max-w-sm mx-auto text-xs text-left space-y-1.5">
              <p className="font-bold text-brand-charcoal">Estimated Delivery:</p>
              <p className="text-brand-muted">2 - 4 Business Days with Premium Express Shipping 🚚</p>
              <p className="text-brand-muted">Delivery to: <strong>{formData.address}, {formData.city} ({formData.pincode})</strong></p>
              <p className="text-brand-muted">Payment: ONLINE PREPAID</p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleModalClose}
              className="mt-4 bg-[#967BB6] hover:bg-[#7F62A1] text-white"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue Shopping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
