import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();

// Frontend client MUST only use the public anonymous key or publishable key.
// NEVER expose, bundle, or read service-role keys in browser code.
const rawKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();

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

// Resolve effective client URL:
// In browser, using same-origin /supabase-proxy eliminates:
// 1. Browser extension / AdBlocker / Brave Shields blocking *.supabase.co
// 2. CORS preflight errors and mixed content blocks
// 3. Regional ISP / DNS lookup issues on *.supabase.co
export const getEffectiveSupabaseUrl = (): string => {
  return rawUrl;
};

export const getSupabaseAnonKey = (): string => rawKey;

export const getRawSupabaseUrl = (): string => rawUrl;

export const normalizeStorageUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return url;
  const match = url.match(/(?:http:\/\/[^/]+|https:\/\/[^/]+)?(?:\/supabase-proxy)?\/storage\/v1\/object\/(?:public\/)?(.+)$/);
  if (match && rawUrl) {
    const cleanBase = rawUrl.replace(/\/+$/, '');
    return `${cleanBase}/storage/v1/object/public/${match[1]}`;
  }
  return url;
};

const resilientFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (err: any) {
    if (
      typeof window !== 'undefined' &&
      rawUrl &&
      typeof input === 'string' &&
      input.startsWith(rawUrl)
    ) {
      try {
        const proxyUrl = input.replace(rawUrl, `${window.location.origin}/supabase-proxy`);
        return await fetch(proxyUrl, init);
      } catch {
        throw err;
      }
    }
    throw err;
  }
};

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
      global: {
        fetch: resilientFetch,
      },
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

export const requireSupabase = (): SupabaseClient => {
  if (!clientInstance) {
    throw new Error(
      'Supabase is not configured. Please set valid VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file or hosting environment variables.'
    );
  }
  return clientInstance;
};

// Dev-only safe configuration logging
if (import.meta.env.DEV) {
  let urlHost = '';
  try {
    if (rawUrl) urlHost = new URL(rawUrl).host;
  } catch {}
  const keyPrefix = rawKey ? `${rawKey.slice(0, 8)}...${rawKey.slice(-4)}` : 'None';
  console.log('[Supabase Config]', {
    hasUrl: Boolean(rawUrl),
    urlHost: urlHost || 'Missing/Invalid',
    hasKey: Boolean(rawKey),
    keyPrefix,
    isConfigured: isSupabaseConfigured,
  });
}

export interface SupabaseConnectivityStatus {
  success: boolean;
  status: 'success' | 'network_failed' | 'invalid_url' | 'unauthorized' | 'not_found' | 'forbidden' | 'not_configured' | 'error';
  httpStatus?: number;
  urlHost: string;
  message: string;
  details?: string;
  lastChecked: string;
}

export const testSupabaseConnection = async (): Promise<SupabaseConnectivityStatus> => {
  let urlHost = '';
  try {
    if (rawUrl) urlHost = new URL(rawUrl).host;
  } catch {}

  const now = new Date().toLocaleTimeString();

  if (!isSupabaseConfigured || !rawUrl || !rawKey) {
    return {
      success: false,
      status: 'not_configured',
      urlHost: urlHost || 'Missing URL',
      message: 'Supabase URL or Key is missing in .env. Restart Vite dev server after editing .env.',
      lastChecked: now,
    };
  }

  try {
    const targetUrl = getEffectiveSupabaseUrl();
    const endpoint = `${targetUrl.replace(/\/+$/, '')}/rest/v1/products?select=id&limit=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: rawKey,
        Authorization: `Bearer ${rawKey}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return {
        success: true,
        status: 'success',
        httpStatus: res.status,
        urlHost,
        message: `Successfully connected to Supabase (${urlHost}) with HTTP ${res.status}.`,
        lastChecked: now,
      };
    }

    if (res.status === 401) {
      return {
        success: false,
        status: 'unauthorized',
        httpStatus: 401,
        urlHost,
        message: 'Invalid Supabase API Key (HTTP 401 Unauthorized). Please check your key in .env.',
        lastChecked: now,
      };
    }

    if (res.status === 403) {
      return {
        success: false,
        status: 'forbidden',
        httpStatus: 403,
        urlHost,
        message: 'Access Denied by RLS (HTTP 403 Forbidden). Run the SQL permissions in Supabase SQL Editor.',
        lastChecked: now,
      };
    }

    if (res.status === 404) {
      return {
        success: false,
        status: 'not_found',
        httpStatus: 404,
        urlHost,
        message: 'Products table not found (HTTP 404). Run the schema script in Supabase SQL Editor.',
        lastChecked: now,
      };
    }

    const errText = await res.text().catch(() => '');
    return {
      success: false,
      status: 'error',
      httpStatus: res.status,
      urlHost,
      message: `Supabase returned HTTP ${res.status}: ${errText || res.statusText}`,
      lastChecked: now,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return {
        success: false,
        status: 'network_failed',
        urlHost,
        message: `Connection timed out after 8000ms reaching ${urlHost}. Check internet, VPN, or Supabase project status.`,
        lastChecked: now,
      };
    }
    return {
      success: false,
      status: 'network_failed',
      urlHost,
      message: `Browser cannot reach Supabase REST API (${urlHost}). Check internet connection, disable AdBlocker/Brave Shields on localhost, or check if Supabase project is active.`,
      details: err?.message || String(err),
      lastChecked: now,
    };
  }
};

// Fallback client that fails explicitly on write/delete/update operations instead of silent fake success
const createExplicitErrorPromise = (action: string) => {
  const err = new Error(
    `Cannot perform ${action}: Supabase is not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.`
  );
  return Promise.resolve({ data: null, error: err, count: 0 });
};

const createMockBuilder = () => {
  const readPromise: any = Promise.resolve({ data: [], error: null, count: 0 });
  let currentAction = 'read';

  const builder: any = {
    select: () => {
      currentAction = 'read';
      return builder;
    },
    insert: () => {
      currentAction = 'insert';
      return builder;
    },
    update: () => {
      currentAction = 'update';
      return builder;
    },
    delete: () => {
      currentAction = 'delete';
      return builder;
    },
    upsert: () => {
      currentAction = 'upsert';
      return builder;
    },
    eq: () => builder,
    neq: () => builder,
    in: () => builder,
    or: () => builder,
    ilike: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    single: () =>
      currentAction === 'read'
        ? Promise.resolve({ data: null, error: null })
        : createExplicitErrorPromise(currentAction),
    maybeSingle: () =>
      currentAction === 'read'
        ? Promise.resolve({ data: null, error: null })
        : createExplicitErrorPromise(currentAction),
    then: (onfulfilled?: any, onrejected?: any) => {
      if (currentAction === 'read') {
        return readPromise.then(onfulfilled, onrejected);
      }
      return createExplicitErrorPromise(currentAction).then(onfulfilled, onrejected);
    },
    catch: (onrejected?: any) => {
      if (currentAction === 'read') {
        return readPromise.catch(onrejected);
      }
      return createExplicitErrorPromise(currentAction).catch(onrejected);
    },
  };
  return builder;
};

const dummyAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signInWithPassword: async () => ({
    data: { user: null, session: null },
    error: new Error('Supabase not configured. Please add valid credentials in .env'),
  }),
  signInWithOtp: async () => ({
    data: {},
    error: new Error('Supabase not configured'),
  }),
  verifyOtp: async () => ({
    data: { user: null, session: null },
    error: new Error('Supabase not configured'),
  }),
  signInWithOAuth: async () => ({
    data: {},
    error: new Error('Supabase not configured'),
  }),
  signUp: async () => ({
    data: { user: null, session: null },
    error: new Error('Supabase not configured. Please add valid credentials in .env'),
  }),
  signOut: async () => ({ error: null }),
  resetPasswordForEmail: async () => ({
    data: {},
    error: new Error('Supabase not configured'),
  }),
};

const dummyStorage = {
  from: (bucketName: string) => ({
    upload: async () => ({
      data: null,
      error: new Error(`Supabase Storage is not configured. Cannot upload to ${bucketName}.`),
    }),
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
    createBucket: async () => ({
      data: null,
      error: new Error('Supabase Storage is not configured.'),
    }),
    list: async () => ({
      data: null,
      error: new Error('Supabase Storage is not configured.'),
    }),
  }),
  createBucket: async () => ({
    data: null,
    error: new Error('Supabase Storage is not configured.'),
  }),
  getBucket: async () => ({
    data: null,
    error: new Error('Supabase Storage is not configured.'),
  }),
};

export const supabase: any = clientInstance || {
  auth: dummyAuth,
  storage: dummyStorage,
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
