import React from 'react';

export const AnnouncementBar: React.FC = () => {
  const tickerItems = [
    'FREE DELIVERY ON ALL PREPAID ORDERS',
    'EXPRESS DELIVERY AVAILABLE',
    'COD OPTION AVAILABLE UPTO ₹3000/-',
    '100% ANTI-TARNISH WATERPROOF JEWELLERY',
    'PURE 100% COTTON & MULBERRY SILK',
    'USE CODE GIRLY10 FOR 10% OFF',
  ];

  return (
    <div className="bg-[#FCE7ED] text-[#1A1821] py-2 border-b border-[#EBD7DE] text-[11px] sm:text-xs font-bold tracking-wider overflow-hidden">
      <div className="marquee-container select-none">
        <div className="marquee-content flex items-center gap-6">
          {tickerItems.concat(tickerItems).map((text, idx) => (
            <div key={idx} className="flex items-center gap-6 shrink-0">
              <span>{text}</span>
              <span className="text-[#967BB6] text-[10px]">✦</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
