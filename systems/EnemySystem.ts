import { System } from './BaseSystem';
import { GameState } from '../core/GameState';
import { EntityType, EnemyEntity, EnemyVariant } from '../entities/types';
import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  ENEMY_SPAWN_RATE, 
  ENEMY_MIN_SPAWN_RATE,
  ENEMY_SEPARATION_RADIUS,
  ENEMY_SEPARATION_FORCE,
  ENEMY_VARIANTS 
} from '../utils/constants';
import { Vec2 } from '../utils/math';

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

    // 1. Spawning Logic
    state.enemySpawnTimer -= dt;

    if (state.waveActive && state.enemiesRemainingInWave > 0) {
      if (state.enemySpawnTimer <= 0) {
        
        // Handle Burst/Squad Spawning
        if (this.burstRemaining > 0) {
            // Continue spawning from current burst
            this.spawnEnemy(state, true);
            this.burstRemaining--;
            state.enemiesRemainingInWave--;
            state.enemySpawnTimer = 0.15; // Fast spawn for squad members
        } else {
            // Decide new spawn type
            // 30% chance to start a burst if we have enough budget
            const isBurst = Math.random() < 0.3 && state.enemiesRemainingInWave >= 3;
            
            if (isBurst) {
                this.burstRemaining = Math.floor(Math.random() * 3) + 2; // 2 to 4 enemies
                this.burstLocation = this.calculateSpawnPosition(); // Pick a spot for the squad
                
                this.spawnEnemy(state, true);
                this.burstRemaining--;
                state.enemiesRemainingInWave--;
                state.enemySpawnTimer = 0.15;
            } else {
                // Single Spawn
                this.spawnEnemy(state, false);
                state.enemiesRemainingInWave--;

                // Normal dynamic delay
                const nextSpawnDelay = Math.max(
                    ENEMY_MIN_SPAWN_RATE, 
                    ENEMY_SPAWN_RATE - (state.wave * 0.08)
                );
                state.enemySpawnTimer = nextSpawnDelay;
            }
        }
      }
    }

    // 2. Swarming AI & Movement
    const enemies = state.entityManager.getByType(EntityType.Enemy) as EnemyEntity[];

    for (const enemy of enemies) {
      if (!enemy.active) continue;

      // Decrement visual flash timer
      if (enemy.hitFlashTimer && enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= dt;
      }

      // Decrement AI State Timer
      enemy.aiStateTimer -= dt;
      if (enemy.aiStateTimer <= 0) {
          // Switch State
          if (enemy.aiState === 'approach') {
              // Switch to Commit (Rush)
              enemy.aiState = 'commit';
              enemy.aiStateTimer = 2.0 + Math.random() * 2.0; // Increased to 2-4s for stability
          } else {
              // Switch back to Approach (Orbit)
              enemy.aiState = 'approach';
              enemy.aiStateTimer = 3.0 + Math.random() * 3.0; // Increased to 3-6s for stability
              if (Math.random() > 0.5) enemy.orbitDir *= -1; // Sometimes switch orbit direction
          }
      }

      if (player && player.active) {
        // --- Steering Behaviors ---
        
        // Calculate vector to player
        const dx = player.position.x - enemy.position.x;
        const dy = player.position.y - enemy.position.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);
        
        let dirX = 0; 
        let dirY = 0;
        
        if (distToPlayer > 0) {
             dirX = dx / distToPlayer;
             dirY = dy / distToPlayer;
        }

        // A. Primary Intent (Approach vs Commit)
        let intentX = 0;
        let intentY = 0;

        if (enemy.aiState === 'commit') {
            // Direct Rush
            intentX = dirX;
            intentY = dirY;
        } else {
            // Approach / Orbit
            // Calculate Tangent (Perpendicular to radius)
            const tanX = -dirY * enemy.orbitDir;
            const tanY = dirX * enemy.orbitDir;
            
            // Blend Seek (0.4) and Tangent (0.6)
            intentX = (dirX * 0.4) + (tanX * 0.6);
            intentY = (dirY * 0.4) + (tanY * 0.6);
        }

        // B. Separation (Repulsion from neighbors)
        let separationX = 0;
        let separationY = 0;

        for (const other of enemies) {
            if (other === enemy || !other.active) continue;
            
            const odx = enemy.position.x - other.position.x;
            const ody = enemy.position.y - other.position.y;
            const distSq = odx*odx + ody*ody;

            if (distSq < ENEMY_SEPARATION_RADIUS * ENEMY_SEPARATION_RADIUS && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const strength = 1 - (dist / ENEMY_SEPARATION_RADIUS);
                
                separationX += (odx / dist) * strength;
                separationY += (ody / dist) * strength;
            }
        }
        
        // C. Combine Forces
        const finalX = intentX + (separationX * ENEMY_SEPARATION_FORCE);
        const finalY = intentY + (separationY * ENEMY_SEPARATION_FORCE);
        
        // Normalize Desired Direction
        const finalLen = Math.sqrt(finalX*finalX + finalY*finalY);
        let moveDirX = 0;
        let moveDirY = 0;
        
        if (finalLen > 0) {
            moveDirX = finalX / finalLen;
            moveDirY = finalY / finalLen;
        }

        // D. Apply Velocity (Smoothed)
        const config = ENEMY_VARIANTS[enemy.variant];
        const maxSpeed = config ? config.speed : 100;

        // Target velocity based on steering
        const targetVx = moveDirX * maxSpeed;
        const targetVy = moveDirY * maxSpeed;

        // Smoothly interpolate current velocity towards target velocity
        // Factor increased to 8.0 for tighter, snappier turns while maintaining fluidity
        const smoothingFactor = 8.0; 
        const t = 1.0 - Math.exp(-smoothingFactor * dt);
        
        enemy.velocity.x += (targetVx - enemy.velocity.x) * t;
        enemy.velocity.y += (targetVy - enemy.velocity.y) * t;

        // E. Knockback Physics (Impulse Decay)
        // Apply damping to knockback vector separately
        const damping = 0.9; // Fast decay for bouncy feel
        enemy.knockback.x *= damping;
        enemy.knockback.y *= damping;

        // Stop micro-movements
        if (Math.abs(enemy.knockback.x) < 1) enemy.knockback.x = 0;
        if (Math.abs(enemy.knockback.y) < 1) enemy.knockback.y = 0;

        // Update Position (Velocity + Knockback)
        enemy.position.x += (enemy.velocity.x + enemy.knockback.x) * dt;
        enemy.position.y += (enemy.velocity.y + enemy.knockback.y) * dt;

        // Update Rotation to face movement (ignoring knockback for visual clarity)
        if (Math.abs(enemy.velocity.x) > 1 || Math.abs(enemy.velocity.y) > 1) {
            enemy.rotation = Math.atan2(enemy.velocity.y, enemy.velocity.x);
        }
      }

      // 3. Arena Containment & Cleanup
      const margin = enemy.radius;
      
      // Activation: Check if enemy has fully entered the arena
      if (!enemy.hasEnteredArena) {
          if (
              enemy.position.x > margin && 
              enemy.position.x < GAME_WIDTH - margin &&
              enemy.position.y > margin && 
              enemy.position.y < GAME_HEIGHT - margin
          ) {
              enemy.hasEnteredArena = true;
          }
      }

      // Behavior: If active in arena, clamp to bounds
      if (enemy.hasEnteredArena) {
          let clamped = false;
          
          if (enemy.position.x < margin) {
              enemy.position.x = margin;
              if (enemy.velocity.x < 0) enemy.velocity.x = 0; // Slide along wall
              clamped = true;
          } else if (enemy.position.x > GAME_WIDTH - margin) {
              enemy.position.x = GAME_WIDTH - margin;
              if (enemy.velocity.x > 0) enemy.velocity.x = 0;
              clamped = true;
          }

          if (enemy.position.y < margin) {
              enemy.position.y = margin;
              if (enemy.velocity.y < 0) enemy.velocity.y = 0;
              clamped = true;
          } else if (enemy.position.y > GAME_HEIGHT - margin) {
              enemy.position.y = GAME_HEIGHT - margin;
              if (enemy.velocity.y > 0) enemy.velocity.y = 0;
              clamped = true;
          }
      } else {
          // Cleanup: Remove if way out of bounds (and never entered)
          const PADDING = 200;
          if (
            enemy.position.x < -PADDING ||
            enemy.position.x > GAME_WIDTH + PADDING ||
            enemy.position.y < -PADDING ||
            enemy.position.y > GAME_HEIGHT + PADDING
          ) {
            enemy.active = false;
          }
      }
    }
  }

  private calculateSpawnPosition(): SpawnLocation {
      // Pick a random edge: 0=Top, 1=Right, 2=Bottom, 3=Left
      const edge = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      const PADDING = 20;

      switch (edge) {
        case 0: // Top
          x = Math.random() * GAME_WIDTH;
          y = -PADDING;
          break;
        case 1: // Right
          x = GAME_WIDTH + PADDING;
          y = Math.random() * GAME_HEIGHT;
          break;
        case 2: // Bottom
          x = Math.random() * GAME_WIDTH;
          y = GAME_HEIGHT + PADDING;
          break;
        case 3: // Left
          x = -PADDING;
          y = Math.random() * GAME_HEIGHT;
          break;
      }
      return { x, y, edge };
  }

  private spawnEnemy(state: GameState, useBurst: boolean) {
    let x, y;

    // Determine Spawn Location
    if (useBurst && this.burstLocation) {
        // Offset slightly so they don't stack perfectly
        x = this.burstLocation.x + (Math.random() * 40 - 20);
        y = this.burstLocation.y + (Math.random() * 40 - 20);
    } else {
        const loc = this.calculateSpawnPosition();
        x = loc.x;
        y = loc.y;
    }

    // Determine variant based on weighted probabilities from current wave
    const weights = state.waveEnemyWeights;
    const rand = Math.random();
    let variant = EnemyVariant.Basic; // Default

    // Weighted random selection
    let cumulative = 0;
    
    cumulative += weights[EnemyVariant.Basic];
    if (rand < cumulative) {
        variant = EnemyVariant.Basic;
    } else {
        cumulative += weights[EnemyVariant.Fast];
        if (rand < cumulative) {
            variant = EnemyVariant.Fast;
        } else {
            variant = EnemyVariant.Tank;
        }
    }

    const config = ENEMY_VARIANTS[variant];
    const radius = config ? config.radius : 14;

    // Apply Difficulty Scaling
    const baseHealth = config ? config.health : 30;
    const baseDamage = config ? config.damage : 10;

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
      // Scale Health
      health: Math.ceil(baseHealth * state.difficultyMultiplier),
      maxHealth: Math.ceil(baseHealth * state.difficultyMultiplier),
      // Scale Damage
      damage: Math.ceil(baseDamage * state.difficultyMultiplier),
      value: config ? config.value : 100,
      hitFlashTimer: 0,
      
      // Initialize AI State
      aiState: 'approach',
      aiStateTimer: 1.0 + Math.random() * 2.0, // Initial orbit time
      orbitDir: Math.random() < 0.5 ? 1 : -1,
      hasEnteredArena: false
    };

    state.entityManager.add(enemy);
  }
}