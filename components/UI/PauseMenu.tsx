import React from 'react';
import { Play, XSquare } from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onQuit: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ onResume, onQuit }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200">
      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 shadow-2xl flex flex-col items-center gap-6 w-80">
        <h2 className="text-3xl font-black text-white tracking-widest uppercase mb-2">Paused</h2>
        
        <button
          onClick={onResume}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
        >
          <Play className="fill-current w-5 h-5" />
          RESUME
        </button>

        <button
          onClick={onQuit}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-bold transition-all border border-slate-700"
        >
          <XSquare className="w-5 h-5" />
          MAIN MENU
        </button>
      </div>
    </div>
  );
};