
import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { PlayerEntity } from '../entities/types';
import { CHAINS, SYNERGY_LEVELS, UpgradeFamily } from '../data/upgrades';
import { calculateUpgradeCost } from '../utils/economy';

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
   * Calculates active synergy tiers based on investment.
   * Tracks 10 tiers per family at intervals of 3 levels.
   */
  private updateSynergies(player: PlayerEntity, state: GameState) {
      const bulletLevels = state.purchasedFamilyCounts.get('BULLETS') || 0;
      const mobilityLevels = state.purchasedFamilyCounts.get('MOBILITY') || 0;
      const defenseLevels = state.purchasedFamilyCounts.get('DEFENSE') || 0;

      // Helper to find highest active tier
      const getTier = (levels: number, family: 'BULLETS' | 'DEFENSE' | 'MOBILITY') => {
          let tier = 0;
          for (const m of SYNERGY_LEVELS[family]) {
              if (levels >= m.levelsRequired) {
                  tier = m.tier;
              } else {
                  break; 
              }
          }
          return tier;
      };

      player.synergyBulletTier = getTier(bulletLevels, 'BULLETS');
      player.synergyDefenseTier = getTier(defenseLevels, 'DEFENSE');
      player.synergyMobilityTier = getTier(mobilityLevels, 'MOBILITY');
  }

  /**
   * Applies the NEXT level of an upgrade chain.
   * Tracks family investment but DOES NOT deduct score (handled by buyUpgrade).
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
      // console.warn(`Upgrade ${chain.baseName} is already at max level.`);
      return false;
    }

    // Get the tier corresponding to the NEW level (0-indexed array)
    const tierToApply = chain.tiers[currentLevel];

    // Apply the Effect
    tierToApply.apply(player);

    // Update Ownership (Increment Level)
    state.ownedUpgrades.set(upgradeId, currentLevel + 1);
    
    // Update Family Count
    const family = chain.family;
    const famCount = state.purchasedFamilyCounts.get(family) || 0;
    state.purchasedFamilyCounts.set(family, famCount + 1);

    // SET IDENTITY IF APPLICABLE
    if (chain.isIdentity) {
        player.activeIdentityId = upgradeId;
    }

    // Recalculate Synergies
    this.updateSynergies(player, state);

    if (state.debugMode) {
        console.log(`Applied upgrade: ${chain.baseName} ${tierToApply.suffix} (Level: ${currentLevel + 1}). Family: ${family}`);
    }
    return true;
  }

  public buyUpgrade(state: GameState, upgradeId: string): boolean {
      // Use the new economy calculator
      const cost = calculateUpgradeCost(state, upgradeId);

      // Validation 1: Score
      if (state.score < cost) return false;

      // Validation 2: Identity Lock
      const chain = CHAINS.find(c => c.id === upgradeId);
      if (chain?.isIdentity) {
          if (state.player?.activeIdentityId && state.player.activeIdentityId !== upgradeId) {
              // Different identity already active
              return false;
          }
      }
      
      const success = this.applyUpgrade(state, upgradeId);
      if (success) {
          state.score -= cost;
      }
      return success;
  }

  /**
   * Cheat/Dev Command: Grants all upgrades for a specific family.
   */
  public maxOutFamily(state: GameState, familyName: string) {
      const normalizedFamily = familyName.toUpperCase();
      if (normalizedFamily !== 'BULLETS' && normalizedFamily !== 'DEFENSE' && normalizedFamily !== 'MOBILITY') {
          console.warn("Invalid family: " + familyName);
          return;
      }
      
      const family = normalizedFamily as UpgradeFamily;
      const familyChains = CHAINS.filter(c => c.family === family);
      
      for (const chain of familyChains) {
          const currentLevel = state.ownedUpgrades.get(chain.id) || 0;
          const maxLevel = chain.tiers.length;
          // Apply remaining levels
          for(let i = currentLevel; i < maxLevel; i++) {
              this.applyUpgrade(state, chain.id);
          }
      }
  }
}
