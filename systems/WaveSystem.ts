import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType, EnemyVariant } from '../entities/types';
import { WAVE_DIFFICULTY_SCALING } from '../utils/constants';

export class WaveSystem implements System {
  update(dt: number, state: GameState) {
    // 1. If Wave is Active, check for completion
    if (state.waveActive) {
      const enemiesAlive = state.entityManager.getByType(EntityType.Enemy).length;
      
      // Wave is complete when no enemies are left to spawn AND no enemies are alive on screen
      if (state.enemiesRemainingInWave <= 0 && enemiesAlive === 0) {
        // Stop spawning/fighting
        state.waveActive = false;
        // Signal that wave is cleared (GameEngine will handle Upgrade or Next Wave)
        state.waveCleared = true;

        // --- Wave End Healing (Percent of Missing Health) ---
        // "Catch-up" mechanic: Heals more when you are low.
        if (state.player && state.player.active) {
            const missingHealth = state.player.maxHealth - state.player.health;
            if (missingHealth > 0) {
                const healRatio = state.player.waveHealRatio || 0.15; // Default 15%
                const healAmount = missingHealth * healRatio;
                
                state.player.health = Math.min(state.player.maxHealth, state.player.health + healAmount);
            }
        }
      }
    } 
    // No else block needed; delay is handled by WaveIntro state in GameEngine
  }

  /**
   * Updates wave statistics for the upcoming wave.
   * Called by GameEngine before starting the WaveIntro.
   */
  public prepareNextWave(state: GameState) {
    state.wave++;
    
    // Budget: Tripled for higher density (Requested 200% increase)
    // Original formula: 12 + (state.wave * 4)
    // New formula: (12 + (state.wave * 4)) * 3
    // Wave 1: 16 -> 48
    // Wave 5: 32 -> 96
    // Wave 10: 52 -> 156
    const baseBudget = 12 + (state.wave * 4);
    state.enemiesRemainingInWave = Math.floor(baseBudget * 3);
    
    // Difficulty Multiplier: 
    // - 5% increase per wave starting AFTER wave 1
    // - Extra 2% compounding scaling after Wave 7 to prevent fire-rate trivialization
    let multiplier = 1 + (Math.max(0, state.wave - 1) * WAVE_DIFFICULTY_SCALING);
    
    if (state.wave > 7) {
        multiplier += (state.wave - 7) * 0.02; 
    }
    
    state.difficultyMultiplier = multiplier;

    // Define difficulty mix based on wave number
    const weights = {
        [EnemyVariant.Basic]: 1.0,
        [EnemyVariant.Fast]: 0.0,
        [EnemyVariant.Tank]: 0.0
    };

    if (state.wave >= 10) {
        // High difficulty mix
        weights[EnemyVariant.Basic] = 0.4;
        weights[EnemyVariant.Fast] = 0.4;
        weights[EnemyVariant.Tank] = 0.2;
    } else if (state.wave >= 5) {
        // Introduce Tanks
        weights[EnemyVariant.Basic] = 0.6;
        weights[EnemyVariant.Fast] = 0.3;
        weights[EnemyVariant.Tank] = 0.1;
    } else if (state.wave >= 3) {
        // Introduce Fast enemies
        weights[EnemyVariant.Basic] = 0.8;
        weights[EnemyVariant.Fast] = 0.2;
    } 
    // Waves 1-2 remain 100% Basic

    state.waveEnemyWeights = weights;

    // Reset flags
    state.waveCleared = false;
    state.waveActive = false;
    
    console.log(`Wave ${state.wave} Prepared. Budget: ${state.enemiesRemainingInWave}, Difficulty: ${state.difficultyMultiplier.toFixed(2)}x`);
  }
}