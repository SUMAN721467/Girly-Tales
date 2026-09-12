import { Product, Review } from '../types/product';

export const MOCK_PRODUCTS: Product[] = [
  // =================== NIGHTWEAR PRODUCTS (8 Products) ===================
  {
    id: 'nw-1',
    name: 'Mulberry Silk Satin Notch Collar Set',
    slug: 'mulberry-silk-satin-notch-collar-set',
    category: 'nightwear',
    subCategory: 'Satin Sets',
    price: 1899,
    originalPrice: 2999,
    discount: 36,
    rating: 4.9,
    reviewCount: 142,
    images: [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Drift into blissful sleep with our signature Mulberry Silk Satin Notch Collar Set. Crafted from feather-weight, breathable satin with subtle contrast piping, it feels like a gentle caress on your skin.',
    shortDescription: 'Ultra-luxe satin with contrast piping and relaxed tailored silhouette.',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    material: 'Premium Mulberry Blend Satin (95% Poly-Silk, 5% Spandex)',
    features: [
      'Breathable, ultra-soft luxury satin',
      'Classic notch collar with contrast ivory piping',
      'Elasticated waistband with adjustable drawstring',
      'Deep functional side pockets on trousers',
      'Wrinkle-resistant and machine-wash friendly'
    ],
    careInstructions: [
      'Gentle machine wash cold in laundry bag or hand wash',
      'Use mild detergent; do not bleach',
      'Line dry in shade to preserve luster',
      'Iron on reverse with low heat/silk setting'
    ],
    specs: {
      'Fabric': 'Premium Silk-Satin',
      'Sleeve Length': 'Full Sleeves',
      'Fit': 'Relaxed Comfort Fit',
      'Pocket': '2 Side Pant Pockets',
      'Closure': 'Front Button Placket'
    },
    inStock: true,
    isBestSeller: true,
    tag: 'Bestseller',
    colors: [
      { name: 'Soft Lavender', hex: '#8A70AB' },
      { name: 'Champagne Blush', hex: '#FCEEF1' },
      { name: 'Sage Mint', hex: '#B8CDB8' }
    ]
  },
  {
    id: 'nw-2',
    name: 'Sage Garden 100% Organic Cotton PJ Set',
    slug: 'sage-garden-organic-cotton-pj-set',
    category: 'nightwear',
    subCategory: 'Cotton Sets',
    price: 1499,
    originalPrice: 2299,
    discount: 34,
    rating: 4.8,
    reviewCount: 98,
    images: [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Woven from 100% certified organic long-staple cotton, this botanical sage printed pyjama set stays crisp, breathable, and softer with every wash. Designed for cozy evenings and slow Sunday mornings.',
    shortDescription: '100% organic cotton printed set designed for all-season breathability.',
    sizes: ['S', 'M', 'L', 'XL'],
    material: '100% Organic Combed Cotton (200 Thread Count)',
    features: [
      '100% GOTS certified organic breathable cotton',
      'Gentle on sensitive skin & hypoallergenic dyes',
      'Comfort-waist pyjama with satin drawstring',
      'Relaxed boyfriend fit for unrestricted movement'
    ],
    careInstructions: [
      'Machine wash gentle with similar colors',
      'Tumble dry low or air dry in gentle sunlight',
      'Warm iron for a crisp hotel-bed feel'
    ],
    specs: {
      'Fabric': '100% Organic Cotton',
      'Sleeve Length': 'Half Sleeves',
      'Fit': 'Easy Regular Fit',
      'Print': 'Botanical Floral'
    },
    inStock: true,
    isNewArrival: true,
    tag: 'Trending',
    colors: [
      { name: 'Sage Green', hex: '#9BB59B' },
      { name: 'Butter Yellow', hex: '#FFF8B8' }
    ]
  },
  {
    id: 'nw-3',
    name: 'Blush Velvet Dream Kimono Robe & Slip Set',
    slug: 'blush-velvet-dream-robe-set',
    category: 'nightwear',
    subCategory: 'Robe Sets',
    price: 2499,
    originalPrice: 3999,
    discount: 37,
    rating: 4.95,
    reviewCount: 76,
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Elevate your evening ritual. A 2-piece luxury ensemble featuring a delicate lace-trimmed slip dress and a matching belted kimono robe that flows with sheer opulence.',
    shortDescription: '2-piece set featuring lace-edge camisole slip and matching silk robe.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    material: 'Heavyweight Matte Satin & French Scalloped Lace',
    features: [
      'Includes lace slip nightdress + matching tie-waist robe',
      'Adjustable spaghetti straps on slip dress',
      'Eyelash lace trim along neckline and cuffs',
      'Silky smooth inner lining'
    ],
    careInstructions: [
      'Hand wash recommended in lukewarm water',
      'Do not wring or twist',
      'Steam iron on low setting'
    ],
    specs: {
      'Set Includes': '1 Robe + 1 Slip Dress',
      'Length': 'Midi (Robe) / Knee (Slip)',
      'Belt': 'Detachable Self-Fabric Sash'
    },
    inStock: true,
    isBestSeller: true,
    tag: 'Luxury Pick',
    colors: [
      { name: 'Dusty Rose', hex: '#E8A598' },
      { name: 'Midnight Plum', hex: '#4A2545' }
    ]
  },
  {
    id: 'nw-4',
    name: 'Buttercream Cloud Lounge Romper',
    slug: 'buttercream-cloud-lounge-romper',
    category: 'nightwear',
    subCategory: 'Loungewear',
    price: 1299,
    originalPrice: 1999,
    discount: 35,
    rating: 4.75,
    reviewCount: 63,
    images: [
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Meet your new stay-in favorite. Our Cloud Romper is made with modal rib fabric that hugs comfortably in all the right places with button-down front detailing and a flattering scoop back.',
    shortDescription: 'Ribbed micro-modal romper with easy front button closure.',
    sizes: ['XS', 'S', 'M', 'L'],
    material: '92% Micro-Modal Rib, 8% Elastane',
    features: [
      'Ultra-stretchy ribbed cloud-feel modal',
      'Functional wooden front buttons',
      'Elastic cinched waist for definition without tightness',
      'Double lined chest for comfort'
    ],
    careInstructions: [
      'Machine wash cold gentle cycle',
      'Dry flat in shade',
      'Do not bleach'
    ],
    specs: {
      'Style': 'Playsuit / Short Romper',
      'Neckline': 'Scoop Neck',
      'Stretch': 'High Stretch (4-Way)'
    },
    inStock: true,
    tag: 'New',
    colors: [
      { name: 'Butter Yellow', hex: '#FFF8B8' },
      { name: 'Lilac Cloud', hex: '#8A70AB' }
    ]
  },
  {
    id: 'nw-5',
    name: 'Cherry Blossom Printed Sleepshirt',
    slug: 'cherry-blossom-printed-sleepshirt',
    category: 'nightwear',
    subCategory: 'Sleepshirts',
    price: 1199,
    originalPrice: 1799,
    discount: 33,
    rating: 4.85,
    reviewCount: 115,
    images: [
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'An oversized, effortless nightshirt designed for uninterrupted sleep and weekend lounging. Features a curved hemline, mother-of-pearl buttons, and sweet floral motifs.',
    shortDescription: 'Oversized boyfriend-style nightshirt with curved hem.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    material: '100% Rayon Viscose',
    features: [
      'Lightweight, flowy drape with cool touch',
      'Roomy boyfriend fit with chest pocket',
      'Curved high-low hem for flattering silhouette',
      'Roll-up cuff sleeve tabs'
    ],
    careInstructions: [
      'Cold water wash',
      'Hang to dry',
      'Low iron'
    ],
    specs: {
      'Length': 'Above the Knee',
      'Fit': 'Oversized Boyfriend Fit'
    },
    inStock: true,
    isBestSeller: true,
    colors: [
      { name: 'Blush Floral', hex: '#F7D6DE' },
      { name: 'Powder Blue', hex: '#D6E4F0' }
    ]
  },
  {
    id: 'nw-6',
    name: 'Waffle Knit Relaxed Co-ord Lounge Set',
    slug: 'waffle-knit-relaxed-lounge-set',
    category: 'nightwear',
    subCategory: 'Loungewear',
    price: 1799,
    originalPrice: 2699,
    discount: 33,
    rating: 4.9,
    reviewCount: 54,
    images: [
      'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Cozy up in our textured waffle knit 2-piece set. Features a slouchy drop-shoulder top and matching wide-leg trousers that look chic whether you are on a flight or lounging on the couch.',
    shortDescription: 'Textured breathable waffle knit co-ord with wide-leg pants.',
    sizes: ['S', 'M', 'L', 'XL'],
    material: '80% Breathable Cotton, 20% Polyester Waffle Knit',
    features: [
      'Plush thermal textured waffle weave',
      'Drop shoulder relaxed long sleeves',
      'High-rise elasticated wide-leg pants',
      'Non-see-through premium GSM fabric'
    ],
    careInstructions: ['Machine wash cold', 'Reshape while damp', 'Flat dry'],
    specs: {
      'Pant Style': 'Flared Wide Leg',
      'Top Style': 'Slouchy Crewneck'
    },
    inStock: true,
    tag: 'Cozy Pick'
  },
  {
    id: 'nw-7',
    name: 'Midnight Velvet PJ Suit with Gold Trim',
    slug: 'midnight-velvet-pj-suit-gold-trim',
    category: 'nightwear',
    subCategory: 'Satin Sets',
    price: 2199,
    originalPrice: 3499,
    discount: 37,
    rating: 4.92,
    reviewCount: 88,
    images: [
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Sumptuous stretch velvet paired with fine gold piping. Designed for those winter night stays, bridal get-togethers, and memorable slumber parties.',
    shortDescription: 'Plush stretch velvet pyjama suit with champagne gold piping.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    material: '95% Micro-Velvet, 5% Spandex',
    features: [
      'Rich luminous velvet sheen with zero itchiness',
      'Champagne metallic corded piping',
      'Gold metal embossed monogram buttons'
    ],
    careInstructions: ['Dry clean or gentle hand wash only'],
    specs: {
      'Season': 'Autumn / Winter',
      'Fabric': 'Premium Micro-Velvet'
    },
    inStock: true,
    tag: 'Festive Edition'
  },
  {
    id: 'nw-8',
    name: 'Pastel Lilac Daisy Cami & Short Set',
    slug: 'pastel-lilac-daisy-cami-short-set',
    category: 'nightwear',
    subCategory: 'Short Sets',
    price: 999,
    originalPrice: 1599,
    discount: 38,
    rating: 4.8,
    reviewCount: 130,
    images: [
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Cute, breezy, and effortlessly playful. Our Daisy Cami Set features ruffle trimmed shorts and an airy strap top in Girly Tales signature lilac tone.',
    shortDescription: 'Ruffle-trimmed cami and shorts set in signature lilac daisy print.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    material: '100% Lightweight Poplin Cotton',
    features: [
      'Sweet ruffled hem on dolphin-cut shorts',
      'Adjustable bow tie shoulder straps',
      'Breathable, airy cotton fabric'
    ],
    careInstructions: ['Machine wash cold with gentle detergent'],
    specs: {
      'Style': 'Cami Top + Boxer Shorts',
      'Fabric': '100% Crisp Cotton'
    },
    inStock: true,
    isBestSeller: true,
    tag: 'Best Under ₹999'
  },

  // =================== ANTI-TARNISH JEWELLERY (8 Products) ===================
  {
    id: 'jw-1',
    name: '18K Gold Plated Chunky Croissant Dome Ring',
    slug: '18k-gold-chunky-croissant-dome-ring',
    category: 'jewellery',
    subCategory: 'Rings',
    price: 899,
    originalPrice: 1499,
    discount: 40,
    rating: 4.95,
    reviewCount: 210,
    images: [
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'The iconic French Parisian croissant silhouette. Triple-layered in 18K Real Gold via vacuum PVD coating over surgical-grade 316L stainless steel. Wear it in the shower, gym, or pool—it never turns green or loses its mirror shine.',
    shortDescription: '18K PVD gold-coated sculptural dome ring. 100% waterproof & sweatproof.',
    material: '316L Stainless Steel with 18K Yellow Gold PVD Vacuum Coating',
    antiTarnishGuarantee: 'Lifetime Anti-Tarnish & Waterproof Guarantee',
    waterproof: true,
    hypoallergenic: true,
    features: [
      '✨ 100% Waterproof, Sweatproof & Perfume-safe',
      '✨ Lifetime Anti-Tarnish Guarantee',
      '✨ Hypoallergenic & Nickel-Free (Zero skin greening)',
      '✨ Ergonomic comfort-fit rounded band',
      '✨ Mirror polish finish with high-grade luster'
    ],
    careInstructions: [
      'Zero maintenance required! Wear daily in bath and gym.',
      'To clean, simply rinse with warm soapy water and wipe with our microfibre cloth.'
    ],
    specs: {
      'Base Metal': 'Medical-Grade 316L Stainless Steel',
      'Coating': '18K Gold PVD (5x thicker than standard plating)',
      'Sizes': 'Size 6, Size 7, Size 8 (US Standard)',
      'Weight': '5.2 grams (Lightweight & hollowed comfort)'
    },
    inStock: true,
    isBestSeller: true,
    tag: 'Bestseller ⭐'
  },
  {
    id: 'jw-2',
    name: 'Celestial Freshwater Pearl & Gold Medallion Pendant',
    slug: 'celestial-freshwater-pearl-medallion-pendant',
    category: 'jewellery',
    subCategory: 'Necklaces',
    price: 1299,
    originalPrice: 2199,
    discount: 41,
    rating: 4.9,
    reviewCount: 164,
    images: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'A genuine organic Baroque freshwater pearl paired with an embossed North Star medallion on an adjustable cable chain. Designed for everyday layering and effortless elegance.',
    shortDescription: 'Real baroque freshwater pearl on 18K gold anti-tarnish chain.',
    material: '316L Stainless Steel + 18K Gold PVD + Cultured Baroque Pearl',
    antiTarnishGuarantee: '100% Waterproof & Tarnish-Resistant for 2+ Years',
    waterproof: true,
    hypoallergenic: true,
    features: [
      '✨ Genuine naturally formed freshwater Baroque Pearl',
      '✨ 18K Gold Plated anti-tarnish chain with 2-inch extender',
      '✨ Safe for sensitive skin & daily swimming',
      '✨ Laser engraved celestial starburst detailing'
    ],
    careInstructions: [
      'Rinse after swimming in chlorinated water',
      'Store in your Girly Tales velvet pouch when not in use'
    ],
    specs: {
      'Chain Length': '40 cm + 5 cm adjustable extension',
      'Pearl Type': 'Cultured Freshwater Baroque',
      'Closure': 'Sturdy Lobster Clasp'
    },
    inStock: true,
    isBestSeller: true,
    tag: 'Customer Fav'
  },
  {
    id: 'jw-3',
    name: 'Aura Snake Chain & Paperclip Layered Duo',
    slug: 'aura-snake-chain-paperclip-layered-duo',
    category: 'jewellery',
    subCategory: 'Necklaces',
    price: 1499,
    originalPrice: 2499,
    discount: 40,
    rating: 4.88,
    reviewCount: 92,
    images: [
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Get the perfect layered necklace look without the hassle of tangling. Combines our bestselling sleek herringbone snake chain with a modern paperclip link chain in one easy clasp.',
    shortDescription: '2-in-1 layered herringbone & paperclip chain in anti-tarnish 18K gold.',
    material: '316L Stainless Steel with 18K Gold Vacuum PVD Plating',
    antiTarnishGuarantee: 'Lifetime Anti-Tarnish Guarantee',
    waterproof: true,
    hypoallergenic: true,
    features: [
      '✨ Zero-tangle dual layered chain design',
      '✨ High-gloss liquid gold herringbone reflection',
      '✨ 100% Waterproof, shower-proof and heat-resistant',
      '✨ Hypoallergenic & lead/cadmium free'
    ],
    careInstructions: ['Dry with soft cloth after water exposure'],
    specs: {
      'Lengths': '38 cm (Herringbone) + 44 cm (Paperclip) + 5 cm extender',
      'Width': '3mm Snake Chain / 4mm Paperclip Link'
    },
    inStock: true,
    isNewArrival: true,
    tag: 'Trending Now'
  },
  {
    id: 'jw-4',
    name: 'Sculptural Teardrop Statement Huggie Earrings',
    slug: 'sculptural-teardrop-statement-huggie-earrings',
    category: 'jewellery',
    subCategory: 'Earrings',
    price: 999,
    originalPrice: 1699,
    discount: 41,
    rating: 4.93,
    reviewCount: 178,
    images: [
      'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'The viral bulbous teardrop earrings you have seen on the runway, crafted for ultra-lightweight all-day comfort. Features a secure snap hinge and a high-shine mirrored finish.',
    shortDescription: 'Ultra-lightweight viral teardrop earrings. 18K gold, hypoallergenic.',
    material: 'Hollow 316L Titanium Steel with 18K Gold PVD',
    antiTarnishGuarantee: '100% Tarnish-Free & Waterproof',
    waterproof: true,
    hypoallergenic: true,
    features: [
      '✨ Hollow interior—does NOT drag your earlobes down (only 3.8g per earring!)',
      '✨ Secure click-lock clicker clasp',
      '✨ 100% hypoallergenic for the most sensitive ears',
      '✨ 18K lustrous deep gold shine'
    ],
    careInstructions: ['Simply wipe clean with a dry cloth'],
    specs: {
      'Drop Size': '31mm x 18mm',
      'Weight': '3.8g each (Featherweight)',
      'Post': 'Surgical Steel Hypoallergenic Post'
    },
    inStock: true,
    isBestSeller: true,
    tag: 'Viral Trend 🔥'
  },
  {
    id: 'jw-5',
    name: 'Emerald Green Crystal Tennis Bracelet',
    slug: 'emerald-green-crystal-tennis-bracelet',
    category: 'jewellery',
    subCategory: 'Bracelets',
    price: 1399,
    originalPrice: 2299,
    discount: 39,
    rating: 4.91,
    reviewCount: 104,
    images: [
      'https://images.unsplash.com/photo-1611591475102-4fa0f930e181?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Sparkling baguette cut AAA Cubic Zirconia emerald gems prong-set on an 18K gold waterproof band. Captures the light like genuine mined emeralds without the high price tag.',
    shortDescription: 'AAA Cubic Zirconia emerald tennis bracelet on anti-tarnish 18K gold band.',
    material: '316L Stainless Steel + 18K Gold PVD + AAA Grade CZ Crystals',
    antiTarnishGuarantee: 'Waterproof & Tarnish Resistant Guarantee',
    waterproof: true,
    hypoallergenic: true,
    features: [
      '✨ Hand-set AAA quality baguette simulated emerald crystals',
      '✨ Dual security safety clasp',
      '✨ Waterproof and lotion-resistant'
    ],
    careInstructions: ['Polish with microfibre cloth to restore crystal fire'],
    specs: {
      'Bracelet Length': '16.5 cm + 3 cm extension',
      'Stone': 'AAA Cubic Zirconia (Emerald Hue)'
    },
    inStock: true,
    tag: 'Special Edition'
  },
  {
    id: 'jw-6',
    name: 'Dainty Mother of Pearl Evil Eye Protection Anklet',
    slug: 'dainty-mother-of-pearl-evil-eye-anklet',
    category: 'jewellery',
    subCategory: 'Anklets',
    price: 799,
    originalPrice: 1299,
    discount: 38,
    rating: 4.87,
    reviewCount: 145,
    images: [
      'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Ward off bad energy in style. Natural iridescent mother of pearl evil eye bezel-set on a delicate gold satellite bead chain that never rusts even on beach getaways.',
    shortDescription: 'Iridescent mother of pearl evil eye on waterproof satellite chain.',
    material: '316L Stainless Steel with 18K Gold PVD & Genuine Mother of Pearl',
    antiTarnishGuarantee: '100% Sea-water & Beach-proof',
    waterproof: true,
    hypoallergenic: true,
    features: [
      '✨ Genuine carved Mother of Pearl centerpiece',
      '✨ Satellite bead chain texture',
      '✨ Beach and ocean-water friendly'
    ],
    careInstructions: ['Rinse with fresh water after ocean dips'],
    specs: {
      'Length': '21 cm + 4 cm extension',
      'Bezel Size': '8mm diameter'
    },
    inStock: true,
    isBestSeller: true,
    tag: 'Ward Off Nazar 🧿'
  },
  {
    id: 'jw-7',
    name: 'Textured Croissant & Twisted Rope Hoops Set',
    slug: 'croissant-twisted-rope-hoops-duo',
    category: 'jewellery',
    subCategory: 'Earrings',
    price: 1199,
    originalPrice: 1999,
    discount: 40,
    rating: 4.89,
    reviewCount: 82,
    images: [
      'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'A 2-pair bundle featuring our bestselling braided rope hoops and chunky mini croissant hoops. Mix and match for curated ear stack goals.',
    shortDescription: 'Pack of 2 anti-tarnish hoops: 1 Braided Rope + 1 Croissant Hoop.',
    material: '316L Stainless Steel with 18K Gold PVD',
    antiTarnishGuarantee: 'Lifetime Anti-Tarnish Guarantee',
    waterproof: true,
    hypoallergenic: true,
    features: [
      '✨ 2 pairs of earrings in 1 gift box',
      '✨ Snap-bar click closure for easy on/off',
      '✨ Non-tarnishing gold finish'
    ],
    careInstructions: ['Wipe clean with cloth'],
    specs: {
      'Set Includes': '2 Pairs (4 Hoops)',
      'Diameter': '18mm and 15mm'
    },
    inStock: true,
    tag: 'Set of 2 ✨'
  },
  {
    id: 'jw-8',
    name: 'Roman Numeral Solitaire Zircon Bangle',
    slug: 'roman-numeral-solitaire-zircon-bangle',
    category: 'jewellery',
    subCategory: 'Bracelets',
    price: 1499,
    originalPrice: 2499,
    discount: 40,
    rating: 4.96,
    reviewCount: 220,
    images: [
      'https://images.unsplash.com/photo-1611591475102-4fa0f930e181?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Timeless luxury inspired by high European jewelry houses. Precision laser-engraved Roman numerals centered with a brilliant round brilliant solitaire crystal with invisible push-clasp.',
    shortDescription: '18K gold Roman numeral oval bangle with solitaire crystal.',
    material: '316L Stainless Steel + 18K Real Gold PVD + Brilliant Cut CZ',
    antiTarnishGuarantee: '100% Anti-Tarnish & Waterproof Guarantee',
    waterproof: true,
    hypoallergenic: true,
    features: [
      '✨ Precision laser engraved Roman numeral details',
      '✨ Seamless hidden push-to-open latch',
      '✨ Scratch-resistant PVD coating',
      '✨ Oval wrist-contour shape so it does not spin upside down'
    ],
    careInstructions: ['Wear everyday without taking it off!'],
    specs: {
      'Inner Diameter': '5.8 cm x 5.0 cm (Fits wrist size 14cm to 17.5cm)',
      'Width': '6 mm'
    },
    inStock: true,
    isBestSeller: true,
    tag: 'Iconic Luxury 💎'
  }
];

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    author: 'Ananya Sharma',
    rating: 5,
    date: '3 days ago',
    title: 'Literally never taking this off!!',
    comment: 'I was so skeptical about "waterproof" claims, but I have worn my Croissant ring and Snake chain every day in the shower and gym for 3 weeks now. Still blindingly shiny and zero green skin! Girly Tales is my new obsession.',
    verified: true,
    productName: '18K Gold Plated Chunky Croissant Dome Ring'
  },
  {
    id: 'rev-2',
    author: 'Priya Mehra',
    rating: 5,
    date: '1 week ago',
    title: 'The silk set is PURE luxury 😍',
    comment: 'The Mulberry Silk Satin set feels so incredibly soft! It feels like 5-star hotel luxury. The lilac color is stunning and the fit is perfection. Ordering the sage cotton set next.',
    verified: true,
    productName: 'Mulberry Silk Satin Notch Collar Set'
  },
  {
    id: 'rev-3',
    author: 'Rhea Kapoor',
    rating: 5,
    date: '2 weeks ago',
    title: 'Best packaging & quality in Indian D2C!',
    comment: 'Received my order in 2 days in Mumbai! The packaging is so aesthetically pleasing with cute stickers and velvet pouches. Worth every single rupee!',
    verified: true,
    productName: 'Celestial Freshwater Pearl Medallion Pendant'
  },
  {
    id: 'rev-4',
    author: 'Tanvi Deshmukh',
    rating: 5,
    date: '2 weeks ago',
    title: 'Teardrop earrings are super lightweight',
    comment: 'I was worried these chunky earrings would hurt my ears, but they are hollow and so light I forget I am wearing them. Got so many compliments at brunch!',
    verified: true,
    productName: 'Sculptural Teardrop Statement Huggie Earrings'
  }
];

export const INSTAGRAM_POSTS = [
  {
    id: 'ig-1',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
    handle: '@girlytalesofficial',
    caption: 'Sunday mornings in our Mulberry Silk Set ☁️✨ #GirlyTales #SleepInStyle',
    likes: '2.4k'
  },
  {
    id: 'ig-2',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80',
    handle: '@girlytalesofficial',
    caption: 'Waterproof. Sweatproof. 100% Anti-Tarnish. Wear it 24/7 💧💍',
    likes: '4.1k'
  },
  {
    id: 'ig-3',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80',
    handle: '@girlytalesofficial',
    caption: 'That butter-soft lounge feeling 🌸 Tag your stay-at-home bestie!',
    likes: '1.9k'
  },
  {
    id: 'ig-4',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80',
    handle: '@girlytalesofficial',
    caption: 'Layered perfection with our 18K celestial pearls ✨ Tap link in bio to shop.',
    likes: '3.3k'
  }
];
