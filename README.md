# 🌸 Girly Tales — Comfort, Elegance & Everyday Shine

**Girly Tales** is a modern, premium, feminine D2C fashion & lifestyle e-commerce web application specializing in **Night Suits / Sleepwear** and **Anti-Tarnish Waterproof Jewellery**.

---

## 💎 Brand Identity & Visual Aesthetics

- **Brand Name**: Girly Tales
- **Color Palette**:
  - **Primary**: Brand Lilac (`#8A70AB`), Lavender Mist (`#F4EFFF`), Deep Violet Charcoal (`#1C1924`)
  - **Accents**: Buttercream Yellow (`#FFF8B8`), Champagne Gold (`#D4AF37`), Soft Blush (`#FCEEF1`)
- **Typography**: *Playfair Display* (Editorial Serif headings), *Cormorant Garamond*, and *Plus Jakarta Sans* (Body)
- **Aesthetic**: Feminine soft luxury, modern Indian D2C brand feel, generous whitespace, rounded glassmorphic cards, micro-animations, and large product photography.

---

## 🚀 Key Features

### 1. Home Page
- **Hero Section**: Editorial split with lifestyle photography, animated badges, and dual primary CTAs (*"Shop Nightwear"* & *"Shop Jewellery"*).
- **Category Spotlights**: Oversized luxury cards for Night Suits and Anti-Tarnish Jewellery.
- **Trending Bestsellers**: 8-item responsive grid with quick add to cart, wishlist toggle, and star ratings.
- **Brand USP Section**:
  - ✨ **Anti-Tarnish Jewellery**: 18K gold vacuum PVD coating, 100% waterproof & sweatproof.
  - 🌙 **Cloud-Soft Fabrics**: Mulberry silk satin blends and 100% breathable organic cottons.
  - 📦 **Fast Pan-India Delivery**: 24-hour dispatch in aesthetic lilac gift boxes.
  - 💕 **Female-Led Craftsmanship**: Designed in India with skin-friendly hypoallergenic materials.
- **Promotional Banner**: *"Your everyday essentials, made beautiful."* with copyable voucher `GIRLY10`.
- **Customer Reviews & Social Proof**: 4.9/5 star verified customer testimonials and Instagram lifestyle feed.

### 2. Shop & Catalog Page
- **Dynamic Category Filters**: All, Night Suits, Jewellery.
- **Sidebar Filters**: Subcategory selector, price slider (₹500 to ₹4,000), size picker (XS to XXL), and in-stock toggle.
- **Sorting**: Featured, Price: Low to High, Price: High to Low, Highest Rated, Newest.
- **Responsive Grid**: 4 columns on desktop, 2-3 on tablet, 2 on mobile.

### 3. Product Details Page (PDP)
- **Multi-Angle Gallery**: Interactive image zoom on hover and thumbnail carousel.
- **Size Selector**: Size picker with interactive **Size Guide Modal** (inches/cm sizing for bust, waist, hips).
- **Interactive CTAs**: "Add to Cart" and "Buy Now" with quantity stepper.
- **"Why You'll Love It"**: 4 styled benefit bullets.
- **Expandable Accordions**: Description & fit, metal/fabric specs, care instructions, and 7-day exchange policy.
- **Customer Reviews Breakdown**: Star distribution and verified buyer reviews.
- **"You May Also Like"**: Intelligent category recommendation slider.

### 4. Slide-out Cart Drawer & Full Cart Page
- **Slide-out Right Panel**: Smooth animation with backdrop blur.
- **Free Shipping Meter**: Animated threshold reaching ₹999.
- **Quantity Management**: Real-time increase/decrease and animated item removal.
- **Coupon Code System**: Test with `GIRLY10` (10% OFF), `WELCOME15` (15% OFF), or `SHINE200`.
- **Order Calculation**: Subtotal, Coupon Discount, Shipping (Free or ₹99), and Grand Total.
- **Local Storage Persistence**: Cart state automatically preserved across page reloads.

### 5. Interactive Mock Checkout
- Complete checkout modal with address input and payment methods (UPI / GPay, Credit/Debit Card, Cash on Delivery).
- Order confirmation screen with celebration confetti and generated Order ID (e.g. `GT-102938`).

### 6. Search Overlay
- Real-time instant search across product titles, descriptions, categories, and tags.
- Trending keyword suggestions and quick bestsellers.

### 7. Login & Sign Up Modal
- Tabbed authentication UI with form validation and mock user session persistence.

---

## 🛠️ Technology Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Vanilla CSS Design System
- **Icons**: Lucide React
- **Persistence**: Browser `localStorage`
- **Build Tool**: Vite

---

## 🚀 Hosting on Vercel

The project is fully configured for one-click deployment on **Vercel** with single-page app (SPA) routing and production asset bundling.

### Step 1: Push to GitHub
1. Initialize git and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Girly Tales - Vercel Ready"
   ```
2. Create a repository on [GitHub](https://github.com/new) and push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/girly-tales.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Import into Vercel
1. Log in to [Vercel](https://vercel.com) and click **"Add New..." > "Project"**.
2. Select your `girly-tales` GitHub repository.
3. Vercel will automatically detect **Vite** as the framework.
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 3: Add Environment Variables in Vercel
In the **Environment Variables** section before deploying, add:
- `VITE_SUPABASE_URL`: Your Supabase Project URL (`https://xyz.supabase.co`)
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon / publishable key
- `VITE_SUPABASE_ANON_KEY`: (Optional duplicate for anon key)

### Step 4: Click "Deploy"
Your website will be built and deployed with custom HTTPS URL (e.g., `https://girly-tales.vercel.app`). All subroutes, category filters, and admin dashboard routes will work cleanly without 404 errors thanks to [`vercel.json`](./vercel.json).
