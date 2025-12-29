import { EnemyVariant } from '../entities/types';
import { PLAYER_SPEED, PLAYER_FIRE_RATE, ENEMY_SPAWN_RATE, ENEMY_MIN_SPAWN_RATE } from '../utils/constants';

export const BALANCE = {
  // Wave & Difficulty Logic
  WAVE: {
    // Enemy Counts
    // Formula: (BASE + (Wave * PER_WAVE)) * MULTIPLIER
    // Pacing Adjustment: Increased budget per wave slightly to extend midgame
    BASE_BUDGET: 8,
    BUDGET_PER_WAVE: 4,  // Was 3 - Slightly longer waves
    BUDGET_MULTIPLIER: 3, 

    // Stat Scaling (Per Wave, Linear)
    HP_SCALING: 0.08,         // +8% HP per wave
    DAMAGE_SCALING: 0.05,     // +5% Damage per wave
    SPEED_SCALING: 0.015,     // +1.5% Movement Speed per wave
    TURN_SPEED_SCALING: 0.02, // +2% Steering Responsiveness per wave

    // Variant Specific
    TANK_HP_BONUS: 0.04,      // Tanks gain an EXTRA 4% HP per wave (Total 12%)

    HEAL_RATIO: 0.15,
  },
  
  // Shop Logic
  SHOP: {
    // Steeper scaling since all upgrades are available from start
    // Tier 1: 650 (Was 500)
    // Tier 2: 2500 (Was 2000)
    // Tier 3: 6500 (Was 5000)
    // Tier 4: 15000 (Was 12000)
    COSTS: [650, 2500, 6500, 15000] as const, 
  },

  // Default Player Stats (Initialization)
  PLAYER: {
      BASE_HP: 100,
      BASE_AMMO: 10,
      RELOAD_TIME: 1.5,
      REPULSE_COOLDOWN: 5.0,
      REPULSE_DAMAGE: 10,
      BASE_DAMAGE: 10,
      BASE_SPEED: PLAYER_SPEED,
      BASE_FIRE_RATE: PLAYER_FIRE_RATE,
      BASE_RICOCHET_RADIUS: 220, // Pixel radius for finding next target
  }
};

/**
 * Calculates the cost for the next upgrade tier.
 * @param currentTierIndex - The 0-based index of the current tier owned (0 = none, 1 = Tier I, etc)
 */
export const getUpgradeCost = (currentTierIndex: number): number => {
    const costs = BALANCE.SHOP.COSTS;
    if (currentTierIndex >= 0 && currentTierIndex < costs.length) {
        return costs[currentTierIndex];
    }
    return 99999;
};

/**
 * Returns the enemy variant weights for a given wave.
 */
export const getWaveEnemyWeights = (wave: number) => {
    // Every 10th wave is a BOSS WAVE
    if (wave % 10 === 0) {
        return {
            [EnemyVariant.Basic]: 0.0,
            [EnemyVariant.Fast]: 0.0,
            [EnemyVariant.Tank]: 0.0,
            [EnemyVariant.Shooter]: 0.0,
            [EnemyVariant.Boss]: 1.0 // 100% Boss
        };
    }

    const weights = {
        [EnemyVariant.Basic]: 1.0,
        [EnemyVariant.Fast]: 0.0,
        [EnemyVariant.Tank]: 0.0,
        [EnemyVariant.Shooter]: 0.0,
        [EnemyVariant.Boss]: 0.0
    };

    if (wave >= 10) {
        // High difficulty mix
        weights[EnemyVariant.Basic] = 0.3;
        weights[EnemyVariant.Fast] = 0.3;
        weights[EnemyVariant.Tank] = 0.2;
        weights[EnemyVariant.Shooter] = 0.2; // Shooters are common
    } else if (wave >= 7) {
        // Introduce Shooters
        weights[EnemyVariant.Basic] = 0.5;
        weights[EnemyVariant.Fast] = 0.3;
        weights[EnemyVariant.Tank] = 0.1;
        weights[EnemyVariant.Shooter] = 0.1; 
    } else if (wave >= 5) {
        // Introduce Tanks
        weights[EnemyVariant.Basic] = 0.6;
        weights[EnemyVariant.Fast] = 0.3;
        weights[EnemyVariant.Tank] = 0.1;
    } else if (wave >= 3) {
        // Introduce Fast enemies
        weights[EnemyVariant.Basic] = 0.8;
        weights[EnemyVariant.Fast] = 0.2;
    } 
    
    return weights;
};