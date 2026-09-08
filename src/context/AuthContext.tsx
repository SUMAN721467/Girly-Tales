import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/product';
import { useCart } from './CartContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'signup';
  openAuthModal: (tab?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  sendEmailOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmailOnly: (email: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password?: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password?: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const USER_STORAGE_KEY = 'girly_tales_user_v1';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const { triggerToast } = useCart();

  // Listen to Supabase auth state changes if configured
  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session?.user && mounted) {
          const u = session.user;
          const userMeta = u.user_metadata || {};
          const fallbackName = userMeta.name || userMeta.full_name || u.email?.split('@')[0] || 'Member';
          const newUser: User = {
            id: u.id,
            email: u.email || '',
            name: fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1),
            phone: userMeta.phone,
            isLoggedIn: true,
            avatarUrl: userMeta.avatar_url,
            createdAt: u.created_at,
          };
          setUser(newUser);
        }
      } catch (err) {
        console.warn('Supabase session load info:', err);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = session.user;
        const userMeta = u.user_metadata || {};
        const fallbackName = userMeta.name || userMeta.full_name || u.email?.split('@')[0] || 'Member';
        const newUser: User = {
          id: u.id,
          email: u.email || '',
          name: fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1),
          phone: userMeta.phone,
          isLoggedIn: true,
          avatarUrl: userMeta.avatar_url,
          createdAt: u.created_at,
        };
        setUser(newUser);
      } else {
        setUser((prev) => (prev?.id ? null : prev));
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to sync auth state:', e);
    }
  }, [user]);

  const openAuthModal = (tab: 'login' | 'signup' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const sendEmailOtp = async (email: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
          },
        });
        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }
      }
      triggerToast('OTP code sent! 📬', `Check your email inbox at ${email}`, undefined, 'info');
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Failed to send OTP.' };
    }
  };

  const verifyEmailOtp = async (email: string, token: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: token.trim(),
          type: 'email',
        });

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          const u = data.user;
          const userMeta = u.user_metadata || {};
          const fallbackName = userMeta.name || userMeta.full_name || u.email?.split('@')[0] || 'Member';
          const capitalized = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
          const newUser: User = {
            id: u.id,
            email: u.email || email,
            name: capitalized,
            phone: userMeta.phone,
            isLoggedIn: true,
            createdAt: u.created_at,
          };
          setUser(newUser);
          closeAuthModal();
          triggerToast(`Welcome back, ${capitalized}! ✨`, 'Logged in successfully.', undefined, 'success');
          setIsLoading(false);
          return { success: true };
        }
      }

      // Local fallback for testing
      const formattedName = email.split('@')[0].replace('.', ' ');
      const capitalName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
      const newUser: User = {
        email: email.trim(),
        name: capitalName,
        isLoggedIn: true,
      };
      setUser(newUser);
      closeAuthModal();
      triggerToast(`Welcome back, ${capitalName}! ✨`, 'Logged in successfully.', undefined, 'success');
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Verification failed. Please check the code.' };
    }
  };

  const loginWithEmailOnly = async (email: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    return sendEmailOtp(email);
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }
        if (data?.url) {
          window.location.href = data.url;
          return { success: true };
        }
      }

      // Demo Google login fallback
      const newUser: User = {
        name: 'Google User',
        email: 'user@gmail.com',
        isLoggedIn: true,
      };
      setUser(newUser);
      closeAuthModal();
      triggerToast('Signed in with Google! 🌟', 'Welcome to Girly Tales!', undefined, 'success');
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Google sign in failed.' };
    }
  };

  const login = async (email: string, password?: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
            setIsLoading(false);
            return { success: false, error: error.message };
          }
          console.warn('Supabase login warning (falling back):', error.message);
        } else if (data.user) {
          const u = data.user;
          const userMeta = u.user_metadata || {};
          const displayName = userMeta.name || name || u.email?.split('@')[0] || 'Member';
          const capitalized = displayName.charAt(0).toUpperCase() + displayName.slice(1);
          const newUser: User = {
            id: u.id,
            email: u.email || email,
            name: capitalized,
            isLoggedIn: true,
            createdAt: u.created_at,
          };
          setUser(newUser);
          closeAuthModal();
          triggerToast(`Welcome back, ${capitalized}! ✨`, 'Happy shopping!', undefined, 'success');
          setIsLoading(false);
          return { success: true };
        }
      }

      // Local / Offline fallback logic
      const formattedName = name || email.split('@')[0].replace('.', ' ');
      const capitalName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
      const newUser: User = {
        email: email.trim(),
        name: capitalName,
        isLoggedIn: true,
      };
      setUser(newUser);
      closeAuthModal();
      triggerToast(`Welcome back, ${capitalName}! ✨`, 'Happy shopping!', undefined, 'success');
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Login failed. Please try again.' };
    }
  };

  const signup = async (name: string, email: string, password?: string, phone?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && password) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: name.trim(),
              phone: phone?.trim(),
            },
          },
        });

        if (error) {
          console.warn('Supabase signup warning:', error.message);
          setIsLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          const newUser: User = {
            id: data.user.id,
            name: name.trim(),
            email: email.trim(),
            phone: phone?.trim(),
            isLoggedIn: true,
            createdAt: data.user.created_at,
          };
          setUser(newUser);
          closeAuthModal();
          triggerToast(`Welcome to Girly Tales, ${name}! 💕`, 'Your account has been created.', undefined, 'success');
          setIsLoading(false);
          return { success: true };
        }
      }

      // Local fallback
      const newUser: User = {
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim(),
        isLoggedIn: true,
      };
      setUser(newUser);
      closeAuthModal();
      triggerToast(`Welcome to Girly Tales, ${name}! 💕`, 'Your account has been created.', undefined, 'success');
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Signup failed. Please try again.' };
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) {
          return { success: false, error: error.message };
        }
      }
      triggerToast('Password reset link sent! 💌', 'Please check your email inbox.', undefined, 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send reset email.' };
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Supabase logout note:', e);
    }
    setUser(null);
    triggerToast('Logged out successfully', 'See you again soon!', undefined, 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user?.isLoggedIn,
        isLoading,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        sendEmailOtp,
        verifyEmailOtp,
        loginWithEmailOnly,
        loginWithGoogle,
        login,
        signup,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
