-- ==============================================================================
-- GIRLY TALES - COMPLETE SUPABASE DATABASE SCHEMA & TABLE SETUP SCRIPT
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
    care_instructions JSONB DEFAULT '[]'::jsonb,
    specs JSONB DEFAULT '{}'::jsonb,
    colors JSONB DEFAULT '[]'::jsonb,
    anti_tarnish_guarantee TEXT DEFAULT '',
    waterproof BOOLEAN DEFAULT FALSE,
    hypoallergenic BOOLEAN DEFAULT FALSE,
    is_new_arrival BOOLEAN DEFAULT FALSE,
    is_best_seller BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index on slug & category for fast storefront queries
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
    status TEXT NOT NULL DEFAULT 'Processing',
    payment_method TEXT NOT NULL DEFAULT 'UPI / Prepaid',
    address TEXT DEFAULT '',
    city TEXT DEFAULT '',
    state TEXT DEFAULT '',
    pincode TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_email ON public.orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

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
    verified BOOLEAN DEFAULT TRUE NOT NULL,
    status TEXT DEFAULT 'Approved' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);

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

-- ==============================================================================
-- 7. TABLE: WISHLIST
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- ==============================================================================
-- 8. TABLE: CART_ITEMS
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

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Allow public read access to store content
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Write Categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Write Products" ON public.products FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public Insert Orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Orders" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Public Insert Reviews" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Reviews" ON public.reviews FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Public Write Coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public Write Profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Wishlist" ON public.wishlist FOR SELECT USING (true);
CREATE POLICY "Public Write Wishlist" ON public.wishlist FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Cart" ON public.cart_items FOR SELECT USING (true);
CREATE POLICY "Public Write Cart" ON public.cart_items FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 10. REALTIME REPLICATION SETUP
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
ALTER PUBLICATION supabase_realtime ADD TABLE public.coupons;

-- ==============================================================================
-- 11. AUTOMATIC PROFILE TRIGGER ON AUTH.USERS SIGNUP
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
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 12. SEED DATA INSERTION
-- ==============================================================================

-- Categories Seed
INSERT INTO public.categories (id, name, slug, is_active, order_index)
VALUES 
    ('cat-1', 'Floor', 'floor', TRUE, 0),
    ('cat-2', 'Foldable Mat', 'foldable-mat', TRUE, 1),
    ('cat-3', 'Cushion Mat', 'cushion-mat', TRUE, 2),
    ('cat-4', 'Doormat', 'doormat', FALSE, 3),
    ('cat-5', 'Yoga', 'yoga', TRUE, 4)
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

-- Reviews Seed
INSERT INTO public.reviews (id, product_name, author, rating, title, comment, verified, status)
VALUES 
    ('rev-1', 'Mulberry Silk Satin Notch Collar Set', 'Sabara K.', 5, 'Pure Luxury', 'The softest silk pyjamas I have ever owned! Perfect tailoring and breathable for humid nights.', TRUE, 'Featured'),
    ('rev-2', 'Celestial Constellation 18K Chain', 'Pooja M.', 5, 'Never Tarnishes', 'I showered with it for 3 weeks straight and it did not tarnish at all. 10/10 recommend!', TRUE, 'Approved'),
    ('rev-3', 'Cloud Soft Modal Nightshirt', 'Natasha R.', 5, 'Like a cloud', 'Feels like wearing a soft cloud. Ordered a second color immediately.', TRUE, 'Approved')
ON CONFLICT (id) DO NOTHING;

-- Orders Seed
INSERT INTO public.orders (id, customer_name, email, phone, items, total, subtotal, shipping_fee, discount_amount, status, payment_method, address, city, state, pincode)
VALUES 
    ('GT-849201', 'Sabara Khan', 'contact.sabara@gmail.com', '+91 98201 45982', '["Mulberry Silk Pajama Set - Blossom Pink (M)", "18K Gold Clover Pendant Necklace"]'::jsonb, 2998, 2998, 0, 0, 'Processing', 'UPI / Prepaid', 'Flat 402, Sea View Apartments, Bandra West', 'Mumbai', 'Maharashtra', '400050'),
    ('GT-849188', 'Priya Sharma', 'priya.s@gmail.com', '+91 98112 34567', '["Celestial Constellation 18K Chain (Gold)"]'::jsonb, 899, 899, 0, 0, 'Shipped', 'UPI / Prepaid', 'House 14, Greater Kailash 1', 'Delhi', 'Delhi', '110048'),
    ('GT-849140', 'Ananya Verma', 'ananya.v@yahoo.com', '+91 97234 56789', '["Cloud Soft Modal Nightshirt - Lavender Mist (L)", "Pearl Aura Huggie Earrings"]'::jsonb, 1998, 1998, 0, 0, 'Delivered', 'Cash on Delivery', 'B-104, Palm Meadows, Whitefield', 'Bengaluru', 'Karnataka', '560066')
ON CONFLICT (id) DO NOTHING;

-- Products Seed (Nightwear & 18K Jewellery)
INSERT INTO public.products (
    id, name, slug, category, sub_category, price, original_price, discount, rating, review_count, 
    images, description, short_description, material, in_stock, stock_quantity, sku, dimensions, variety, tag,
    sizes, features, care_instructions, specs, colors, anti_tarnish_guarantee, waterproof, hypoallergenic, is_new_arrival, is_best_seller
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
        '["Gentle machine wash cold in laundry bag or hand wash", "Line dry in shade to preserve luster", "Iron on reverse with low heat/silk setting"]'::jsonb,
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
        '["Machine wash gentle with similar colors", "Tumble dry low or air dry in gentle sunlight"]'::jsonb,
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
        '["Zero maintenance required! Wear daily in bath and gym.", "Simply rinse with warm soapy water and wipe with soft cloth."]'::jsonb,
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
        '["Rinse after swimming in chlorinated water", "Store in velvet pouch when not in use"]'::jsonb,
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
    in_stock = EXCLUDED.in_stock;

-- Output confirmation notice
SELECT 'GIRLY TALES SUPABASE DATABASE INITIALIZED SUCCESSFULLY! ALL TABLES, RLS, AND SEED DATA ARE READY.' AS status;
