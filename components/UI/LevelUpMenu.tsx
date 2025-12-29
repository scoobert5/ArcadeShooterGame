import React from 'react';
import { UpgradeDefinition } from '../../data/upgrades';
import { UpgradeRarity } from '../../entities/types';
import { Zap, Crosshair, Gauge, Star, Heart } from 'lucide-react';

interface LevelUpMenuProps {
  options: UpgradeDefinition[];
  onSelect: (upgradeId: string) => void;
}

export const LevelUpMenu: React.FC<LevelUpMenuProps> = ({ options, onSelect }) => {
  
  const getRarityColor = (rarity: UpgradeRarity) => {
    switch (rarity) {
      case UpgradeRarity.Common:
        return 'border-slate-400 bg-slate-800 text-slate-100 hover:bg-slate-700';
      case UpgradeRarity.Rare:
        return 'border-blue-400 bg-blue-900/80 text-blue-50 hover:bg-blue-800/80';
      case UpgradeRarity.Epic:
        return 'border-purple-400 bg-purple-900/80 text-purple-50 hover:bg-purple-800/80';
      case UpgradeRarity.Legendary:
        return 'border-amber-400 bg-amber-900/80 text-amber-50 hover:bg-amber-800/80 shadow-[0_0_15px_rgba(251,191,36,0.3)]';
      default:
        return 'border-slate-400 bg-slate-800';
    }
  };

  const getRarityLabelColor = (rarity: UpgradeRarity) => {
    switch (rarity) {
      case UpgradeRarity.Common: return 'text-slate-400';
      case UpgradeRarity.Rare: return 'text-blue-300';
      case UpgradeRarity.Epic: return 'text-purple-300';
      case UpgradeRarity.Legendary: return 'text-amber-300';
    }
  };

  const getIcon = (id: string, rarity: UpgradeRarity) => {
    if (rarity === UpgradeRarity.Legendary) return <Star className="w-8 h-8 text-amber-400" />;
    
    // Check Chain IDs
    if (id === 'speed_boost') return <Gauge className="w-8 h-8 text-emerald-400" />;
    if (id === 'rapid_fire') return <Zap className="w-8 h-8 text-yellow-400" />;
    if (id === 'heavy_rounds') return <Crosshair className="w-8 h-8 text-red-400" />;
    if (id === 'vitality') return <Heart className="w-8 h-8 text-rose-400" />;
    
    return <Star className="w-8 h-8 text-slate-400" />;
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200">
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 italic tracking-wider uppercase">
          Level Up!
        </h2>
        <p className="text-slate-300 mt-2 text-lg">Choose an upgrade</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-5xl px-8 justify-center items-stretch">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={`
              group relative flex flex-col items-center text-center p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2
              flex-1 min-w-[240px]
              ${getRarityColor(option.rarity)}
            `}
          >
            <div className="mb-4 p-4 rounded-full bg-black/20 group-hover:bg-black/40 transition-colors">
              {getIcon(option.id, option.rarity)}
            </div>
            
            <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${getRarityLabelColor(option.rarity)}`}>
              {option.rarity}
            </div>

            <h3 className="text-xl font-bold mb-3">{option.name}</h3>
            
            <p className="text-sm opacity-80 leading-relaxed">
              {option.description}
            </p>

            <div className="mt-auto pt-4 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold uppercase tracking-wider">
              Click to Select
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};