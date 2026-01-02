import React, { useState } from 'react';
import { GameState } from '../../core/GameState';
import { META_CATEGORIES, MetaCategory, MetaUpgradeNode, LEVEL_BASE_XP, LEVEL_XP_GROWTH } from '../../data/metaUpgrades';
import { Coins, Sparkles, CheckCircle2, Circle, ArrowLeft, Cpu, Shield, Zap, Wind, Lock, User } from 'lucide-react';
import { MetaProgressionSystem } from '../../systems/MetaProgressionSystem';

interface MetaHubProps {
  state: GameState;
  onEquipPerk: (perkId: string | null) => void;
  onBack: () => void;
}

const metaSystem = new MetaProgressionSystem();

export const MetaHub: React.FC<MetaHubProps> = ({ state, onEquipPerk, onBack }) => {
  const [activeTab, setActiveTab] = useState<'PERKS' | 'COMPANIONS' | 'ARMORY'>('PERKS');
  const { currency, xp, level, equippedStartingPerk } = state.metaState;
  
  // Calculate Level Progress
  const { xpIntoLevel, xpForNext } = metaSystem.getLevelFromXP(xp);
  const progressPct = Math.min(100, (xpIntoLevel / xpForNext) * 100);

  const startingPerks = META_CATEGORIES[MetaCategory.STARTING_PERKS];

  // Helper to render perk tree nodes
  const renderPerkNode = (perk: MetaUpgradeNode) => {
      const isEquipped = equippedStartingPerk === perk.id;
      const isUnlocked = level >= perk.requiredLevel;
      const isPrereqMet = !perk.prerequisites || perk.prerequisites.every(pid => {
          // Prereq is met if we meet level req of prereq (implicit in linear tree)
          // Just check if perk exists and level is high enough
          const p = startingPerks.find(sp => sp.id === pid);
          return p ? level >= p.requiredLevel : true;
      });
      
      const locked = !isUnlocked || !isPrereqMet;

      return (
        <button
            key={perk.id}
            onClick={() => !locked && onEquipPerk(isEquipped ? null : perk.id)}
            disabled={locked}
            className={`
                relative flex flex-col p-4 rounded-xl border-2 transition-all duration-200 text-left group min-h-[140px]
                ${isEquipped 
                    ? 'bg-emerald-950/30 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                    : locked 
                        ? 'bg-slate-900/50 border-slate-800 opacity-70 cursor-not-allowed'
                        : 'bg-slate-900 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                }
            `}
        >
            <div className="flex justify-between items-start mb-2 w-full">
                <h3 className={`font-bold text-sm ${isEquipped ? 'text-emerald-400' : locked ? 'text-slate-500' : 'text-slate-200 group-hover:text-white'}`}>
                    {perk.name}
                </h3>
                {isEquipped ? (
                    <CheckCircle2 className="text-emerald-500 w-5 h-5 flex-shrink-0" />
                ) : locked ? (
                    <Lock className="text-slate-600 w-4 h-4 flex-shrink-0" />
                ) : (
                    <Circle className="text-slate-700 w-5 h-5 group-hover:text-slate-500 flex-shrink-0" />
                )}
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed mb-4 flex-1">
                {perk.description}
            </p>

            <div className="flex justify-between items-center mt-auto">
                <div className={`text-[10px] font-mono uppercase tracking-wider ${locked ? 'text-red-400' : 'text-slate-500'}`}>
                    REQ LVL {perk.requiredLevel}
                </div>
                
                {isEquipped && (
                    <div className="text-[10px] font-bold uppercase tracking-widest py-1 px-2 rounded bg-emerald-500 text-slate-950">
                        Active
                    </div>
                )}
            </div>
        </button>
      );
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950 text-white z-50 overflow-hidden animate-in fade-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col border-b border-slate-800 bg-slate-900/80 backdrop-blur-md z-10">
          <div className="flex justify-between items-center p-6 pb-4">
            <div className="flex items-center gap-4">
                <button 
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-3xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 uppercase">
                        OPERATOR HUB
                    </h1>
                    <div className="flex items-center gap-2 text-slate-500 text-xs tracking-widest uppercase mt-1">
                        <span>Level {level}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span>Operator Grade</span>
                    </div>
                </div>
            </div>

            {/* CURRENCY & XP DISPLAY */}
            <div className="flex gap-6 items-center">
                <div className="flex flex-col items-end mr-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Level Progress</div>
                    <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                        {Math.floor(xpIntoLevel)} / {Math.floor(xpForNext)} XP
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-950 px-5 py-3 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <Coins className="text-emerald-400 w-5 h-5" />
                    <span className="font-mono text-xl font-bold text-white">{currency.toLocaleString()}</span>
                </div>
            </div>
          </div>

          {/* TABS */}
          <div className="flex px-8 gap-8">
              <button 
                onClick={() => setActiveTab('PERKS')}
                className={`pb-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'PERKS' ? 'text-cyan-400 border-cyan-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
              >
                  Starting Perks
              </button>
              <button 
                onClick={() => setActiveTab('COMPANIONS')}
                className={`pb-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'COMPANIONS' ? 'text-cyan-400 border-cyan-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
              >
                  Companions
              </button>
              <button 
                onClick={() => setActiveTab('ARMORY')}
                className={`pb-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === 'ARMORY' ? 'text-cyan-400 border-cyan-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
              >
                  Armory
              </button>
          </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        
        {activeTab === 'PERKS' && (
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* OFFENSE BRANCH */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-900/30">
                        <Zap className="text-red-400 w-5 h-5" />
                        <h2 className="text-lg font-bold text-red-100 uppercase tracking-wider">Offense</h2>
                    </div>
                    {startingPerks.filter(p => p.branch === 'OFFENSE').sort((a,b) => a.requiredLevel - b.requiredLevel).map(renderPerkNode)}
                </div>

                {/* MOBILITY BRANCH */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-indigo-900/30">
                        <Wind className="text-indigo-400 w-5 h-5" />
                        <h2 className="text-lg font-bold text-indigo-100 uppercase tracking-wider">Mobility</h2>
                    </div>
                    {startingPerks.filter(p => p.branch === 'MOBILITY').sort((a,b) => a.requiredLevel - b.requiredLevel).map(renderPerkNode)}
                </div>

                {/* DEFENSE BRANCH */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-blue-900/30">
                        <Shield className="text-blue-400 w-5 h-5" />
                        <h2 className="text-lg font-bold text-blue-100 uppercase tracking-wider">Defense</h2>
                    </div>
                    {startingPerks.filter(p => p.branch === 'DEFENSE').sort((a,b) => a.requiredLevel - b.requiredLevel).map(renderPerkNode)}
                </div>

            </div>
        )}

        {activeTab === 'COMPANIONS' && (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
                <User className="w-16 h-16 text-slate-700 mb-4" />
                <h3 className="text-2xl font-bold text-slate-500 uppercase tracking-widest">Companions Offline</h3>
                <p className="text-slate-600 mt-2">Drone modules require Level 10 clearance.</p>
                
                <div className="flex gap-4 mt-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-32 h-40 border-2 border-slate-800 border-dashed rounded-xl flex flex-col items-center justify-center bg-slate-900/50">
                            <Lock className="w-6 h-6 text-slate-700 mb-2" />
                            <span className="text-xs text-slate-600 font-mono uppercase">Slot {i}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'ARMORY' && (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
                <Cpu className="w-16 h-16 text-slate-700 mb-4" />
                <h3 className="text-2xl font-bold text-slate-500 uppercase tracking-widest">Armory Offline</h3>
                <p className="text-slate-600 mt-2">Weapon Chassis upgrades require Level 15 clearance.</p>
            </div>
        )}

      </div>
    </div>
  );
};
