import React from 'react';
import { ShieldCheck, Skull, Coins, Sparkles } from 'lucide-react';

interface ExtractionMenuProps {
  runCurrency: number;
  runXP: number;
  onExtract: () => void;
  onContinue: () => void;
}

export const ExtractionMenu: React.FC<ExtractionMenuProps> = ({ runCurrency, runXP, onExtract, onContinue }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md z-50 animate-in fade-in duration-300">
      
      <div className="flex flex-col items-center max-w-4xl w-full p-8">
        
        {/* Header */}
        <div className="text-center mb-12">
            <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 uppercase italic tracking-tighter drop-shadow-lg mb-4">
                Extraction Point
            </h2>
            <p className="text-xl text-slate-400">Secure your gains or risk them for greater power.</p>
        </div>

        {/* Rewards Summary */}
        <div className="flex gap-8 mb-12 w-full justify-center">
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 w-64 text-center shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <div className="text-emerald-400 mb-2 flex justify-center"><Coins size={32} /></div>
                <div className="text-4xl font-mono font-bold text-white mb-1">+{runCurrency}</div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Meta Currency</div>
            </div>
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 w-64 text-center shadow-[0_0_30px_rgba(168,85,247,0.1)]">
                <div className="text-purple-400 mb-2 flex justify-center"><Sparkles size={32} /></div>
                <div className="text-4xl font-mono font-bold text-white mb-1">+{runXP}</div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Meta XP</div>
            </div>
        </div>

        {/* Choices */}
        <div className="flex gap-8 w-full max-w-3xl">
            
            {/* EXTRACT */}
            <button 
                onClick={onExtract}
                className="group relative flex-1 bg-slate-900 hover:bg-emerald-950/30 border-2 border-slate-700 hover:border-emerald-500 rounded-xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] text-left"
            >
                <div className="flex items-center gap-4 mb-4 text-emerald-500 group-hover:text-emerald-400">
                    <ShieldCheck size={40} />
                    <span className="text-2xl font-black uppercase tracking-wider">Extract</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-400 group-hover:text-slate-300">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Safe keep 100% of rewards</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>End current run safely</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Return to Hub</li>
                </ul>
            </button>

            {/* CONTINUE */}
            <button 
                onClick={onContinue}
                className="group relative flex-1 bg-slate-900 hover:bg-red-950/30 border-2 border-slate-700 hover:border-red-500 rounded-xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] text-left"
            >
                <div className="flex items-center gap-4 mb-4 text-red-500 group-hover:text-red-400">
                    <Skull size={40} />
                    <span className="text-2xl font-black uppercase tracking-wider">Continue</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-400 group-hover:text-slate-300">
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>Keep rewards at risk</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>Difficulty increases</li>
                    <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>Earn more loot</li>
                </ul>
            </button>

        </div>
      </div>
    </div>
  );
};