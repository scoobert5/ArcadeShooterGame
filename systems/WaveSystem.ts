import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType } from '../entities/types';
import { BALANCE, getWaveEnemyWeights } from '../config/balance';

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

        if (state.player && state.player.active) {
            // --- Wave End Healing (Percent of Missing Health) ---
            const missingHealth = state.player.maxHealth - state.player.health;
            if (missingHealth > 0) {
                const healRatio = state.player.waveHealRatio || BALANCE.WAVE.HEAL_RATIO;
                const healAmount = missingHealth * healRatio;
                
                state.player.health = Math.min(state.player.maxHealth, state.player.health + healAmount);
            }
            
            // --- Shield Regeneration ---
            // Shields only refill at start of wave
            if (state.player.maxShields > 0) {
                state.player.currentShields = state.player.maxShields;
            }

            // --- Meta Rewards for Clearing Wave ---
            state.runMetaCurrency += 10;
            state.runMetaXP += 50;
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
    
    // Check for Boss Wave (Every 10 levels)
    state.isBossWave = (state.wave % 10 === 0);

    if (state.isBossWave) {
        // BOSS WAVE LOGIC
        // Only 1 enemy to spawn (The Boss)
        state.enemiesRemainingInWave = 1;
    } else {
        // STANDARD WAVE LOGIC
        const baseBudget = BALANCE.WAVE.BASE_BUDGET + (state.wave * BALANCE.WAVE.BUDGET_PER_WAVE);
        state.enemiesRemainingInWave = Math.floor(baseBudget * BALANCE.WAVE.BUDGET_MULTIPLIER);
    }
    
    // Difficulty Multiplier: Linear continuous scaling
    // We map the generic difficulty to HP scaling for general reference (Score etc.)
    state.difficultyMultiplier = 1 + (Math.max(0, state.wave - 1) * BALANCE.WAVE.HP_SCALING);

    // Define difficulty mix based on wave number (Centralized config)
    state.waveEnemyWeights = getWaveEnemyWeights(state.wave);

    // Reset flags
    state.waveCleared = false;
    state.waveActive = false;
    
    console.log(`Wave ${state.wave} Prepared. Boss: ${state.isBossWave}, Budget: ${state.enemiesRemainingInWave}, Difficulty: ${state.difficultyMultiplier.toFixed(2)}x`);
  }
}