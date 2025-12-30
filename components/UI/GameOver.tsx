import React from 'react';
import { GameState } from '../../core/GameState';
import { Coins, Sparkles, AlertTriangle } from 'lucide-react';

interface GameOverProps {
  score: number;
  state: GameState;
  onRestart: () => void;
  onQuit: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({ score, state, onRestart, onQuit }) => {
  const retainedCurrency = state.hasDefeatedFirstBoss ? Math.floor(state.runMetaCurrency * 0.25) : 0;
  const retainedXP = state.hasDefeatedFirstBoss ? Math.floor(state.runMetaXP * 0.25) : 0;
  const lostCurrency = state.runMetaCurrency - retainedCurrency;
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 rounded-lg backdrop-blur-sm z-50 animate-in fade-in duration-500">
      
      <div className="flex flex-col items-center max-w-lg w-full">
          <h2 className="text-6xl font-black text-red-600 mb-2 uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            MIA
          </h2>
          <p className="text-slate-400 mb-8 uppercase tracking-widest text-sm">Signal Lost</p>

          {/* Stats Card */}
          <div className="bg-slate-900 border border-slate-800 w-full rounded-xl p-6 mb-8 shadow-2xl">
              
              <div className="flex justify-between items-end border-b border-slate-800 pb-4 mb-4">
                  <span className="text-slate-400 uppercase text-xs font-bold tracking-widest">Run Score</span>
                  <span className="text-3xl font-mono font-bold text-white">{score.toLocaleString()}</span>
              </div>

              {/* Meta Retention */}
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-yellow-500">
                          <Coins size={18} />
                          <span className="text-sm font-bold uppercase">Currency Recovered</span>
                      </div>
                      <div className="text-right">
                          <span className="block text-xl font-mono font-bold text-white">+{retainedCurrency}</span>
                          {lostCurrency > 0 && (
                              <span className="text-xs text-red-500">-{lostCurrency} Lost</span>
                          )}
                      </div>
                  </div>

                  <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-purple-500">
                          <Sparkles size={18} />
                          <span className="text-sm font-bold uppercase">Data Recovered</span>
                      </div>
                      <div className="text-right">
                          <span className="block text-xl font-mono font-bold text-white">+{retainedXP}</span>
                      </div>
                  </div>
              </div>

              {!state.hasDefeatedFirstBoss && (
                  <div className="mt-4 bg-red-950/30 border border-red-900/50 rounded p-3 flex items-start gap-2">
                      <AlertTriangle className="text-red-500 w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p className="text-red-400 text-xs leading-relaxed">
                          Extraction protocols failed. Reach the first Boss checkpoint to enable emergency 25% asset retention.
                      </p>
                  </div>
              )}
          </div>

          <div className="flex gap-4 w-full">
              <button
              onClick={onQuit}
              className="flex-1 px-6 py-4 bg-slate-800 text-slate-300 rounded-lg font-bold hover:bg-slate-700 transition-colors border border-slate-700 uppercase tracking-wider"
              >
              Main Menu
              </button>
              <button
              onClick={onRestart}
              className="flex-1 px-6 py-4 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-200 transition-colors uppercase tracking-wider shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
              Re-Deploy
              </button>
          </div>
      </div>
    </div>
  );
};