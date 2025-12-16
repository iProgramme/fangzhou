import React from 'react';

interface WatermarkProps {
    userName: string;
}

const Watermark: React.FC<WatermarkProps> = ({ userName }) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden opacity-[0.05]">
      <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-32 rotate-[-15deg]">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="whitespace-nowrap font-bold text-foreground select-none flex flex-col items-center">
            <span className="text-xl">{userName}</span>
            <span className="text-sm mt-1">{new Date().toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Watermark;