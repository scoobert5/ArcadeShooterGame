import React from 'react';
import { Skull } from 'lucide-react';

interface BossHealthBarProps {
  current: number;
  max: number;
  active: boolean;
}

export const BossHealthBar: React.FC<BossHealthBarProps> = ({ current, max, active }) => {
  if (!active || current <= 0) return null;

  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  
  return (
    <div className="absolute top-24 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-6 pointer-events-none z-40 animate-in slide-in-from-top-4 fade-in duration-500">
      <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-purple-200 px-2">
             <div className="flex items-center gap-2">
                 <Skull size={20} className="text-purple-400 animate-pulse" />
                 <span className="font-black tracking-[0.2em] text-sm uppercase drop-shadow-md">BOSS ENTITY</span>
             </div>
             <span className="font-mono text-sm font-bold opacity-80">{Math.ceil(current)} / {Math.ceil(max)}</span>
          </div>
          
          <div className="h-6 bg-slate-900/90 rounded-none border-2 border-purple-900/50 shadow-[0_0_20px_rgba(147,51,234,0.3)] relative overflow-hidden">
             {/* Background Pattern */}
             <div className="absolute inset-0 opacity-20" 
                  style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)' }} 
             />
             
             {/* Health Fill */}
             <div 
                className="h-full bg-gradient-to-r from-purple-800 via-purple-600 to-fuchsia-500 transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
             />
          </div>
      </div>
    </div>
  );
};