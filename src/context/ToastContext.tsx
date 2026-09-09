import React, { createContext, useContext, useState, useCallback } from 'react';
import { Product } from '../types/product';

export interface ToastData {
  id: string;
  message: string;
  submessage?: string;
  product?: Product;
  type: 'cart' | 'wishlist' | 'info' | 'success' | 'error';
}

interface ToastContextType {
  toasts: ToastData[];
  triggerToast: (
    message: string,
    submessage?: string,
    product?: Product,
    type?: 'cart' | 'wishlist' | 'info' | 'success' | 'error'
  ) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const triggerToast = useCallback(
    (
      message: string,
      submessage?: string,
      product?: Product,
      type: 'cart' | 'wishlist' | 'info' | 'success' | 'error' = 'cart'
    ) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      const newToast: ToastData = { id, message, submessage, product, type };
      setToasts((prev) => [...prev.slice(-3), newToast]);

      setTimeout(() => {
        dismissToast(id);
      }, 3800);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, triggerToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
