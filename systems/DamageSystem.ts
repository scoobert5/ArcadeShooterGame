import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType, EnemyEntity, EnemyVariant, ProjectileEntity, ParticleEntity } from '../entities/types';
import { Vec2 } from '../utils/math';
import { Colors } from '../utils/constants';

export class DamageSystem implements System {
  update(dt: number, state: GameState) {
    // 1. Process Projectile Hits on Enemies
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
      
      // Trigger visual flash
      enemy.hitFlashTimer = 0.1; // 100ms flash
      
      // Handle Ricochet Logic BEFORE destroying projectile state
      if (projectile.bouncesRemaining > 0) {
          this.handleRicochet(state, projectile, enemy);
      }

      // Projectile is destroyed on impact
      projectile.active = false;

      // Check Death
      if (enemy.health <= 0) {
        enemy.active = false;
        state.score += enemy.value;
      }
    }

    // 2. Process Enemy Hits on Player
    for (const hit of state.playerHitEvents) {
      const { player, enemy } = hit;

      if (!player.active || !enemy.active) continue;

      // Only take damage if invulnerability timer is 0
      if (player.invulnerabilityTimer <= 0) {
        // Calculate Actual Damage (Raw Damage * (1 - Reduction))
        const rawDamage = enemy.damage;
        const mitigation = player.damageReduction || 0;
        const actualDamage = Math.max(1, rawDamage * (1 - mitigation));

        player.health -= actualDamage;
        
        // Grant temporary invulnerability (adjusted to 0.35s for fairness)
        player.invulnerabilityTimer = 0.35;
        
        // Trigger visual flash/screen shake effect
        player.hitFlashTimer = 0.2;

        // --- Bouncy Knockback Impulse ---
        // Apply a strong velocity impulse to the enemy's knockback vector
        const dx = enemy.position.x - player.position.x;
        const dy = enemy.position.y - player.position.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 0) {
            const dir = { x: dx/dist, y: dy/dist };
            const impulseStrength = 500; // Strong instantaneous push
            
            // Add to existing knockback to handle multiple hits gracefully
            enemy.knockback.x += dir.x * impulseStrength;
            enemy.knockback.y += dir.y * impulseStrength;
        }
        
        // Check Player Death
        if (player.health <= 0) {
          player.health = 0;
          player.active = false;
          state.isPlayerAlive = false;
        }
      }
    }
  }

  private handleRicochet(state: GameState, projectile: ProjectileEntity, hitEnemy: EnemyEntity) {
      let currentSource = hitEnemy;
      let currentDamage = projectile.damage;
      let bounces = projectile.bouncesRemaining;
      
      // Initialize hit history with the enemy we just hit
      const hitIds = [...projectile.hitEntityIds, hitEnemy.id];

      // Instant Chain Loop
      while (bounces > 0) {
          // Find nearest valid target
          const candidates = state.entityManager.getByType(EntityType.Enemy) as EnemyEntity[];
          let closest: EnemyEntity | null = null;
          let minDst = Infinity;

          for (const cand of candidates) {
              // Conditions:
              // 1. Must be active (alive)
              // 2. Must NOT have been hit by this chain already (avoids A->B->A loops)
              if (!cand.active || hitIds.includes(cand.id)) continue;

              const d = Vec2.dist(currentSource.position, cand.position);
              if (d < minDst) {
                  minDst = d;
                  closest = cand;
              }
          }

          // If no valid target found, stop chaining
          if (!closest) break;

          // --- Process the Chain Hit ---
          
          // 1. Calculate Decay Damage
          const decayFactor = 0.8;
          currentDamage = Math.ceil(currentDamage * decayFactor);
          
          // 2. Apply Damage
          let appliedDamage = currentDamage;
          if (closest.variant === EnemyVariant.Tank) {
              appliedDamage *= 0.6;
          }
          closest.health -= appliedDamage;
          closest.hitFlashTimer = 0.1;

          // 3. Create Visual Trail (Particle)
          const particle: ParticleEntity = {
              id: `part_rico_${Date.now()}_${Math.random()}`,
              type: EntityType.Particle,
              style: 'ricochet_trail',
              position: { ...currentSource.position }, // Satisfy BaseEntity interface
              velocity: { x: 0, y: 0 },
              radius: 0,
              rotation: 0,
              color: Colors.Projectile,
              active: true,
              from: { ...currentSource.position },
              to: { ...closest.position },
              lifetime: 0.25, // 250ms fade
              maxLifetime: 0.25,
              width: 3 // Slightly thicker for visibility
          };
          state.entityManager.add(particle);

          // 4. Check Death
          if (closest.health <= 0) {
              closest.active = false;
              state.score += closest.value;
          }

          // 5. Prepare for Next Loop
          hitIds.push(closest.id);
          currentSource = closest;
          bounces--;
      }
  }
}