
import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType, EnemyEntity, EnemyVariant, ProjectileEntity, HazardEntity, PlayerEntity } from '../entities/types';
import { Vec2, Vector2 } from '../utils/math';
import { Colors, VFX_IMPACT_COOLDOWN, VFX_LOD_PROJECTILE_THRESHOLD, VFX_BUDGET_DEATHS_PER_SEC } from '../utils/constants';

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
                        enemy.wobble = 0.3; // Small shake
                        
                        this.spawnDamageNumber(state, enemy.position, hazard.damage, false);
                        
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
                    continue; 
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
                                 
                                 state.addShake(5);
                                 
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

      if (!projectile.active || !enemy.active) continue;
      
      // If piercing, check if we already hit this enemy
      if (projectile.hitEntityIds.includes(enemy.id)) continue;

      // Apply Damage
      let damage = projectile.damage;
      let isCrit = false;

      // SYNERGY: BULLET T3 - Ricochet Damage Bonus
      if (projectile.isRicochet && player && player.synergyBulletTier >= 3) {
          damage *= 1.5; 
      }

      // SYNERGY: VULNERABILITY (Incoming Damage Amp)
      if (enemy.vulnerableTimer && enemy.vulnerableTimer > 0) {
          const mult = (player && player.synergyBulletTier >= 8) ? 1.6 : 1.3;
          damage *= mult;
      }
      
      // BOSS VULNERABILITY CYCLE
      if (enemy.variant === EnemyVariant.Boss && enemy.bossVulnIsActive) {
          damage *= 2.0; 
          isCrit = true;
      }
      
      // SYNERGY: BULLET T7 - Crit Damage
      if (player && player.synergyBulletTier >= 7) {
          damage *= 2.0;
          isCrit = true;
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
              isCrit = true;
          }
      }

      // UPGRADE: FOCUS FIRE
      if (player && player.focusFireStacks > 0) {
          if (player.focusFireTarget === enemy.id) {
              damage += player.focusFireStacks * 5; 
          } else {
              player.focusFireTarget = enemy.id; 
          }
      }

      // Tank Armor Logic
      if (enemy.variant === EnemyVariant.Tank) {
          damage *= 0.6; 
      }

      const finalDamage = Math.ceil(damage);
      enemy.health -= finalDamage;
      enemy.hitFlashTimer = 0.1; 
      // Physics impulse handled in collision mostly, but let's add wobble
      enemy.wobble = Math.min(0.8, enemy.wobble + 0.4); 
      projectile.hitEntityIds.push(enemy.id);
      
      // Spawn Juice
      this.spawnDamageNumber(state, enemy.position, finalDamage, isCrit);
      
      // Hit Throttling for Particles
      this.spawnImpactParticles(state, enemy, projectile.position, enemy.color);
      
      // Hitstop for Heavy Hits
      if (finalDamage > 50 || isCrit) {
          state.hitStopTimer = 0.05; 
          state.addShake(2);
      }
      
      // SYNERGY: BULLET T2 - Apply Vulnerability
      if (projectile.isVulnerabilityShot) {
          enemy.vulnerableTimer = 3.0; 
          enemy.color = '#d946ef'; 
      }

      if (enemy.health <= 0) {
        this.handleEnemyDeath(state, enemy);
      }

      // Handle Destruction / Pierce / Ricochet
      if (projectile.piercesRemaining > 0) {
          projectile.piercesRemaining--;
      } else if (projectile.bouncesRemaining > 0) {
          this.handleRicochet(state, projectile, enemy);
          projectile.active = false; 
      } else {
          projectile.active = false;
      }
    }

    // 3. Process Enemy Hits on Player (Collision)
    for (const hit of state.playerHitEvents) {
      const { player, enemy } = hit;

      if (!player.active || !enemy.active) continue;

      if (player.dashInvulnerable && player.isDashing) {
          continue; 
      }

      if (player.invulnerabilityTimer <= 0) {
        
        // IDENTITY: Phase Runner
        if (player.currentShields > 0 && !player.shieldsDisabled) {
            this.breakShield(state, player);
            
            // Retaliation: Thorns
            if (player.thornsDamage > 0) {
                enemy.health -= player.thornsDamage;
                enemy.hitFlashTimer = 0.1;
                this.spawnDamageNumber(state, enemy.position, player.thornsDamage, false);
                if (enemy.health <= 0) this.handleEnemyDeath(state, enemy);
            }
            
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
            continue; 
        }

        if (this.attemptDodge(player)) {
            continue;
        }

        // HP Damage
        const rawDamage = enemy.damage;
        let mitigation = player.damageReduction || 0;
        
        if (player.fortressTimer > 1.0) mitigation += 0.15; 

        const actualDamage = Math.max(1, rawDamage * (1 - mitigation));

        player.health -= actualDamage;
        player.invulnerabilityTimer = 0.35;
        player.hitFlashTimer = 0.2;
        
        state.addShake(10);
        
        // Reset Passive Regen
        if (player.synergyDefenseTier >= 2) player.shieldRegenTimer = 10.0;

        // Thorns
        if (player.thornsDamage > 0) {
            enemy.health -= player.thornsDamage;
            enemy.hitFlashTimer = 0.1;
            this.spawnDamageNumber(state, enemy.position, player.thornsDamage, false);
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

        if (player.dashInvulnerable && player.isDashing) {
            continue; 
        }

        if (player.invulnerabilityTimer <= 0) {
            
            if (player.currentShields > 0 && !player.shieldsDisabled) {
                this.breakShield(state, player);
                projectile.active = false; 
                this.spawnImpactParticles(state, enemyProjectileMock(projectile), projectile.position, Colors.Shield); // Mocking enemy entity for generic spawn function if needed, or overloading
                
                if (player.reactivePulseOnHit) this.triggerReactivePulse(state, player);
                continue;
            }

            if (this.attemptDodge(player)) {
                projectile.active = false; 
                continue;
            }

            const rawDamage = projectile.damage;
            let mitigation = player.damageReduction || 0;
            
            if (player.fortressTimer > 1.0) mitigation += 0.15; 

            const actualDamage = Math.max(1, rawDamage * (1 - mitigation));

            player.health -= actualDamage;
            player.invulnerabilityTimer = 0.35;
            player.hitFlashTimer = 0.2;
            
            state.addShake(8);
            
            if (player.synergyDefenseTier >= 2) player.shieldRegenTimer = 10.0;
            if (player.reactivePulseOnHit) this.triggerReactivePulse(state, player);

            projectile.active = false;
            this.spawnImpactParticles(state, null, projectile.position, Colors.Player);

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
      if (player.dodgeChance > 0) {
          if (Math.random() < player.dodgeChance) {
              return true;
          }
      }
      return false;
  }

  private triggerReactivePulse(state: GameState, player: PlayerEntity) {
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
                  
                  const dmg = 10 * (player.repulseDamageMult || 1);
                  enemy.health -= dmg;
                  enemy.hitFlashTimer = 0.1;
                  enemy.wobble = 0.5;
                  if (enemy.health <= 0) this.handleEnemyDeath(state, enemy);
              }
          }
      }
  }

  private breakShield(state: GameState, player: PlayerEntity) {
      player.currentShields--;
      player.invulnerabilityTimer = 0.5;
      player.shieldPopTimer = 0.2; 
      state.addShake(5);
      
      if (player.synergyDefenseTier >= 2) {
            player.shieldRegenTimer = 10.0;
      }
      
      if (player.synergyDefenseTier >= 1 && player.currentShields === 0) {
          this.triggerReactivePulse(state, player);
      }
  }

  private handleEnemyDeath(state: GameState, enemy: EnemyEntity) {
      enemy.active = false;
      state.score += enemy.value;
      
      // Visuals: Explosion with LOD
      // Check budget
      if (state.vfxState.deathBurstsThisSecond < VFX_BUDGET_DEATHS_PER_SEC) {
          state.vfxState.deathBurstsThisSecond++;
          this.spawnExplosion(state, enemy.position, enemy.radius * 2, enemy.color, true);
      } else {
          // Minimal fallback
          this.spawnExplosion(state, enemy.position, enemy.radius * 2, enemy.color, false);
      }

      // BOSS REWARDS
      if (enemy.variant === EnemyVariant.Boss) {
          state.score += 5000; 
          state.runMetaCurrency += 200;
          state.runMetaXP += 1000;
          state.addShake(20);
      } else {
          this.grantMetaRewards(state, enemy);
      }
      
      if (state.player && state.player.synergyDefenseTier >= 5) {
          state.player.health = Math.min(state.player.maxHealth, state.player.health + 2);
      }

      if (state.player && state.player.shieldSiphonChance > 0) {
          if (state.player.currentShields < state.player.maxShields && !state.player.shieldsDisabled) {
              if (Math.random() < state.player.shieldSiphonChance) {
                  state.player.currentShields++;
              }
          }
      }
  }

  private grantMetaRewards(state: GameState, enemy: EnemyEntity) {
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

      if (state.wave < 10) {
          currency = 0;
          xp = Math.ceil(xp * 0.2); 
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
          closest.wobble = 0.3;
          
          this.spawnDamageNumber(state, closest.position, appliedDamage, false);
          this.spawnImpactParticles(state, closest, closest.position, closest.color);

          // Ricochet Trail needs to be prominent, so we always spawn it but maybe thinner
          state.spawnParticle({
              style: 'ricochet_trail',
              position: { x: currentSource.position.x, y: currentSource.position.y },
              color: Colors.Projectile,
              lifetime: 0.15,
              width: 2,
              from: { x: currentSource.position.x, y: currentSource.position.y },
              to: { x: closest.position.x, y: closest.position.y }
          });

          if (closest.health <= 0) {
              this.handleEnemyDeath(state, closest);
          }

          hitIds.push(closest.id);
          currentSource = closest;
          
          bounces--;
      }
  }

  private spawnDamageNumber(state: GameState, pos: Vector2, amount: number, isCrit: boolean) {
      state.damageNumbers.push({
          id: `dmg_${Date.now()}_${Math.random()}`,
          value: amount,
          position: { ...pos },
          velocity: { x: (Math.random() - 0.5) * 50, y: -80 - Math.random() * 50 },
          life: 0.8,
          maxLife: 0.8,
          color: isCrit ? '#fbbf24' : '#fff',
          scale: isCrit ? 1.5 : 1.0,
          isCritical: isCrit
      });
  }

  private spawnImpactParticles(state: GameState, enemy: EnemyEntity | null, pos: Vector2, color: string) {
      // 1. Throttling per Enemy
      if (enemy) {
          const now = state.gameTime;
          const last = enemy.lastImpactTime || 0;
          if (now - last < VFX_IMPACT_COOLDOWN) {
              return; // Skip impact effect
          }
          enemy.lastImpactTime = now;
      }

      // 2. Projectile Load LOD
      // If tons of projectiles are flying, reduce impact count drastically
      const isHighLoad = state.activePlayerProjectileCount > VFX_LOD_PROJECTILE_THRESHOLD;
      
      // In high load, only 20% chance to spawn an impact spark at all if not throttled
      if (isHighLoad) {
          if (Math.random() > 0.2) return;
      }

      // 3. Spawn Count
      const count = isHighLoad ? 1 : 3; 

      for(let i=0; i<count; i++) {
          const speed = 100 + Math.random() * 100;
          const angle = Math.random() * Math.PI * 2;
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          
          state.spawnParticle({
              style: 'spark',
              position: { x: pos.x, y: pos.y },
              velocity: { x: vx, y: vy },
              color: color,
              lifetime: 0.2 + Math.random() * 0.2,
              radius: isHighLoad ? 1.5 : 2 + Math.random(),
              width: 0
          });
      }
  }

  private spawnExplosion(state: GameState, pos: Vector2, size: number, color: string, fullDetail: boolean) {
      // Main Expanding Circle
      state.spawnParticle({
          style: 'explosion',
          position: { x: pos.x, y: pos.y },
          color: color,
          lifetime: 0.4,
          width: size 
      });

      if (!fullDetail) return;

      // Debris (Only for full detail)
      for(let i=0; i<6; i++) {
          const speed = 50 + Math.random() * 150;
          const angle = Math.random() * Math.PI * 2;
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          
          state.spawnParticle({
              style: 'spark', // Debris style
              position: { x: pos.x, y: pos.y },
              velocity: { x: vx, y: vy },
              color: color,
              lifetime: 0.4 + Math.random() * 0.3,
              radius: 3 + Math.random() * 2,
              width: 0
          });
      }
  }
}

// Helper mock for type safety if needed when enemy is null
function enemyProjectileMock(p: ProjectileEntity): any { return null; }
