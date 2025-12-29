import { GameState, GameStatus } from '../core/GameState';
import { Colors } from '../utils/constants';
import { EntityType, EnemyEntity, EnemyVariant, PlayerEntity, ProjectileEntity, ParticleEntity, HazardEntity } from '../entities/types';

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
    // F. UI BACKGROUND ISOLATION Check
    // If in non-gameplay modes (Menu, Shop, GameOver, WaveIntro), render abstract background only
    if (state.status === GameStatus.Menu || 
        state.status === GameStatus.Shop || 
        state.status === GameStatus.GameOver || 
        state.status === GameStatus.WaveIntro) {
        
        this.drawAbstractBackground();
        return;
    }

    // GAMEPLAY RENDER (Playing, Paused, DevConsole)
    this.clear();
    
    // Safety check if resizing state hasn't propagated
    if (this.width !== state.worldWidth || this.height !== state.worldHeight) {
       // This might happen for one frame during resize, generally acceptable
    }

    // Render all active entities
    const entities = state.entityManager.getAll();
    
    // 1. Background Layer: Hazards (Draw first so they are on floor)
    for (const entity of entities) {
        if (entity.type === EntityType.Hazard) {
            this.drawHazard(entity as HazardEntity);
        }
    }

    // 2. Middle Layer: Particles
    this.ctx.save();
    for (const entity of entities) {
        if (entity.type === EntityType.Particle) {
            this.drawParticle(entity as ParticleEntity);
        }
    }
    this.ctx.restore();

    // 3. Top Layer: Main Entities
    for (const entity of entities) {
      // Don't draw player during Wave Intro (handled by exclusion check above anyway)
      
      // Skip already drawn types
      if (entity.type === EntityType.Particle || entity.type === EntityType.Hazard) continue;
      
      this.drawEntity(entity);
    }
    
    // Render Player Ability UI (Overlay on top of player)
    if (state.player && state.player.active) {
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

  private drawAbstractBackground() {
      // Mode 2: Stylized Static Backdrop
      const grad = this.ctx.createRadialGradient(
          this.width / 2, this.height / 2, 0, 
          this.width / 2, this.height / 2, Math.max(this.width, this.height)
      );
      grad.addColorStop(0, '#1e1b4b'); // Deep Indigo
      grad.addColorStop(1, '#020617'); // Slate 950
      
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      // Optional: Add subtle noise or grid? 
      // Keeping it clean as requested "simple is fine"
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      this.ctx.lineWidth = 1;
      const gridSize = 40;
      
      this.ctx.beginPath();
      for(let x=0; x<this.width; x+=gridSize) {
          this.ctx.moveTo(x, 0);
          this.ctx.lineTo(x, this.height);
      }
      for(let y=0; y<this.height; y+=gridSize) {
          this.ctx.moveTo(0, y);
          this.ctx.lineTo(this.width, y);
      }
      this.ctx.stroke();
  }

  private clear() {
    this.ctx.fillStyle = Colors.Background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
  
  private drawHazard(hazard: HazardEntity) {
      this.ctx.save();
      
      // DASH TRAIL STYLE (Continuous Line)
      if (hazard.isPlayerOwned && hazard.style === 'line' && hazard.from && hazard.to) {
          const alpha = Math.max(0, hazard.lifetime / hazard.maxLifetime);
          
          this.ctx.beginPath();
          this.ctx.moveTo(hazard.from.x, hazard.from.y);
          this.ctx.lineTo(hazard.to.x, hazard.to.y);
          
          // Core line
          this.ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * 0.8})`; // Indigo
          this.ctx.lineWidth = hazard.radius * 2;
          this.ctx.lineCap = 'round';
          this.ctx.stroke();
          
          // Outer glow
          this.ctx.strokeStyle = `rgba(165, 180, 252, ${alpha * 0.4})`;
          this.ctx.lineWidth = hazard.radius * 2 + 4;
          this.ctx.stroke();

      } else if (hazard.isPlayerOwned) {
           // Fallback for old circle trails
          this.ctx.translate(hazard.position.x, hazard.position.y);
          const alpha = Math.max(0, hazard.lifetime / hazard.maxLifetime);
          this.ctx.fillStyle = `rgba(99, 102, 241, ${alpha * 0.5})`;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, hazard.radius, 0, Math.PI * 2);
          this.ctx.fill();
      } else {
          // ENEMY TOXIC ZONE STYLE
          this.ctx.translate(hazard.position.x, hazard.position.y);
          const pulse = Math.sin(Date.now() / 200) * 0.1 + 0.9;
          
          // Outer glow
          this.ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; // Emerald
          this.ctx.beginPath();
          this.ctx.arc(0, 0, hazard.radius * pulse, 0, Math.PI * 2);
          this.ctx.fill();
    
          // Inner core
          this.ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, hazard.radius * 0.7 * pulse, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Warning Border
          this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
          this.ctx.lineWidth = 2;
          this.ctx.setLineDash([5, 5]);
          this.ctx.beginPath();
          this.ctx.arc(0, 0, hazard.radius, 0, Math.PI * 2);
          this.ctx.stroke();
      }

      this.ctx.restore();
  }

  private drawParticle(particle: ParticleEntity) {
      if (particle.style === 'ricochet_trail') {
          const alpha = particle.lifetime / particle.maxLifetime;
          
          this.ctx.beginPath();
          this.ctx.moveTo(particle.from.x, particle.from.y);
          this.ctx.lineTo(particle.to.x, particle.to.y);
          
          this.ctx.lineCap = 'round';
          this.ctx.lineWidth = particle.width;
          
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
        
        if (entity.variant !== EnemyVariant.Boss) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(entity.radius * 0.8, 0);
            this.ctx.stroke();
        }

    } else if (entity.type === EntityType.Projectile) {
        if (entity.isEnemyProjectile) {
            this.ctx.beginPath();
            const r = entity.radius;
            this.ctx.moveTo(r, 0);
            this.ctx.lineTo(0, r);
            this.ctx.lineTo(-r, 0);
            this.ctx.lineTo(0, -r);
            this.ctx.closePath();
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            this.ctx.fill();

            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = entity.color;
        } else {
            this.ctx.beginPath();
            this.ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = Colors.Projectile; 
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(0, 0, entity.radius * 0.5, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(entity.radius, 0);
            this.ctx.stroke();
        }
    } else {
        // Player
        this.ctx.beginPath();
        this.ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw direction indicator for Player
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(entity.radius, 0);
        this.ctx.stroke();
        
        // A. SHIELD VISUALS (Updated to Final Spec)
        const player = entity as PlayerEntity;
        
        // Conditions: 
        // 1. Has shields > 0
        // 2. Just broke (shieldHitAnimTimer > 0)
        
        if (player.currentShields > 0 || (player.shieldHitAnimTimer && player.shieldHitAnimTimer > 0)) {
            // Un-rotate for stable shield ring? 
            // PROMPT D.1: "Shield ring... must rotate with player aim"
            // So we KEEP the rotation context.
            
            const shieldRadius = player.radius + 24; // Outer shell
            
            // Determine opacity based on charges
            let opacity = 0;
            if (player.currentShields > 0) {
                 // Scale 0.2 to 0.6
                 opacity = 0.2 + (player.currentShields / player.maxShields) * 0.4;
            } else if (player.shieldHitAnimTimer > 0) {
                 // Popping
                 opacity = (player.shieldHitAnimTimer / 0.2) * 1.0; 
            }
            opacity = Math.max(0, Math.min(1, opacity));
            
            if (opacity > 0) {
                // POP Effect Color Override
                const isPopping = player.currentShields === 0 && player.shieldHitAnimTimer > 0;
                const shieldColor = isPopping ? 'rgba(200, 230, 255,' : 'rgba(14, 165, 233,';

                // 1. Spherical Energy Field
                const grad = this.ctx.createRadialGradient(0, 0, shieldRadius * 0.7, 0, 0, shieldRadius);
                grad.addColorStop(0, `${shieldColor} 0.0)`);
                grad.addColorStop(0.8, `${shieldColor} ${opacity * 0.3})`);
                grad.addColorStop(1, `${shieldColor} ${opacity * 0.6})`);
                
                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 2. Animated Band Effect (Rotating stripe)
                // We want the stripe to move relative to the shield surface
                // If the shield rotates with aim, the stripe rotates with it.
                // To animate it "spinning" independently or pulsing, we can modify arc or alpha.
                
                // Let's do a pulsing band
                const pulse = Math.sin(Date.now() / 200) * 0.1 + 0.9;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, shieldRadius * 0.85 * pulse, 0, Math.PI * 2);
                this.ctx.strokeStyle = `${shieldColor} ${opacity * 0.4})`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                // 3. Rim Highlight
                this.ctx.beginPath();
                this.ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
                this.ctx.strokeStyle = `${shieldColor} ${opacity * 0.9})`;
                this.ctx.lineWidth = isPopping ? 4 : 2;
                this.ctx.stroke();
            }
        }
    }

    this.ctx.restore();
  }

  private drawPlayerAbilityUI(player: PlayerEntity) {
      const { x, y } = player.position;
      const rotation = player.rotation;
      
      // We need to render rings aligned with aim. 
      // Current context is absolute world coordinates (unrotated).
      // We will perform draws using arcs offset by `rotation`.
      
      // E. RELOAD UI (Final Form)
      const ringRadius = player.radius + 12;
      
      if (player.isReloading) {
        // Reloading: Smooth Fill Arc
        const reloadPct = 1 - (player.reloadTimer / player.maxReloadTime);
        const isAlmostDone = player.reloadTimer < 0.15;
        
        // Background track
        this.ctx.beginPath();
        this.ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
        
        // Progress Arc (Starts at rotation - PI/2 ?? No, "start point aligns with aim")
        // Aim is `rotation`. So start at `rotation`.
        // Let's draw it as a symmetric arc growing? Or a circle filling?
        // "Ring fills smoothly as a solid arc". Typically clockwise from top or aim.
        // Let's go clockwise from aim.
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, ringRadius, rotation, rotation + (Math.PI * 2 * reloadPct));
        this.ctx.strokeStyle = isAlmostDone ? '#ffffff' : '#fbbf24'; // Amber
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
        
        if (isAlmostDone) {
             this.ctx.shadowBlur = 10;
             this.ctx.shadowColor = '#ffffff';
             this.ctx.stroke(); // Draw again for glow
             this.ctx.shadowBlur = 0;
        }
      } else {
        // Normal State: Segmented Bullets
        // "Yellow segmented ring... start point aligns with player's aim direction"
        
        // We centre the arc segments around the aim direction? Or start from it?
        // Typically UI looks best if centered or symmetric.
        // But prompt says "start point aligns". 
        // Let's distribute them symmetrically AROUND the aim direction for best "HUD" feel.
        // i.e. Aim is center.
        
        const totalArc = Math.PI * 1.5; // Don't close the full circle, clearer directionality
        const startAngle = rotation - (totalArc / 2);
        
        // Wait, standard ammo rings usually go full circle.
        // Let's stick to full circle but start at aim.
        const fullCircle = Math.PI * 2;
        const gap = 0.15; // Radians gap
        
        // Calculate arc per bullet
        const segmentArc = (fullCircle - (gap * player.maxAmmo)) / player.maxAmmo;
        
        if (player.maxAmmo > 40) {
             // Solid bar for high ammo
             const pct = player.currentAmmo / player.maxAmmo;
             this.ctx.beginPath();
             this.ctx.arc(x, y, ringRadius, rotation, rotation + (fullCircle * pct));
             this.ctx.strokeStyle = '#fbbf24';
             this.ctx.lineWidth = 3;
             this.ctx.stroke();
        } else {
             this.ctx.lineWidth = 3;
             // Draw Segments
             for (let i = 0; i < player.currentAmmo; i++) {
                const angle = rotation + (i * (segmentArc + gap));
                this.ctx.beginPath();
                this.ctx.arc(x, y, ringRadius, angle, angle + segmentArc);
                this.ctx.strokeStyle = '#fbbf24';
                this.ctx.stroke();
            }
            // Draw empty slots (faint)
            for (let i = player.currentAmmo; i < player.maxAmmo; i++) {
                const angle = rotation + (i * (segmentArc + gap));
                this.ctx.beginPath();
                this.ctx.arc(x, y, ringRadius, angle, angle + segmentArc);
                this.ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
                this.ctx.stroke();
            }
        }
      }

      // 2. PULSE/DASH COOLDOWN RINGS
      // We can layer them or put them further out.
      // Pulse Cooldown
      const pulseRadius = player.radius + 18;
      
      // Dash Cooldown / Fatigue Visualization
      // "Visual cue shows dash recharge state"
      // Let's use a small arc under the player or an outer ring
      if (player.dashUnlocked) {
          const dashRadius = player.radius + 22;
          // Render charges as dots/arcs centered on aim direction
          const chargeArc = 0.4;
          const chargeGap = 0.1;
          const totalDashArc = (player.maxDashCharges * chargeArc) + ((player.maxDashCharges - 1) * chargeGap);
          const startDash = rotation - (totalDashArc / 2) + Math.PI; // Opposite to aim (Rear)
          
          for (let i = 0; i < player.maxDashCharges; i++) {
              const angle = startDash + (i * (chargeArc + chargeGap));
              
              this.ctx.beginPath();
              this.ctx.arc(x, y, dashRadius, angle, angle + chargeArc);
              this.ctx.lineWidth = 4;
              
              if (i < player.dashCharges) {
                  this.ctx.strokeStyle = '#6366f1'; // Ready Indigo
              } else if (i === player.dashCharges) {
                  // Recharging
                  const pct = 1 - (player.dashCooldown / player.maxDashCooldown);
                  this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
                  this.ctx.stroke();
                  
                  this.ctx.beginPath();
                  this.ctx.arc(x, y, dashRadius, angle, angle + (chargeArc * pct));
                  this.ctx.strokeStyle = '#818cf8';
              } else {
                  this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)';
              }
              this.ctx.stroke();
          }
      }
      
      // Pulse (Ability) Ring
      if (player.maxRepulseCooldown > 0) {
        if (player.repulseCooldown > 0) {
            // Cooldown indicator
            const pct = 1 - (player.repulseCooldown / player.maxRepulseCooldown);
            this.ctx.beginPath();
            this.ctx.arc(x, y, pulseRadius, rotation, rotation + (Math.PI * 2 * pct));
            this.ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)'; // Cyan faint
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
      }

      // 3. VISUAL PULSE EFFECT (The expanding wave when used)
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
  }

  private drawEnemyShape(enemy: EnemyEntity) {
    switch (enemy.variant) {
        case EnemyVariant.Boss:
             // Big Hexagon with Core
             this.ctx.beginPath();
             const sides = 6;
             const r = enemy.radius;
             for (let i = 0; i < sides; i++) {
                 const angle = (i * 2 * Math.PI) / sides;
                 this.ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
             }
             this.ctx.closePath();
             
             // Color logic based on State
             if (enemy.aiState === 'telegraph_slam' || enemy.aiState === 'telegraph_charge') {
                 this.ctx.fillStyle = '#fbbf24'; // Warning Yellow
             } else if (enemy.aiState === 'recovery') {
                 this.ctx.fillStyle = '#64748b'; // Gray/Vulnerable
             } else if (enemy.aiState === 'charge') {
                 this.ctx.fillStyle = '#fca5a5'; // Bright Red charging
             } else {
                 this.ctx.fillStyle = enemy.color;
             }
             this.ctx.fill();

             // Outline
             this.ctx.strokeStyle = '#fff';
             this.ctx.lineWidth = 4;
             this.ctx.stroke();

             // VISUALS: Attack Telegraphs
             if (enemy.aiState === 'telegraph_slam') {
                 // Draw Area of Effect
                 this.ctx.save();
                 this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
                 this.ctx.lineWidth = 2;
                 this.ctx.setLineDash([10, 10]);
                 this.ctx.beginPath();
                 this.ctx.arc(0, 0, 280, 0, Math.PI * 2); // SLAM_RADIUS
                 this.ctx.stroke();
                 this.ctx.restore();
             }
             
             if (enemy.aiState === 'telegraph_charge') {
                 const rot = enemy.chargeVector 
                     ? Math.atan2(enemy.chargeVector.y, enemy.chargeVector.x)
                     : enemy.rotation;

                 this.ctx.save();
                 this.ctx.rotate(rot - enemy.rotation); 
                 
                 this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
                 this.ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
                 this.ctx.lineWidth = 3;
                 
                 const arrowLen = 500;
                 const arrowWidth = 60;
                 
                 this.ctx.beginPath();
                 this.ctx.moveTo(r + 10, -arrowWidth/2);
                 this.ctx.lineTo(r + arrowLen, -arrowWidth/2);
                 this.ctx.lineTo(r + arrowLen, -arrowWidth);
                 this.ctx.lineTo(r + arrowLen + 50, 0); // Tip
                 this.ctx.lineTo(r + arrowLen, arrowWidth);
                 this.ctx.lineTo(r + arrowLen, arrowWidth/2);
                 this.ctx.lineTo(r + 10, arrowWidth/2);
                 this.ctx.closePath();
                 
                 this.ctx.fill();
                 this.ctx.stroke();
                 this.ctx.restore();
             }
             
             // Inner Core (Pulsing?)
             this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
             this.ctx.beginPath();
             this.ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
             this.ctx.fill();
             break;

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
            
        case EnemyVariant.Shooter:
            // Diamond Shape
            this.ctx.beginPath();
            this.ctx.moveTo(enemy.radius, 0);
            this.ctx.lineTo(0, enemy.radius * 0.7);
            this.ctx.lineTo(-enemy.radius, 0);
            this.ctx.lineTo(0, -enemy.radius * 0.7);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Inner Diamond
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.beginPath();
            this.ctx.moveTo(enemy.radius * 0.5, 0);
            this.ctx.lineTo(0, enemy.radius * 0.35);
            this.ctx.lineTo(-enemy.radius * 0.5, 0);
            this.ctx.lineTo(0, -enemy.radius * 0.35);
            this.ctx.closePath();
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