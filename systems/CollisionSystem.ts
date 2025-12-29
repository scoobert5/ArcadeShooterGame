import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType, EnemyEntity, ProjectileEntity } from '../entities/types';
import { Vec2 } from '../utils/math';

export class CollisionSystem implements System {
  update(dt: number, state: GameState) {
    // Reset hits for this frame to ensure we only process fresh collisions
    state.hitEvents = [];
    state.playerHitEvents = [];
    state.playerProjectileCollisionEvents = [];

    const enemies = state.entityManager.getByType(EntityType.Enemy) as EnemyEntity[];
    const projectiles = state.entityManager.getByType(EntityType.Projectile) as ProjectileEntity[];
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
    // Optimized: Only check against neighbors in grid, instead of all other enemies.
    for (const a of enemies) {
      if (!a.active) continue;

      // Broadphase Query
      const candidates = state.spatialHash.query(a.position.x, a.position.y, a.radius * 2);

      for (const entity of candidates) {
        // Safe cast, grid currently only contains enemies based on insertion above
        const b = entity as EnemyEntity;
        
        // Strict ID check ensures we don't check self, and (id < id) avoids double checking pairs (A-B and B-A)
        // Note: For separation, we usually want to process both directions unless logic is symmetric.
        // Here logic IS symmetric (both get pushed), so we can skip one direction.
        if (a === b || !b.active || a.id >= b.id) continue;

        const dist = Vec2.dist(a.position, b.position);
        const minDist = a.radius + b.radius;

        // If overlapping
        if (dist < minDist) {
          const overlap = minDist - dist;
          
          // Calculate direction from B to A
          let dir = Vec2.sub(a.position, b.position);
          
          // Handle case where they are on exact same pixel
          if (dist === 0) {
            dir = { x: 1, y: 0 };
          }

          const norm = Vec2.normalize(dir);
          const separation = Vec2.scale(norm, overlap * 0.5); // Split the move 50/50

          // Push apart
          a.position = Vec2.add(a.position, separation);
          b.position = Vec2.sub(b.position, separation);
        }
      }
    }

    // 2. Player-Enemy Separation & Damage Detection
    // Optimized: Query grid around player
    if (player && player.active) {
      const candidates = state.spatialHash.query(player.position.x, player.position.y, player.radius + 40); // +Max enemy radius margin
      
      for (const entity of candidates) {
        const enemy = entity as EnemyEntity;
        if (!enemy.active) continue;

        const dist = Vec2.dist(player.position, enemy.position);
        const minDist = player.radius + enemy.radius;

        if (dist < minDist) {
          const overlap = minDist - dist;
          
          // Direction from Player to Enemy
          let dir = Vec2.sub(enemy.position, player.position);
          
          if (dist === 0) {
            dir = { x: 1, y: 0 };
          }

          const norm = Vec2.normalize(dir);
          const separation = Vec2.scale(norm, overlap);

          // Push Enemy entirely (Player position is strictly controlled by inputs)
          enemy.position = Vec2.add(enemy.position, separation);

          // Register Player Hit
          state.playerHitEvents.push({
            player: player,
            enemy: enemy
          });
        }
      }
    }

    // 3. Projectile Collision Detection
    // Loop through all projectiles
    for (const proj of projectiles) {
      if (!proj.active) continue;

      if (proj.isEnemyProjectile) {
          // --- Enemy Projectile vs Player ---
          if (player && player.active) {
              const dist = Vec2.dist(proj.position, player.position);
              const hitDist = proj.radius + player.radius;
              
              if (dist < hitDist) {
                  state.playerProjectileCollisionEvents.push({
                      player: player,
                      projectile: proj
                  });
              }
          }
      } else {
          // --- Player Projectile vs Enemy ---
          const candidates = state.spatialHash.query(proj.position.x, proj.position.y, proj.radius + 40);

          for (const entity of candidates) {
            const enemy = entity as EnemyEntity;
            if (!enemy.active) continue;

            const dist = Vec2.dist(proj.position, enemy.position);
            const hitDist = proj.radius + enemy.radius;

            if (dist < hitDist) {
              // Record the hit to be processed by DamageSystem
              state.hitEvents.push({
                projectile: proj,
                enemy: enemy
              });
            }
          }
      }
    }
  }
}