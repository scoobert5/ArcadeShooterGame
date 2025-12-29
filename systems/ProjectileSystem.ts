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

            // Stats
            const streamCount = player.projectileStreams || 1; // Split Shot controls this
            const bulletsPerStream = player.projectileCount || 1; // Multi Shot controls this
            const totalSpreadAngle = player.splitAngle || 0.3; // Default narrow spread
            
            // Calculate base spawn point
            const aimAngle = player.rotation;
            const spawnOffset = player.radius;
            const baseX = player.position.x + (Math.cos(aimAngle) * spawnOffset);
            const baseY = player.position.y + (Math.sin(aimAngle) * spawnOffset);
            
            // Outer Loop: STREAMS (Split Shot)
            for (let s = 0; s < streamCount; s++) {
                let streamAngle = aimAngle;
                
                // Calculate angle for this stream
                if (streamCount > 1) {
                    const startAngle = -totalSpreadAngle / 2;
                    const step = totalSpreadAngle / (streamCount - 1);
                    streamAngle += startAngle + (step * s);
                }

                // Inner Loop: BULLETS (Multi Shot - Train Formation)
                for (let b = 0; b < bulletsPerStream; b++) {
                    const gap = 20; // Slightly wider gap for readability as requested
                    const offset = -b * gap; // Backwards offset

                    // Calculate spawn position for this bullet in the train
                    // We project backwards along the stream angle
                    const dirX = Math.cos(streamAngle);
                    const dirY = Math.sin(streamAngle);
                    
                    const spawnX = baseX + (dirX * offset);
                    const spawnY = baseY + (dirY * offset);

                    const vx = dirX * PROJECTILE_SPEED;
                    const vy = dirY * PROJECTILE_SPEED;

                    const projectile: ProjectileEntity = {
                      id: `proj_${Date.now()}_${s}_${b}_${Math.random()}`,
                      type: EntityType.Projectile,
                      position: { x: spawnX, y: spawnY }, 
                      velocity: { x: vx, y: vy },
                      radius: PROJECTILE_RADIUS,
                      rotation: streamAngle,
                      color: Colors.Projectile,
                      active: true,
                      damage: player.damage,
                      lifetime: PROJECTILE_LIFETIME,
                      ownerId: player.id,
                      isEnemyProjectile: false,
                      // Init Ricochet properties
                      bouncesRemaining: player.ricochetBounces,
                      ricochetSearchRadius: player.ricochetSearchRadius,
                      hitEntityIds: [],
                    };

                    state.entityManager.add(projectile);
                }
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