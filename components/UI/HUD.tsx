import React from 'react';
import { Target, AlertTriangle } from 'lucide-react';

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
    ammo, 
    maxAmmo, 
    isReloading,
    canShop
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

      {/* CENTER: Reload Warning (Critical Context) */}
      {isReloading && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-20">
              <div className="flex items-center gap-2 bg-red-600/20 backdrop-blur-sm border border-red-500/50 px-4 py-1 rounded text-red-200 font-bold tracking-widest text-sm">
                  <AlertTriangle className="w-4 h-4 animate-pulse" />
                  RELOADING...
              </div>
          </div>
      )}
      
      {/* BOTTOM ROW */}
      <div className="flex justify-between items-end w-full">
          
          {/* Bottom Left: Ammo & Reload Status */}
          <div className="flex flex-col gap-2 mb-2">
            <div className={`bg-slate-900/80 backdrop-blur-sm px-6 py-4 rounded-2xl border-l-4 ${ammo === 0 || isReloading ? 'border-red-500' : 'border-emerald-500'} shadow-xl min-w-[180px]`}>
                <div className="flex justify-between items-end mb-1">
                    <span className="text-slate-400 text-xs font-bold tracking-widest uppercase">AMMO</span>
                    {!isReloading && <span className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">PRESS [R]</span>}
                </div>
                <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-black ${ammo === 0 || isReloading ? 'text-red-500' : 'text-white'} leading-none`}>
                        {isReloading ? 0 : ammo}
                    </span>
                    <span className="text-xl text-slate-500 font-bold">/ {maxAmmo}</span>
                </div>
                {/* Reload Bar removed from here, visualised on player only */}
            </div>
          </div>

          {/* Bottom Right is handled by PlayerHealthBar component, this spacer keeps structure balanced */}
          <div className="w-[1px]"></div>
      </div>
    </div>
  );
};