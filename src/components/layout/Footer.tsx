import React from 'react';
import { Instagram, Facebook } from 'lucide-react';
import logoLine from '../../assets/logo-line.PNG';

interface FooterProps {
  onNavigate: (page: string, category?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#1A1821] text-white pt-12 pb-8 border-t border-[#33303D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-white/10 text-xs">
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img src={logoLine} alt="Girly Tales" className="h-8 w-auto object-contain brightness-0 invert" />
            </div>
            <p className="text-white/70 leading-relaxed max-w-xs">
              Everyday comfort &amp; shine. Cloud-soft night suits and 18K gold-plated anti-tarnish jewellery designed in India.
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#967BB6] flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#967BB6] flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-widest text-[#FFFDD0]">
              Collections
            </h4>
            <ul className="space-y-2 text-white/70">
              <li>
                <button onClick={() => onNavigate('shop', 'all')} className="hover:text-white hover:underline">
                  Shop All Styles
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', 'nightwear')} className="hover:text-white hover:underline">
                  Night Suits &amp; Pyjamas
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop', 'jewellery')} className="hover:text-white hover:underline">
                  Anti-Tarnish 18K Jewellery
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop')} className="hover:text-white hover:underline">
                  Launch Bundles (Buy 3 @ ₹2999)
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-widest text-[#FFFDD0]">
              Customer Care
            </h4>
            <ul className="space-y-2 text-white/70">
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white hover:underline">
                  Track Your Order
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white hover:underline">
                  Shipping &amp; Delivery Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white hover:underline">
                  7-Day Easy Size Exchanges
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('login')} className="hover:text-white hover:underline text-[#FBB6CE] font-bold">
                  ✦ Member Sign In / Account
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-white hover:underline">
                  Our Story &amp; Craft
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-widest text-[#FFFDD0]">
              WhatsApp &amp; Support
            </h4>
            <p className="text-white/70">
              Need help choosing the right size or styling a jewellery stack? Chat with us!
            </p>
            <p className="font-bold text-[#FFFDD0]">WhatsApp: +91 98765 43210</p>
            <p className="text-white/70">Email: care@girlytales.com</p>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Girly Tales India. All rights reserved.</p>
          <div className="flex items-center space-x-2 text-[10px]">
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded">UPI</span>
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded">CARDS</span>
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded">NETBANKING</span>
            <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded">CASH ON DELIVERY</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
