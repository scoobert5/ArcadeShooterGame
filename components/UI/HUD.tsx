import React from 'react';

interface HUDProps {
  score: number;
  wave: number;
}

export const HUD: React.FC<HUDProps> = ({ score, wave }) => {
  return (
    <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none text-white font-mono">
      <div className="bg-black/50 px-4 py-2 rounded">
        <span className="text-slate-400 text-sm">SCORE</span>
        <div className="text-2xl font-bold">{score.toLocaleString()}</div>
      </div>
      <div className="bg-black/50 px-4 py-2 rounded text-right">
        <span className="text-slate-400 text-sm">WAVE</span>
        <div className="text-2xl font-bold text-yellow-400">{wave}</div>
      </div>
    </div>
  );
};