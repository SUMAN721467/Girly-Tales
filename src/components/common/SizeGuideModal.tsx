import React, { useState } from 'react';
import { X, Ruler, Sparkles } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: 'nightwear' | 'jewellery';
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({
  isOpen,
  onClose,
  category = 'nightwear',
}) => {
  const [unit, setUnit] = useState<'inches' | 'cm'>('inches');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-brand-ivory hover:bg-brand-lilac-subtle flex items-center justify-center text-brand-charcoal transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-brand-lilac-subtle text-brand-lilac flex items-center justify-center">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-medium text-brand-charcoal">
              {category === 'nightwear' ? 'Nightwear Size Chart' : 'Ring & Jewellery Sizing'}
            </h3>
            <p className="text-xs text-brand-muted">Accurate Indian standard sizing</p>
          </div>
        </div>

        {category === 'nightwear' ? (
          <div>
            {/* Unit Toggle */}
            <div className="flex justify-end mb-3">
              <div className="bg-brand-ivory p-1 rounded-full border border-brand-border flex text-xs">
                <button
                  onClick={() => setUnit('inches')}
                  className={`px-3 py-1 rounded-full font-medium transition-all ${
                    unit === 'inches'
                      ? 'bg-brand-lilac text-white shadow-sm'
                      : 'text-brand-muted hover:text-brand-charcoal'
                  }`}
                >
                  Inches (in)
                </button>
                <button
                  onClick={() => setUnit('cm')}
                  className={`px-3 py-1 rounded-full font-medium transition-all ${
                    unit === 'cm'
                      ? 'bg-brand-lilac text-white shadow-sm'
                      : 'text-brand-muted hover:text-brand-charcoal'
                  }`}
                >
                  Centimeters (cm)
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-brand-border rounded-2xl">
              <table className="w-full text-xs md:text-sm text-left">
                <thead className="bg-brand-lilac-subtle/50 text-brand-charcoal font-semibold border-b border-brand-border">
                  <tr>
                    <th className="p-3">Size</th>
                    <th className="p-3">Bust</th>
                    <th className="p-3">Waist</th>
                    <th className="p-3">Hip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border text-brand-muted">
                  <tr>
                    <td className="p-3 font-bold text-brand-charcoal">XS</td>
                    <td className="p-3">{unit === 'inches' ? '32 - 34"' : '81 - 86 cm'}</td>
                    <td className="p-3">{unit === 'inches' ? '25 - 27"' : '63 - 68 cm'}</td>
                    <td className="p-3">{unit === 'inches' ? '34 - 36"' : '86 - 91 cm'}</td>
                  </tr>
                  <tr className="bg-brand-ivory/50">
                    <td className="p-3 font-bold text-brand-charcoal">S</td>
                    <td className="p-3">{unit === 'inches' ? '34 - 36"' : '86 - 91 cm'}</td>
                    <td className="p-3">{unit === 'inches' ? '27 - 29"' : '68 - 73 cm'}</td>
                    <td className="p-3">{unit === 'inches' ? '36 - 38"' : '91 - 96 cm'}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-brand-charcoal">M</td>
                    <td className="p-3">{unit === 'inches' ? '36 - 38"' : '91 - 96 cm'}</td>
                    <td className="p-3">{unit === 'inches' ? '29 - 31"' : '73 - 78 cm'}</td>
                    <td className="p-3">{unit === 'inches' ? '38 - 40"' : '96 - 101 cm'}</td>
                  </tr>
                  <tr className="bg-brand-ivory/50">
                    <td className="p-3 font-bold text-brand-charcoal">L</td>
                    <td className="p-3">{unit === 'inches' ? '38 - 41"' : '96 - 104 cm'}</td>
                    <td className="p-3">{unit === 'inches' ? '31 - 34"' : '78 - 86 cm'}</td>
                    <td className="p-3">{unit === 'inches' ? '40 - 43"' : '101 - 109 cm'}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-brand-charcoal">XL</td>
                    <td className="p-3">{unit === 'inches' ? '41 - 44"' : '104 - 111 cm'}</td>
                    <td className="p-3">{unit === 'inches' ? '34 - 37"' : '86 - 94 cm'}</td>
                    <td className="p-3">{unit === 'inches' ? '43 - 46"' : '109 - 116 cm'}</td>
                  </tr>
                  <tr className="bg-brand-ivory/50">
                    <td className="p-3 font-bold text-brand-charcoal">XXL</td>
                    <td className="p-3">{unit === 'inches' ? '44 - 47"' : '111 - 119 cm'}</td>
                    <td className="p-3">{unit === 'inches' ? '37 - 40"' : '94 - 101 cm'}</td>
                    <td className="p-3">{unit === 'inches' ? '46 - 49"' : '116 - 124 cm'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Fit Tip */}
            <div className="mt-4 p-3.5 bg-brand-butter/30 border border-brand-butter-dark/40 rounded-2xl flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-brand-charcoal leading-relaxed">
                <strong>Fit Tip:</strong> Our nightwear is designed with a relaxed, relaxed drape. If you are between sizes or prefer a slouchier sleep fit, we recommend sizing up!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs md:text-sm text-brand-muted">
            <div className="border border-brand-border rounded-2xl p-4 bg-brand-ivory/50">
              <h4 className="font-bold text-brand-charcoal text-sm mb-2">Ring Size Reference</h4>
              <ul className="space-y-1.5 list-disc list-inside">
                <li><strong>Size 6 (US):</strong> 16.5 mm inner diameter (Small)</li>
                <li><strong>Size 7 (US):</strong> 17.3 mm inner diameter (Standard / Medium)</li>
                <li><strong>Size 8 (US):</strong> 18.1 mm inner diameter (Large / Thumb)</li>
              </ul>
            </div>
            <div className="border border-brand-border rounded-2xl p-4 bg-brand-ivory/50">
              <h4 className="font-bold text-brand-charcoal text-sm mb-2">Necklace Chains</h4>
              <p>All our necklaces feature an extra <strong>5 cm / 2-inch extension chain</strong> so you can customize length between choker and collarbone drape.</p>
            </div>
          </div>
        )}

        {/* Modal footer */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 bg-brand-lilac hover:bg-brand-lilac-dark text-white rounded-full font-medium text-sm transition-all"
        >
          Got It, Thanks!
        </button>
      </div>
    </div>
  );
};
