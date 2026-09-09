export type CategoryType = 'nightwear' | 'jewellery';

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: CategoryType;
  subCategory: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  reviewCount: number;
  images: string[];
  description: string;
  shortDescription: string;
  sizes?: ('XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL')[];
  material: string;
  antiTarnishGuarantee?: string;
  waterproof?: boolean;
  hypoallergenic?: boolean;
  features: string[];
  careInstructions: string[];
  specs: Record<string, string>;
  inStock: boolean;
  stockQuantity?: number;
  sku?: string;
  dimensions?: string;
  variety?: string;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  tag?: string;
  colors?: { name: string; hex: string }[];
}

export interface CartItem {
  id: string; // unique combo of product.id + size + color
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface Review {
  id: string;
  productId?: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verified: boolean;
  avatar?: string;
  productName?: string;
}

export type SortOption = 'featured' | 'price-low' | 'price-high' | 'rating' | 'newest';

export interface FilterState {
  category: 'all' | 'nightwear' | 'jewellery';
  subCategory: string[];
  minPrice: number;
  maxPrice: number;
  sizes: string[];
  sortBy: SortOption;
  onlyInStock: boolean;
  searchQuery: string;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  gender?: 'Female' | 'Male' | 'Non-binary' | 'Prefer not to say' | string;
  age?: number | string;
  isLoggedIn: boolean;
  isAdmin?: boolean;
  role?: 'admin' | 'customer';
  avatarUrl?: string;
  createdAt?: string;
}

export interface ShippingAddress {
  id: string;
  fullName: string;
  phone: string;
  pincode: string;
  city: string;
  state: string;
  addressLine: string;
  type?: 'Home' | 'Work' | 'Other';
  isDefault?: boolean;
}

