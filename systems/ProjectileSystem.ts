import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType, ProjectileEntity, ParticleEntity, PlayerEntity } from '../entities/types';
import { PROJECTILE_SPEED, PROJECTILE_RADIUS, PROJECTILE_LIFETIME, Colors } from '../utils/constants';

export class ProjectileSystem implements System {
  update(dt: number, state: GameState) {
    // 1. Handle Player Shooting
    const player = state.player;
    if (player) {
      if (player.cooldown > 0) {
        player.cooldown -= dt;
      }
      
      // Update Burst Logic
      if (player.burstQueue > 0) {
          player.burstTimer -= dt;
          if (player.burstTimer <= 0) {
              this.fireVolley(state, player);
              player.burstQueue--;
              player.burstTimer = 0.06; // 60ms gap between burst shots
          }
      }

      if (player.wantsToFire && player.cooldown <= 0) {
        
        if (player.isReloading) {
            // Cannot fire while reloading
        } else if (player.currentAmmo <= 0) {
            // Empty click triggers reload
            player.isReloading = true;
            player.reloadTimer = player.maxReloadTime;
        } else {
            // Start Fire Sequence
            player.cooldown = player.fireRate;
            
            // Fire first volley immediately
            this.fireVolley(state, player);
            
            // Queue up remaining bursts (Multi-Shot)
            const bulletsPerStream = player.projectileCount || 1;
            if (bulletsPerStream > 1) {
                player.burstQueue = bulletsPerStream - 1;
                player.burstTimer = 0.06; // 60ms initial delay for second shot
            }
        }
      }
    }

    // 2. Update Active Projectiles
    const projectiles = state.entityManager.getByType(EntityType.Projectile) as ProjectileEntity[];
    for (const p of projectiles) {
      // Update Age
      p.age = (p.age || 0) + dt;

      // Tank Projectile Fragmentation Logic
      // If it's a tank shot, hasn't burst yet, isn't a fragment itself, and has lived >= 5.0s
      if (p.isTankShot && !p.hasBurst && !p.isTankFragment && p.age >= 5.0) {
          p.hasBurst = true;
          p.active = false; // Destroy parent
          this.spawnTankFragments(state, p);
          continue; // Stop processing this projectile
      }

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

  // Spawns 8 fragments radially from the parent projectile
  private spawnTankFragments(state: GameState, parent: ProjectileEntity) {
      const count = 8;
      const speed = 180; // Slightly faster than the slow tank shell
      const step = (Math.PI * 2) / count;

      for (let i = 0; i < count; i++) {
          const angle = (step * i);
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;

          const fragment: ProjectileEntity = {
              id: `frag_${parent.id}_${i}_${Math.random()}`,
              type: EntityType.Projectile,
              position: { ...parent.position },
              velocity: { x: vx, y: vy },
              radius: 6, // Smaller than tank shot
              rotation: angle,
              color: parent.color, // Inherit color
              active: true,
              damage: Math.ceil(parent.damage * 0.35), // Reduced damage
              lifetime: 1.2, // Short lifetime
              maxLifetime: 1.2,
              ownerId: parent.ownerId,
              isEnemyProjectile: true,
              bouncesRemaining: 0,
              piercesRemaining: 0,
              ricochetSearchRadius: 0,
              hitEntityIds: [],
              isTankShot: false,
              isTankFragment: true,
              hasBurst: true, // Fragments cannot burst
              shape: 'square', // Keep visual consistency
              age: 0
          };
          state.entityManager.add(fragment);
      }
  }

  // Fires one set of projectiles (one per stream)
  private fireVolley(state: GameState, player: PlayerEntity) {
      if (player.currentAmmo <= 0) return;
      
      player.currentAmmo--;
      
      // Update Shots Fired Counter (For Bullet Synergy T2)
      player.shotsFired++;
      
      // SYNERGY: BULLET TIER 2 - Vulnerability
      // "Every 5th bullet applies vulnerability"
      const appliesVulnerability = player.synergyBulletTier >= 2 && (player.shotsFired % 5 === 0);

      // Check reload trigger on last shot
      if (player.currentAmmo <= 0) {
          player.isReloading = true;
          player.reloadTimer = player.maxReloadTime;
          // Clear burst queue if we run out of ammo mid-burst
          player.burstQueue = 0; 
      }

      const streamCount = player.projectileStreams || 1; // Split Shot controls this
      const totalSpreadAngle = player.splitAngle || 0.3; // Default narrow spread
      
      const aimAngle = player.rotation;
      const spawnOffset = player.radius;
      const baseX = player.position.x + (Math.cos(aimAngle) * spawnOffset);
      const baseY = player.position.y + (Math.sin(aimAngle) * spawnOffset);
      
      // SYNERGY: BULLET TIER 3 - Reduced Speed
      let speed = PROJECTILE_SPEED;
      if (player.synergyBulletTier >= 3) {
          speed *= 0.8; // 20% slower
      }

      // SYNERGY: BULLET TIER 1/9 - Extra Ricochet
      let bounces = player.ricochetBounces;
      if (player.synergyBulletTier >= 1) bounces += 1;
      if (player.synergyBulletTier >= 9) bounces += 1;

      // SYNERGY: BULLET TIER 5 - Piercing
      let pierces = player.piercingCount;
      if (player.synergyBulletTier >= 5) pierces += 1;

      // Loop: STREAMS (Split Shot)
      for (let s = 0; s < streamCount; s++) {
          let streamAngle = aimAngle;
          
          // Calculate angle for this stream
          if (streamCount > 1) {
              const startAngle = -totalSpreadAngle / 2;
              const step = totalSpreadAngle / (streamCount - 1);
              streamAngle += startAngle + (step * s);
          }

          const vx = Math.cos(streamAngle) * speed;
          const vy = Math.sin(streamAngle) * speed;

          const projectile: ProjectileEntity = {
            id: `proj_${Date.now()}_${s}_${Math.random()}`,
            type: EntityType.Projectile,
            position: { x: baseX, y: baseY }, 
            velocity: { x: vx, y: vy },
            radius: PROJECTILE_RADIUS,
            rotation: streamAngle,
            color: appliesVulnerability ? '#d946ef' : Colors.Projectile, // Purple if vuln shot
            active: true,
            damage: player.damage,
            lifetime: PROJECTILE_LIFETIME,
            maxLifetime: PROJECTILE_LIFETIME,
            ownerId: player.id,
            isEnemyProjectile: false,
            // Init Ricochet properties
            bouncesRemaining: bounces,
            ricochetSearchRadius: player.ricochetSearchRadius,
            hitEntityIds: [],
            // Pierce
            piercesRemaining: pierces,
            
            // Synergy Flags
            isVulnerabilityShot: appliesVulnerability,
            isRicochet: false,
            
            // Init Age
            age: 0
          };

          state.entityManager.add(projectile);
      }
  }
}