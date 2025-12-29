import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType, EnemyEntity, EnemyVariant, ProjectileEntity, ParticleEntity, HazardEntity } from '../entities/types';
import { Vec2 } from '../utils/math';
import { Colors } from '../utils/constants';

export class DamageSystem implements System {
  update(dt: number, state: GameState) {
    const player = state.player;

    // 0. Update Shield Pop Timer
    if (player && player.shieldPopTimer > 0) {
        player.shieldPopTimer -= dt;
    }

    // 1. Update Hazards (Damage & Lifetime)
    const hazards = state.entityManager.getByType(EntityType.Hazard) as HazardEntity[];
    const enemies = state.entityManager.getByType(EntityType.Enemy) as EnemyEntity[];

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
                            enemy.active = false;
                            state.score += enemy.value;
                        }
                    }
                }
                hazard.tickTimer = 0.1; // Reset tick
            }
        } else {
             // Enemy Hazard -> Hurts Player
             if (player && player.active) {
                let dist = 0;
                if (hazard.style === 'line' && hazard.from && hazard.to) {
                    dist = Vec2.distToSegment(player.position, hazard.from, hazard.to);
                } else {
                    dist = Vec2.dist(hazard.position, player.position);
                }

                if (dist < hazard.radius + player.radius) {
                    if (hazard.tickTimer <= 0) {
                        // Hazard damage logic
                         if (player.currentShields > 0) {
                             player.currentShields--;
                             player.invulnerabilityTimer = 0.5;
                             player.shieldPopTimer = 0.2; // Visual pop
                         } else if (player.invulnerabilityTimer <= 0) {
                             const damage = hazard.damage;
                             const mitigation = player.damageReduction || 0;
                             const actualDamage = Math.max(1, damage * (1 - mitigation));
                             
                             player.health -= actualDamage;
                             player.hitFlashTimer = 0.1;
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

      // Apply Damage
      let damage = projectile.damage;

      // Tank Armor Logic: Tanks reduce incoming damage by 40%
      if (enemy.variant === EnemyVariant.Tank) {
          damage *= 0.6; 
      }

      enemy.health -= damage;
      enemy.hitFlashTimer = 0.1; 
      
      if (projectile.bouncesRemaining > 0) {
          this.handleRicochet(state, projectile, enemy);
      }

      projectile.active = false;

      if (enemy.health <= 0) {
        enemy.active = false;
        state.score += enemy.value;
      }
    }

    // 3. Process Enemy Hits on Player (Collision)
    for (const hit of state.playerHitEvents) {
      const { player, enemy } = hit;

      if (!player.active || !enemy.active) continue;

      if (player.invulnerabilityTimer <= 0) {
        
        // --- SHIELD LOGIC ---
        // Even though CollisionSystem handles physics, we handle the "Game Rules" of the hit here.
        if (player.currentShields > 0) {
            player.currentShields--;
            player.invulnerabilityTimer = 0.5; 
            player.shieldPopTimer = 0.2; // TRIGGER POP VISUAL
            
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

        // HP Damage
        const rawDamage = enemy.damage;
        const mitigation = player.damageReduction || 0;
        const actualDamage = Math.max(1, rawDamage * (1 - mitigation));

        player.health -= actualDamage;
        player.invulnerabilityTimer = 0.35;
        player.hitFlashTimer = 0.2;

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

        if (player.invulnerabilityTimer <= 0) {
            
            if (player.currentShields > 0) {
                player.currentShields--;
                player.invulnerabilityTimer = 0.5;
                player.shieldPopTimer = 0.2; // TRIGGER POP VISUAL
                projectile.active = false; 
                continue;
            }

            const rawDamage = projectile.damage;
            const mitigation = player.damageReduction || 0;
            const actualDamage = Math.max(1, rawDamage * (1 - mitigation));

            player.health -= actualDamage;
            player.invulnerabilityTimer = 0.35;
            player.hitFlashTimer = 0.2;
            
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
              closest.active = false;
              state.score += closest.value;
          }

          hitIds.push(closest.id);
          currentSource = closest;
          bounces--;
      }
  }
}