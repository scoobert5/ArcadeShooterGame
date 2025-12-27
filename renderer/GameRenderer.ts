import { GameState, GameStatus } from '../core/GameState';
import { Colors } from '../utils/constants';
import { EntityType, EnemyEntity, EnemyVariant, PlayerEntity, ProjectileEntity, ParticleEntity } from '../entities/types';

/**
 * Handles all canvas drawing operations.
 * Purely functional: State -> Pixels.
 * Does not modify GameState.
 */
export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * Main render method called by the React animation frame loop.
   */
  render(state: GameState) {
    this.clear();
    
    // Safety check if resizing state hasn't propagated
    if (this.width !== state.worldWidth || this.height !== state.worldHeight) {
       // This might happen for one frame during resize, generally acceptable
    }

    // Render all active entities
    const entities = state.entityManager.getAll();
    
    // Separate drawing pass for particles (trails) behind everything
    this.ctx.save();
    for (const entity of entities) {
        if (entity.type === EntityType.Particle) {
            this.drawParticle(entity as ParticleEntity);
        }
    }
    this.ctx.restore();

    for (const entity of entities) {
      // Don't draw player during Wave Intro (hidden until start)
      if (state.status === GameStatus.WaveIntro && entity.type === EntityType.Player) {
          continue;
      }
      
      // Don't draw particles in the main entity loop (already drawn)
      if (entity.type === EntityType.Particle) continue;
      
      this.drawEntity(entity);
    }
    
    // Render Player Ability UI (Overlay on top of player)
    if (state.player && state.player.active && state.status === GameStatus.Playing) {
        this.drawPlayerAbilityUI(state.player);
    }

    // Visual overlay for paused state handled here (simple primitive)
    if (state.status === GameStatus.Paused) {
      this.drawPauseOverlay();
    }
    
    // Player Hit Flash Overlay
    if (state.player && state.player.hitFlashTimer && state.player.hitFlashTimer > 0) {
        this.ctx.fillStyle = `rgba(220, 38, 38, ${Math.min(0.4, state.player.hitFlashTimer * 2)})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  private clear() {
    this.ctx.fillStyle = Colors.Background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawParticle(particle: ParticleEntity) {
      if (particle.style === 'ricochet_trail') {
          const alpha = particle.lifetime / particle.maxLifetime;
          
          this.ctx.beginPath();
          this.ctx.moveTo(particle.from.x, particle.from.y);
          this.ctx.lineTo(particle.to.x, particle.to.y);
          
          this.ctx.lineCap = 'round';
          this.ctx.lineWidth = particle.width;
          
          // Use Amber for the trail (Matches Projectile Color)
          this.ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
          this.ctx.stroke();
      }
  }

  private drawEntity(entity: any) {
    this.ctx.save();
    this.ctx.translate(entity.position.x, entity.position.y);
    // Use the entity's rotation, default to 0
    this.ctx.rotate(entity.rotation || 0);

    // Hit Flash Effect: White color if timer active
    if (entity.hitFlashTimer && entity.hitFlashTimer > 0) {
        this.ctx.fillStyle = '#ffffff';
    } else {
        this.ctx.fillStyle = entity.color || '#fff';
    }

    // Shape Rendering Switch
    if (entity.type === EntityType.Enemy) {
        this.drawEnemyShape(entity as EnemyEntity);
        
        // Draw direction indicator for Enemy (Readability improvement)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; // Subtler than player
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(entity.radius * 0.8, 0); // Slightly shorter than radius to keep it inside/near
        this.ctx.stroke();

    } else {
        // Default Circle (Player, Projectile, Basic Enemy fallback)
        this.ctx.beginPath();
        this.ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw direction indicator for Player/Projectiles
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(entity.radius, 0);
        this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawPlayerAbilityUI(player: PlayerEntity) {
      const { x, y } = player.position;
      const radius = player.radius + 12; // Draw outside player body

      // 1. Reload Bar (Displayed underneath player when reloading)
      if (player.isReloading) {
        const barWidth = 40;
        const barHeight = 4;
        const yOffset = 30; // Distance below player center
        
        this.ctx.save();
        this.ctx.translate(x, y + yOffset);
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(-barWidth/2, 0, barWidth, barHeight);
        
        // Progress
        // Fills from 0 (empty) to full (loaded)
        const pct = 1 - (player.reloadTimer / player.maxReloadTime);
        this.ctx.fillStyle = '#fbbf24'; // Amber
        this.ctx.fillRect(-barWidth/2, 0, barWidth * pct, barHeight);
        
        this.ctx.restore();
      }

      // 2. Draw Visual Pulse Effect if active
      if (player.repulseVisualTimer > 0) {
          const t = 1 - (player.repulseVisualTimer / 0.3); // 0 to 1 over 0.3s
          const maxPulseRadius = 180;
          const currentRadius = player.radius + (maxPulseRadius - player.radius) * t;
          const alpha = 1 - t;

          this.ctx.save();
          this.ctx.translate(x, y);
          this.ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
          this.ctx.lineWidth = 4;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.restore();
      }

      // 3. Draw Cooldown Ring
      // If cooldown > 0, draw partial ring. If 0, draw full faint ring.
      this.ctx.save();
      this.ctx.translate(x, y);
      
      this.ctx.lineWidth = 3;
      
      if (player.repulseCooldown <= 0) {
          // Ready: Faint full ring
          this.ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
          this.ctx.stroke();
      } else {
          // Cooling down: Arc
          const pct = 1 - (player.repulseCooldown / player.maxRepulseCooldown);
          // Background track
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
          this.ctx.stroke();
          
          // Progress
          this.ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
          this.ctx.beginPath();
          // Start from top (-PI/2)
          this.ctx.arc(0, 0, radius, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * pct));
          this.ctx.stroke();
      }
      
      this.ctx.restore();
  }

  private drawEnemyShape(enemy: EnemyEntity) {
    switch (enemy.variant) {
        case EnemyVariant.Fast:
            // Triangle / Arrowhead
            this.ctx.beginPath();
            this.ctx.moveTo(enemy.radius, 0); // Tip pointing forward (0 rads)
            this.ctx.lineTo(-enemy.radius, -enemy.radius * 0.8);
            this.ctx.lineTo(-enemy.radius * 0.5, 0); // Indent back
            this.ctx.lineTo(-enemy.radius, enemy.radius * 0.8);
            this.ctx.closePath();
            this.ctx.fill();
            break;

        case EnemyVariant.Tank:
            // Square / Boxy
            this.ctx.beginPath();
            // Draw a rounded square centered at 0,0
            const size = enemy.radius;
            this.ctx.rect(-size, -size, size * 2, size * 2);
            this.ctx.fill();
            
            // Add a "core" detail
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.beginPath();
            this.ctx.rect(-size/2, -size/2, size, size);
            this.ctx.fill();
            break;

        case EnemyVariant.Basic:
        default:
            // Circle with some texture
            this.ctx.beginPath();
            this.ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Simple detail line
            this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, enemy.radius * 0.6, 0, Math.PI * 2);
            this.ctx.stroke();
            break;
    }
  }

  private drawPauseOverlay() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}