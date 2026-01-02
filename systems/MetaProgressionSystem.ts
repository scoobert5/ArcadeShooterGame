
import { GameState } from '../core/GameState';
import { PlayerEntity, EntityType, HazardEntity } from '../entities/types';
import { MetaCategory, META_CATEGORIES, LEVEL_BASE_XP, LEVEL_XP_GROWTH } from '../data/metaUpgrades';
import { Vec2 } from '../utils/math';

/**
 * Handles the logic for purchasing, unlocking, and equipping meta-progression items.
 * Strictly separated from the run-loop systems.
 */
export class MetaProgressionSystem {
  
  /**
   * Helper: Calculate level from total XP
   */
  public getLevelFromXP(totalXP: number): { level: number, xpIntoLevel: number, xpForNext: number } {
      let level = 1;
      let xpRemaining = totalXP;
      let xpNeeded = LEVEL_BASE_XP;

      // Simple iterative subtraction
      while (xpRemaining >= xpNeeded) {
          xpRemaining -= xpNeeded;
          level++;
          xpNeeded += LEVEL_XP_GROWTH;
      }

      return {
          level,
          xpIntoLevel: xpRemaining,
          xpForNext: xpNeeded
      };
  }

  public isPerkUnlocked(state: GameState, perkId: string): boolean {
      const perkNode = META_CATEGORIES[MetaCategory.STARTING_PERKS].find(p => p.id === perkId);
      if (!perkNode) return false;
      const { level } = this.getLevelFromXP(state.metaState.xp);
      return level >= perkNode.requiredLevel;
  }

  public setEquippedStartingPerk(state: GameState, perkId: string | null): boolean {
    if (perkId === null) {
        state.metaState.equippedStartingPerk = null;
        return true;
    }
    const perkExists = META_CATEGORIES[MetaCategory.STARTING_PERKS].some(p => p.id === perkId);
    if (!perkExists) return false;
    if (!this.isPerkUnlocked(state, perkId)) return false;
    
    state.metaState.equippedStartingPerk = perkId;
    return true;
  }

  /**
   * Called ONCE at the start of a run to initialize perk state.
   */
  public onRunStart(state: GameState, player: PlayerEntity) {
      const perkId = state.metaState.equippedStartingPerk;
      if (!perkId) return;

      switch (perkId) {
          case 'pack_kinetic':
              player.kineticTimer = 0;
              player.kineticReady = false;
              // Tradeoff: Pulse Cooldown +10%
              player.maxRepulseCooldown *= 1.1; 
              break;
          case 'pack_overclock':
              player.overclockTimer = 30.0;
              player.baseFireRate = player.fireRate;
              break;
          case 'pack_targeting':
              player.uplinkTimer = 0;
              player.uplinkActive = false;
              player.lastRotation = player.rotation;
              break;
          case 'pack_thruster':
              player.thrusterBurstAvailable = true;
              // Tradeoff: Recharge 15% slower
              player.maxDashCooldown *= 1.15;
              break;
          case 'pack_seals':
              player.hazardSealsRemaining = 3;
              break;
          case 'pack_armor':
              player.armorPlatingActive = true;
              // Tradeoff: Max HP -5%
              player.maxHealth = Math.floor(player.maxHealth * 0.95);
              player.health = player.maxHealth;
              break;
          case 'pack_injector':
              player.scrapShieldAmount = 0;
              player.scrapShieldTimer = 0;
              break;
      }
  }

  /**
   * Called every frame from GameEngine to update continuous perk logic.
   */
  public updatePerkLogic(dt: number, state: GameState, input: { fire: boolean }) {
      const player = state.player;
      if (!player || !player.active || !state.metaState.equippedStartingPerk) return;

      const perkId = state.metaState.equippedStartingPerk;

      // 1. Kinetic Charger: Continuous Fire
      if (perkId === 'pack_kinetic') {
          if (input.fire && !player.isReloading && player.currentAmmo > 0) {
              player.kineticTimer = (player.kineticTimer || 0) + dt;
              if (player.kineticTimer > 2.0) {
                  player.kineticReady = true;
                  player.repulseDamageMult = 1.25; // Apply Buff
              }
          } else {
              // Reset if stopped firing
              if (!player.kineticReady) {
                  player.kineticTimer = 0;
              }
          }
          // Note: Consumption logic handles inside repulse trigger (state check) or inferred here if cooldown starts?
          // Simplest: Check if pulse just went on cooldown.
          if (player.repulseCooldown > player.maxRepulseCooldown - 0.1 && player.kineticReady) {
              // Consumed
              player.kineticReady = false;
              player.kineticTimer = 0;
              player.repulseDamageMult = 1.0;
          }
      }

      // 2. Overclock Fuse: Time Limit
      if (perkId === 'pack_overclock') {
          if (player.overclockTimer && player.overclockTimer > 0) {
              player.overclockTimer -= dt;
              if (player.baseFireRate) player.fireRate = player.baseFireRate * 0.85; // 15% Faster
          } else {
              // Burned out
              if (player.baseFireRate) player.fireRate = player.baseFireRate * 1.05; // 5% Slower
          }
      }

      // 3. Targeting Uplink: Stability
      if (perkId === 'pack_targeting') {
          const diff = Math.abs((player.rotation || 0) - (player.lastRotation || 0));
          // Normalized angular diff handling? Assuming small changes per frame.
          if (diff < 0.02) { // Threshold
              player.uplinkTimer = (player.uplinkTimer || 0) + dt;
          } else {
              player.uplinkTimer = 0;
          }
          player.lastRotation = player.rotation;

          if ((player.uplinkTimer || 0) > 2.0) {
              // Apply Buff
              if (!player.uplinkActive) {
                  player.damage *= 1.1;
                  player.speedMultiplier -= 0.03;
                  player.uplinkActive = true;
              }
          } else {
              // Remove Buff
              if (player.uplinkActive) {
                  player.damage /= 1.1;
                  player.speedMultiplier += 0.03; // Approximate restore
                  player.uplinkActive = false;
              }
          }
      }

      // 4. Scrap Injector: Decay
      if (perkId === 'pack_injector') {
          if ((player.scrapShieldTimer || 0) > 0) {
              player.scrapShieldTimer! -= dt;
              if (player.scrapShieldTimer! <= 0) {
                  player.scrapShieldAmount = 0;
              }
          }
      }
      
      // 5. Thruster Burst: Monitor Dash Use
      if (perkId === 'pack_thruster') {
          // Detect if fatigue increased (dash used)
          // Since we can't hook PlayerSystem dash logic directly easily, check fatigue jump
          // If fatigue > 0 and thrusterAvailable, refund half
          // Actually, we can check `isDashing` start or just check if fatigue > oldFatigue.
          // Simplest: GameEngine handles this via specific check, or we assume engine calls onDash?
          // Let's implement `onDash` hook.
      }
  }

  /**
   * Hook: Called when Player Dashes
   */
  public onDash(player: PlayerEntity, perkId: string) {
      if (perkId === 'pack_thruster' && player.thrusterBurstAvailable) {
          player.dashFatigue *= 0.5; // Refund 50% of the penalty
          player.thrusterBurstAvailable = false;
      }
  }

  /**
   * Hook: Called when Wave Starts
   */
  public onWaveStart(player: PlayerEntity, perkId: string) {
      if (perkId === 'pack_thruster') {
          player.thrusterBurstAvailable = true;
      }
  }

  /**
   * Hook: Called when Wave Clears
   */
  public onWaveClear(state: GameState, player: PlayerEntity, perkId: string) {
      if (perkId === 'pack_injector') {
          // Gain Shield Buffer
          player.scrapShieldAmount = Math.ceil(player.maxHealth * 0.03);
          player.scrapShieldTimer = 5.0; // 5 Seconds
      }
  }

  /**
   * Hook: Called right before damage is applied. Returns modified damage.
   */
  public onPlayerDamage(player: PlayerEntity, perkId: string, incomingDamage: number): number {
      let damage = incomingDamage;

      // Armor Plating
      if (perkId === 'pack_armor' && player.armorPlatingActive) {
          damage *= 0.4; // Reduce by 60%
          player.armorPlatingActive = false;
      }

      // Scrap Injector Buffer
      if (perkId === 'pack_injector' && (player.scrapShieldAmount || 0) > 0) {
          const absorbed = Math.min(damage, player.scrapShieldAmount!);
          damage -= absorbed;
          player.scrapShieldAmount! -= absorbed;
      }

      return damage;
  }

  /**
   * Hook: Intercepts Score Gains
   */
  public getScoreMultiplier(state: GameState, perkId: string): number {
      if (perkId === 'pack_magnet') {
          if (state.wave <= 5) return 1.15; // +15%
          return 0.90; // -10%
      }
      return 1.0;
  }

  /**
   * Hook: Check Hazard Slow Immunity
   */
  public shouldApplyHazardSlow(player: PlayerEntity, perkId: string): boolean {
      if (perkId === 'pack_seals') {
          if ((player.hazardSealsRemaining || 0) > 0) {
              // Consume seal? We need to debounce this so it doesn't drain instantly.
              // Assuming GameEngine handles the "first contact" check or we just return false here and decrement elsewhere.
              // We'll return false (Immune).
              return false;
          }
      }
      return true;
  }
  
  /**
   * Called to decrement seal count on confirmed contact
   */
  public consumeHazardSeal(player: PlayerEntity, perkId: string) {
      if (perkId === 'pack_seals' && (player.hazardSealsRemaining || 0) > 0) {
          player.hazardSealsRemaining!--;
      }
  }

  /**
   * Hook: Boss Kill
   */
  public onBossKill(state: GameState, perkId: string) {
      if (perkId === 'pack_gamble') {
          state.runMetaXP += Math.floor(state.runMetaXP * 0.20); // Bonus 20%
      }
  }

  public consolidateRewards(state: GameState, currencyGained: number, xpGained: number) {
      // Beacon Logic
      const perkId = state.metaState.equippedStartingPerk;
      let finalCurrency = currencyGained;
      
      if (perkId === 'pack_beacon' && state.wave > 10 && !state.isPlayerAlive) {
          finalCurrency = Math.floor(finalCurrency * 1.1); // +10% retention on death
      }
      
      // Extractor's Gamble penalty handled in GameEngine onDeath
      
      state.metaState.currency += finalCurrency;
      state.metaState.xp += xpGained;
      
      const { level } = this.getLevelFromXP(state.metaState.xp);
      state.metaState.level = level;

      state.metaCurrency = state.metaState.currency;
      state.metaXP = state.metaState.xp;
  }
}
