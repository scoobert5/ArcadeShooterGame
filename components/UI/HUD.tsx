import React from 'react';
import { Target } from 'lucide-react';

interface HUDProps {
  score: number;
  wave: number;
  enemiesRemaining: number;
}

export const HUD: React.FC<HUDProps> = ({ score, wave, enemiesRemaining }) => {
  return (
    <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none text-white font-mono z-10">
      <div className="bg-black/50 px-4 py-2 rounded">
        <span className="text-slate-400 text-sm block leading-none mb-1">SCORE</span>
        <div className="text-2xl font-bold leading-none">{score.toLocaleString()}</div>
      </div>
      
      {enemiesRemaining > 0 && (
          <div className="absolute left-1/2 transform -translate-x-1/2 bg-black/50 px-6 py-2 rounded flex items-center gap-3">
             <Target className="text-red-400 w-5 h-5 animate-pulse" />
             <div>
                <span className="text-slate-400 text-xs block leading-none uppercase tracking-wider mb-1">Enemies</span>
                <div className="text-xl font-bold leading-none text-center">{enemiesRemaining}</div>
             </div>
          </div>
      )}

      <div className="bg-black/50 px-4 py-2 rounded text-right">
        <span className="text-slate-400 text-sm block leading-none mb-1">WAVE</span>
        <div className="text-2xl font-bold text-yellow-400 leading-none">{wave}</div>
      </div>
    </div>
  );
};