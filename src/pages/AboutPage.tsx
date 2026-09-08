import React from 'react';
import { ArrowRight } from 'lucide-react';
import { SectionHeading } from '../components/common/SectionHeading';
import { Button } from '../components/common/Button';

interface AboutPageProps {
  onNavigateToShop: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigateToShop }) => {
  return (
    <div className="space-y-16 sm:space-y-24 py-8 sm:py-12">
      {/* 1. Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="font-script text-3xl text-brand-lilac font-semibold">Our Story</span>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-brand-charcoal font-normal max-w-3xl mx-auto leading-tight">
          Everyday Luxury, Crafted for the Modern Indian Woman.
        </h1>
        <p className="text-sm sm:text-base text-brand-muted max-w-2xl mx-auto leading-relaxed">
          Girly Tales was born out of a simple frustration: why should beautiful nightwear feel synthetic and stiff, and why should trendy gold jewellery turn green after two showers?
        </p>
      </section>

      {/* 2. Split Story with Brand Imagery */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="relative aspect-[4/5] rounded-[36px] overflow-hidden shadow-card border border-brand-border">
            <img
              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80"
              alt="Girly Tales Craftsmanship"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/70 via-transparent to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <span className="text-xs uppercase font-bold tracking-widest text-brand-butter">
                Designed By Women, For Women
              </span>
              <h3 className="font-serif text-2xl font-medium mt-1">
                Luxury that fits into real life.
              </h3>
            </div>
          </div>

          <div className="space-y-6 text-brand-charcoal">
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-lilac">
                Our Philosophy
              </span>
              <h2 className="font-serif text-3xl font-normal leading-snug">
                You shouldn't have to save your best pieces for special occasions.
              </h2>
            </div>

            <p className="text-sm text-brand-muted leading-relaxed">
              We believe everyday comfort and personal radiance go hand in hand. Whether it's slipping into buttery silk pajamas after a 10-hour workday, or wearing your favorite chunky gold ring into the ocean without fear, <strong>Girly Tales</strong> exists to make you feel pampered 24/7.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-brand-ivory rounded-2xl border border-brand-border space-y-1">
                <span className="font-serif text-3xl font-bold text-brand-lilac">100%</span>
                <p className="text-xs font-bold text-brand-charcoal">Waterproof &amp; Sweatproof</p>
                <p className="text-[11px] text-brand-muted">Wear into showers, pools &amp; workouts</p>
              </div>

              <div className="p-4 bg-brand-ivory rounded-2xl border border-brand-border space-y-1">
                <span className="font-serif text-3xl font-bold text-brand-lilac">Grade-A</span>
                <p className="text-xs font-bold text-brand-charcoal">Mulberry Silk &amp; Cottons</p>
                <p className="text-[11px] text-brand-muted">Hypoallergenic &amp; gentle on skin</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Anti-Tarnish Tech Deep Dive */}
      <section className="bg-brand-lilac-subtle/50 border-y border-brand-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <SectionHeading
            subtitle="The Science of Shine"
            title="How Our Anti-Tarnish"
            highlightText="Jewellery Works"
            description="Say goodbye to fake brass, tarnished alloys, and green skin forever."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-brand-border space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-butter/40 text-brand-charcoal flex items-center justify-center font-bold text-lg">
                1
              </div>
              <h4 className="font-serif text-lg font-bold text-brand-charcoal">
                316L Surgical Stainless Steel
              </h4>
              <p className="text-xs text-brand-muted leading-relaxed">
                We use medical-grade 316L stainless steel as our core base metal. It is indestructible, hypoallergenic, nickel-free, and corrosion-proof.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-brand-border space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-lilac-subtle text-brand-lilac flex items-center justify-center font-bold text-lg">
                2
              </div>
              <h4 className="font-serif text-lg font-bold text-brand-charcoal">
                18K Gold Vacuum PVD Plating
              </h4>
              <p className="text-xs text-brand-muted leading-relaxed">
                Physical Vapor Deposition (PVD) bonds real 18K Yellow Gold at a molecular level inside a high-temperature vacuum chamber—creating a coat 5x thicker than regular plating.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-brand-border space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center font-bold text-lg">
                3
              </div>
              <h4 className="font-serif text-lg font-bold text-brand-charcoal">
                Zero Tarnish Lifetime Guarantee
              </h4>
              <p className="text-xs text-brand-muted leading-relaxed">
                Tested against salt water, chlorine, perfumes, and daily hand washing. It retains its mirror luster without fading or peeling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CTA */}
      <section className="max-w-4xl mx-auto px-4 text-center space-y-6">
        <h2 className="font-serif text-3xl sm:text-4xl text-brand-charcoal font-medium">
          Ready to experience the Girly Tales feeling?
        </h2>
        <Button
          variant="primary"
          size="lg"
          onClick={onNavigateToShop}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Explore All 16+ Styles
        </Button>
      </section>
    </div>
  );
};
