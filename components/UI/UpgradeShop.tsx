import React from 'react';
import { CHAINS, UpgradeSystem } from '../../systems/UpgradeSystem';
import { UpgradeRarity } from '../../entities/types';
import { GameState } from '../../core/GameState';
import { Lock, Coins, ArrowUpCircle } from 'lucide-react';

interface UpgradeShopProps {
  state: GameState;
  onBuy: (upgradeId: string) => void;
  onClose: () => void;
}

export const UpgradeShop: React.FC<UpgradeShopProps> = ({ state, onBuy, onClose }) => {
  const currentScore = state.score;
  const currentWave = state.wave;

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
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md z-50 animate-in fade-in duration-200 p-8 overflow-y-auto">
      
      <div className="flex justify-between items-center w-full max-w-5xl mb-6">
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
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
            >
                CLOSE [U]
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full max-w-6xl">
        {CHAINS.map(chain => {
            const currentLevel = state.ownedUpgrades.get(chain.id) || 0;
            const isMaxed = currentLevel >= chain.tiers.length;
            const nextTier = !isMaxed ? chain.tiers[currentLevel] : null;
            const cost = !isMaxed ? UpgradeSystem.getUpgradeCost(currentLevel) : 0;
            const unlockWave = !isMaxed ? UpgradeSystem.getUnlockWave(currentLevel) : 0;
            const isLocked = currentWave < unlockWave;
            const canAfford = currentScore >= cost;

            return (
                <div 
                    key={chain.id} 
                    className={`
                        relative bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3
                        ${isMaxed ? 'opacity-50 grayscale' : ''}
                        ${!isMaxed && !isLocked && canAfford ? 'hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10' : ''}
                    `}
                >
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-bold text-white">{chain.baseName}</h3>
                        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 font-mono">
                            Lvl {currentLevel} / {chain.tiers.length}
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
                                {isLocked ? (
                                    <div className="flex items-center justify-center gap-2 text-red-400 font-bold bg-red-950/30 py-2 rounded">
                                        <Lock className="w-4 h-4" />
                                        <span>Unlocks Wave {unlockWave}</span>
                                    </div>
                                ) : (
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
                                )}
                            </div>
                        </>
                    ) : null}
                </div>
            );
        })}
      </div>
    </div>
  );
};