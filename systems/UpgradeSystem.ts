import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { PlayerEntity } from '../entities/types';
import { CHAINS } from '../data/upgrades';
import { getUpgradeCost } from '../config/balance';

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

  public buyUpgrade(state: GameState, upgradeId: string): boolean {
      const currentLevel = state.ownedUpgrades.get(upgradeId) || 0;
      const cost = getUpgradeCost(currentLevel);

      // Validation
      if (state.score < cost) return false;
      // Removed wave lock check
      
      const success = this.applyUpgrade(state, upgradeId);
      if (success) {
          state.score -= cost;
      }
      return success;
  }
}