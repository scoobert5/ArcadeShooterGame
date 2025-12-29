import React from 'react';
import { UpgradeSystem } from '../../systems/UpgradeSystem';
import { CHAINS } from '../../data/upgrades';
import { getUpgradeCost } from '../../config/balance';
import { UpgradeRarity } from '../../entities/types';
import { GameState } from '../../core/GameState';
import { Coins, ArrowUpCircle, PlayCircle } from 'lucide-react';

interface UpgradeShopProps {
  state: GameState;
  onBuy: (upgradeId: string) => void;
  onClose: () => void;
}

export const UpgradeShop: React.FC<UpgradeShopProps> = ({ state, onBuy, onClose }) => {
  const currentScore = state.score;

  const getRarityColor = (rarity: UpgradeRarity) => {
    switch (rarity) {
      case UpgradeRarity.Common: return 'text-slate-300';
      case UpgradeRarity.Rare: return 'text-blue-300';
      case UpgradeRarity.Epic: return 'text-purple-300';
      case UpgradeRarity.Legendary: return 'text-amber-300';
      default: return 'text-white';
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/95 backdrop-blur-md z-50 animate-in fade-in duration-200">
      
      <div className="flex flex-col w-full max-w-6xl h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
            <div>
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 italic tracking-wider uppercase">
                Upgrade Shop
                </h2>
                <p className="text-slate-400">Spend score to enhance your abilities.</p>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
                    <Coins className="text-yellow-400 w-5 h-5" />
                    <span className="font-mono text-xl font-bold text-white">{currentScore.toLocaleString()}</span>
                </div>
                <button 
                    onClick={onClose}
                    className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-emerald-500/30 active:scale-95"
                >
                    <PlayCircle className="w-5 h-5" />
                    START WAVE
                </button>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {CHAINS.map(chain => {
                    const currentLevel = state.ownedUpgrades.get(chain.id) || 0;
                    const isMaxed = currentLevel >= chain.tiers.length;
                    const nextTier = !isMaxed ? chain.tiers[currentLevel] : null;
                    const cost = !isMaxed ? getUpgradeCost(currentLevel) : 0;
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
                                <span className="flex-shrink-0 text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 font-mono whitespace-nowrap min-w-[70px] text-center">
                                    Lv {currentLevel} / {chain.tiers.length}
                                </span>
                            </div>

                            {isMaxed ? (
                                <div className="flex-1 flex flex-col justify-center items-center py-6 text-emerald-500 font-bold uppercase tracking-widest">
                                    <ArrowUpCircle className="w-8 h-8 mb-2" />
                                    Maxed Out
                                </div>
                            ) : nextTier ? (
                                <>
                                    <div className="flex-1">
                                        <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${getRarityColor(nextTier.rarity)}`}>
                                            Next: {nextTier.suffix}
                                        </div>
                                        <p className="text-sm text-slate-400 leading-snug">
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
      </div>
    </div>
  );
};