import React from 'react';
import { Heart } from 'lucide-react';

interface PlayerHealthBarProps {
  current: number;
  max: number;
}

export const PlayerHealthBar: React.FC<PlayerHealthBarProps> = ({ current, max }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  
  // Color change based on health
  let colorClass = 'bg-emerald-500';
  if (percentage < 30) colorClass = 'bg-red-500 animate-pulse';
  else if (percentage < 60) colorClass = 'bg-yellow-500';

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-64 md:w-80 pointer-events-none">
      <div className="flex items-center justify-between mb-1 px-1">
         <div className="flex items-center gap-1.5 text-red-400">
             <Heart size={16} fill="currentColor" />
             <span className="font-bold text-sm tracking-wider">HP</span>
         </div>
         <span className="text-white text-sm font-mono font-medium">{Math.ceil(current)} / {Math.ceil(max)}</span>
      </div>
      
      <div className="h-4 bg-slate-900/80 rounded-full border border-slate-700 overflow-hidden backdrop-blur-sm">
        <div 
            className={`h-full ${colorClass} transition-all duration-300 ease-out`}
            style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};