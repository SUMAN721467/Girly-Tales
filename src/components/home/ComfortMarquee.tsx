import React from 'react';

export const ComfortMarquee: React.FC = () => {
  const phrasePair = [
    'SLEEP INTO COMFORT',
    'SWEET DREAMS START HERE',
  ];

  // Repeat the sequence to ensure continuous infinite loop
  const repeatedItems = Array(10).fill(phrasePair).flat();

  return (
    <div className="w-full bg-[#967BB6] text-white py-1 sm:py-1.5 overflow-hidden select-none border-y border-[#7F62A1]/30">
      <div className="marquee-container">
        <div className="marquee-content flex items-center gap-5 sm:gap-7">
          {repeatedItems.map((phrase, idx) => (
            <div key={idx} className="flex items-center gap-5 sm:gap-7 shrink-0">
              <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase text-white">
                {phrase}
              </span>
              <span className="text-[#FFFDD0] text-[8px] sm:text-[9px] opacity-85">✦</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
