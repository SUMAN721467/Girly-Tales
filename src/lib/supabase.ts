import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isSupabaseConfigured: boolean =
  isValidUrl(rawUrl) &&
  Boolean(rawKey) &&
  rawKey !== 'xxxx' &&
  rawKey.length > 20;

let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    clientInstance = createClient(rawUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'girly_tales_supabase_auth_session_v1',
      },
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
  }
}

// Safe fallback mock object so the app remains resilient even before Supabase keys are configured in Vercel
const dummyAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
  signInWithOtp: async () => ({ data: {}, error: null }),
  verifyOtp: async () => ({ data: { user: null, session: null }, error: null }),
  signInWithOAuth: async () => ({ data: {}, error: null }),
  signUp: async () => ({ data: { user: null, session: null }, error: new Error('Supabase not configured') }),
  signOut: async () => ({ error: null }),
  resetPasswordForEmail: async () => ({ data: {}, error: null }),
};

const createMockBuilder = () => {
  const resultPromise: any = Promise.resolve({ data: [], error: null });
  const builder: any = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    upsert: () => builder,
    eq: () => builder,
    neq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (onfulfilled?: any, onrejected?: any) => resultPromise.then(onfulfilled, onrejected),
    catch: (onrejected?: any) => resultPromise.catch(onrejected),
  };
  return builder;
};

export const supabase: any = clientInstance || {
  auth: dummyAuth,
  from: () => createMockBuilder(),
  channel: () => ({
    on: () => ({
      subscribe: () => ({ unsubscribe: () => {} }),
    }),
    subscribe: () => ({ unsubscribe: () => {} }),
    send: async () => {},
  }),
  removeChannel: () => {},
};

export default supabase;
