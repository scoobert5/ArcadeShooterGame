import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType, EnemyEntity, ProjectileEntity } from '../entities/types';
import { Vec2 } from '../utils/math';

export class CollisionSystem implements System {
  update(dt: number, state: GameState) {
    // Reset hits for this frame to ensure we only process fresh collisions
    state.hitEvents = [];
    state.playerHitEvents = [];

    const enemies = state.entityManager.getByType(EntityType.Enemy) as EnemyEntity[];
    const projectiles = state.entityManager.getByType(EntityType.Projectile) as ProjectileEntity[];
    const player = state.player;

    // 1. Enemy-Enemy Separation (Prevent Stacking)
    // We iterate through pairs to ensure enemies don't clump into a single point.
    for (let i = 0; i < enemies.length; i++) {
      const a = enemies[i];
      if (!a.active) continue;

      for (let j = i + 1; j < enemies.length; j++) {
        const b = enemies[j];
        if (!b.active) continue;

        const dist = Vec2.dist(a.position, b.position);
        const minDist = a.radius + b.radius;

        // If overlapping
        if (dist < minDist) {
          const overlap = minDist - dist;
          
          // Calculate direction from B to A
          let dir = Vec2.sub(a.position, b.position);
          
          // Handle case where they are on exact same pixel
          if (dist === 0) {
            // Deterministic scatter direction
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
    // If an enemy touches the player, push the enemy away and record a hit.
    if (player && player.active) {
      for (const enemy of enemies) {
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

    // 3. Projectile-Enemy Detection
    for (const proj of projectiles) {
      if (!proj.active) continue;

      for (const enemy of enemies) {
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