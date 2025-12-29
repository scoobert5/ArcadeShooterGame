import React from 'react';
import { Target } from 'lucide-react';

interface HUDProps {
  score: number;
  wave: number;
  enemiesRemaining: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  canShop: boolean;
}

export const HUD: React.FC<HUDProps> = ({ 
    score, 
    wave, 
    enemiesRemaining, 
    // Props still passed but unused due to visual overhaul
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none p-6 z-50 flex flex-col justify-between">
      
      {/* TOP ROW */}
      <div className="flex justify-between items-start">
        {/* Top Left: Wave Info */}
        <div className="flex flex-col gap-1">
            <div className="bg-slate-900/80 backdrop-blur-sm px-5 py-3 rounded-2xl border-l-4 border-yellow-500 shadow-lg">
                <span className="text-slate-400 text-xs font-bold tracking-widest uppercase block">Wave</span>
                <span className="text-4xl font-black text-white leading-none">{wave}</span>
            </div>
        </div>

        {/* Top Center: Enemies (Conditional) */}
        {enemiesRemaining > 0 && (
            <div className="absolute left-1/2 transform -translate-x-1/2 top-6">
                <div className="bg-slate-900/80 backdrop-blur-sm px-6 py-2 rounded-full border border-slate-700 flex items-center gap-3 shadow-lg">
                    <Target className="text-red-500 w-5 h-5 animate-pulse" />
                    <span className="text-white font-bold text-lg font-mono tracking-widest">
                        {enemiesRemaining} <span className="text-slate-500 text-xs">HOSTILES</span>
                    </span>
                </div>
            </div>
        )}

        {/* Top Right: Score */}
        <div className="flex flex-col items-end gap-2">
            <div className="bg-slate-900/80 backdrop-blur-sm px-5 py-3 rounded-2xl border-r-4 border-indigo-500 shadow-lg text-right">
                <span className="text-slate-400 text-xs font-bold tracking-widest uppercase block">Score</span>
                <span className="text-3xl font-bold text-white font-mono leading-none">{score.toLocaleString()}</span>
            </div>
        </div>
      </div>
      
      {/* BOTTOM ROW - Cleared for player-centric UI */}
      <div className="flex justify-between items-end w-full">
          <div className="w-[1px]"></div>
          <div className="w-[1px]"></div>
      </div>
    </div>
  );
};