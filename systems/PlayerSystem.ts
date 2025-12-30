import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { InputState } from '../core/InputManager';
import { Vec2 } from '../utils/math';
import { EntityType, EnemyEntity, EnemyVariant, HazardEntity } from '../entities/types';
import { Colors } from '../utils/constants';

export class PlayerSystem implements System {
  update(dt: number, state: GameState, input: InputState) {
    const player = state.player;
    if (!player) return;

    // Reset Speed Multiplier (Hazards will re-apply it if necessary)
    player.speedMultiplier = 1.0;

    // 0. Update Timers
    if (player.invulnerabilityTimer > 0) {
      player.invulnerabilityTimer -= dt;
    }
    if (player.hitFlashTimer && player.hitFlashTimer > 0) {
      player.hitFlashTimer -= dt;
    }
    if (player.shieldHitAnimTimer && player.shieldHitAnimTimer > 0) {
        player.shieldHitAnimTimer -= dt;
    }
    if (player.repulseCooldown > 0) {
        player.repulseCooldown -= dt;
    }
    if (player.repulseVisualTimer > 0) {
        player.repulseVisualTimer -= dt;
    }

    // Dash Fatigue Decay (Recovers over time)
    // Recovers fully in about 3 seconds
    if (player.dashFatigue > 0) {
        player.dashFatigue -= dt * 0.3;
        if (player.dashFatigue < 0) player.dashFatigue = 0;
    }

    // --- DASH CHARGE REGENERATION ---
    if (player.dashUnlocked && player.dashCharges < player.maxDashCharges) {
        player.dashCooldown -= dt;
        if (player.dashCooldown <= 0) {
            player.dashCharges++;
            player.dashCooldown = player.maxDashCooldown;
        }
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
    
    // Check Hazard Overlap
    const hazards = state.entityManager.getByType(EntityType.Hazard);
    for (const h of hazards) {
        // Don't get slowed by own trail
        if ((h as HazardEntity).isPlayerOwned) continue;

        const dist = Vec2.dist(player.position, h.position);
        if (dist < h.radius + player.radius) {
            player.speedMultiplier = 0.5; // 50% slow
            break; // Only apply once
        }
    }

    // 1. Movement Logic
    const direction = { x: 0, y: 0 };
    if (input.up) direction.y -= 1;
    if (input.down) direction.y += 1;
    if (input.left) direction.x -= 1;
    if (input.right) direction.x += 1;

    // --- DASH LOGIC ---
    if (player.isDashing) {
        player.dashTimer -= dt;
        
        // UPDATE ACTIVE TRAIL END POINT
        if (player.activeDashTrailId) {
            const trail = state.entityManager.getAll().find(e => e.id === player.activeDashTrailId);
            if (trail) {
                // Update 'to' position to stretch the line
                (trail as HazardEntity).to = { ...player.position };
            }
        }

        if (player.dashTimer <= 0) {
            player.isDashing = false;
            player.activeDashTrailId = undefined; // Detach from trail
        }
    } else {
        // Normal Movement
        const normalizedDir = Vec2.normalize(direction);
        const finalSpeed = player.speed * player.speedMultiplier;
        
        player.velocity = Vec2.scale(normalizedDir, finalSpeed);

        // Check for Dash Input
        if (player.dashUnlocked && input.dash && player.dashCharges > 0) {
            // Initiate Dash
            player.isDashing = true;
            player.dashCharges--;
            
            // Calculate fatigue impact
            // Fatigue reduces duration (distance) and slightly speed
            const fatigueFactor = 1.0 - (player.dashFatigue * 0.4); // At max fatigue, 60% effectiveness
            
            player.dashTimer = player.dashDuration * fatigueFactor;
            
            // Increase fatigue
            player.dashFatigue = Math.min(1.0, player.dashFatigue + 0.35);

            // Dash direction determined by MOUSE/AIM (not movement keys, per prompt C.1)
            const dx = input.pointer.x - player.position.x;
            const dy = input.pointer.y - player.position.y;
            const m = Math.sqrt(dx*dx + dy*dy);
            
            let dashDir = { x: 1, y: 0 };
            if (m > 0) dashDir = { x: dx/m, y: dy/m };

            // Apply high velocity
            const dashSpeed = 1000 * fatigueFactor; 
            player.velocity = Vec2.scale(dashDir, dashSpeed);
            
            // --- SPAWN SINGLE TRAIL ENTITY ---
            const trail: HazardEntity = {
                id: `trail_${Date.now()}_${Math.random()}`,
                type: EntityType.Hazard,
                position: { ...player.position }, // Start Point for hit detection optimization
                velocity: { x: 0, y: 0 },
                radius: 12, // Thickness
                rotation: 0,
                color: Colors.DashTrail,
                active: true,
                damage: player.dashTrailDamage,
                lifetime: player.dashTrailDuration,
                maxLifetime: player.dashTrailDuration,
                tickTimer: 0.1, 
                isPlayerOwned: true,
                style: 'line',
                from: { ...player.position },
                to: { ...player.position } // Init to same spot, will stretch in update loop
            };
            state.entityManager.add(trail);
            player.activeDashTrailId = trail.id;
        }
    }

    // Apply Velocity to Position
    player.position.x += player.velocity.x * dt;
    player.position.y += player.velocity.y * dt;

    // Clamp to Screen Boundaries
    player.position.x = Math.max(player.radius, Math.min(state.worldWidth - player.radius, player.position.x));
    player.position.y = Math.max(player.radius, Math.min(state.worldHeight - player.radius, player.position.y));

    // 2. Rotation Logic (Face the mouse cursor)
    const dx = input.pointer.x - player.position.x;
    const dy = input.pointer.y - player.position.y;
    player.rotation = Math.atan2(dy, dx);

    // 3. Firing Intent (Passed to ProjectileSystem)
    // Cannot fire while dashing
    player.wantsToFire = input.fire && !player.isDashing;

    // 4. Ability Logic (Repulse Pulse) - NOW ON ABILITY KEY (Right Click)
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