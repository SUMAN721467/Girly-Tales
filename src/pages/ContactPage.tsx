import React, { useState } from 'react';
import { Mail, MessageSquare, Clock, MapPin, ChevronDown, ChevronUp, Send, CheckCircle } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useCart } from '../context/CartContext';

const FAQS = [
  {
    q: 'Are your jewellery items truly waterproof and anti-tarnish?',
    a: 'Yes! Every single jewellery piece is vacuum PVD plated in real 18K gold over surgical 316L stainless steel. You can wear them while taking a hot shower, swimming at the beach, or during intense gym workouts without worrying about tarnishing or green skin.'
  },
  {
    q: 'How do I pick the right size for night suits?',
    a: 'Our nightwear features a comfortable, relaxed fit. We have a detailed size chart with Bust, Waist, and Hip measurements in inches and cm. If you prefer a slouchier sleep fit, we recommend ordering one size up.'
  },
  {
    q: 'What is the shipping fee and delivery timeframe?',
    a: 'We offer FREE Pan-India Shipping on all orders over ₹999. For orders below ₹999, a flat standard delivery fee of ₹99 is applied. Orders are dispatched within 24 hours and delivered in 2 to 4 business days.'
  },
  {
    q: 'What is your exchange and return policy?',
    a: 'We offer an easy 7-Day Hassle-Free Size Exchange policy on all nightwear. If the fit isn’t 100% perfect, simply contact our team via WhatsApp or email, and we will arrange a reverse pickup for exchange.'
  },
  {
    q: 'Can I apply discount coupons at checkout?',
    a: 'Yes! Use code GIRLY10 for 10% off your first order, or WELCOME15 when you join our VIP newsletter club.'
  }
];

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    orderNo: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { triggerToast } = useCart();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      triggerToast('Please complete all required fields', undefined, undefined, 'info');
      return;
    }
    setSubmitted(true);
    triggerToast('Message Sent! 💌', 'Our team will respond within 4 hours', undefined, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="font-script text-3xl text-brand-lilac font-semibold">We're Here for You</span>
        <h1 className="font-serif text-3xl sm:text-5xl text-brand-charcoal font-medium">
          Get in Touch with Girly Tales
        </h1>
        <p className="text-xs sm:text-sm text-brand-muted leading-relaxed">
          Have a question about styling, order tracking, sizing, or custom bridal gifting? Our team is always happy to chat!
        </p>
      </div>

      {/* Quick Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <a
          href="https://wa.me/"
          target="_blank"
          rel="noreferrer"
          className="p-6 bg-white rounded-3xl border border-brand-border shadow-xs hover:shadow-card transition-all text-center space-y-2 group"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-brand-charcoal">WhatsApp Chat</h4>
          <p className="text-xs text-brand-muted">Instant replies (10am - 8pm)</p>
          <span className="text-xs font-bold text-emerald-600 inline-block pt-1">+91 98765 43210</span>
        </a>

        <div className="p-6 bg-white rounded-3xl border border-brand-border shadow-xs text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-lilac-subtle text-brand-lilac flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-brand-charcoal">Email Support</h4>
          <p className="text-xs text-brand-muted">For order inquiries &amp; PR</p>
          <span className="text-xs font-bold text-brand-lilac inline-block pt-1">care@girlytales.com</span>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-brand-border shadow-xs text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-brand-charcoal">Working Hours</h4>
          <p className="text-xs text-brand-muted">Mon – Sat</p>
          <span className="text-xs font-bold text-brand-charcoal inline-block pt-1">10:00 AM – 7:00 PM IST</span>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-brand-border shadow-xs text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <MapPin className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-brand-charcoal">Design Studio</h4>
          <p className="text-xs text-brand-muted">Bandra West</p>
          <span className="text-xs font-bold text-brand-charcoal inline-block pt-1">Mumbai, Maharashtra</span>
        </div>
      </div>

      {/* Split: Contact Form + FAQs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Contact Form (6 Cols) */}
        <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-3xl border border-brand-border shadow-xs space-y-6">
          <div>
            <h3 className="font-serif text-2xl font-bold text-brand-charcoal">
              Send us a Message
            </h3>
            <p className="text-xs text-brand-muted mt-1">
              Fill out the form below and our team will get back to you shortly.
            </p>
          </div>

          {submitted ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="font-serif text-xl font-bold text-brand-charcoal">
                Thank You, {formData.name}!
              </h4>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">
                Your message has been sent to our customer care team. We will reply to {formData.email} within 4 hours.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSubmitted(false);
                  setFormData({ name: '', email: '', orderNo: '', subject: '', message: '' });
                }}
              >
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-brand-charcoal mb-1">Your Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ananya Verma"
                    className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-charcoal focus:outline-none focus:border-brand-lilac"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-brand-charcoal mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ananya@example.com"
                    className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-charcoal focus:outline-none focus:border-brand-lilac"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-brand-charcoal mb-1">Order # (Optional)</label>
                  <input
                    type="text"
                    value={formData.orderNo}
                    onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })}
                    placeholder="GT-123456"
                    className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-charcoal focus:outline-none focus:border-brand-lilac"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-brand-charcoal mb-1">Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Size Exchange / Tracking"
                    className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-charcoal focus:outline-none focus:border-brand-lilac"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-brand-charcoal mb-1">Your Message *</label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can we help you today?"
                  className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-charcoal focus:outline-none focus:border-brand-lilac resize-none"
                  required
                ></textarea>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="md"
                leftIcon={<Send className="w-4 h-4" />}
              >
                Send Message
              </Button>
            </form>
          )}
        </div>

        {/* FAQs Accordion (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-lilac">
              Got Questions?
            </span>
            <h3 className="font-serif text-2xl font-bold text-brand-charcoal mt-1">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-brand-border overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-brand-charcoal hover:text-brand-lilac transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-brand-lilac shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-brand-muted shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-brand-muted leading-relaxed border-t border-brand-border/40 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
