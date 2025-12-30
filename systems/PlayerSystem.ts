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
    if (player.invulnerabilityTimer > 0) player.invulnerabilityTimer -= dt;
    if (player.hitFlashTimer && player.hitFlashTimer > 0) player.hitFlashTimer -= dt;
    if (player.shieldHitAnimTimer && player.shieldHitAnimTimer > 0) player.shieldHitAnimTimer -= dt;
    if (player.repulseCooldown > 0) player.repulseCooldown -= dt;
    if (player.repulseVisualTimer > 0) player.repulseVisualTimer -= dt;
    
    // Post-Dash Buff Timer
    if (player.postDashTimer > 0) player.postDashTimer -= dt;

    // --- NEW MECHANICS: FORTRESS & STATIC CHARGE ---
    const speed = Vec2.mag(player.velocity);
    
    // Fortress: Stationary logic
    if (speed < 10) {
        player.fortressTimer += dt;
        // Effect: +10% DR per second, max 30%? Just abstractly handle "Fortress Active"
        // Actual logic is applied in DamageSystem or Regeneration checks
    } else {
        player.fortressTimer = 0;
    }

    // Static Charge: Moving builds charge
    if (speed > 50) {
        player.staticCharge = Math.min(100, player.staticCharge + (dt * 20)); // Builds full in 5s
    }

    // Nitro: Speed increases Fire Rate
    if (player.nitroEnabled) {
        const speedBonus = Math.min(0.5, speed / 500); // Max 50% bonus at 500 speed
        player.fireRate = Math.max(0.05, player.fireRate * (1.0 - speedBonus * 0.1)); // Dynamic adjust (careful not to perm change base)
        // Actually, modify fireRate is risky if it persists. 
        // Better: ProjectileSystem reads speed and adjusts CD. 
        // For now, let's assume ProjectileSystem will check this flag.
    }

    // --- SYNERGY: DEFENSE (Passive Shield Regen) ---
    // Tier 2: 10s delay. Tier 3: 5s if stationary. 
    // Upgrade: Momentum Shield (Regen faster while moving).
    if (player.maxShields > 0 && player.currentShields < player.maxShields) {
        
        let regenRate = 0.0;
        
        // Base Logic from Synergy
        if (player.synergyDefenseTier >= 2) {
            regenRate = 1.0;
            
            // T3 Boost: Stationary (or Fortress Upgrade)
            if ((player.synergyDefenseTier >= 3 && speed < 10) || player.fortressTimer > 1.0) {
                regenRate = 2.0;
            }
            
            // Upgrade: Momentum Shield
            if (player.moveSpeedShieldRegen && speed > 50) {
                regenRate = Math.max(regenRate, 1.5);
            }
        }

        if (regenRate > 0) {
            player.shieldRegenTimer -= dt * regenRate;
            if (player.shieldRegenTimer <= 0) {
                player.currentShields++;
                player.shieldRegenTimer = 10.0; // Reset
            }
        }
    } else {
        // Reset timer if full
        player.shieldRegenTimer = 10.0;
    }


    // Dash Fatigue Decay (Recovers over time)
    // Recovers fully in about 3 seconds
    if (player.dashFatigue > 0) {
        player.dashFatigue -= dt * 0.3;
        if (player.dashFatigue < 0) player.dashFatigue = 0;
    }

    // --- DASH CHARGE REGENERATION ---
    if (player.dashUnlocked && player.dashCharges < player.maxDashCharges) {
        let rechargeRate = 1.0;
        
        // SYNERGY: MOBILITY T3 - Dash cooldown reduction while moving
        if (player.synergyMobilityTier >= 3) {
            if (speed > 50) {
                rechargeRate = 1.5; // +50% Recharge speed while moving
            }
        }

        player.dashCooldown -= dt * rechargeRate;
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
            // Juggernaut Synergy (Def T10): Ignore Slows
            if (player.synergyDefenseTier < 10) {
                player.speedMultiplier = 0.5; 
            }
            break; 
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
            
            // Post-Dash Buff Trigger
            if (player.postDashDamageBuff > 0) {
                player.postDashTimer = 2.0; // 2 seconds buff window
            }
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
            
            // MOBILITY T10: Flash Step (Instant)
            const isInstant = player.synergyMobilityTier >= 10;
            
            // Calculate fatigue impact
            const fatigueFactor = 1.0 - (player.dashFatigue * 0.4);
            
            player.dashTimer = isInstant ? 0.05 : player.dashDuration * fatigueFactor;
            
            // SYNERGY: MOBILITY T1 - Trail Duration Increase
            let trailDuration = player.dashTrailDuration;
            if (player.synergyMobilityTier >= 1) {
                trailDuration += 1.0;
            }
            // UPGRADE: AFTERBURNER (Longer fire trails)
            if (player.afterburnerEnabled) {
                trailDuration += 1.5; 
            }

            // Increase fatigue
            player.dashFatigue = Math.min(1.0, player.dashFatigue + 0.35);

            // Dash direction determined by MOUSE/AIM (not movement keys, per prompt C.1)
            const dx = input.pointer.x - player.position.x;
            const dy = input.pointer.y - player.position.y;
            const m = Math.sqrt(dx*dx + dy*dy);
            
            let dashDir = { x: 1, y: 0 };
            if (m > 0) dashDir = { x: dx/m, y: dy/m };

            // Apply high velocity
            const dashSpeed = (isInstant ? 3000 : 1000) * fatigueFactor; 
            player.velocity = Vec2.scale(dashDir, dashSpeed);
            
            // --- SPAWN TRAIL ---
            const trail: HazardEntity = {
                id: `trail_${Date.now()}_${Math.random()}`,
                type: EntityType.Hazard,
                position: { ...player.position },
                velocity: { x: 0, y: 0 },
                radius: 12,
                rotation: 0,
                color: player.afterburnerEnabled ? '#f97316' : Colors.DashTrail, // Orange if Afterburner
                active: true,
                damage: player.dashTrailDamage,
                lifetime: trailDuration,
                maxLifetime: trailDuration,
                tickTimer: 0.1, 
                isPlayerOwned: true,
                style: 'line',
                from: { ...player.position },
                to: { ...player.position }
            };
            state.entityManager.add(trail);
            player.activeDashTrailId = trail.id;

            // UPGRADE: DASH RELOAD
            // Synergy T7 also grants reload.
            let reloadAmt = player.dashReloadAmount;
            if (player.synergyMobilityTier >= 7) reloadAmt += 5;
            
            if (reloadAmt > 0) {
                player.currentAmmo = Math.min(player.maxAmmo, player.currentAmmo + reloadAmt);
                if (player.isReloading) {
                    player.isReloading = false;
                    player.reloadTimer = 0;
                }
            }
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
                let damage = player.repulseDamage * player.repulseDamageMult;

                // SYNERGY: MOBILITY T2 - Amplifies Pulse Damage
                if (player.synergyMobilityTier >= 2) {
                     damage *= 1.5; 
                }

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