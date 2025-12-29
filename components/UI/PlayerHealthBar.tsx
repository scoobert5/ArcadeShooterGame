import React from 'react';
import { Heart, Shield } from 'lucide-react';

interface PlayerHealthBarProps {
  current: number;
  max: number;
  shields?: number;
  maxShields?: number;
}

export const PlayerHealthBar: React.FC<PlayerHealthBarProps> = ({ current, max, shields = 0, maxShields = 0 }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  
  // Color change based on health
  let colorClass = 'bg-emerald-500';
  if (percentage < 30) colorClass = 'bg-red-500 animate-pulse';
  else if (percentage < 60) colorClass = 'bg-yellow-500';

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-64 md:w-80 pointer-events-none z-50">
      
      {/* SHIELD PIPS (New) */}
      {maxShields > 0 && (
          <div className="flex justify-end gap-1 mb-1 px-1">
              {Array.from({ length: maxShields }).map((_, i) => (
                  <div key={i} className={`
                      w-4 h-4 rounded-full flex items-center justify-center border border-sky-800 transition-all duration-300
                      ${i < shields ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)] scale-100' : 'bg-slate-900/50 scale-75 opacity-50'}
                  `}>
                      {i < shields && <div className="w-1.5 h-1.5 bg-white rounded-full opacity-80" />}
                  </div>
              ))}
          </div>
      )}

      <div className="flex items-center justify-between mb-1 px-1">
         <div className="flex items-center gap-1.5 text-red-400">
             <Heart size={16} fill="currentColor" />
             <span className="font-bold text-sm tracking-wider">HP</span>
         </div>
         <span className="text-white text-sm font-mono font-medium">{Math.ceil(current)} / {Math.ceil(max)}</span>
      </div>
      
      <div className="h-4 bg-slate-900/80 rounded-full border border-slate-700 overflow-hidden backdrop-blur-sm shadow-lg">
        <div 
            className={`h-full ${colorClass} transition-all duration-300 ease-out`}
            style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};