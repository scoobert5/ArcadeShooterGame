import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType, EnemyEntity, EnemyVariant, ProjectileEntity, ParticleEntity, HazardEntity, PlayerEntity } from '../entities/types';
import { Vec2 } from '../utils/math';
import { Colors } from '../utils/constants';

export class DamageSystem implements System {
  update(dt: number, state: GameState) {
    const player = state.player;

    // 0. Update Shield Pop Timer
    if (player && player.shieldPopTimer > 0) {
        player.shieldPopTimer -= dt;
    }

    // Update Enemy Vulnerability Timers
    const enemies = state.entityManager.getByType(EntityType.Enemy) as EnemyEntity[];
    for (const e of enemies) {
        if (e.vulnerableTimer && e.vulnerableTimer > 0) {
            e.vulnerableTimer -= dt;
        }
    }

    // 1. Update Hazards (Damage & Lifetime)
    const hazards = state.entityManager.getByType(EntityType.Hazard) as HazardEntity[];

    for (const hazard of hazards) {
        hazard.lifetime -= dt;
        if (hazard.lifetime <= 0) {
            hazard.active = false;
            continue;
        }

        if (hazard.tickTimer > 0) {
            hazard.tickTimer -= dt;
        }

        // Logic split based on ownership
        if (hazard.isPlayerOwned) {
            // Player Hazard (Dash Trail) -> Hurts Enemies
            if (hazard.tickTimer <= 0) {
                for (const enemy of enemies) {
                    if (!enemy.active) continue;
                    
                    let dist = 0;
                    if (hazard.style === 'line' && hazard.from && hazard.to) {
                        dist = Vec2.distToSegment(enemy.position, hazard.from, hazard.to);
                    } else {
                        dist = Vec2.dist(hazard.position, enemy.position);
                    }

                    if (dist < hazard.radius + enemy.radius) {
                        enemy.health -= hazard.damage;
                        enemy.hitFlashTimer = 0.1;
                        if (enemy.health <= 0) {
                            this.handleEnemyDeath(state, enemy);
                        }
                    }
                }
                hazard.tickTimer = 0.1; // Reset tick
            }
        } else {
             // Enemy Hazard -> Hurts Player
             if (player && player.active) {
                
                // IDENTITY: Phase Runner - Invulnerable Dash
                if (player.dashInvulnerable && player.isDashing) {
                    continue; // Skip damage check entirely
                }

                let dist = 0;
                if (hazard.style === 'line' && hazard.from && hazard.to) {
                    dist = Vec2.distToSegment(player.position, hazard.from, hazard.to);
                } else {
                    dist = Vec2.dist(hazard.position, player.position);
                }

                if (dist < hazard.radius + player.radius) {
                    if (hazard.tickTimer <= 0) {
                        // Hazard damage logic
                         // IDENTITY: Phase Runner - Shields Disabled
                         if (player.currentShields > 0 && !player.shieldsDisabled) {
                             this.breakShield(state, player);
                         } else if (player.invulnerabilityTimer <= 0) {
                             
                             // DODGE CHECK
                             if (this.attemptDodge(player)) {
                                 // Dodged!
                             } else {
                                 const damage = hazard.damage;
                                 let mitigation = player.damageReduction || 0;
                                 
                                 // FORTRESS: Stationary Mitigation
                                 if (player.fortressTimer > 1.0) mitigation += 0.15; // +15% DR

                                 const actualDamage = Math.max(1, damage * (1 - mitigation));
                                 
                                 player.health -= actualDamage;
                                 player.hitFlashTimer = 0.1;
                                 
                                 // Reset Passive Regen
                                 if (player.synergyDefenseTier >= 2) player.shieldRegenTimer = 10.0;
                             }
                         }
                         hazard.tickTimer = 0.5; 
                    }
                }
            }
        }
    }

    // 2. Process Projectile Hits on Enemies
    for (const hit of state.hitEvents) {
      const { projectile, enemy } = hit;

      // Guard against already handled entities
      if (!projectile.active || !enemy.active) continue;
      
      // If piercing, check if we already hit this enemy
      if (projectile.hitEntityIds.includes(enemy.id)) continue;

      // Apply Damage
      let damage = projectile.damage;

      // SYNERGY: BULLET T3 - Ricochet Damage Bonus
      if (projectile.isRicochet && player && player.synergyBulletTier >= 3) {
          damage *= 1.5; // +50% Damage on ricochets
      }

      // SYNERGY: VULNERABILITY (Incoming Damage Amp)
      if (enemy.vulnerableTimer && enemy.vulnerableTimer > 0) {
          // Synergy T8: Doubled Effect
          const mult = (player && player.synergyBulletTier >= 8) ? 1.6 : 1.3;
          damage *= mult;
      }
      
      // BOSS VULNERABILITY CYCLE
      if (enemy.variant === EnemyVariant.Boss && enemy.bossVulnIsActive) {
          damage *= 2.0; // Double Damage during window
      }
      
      // SYNERGY: BULLET T7 - Crit Damage
      if (player && player.synergyBulletTier >= 7) {
          // Flat damage increase simulation of "crit damage" or actual crit logic
          // Simpler: Just +100% base damage boost for high tier synergy
          damage *= 2.0;
      }
      
      // Post Dash Buff
      if (player && player.postDashTimer > 0) {
          damage *= (1 + player.postDashDamageBuff);
      }

      // UPGRADE: CULLING / EXECUTIONER
      if (player && player.cullingThreshold > 0) {
          const hpPct = enemy.health / enemy.maxHealth;
          if (hpPct <= player.cullingThreshold) {
              if (player.cullingThreshold > 0.9) {
                  // Executioner (Instakill non-boss)
                  if (enemy.variant !== EnemyVariant.Boss) damage = 99999;
              } else {
                  damage *= 1.5; // Standard Culling bonus
              }
          }
      }

      // UPGRADE: FOCUS FIRE
      if (player && player.focusFireStacks > 0) {
          if (player.focusFireTarget === enemy.id) {
              damage += player.focusFireStacks * 5; 
          } else {
              player.focusFireTarget = enemy.id; // Switch target
          }
      }

      // Tank Armor Logic: Tanks reduce incoming damage by 40%
      if (enemy.variant === EnemyVariant.Tank) {
          damage *= 0.6; 
      }

      enemy.health -= damage;
      enemy.hitFlashTimer = 0.1; 
      projectile.hitEntityIds.push(enemy.id);
      
      // SYNERGY: BULLET T2 - Apply Vulnerability
      if (projectile.isVulnerabilityShot) {
          enemy.vulnerableTimer = 3.0; // 3 Seconds
          enemy.color = '#d946ef'; 
      }

      if (enemy.health <= 0) {
        this.handleEnemyDeath(state, enemy);
      }

      // Handle Destruction / Pierce / Ricochet
      if (projectile.piercesRemaining > 0) {
          projectile.piercesRemaining--;
          // Do NOT destroy, do NOT ricochet yet (usually piercing overrides ricochet until done)
      } else if (projectile.bouncesRemaining > 0) {
          this.handleRicochet(state, projectile, enemy);
          projectile.active = false; // "Converted" to particle/new proj logic in handleRicochet
      } else {
          projectile.active = false;
      }
    }

    // 3. Process Enemy Hits on Player (Collision)
    for (const hit of state.playerHitEvents) {
      const { player, enemy } = hit;

      if (!player.active || !enemy.active) continue;

      // IDENTITY: Phase Runner - Invulnerable Dash
      if (player.dashInvulnerable && player.isDashing) {
          continue; 
      }

      if (player.invulnerabilityTimer <= 0) {
        
        // --- SHIELD LOGIC ---
        // IDENTITY: Phase Runner - Shields Disabled check
        if (player.currentShields > 0 && !player.shieldsDisabled) {
            this.breakShield(state, player);
            
            // Retaliation: Thorns
            if (player.thornsDamage > 0) {
                enemy.health -= player.thornsDamage;
                enemy.hitFlashTimer = 0.1;
                if (enemy.health <= 0) this.handleEnemyDeath(state, enemy);
            }
            
            // Reactive Pulse
            if (player.reactivePulseOnHit) {
                this.triggerReactivePulse(state, player);
            }

            // Knockback Enemy
            const dx = enemy.position.x - player.position.x;
            const dy = enemy.position.y - player.position.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                const dir = { x: dx/dist, y: dy/dist };
                enemy.knockback.x += dir.x * 800;
                enemy.knockback.y += dir.y * 800;
            }
            continue; // Damage negated
        }

        // --- DODGE LOGIC ---
        if (this.attemptDodge(player)) {
            // Visual feedback?
            continue;
        }

        // HP Damage
        const rawDamage = enemy.damage;
        let mitigation = player.damageReduction || 0;
        
        // FORTRESS
        if (player.fortressTimer > 1.0) mitigation += 0.15; 

        const actualDamage = Math.max(1, rawDamage * (1 - mitigation));

        player.health -= actualDamage;
        player.invulnerabilityTimer = 0.35;
        player.hitFlashTimer = 0.2;
        
        // Reset Passive Regen
        if (player.synergyDefenseTier >= 2) player.shieldRegenTimer = 10.0;

        // Thorns
        if (player.thornsDamage > 0) {
            enemy.health -= player.thornsDamage;
            enemy.hitFlashTimer = 0.1;
            if (enemy.health <= 0) this.handleEnemyDeath(state, enemy);
        }
        
        // Reactive Pulse
        if (player.reactivePulseOnHit) {
            this.triggerReactivePulse(state, player);
        }

        // Bouncy Knockback Impulse
        const dx = enemy.position.x - player.position.x;
        const dy = enemy.position.y - player.position.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 0) {
            const dir = { x: dx/dist, y: dy/dist };
            const impulseStrength = 500;
            enemy.knockback.x += dir.x * impulseStrength;
            enemy.knockback.y += dir.y * impulseStrength;
        }
        
        if (player.health <= 0) {
          player.health = 0;
          player.active = false;
          state.isPlayerAlive = false;
        }
      }
    }
    
    // 4. Process Enemy Projectile Hits on Player
    for (const hit of state.playerProjectileCollisionEvents) {
        const { player, projectile } = hit;
        if (!player.active || !projectile.active) continue;

        // IDENTITY: Phase Runner - Invulnerable Dash
        if (player.dashInvulnerable && player.isDashing) {
            continue; 
        }

        if (player.invulnerabilityTimer <= 0) {
            
            // IDENTITY: Phase Runner - Shields Disabled check
            if (player.currentShields > 0 && !player.shieldsDisabled) {
                this.breakShield(state, player);
                projectile.active = false; 
                
                // Reactive Pulse
                if (player.reactivePulseOnHit) this.triggerReactivePulse(state, player);
                continue;
            }

            if (this.attemptDodge(player)) {
                projectile.active = false; // Dodged bullets still disappear? Or pass through? Usually disappear visually.
                continue;
            }

            const rawDamage = projectile.damage;
            let mitigation = player.damageReduction || 0;
            
            // FORTRESS
            if (player.fortressTimer > 1.0) mitigation += 0.15; 

            const actualDamage = Math.max(1, rawDamage * (1 - mitigation));

            player.health -= actualDamage;
            player.invulnerabilityTimer = 0.35;
            player.hitFlashTimer = 0.2;
            
            // Reset Passive Regen
            if (player.synergyDefenseTier >= 2) player.shieldRegenTimer = 10.0;
            
            // Reactive Pulse
            if (player.reactivePulseOnHit) this.triggerReactivePulse(state, player);

            projectile.active = false;

            if (player.health <= 0) {
                player.health = 0;
                player.active = false;
                state.isPlayerAlive = false;
            }
        }
    }
    
    // Check player death from hazard ticks
    if (player && player.health <= 0 && player.active) {
        player.health = 0;
        player.active = false;
        state.isPlayerAlive = false;
    }
  }

  private attemptDodge(player: PlayerEntity): boolean {
      // Synergy T5/9/Upgrade: Dodge Chance
      if (player.dodgeChance > 0) {
          if (Math.random() < player.dodgeChance) {
              // Dodged!
              return true;
          }
      }
      return false;
  }

  private triggerReactivePulse(state: GameState, player: PlayerEntity) {
      // Reuse Repulse Logic but smaller/weaker or scaled
      const PULSE_RADIUS = 200;
      const enemies = state.entityManager.getByType(EntityType.Enemy) as EnemyEntity[];
      
      for (const enemy of enemies) {
          const d = Vec2.dist(player.position, enemy.position);
          if (d < PULSE_RADIUS) {
              const dx = enemy.position.x - player.position.x;
              const dy = enemy.position.y - player.position.y;
              const mag = Math.sqrt(dx*dx + dy*dy);
              if (mag > 0) {
                  const force = 600 * (player.repulseForceMult || 1);
                  enemy.knockback.x += (dx/mag) * force;
                  enemy.knockback.y += (dy/mag) * force;
                  
                  // Damage?
                  const dmg = 10 * (player.repulseDamageMult || 1);
                  enemy.health -= dmg;
                  enemy.hitFlashTimer = 0.1;
                  if (enemy.health <= 0) this.handleEnemyDeath(state, enemy);
              }
          }
      }
  }

  private breakShield(state: GameState, player: PlayerEntity) {
      player.currentShields--;
      player.invulnerabilityTimer = 0.5;
      player.shieldPopTimer = 0.2; // TRIGGER POP VISUAL
      
      // SYNERGY: DEFENSE T2 - Reset passive regen on hit
      if (player.synergyDefenseTier >= 2) {
            player.shieldRegenTimer = 10.0;
      }
      
      // SYNERGY: DEFENSE T1 - Shield break emits knockback pulse
      if (player.synergyDefenseTier >= 1 && player.currentShields === 0) {
          this.triggerReactivePulse(state, player);
      }
  }

  private handleEnemyDeath(state: GameState, enemy: EnemyEntity) {
      enemy.active = false;
      state.score += enemy.value;
      
      // BOSS REWARDS
      if (enemy.variant === EnemyVariant.Boss) {
          state.score += 5000; // Big payout
          state.runMetaCurrency += 200;
          state.runMetaXP += 1000;
      } else {
          this.grantMetaRewards(state, enemy);
      }
      
      // SYNERGY: DEFENSE T5 - Heal on Kill
      if (state.player && state.player.synergyDefenseTier >= 5) {
          state.player.health = Math.min(state.player.maxHealth, state.player.health + 2);
      }

      // UPGRADE: SIPHON
      if (state.player && state.player.shieldSiphonChance > 0) {
          // Check shieldsDisabled
          if (state.player.currentShields < state.player.maxShields && !state.player.shieldsDisabled) {
              if (Math.random() < state.player.shieldSiphonChance) {
                  state.player.currentShields++;
              }
          }
      }
  }

  private grantMetaRewards(state: GameState, enemy: EnemyEntity) {
      // Base rewards
      let currency = 1;
      let xp = 5;

      if (enemy.variant === EnemyVariant.Fast) {
          currency = 2;
          xp = 8;
      } else if (enemy.variant === EnemyVariant.Tank) {
          currency = 3;
          xp = 15;
      } else if (enemy.variant === EnemyVariant.Shooter) {
          currency = 3;
          xp = 12;
      }

      // GATE: No currency before Wave 10. Small XP drip for morale.
      if (state.wave < 10) {
          currency = 0;
          xp = Math.ceil(xp * 0.2); // 20% XP drip
      }

      state.runMetaCurrency += currency;
      state.runMetaXP += xp;
  }

  private handleRicochet(state: GameState, projectile: ProjectileEntity, hitEnemy: EnemyEntity) {
      let currentSource = hitEnemy;
      let currentDamage = projectile.damage;
      let bounces = projectile.bouncesRemaining;
      
      const hitIds = [...projectile.hitEntityIds, hitEnemy.id];

      while (bounces > 0) {
          const candidates = state.entityManager.getByType(EntityType.Enemy) as EnemyEntity[];
          let closest: EnemyEntity | null = null;
          let minDst = Infinity;
          
          const maxDist = projectile.ricochetSearchRadius || 200; 

          for (const cand of candidates) {
              if (!cand.active || hitIds.includes(cand.id)) continue;
              
              if (cand.position.x < 0 || cand.position.x > state.worldWidth || 
                  cand.position.y < 0 || cand.position.y > state.worldHeight) {
                  continue;
              }

              const d = Vec2.dist(currentSource.position, cand.position);
              
              if (d > maxDist) continue;

              if (d < minDst) {
                  minDst = d;
                  closest = cand;
              }
          }

          if (!closest) break;

          const decayFactor = 0.8;
          currentDamage = Math.ceil(currentDamage * decayFactor);
          
          let appliedDamage = currentDamage;
          if (closest.variant === EnemyVariant.Tank) {
              appliedDamage *= 0.6;
          }
          closest.health -= appliedDamage;
          closest.hitFlashTimer = 0.1;

          const particle: ParticleEntity = {
              id: `part_rico_${Date.now()}_${Math.random()}`,
              type: EntityType.Particle,
              style: 'ricochet_trail',
              position: { ...currentSource.position }, 
              velocity: { x: 0, y: 0 },
              radius: 0,
              rotation: 0,
              color: Colors.Projectile,
              active: true,
              from: { ...currentSource.position },
              to: { ...closest.position },
              lifetime: 0.15, 
              maxLifetime: 0.15,
              width: 2 
          };
          state.entityManager.add(particle);

          if (closest.health <= 0) {
              this.handleEnemyDeath(state, closest);
          }

          hitIds.push(closest.id);
          currentSource = closest;
          
          // Next iteration
          bounces--;
      }
  }
}