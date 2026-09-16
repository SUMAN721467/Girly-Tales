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
  Lock,
  UserCheck,
  CreditCard,
  Smartphone,
  Package,
  Copy,
  Check,
  ShoppingBag,
  Phone,
  User as UserIcon,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { DatabaseService, RealCoupon, RealOrder, normalizeOrderItems } from '../../lib/databaseService';
import { AddressService } from '../../lib/addressService';
import { ShippingAddress } from '../../types/product';
import { RazorpayService } from '../../lib/razorpayService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderId: string) => void;
  onNavigateToOrders?: () => void;
  onNavigateToShop?: () => void;
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
  onNavigateToOrders,
  onNavigateToShop,
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
    refreshCartFromCloud,
  } = useCart();
  const { user, isLoggedIn, openAuthModal } = useAuth();

  const [step, setStep] = useState<'details' | 'success' | 'payment_failed'>('details');
  const [paymentErrorReason, setPaymentErrorReason] = useState<string>('');
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('custom');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [saveToAddresses, setSaveToAddresses] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'prepaid' | 'cod'>('prepaid');

  // Address form fields
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    pincode: '',
    address: '',
    city: '',
    state: '',
    type: 'Home' as 'Home' | 'Work' | 'Other',
  });

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeDetected, setPincodeDetected] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<RealOrder | null>(null);
  const [countdown, setCountdown] = useState<number>(5);
  const [isCopiedId, setIsCopiedId] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const countdownTimerRef = useRef<any>(null);

  // Load saved addresses on mount/open
  const loadSavedAddresses = async () => {
    const list = await AddressService.getAddresses(user?.email, user?.id);
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

  const [availableCoupons, setAvailableCoupons] = useState<RealCoupon[]>(() => DatabaseService.getCachedCoupons());

  const loadCoupons = async () => {
    try {
      const list = await DatabaseService.getCoupons();
      setAvailableCoupons(list);
    } catch (e) {
      console.warn('Failed to load coupons in checkout:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setIsSubmitting(false);
      setCouponError('');
      setConfirmedOrder(null);
      setCountdown(5);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      loadSavedAddresses();
      loadCoupons();
    } else {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }
  }, [isOpen, user]);

  // Handle 5-second countdown on success
  useEffect(() => {
    if (step === 'success') {
      setCountdown(5);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
            // Auto redirect to orders
            handleGoToOrders();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [step]);

  useEffect(() => {
    window.addEventListener('gt_addresses_sync', loadSavedAddresses);
    const unsub = DatabaseService.subscribeToChanges('coupons', loadCoupons);
    return () => {
      window.removeEventListener('gt_addresses_sync', loadSavedAddresses);
      unsub();
    };
  }, []);

  const suggestedCoupons = availableCoupons.filter(
    (c) => c.showInList && c.status === 'Active' && (c.usageLimit == null || c.usedCount < c.usageLimit)
  );

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
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponCodeInput.trim()) return;

    const res = await applyCoupon(couponCodeInput);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponCodeInput('');
      setCouponError('');
    }
  };

  const handleQuickApply = async (code: string) => {
    setCouponError('');
    await applyCoupon(code);
  };

  const handleGoToOrders = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setStep('details');
    onClose();
    if (onNavigateToOrders) {
      onNavigateToOrders();
    } else {
      window.location.href = '/orders';
    }
  };

  const handleContinueShopping = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setStep('details');
    onClose();
    if (onNavigateToShop) {
      onNavigateToShop();
    }
  };

  const handleCopyOrderId = (idToCopy: string) => {
    navigator.clipboard.writeText(idToCopy);
    setIsCopiedId(true);
    setTimeout(() => setIsCopiedId(false), 2000);
  };

  const handleModalClose = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setStep('details');
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn || !user) {
      triggerToast('Login Required', 'Please log in or sign up to place your order.', undefined, 'error');
      openAuthModal('login');
      return;
    }

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
        }, user?.email, user?.id);
      } catch (err) {
        console.warn('Address auto-save note:', err);
      }
    }

    const generatedId = 'GT-' + Math.floor(100000 + Math.random() * 900000);
    const structuredOrderItems = items.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      size: item.selectedSize || '',
      variant: item.product.category === 'jewellery' ? '18K Gold' : 'Standard',
      image: item.product.images?.[0] || '',
    }));

    const isCod = paymentMethod === 'cod';

    // 1. If Online Prepaid is selected, launch Razorpay Standard Web Checkout
    if (!isCod) {
      try {
        await RazorpayService.initiateCheckout({
          amountInRupees: finalTotal,
          receiptId: generatedId,
          customer: {
            name: formData.name,
            email: formData.email || user?.email || 'customer@girlytales.com',
            phone: formData.phone,
          },
          description: `Girly Tales Order #${generatedId} (${items.length} items)`,
          notes: {
            orderId: generatedId,
            customerEmail: formData.email || user?.email || '',
          },
          onSuccess: async (rzpRes) => {
            try {
              const created = await DatabaseService.createOrder({
                id: generatedId,
                customerName: formData.name || 'Customer',
                email: formData.email || user?.email || '',
                phone: formData.phone || '',
                items: structuredOrderItems.length > 0 ? structuredOrderItems : [
                  {
                    productId: 'prod-default',
                    name: 'Mulberry Silk Lounge Set',
                    price: finalTotal,
                    quantity: 1,
                    size: 'Free Size',
                    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
                  },
                ],
                total: finalTotal,
                subtotal: subtotal,
                shippingFee: shippingFee,
                discountAmount: discountAmount,
                sellerStatus: 'Pending',
                customerStatus: 'Paid',
                status: 'Pending',
                paymentMethod: 'Razorpay Online (Prepaid)',
                address: formData.address || '',
                city: formData.city || 'Mumbai',
                state: formData.state || 'Maharashtra',
                pincode: formData.pincode || '',
                specialInstructions: `Razorpay Payment ID: ${rzpRes.razorpay_payment_id} | Order: ${rzpRes.razorpay_order_id}`,
              });

              if (appliedCoupon) {
                await DatabaseService.incrementCouponUsedCount(appliedCoupon);
              }

              setConfirmedOrder(created);
              setOrderId(generatedId);
              setIsSubmitting(false);
              setStep('success');
              clearCart();
              triggerToast('Payment Successful! 🎉', `Order #${generatedId} confirmed via Razorpay.`, undefined, 'success');
              onOrderSuccess(generatedId);
            } catch (err: any) {
              console.error('Order save error:', err);
              setIsSubmitting(false);
              triggerToast('Order Record Failed', err?.message || 'Payment received but failed to record order in database. Please contact support.', undefined, 'error');
            }
          },
          onDismiss: () => {
            setIsSubmitting(false);
            triggerToast('Payment Cancelled', 'Razorpay checkout was closed. You can retry when ready.', undefined, 'info');
          },
          onError: async (errMsg) => {
            setIsSubmitting(false);
            const failReason = errMsg || 'Payment was declined by the bank or gateway.';
            setPaymentErrorReason(failReason);
            setOrderId(generatedId);

            // Record failed order in Supabase so it appears in My Orders as Payment Failed (Stock is NOT deducted)
            try {
              const failedOrder = await DatabaseService.createOrder({
                id: generatedId,
                customerName: formData.name || 'Customer',
                email: formData.email || user?.email || '',
                phone: formData.phone || '',
                items: structuredOrderItems,
                total: finalTotal,
                subtotal: subtotal,
                shippingFee: shippingFee,
                discountAmount: discountAmount,
                sellerStatus: 'Cancelled by Seller',
                customerStatus: 'Payment Failed',
                status: 'Cancelled',
                paymentMethod: 'Razorpay Online (Payment Failed)',
                address: formData.address || '',
                city: formData.city || 'Mumbai',
                state: formData.state || 'Maharashtra',
                pincode: formData.pincode || '',
                specialInstructions: `Payment Failed: ${failReason}`,
              });
              setConfirmedOrder(failedOrder);
            } catch (saveErr) {
              console.warn('Failed order record error:', saveErr);
            }

            // IMPORTANT: Cart is NOT cleared! Cart items remain safe.
            setStep('payment_failed');
            triggerToast('Payment Failed', failReason, undefined, 'error');
          },
        });
      } catch (err: any) {
        setIsSubmitting(false);
        setPaymentErrorReason(err?.message || 'Failed to initialize Razorpay checkout.');
        setStep('payment_failed');
        triggerToast('Payment Error', err?.message || 'Failed to initialize Razorpay checkout.', undefined, 'error');
      }
      return;
    }

    // 2. If Cash on Delivery (COD) is selected
    try {
      const created = await DatabaseService.createOrder({
        id: generatedId,
        customerName: formData.name || 'Customer',
        email: formData.email || user?.email || '',
        phone: formData.phone || '',
        items: structuredOrderItems.length > 0 ? structuredOrderItems : [
          {
            productId: 'prod-default',
            name: 'Mulberry Silk Lounge Set',
            price: finalTotal,
            quantity: 1,
            size: 'Free Size',
            image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
          },
        ],
        total: finalTotal,
        subtotal: subtotal,
        shippingFee: shippingFee,
        discountAmount: discountAmount,
        sellerStatus: 'Pending',
        customerStatus: 'Pending',
        status: 'Pending',
        paymentMethod: 'Cash on Delivery',
        address: formData.address || '',
        city: formData.city || 'Mumbai',
        state: formData.state || 'Maharashtra',
        pincode: formData.pincode || '',
        specialInstructions: 'COD Order',
      });

      if (appliedCoupon) {
        await DatabaseService.incrementCouponUsedCount(appliedCoupon);
      }

      setConfirmedOrder(created);
      setOrderId(generatedId);
      setIsSubmitting(false);
      setStep('success');
      clearCart();
      triggerToast('Order Placed! 🎉', `Order #${generatedId} confirmed with Cash on Delivery.`, undefined, 'success');
      onOrderSuccess(generatedId);
    } catch (err: any) {
      console.error('Order save error:', err);
      setIsSubmitting(false);
      triggerToast('Order Failed', err?.message || 'Could not place order in database. Please check connection and try again.', undefined, 'error');
    }
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

        {!isLoggedIn || !user ? (
          <div className="text-center py-8 sm:py-10 px-4 sm:px-6 space-y-6 animate-fade-in">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#FAF8F2] border border-[#EAE6DB] text-[#967BB6] flex items-center justify-center mx-auto shadow-xs">
              <Lock className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.75]" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#967BB6] bg-[#967BB6]/10 px-3 py-1 rounded-full">
                Account Login Required
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-brand-charcoal font-medium">
                Please Log In to Place Order
              </h3>
              <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
                To guarantee safe delivery tracking, auto-save your shipping address, and receive live order updates, please log in or create an account.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openAuthModal('login');
                }}
                className="w-full sm:flex-1 py-3.5 px-6 bg-[#1A1821] hover:bg-[#967BB6] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-[#FBB6CE]" />
                <span>Log In / Sign Up</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-3.5 px-5 bg-[#FAF8F2] hover:bg-stone-100 text-brand-charcoal font-bold text-xs rounded-2xl border border-[#EAE6DB] transition-colors cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : step === 'details' ? (
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

                    {/* Quick suggestion chips (Only coupons enabled with Show in list by Admin) */}
                    {suggestedCoupons.length > 0 && (
                      <div className="flex items-center gap-2 pt-2 flex-wrap">
                        <span className="text-[10px] text-brand-muted font-bold">Suggested:</span>
                        {suggestedCoupons.map((cp) => (
                          <button
                            key={cp.id}
                            type="button"
                            onClick={() => handleQuickApply(cp.code)}
                            className="px-2.5 py-1 bg-white hover:bg-[#fffeea] border border-[#EAE6DB] hover:border-[#967BB6] rounded-lg text-[10px] font-mono font-bold text-[#967BB6] transition-colors cursor-pointer shadow-2xs"
                          >
                            {cp.code} ({cp.discount.includes('Discount') || cp.discount.includes('OFF') ? cp.discount : `${cp.discount} OFF`})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. PAYMENT METHOD (PREPAID ONLY) */}
              <div className="p-4 bg-[#FAF8F2] rounded-2xl border border-[#EAE6DB] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-charcoal flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#967BB6]" />
                    <span>Payment Method</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% Encrypted &amp; Secure
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-[#967BB6] bg-white shadow-sm flex items-start gap-3">
                  <div className="mt-0.5 w-4 h-4 rounded-full border-4 border-[#967BB6] bg-white shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="font-bold text-brand-charcoal">Online Payment (Prepaid Only)</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        Prepaid Only
                      </span>
                    </div>
                    <p className="text-[11px] text-brand-muted leading-tight">
                      UPI (Google Pay, PhonePe, Paytm), Credit &amp; Debit Cards, NetBanking &amp; Wallets via Razorpay
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. ORDER SUMMARY SNAPSHOT */}
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

              {/* 5. PAY NOW CTA BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-[#967BB6] hover:bg-[#7F62A1] active:bg-[#6D528F] text-white font-bold text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-[#967BB6]/30 flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to Razorpay...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Pay Securely with Razorpay • ₹{finalTotal.toLocaleString('en-IN')}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : step === 'payment_failed' ? (
          /* PAYMENT FAILED SCREEN */
          <div className="py-4 sm:py-6 space-y-5 animate-scale-in text-center">
            {/* Warning Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-md">
              <AlertTriangle className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.2]" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                Payment Incomplete
              </span>
              <h3 className="font-sans font-black text-xl sm:text-2xl text-brand-charcoal uppercase tracking-tight">
                Payment Failed • Order Not Placed
              </h3>
              <p className="text-xs text-brand-muted max-w-md mx-auto leading-relaxed">
                {paymentErrorReason || 'Your transaction could not be processed by your bank or payment gateway.'}
              </p>
            </div>

            {/* Refund & Cart Safe Notice Card */}
            <div className="bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl p-4 sm:p-5 space-y-3 text-xs text-left shadow-xs">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1 leading-relaxed">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Auto-Refund Protection Guarantee</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  If any money was debited from your bank account, card, or UPI, don't worry! It will be <strong>automatically refunded</strong> back to your original payment method within <strong>3 - 5 business days</strong>.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#EAE6DB]">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#967BB6]" />
                  <span className="font-bold text-brand-charcoal">Cart Items Preserved ({items.length} products)</span>
                </div>
                <span className="text-xs font-bold text-[#967BB6]">₹{finalTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="w-full sm:flex-1 py-3.5 px-5 bg-[#967BB6] hover:bg-[#7F62A1] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Payment</span>
              </button>

              <button
                type="button"
                onClick={handleGoToOrders}
                className="w-full sm:w-auto py-3.5 px-5 bg-[#FAF8F2] hover:bg-[#fffeea] text-brand-charcoal font-bold text-xs uppercase tracking-wider rounded-2xl border border-[#EAE6DB] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4 text-brand-muted" />
                <span>Go to My Orders</span>
              </button>

              <button
                type="button"
                onClick={handleContinueShopping}
                className="w-full sm:w-auto py-3.5 px-4 text-brand-muted hover:text-brand-charcoal font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                <span>Cancel</span>
              </button>
            </div>
          </div>
        ) : (
          /* RICH LUXURY ORDER CONFIRMATION SCREEN WITH 5S REDIRECT */
          <div className="py-4 sm:py-6 space-y-5 animate-scale-in">
            {/* 1. Header Celebratory Badge */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-md animate-bounce">
                <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 stroke-[2.2]" />
              </div>

              <span className="font-script text-2xl sm:text-3xl text-[#967BB6] block">
                Order Confirmed! 💕
              </span>

              <h3 className="font-sans font-black text-xl sm:text-2xl text-brand-charcoal uppercase tracking-tight">
                Thank You, {(confirmedOrder?.customerName || formData.name).split(' ')[0]}!
              </h3>

              <p className="text-xs text-brand-muted max-w-md mx-auto leading-relaxed">
                Your order has been recorded successfully. Live updates will be sent to <strong>{confirmedOrder?.phone || formData.phone}</strong>.
              </p>
            </div>

            {/* 2. Auto-redirect Countdown Notice */}
            <div className="p-3.5 bg-gradient-to-r from-purple-50 via-[#FAF8F2] to-pink-50 rounded-2xl border border-[#967BB6]/30 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 text-brand-charcoal font-bold">
                <Clock className="w-4 h-4 text-[#967BB6] animate-spin" />
                <span>
                  Auto-redirecting to <strong className="text-[#967BB6]">My Orders</strong> in{' '}
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#967BB6] text-white text-xs font-black shadow-xs">
                    {countdown}s
                  </span>
                </span>
              </div>
              <div className="w-full sm:w-32 bg-stone-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#967BB6] h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* 3. Detailed Order Summary Card */}
            <div className="bg-[#FAF8F2] border border-[#EAE6DB] rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs text-left shadow-xs">
              <div className="flex items-center justify-between border-b border-[#EAE6DB] pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Order ID</span>
                  <span className="font-mono font-bold text-sm text-brand-charcoal">#{confirmedOrder?.id || orderId}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyOrderId(confirmedOrder?.id || orderId)}
                  className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-[#EAE6DB] rounded-lg text-[11px] font-bold text-brand-charcoal flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                >
                  {isCopiedId ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-brand-muted" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-[#967BB6]" />
                    Customer Name
                  </span>
                  <p className="font-bold text-brand-charcoal">{confirmedOrder?.customerName || formData.name}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted flex items-center gap-1">
                    <Phone className="w-3 h-3 text-[#967BB6]" />
                    Mobile Number
                  </span>
                  <p className="font-bold text-brand-charcoal">{confirmedOrder?.phone || formData.phone}</p>
                </div>
              </div>

              <div className="space-y-1 pt-1 border-t border-[#EAE6DB]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#967BB6]" />
                  Shipping Address
                </span>
                <p className="font-medium text-brand-charcoal leading-relaxed">
                  {confirmedOrder?.address || formData.address}, {confirmedOrder?.city || formData.city}, {confirmedOrder?.state || formData.state} -{' '}
                  <strong>{confirmedOrder?.pincode || formData.pincode}</strong>
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#EAE6DB] text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Payment Method</span>
                  <span className="font-bold text-brand-charcoal">
                    {confirmedOrder?.paymentMethod || (paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Prepaid (Razorpay)')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Total Amount</span>
                  <span className="font-black text-sm sm:text-base text-[#967BB6]">
                    ₹{(confirmedOrder?.total ?? finalTotal).toLocaleString('en-IN')}.00
                  </span>
                </div>
              </div>

              {/* Ordered Items Preview */}
              {(() => {
                const orderItems = normalizeOrderItems(confirmedOrder?.items);
                if (orderItems.length === 0) return null;
                return (
                  <div className="pt-2 border-t border-[#EAE6DB] space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">
                      Ordered Items ({orderItems.length})
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {orderItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-[#EAE6DB]">
                          <div className="flex items-center gap-2 min-w-0">
                            {item.image && (
                              <img src={item.image} alt={item.name} className="w-9 h-9 rounded object-cover border border-[#EAE6DB] shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-brand-charcoal text-[11px] truncate">{item.name}</p>
                              <p className="text-[10px] text-brand-muted">
                                Qty: {item.quantity} {item.size ? `• Size: ${item.size}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-xs text-brand-charcoal shrink-0">
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] font-medium flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Estimated Delivery: 2 - 4 Business Days • Express Pan-India Dispatch</span>
              </div>
            </div>

            {/* 4. Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleGoToOrders}
                className="w-full sm:flex-1 py-3.5 px-5 bg-[#967BB6] hover:bg-[#7F62A1] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                <span>Go to My Orders ({countdown}s)</span>
              </button>

              <button
                type="button"
                onClick={handleContinueShopping}
                className="w-full sm:flex-1 py-3.5 px-5 bg-[#FAF8F2] hover:bg-[#fffeea] text-brand-charcoal font-bold text-xs uppercase tracking-wider rounded-2xl border border-[#EAE6DB] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-brand-muted" />
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
