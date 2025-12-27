import { System } from './BaseSystem';
import { GameState, GameStatus } from '../core/GameState';
import { PlayerEntity, UpgradeRarity } from '../entities/types';

// The "Virtual" definition used by UI and GameState
export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  rarity: UpgradeRarity;
  maxStack: number;
  apply: (player: PlayerEntity) => void;
}

export interface UpgradeTier {
  suffix: string; // e.g., "I", "II", "Max"
  description: string;
  rarity: UpgradeRarity;
  apply: (player: PlayerEntity) => void;
}

export interface UpgradeChain {
  id: string;
  baseName: string;
  tiers: UpgradeTier[];
}

export const CHAINS: UpgradeChain[] = [
  {
    id: 'speed_boost',
    baseName: 'Speed Boost',
    tiers: [
      {
        suffix: 'I',
        description: 'Increases movement speed by 10%.',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.speed *= 1.10
      },
      {
        suffix: 'II',
        description: 'Increases movement speed by another 15%.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.speed *= 1.15
      },
      {
        suffix: 'III',
        description: 'Increases movement speed by another 20%.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.speed *= 1.20
      },
      {
        suffix: 'Overdrive',
        description: 'Maximum velocity. Increases speed by 30%.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.speed *= 1.30
      }
    ]
  },
  {
    id: 'rapid_fire',
    baseName: 'Rapid Fire',
    tiers: [
      {
        suffix: 'I',
        description: 'Decreases fire cooldown by 5%.',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.fireRate *= 0.95
      },
      {
        suffix: 'II',
        description: 'Decreases fire cooldown by another 5%.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.fireRate *= 0.95
      },
      {
        suffix: 'III',
        description: 'Decreases fire cooldown by another 10%.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.fireRate *= 0.90
      },
      {
        suffix: 'Minigun',
        description: 'Maximum fire rate. Decreases cooldown by 15%.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.fireRate *= 0.85
      }
    ]
  },
  {
    id: 'heavy_rounds',
    baseName: 'Heavy Rounds',
    tiers: [
      {
        suffix: 'I',
        description: 'Increases damage by 5.',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.damage += 5
      },
      {
        suffix: 'II',
        description: 'Increases damage by 10.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.damage += 10
      },
      {
        suffix: 'III',
        description: 'Increases damage by 20.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.damage += 20
      },
      {
        suffix: 'Titanium Slugs',
        description: 'Massive damage increase (+50).',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.damage += 50
      }
    ]
  },
  {
    id: 'vitality',
    baseName: 'Vitality',
    tiers: [
      {
        suffix: 'I',
        description: 'Increases Max HP by 20 and heals.',
        rarity: UpgradeRarity.Common,
        apply: (p) => { p.maxHealth += 20; p.health += 20; }
      },
      {
        suffix: 'II',
        description: 'Increases Max HP by 30 and heals.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => { p.maxHealth += 30; p.health += 30; }
      },
      {
        suffix: 'III',
        description: 'Increases Max HP by 50 and heals.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => { p.maxHealth += 50; p.health += 50; }
      },
      {
        suffix: 'Nanites',
        description: 'Increases Max HP by 100 and fully heals.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => { p.maxHealth += 100; p.health = p.maxHealth; }
      }
    ]
  },
  {
    id: 'regeneration',
    baseName: 'Regeneration',
    tiers: [
      {
        suffix: 'I',
        description: 'Heal +5% of missing HP after every wave.',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.waveHealRatio += 0.05
      },
      {
        suffix: 'II',
        description: 'Heal +5% of missing HP after every wave.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.waveHealRatio += 0.05
      },
      {
        suffix: 'III',
        description: 'Heal +5% of missing HP after every wave.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.waveHealRatio += 0.05
      },
      {
        suffix: 'Rebirth',
        description: 'Heal +10% of missing HP after every wave.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.waveHealRatio += 0.10
      }
    ]
  },
  {
    id: 'iron_skin',
    baseName: 'Iron Skin',
    tiers: [
      {
        suffix: 'I',
        description: 'Reduces incoming damage by 10%.',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.damageReduction += 0.10
      },
      {
        suffix: 'II',
        description: 'Reduces incoming damage by another 10%.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.damageReduction += 0.10
      },
      {
        suffix: 'III',
        description: 'Reduces incoming damage by another 15%.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.damageReduction += 0.15
      },
      {
        suffix: 'Diamond Plating',
        description: 'Reduces damage by another 25%. (Total 60%)',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.damageReduction += 0.25
      }
    ]
  },
  {
    id: 'repulse_mastery',
    baseName: 'Repulse Mastery',
    tiers: [
      {
        suffix: 'I',
        description: 'Increases Repulse force and damage by 10%.',
        rarity: UpgradeRarity.Common,
        apply: (p) => { p.repulseForceMult *= 1.10; p.repulseDamageMult *= 1.10; }
      },
      {
        suffix: 'II',
        description: 'Increases Repulse force and damage by 15%.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => { p.repulseForceMult *= 1.15; p.repulseDamageMult *= 1.15; }
      },
      {
        suffix: 'III',
        description: 'Increases Repulse force and damage by 20%.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => { p.repulseForceMult *= 1.20; p.repulseDamageMult *= 1.20; }
      },
      {
        suffix: 'Shockwave',
        description: 'Massively increases force and damage (+50%).',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => { p.repulseForceMult *= 1.50; p.repulseDamageMult *= 1.50; }
      }
    ]
  },
  {
    id: 'ricochet',
    baseName: 'Ricochet',
    tiers: [
      {
        suffix: 'I',
        description: 'Projectiles chain to 1 additional enemy.',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.ricochetBounces += 1
      },
      {
        suffix: 'II',
        description: 'Projectiles chain to 2 additional enemies.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.ricochetBounces += 1
      },
      {
        suffix: 'III',
        description: 'Projectiles chain to 3 additional enemies.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.ricochetBounces += 1
      },
      {
        suffix: 'Chain Reaction',
        description: 'Projectiles chain to 4 additional enemies.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.ricochetBounces += 1
      }
    ]
  },
  {
    id: 'multi_shot',
    baseName: 'Multi-Shot',
    tiers: [
      {
        suffix: 'I',
        description: 'Fires +1 projectile (Total 2).',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.projectileCount += 1
      },
      {
        suffix: 'II',
        description: 'Fires +2 projectiles (Total 3).',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.projectileCount += 1
      },
      {
        suffix: 'III',
        description: 'Fires +3 projectiles (Total 4).',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.projectileCount += 1
      },
      {
        suffix: 'Barrage',
        description: 'Fires +4 projectiles (Total 5).',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.projectileCount += 1
      }
    ]
  },
  {
    id: 'bigger_mags',
    baseName: 'Bigger Mags',
    tiers: [
      {
        suffix: 'I',
        description: 'Increases mag capacity by 10.',
        rarity: UpgradeRarity.Common,
        apply: (p) => { p.maxAmmo += 10; p.currentAmmo += 10; }
      },
      {
        suffix: 'II',
        description: 'Increases mag capacity by another 10.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => { p.maxAmmo += 10; p.currentAmmo += 10; }
      },
      {
        suffix: 'III',
        description: 'Increases mag capacity by another 10.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => { p.maxAmmo += 10; p.currentAmmo += 10; }
      },
      {
        suffix: 'Bottomless Pit',
        description: 'Increases mag capacity by another 10.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => { p.maxAmmo += 10; p.currentAmmo += 10; }
      }
    ]
  },
  {
    id: 'fast_reload',
    baseName: 'Fast Reload',
    tiers: [
      {
        suffix: 'I',
        description: 'Reloads 10% faster.',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.maxReloadTime *= 0.9
      },
      {
        suffix: 'II',
        description: 'Reloads another 10% faster.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.maxReloadTime *= 0.9
      },
      {
        suffix: 'III',
        description: 'Reloads another 10% faster.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.maxReloadTime *= 0.9
      },
      {
        suffix: 'Sleight of Hand',
        description: 'Reloads another 15% faster.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.maxReloadTime *= 0.85
      }
    ]
  }
];

export class UpgradeSystem implements System {
  update(dt: number, state: GameState) {
    // 1. Process Pending Queue (Manual/External applications)
    while (state.pendingUpgradeIds.length > 0) {
      const id = state.pendingUpgradeIds.shift();
      if (id) {
        this.applyUpgrade(state, id);
      }
    }
  }

  /**
   * Checks if upgrades are available and triggers the LevelUp state if so.
   * Returns true if LevelUp was triggered, false if upgrades are exhausted.
   */
  public triggerLevelUp(state: GameState): boolean {
    if (state.areUpgradesExhausted) return false;
    
    const options = this.generateUpgradeOptions(state);
    
    if (options.length > 0) {
      state.status = GameStatus.LevelUp;
      state.upgradeOptions = options;
      console.log("LevelUpReason: WAVE_CLEAR");
      return true;
    } else {
      state.areUpgradesExhausted = true;
      return false;
    }
  }

  /**
   * Generates a list of 3 selectable upgrades based on current progression.
   */
  private generateUpgradeOptions(state: GameState): UpgradeDefinition[] {
    const options: UpgradeDefinition[] = [];
    const maxOptions = 3;

    // Identify candidate chains:
    // A chain is a candidate if current level < tiers.length
    const candidates: UpgradeDefinition[] = [];

    for (const chain of CHAINS) {
        const currentLevel = state.ownedUpgrades.get(chain.id) || 0;
        
        if (currentLevel < chain.tiers.length) {
            const nextTier = chain.tiers[currentLevel];
            
            // Construct the virtual definition
            // Note: We append the suffix to the name if it's I, II, III, otherwise we replace name if it's special
            const isRoman = ['I', 'II', 'III'].includes(nextTier.suffix);
            const displayName = isRoman ? `${chain.baseName} ${nextTier.suffix}` : nextTier.suffix;

            candidates.push({
                id: chain.id,
                name: displayName,
                description: nextTier.description,
                rarity: nextTier.rarity,
                maxStack: chain.tiers.length,
                apply: nextTier.apply
            });
        }
    }

    // Select random options from candidates
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, maxOptions);
  }

  /**
   * Applies the NEXT level of an upgrade chain.
   */
  public applyUpgrade(state: GameState, upgradeId: string): boolean {
    const player = state.player;
    if (!player) return false;

    const chain = CHAINS.find(c => c.id === upgradeId);
    if (!chain) {
      console.warn(`Upgrade chain with ID ${upgradeId} not found.`);
      return false;
    }

    const currentLevel = state.ownedUpgrades.get(upgradeId) || 0;

    // Enforce Max Level
    if (currentLevel >= chain.tiers.length) {
      console.warn(`Upgrade ${chain.baseName} is already at max level.`);
      return false;
    }

    // Get the tier corresponding to the NEW level (0-indexed array)
    // Level 0 -> Apply Tier 0. New Level becomes 1.
    const tierToApply = chain.tiers[currentLevel];

    // Apply the Effect
    tierToApply.apply(player);

    // Update Ownership (Increment Level)
    state.ownedUpgrades.set(upgradeId, currentLevel + 1);
    
    console.log(`Applied upgrade: ${chain.baseName} ${tierToApply.suffix} (Level: ${currentLevel + 1}/${chain.tiers.length})`);
    return true;
  }

  // --- Shop Logic ---

  public static getUpgradeCost(tierIndex: number): number {
      switch(tierIndex) {
          case 0: return 500;   // Tier I
          case 1: return 1500;  // Tier II
          case 2: return 4000;  // Tier III
          case 3: return 10000; // Tier IV (Legendary)
          default: return 99999;
      }
  }

  public static getUnlockWave(tierIndex: number): number {
      switch(tierIndex) {
          case 0: return 1;
          case 1: return 5;
          case 2: return 10;
          case 3: return 15;
          default: return 99;
      }
  }

  public buyUpgrade(state: GameState, upgradeId: string): boolean {
      const currentLevel = state.ownedUpgrades.get(upgradeId) || 0;
      const cost = UpgradeSystem.getUpgradeCost(currentLevel);
      const unlockWave = UpgradeSystem.getUnlockWave(currentLevel);

      // Validation
      if (state.score < cost) return false;
      if (state.wave < unlockWave) return false;
      
      const success = this.applyUpgrade(state, upgradeId);
      if (success) {
          state.score -= cost;
      }
      return success;
  }
}