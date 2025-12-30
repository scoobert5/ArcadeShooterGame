import React from 'react';
import { ShieldCheck, Coins, Sparkles, CheckCircle2 } from 'lucide-react';

interface ExtractionSuccessProps {
  runCurrency: number;
  runXP: number;
  onContinue: () => void;
}

export const ExtractionSuccess: React.FC<ExtractionSuccessProps> = ({ runCurrency, runXP, onContinue }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md z-50 animate-in zoom-in-95 duration-500">
      
      <div className="flex flex-col items-center max-w-2xl w-full p-8 relative">
        
        {/* Success Icon */}
        <div className="mb-6 text-emerald-500 drop-shadow-[0_0_25px_rgba(16,185,129,0.4)] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            <CheckCircle2 size={96} strokeWidth={1.5} />
        </div>

        {/* Header */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 uppercase italic tracking-tighter drop-shadow-lg mb-2">
                Extraction Complete
            </h2>
            <p className="text-emerald-100/70 font-medium tracking-wide">Assets Secured. Returning to Hub.</p>
        </div>

        {/* Rewards Summary */}
        <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-8 w-full shadow-[0_0_40px_rgba(16,185,129,0.1)] mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                        <Coins size={24} />
                        <span className="font-bold uppercase text-sm tracking-widest">Currency</span>
                    </div>
                    <span className="text-4xl font-mono font-bold text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">+{runCurrency}</span>
                </div>
                <div className="flex flex-col items-center border-l border-emerald-500/20">
                    <div className="flex items-center gap-2 text-purple-400 mb-2">
                        <Sparkles size={24} />
                        <span className="font-bold uppercase text-sm tracking-widest">Experience</span>
                    </div>
                    <span className="text-4xl font-mono font-bold text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">+{runXP}</span>
                </div>
            </div>
        </div>

        {/* Continue Button */}
        <button 
            onClick={onContinue}
            className="group flex items-center justify-center gap-3 px-10 py-4 bg-white hover:bg-emerald-50 text-slate-900 rounded-full font-bold transition-all hover:scale-105 hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500"
        >
            <ShieldCheck className="w-5 h-5" />
            CONFIRM & EXIT
        </button>

      </div>
    </div>
  );
};