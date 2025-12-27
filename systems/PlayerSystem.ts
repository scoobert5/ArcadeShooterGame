import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { InputState } from '../core/InputManager';
import { Vec2 } from '../utils/math';
import { EntityType, EnemyEntity, EnemyVariant } from '../entities/types';

export class PlayerSystem implements System {
  update(dt: number, state: GameState, input: InputState) {
    const player = state.player;
    if (!player) return;

    // 0. Update Timers
    if (player.invulnerabilityTimer > 0) {
      player.invulnerabilityTimer -= dt;
    }
    if (player.hitFlashTimer && player.hitFlashTimer > 0) {
      player.hitFlashTimer -= dt;
    }
    if (player.repulseCooldown > 0) {
        player.repulseCooldown -= dt;
    }
    if (player.repulseVisualTimer > 0) {
        player.repulseVisualTimer -= dt;
    }

    // Reload Timer Logic
    if (player.isReloading) {
        player.reloadTimer -= dt;
        if (player.reloadTimer <= 0) {
            player.reloadTimer = 0;
            player.isReloading = false;
            player.currentAmmo = player.maxAmmo;
        }
    } else {
        // Check for Manual Reload Input
        if (input.reload && player.currentAmmo < player.maxAmmo) {
            player.isReloading = true;
            player.reloadTimer = player.maxReloadTime;
        }
    }

    // 1. Movement Logic
    const direction = { x: 0, y: 0 };
    if (input.up) direction.y -= 1;
    if (input.down) direction.y += 1;
    if (input.left) direction.x -= 1;
    if (input.right) direction.x += 1;

    // Normalize and apply speed
    // Use player.speed which might be upgraded
    const normalizedDir = Vec2.normalize(direction);
    player.velocity = Vec2.scale(normalizedDir, player.speed);

    // Apply Velocity to Position
    player.position.x += player.velocity.x * dt;
    player.position.y += player.velocity.y * dt;

    // Clamp to Screen Boundaries (Using dynamic world dimensions)
    player.position.x = Math.max(player.radius, Math.min(state.worldWidth - player.radius, player.position.x));
    player.position.y = Math.max(player.radius, Math.min(state.worldHeight - player.radius, player.position.y));

    // 2. Rotation Logic (Face the mouse cursor)
    const dx = input.pointer.x - player.position.x;
    const dy = input.pointer.y - player.position.y;
    player.rotation = Math.atan2(dy, dx);

    // 3. Firing Intent (Passed to ProjectileSystem)
    player.wantsToFire = input.fire;

    // 4. Ability Logic (Repulse Pulse)
    if (input.ability && player.repulseCooldown <= 0) {
        // Activate Ability
        player.repulseCooldown = player.maxRepulseCooldown;
        player.repulseVisualTimer = 0.3; // 300ms visual pulse

        // Find enemies in radius
        const enemies = state.entityManager.getByType(EntityType.Enemy) as EnemyEntity[];
        const PULSE_RADIUS = 180;
        
        for (const enemy of enemies) {
            if (!enemy.active) continue;

            const edx = enemy.position.x - player.position.x;
            const edy = enemy.position.y - player.position.y;
            const dist = Math.sqrt(edx*edx + edy*edy);

            if (dist < PULSE_RADIUS) {
                // Calculate Impulse Direction
                let dirX = edx;
                let dirY = edy;
                
                if (dist === 0) { dirX = 1; dirY = 0; } // Handle overlap
                else {
                    dirX /= dist;
                    dirY /= dist;
                }

                // Determine Force based on Variant
                let baseForce = 800;
                if (enemy.variant === EnemyVariant.Fast) baseForce = 1000; // Fast enemies fly further
                if (enemy.variant === EnemyVariant.Tank) baseForce = 400;  // Tanks resist push

                const force = baseForce * player.repulseForceMult;

                // Apply to Knockback Vector
                enemy.knockback.x += dirX * force;
                enemy.knockback.y += dirY * force;
                
                // Apply Damage
                const damage = player.repulseDamage * player.repulseDamageMult;
                if (damage > 0) {
                    enemy.health -= damage;
                    enemy.hitFlashTimer = 0.1;
                    
                    if (enemy.health <= 0) {
                        enemy.active = false;
                        state.score += enemy.value;
                    }
                }
            }
        }
    }
  }
}