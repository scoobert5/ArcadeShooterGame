
import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType, ProjectileEntity, PlayerEntity } from '../entities/types';
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
              player.burstTimer = 0.06; 
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
            this.fireVolley(state, player);
            
            // Queue up remaining bursts (Multi-Shot)
            const bulletsPerStream = player.projectileCount || 1;
            if (bulletsPerStream > 1) {
                player.burstQueue = bulletsPerStream - 1;
                player.burstTimer = 0.06; 
            }
        }
      }
    }

    // 2. Update Enemy Projectiles (EntityManager)
    const enemyProjectiles = state.entityManager.getByType(EntityType.Projectile) as ProjectileEntity[];
    for (const p of enemyProjectiles) {
        this.updateProjectile(p, dt, state);
    }

    // 3. Update Player Projectiles (Pool)
    let activeCount = 0;
    const pool = state.playerProjectilePool;
    for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (p.active) {
            this.updateProjectile(p, dt, state);
            if (p.active) activeCount++; // Check again in case it died
        }
    }
    state.activePlayerProjectileCount = activeCount;
  }

  private updateProjectile(p: ProjectileEntity, dt: number, state: GameState) {
      // Update Age
      p.age = (p.age || 0) + dt;

      // TRAIL UPDATE (Ring Buffer)
      const head = p.trailHead;
      p.trail[head].x = p.position.x;
      p.trail[head].y = p.position.y;
      p.trailHead = (head + 1) % p.trail.length;

      // Tank Projectile Fragmentation Logic
      if (p.isTankShot && !p.hasBurst && !p.isTankFragment && p.age >= 5.0) {
          p.hasBurst = true;
          p.active = false; 
          this.spawnTankFragments(state, p);
          return; 
      }

      // Decrease Lifetime
      p.lifetime -= dt;
      if (p.lifetime <= 0) {
        p.active = false;
        return;
      }

      // Move Projectile
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;

      // Bounds Check
      if (
        p.position.x < 0 || 
        p.position.x > state.worldWidth || 
        p.position.y < 0 || 
        p.position.y > state.worldHeight
      ) {
          p.active = false;
          // Impact Particle on Wall via Pool
          this.spawnImpactParticle(state, p.position, p.color);
      }
  }

  // Spawns 8 fragments radially from the parent projectile
  private spawnTankFragments(state: GameState, parent: ProjectileEntity) {
      const count = 8;
      const speed = 180; 
      const step = (Math.PI * 2) / count;

      for (let i = 0; i < count; i++) {
          const angle = (step * i);
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;

          // Init Trail
          const trailSize = 6;
          const trail = new Array(trailSize).fill(0).map(() => ({ x: parent.position.x, y: parent.position.y }));

          const fragment: ProjectileEntity = {
              id: `frag_${parent.id}_${i}_${Math.random()}`,
              type: EntityType.Projectile,
              position: { ...parent.position },
              velocity: { x: vx, y: vy },
              radius: 6, 
              rotation: angle,
              color: parent.color, 
              active: true,
              damage: Math.ceil(parent.damage * 0.35), 
              lifetime: 1.2, 
              maxLifetime: 1.2,
              ownerId: parent.ownerId,
              isEnemyProjectile: true,
              bouncesRemaining: 0,
              piercesRemaining: 0,
              ricochetSearchRadius: 0,
              hitEntityIds: [],
              isTankShot: false,
              isTankFragment: true,
              hasBurst: true, 
              shape: 'square', 
              age: 0,
              trail: trail,
              trailHead: 0
          };
          state.entityManager.add(fragment);
      }
  }

  private spawnImpactParticle(state: GameState, pos: {x: number, y: number}, color: string) {
      // Burst of small particles via pool
      for(let i=0; i<3; i++) {
          const vx = (Math.random()-0.5)*150;
          const vy = (Math.random()-0.5)*150;
          
          state.spawnParticle({
              style: 'spark',
              position: { x: pos.x, y: pos.y },
              velocity: { x: vx, y: vy },
              color: color,
              lifetime: 0.2 + Math.random() * 0.1,
              radius: 2,
              width: 0
          });
      }
  }

  // Fires one set of projectiles (one per stream)
  private fireVolley(state: GameState, player: PlayerEntity) {
      if (player.currentAmmo <= 0) return;
      
      player.currentAmmo--;
      
      // Screen Shake (Firing Kick)
      state.addShake(1.5);

      // Visual Recoil Impulse
      const aimX = Math.cos(player.rotation);
      const aimY = Math.sin(player.rotation);
      player.recoil.x -= aimX * 4.0;
      player.recoil.y -= aimY * 4.0;

      // Update Shots Fired Counter (For Bullet Synergy T2)
      player.shotsFired++;
      
      const appliesVulnerability = player.synergyBulletTier >= 2 && (player.shotsFired % 5 === 0);

      // Check reload trigger on last shot
      if (player.currentAmmo <= 0) {
          player.isReloading = true;
          player.reloadTimer = player.maxReloadTime;
          player.burstQueue = 0; 
      }

      const streamCount = player.projectileStreams || 1; 
      const totalSpreadAngle = player.splitAngle || 0.3; 
      
      const aimAngle = player.rotation;
      const spawnOffset = player.radius;
      const baseX = player.position.x + (Math.cos(aimAngle) * spawnOffset);
      const baseY = player.position.y + (Math.sin(aimAngle) * spawnOffset);
      
      let speed = PROJECTILE_SPEED;
      if (player.synergyBulletTier >= 3) {
          speed *= 0.8; 
      }

      let bounces = player.ricochetBounces;
      if (player.synergyBulletTier >= 1) bounces += 1;
      if (player.synergyBulletTier >= 9) bounces += 1;

      let pierces = player.piercingCount;
      if (player.synergyBulletTier >= 5) pierces += 1;

      // Loop: STREAMS
      for (let s = 0; s < streamCount; s++) {
          let streamAngle = aimAngle;
          
          if (streamCount > 1) {
              const startAngle = -totalSpreadAngle / 2;
              const step = totalSpreadAngle / (streamCount - 1);
              streamAngle += startAngle + (step * s);
          }

          const vx = Math.cos(streamAngle) * speed;
          const vy = Math.sin(streamAngle) * speed;

          state.spawnPlayerProjectile({
              position: { x: baseX, y: baseY },
              velocity: { x: vx, y: vy },
              rotation: streamAngle,
              damage: player.damage,
              color: appliesVulnerability ? '#d946ef' : Colors.Projectile,
              bouncesRemaining: bounces,
              piercesRemaining: pierces,
              ricochetSearchRadius: player.ricochetSearchRadius,
              isVulnerabilityShot: appliesVulnerability
          });
      }
  }
}
