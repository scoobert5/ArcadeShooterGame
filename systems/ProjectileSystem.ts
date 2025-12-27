import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType, ProjectileEntity, ParticleEntity } from '../entities/types';
import { PROJECTILE_SPEED, PROJECTILE_RADIUS, PROJECTILE_LIFETIME, Colors } from '../utils/constants';

export class ProjectileSystem implements System {
  update(dt: number, state: GameState) {
    // 1. Handle Player Shooting
    const player = state.player;
    if (player) {
      if (player.cooldown > 0) {
        player.cooldown -= dt;
      }

      if (player.wantsToFire && player.cooldown <= 0) {
        
        if (player.isReloading) {
            // Cannot fire while reloading
        } else if (player.currentAmmo <= 0) {
            // Empty click triggers reload
            player.isReloading = true;
            player.reloadTimer = player.maxReloadTime;
        } else {
            // Fire!
            player.currentAmmo--;
            player.cooldown = player.fireRate;
            
            // Check if that was the last shot
            if (player.currentAmmo <= 0) {
                player.isReloading = true;
                player.reloadTimer = player.maxReloadTime;
            }

            const count = player.projectileCount;
            // Spread logic: Arc the shots slightly
            // 0.1 radians is approx 5.7 degrees per shot spacing
            const spreadStep = 0.1; 
            
            for (let i = 0; i < count; i++) {
                // Calculate offset angle so the group is centered on aim direction
                const angleOffset = (i - (count - 1) / 2) * spreadStep;
                const finalAngle = player.rotation + angleOffset;

                const vx = Math.cos(finalAngle) * PROJECTILE_SPEED;
                const vy = Math.sin(finalAngle) * PROJECTILE_SPEED;

                const projectile: ProjectileEntity = {
                  id: `proj_${Date.now()}_${i}_${Math.random()}`,
                  type: EntityType.Projectile,
                  position: { x: player.position.x, y: player.position.y }, 
                  velocity: { x: vx, y: vy },
                  radius: PROJECTILE_RADIUS,
                  rotation: finalAngle,
                  color: Colors.Projectile,
                  active: true,
                  damage: player.damage,
                  lifetime: PROJECTILE_LIFETIME,
                  ownerId: player.id,
                  // Init Ricochet properties
                  bouncesRemaining: player.ricochetBounces,
                  hitEntityIds: [],
                };

                state.entityManager.add(projectile);
            }
        }
      }
    }

    // 2. Update Active Projectiles
    const projectiles = state.entityManager.getByType(EntityType.Projectile) as ProjectileEntity[];
    for (const p of projectiles) {
      // Decrease Lifetime
      p.lifetime -= dt;
      if (p.lifetime <= 0) {
        p.active = false;
        continue;
      }

      // Move Projectile
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;

      // Bounds Check: Destroy if off-screen (Containment using dynamic world size)
      if (
        p.position.x < 0 || 
        p.position.x > state.worldWidth || 
        p.position.y < 0 || 
        p.position.y > state.worldHeight
      ) {
          p.active = false;
      }
    }

    // 3. Update Particles (Ricochet Trails, etc.)
    const particles = state.entityManager.getByType(EntityType.Particle) as ParticleEntity[];
    for (const p of particles) {
        p.lifetime -= dt;
        if (p.lifetime <= 0) {
            p.active = false;
        }
    }
  }
}