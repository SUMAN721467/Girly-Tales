export const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- GIRLY TALES - COMPLETE SUPABASE DATABASE SCHEMA & MIGRATION SCRIPT
-- ==============================================================================
-- Run this script in your Supabase Dashboard:
-- 1. Go to https://supabase.com/dashboard/project/_/sql
-- 2. Click "New query"
-- 3. Paste this entire script
-- 4. Click "Run"
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. TABLE: CATEGORIES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    order_index INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- ==============================================================================
-- 2. TABLE: PRODUCTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    category TEXT NOT NULL,
    sub_category TEXT DEFAULT '',
    price NUMERIC NOT NULL DEFAULT 0,
    original_price NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    rating NUMERIC DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    images JSONB DEFAULT '[]'::jsonb NOT NULL,
    description TEXT DEFAULT '',
    short_description TEXT DEFAULT '',
    material TEXT DEFAULT '',
    in_stock BOOLEAN DEFAULT TRUE NOT NULL,
    stock_quantity INTEGER DEFAULT 10,
    sku TEXT DEFAULT '',
    dimensions TEXT DEFAULT '',
    variety TEXT DEFAULT '',
    tag TEXT DEFAULT '',
    sizes JSONB DEFAULT '[]'::jsonb,
    features JSONB DEFAULT '[]'::jsonb,
    highlights JSONB DEFAULT '[]'::jsonb,
    care_instructions JSONB DEFAULT '[]'::jsonb,
    delivery_policy TEXT DEFAULT '',
    specs JSONB DEFAULT '{}'::jsonb,
    colors JSONB DEFAULT '[]'::jsonb,
    anti_tarnish_guarantee TEXT DEFAULT '',
    waterproof BOOLEAN DEFAULT FALSE,
    hypoallergenic BOOLEAN DEFAULT FALSE,
    is_new_arrival BOOLEAN DEFAULT FALSE,
    is_best_seller BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration safety for existing products table (add every column if missing)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sub_category TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS material TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS in_stock BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 10;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS dimensions TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variety TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS highlights JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS care_instructions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_policy TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS anti_tarnish_guarantee TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS waterproof BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS hypoallergenic BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

-- ==============================================================================
-- 3. TABLE: ORDERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT DEFAULT '',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total NUMERIC NOT NULL DEFAULT 0,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    shipping_fee NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    seller_status TEXT NOT NULL DEFAULT 'Pending',
    customer_status TEXT NOT NULL DEFAULT 'Paid',
    status TEXT NOT NULL DEFAULT 'Pending',
    payment_method TEXT NOT NULL DEFAULT 'UPI / Prepaid',
    address TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    pincode TEXT DEFAULT '',
    special_instructions TEXT DEFAULT '',
    courier_name TEXT DEFAULT '',
    tracking_number TEXT DEFAULT '',
    tracking_url TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_status TEXT DEFAULT 'Pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_status TEXT DEFAULT 'Paid';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS special_instructions TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url TEXT DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON public.orders(seller_status);

-- ==============================================================================
-- 4. TABLE: REVIEWS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    product_name TEXT NOT NULL,
    author TEXT NOT NULL,
    rating NUMERIC NOT NULL DEFAULT 5,
    title TEXT DEFAULT '',
    comment TEXT NOT NULL,
    images JSONB DEFAULT '[]'::jsonb,
    verified BOOLEAN DEFAULT TRUE NOT NULL,
    status TEXT DEFAULT 'Approved' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Approved' NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);

-- ==============================================================================
-- 4.1 TABLE: TESTIMONIALS (HOMEPAGE CUSTOMER QUOTES & TESTIMONIALS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.testimonials (
    id TEXT PRIMARY KEY,
    author TEXT NOT NULL,
    rating NUMERIC NOT NULL DEFAULT 5,
    comment TEXT NOT NULL,
    product_name TEXT DEFAULT '18K Anti-Tarnish Jewels',
    product_id TEXT,
    location TEXT DEFAULT 'Verified Buyer',
    verified BOOLEAN DEFAULT TRUE NOT NULL,
    status TEXT DEFAULT 'Approved' NOT NULL,
    order_index INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS author TEXT NOT NULL DEFAULT 'Verified Buyer';
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS rating NUMERIC NOT NULL DEFAULT 5;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS comment TEXT NOT NULL DEFAULT '';
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT '18K Anti-Tarnish Jewels';
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Verified Buyer';
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Approved' NOT NULL;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE INDEX IF NOT EXISTS idx_testimonials_status ON public.testimonials(status);
CREATE INDEX IF NOT EXISTS idx_testimonials_order_index ON public.testimonials(order_index);

-- ==============================================================================
-- 5. TABLE: COUPONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount TEXT NOT NULL,
    description TEXT DEFAULT '',
    min_spend NUMERIC DEFAULT 0 NOT NULL,
    used_count INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'Active' NOT NULL,
    expires TEXT DEFAULT '2026-12-31' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS min_spend NUMERIC DEFAULT 0 NOT NULL;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' NOT NULL;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS expires TEXT DEFAULT '2026-12-31' NOT NULL;

-- ==============================================================================
-- 6. TABLE: PROFILES (SYNCED WITH SUPABASE AUTH)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'customer',
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ==============================================================================
-- 7. TABLE: SHIPPING_ADDRESSES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shipping_addresses (
    id TEXT PRIMARY KEY,
    user_email TEXT,
    user_id TEXT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    pincode TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    address_line TEXT NOT NULL,
    type TEXT DEFAULT 'Home',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user ON public.shipping_addresses(user_email, user_id);

-- ==============================================================================
-- 8. TABLE: WISHLIST
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON public.wishlist(user_id);

-- ==============================================================================
-- 9. TABLE: CART_ITEMS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    selected_size TEXT,
    selected_color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);

-- ==============================================================================
-- 10. TABLE: STORE_SETTINGS (ADMIN HOMEPAGE & GENERAL SETTINGS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.store_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 11. TABLE: PROMOTIONS (ADMIN PROMOTIONS MANAGER)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.promotions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    discount TEXT NOT NULL,
    badge TEXT DEFAULT 'Special',
    active BOOLEAN DEFAULT TRUE NOT NULL,
    banner_text TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 12. TABLE: SHIPPING_RULES (ADMIN SHIPPING CONFIGURATION)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shipping_rules (
    id TEXT PRIMARY KEY,
    free_threshold NUMERIC DEFAULT 999 NOT NULL,
    standard_rate NUMERIC DEFAULT 99 NOT NULL,
    express_rate NUMERIC DEFAULT 199 NOT NULL,
    cod_handling_fee NUMERIC DEFAULT 49 NOT NULL,
    estimated_days TEXT DEFAULT '2 to 4 Business Days' NOT NULL,
    couriers JSONB DEFAULT '["BlueDart Express", "Delhivery Surface", "DTDC Prime"]'::jsonb NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 13. TABLE: FAQS (ADMIN FAQ MANAGER)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.faqs (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    order_index INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14.1 Categories
DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
DROP POLICY IF EXISTS "Public Write Categories" ON public.categories;
DROP POLICY IF EXISTS "Admin Manage Categories" ON public.categories;
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Manage Categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- 14.2 Products
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
DROP POLICY IF EXISTS "Public Write Products" ON public.products;
DROP POLICY IF EXISTS "Admin Manage Products" ON public.products;
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Manage Products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- 14.3 Orders
DROP POLICY IF EXISTS "Public Read Orders" ON public.orders;
DROP POLICY IF EXISTS "Debug public read orders" ON public.orders;
DROP POLICY IF EXISTS "Public Write Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Insert Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Update Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Delete Orders" ON public.orders;
CREATE POLICY "Debug public read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public Read Orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public Insert Orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Orders" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Orders" ON public.orders FOR DELETE USING (true);

-- 14.4 Reviews
DROP POLICY IF EXISTS "Public Read Reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public Write Reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public Insert Reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public Update Reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public Delete Reviews" ON public.reviews;
CREATE POLICY "Public Read Reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Public Insert Reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Reviews" ON public.reviews FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Reviews" ON public.reviews FOR DELETE USING (true);

-- 14.4.1 Testimonials
DROP POLICY IF EXISTS "Public Read Testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Public Write Testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Public Insert Testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Public Update Testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Public Delete Testimonials" ON public.testimonials;
CREATE POLICY "Public Read Testimonials" ON public.testimonials FOR SELECT USING (true);
CREATE POLICY "Public Insert Testimonials" ON public.testimonials FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Testimonials" ON public.testimonials FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Testimonials" ON public.testimonials FOR DELETE USING (true);

-- 14.5 Coupons
DROP POLICY IF EXISTS "Public Read Coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public Write Coupons" ON public.coupons;
CREATE POLICY "Public Read Coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Public Manage Coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);

-- 14.6 Profiles
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public Write Profiles" ON public.profiles;
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public Manage Profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 14.7 Shipping Addresses
DROP POLICY IF EXISTS "Public Read Shipping Addresses" ON public.shipping_addresses;
DROP POLICY IF EXISTS "Public Write Shipping Addresses" ON public.shipping_addresses;
CREATE POLICY "Public Read Shipping Addresses" ON public.shipping_addresses FOR SELECT USING (true);
CREATE POLICY "Public Manage Shipping Addresses" ON public.shipping_addresses FOR ALL USING (true) WITH CHECK (true);

-- 14.8 Wishlist
DROP POLICY IF EXISTS "Public Read Wishlist" ON public.wishlist;
DROP POLICY IF EXISTS "Public Write Wishlist" ON public.wishlist;
CREATE POLICY "Public Read Wishlist" ON public.wishlist FOR SELECT USING (true);
CREATE POLICY "Public Manage Wishlist" ON public.wishlist FOR ALL USING (true) WITH CHECK (true);

-- 14.9 Cart
DROP POLICY IF EXISTS "Public Read Cart" ON public.cart_items;
DROP POLICY IF EXISTS "Public Write Cart" ON public.cart_items;
CREATE POLICY "Public Read Cart" ON public.cart_items FOR SELECT USING (true);
CREATE POLICY "Public Manage Cart" ON public.cart_items FOR ALL USING (true) WITH CHECK (true);

-- 14.10 Store Settings
DROP POLICY IF EXISTS "Public Read Store Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Public Manage Store Settings" ON public.store_settings;
CREATE POLICY "Public Read Store Settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Public Manage Store Settings" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);

-- 14.11 Promotions
DROP POLICY IF EXISTS "Public Read Promotions" ON public.promotions;
DROP POLICY IF EXISTS "Public Manage Promotions" ON public.promotions;
CREATE POLICY "Public Read Promotions" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "Public Manage Promotions" ON public.promotions FOR ALL USING (true) WITH CHECK (true);

-- 14.12 Shipping Rules
DROP POLICY IF EXISTS "Public Read Shipping Rules" ON public.shipping_rules;
DROP POLICY IF EXISTS "Public Manage Shipping Rules" ON public.shipping_rules;
CREATE POLICY "Public Read Shipping Rules" ON public.shipping_rules FOR SELECT USING (true);
CREATE POLICY "Public Manage Shipping Rules" ON public.shipping_rules FOR ALL USING (true) WITH CHECK (true);

-- 14.13 FAQs
DROP POLICY IF EXISTS "Public Read FAQs" ON public.faqs;
DROP POLICY IF EXISTS "Public Manage FAQs" ON public.faqs;
CREATE POLICY "Public Read FAQs" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Public Manage FAQs" ON public.faqs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 15. STORAGE BUCKET: PRODUCT-IMAGES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Access for Product Images'
    ) THEN
        CREATE POLICY "Public Access for Product Images"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'product-images');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Upload for Product Images'
    ) THEN
        CREATE POLICY "Public Upload for Product Images"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'product-images');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Modify for Product Images'
    ) THEN
        CREATE POLICY "Public Modify for Product Images"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'product-images');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Delete for Product Images'
    ) THEN
        CREATE POLICY "Public Delete for Product Images"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'product-images');
    END IF;
END $$;

-- ==============================================================================
-- 16. REALTIME REPLICATION SETUP
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.testimonials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wishlist;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipping_addresses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.promotions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipping_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.faqs;

-- ==============================================================================
-- 17. AUTOMATIC PROFILE TRIGGER ON AUTH.USERS SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'customer'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 18. SEED DATA INSERTION
-- ==============================================================================

-- Categories Seed
INSERT INTO public.categories (id, name, slug, is_active, order_index)
VALUES 
    ('cat-1', 'Nightwear & Pyjamas', 'nightwear', TRUE, 0),
    ('cat-2', '18K Anti-Tarnish Jewels', 'jewellery', TRUE, 1),
    ('cat-3', 'Satin & Silk Sets', 'satin-sets', TRUE, 2),
    ('cat-4', 'Pure Cotton Sets', 'cotton-sets', TRUE, 3),
    ('cat-5', 'Waterproof Necklaces & Rings', 'jewels', TRUE, 4)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    is_active = EXCLUDED.is_active,
    order_index = EXCLUDED.order_index;

-- Coupons Seed
INSERT INTO public.coupons (id, code, discount, description, min_spend, used_count, status, expires)
VALUES 
    ('cp-1', 'GIRLY10', '10% OFF', 'VIP Member Exclusive Welcome Perk', 999, 14, 'Active', '2026-12-31'),
    ('cp-2', 'SILKLOVE', '15% OFF', 'Nightwear & Loungewear Collection', 1499, 8, 'Active', '2026-11-30'),
    ('cp-3', '18KGOLD', '₹200 OFF', '18K Anti-Tarnish Jewellery Orders', 1299, 5, 'Active', '2026-10-15'),
    ('cp-4', 'FREESHIP', 'Free Express Delivery', 'Prepaid Orders Across All Pincodes', 0, 22, 'Active', 'Unlimited')
ON CONFLICT (id) DO UPDATE SET 
    code = EXCLUDED.code,
    discount = EXCLUDED.discount,
    description = EXCLUDED.description,
    min_spend = EXCLUDED.min_spend,
    status = EXCLUDED.status;

-- Store Settings Seed
INSERT INTO public.store_settings (key, value)
VALUES 
    ('homepage', '{
        "announcementText": "✦ BUY 3 SETS FOR ₹2,999 ✦ FREE 18K GOLD POLISH GUARANTEE ✦ FREE SHIPPING ON ORDERS OVER ₹999 ✦",
        "heroHeadline": "EVERYDAY LUXURY NIGHTWEAR & 18K JEWELS",
        "heroSubtext": "Indulge in feather-soft Mulberry Silk & 18K Anti-Tarnish jewellery crafted for graceful everyday living."
    }'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Promotions Seed
INSERT INTO public.promotions (id, name, discount, badge, active, banner_text)
VALUES 
    ('p-1', 'Monsoon Silk Comfort Bundle', 'Buy Any 3 Sets for ₹2,999', 'Best Deal', TRUE, 'Flat 35% Savings on Silk Lounge Combos'),
    ('p-2', '18K Gold Jewellery Welcome Gift', 'Free Luxury Jewellery Pouch with every ₹1,500+ order', 'Freebie', TRUE, 'Complimentary Anti-Tarnish Pouch included'),
    ('p-3', 'VIP Secret Drop Sale', 'Extra 10% for Registered Members', 'Members Only', TRUE, 'Use code GIRLY10 at instant checkout')
ON CONFLICT (id) DO NOTHING;

-- Shipping Rules Seed
INSERT INTO public.shipping_rules (id, free_threshold, standard_rate, express_rate, cod_handling_fee, estimated_days, couriers)
VALUES 
    ('default', 999, 99, 199, 49, '2 to 4 Business Days', '["BlueDart Express", "Delhivery Surface", "DTDC Prime"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- FAQs Seed
INSERT INTO public.faqs (id, category, question, answer, order_index)
VALUES 
    ('f-1', 'Nightwear & Loungewear', 'How do I care for Mulberry silk and modal sets?', 'We recommend gentle machine wash in cold water using a laundry wash bag, or delicate hand wash with mild liquid detergent. Line dry in shade to preserve color luster.', 0),
    ('f-2', '18K Anti-Tarnish Jewellery', 'Can I wear the 18K jewellery while bathing or swimming?', 'Yes! Our pieces are crafted with premium stainless steel / brass cores with vacuum-plated 18K real gold and protective clear ceramic seal, making them 100% waterproof, sweatproof, and hypoallergenic.', 1),
    ('f-3', 'Shipping & Delivery', 'How soon will my order be dispatched and delivered?', 'Orders placed before 2 PM IST are dispatched on the same business day. Delivery takes 2-4 business days for metro cities and 3-5 days for other locations.', 2),
    ('f-4', 'Returns & Exchanges', 'What is your size exchange and return policy?', 'We offer hassle-free 7-day doorstep size exchanges. If the nightwear size does not fit comfortably, you can request an exchange in 1 click from your account.', 3)
ON CONFLICT (id) DO NOTHING;

-- Testimonials Seed
INSERT INTO public.testimonials (id, author, rating, comment, product_name, location, verified, status, order_index)
VALUES 
    ('t-1', 'Ananya S.', 5, 'Wore my necklace daily to the gym and in hot showers for 3 months — still 100% shiny gold with zero tarnish!', '18K Anti-Tarnish Necklace', 'Mumbai', TRUE, 'Approved', 0),
    ('t-2', 'Priya M.', 5, 'The softest pure cotton nightwear I have ever worn. Breathable, airy, and the floral print is so aesthetic.', 'Blossom Pure Cotton PJ Set', 'Kolkata', TRUE, 'Approved', 1),
    ('t-3', 'Rhea S.', 5, 'Luxury boutique unboxing with velvet pouch. Arrived in 2 days and looks just like solid 18K gold jewellery.', 'Clover Anti-Tarnish Bracelet', 'Bengaluru', TRUE, 'Approved', 2),
    ('t-4', 'Sneha K.', 5, 'Completely hypoallergenic! I have sensitive skin and these earrings never cause any itchiness or redness.', 'Waterproof Huggie Hoops', 'Delhi', TRUE, 'Approved', 3)
ON CONFLICT (id) DO UPDATE SET 
    author = EXCLUDED.author,
    rating = EXCLUDED.rating,
    comment = EXCLUDED.comment,
    product_name = EXCLUDED.product_name,
    location = EXCLUDED.location,
    status = EXCLUDED.status,
    order_index = EXCLUDED.order_index;

-- Products Seed (Nightwear & 18K Jewellery)
INSERT INTO public.products (
    id, name, slug, category, sub_category, price, original_price, discount, rating, review_count, 
    images, description, short_description, material, in_stock, stock_quantity, sku, dimensions, variety, tag,
    sizes, features, highlights, care_instructions, delivery_policy, specs, colors, anti_tarnish_guarantee, waterproof, hypoallergenic, is_new_arrival, is_best_seller
)
VALUES 
    (
        'nw-1',
        'Mulberry Silk Satin Notch Collar Set',
        'mulberry-silk-satin-notch-collar-set',
        'nightwear',
        'Satin Sets',
        1899,
        2999,
        36,
        4.9,
        142,
        '["https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1000&q=80", "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80"]'::jsonb,
        'Drift into blissful sleep with our signature Mulberry Silk Satin Notch Collar Set. Crafted from feather-weight, breathable satin with subtle contrast piping, it feels like a gentle caress on your skin.',
        'Ultra-luxe satin with contrast piping and relaxed tailored silhouette.',
        'Premium Mulberry Blend Satin (95% Poly-Silk, 5% Spandex)',
        TRUE,
        15,
        'GT-NW-001',
        'Standard Fit',
        'Long Sleeve',
        'Bestseller',
        '["XS", "S", "M", "L", "XL", "XXL"]'::jsonb,
        '["Breathable, ultra-soft luxury satin", "Classic notch collar with contrast ivory piping", "Elasticated waistband with adjustable drawstring", "Deep functional side pockets on trousers"]'::jsonb,
        '["Free Delivery on all prepaid orders", "7-Day Hassle-Free Size Exchange", "100% Anti-Tarnish & Waterproof"]'::jsonb,
        '["Gentle machine wash cold in laundry bag or hand wash", "Line dry in shade to preserve luster", "Iron on reverse with low heat/silk setting"]'::jsonb,
        'Dispatched within 24 hours. Delivered across India within 2 to 4 business days. Easy 7-day exchange support available on WhatsApp.',
        '{"Fabric": "Premium Silk-Satin", "Fit": "Relaxed Comfort Fit", "Closure": "Front Button Placket"}'::jsonb,
        '[{"name": "Soft Lavender", "hex": "#8A70AB"}, {"name": "Champagne Blush", "hex": "#FCEEF1"}]'::jsonb,
        '',
        FALSE,
        FALSE,
        FALSE,
        TRUE
    ),
    (
        'nw-2',
        'Sage Garden 100% Organic Cotton PJ Set',
        'sage-garden-organic-cotton-pj-set',
        'nightwear',
        'Cotton Sets',
        1499,
        2299,
        34,
        4.8,
        98,
        '["https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80", "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=1000&q=80"]'::jsonb,
        'Woven from 100% certified organic long-staple cotton, this botanical sage printed pyjama set stays crisp, breathable, and softer with every wash.',
        '100% organic cotton printed set designed for all-season breathability.',
        '100% Organic Combed Cotton (200 Thread Count)',
        TRUE,
        20,
        'GT-NW-002',
        'Regular Fit',
        'Short Sleeve',
        'Trending',
        '["S", "M", "L", "XL"]'::jsonb,
        '["100% GOTS certified organic breathable cotton", "Gentle on sensitive skin & hypoallergenic dyes", "Comfort-waist pyjama with satin drawstring"]'::jsonb,
        '["Free Delivery on all prepaid orders", "7-Day Hassle-Free Size Exchange"]'::jsonb,
        '["Machine wash gentle with similar colors", "Tumble dry low or air dry in gentle sunlight"]'::jsonb,
        'Dispatched within 24 hours. Delivered across India within 2 to 4 business days. Easy 7-day exchange support available on WhatsApp.',
        '{"Fabric": "100% Organic Cotton", "Print": "Botanical Floral"}'::jsonb,
        '[{"name": "Sage Green", "hex": "#9BB59B"}, {"name": "Butter Yellow", "hex": "#FFF8B8"}]'::jsonb,
        '',
        FALSE,
        FALSE,
        TRUE,
        FALSE
    ),
    (
        'jw-1',
        '18K Gold Plated Chunky Croissant Dome Ring',
        '18k-gold-chunky-croissant-dome-ring',
        'jewellery',
        'Rings',
        899,
        1499,
        40,
        4.95,
        210,
        '["https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80", "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=80"]'::jsonb,
        'The iconic French Parisian croissant silhouette. Triple-layered in 18K Real Gold via vacuum PVD coating over surgical-grade 316L stainless steel. Wear it in the shower, gym, or pool—it never turns green or loses its mirror shine.',
        '18K PVD gold-coated sculptural dome ring. 100% waterproof & sweatproof.',
        '316L Stainless Steel with 18K Yellow Gold PVD Vacuum Coating',
        TRUE,
        50,
        'GT-JW-001',
        'Band Width: 7mm',
        'Size 6, 7, 8',
        'Bestseller ⭐',
        '[]'::jsonb,
        '["✨ 100% Waterproof, Sweatproof & Perfume-safe", "✨ Lifetime Anti-Tarnish Guarantee", "✨ Hypoallergenic & Nickel-Free", "✨ Mirror polish finish"]'::jsonb,
        '["Lifetime Anti-Tarnish & Waterproof Guarantee", "Free Delivery on all prepaid orders"]'::jsonb,
        '["Zero maintenance required! Wear daily in bath and gym.", "Simply rinse with warm soapy water and wipe with soft cloth."]'::jsonb,
        'Dispatched within 24 hours. Delivered across India within 2 to 4 business days. Easy 7-day exchange support available on WhatsApp.',
        '{"Base Metal": "Medical-Grade 316L Stainless Steel", "Coating": "18K Gold PVD (5x thicker than standard)"}'::jsonb,
        '[]'::jsonb,
        'Lifetime Anti-Tarnish & Waterproof Guarantee',
        TRUE,
        TRUE,
        FALSE,
        TRUE
    ),
    (
        'jw-2',
        'Celestial Freshwater Pearl & Gold Medallion Pendant',
        'celestial-freshwater-pearl-medallion-pendant',
        'jewellery',
        'Necklaces',
        1299,
        2199,
        41,
        4.9,
        164,
        '["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80", "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=80"]'::jsonb,
        'A genuine organic Baroque freshwater pearl paired with an embossed North Star medallion on an adjustable cable chain. Designed for everyday layering and effortless elegance.',
        'Real baroque freshwater pearl on 18K gold anti-tarnish chain.',
        '316L Stainless Steel + 18K Gold PVD + Cultured Baroque Pearl',
        TRUE,
        35,
        'GT-JW-002',
        '40cm + 5cm extension',
        'Baroque Pearl',
        'Customer Fav',
        '[]'::jsonb,
        '["✨ Genuine naturally formed freshwater Baroque Pearl", "✨ 18K Gold Plated anti-tarnish chain", "✨ Safe for sensitive skin & daily swimming"]'::jsonb,
        '["100% Waterproof & Tarnish-Resistant for 2+ Years", "Free Delivery on all prepaid orders"]'::jsonb,
        '["Rinse after swimming in chlorinated water", "Store in velvet pouch when not in use"]'::jsonb,
        'Dispatched within 24 hours. Delivered across India within 2 to 4 business days. Easy 7-day exchange support available on WhatsApp.',
        '{"Chain Length": "40 cm + 5 cm adjustable extension", "Pearl Type": "Cultured Freshwater Baroque"}'::jsonb,
        '[]'::jsonb,
        '100% Waterproof & Tarnish-Resistant for 2+ Years',
        TRUE,
        TRUE,
        FALSE,
        TRUE
    )
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    images = EXCLUDED.images,
    in_stock = EXCLUDED.in_stock,
    highlights = EXCLUDED.highlights,
    care_instructions = EXCLUDED.care_instructions,
    delivery_policy = EXCLUDED.delivery_policy;

SELECT 'GIRLY TALES SUPABASE DATABASE INITIALIZED SUCCESSFULLY! ALL 14 TABLES, STORAGE, RLS, AND SEED DATA ARE READY.' AS status;
`;
