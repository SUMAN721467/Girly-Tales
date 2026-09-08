import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from '../types/product';

interface ToastData {
  id: string;
  message: string;
  submessage?: string;
  product?: Product;
  type: 'cart' | 'wishlist' | 'info' | 'success';
}

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
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  toasts: ToastData[];
  dismissToast: (id: string) => void;
  triggerToast: (message: string, submessage?: string, product?: Product, type?: 'cart' | 'wishlist' | 'info' | 'success') => void;
}

const FREE_SHIPPING_THRESHOLD = 999;
const STANDARD_SHIPPING_FEE = 99;
const CART_STORAGE_KEY = 'girly_tales_cart_v1';

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist cart:', e);
    }
  }, [items]);

  const triggerToast = (
    message: string,
    submessage?: string,
    product?: Product,
    type: 'cart' | 'wishlist' | 'info' | 'success' = 'cart'
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newToast: ToastData = { id, message, submessage, product, type };
    setToasts((prev) => [...prev.slice(-3), newToast]);

    // Auto dismiss after 3.8s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToCart = (
    product: Product,
    quantity: number = 1,
    selectedSize?: string,
    selectedColor?: string
  ) => {
    const size = selectedSize || (product.sizes ? product.sizes[0] : undefined);
    const color = selectedColor || (product.colors ? product.colors[0].name : undefined);
    const itemId = `${product.id}-${size || 'default'}-${color || 'default'}`;

    setItems((prev) => {
      const existing = prev.find((item) => item.id === itemId);
      if (existing) {
        return prev.map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { id: itemId, product, quantity, selectedSize: size, selectedColor: color }];
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
    setItems((prev) => prev.filter((i) => i.id !== cartItemId));
    if (item) {
      triggerToast('Removed from cart', item.product.name, undefined, 'info');
    }
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  // Calculations
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  let discountAmount = 0;
  if (appliedCoupon === 'GIRLY10' || appliedCoupon === 'GIRLYTALES10') {
    discountAmount = Math.round(subtotal * 0.1); // 10% OFF
  } else if (appliedCoupon === 'WELCOME15') {
    discountAmount = Math.round(subtotal * 0.15); // 15% OFF
  } else if (appliedCoupon === 'SHINE200' && subtotal >= 1200) {
    discountAmount = 200; // Flat 200 OFF
  }

  const shippingFee =
    subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const freeShippingProgress = Math.min(
    100,
    Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100)
  );

  const applyCoupon = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode === 'GIRLY10' || cleanCode === 'GIRLYTALES10') {
      setAppliedCoupon('GIRLY10');
      triggerToast('Coupon Applied! 🎉', '10% discount applied to your order', undefined, 'success');
      return { success: true, message: '10% discount applied successfully!' };
    }
    if (cleanCode === 'WELCOME15') {
      setAppliedCoupon('WELCOME15');
      triggerToast('Welcome Offer Applied! 🎉', '15% discount applied', undefined, 'success');
      return { success: true, message: '15% discount applied!' };
    }
    if (cleanCode === 'SHINE200') {
      if (subtotal < 1200) {
        return { success: false, message: 'Requires minimum order value of ₹1,200' };
      }
      setAppliedCoupon('SHINE200');
      triggerToast('Coupon Applied! 🎉', 'Flat ₹200 OFF applied', undefined, 'success');
      return { success: true, message: 'Flat ₹200 discount applied!' };
    }
    return { success: false, message: 'Invalid coupon code. Try GIRLY10 or WELCOME15' };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
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
        applyCoupon,
        removeCoupon,
        toasts,
        dismissToast,
        triggerToast,
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
