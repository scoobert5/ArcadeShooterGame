import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType, EnemyEntity, EnemyVariant, ProjectileEntity } from '../entities/types';
import { Vec2 } from '../utils/math';
import { PROJECTILE_SPEED, PROJECTILE_LIFETIME, Colors } from '../utils/constants';

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

      // Projectile is destroyed on impact (the ricochet creates a NEW projectile)
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
      const candidates = state.entityManager.getByType(EntityType.Enemy) as EnemyEntity[];
      let closest: EnemyEntity | null = null;
      let minDst = 300; // Search Radius

      for (const cand of candidates) {
          // Conditions:
          // 1. Must be active
          // 2. Must NOT be the enemy we just hit
          // 3. Must NOT have been hit by this projectile chain before (strict chaining)
          if (
              !cand.active || 
              cand === hitEnemy || 
              projectile.hitEntityIds.includes(cand.id)
          ) continue;

          const d = Vec2.dist(hitEnemy.position, cand.position);
          if (d < minDst) {
              minDst = d;
              closest = cand;
          }
      }

      if (closest) {
          // Create the bounce projectile
          const dir = Vec2.normalize(Vec2.sub(closest.position, hitEnemy.position));
          const angle = Math.atan2(dir.y, dir.x);
          
          // Damage Decay: 20% reduction per bounce
          const decayFactor = 0.8;

          const bounceProj: ProjectileEntity = {
              id: `proj_bounce_${Date.now()}_${Math.random()}`,
              type: EntityType.Projectile,
              position: { x: hitEnemy.position.x, y: hitEnemy.position.y }, // Start from hit location
              velocity: Vec2.scale(dir, PROJECTILE_SPEED),
              radius: projectile.radius,
              rotation: angle,
              color: Colors.Projectile,
              active: true,
              damage: Math.ceil(projectile.damage * decayFactor), // Apply decay
              lifetime: PROJECTILE_LIFETIME, // Reset lifetime for the new leg
              ownerId: projectile.ownerId,
              bouncesRemaining: projectile.bouncesRemaining - 1,
              // Propagate the history
              hitEntityIds: [...projectile.hitEntityIds, hitEnemy.id] 
          };
          
          state.entityManager.add(bounceProj);
      }
  }
}