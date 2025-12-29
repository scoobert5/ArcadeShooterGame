import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType, EnemyEntity, EnemyVariant, HazardEntity, ProjectileEntity, PlayerEntity } from '../entities/types';
import { 
  ENEMY_SEPARATION_RADIUS,
  ENEMY_VARIANTS,
  Colors,
  PROJECTILE_RADIUS
} from '../utils/constants';
import { BALANCE } from '../config/balance';
import { Vec2, Vector2 } from '../utils/math';

interface SpawnLocation {
    x: number;
    y: number;
    edge: number; // 0-3
}

export class EnemySystem implements System {
  // Burst Spawn State
  private burstRemaining = 0;
  private burstLocation: SpawnLocation | null = null;

  update(dt: number, state: GameState) {
    const player = state.player;
    const time = Date.now() / 1000; // Time basis for wander noise

    // 1. Spawning Logic
    state.enemySpawnTimer -= dt;

    if (state.waveActive && state.enemiesRemainingInWave > 0) {
      if (state.enemySpawnTimer <= 0) {
        
        // Handle Burst/Squad Spawning (Only for non-boss waves)
        if (!state.isBossWave && this.burstRemaining > 0) {
            // Continue spawning from current burst
            this.spawnEnemy(state, true);
            this.burstRemaining--;
            state.enemiesRemainingInWave--;
            state.enemySpawnTimer = 0.05; // Extremely fast burst interval
        } else {
            // Decide new spawn type
            // 40% chance to start a burst if we have enough budget and NOT a boss wave
            const isBurst = !state.isBossWave && Math.random() < 0.4 && state.enemiesRemainingInWave >= 6;
            
            if (isBurst) {
                // Swarm Logic: Larger groups (6-9 enemies) to encourage richochet chains
                this.burstRemaining = Math.floor(Math.random() * 4) + 6; 
                this.burstLocation = this.calculateSpawnPosition(state.worldWidth, state.worldHeight); // Pick a spot for the squad
                
                this.spawnEnemy(state, true);
                this.burstRemaining--;
                state.enemiesRemainingInWave--;
                state.enemySpawnTimer = 0.05;
            } else {
                // Single Spawn (Or Boss Spawn)
                this.spawnEnemy(state, false);
                state.enemiesRemainingInWave--;

                // High-Intensity Front-Loaded Spawn Rate
                const nextSpawnDelay = Math.max(0.04, 0.15 - (state.wave * 0.01));
                
                state.enemySpawnTimer = nextSpawnDelay;
            }
        }
      }
    }

    // 2. AI & Movement
    const enemies = state.entityManager.getByType(EntityType.Enemy) as EnemyEntity[];

    for (const enemy of enemies) {
      if (!enemy.active) continue;

      // Decrement visual flash timer
      if (enemy.hitFlashTimer && enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= dt;
      }
      
      // Decrement AI State Timer
      enemy.aiStateTimer -= dt;

      // --- SHOOTER AI & BOSS PULSE ---
      if (enemy.shootTimer !== undefined && enemy.shootTimer > 0) {
          enemy.shootTimer -= dt;
      }

      // Boss Radial Pulse Logic (Constant Background Attack)
      if (enemy.variant === EnemyVariant.Boss) {
           // Boss Pulse Logic
           if (enemy.shootTimer !== undefined && enemy.shootTimer <= 0) {
               this.fireRadialPulse(state, enemy);
               enemy.shootTimer = 1.0; // Fire every 1 second
           }
      }

      // Shooter Firing Logic
      if (enemy.variant === EnemyVariant.Shooter && player) {
          if (enemy.shootTimer === undefined) enemy.shootTimer = 1.0; 

          // Only fire if inside arena and relatively close
          const distToPlayer = Vec2.dist(enemy.position, player.position);
          if (enemy.hasEnteredArena && distToPlayer < 500 && enemy.shootTimer <= 0) {
              this.fireAtPlayer(state, enemy, player);
              // Increased Cadence (+50% faster): Range 0.8s - 1.8s (Avg ~1.3s)
              enemy.shootTimer = 0.8 + Math.random(); 
          }
      }
      
      // Decrement Boss Attack Cooldown (State Machine)
      if (enemy.variant === EnemyVariant.Boss && enemy.attackCooldown > 0) {
          enemy.attackCooldown -= dt;
      }
      
      // --- BOSS AI STATE MACHINE (Movement/Attacks) ---
      if (enemy.variant === EnemyVariant.Boss) {
          if (enemy.aiStateTimer <= 0) {
              // State Transition Logic
              
              if (enemy.aiState === 'approach' || enemy.aiState === 'anchor') {
                  // DECIDE NEXT MOVE
                  // If cooldown is ready, try to attack
                  if (enemy.attackCooldown <= 0 && player) {
                      const dist = Vec2.dist(enemy.position, player.position);
                      const rand = Math.random();

                      if (dist < 250) {
                          // Close range: High chance of Slam
                          if (rand < 0.7) {
                              enemy.aiState = 'telegraph_slam';
                              enemy.aiStateTimer = 0.8; // Faster telegraph for close range
                          } else {
                              // Reposition
                              enemy.aiState = 'approach';
                              enemy.aiStateTimer = 1.0;
                          }
                      } else {
                          // Long range: Mix of Charge and Hazards
                          if (rand < 0.45) {
                              enemy.aiState = 'telegraph_charge';
                              enemy.aiStateTimer = 0.6; // Telegraph time
                              // Lock direction IMMEDIATELY
                              const dx = player.position.x - enemy.position.x;
                              const dy = player.position.y - enemy.position.y;
                              enemy.chargeVector = Vec2.normalize({ x: dx, y: dy });
                          } else if (rand < 0.9) {
                              enemy.aiState = 'telegraph_hazard';
                              enemy.aiStateTimer = 0.5;
                          } else {
                              enemy.aiState = 'approach';
                              enemy.aiStateTimer = 1.5;
                          }
                      }
                  } else {
                      // Wander/Idle while cooling down
                      if (enemy.aiState === 'anchor') {
                          enemy.aiState = 'approach';
                          enemy.aiStateTimer = 1.5 + Math.random();
                      } else {
                          if (Math.random() < 0.3) {
                              enemy.aiState = 'anchor';
                              enemy.aiStateTimer = 0.5;
                          } else {
                              enemy.aiState = 'approach';
                              enemy.aiStateTimer = 1.5;
                              enemy.orbitDir *= -1;
                          }
                      }
                  }
              }
              
              else if (enemy.aiState === 'telegraph_slam') {
                  // EXECUTE SLAM
                  enemy.aiState = 'slam';
                  enemy.aiStateTimer = 0.2; 
                  this.performBossSlam(state, enemy);
              }
              
              else if (enemy.aiState === 'slam') {
                  enemy.aiState = 'recovery';
                  enemy.aiStateTimer = 1.0; // Pause after slam
              }
              
              else if (enemy.aiState === 'telegraph_charge') {
                  // EXECUTE CHARGE
                  enemy.aiState = 'charge';
                  enemy.aiStateTimer = 2.0; // Increased duration for cross-map dash
                  // Vector is already locked from previous state
              }
              
              else if (enemy.aiState === 'charge') {
                  enemy.aiState = 'recovery';
                  enemy.aiStateTimer = 1.2; // Vulnerable after charge
              }

              else if (enemy.aiState === 'telegraph_hazard') {
                  enemy.aiState = 'spawn_hazard';
                  enemy.aiStateTimer = 0.1;
                  this.performBossHazard(state, enemy);
              }

              else if (enemy.aiState === 'spawn_hazard') {
                  enemy.aiState = 'recovery';
                  enemy.aiStateTimer = 0.5; 
              }
              
              else if (enemy.aiState === 'recovery') {
                  // RESET
                  enemy.aiState = 'approach';
                  enemy.aiStateTimer = 1.0;
                  enemy.attackCooldown = 1.5; // Reduced cooldown for more aggression (Was 2.5)
              }
          }
      } 
      // --- REGULAR ENEMY AI STATE MACHINE ---
      else {
          if (enemy.aiStateTimer <= 0) {
            if (enemy.aiState === 'approach') {
                enemy.aiState = 'commit';
                enemy.aiStateTimer = 2.0 + Math.random() * 2.0; 
            } else {
                enemy.aiState = 'approach';
                enemy.aiStateTimer = 3.0 + Math.random() * 3.0; 
                if (Math.random() > 0.5) enemy.orbitDir *= -1; 
            }
          }
      }

      if (player && player.active) {
        // --- Layered Steering Behaviors ---
        const steering = { x: 0, y: 0 };

        // 1. Boss Specific Movement Overrides
        if (enemy.variant === EnemyVariant.Boss) {
            
            // Stationary States
            if (enemy.aiState === 'telegraph_slam' || 
                enemy.aiState === 'telegraph_charge' || 
                enemy.aiState === 'telegraph_hazard' ||
                enemy.aiState === 'recovery' || 
                enemy.aiState === 'slam' ||
                enemy.aiState === 'spawn_hazard') {
                
                enemy.velocity = { x: 0, y: 0 };
                enemy.knockback.x *= 0.9;
                enemy.knockback.y *= 0.9;
                
                // Face target during telegraph (but charge direction is locked)
                if (enemy.aiState === 'telegraph_charge' && enemy.chargeVector) {
                    enemy.rotation = Math.atan2(enemy.chargeVector.y, enemy.chargeVector.x);
                } else if (enemy.aiState.startsWith('telegraph')) {
                    const dx = player.position.x - enemy.position.x;
                    const dy = player.position.y - enemy.position.y;
                    enemy.rotation = Math.atan2(dy, dx);
                }
                
                enemy.position.x += enemy.knockback.x * dt;
                enemy.position.y += enemy.knockback.y * dt;
                
                // Apply strict clamping even when "still" (handles knockback push)
                this.clampEnemyToBounds(enemy, state.worldWidth, state.worldHeight);
                continue; 
            }
            
            if (enemy.aiState === 'charge') {
                // CHARGE MOVEMENT
                // Significantly faster to cover arena
                const chargeSpeed = 1200; // Increased speed (Was 1100)
                const dir = enemy.chargeVector || { x: 1, y: 0 };
                
                enemy.velocity = Vec2.scale(dir, chargeSpeed);
                enemy.rotation = Math.atan2(dir.y, dir.x);
                
                enemy.position.x += enemy.velocity.x * dt;
                enemy.position.y += enemy.velocity.y * dt;
                
                // Strict Clamp Check - If hitting wall, stop charge early
                const didCollide = this.clampEnemyToBounds(enemy, state.worldWidth, state.worldHeight);
                if (didCollide) {
                    enemy.aiState = 'recovery';
                    enemy.aiStateTimer = 1.5; // Stunned/Recovery from wall hit
                }
                continue;
            }
        }

        // --- Standard Steering (Approach / Commit / Regular Enemies) ---

        // 1. Seek / Intent (Primary Objective)
        const dx = player.position.x - enemy.position.x;
        const dy = player.position.y - enemy.position.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);
        
        let dirX = 0; 
        let dirY = 0;
        if (distToPlayer > 0) {
             dirX = dx / distToPlayer;
             dirY = dy / distToPlayer;
        }

        let intentX = 0;
        let intentY = 0;

        if (enemy.aiState === 'anchor') {
            intentX = 0;
            intentY = 0;
        } else if (enemy.aiState === 'commit') {
            intentX = dirX;
            intentY = dirY;
        } else {
            // Approach / Orbit
            const tanX = -dirY * enemy.orbitDir;
            const tanY = dirX * enemy.orbitDir;
            // Blend Seek (0.4) and Tangent (0.6)
            intentX = (dirX * 0.4) + (tanX * 0.6);
            intentY = (dirY * 0.4) + (tanY * 0.6);
        }

        steering.x += intentX;
        steering.y += intentY;

        // 2. Neighbors (Separation & Alignment)
        // Boss ignores neighbors usually, but lets keep separation to push little guys away
        const neighbors = state.spatialHash.query(enemy.position.x, enemy.position.y, ENEMY_SEPARATION_RADIUS * 1.5);
        
        let sepX = 0, sepY = 0;
        let alignX = 0, alignY = 0;
        let neighborCount = 0;

        for (const other of neighbors) {
            if (other.id === enemy.id || other.type !== EntityType.Enemy) continue;
            const o = other as EnemyEntity; 

            const odx = enemy.position.x - o.position.x;
            const ody = enemy.position.y - o.position.y;
            const distSq = odx*odx + ody*ody;
            const sepRadiusSq = ENEMY_SEPARATION_RADIUS * ENEMY_SEPARATION_RADIUS;

            // Separation
            if (distSq < sepRadiusSq && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const strength = (ENEMY_SEPARATION_RADIUS - dist) / ENEMY_SEPARATION_RADIUS;
                sepX += (odx / dist) * strength;
                sepY += (ody / dist) * strength;
            }

            // Alignment (Boss ignores)
            if (enemy.variant !== EnemyVariant.Boss && distSq < sepRadiusSq * 3.0) { 
                alignX += o.velocity.x;
                alignY += o.velocity.y;
                neighborCount++;
            }
        }

        // Apply Separation
        if (enemy.variant !== EnemyVariant.Boss) {
            steering.x += sepX * 2.8;
            steering.y += sepY * 2.8;
        }

        // Apply Alignment
        if (neighborCount > 0) {
            const alignLen = Math.sqrt(alignX*alignX + alignY*alignY);
            if (alignLen > 0) {
                steering.x += (alignX / alignLen) * 0.6;
                steering.y += (alignY / alignLen) * 0.6;
            }
        }

        // 3. Wander (Boss ignores)
        if (enemy.variant !== EnemyVariant.Boss) {
            const seed = this.getHash(enemy.id);
            const wanderX = Math.sin(time * 1.5 + seed);
            const wanderY = Math.cos(time * 1.2 + seed * 0.5);
            steering.x += wanderX * 0.3;
            steering.y += wanderY * 0.3;
        }

        // 4. Boundary Containment (Soft Force) for regular enemies
        // Boss uses hard clamp below
        if (enemy.hasEnteredArena && enemy.variant !== EnemyVariant.Boss) {
            const margin = 80;
            const boundsStrength = 3.0;
            if (enemy.position.x < margin) steering.x += boundsStrength * ((margin - enemy.position.x) / margin);
            else if (enemy.position.x > state.worldWidth - margin) steering.x -= boundsStrength * ((enemy.position.x - (state.worldWidth - margin)) / margin);

            if (enemy.position.y < margin) steering.y += boundsStrength * ((margin - enemy.position.y) / margin);
            else if (enemy.position.y > state.worldHeight - margin) steering.y -= boundsStrength * ((enemy.position.y - (state.worldHeight - margin)) / margin);
        }

        // --- Velocity Update ---
        const steerLen = Math.sqrt(steering.x*steering.x + steering.y*steering.y);
        let moveDirX = 0;
        let moveDirY = 0;
        if (steerLen > 0) {
            moveDirX = steering.x / steerLen;
            moveDirY = steering.y / steerLen;
        }

        const config = ENEMY_VARIANTS[enemy.variant];
        const baseSpeed = config ? config.speed : 100;

        // SCALING
        const waveIndex = Math.max(0, state.wave - 1);
        const speedMult = 1 + (waveIndex * BALANCE.WAVE.SPEED_SCALING);
        
        let targetSpeed = baseSpeed * speedMult;
        if (enemy.aiState === 'anchor') targetSpeed *= 0.1;
        
        const targetVx = moveDirX * targetSpeed;
        const targetVy = moveDirY * targetSpeed;

        const baseTurnSpeed = 6.0;
        const turnSpeedMult = 1 + (waveIndex * BALANCE.WAVE.TURN_SPEED_SCALING);
        const turnSpeed = baseTurnSpeed * turnSpeedMult;
        
        const t = 1.0 - Math.exp(-turnSpeed * dt);
        
        enemy.velocity.x += (targetVx - enemy.velocity.x) * t;
        enemy.velocity.y += (targetVy - enemy.velocity.y) * t;

        // Physics
        const damping = 0.9; 
        enemy.knockback.x *= damping;
        enemy.knockback.y *= damping;
        if (Math.abs(enemy.knockback.x) < 1) enemy.knockback.x = 0;
        if (Math.abs(enemy.knockback.y) < 1) enemy.knockback.y = 0;

        enemy.position.x += (enemy.velocity.x + enemy.knockback.x) * dt;
        enemy.position.y += (enemy.velocity.y + enemy.knockback.y) * dt;

        if (Math.abs(enemy.velocity.x) > 1 || Math.abs(enemy.velocity.y) > 1) {
            enemy.rotation = Math.atan2(enemy.velocity.y, enemy.velocity.x);
        }
        
        // Strict Clamp for Boss to prevent leaving arena
        if (enemy.variant === EnemyVariant.Boss) {
            this.clampEnemyToBounds(enemy, state.worldWidth, state.worldHeight);
        }
      }

      // 3. Arena Containment & Cleanup
      const margin = enemy.radius;
      if (!enemy.hasEnteredArena) {
          if (enemy.position.x > margin && enemy.position.x < state.worldWidth - margin &&
              enemy.position.y > margin && enemy.position.y < state.worldHeight - margin) {
              enemy.hasEnteredArena = true;
          }
      }

      if (enemy.hasEnteredArena) {
          if (enemy.position.x < margin) { enemy.position.x = margin; if (enemy.velocity.x < 0) enemy.velocity.x = 0; }
          else if (enemy.position.x > state.worldWidth - margin) { enemy.position.x = state.worldWidth - margin; if (enemy.velocity.x > 0) enemy.velocity.x = 0; }
          if (enemy.position.y < margin) { enemy.position.y = margin; if (enemy.velocity.y < 0) enemy.velocity.y = 0; }
          else if (enemy.position.y > state.worldHeight - margin) { enemy.position.y = state.worldHeight - margin; if (enemy.velocity.y > 0) enemy.velocity.y = 0; }
      } else {
          const PADDING = 200;
          if (enemy.position.x < -PADDING || enemy.position.x > state.worldWidth + PADDING ||
            enemy.position.y < -PADDING || enemy.position.y > state.worldHeight + PADDING) {
            enemy.active = false;
          }
      }
    }
  }

  /**
   * Hard clamp for Boss logic. Returns true if collision with wall occurred.
   */
  private clampEnemyToBounds(enemy: EnemyEntity, width: number, height: number): boolean {
      let collided = false;
      const r = enemy.radius;
      
      if (enemy.position.x < r) { 
          enemy.position.x = r; 
          enemy.velocity.x = 0; 
          collided = true;
      }
      else if (enemy.position.x > width - r) { 
          enemy.position.x = width - r; 
          enemy.velocity.x = 0; 
          collided = true;
      }
      
      if (enemy.position.y < r) { 
          enemy.position.y = r; 
          enemy.velocity.y = 0; 
          collided = true;
      }
      else if (enemy.position.y > height - r) { 
          enemy.position.y = height - r; 
          enemy.velocity.y = 0; 
          collided = true;
      }
      
      return collided;
  }

  private fireRadialPulse(state: GameState, boss: EnemyEntity) {
      const projectileCount = 12;
      const speed = 200;
      const step = (Math.PI * 2) / projectileCount;
      const offset = 0; 

      for (let i = 0; i < projectileCount; i++) {
          const angle = (step * i) + offset;
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          
          // Use Boss Projectile visuals
          this.spawnEnemyProjectile(state, boss.position, { x: vx, y: vy }, boss.id, true);
      }
  }

  private fireAtPlayer(state: GameState, enemy: EnemyEntity, player: PlayerEntity) {
      const speed = 220;
      const dx = player.position.x - enemy.position.x;
      const dy = player.position.y - enemy.position.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist === 0) return;
      
      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed;

      this.spawnEnemyProjectile(state, enemy.position, { x: vx, y: vy }, enemy.id, false);
  }

  private spawnEnemyProjectile(state: GameState, position: Vector2, velocity: Vector2, ownerId: string, isBoss: boolean) {
      const projectile: ProjectileEntity = {
          id: `eproj_${Date.now()}_${Math.random()}`,
          type: EntityType.Projectile,
          position: { ...position },
          velocity: { ...velocity },
          radius: isBoss ? 7 : 5, // Larger for Boss
          rotation: Math.atan2(velocity.y, velocity.x),
          color: isBoss ? Colors.BossProjectile : Colors.EnemyProjectile, // Different Colors
          active: true,
          damage: 10, 
          lifetime: 5.0,
          ownerId: ownerId,
          isEnemyProjectile: true,
          bouncesRemaining: 0,
          ricochetSearchRadius: 0,
          hitEntityIds: []
      };
      
      state.entityManager.add(projectile);
  }

  private performBossSlam(state: GameState, boss: EnemyEntity) {
      if (!state.player || !state.player.active) return;
      
      const SLAM_RADIUS = 280; // Large area
      const dist = Vec2.dist(boss.position, state.player.position);
      
      if (dist < SLAM_RADIUS) {
          // Apply Damage
          if (state.player.invulnerabilityTimer <= 0) {
              const rawDamage = boss.damage * 1.5; // Stronger than contact
              const mitigation = state.player.damageReduction || 0;
              state.player.health -= Math.max(1, rawDamage * (1 - mitigation));
              state.player.invulnerabilityTimer = 0.5;
              state.player.hitFlashTimer = 0.3;
          }

          // Apply Massive Knockback
          const dx = state.player.position.x - boss.position.x;
          const dy = state.player.position.y - boss.position.y;
          const dir = Vec2.normalize({ x: dx, y: dy });
          
          const pushDist = 150;
          state.player.position.x += dir.x * pushDist;
          state.player.position.y += dir.y * pushDist;
      }
  }

  private performBossHazard(state: GameState, boss: EnemyEntity) {
      // Spawn 5 hazards near boss or player (More area denial, was 4)
      const count = 5;
      for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const offset = 60 + Math.random() * 100;
          const px = boss.position.x + Math.cos(angle) * offset;
          const py = boss.position.y + Math.sin(angle) * offset;

          const hazard: HazardEntity = {
              id: `hazard_${Date.now()}_${i}`,
              type: EntityType.Hazard,
              position: { x: px, y: py },
              velocity: { x: 0, y: 0 },
              radius: 110, // Larger radius (Was 90)
              rotation: 0,
              color: '#10b981', // Emerald Toxic
              active: true,
              damage: Math.ceil(boss.damage * 0.3), 
              lifetime: 8.0, // Persist longer
              maxLifetime: 8.0,
              tickTimer: 0
          };
          
          // Clamp spawn to arena
          hazard.position.x = Math.max(hazard.radius, Math.min(state.worldWidth - hazard.radius, hazard.position.x));
          hazard.position.y = Math.max(hazard.radius, Math.min(state.worldHeight - hazard.radius, hazard.position.y));
          
          state.entityManager.add(hazard);
      }
  }

  /**
   * Generates a deterministic pseudo-random hash from a string ID.
   * Used for wander noise seeding.
   */
  private getHash(str: string): number {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash |= 0; // Convert to 32bit integer
      }
      return hash;
  }

  private calculateSpawnPosition(worldWidth: number, worldHeight: number): SpawnLocation {
      // Pick a random edge: 0=Top, 1=Right, 2=Bottom, 3=Left
      const edge = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      const PADDING = 20;

      switch (edge) {
        case 0: // Top
          x = Math.random() * worldWidth;
          y = -PADDING;
          break;
        case 1: // Right
          x = worldWidth + PADDING;
          y = Math.random() * worldHeight;
          break;
        case 2: // Bottom
          x = Math.random() * worldWidth;
          y = worldHeight + PADDING;
          break;
        case 3: // Left
          x = -PADDING;
          y = Math.random() * worldHeight;
          break;
      }
      return { x, y, edge };
  }

  private spawnEnemy(state: GameState, useBurst: boolean) {
    let x, y;

    if (useBurst && this.burstLocation) {
        x = this.burstLocation.x + (Math.random() * 40 - 20);
        y = this.burstLocation.y + (Math.random() * 40 - 20);
    } else {
        const loc = this.calculateSpawnPosition(state.worldWidth, state.worldHeight);
        x = loc.x;
        y = loc.y;
    }

    const weights = state.waveEnemyWeights;
    const rand = Math.random();
    let variant = EnemyVariant.Basic; 

    // Weighted Random Selection
    if (weights[EnemyVariant.Boss] >= 1.0) {
        variant = EnemyVariant.Boss;
    } else {
        let cumulative = 0;
        cumulative += weights[EnemyVariant.Basic];
        if (rand < cumulative) {
            variant = EnemyVariant.Basic;
        } else {
            cumulative += weights[EnemyVariant.Fast];
            if (rand < cumulative) {
                variant = EnemyVariant.Fast;
            } else {
                cumulative += weights[EnemyVariant.Tank];
                if (rand < cumulative) {
                    variant = EnemyVariant.Tank;
                } else {
                    variant = EnemyVariant.Shooter; // Fallback or explicit
                }
            }
        }
    }

    const config = ENEMY_VARIANTS[variant];
    const radius = config ? config.radius : 14;

    const baseHealth = config ? config.health : 30;
    const baseDamage = config ? config.damage : 10;
    
    // --- SCALING: HP & Damage ---
    const waveIndex = Math.max(0, state.wave - 1);
    
    // Base HP Scaling + Tank Bonus
    const hpMult = 1 + (waveIndex * BALANCE.WAVE.HP_SCALING);
    const tankBonus = (variant === EnemyVariant.Tank) ? (waveIndex * BALANCE.WAVE.TANK_HP_BONUS) : 0;
    
    // Boss Scaling: Scales aggressively to ensure it remains a challenge
    const bossBonus = (variant === EnemyVariant.Boss) ? (waveIndex * 0.1) : 0;

    const finalHpMult = hpMult + tankBonus + bossBonus;
    
    // Damage Scaling
    const finalDmgMult = 1 + (waveIndex * BALANCE.WAVE.DAMAGE_SCALING);

    const enemy: EnemyEntity = {
      id: `enemy_${Date.now()}_${Math.random()}`,
      type: EntityType.Enemy,
      variant: variant,
      position: { x, y },
      velocity: { x: 0, y: 0 },
      knockback: { x: 0, y: 0 },
      radius: radius,
      rotation: 0,
      color: config ? config.color : '#fff',
      active: true,
      health: Math.ceil(baseHealth * finalHpMult),
      maxHealth: Math.ceil(baseHealth * finalHpMult),
      damage: Math.ceil(baseDamage * finalDmgMult),
      value: config ? config.value : 100,
      hitFlashTimer: 0,
      aiState: 'approach',
      aiStateTimer: 1.0 + Math.random() * 2.0, 
      orbitDir: Math.random() < 0.5 ? 1 : -1,
      hasEnteredArena: false,
      attackCooldown: 2.0,
      shootTimer: (variant === EnemyVariant.Shooter || variant === EnemyVariant.Boss) ? 2.0 : undefined
    };

    state.entityManager.add(enemy);
  }
}