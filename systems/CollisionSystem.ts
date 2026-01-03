
import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType, EnemyEntity, ProjectileEntity, GameEntity } from '../entities/types';
import { Vec2 } from '../utils/math';

export class CollisionSystem implements System {
  // Reusable array for queries to avoid allocation per entity per frame
  private queryResults: GameEntity[] = [];

  update(dt: number, state: GameState) {
    // Reset hits for this frame to ensure we only process fresh collisions
    // Optimized: Reset array length instead of allocating new array
    state.hitEvents.length = 0;
    state.playerHitEvents.length = 0;
    state.playerProjectileCollisionEvents.length = 0;

    const enemies = state.entityManager.getByType(EntityType.Enemy) as EnemyEntity[];
    const enemyProjectiles = state.entityManager.getByType(EntityType.Projectile) as ProjectileEntity[];
    const player = state.player;

    // --- BROADPHASE START ---
    // 0. Rebuild Spatial Grid
    state.spatialHash.clear();
    for (const enemy of enemies) {
        if (enemy.active) {
            state.spatialHash.insert(enemy);
        }
    }
    // --- BROADPHASE END ---

    // 1. Enemy-Enemy Separation (Prevent Stacking)
    for (const a of enemies) {
      if (!a.active) continue;

      this.queryResults.length = 0;
      state.spatialHash.query(a.position.x, a.position.y, a.radius * 2, this.queryResults);

      for (const entity of this.queryResults) {
        const b = entity as EnemyEntity;
        
        // Ensure we only separate specific enemy-enemy pairs once and avoid self-check
        // Using ID string comparison is safe but slower than unique integer IDs,
        // but for now strict ID inequality handles self.
        // To avoid double processing (A vs B, then B vs A), we can check ID order.
        if (a === b || !b.active || a.id >= b.id) continue;

        const distSq = Vec2.distSq(a.position, b.position);
        const minDist = a.radius + b.radius;
        const minDistSq = minDist * minDist;

        if (distSq < minDistSq) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;
          
          let dir = Vec2.sub(a.position, b.position);
          if (dist === 0) dir = { x: 1, y: 0 };

          const norm = Vec2.normalize(dir);
          const separation = Vec2.scale(norm, overlap * 0.5);

          a.position = Vec2.add(a.position, separation);
          b.position = Vec2.sub(b.position, separation);
        }
      }
    }

    // 2. Player-Enemy Separation & Damage Detection
    if (player && player.active) {
      // Determine effective collision radius (Shield or Body)
      const isShieldActive = player.currentShields > 0;
      const effectivePlayerRadius = isShieldActive ? player.radius + 24 : player.radius; // Matches visual shield radius
      const queryRadius = effectivePlayerRadius + 40;

      this.queryResults.length = 0;
      state.spatialHash.query(player.position.x, player.position.y, queryRadius, this.queryResults);
      
      for (const entity of this.queryResults) {
        const enemy = entity as EnemyEntity;
        if (!enemy.active) continue;

        const distSq = Vec2.distSq(player.position, enemy.position);
        const minDist = effectivePlayerRadius + enemy.radius;
        const minDistSq = minDist * minDist;

        if (distSq < minDistSq) {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;
          
          let dir = Vec2.sub(enemy.position, player.position);
          if (dist === 0) dir = { x: 1, y: 0 };

          const norm = Vec2.normalize(dir);
          const separation = Vec2.scale(norm, overlap);

          // Push Enemy entirely
          enemy.position = Vec2.add(enemy.position, separation);

          // Register Player Hit
          state.playerHitEvents.push({
            player: player,
            enemy: enemy
          });
        }
      }
    }

    // 3. Enemy Projectile Collision Detection (vs Player)
    for (const proj of enemyProjectiles) {
      if (!proj.active) continue;
      if (player && player.active) {
          const isShieldActive = player.currentShields > 0;
          const effectivePlayerRadius = isShieldActive ? player.radius + 24 : player.radius;

          const distSq = Vec2.distSq(proj.position, player.position);
          const hitDist = proj.radius + effectivePlayerRadius;
          const hitDistSq = hitDist * hitDist;
          
          if (distSq < hitDistSq) {
              state.playerProjectileCollisionEvents.push({
                  player: player,
                  projectile: proj
              });
          }
      }
    }

    // 4. Player Projectile Collision Detection (vs Enemies)
    // Optimize: Iterate Pool
    const pool = state.playerProjectilePool;
    for (let i = 0; i < pool.length; i++) {
        const proj = pool[i];
        if (!proj.active) continue;

        // Reuse results array for this projectile
        this.queryResults.length = 0;
        state.spatialHash.query(proj.position.x, proj.position.y, proj.radius + 40, this.queryResults);

        for (const entity of this.queryResults) {
            const enemy = entity as EnemyEntity;
            if (!enemy.active) continue;

            const distSq = Vec2.distSq(proj.position, enemy.position);
            const hitDist = proj.radius + enemy.radius;
            const hitDistSq = hitDist * hitDist;

            if (distSq < hitDistSq) {
                state.hitEvents.push({
                    projectile: proj,
                    enemy: enemy
                });
            }
        }
    }
  }
}
