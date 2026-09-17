import React from 'react';

interface ComfortMarqueeProps {
  phrases?: string[];
}

const DEFAULT_PHRASES = [
  'SLEEP INTO COMFORT',
  'SWEET DREAMS START HERE',
  '100% PURE BREATHABLE COTTON',
  'ANTI-TARNISH GOLD JEWELLERY',
  'EXPRESS PAN-INDIA DISPATCH',
];

export const ComfortMarquee: React.FC<ComfortMarqueeProps> = ({ phrases }) => {
  const activePhrases = Array.isArray(phrases) && phrases.length > 0 ? phrases : DEFAULT_PHRASES;

  // Repeat the sequence to ensure continuous infinite loop
  const repeatCount = Math.max(4, Math.ceil(20 / activePhrases.length));
  const repeatedItems = Array(repeatCount).fill(activePhrases).flat();

  return (
    <div className="w-full bg-[#967BB6] text-white py-1 sm:py-1.5 overflow-hidden select-none border-y border-[#7F62A1]/30">
      <div className="marquee-container">
        <div className="marquee-content flex items-center gap-5 sm:gap-7">
          {repeatedItems.map((phrase, idx) => (
            <div key={idx} className="flex items-center gap-5 sm:gap-7 shrink-0">
              <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase text-white">
                {phrase}
              </span>
              <span className="text-[#fffeea] text-[8px] sm:text-[9px] opacity-85">✦</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
