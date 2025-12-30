import { EnemyVariant } from '../entities/types';
import { PLAYER_SPEED, PLAYER_FIRE_RATE, ENEMY_SPAWN_RATE, ENEMY_MIN_SPAWN_RATE } from '../utils/constants';

export const BALANCE = {
  // Wave & Difficulty Logic
  WAVE: {
    // Enemy Counts: Wave 1 = 10, +2 per wave
    BASE_COUNT: 10, 
    COUNT_PER_WAVE: 2, 

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
    // Steeper Scaling to force commitment
    // T1: 1200 (Entry)
    // T2: 3500 (Commitment)
    // T3: 9000 (Specialization)
    // T4: 22000 (Mastery)
    COSTS: [1200, 3500, 9000, 22000] as const, 
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
      
      // New Ability Defaults
      DASH_COOLDOWN: 2.5, // Time to regenerate one charge
      DASH_DURATION: 0.15,
      DASH_TRAIL_DAMAGE: 10,
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
        // Boss waves might have minions in later stages
        if (wave > 10) {
             return {
                [EnemyVariant.Basic]: 0.3,
                [EnemyVariant.Fast]: 0.2,
                [EnemyVariant.Tank]: 0.1,
                [EnemyVariant.Shooter]: 0.1,
                [EnemyVariant.Boss]: 0.3 
            };
        }
        return {
            [EnemyVariant.Basic]: 0.0,
            [EnemyVariant.Fast]: 0.0,
            [EnemyVariant.Tank]: 0.0,
            [EnemyVariant.Shooter]: 0.0,
            [EnemyVariant.Boss]: 1.0 
        };
    }

    const weights = {
        [EnemyVariant.Basic]: 1.0,
        [EnemyVariant.Fast]: 0.0,
        [EnemyVariant.Tank]: 0.0,
        [EnemyVariant.Shooter]: 0.0,
        [EnemyVariant.Boss]: 0.0
    };

    // Progressive Introduction
    // Wave 3+: Fast
    // Wave 6+: Tank
    // Wave 9+: Shooter
    
    if (wave >= 10) {
        // Mixed Bag (Chaotic)
        weights[EnemyVariant.Basic] = 0.3;
        weights[EnemyVariant.Fast] = 0.3;
        weights[EnemyVariant.Tank] = 0.2;
        weights[EnemyVariant.Shooter] = 0.2;
    } else if (wave >= 9) {
        // Introduce Shooters
        weights[EnemyVariant.Basic] = 0.4;
        weights[EnemyVariant.Fast] = 0.3;
        weights[EnemyVariant.Tank] = 0.2;
        weights[EnemyVariant.Shooter] = 0.1; 
    } else if (wave >= 6) {
        // Introduce Tanks
        weights[EnemyVariant.Basic] = 0.5;
        weights[EnemyVariant.Fast] = 0.3;
        weights[EnemyVariant.Tank] = 0.2;
    } else if (wave >= 3) {
        // Introduce Fast enemies
        weights[EnemyVariant.Basic] = 0.7;
        weights[EnemyVariant.Fast] = 0.3;
    } 
    
    return weights;
};