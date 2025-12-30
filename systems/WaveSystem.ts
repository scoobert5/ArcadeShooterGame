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
                // Defense Synergy Tier 4: Adaptive Regen (More healing)
                let healRatio = state.player.waveHealRatio || BALANCE.WAVE.HEAL_RATIO;
                const healAmount = missingHealth * healRatio;
                
                state.player.health = Math.min(state.player.maxHealth, state.player.health + healAmount);
            }
            
            // --- Shield Regeneration ---
            // Shields only refill at start of wave
            if (state.player.maxShields > 0) {
                state.player.currentShields = state.player.maxShields;
            }

            // --- Meta Rewards for Clearing Wave ---
            // GATE: No currency before Wave 10. Small XP drip for morale.
            if (state.wave < 10) {
                state.runMetaXP += 5; // Small Drip
            } else {
                state.runMetaCurrency += 10;
                state.runMetaXP += 50;
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
    
    // Check for Boss Wave (Every 10 levels)
    state.isBossWave = (state.wave % 10 === 0);

    if (state.isBossWave) {
        // BOSS WAVE LOGIC
        // Boss waves also spawn minions in higher tiers (handled in EnemySystem spawning logic if budget > 1)
        // But budget calc for boss is usually just 1 unless we want minions.
        // Let's stick to 1 BOSS for now, minions spawn by boss mechanics or just wave weights.
        // Prompt says "Wave 10+: All enemy types mixed".
        // Let's set a budget for boss waves too if we want minions.
        // For simplicity: Boss counts as 1 "Enemy" in the counter, but weights are handled.
        // Actually, logic in EnemySystem handles BOSS weight = 1.0 -> Single Spawn.
        state.enemiesRemainingInWave = 1;
    } else {
        // STANDARD WAVE LOGIC: 10 + 2 per wave
        // Wave 1 = 10 + (0 * 2) = 10
        // Wave 2 = 10 + (1 * 2) = 12
        state.enemiesRemainingInWave = BALANCE.WAVE.BASE_COUNT + (state.wave * BALANCE.WAVE.COUNT_PER_WAVE);
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