import React from 'react';
import { UpgradeSystem } from '../../systems/UpgradeSystem';
import { CHAINS, SYNERGY_LEVELS, UpgradeFamily } from '../../data/upgrades';
import { calculateUpgradeCost } from '../../utils/economy';
import { UpgradeRarity } from '../../entities/types';
import { GameState } from '../../core/GameState';
import { Coins, ArrowUpCircle, PlayCircle, Zap, Shield, Wind } from 'lucide-react';

interface UpgradeShopProps {
  state: GameState;
  onBuy: (upgradeId: string) => void;
  onClose: () => void;
}

export const UpgradeShop: React.FC<UpgradeShopProps> = ({ state, onBuy, onClose }) => {
  const currentScore = state.score;

  // Counts for Synergies
  const bulletCount = state.purchasedFamilyCounts.get('BULLETS') || 0;
  const defenseCount = state.purchasedFamilyCounts.get('DEFENSE') || 0;
  const mobilityCount = state.purchasedFamilyCounts.get('MOBILITY') || 0;

  const getRarityColor = (rarity: UpgradeRarity) => {
    switch (rarity) {
      case UpgradeRarity.Common: return 'text-slate-300';
      case UpgradeRarity.Rare: return 'text-blue-300';
      case UpgradeRarity.Epic: return 'text-purple-300';
      case UpgradeRarity.Legendary: return 'text-amber-300';
      default: return 'text-white';
    }
  };

  const renderSynergyBar = (family: UpgradeFamily, label: string, count: number, icon: React.ReactNode, colorClass: string) => {
      const milestones = SYNERGY_LEVELS[family];
      // Max level is 30 in the new system
      const MAX_LEVEL = 30;
      
      // Calculate active tier
      let activeTier = 0;
      milestones.forEach(m => {
          if (count >= m.levelsRequired) activeTier = m.tier;
      });

      return (
          <div className="flex flex-col gap-1 bg-slate-950 p-3 rounded-lg border border-slate-800 w-64">
              <div className="flex justify-between items-center text-xs uppercase font-bold tracking-widest text-slate-400">
                  <span className="flex items-center gap-1">{icon} {label}</span>
                  <span className={colorClass}>Tier {activeTier}</span>
              </div>
              
              {/* Bar Container */}
              <div className="relative h-3 bg-slate-900 rounded-full mt-1 w-full overflow-visible">
                  
                  {/* Fill */}
                  <div 
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${colorClass.replace('text-', 'bg-')}`}
                    style={{ width: `${Math.min(100, (count / MAX_LEVEL) * 100)}%` }}
                  />

                  {/* Milestones Markers */}
                  {milestones.map((m) => {
                      const pct = (m.levelsRequired / MAX_LEVEL) * 100;
                      const isUnlocked = count >= m.levelsRequired;
                      
                      return (
                          <div 
                            key={m.tier}
                            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-700 border border-slate-900 z-10 group cursor-help hover:scale-150 transition-transform"
                            style={{ left: `${pct}%`, backgroundColor: isUnlocked ? '#fff' : undefined }}
                          >
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-slate-900 border border-slate-700 p-2 rounded shadow-xl z-50 pointer-events-none">
                                  <div className={`text-xs font-bold ${colorClass} mb-1`}>Tier {m.tier} (Lvl {m.levelsRequired})</div>
                                  <div className="text-[10px] text-slate-300 leading-tight">{m.description}</div>
                              </div>
                          </div>
                      );
                  })}
              </div>
              
              <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-0.5">
                  <span>0</span>
                  <span>{count} / {MAX_LEVEL}</span>
              </div>
          </div>
      );
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95 backdrop-blur-md z-50 animate-in fade-in duration-200">
      
      <div className="flex flex-col w-full max-w-[90vw] h-[95vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-slate-800 bg-slate-900/50">
            <div>
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 italic tracking-wider uppercase mb-1">
                Tactical Upgrade
                </h2>
                <p className="text-slate-400 text-sm">Invest in specialized families to unlock Synergy Tiers.</p>
            </div>

            {/* Synergy Dashboard */}
            <div className="flex gap-4">
                {renderSynergyBar('BULLETS', 'Bullets', bulletCount, <Zap size={12}/>, 'text-yellow-500')}
                {renderSynergyBar('DEFENSE', 'Defense', defenseCount, <Shield size={12}/>, 'text-blue-500')}
                {renderSynergyBar('MOBILITY', 'Mobility', mobilityCount, <Wind size={12}/>, 'text-indigo-500')}
            </div>

            <div className="flex items-center gap-4 ml-8">
                <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
                    <Coins className="text-yellow-400 w-5 h-5" />
                    <span className="font-mono text-xl font-bold text-white">{currentScore.toLocaleString()}</span>
                </div>
                <button 
                    onClick={onClose}
                    className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-emerald-500/30 active:scale-95"
                >
                    <PlayCircle className="w-5 h-5" />
                    DEPLOY
                </button>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            {/* Group by Family */}
            {['BULLETS', 'DEFENSE', 'MOBILITY'].map(familyKey => {
                const family = familyKey as UpgradeFamily;
                const familyChains = CHAINS.filter(c => c.family === family);
                let familyColor = 'border-slate-800';
                if(family === 'BULLETS') familyColor = 'border-yellow-900/30 bg-yellow-950/10';
                if(family === 'DEFENSE') familyColor = 'border-blue-900/30 bg-blue-950/10';
                if(family === 'MOBILITY') familyColor = 'border-indigo-900/30 bg-indigo-950/10';

                return (
                    <div key={family} className={`mb-8 p-4 rounded-xl border ${familyColor}`}>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            {family === 'BULLETS' && <Zap size={16}/>}
                            {family === 'DEFENSE' && <Shield size={16}/>}
                            {family === 'MOBILITY' && <Wind size={16}/>}
                            {family} FAMILY
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {familyChains.map(chain => {
                                const currentLevel = state.ownedUpgrades.get(chain.id) || 0;
                                const isMaxed = currentLevel >= chain.tiers.length;
                                const nextTier = !isMaxed ? chain.tiers[currentLevel] : null;
                                const cost = !isMaxed ? calculateUpgradeCost(state, chain.id) : 0;
                                const canAfford = currentScore >= cost;

                                return (
                                    <div 
                                        key={chain.id} 
                                        className={`
                                            relative bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col gap-3 transition-all duration-200
                                            ${isMaxed ? 'opacity-50 grayscale' : ''}
                                            ${!isMaxed && canAfford ? 'hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1' : ''}
                                        `}
                                    >
                                        <div className="flex justify-between items-center gap-2">
                                            <h3 className="text-lg font-bold text-white truncate">{chain.baseName}</h3>
                                            <span className="flex-shrink-0 text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 font-mono whitespace-nowrap min-w-[50px] text-center">
                                                {currentLevel}/{chain.tiers.length}
                                            </span>
                                        </div>
                                        
                                        {isMaxed ? (
                                            <div className="flex-1 flex flex-col justify-center items-center py-6 text-emerald-500 font-bold uppercase tracking-widest">
                                                <ArrowUpCircle className="w-8 h-8 mb-2" />
                                                Maxed
                                            </div>
                                        ) : nextTier ? (
                                            <>
                                                <div className="flex-1">
                                                    <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${getRarityColor(nextTier.rarity)}`}>
                                                        Next: {nextTier.suffix}
                                                    </div>
                                                    <p className="text-sm text-slate-400 leading-snug min-h-[40px]">
                                                        {nextTier.description}
                                                    </p>
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-slate-800">
                                                    <button
                                                        onClick={() => onBuy(chain.id)}
                                                        disabled={!canAfford}
                                                        className={`
                                                            w-full flex items-center justify-center gap-2 py-2 rounded font-bold transition-all
                                                            ${canAfford 
                                                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-500/20 active:scale-95' 
                                                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
                                                        `}
                                                    >
                                                        <Coins className="w-4 h-4" />
                                                        {cost.toLocaleString()}
                                                    </button>
                                                </div>
                                            </>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};