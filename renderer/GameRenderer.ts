
import { GameState, GameStatus } from '../core/GameState';
import { Colors } from '../utils/constants';
import { EntityType, EnemyEntity, EnemyVariant, PlayerEntity, ProjectileEntity, ParticleEntity, HazardEntity, DamageNumber } from '../entities/types';

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
    if (state.status === GameStatus.Menu || 
        state.status === GameStatus.Shop || 
        state.status === GameStatus.GameOver || 
        state.status === GameStatus.WaveIntro ||
        state.status === GameStatus.Extraction ||
        state.status === GameStatus.ExtractionSuccess) {
        
        this.drawAbstractBackground();
        return;
    }

    // GAMEPLAY RENDER
    this.clear();
    
    // --- APPLY SCREEN SHAKE ---
    this.ctx.save();
    if (state.enableVfx && state.screenshake.intensity > 0) {
        this.ctx.translate(state.screenshake.offset.x, state.screenshake.offset.y);
    }

    // Render all active entities
    const entities = state.entityManager.getAll();
    
    // 1. Background Layer: Hazards
    for (const entity of entities) {
        if (entity.type === EntityType.Hazard) {
            this.drawHazard(entity as HazardEntity);
        }
    }

    // 2. Middle Layer: Particles (From Pool)
    if (state.enableVfx) {
        this.ctx.save();
        const particlePool = state.particlePool;
        for (let i = 0; i < particlePool.length; i++) {
            const p = particlePool[i];
            if (p.active) {
                this.drawParticle(p);
            }
        }
        this.ctx.restore();
    }

    // 3. Player Projectiles (Batched & Pooled)
    this.drawPlayerProjectiles(state);

    // 4. Top Layer: Main Entities (Player, Enemies, Enemy Projectiles)
    for (const entity of entities) {
      if (entity.type === EntityType.Particle || entity.type === EntityType.Hazard) continue;
      this.drawEntity(entity);
    }
    
    // 5. JUICE LAYER: Damage Numbers
    if (state.enableVfx) {
        for (const dn of state.damageNumbers) {
            this.drawDamageNumber(dn);
        }
    }
    
    // Render Player Ability UI (Overlay on top of player)
    if (state.player && state.player.active) {
        this.drawPlayerAbilityUI(state.player, state);
    }

    // Restore shake transform
    this.ctx.restore();

    // Visual overlay for paused state handled here
    if (state.status === GameStatus.Paused) {
      this.drawPauseOverlay();
    }
    
    // Player Hit Flash Overlay
    if (state.enableVfx && state.player && state.player.hitFlashTimer && state.player.hitFlashTimer > 0) {
        this.ctx.fillStyle = `rgba(220, 38, 38, ${Math.min(0.4, state.player.hitFlashTimer * 2)})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  private drawPlayerProjectiles(state: GameState) {
      const pool = state.playerProjectilePool;
      const count = state.activePlayerProjectileCount;
      const useLOD = count > 200; // Visual LOD threshold
      
      this.ctx.save();
      
      // Batch 1: Standard Projectiles
      this.ctx.beginPath();
      this.ctx.fillStyle = Colors.Projectile;
      
      for (let i = 0; i < pool.length; i++) {
          const p = pool[i];
          if (!p.active) continue;
          
          // Separate colors require breaking batch or multiple passes.
          // Optimization: Draw standard colored ones in one go.
          if (p.isVulnerabilityShot) continue; // Skip special ones for next pass

          // Draw Dot
          this.ctx.moveTo(p.position.x + p.radius, p.position.y);
          this.ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
      }
      this.ctx.fill();

      // Batch 2: Vulnerability Projectiles (Purple)
      this.ctx.beginPath();
      this.ctx.fillStyle = '#d946ef';
      for (let i = 0; i < pool.length; i++) {
          const p = pool[i];
          if (!p.active || !p.isVulnerabilityShot) continue;
          this.ctx.moveTo(p.position.x + p.radius, p.position.y);
          this.ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
      }
      this.ctx.fill();

      // Batch 3: Trails (Vector) - Only if not heavy load AND VFX enabled
      if (state.enableVfx && !useLOD) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          this.ctx.lineWidth = 1; // Thinner for perf
          
          for (let i = 0; i < pool.length; i++) {
              const p = pool[i];
              if (!p.active) continue;
              
              if (p.trail && p.trail.length > 0) {
                  const head = p.trailHead;
                  // Just draw a line from oldest to current
                  const oldest = p.trail[(head + 1) % p.trail.length];
                  if (oldest.x !== 0) {
                      this.ctx.moveTo(oldest.x, oldest.y);
                      this.ctx.lineTo(p.position.x, p.position.y);
                  }
              }
          }
          this.ctx.stroke();
      }

      this.ctx.restore();
  }

  private drawDamageNumber(dn: DamageNumber) {
      const alpha = Math.min(1, dn.life / 0.3); // Fade out last 0.3s
      this.ctx.save();
      this.ctx.translate(dn.position.x, dn.position.y);
      this.ctx.scale(dn.scale, dn.scale);
      this.ctx.globalAlpha = alpha;
      
      this.ctx.font = `bold ${dn.isCritical ? 24 : 16}px Inter, sans-serif`;
      this.ctx.fillStyle = dn.color;
      this.ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      this.ctx.lineWidth = 3;
      
      this.ctx.strokeText(Math.round(dn.value).toString(), 0, 0);
      this.ctx.fillText(Math.round(dn.value).toString(), 0, 0);
      
      this.ctx.restore();
  }

  private drawAbstractBackground() {
      const grad = this.ctx.createRadialGradient(
          this.width / 2, this.height / 2, 0, 
          this.width / 2, this.height / 2, Math.max(this.width, this.height)
      );
      grad.addColorStop(0, '#1e1b4b'); 
      grad.addColorStop(1, '#020617'); 
      
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.width, this.height);
      
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
          
          this.ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * 0.8})`; 
          this.ctx.lineWidth = hazard.radius * 2;
          this.ctx.lineCap = 'round';
          this.ctx.stroke();
          
          this.ctx.strokeStyle = `rgba(165, 180, 252, ${alpha * 0.4})`;
          this.ctx.lineWidth = hazard.radius * 2 + 4;
          this.ctx.stroke();

      } else if (hazard.isPlayerOwned) {
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
          
          this.ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; 
          this.ctx.beginPath();
          this.ctx.arc(0, 0, hazard.radius * pulse, 0, Math.PI * 2);
          this.ctx.fill();
    
          this.ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, hazard.radius * 0.7 * pulse, 0, Math.PI * 2);
          this.ctx.fill();
          
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
      const alpha = particle.lifetime / particle.maxLifetime;
      
      if (particle.style === 'ricochet_trail') {
          this.ctx.beginPath();
          this.ctx.moveTo(particle.from.x, particle.from.y);
          this.ctx.lineTo(particle.to.x, particle.to.y);
          this.ctx.lineCap = 'round';
          this.ctx.lineWidth = particle.width;
          this.ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
          this.ctx.stroke();
      } else if (particle.style === 'spark') {
          this.ctx.beginPath();
          this.ctx.arc(particle.position.x, particle.position.y, particle.radius * alpha, 0, Math.PI * 2);
          this.ctx.fillStyle = particle.color;
          this.ctx.globalAlpha = alpha;
          this.ctx.fill();
          this.ctx.globalAlpha = 1.0;
      } else if (particle.style === 'explosion') {
          this.ctx.save();
          this.ctx.translate(particle.position.x, particle.position.y);
          
          const maxRadius = particle.width;
          const currentRadius = maxRadius * (1 - alpha);
          
          this.ctx.beginPath();
          this.ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
          this.ctx.fillStyle = particle.color;
          this.ctx.globalAlpha = alpha * 0.5;
          this.ctx.fill();
          
          this.ctx.beginPath();
          this.ctx.arc(0, 0, currentRadius * 0.8, 0, Math.PI * 2);
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = 2;
          this.ctx.globalAlpha = alpha;
          this.ctx.stroke();
          
          this.ctx.restore();
      }
  }

  private drawEntity(entity: any) {
    this.ctx.save();
    
    // Position handling - Account for Player Visual Recoil
    let posX = entity.position.x;
    let posY = entity.position.y;
    if (entity.type === EntityType.Player && (entity as PlayerEntity).recoil) {
        const p = entity as PlayerEntity;
        posX += p.recoil.x;
        posY += p.recoil.y;
    }

    this.ctx.translate(posX, posY);
    
    // Rotation handling - Account for Enemy Wobble
    let rotation = entity.rotation || 0;
    if (entity.type === EntityType.Enemy && (entity as EnemyEntity).wobble) {
        const e = entity as EnemyEntity;
        // Simple random jitter based on wobble intensity
        rotation += (Math.random() - 0.5) * e.wobble;
    }
    
    this.ctx.rotate(rotation);

    // Hit Flash Effect: White color if timer active
    if (entity.hitFlashTimer && entity.hitFlashTimer > 0) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#ffffff';
    } else {
        this.ctx.fillStyle = entity.color || '#fff';
        this.ctx.shadowBlur = 0;
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
        // ENEMY PROJECTILES ONLY (Player ones drawn in batch)
        const proj = entity as ProjectileEntity;
        
        // Draw Trail (Legacy non-pooled)
        this.ctx.restore(); // Go back to world space
        this.ctx.save();    // Save world space state for next entity

        if (proj.trail && proj.trail.length > 0) {
            const trailLen = proj.trail.length;
            this.ctx.beginPath();
            let started = false;
            let idx = (proj.trailHead + 1) % trailLen;
            for(let i=0; i<trailLen; i++) {
                const pt = proj.trail[idx];
                if (pt.x === 0 && pt.y === 0) { 
                    idx = (idx + 1) % trailLen;
                    continue; 
                }
                
                if (!started) {
                    this.ctx.moveTo(pt.x, pt.y);
                    started = true;
                } else {
                    this.ctx.lineTo(pt.x, pt.y);
                }
                idx = (idx + 1) % trailLen;
            }
            this.ctx.lineTo(proj.position.x, proj.position.y);
            
            this.ctx.strokeStyle = proj.color;
            this.ctx.lineWidth = proj.radius * 0.8;
            this.ctx.globalAlpha = 0.4;
            this.ctx.lineJoin = 'round';
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
        }
        
        // Re-apply transform
        this.ctx.translate(posX, posY);
        this.ctx.rotate(rotation);

        if (proj.isEnemyProjectile) {
            // Apply visual wobble for enemy projectiles
            const wobbleY = Math.sin(Date.now() / 50 + parseFloat(proj.id.slice(-4))) * 2;
            this.ctx.translate(0, wobbleY);

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
            this.ctx.fillStyle = proj.hitFlashTimer ? '#fff' : proj.color;
            this.ctx.fill();

            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = entity.color;
        }
    } else {
        // Player
        this.ctx.beginPath();
        this.ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(entity.radius, 0);
        this.ctx.stroke();
        
        const player = entity as PlayerEntity;
        const shieldRadius = player.radius + 24; 
        
        // --- 1. POP EFFECT ---
        if (player.shieldPopTimer > 0) {
            const t = 1 - (player.shieldPopTimer / 0.2); 
            const burstRadius = shieldRadius + (t * 20); 
            const alpha = 1 - t;
            
            this.ctx.beginPath();
            this.ctx.arc(0, 0, burstRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(100, 230, 255, ${alpha})`; 
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
            
            this.ctx.fillStyle = `rgba(100, 230, 255, ${alpha * 0.3})`;
            this.ctx.fill();
        }

        // --- 2. PERSISTENT SHIELD VISUALS ---
        if (player.currentShields > 0) {
            const opacity = 0.2 + (player.currentShields / player.maxShields) * 0.4;
            const shieldColor = 'rgba(14, 165, 233,'; 

            const grad = this.ctx.createRadialGradient(0, 0, shieldRadius * 0.7, 0, 0, shieldRadius);
            grad.addColorStop(0, `${shieldColor} 0.0)`);
            grad.addColorStop(0.8, `${shieldColor} ${opacity * 0.3})`);
            grad.addColorStop(1, `${shieldColor} ${opacity * 0.6})`);
            
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
            this.ctx.fill();
            
            const pulse = Math.sin(Date.now() / 200) * 0.1 + 0.9;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, shieldRadius * 0.85 * pulse, 0, Math.PI * 2);
            this.ctx.strokeStyle = `${shieldColor} ${opacity * 0.4})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `${shieldColor} ${opacity * 0.9})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    this.ctx.restore();
  }

  private drawPlayerAbilityUI(player: PlayerEntity, state: GameState) {
      // Calculate position WITH recoil
      // The calling function render() has already restored context, so we are in world space
      // We must manually apply the recoil offset here to sync UI
      const x = player.position.x + player.recoil.x;
      const y = player.position.y + player.recoil.y;
      
      const rotation = player.rotation;
      
      // E. RELOAD UI
      const ringRadius = player.radius + 12;
      
      if (player.isReloading) {
        const reloadPct = 1 - (player.reloadTimer / player.maxReloadTime);
        const isAlmostDone = player.reloadTimer < 0.15;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, ringRadius, rotation, rotation + (Math.PI * 2 * reloadPct));
        this.ctx.strokeStyle = isAlmostDone ? '#ffffff' : '#fbbf24'; 
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
        
        if (isAlmostDone) {
             this.ctx.shadowBlur = 10;
             this.ctx.shadowColor = '#ffffff';
             this.ctx.stroke(); 
             this.ctx.shadowBlur = 0;
        }
      } else {
        const fullCircle = Math.PI * 2;
        const gap = 0.15; 
        
        const segmentArc = (fullCircle - (gap * player.maxAmmo)) / player.maxAmmo;
        
        if (player.maxAmmo > 40) {
             const pct = player.currentAmmo / player.maxAmmo;
             this.ctx.beginPath();
             this.ctx.arc(x, y, ringRadius, rotation, rotation + (fullCircle * pct));
             this.ctx.strokeStyle = '#fbbf24';
             this.ctx.lineWidth = 3;
             this.ctx.stroke();
        } else {
             this.ctx.lineWidth = 3;
             for (let i = 0; i < player.currentAmmo; i++) {
                const angle = rotation + (i * (segmentArc + gap));
                this.ctx.beginPath();
                this.ctx.arc(x, y, ringRadius, angle, angle + segmentArc);
                this.ctx.strokeStyle = '#fbbf24';
                this.ctx.stroke();
            }
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
      const pulseRadius = player.radius + 18;
      
      if (player.dashUnlocked) {
          const dashRadius = player.radius + 22;
          const chargeArc = 0.4;
          const chargeGap = 0.1;
          const totalDashArc = (player.maxDashCharges * chargeArc) + ((player.maxDashCharges - 1) * chargeGap);
          const startDash = rotation - (totalDashArc / 2) + Math.PI; 
          
          for (let i = 0; i < player.maxDashCharges; i++) {
              const angle = startDash + (i * (chargeArc + chargeGap));
              
              this.ctx.beginPath();
              this.ctx.arc(x, y, dashRadius, angle, angle + chargeArc);
              this.ctx.lineWidth = 4;
              
              if (i < player.dashCharges) {
                  this.ctx.strokeStyle = '#6366f1'; 
              } else if (i === player.dashCharges) {
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
      
      if (player.maxRepulseCooldown > 0) {
        if (player.repulseCooldown > 0) {
            const pct = 1 - (player.repulseCooldown / player.maxRepulseCooldown);
            this.ctx.beginPath();
            this.ctx.arc(x, y, pulseRadius, rotation, rotation + (Math.PI * 2 * pct));
            this.ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)'; 
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        } else {
            const pulse = 1 + Math.sin(Date.now() / 250) * 0.08; 
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, pulseRadius * pulse, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)'; 
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
      }

      if (state.enableVfx && player.repulseVisualTimer > 0) {
          const t = 1 - (player.repulseVisualTimer / 0.3); 
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
             this.ctx.beginPath();
             const sides = 6;
             const r = enemy.radius;
             for (let i = 0; i < sides; i++) {
                 const angle = (i * 2 * Math.PI) / sides;
                 this.ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
             }
             this.ctx.closePath();
             
             if (enemy.aiState === 'telegraph_slam' || enemy.aiState === 'telegraph_charge') {
                 this.ctx.fillStyle = '#fbbf24'; 
             } else if (enemy.aiState === 'recovery') {
                 this.ctx.fillStyle = '#64748b'; 
             } else if (enemy.aiState === 'charge') {
                 this.ctx.fillStyle = '#fca5a5'; 
             } else {
                 this.ctx.fillStyle = enemy.hitFlashTimer ? '#fff' : enemy.color;
             }
             this.ctx.fill();

             this.ctx.strokeStyle = '#fff';
             this.ctx.lineWidth = 4;
             this.ctx.stroke();

             if (enemy.aiState === 'telegraph_slam') {
                 this.ctx.save();
                 this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
                 this.ctx.lineWidth = 2;
                 this.ctx.setLineDash([10, 10]);
                 this.ctx.beginPath();
                 this.ctx.arc(0, 0, 280, 0, Math.PI * 2); 
                 this.ctx.stroke();
                 
                 const t = 1 - (enemy.aiStateTimer / 0.8); 
                 this.ctx.fillStyle = `rgba(239, 68, 68, ${0.2 * t})`;
                 this.ctx.fill();
                 
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
                 this.ctx.lineTo(r + arrowLen + 50, 0); 
                 this.ctx.lineTo(r + arrowLen, arrowWidth);
                 this.ctx.lineTo(r + arrowLen, arrowWidth/2);
                 this.ctx.lineTo(r + 10, arrowWidth/2);
                 this.ctx.closePath();
                 
                 this.ctx.fill();
                 this.ctx.stroke();
                 this.ctx.restore();
             }
             
             this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
             this.ctx.beginPath();
             this.ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
             this.ctx.fill();
             break;

        case EnemyVariant.Fast:
            this.ctx.beginPath();
            this.ctx.moveTo(enemy.radius, 0); 
            this.ctx.lineTo(-enemy.radius, -enemy.radius * 0.8);
            this.ctx.lineTo(-enemy.radius * 0.5, 0); 
            this.ctx.lineTo(-enemy.radius, enemy.radius * 0.8);
            this.ctx.closePath();
            this.ctx.fill();
            break;

        case EnemyVariant.Tank:
            this.ctx.beginPath();
            const size = enemy.radius;
            this.ctx.rect(-size, -size, size * 2, size * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.beginPath();
            this.ctx.rect(-size/2, -size/2, size, size);
            this.ctx.fill();
            break;
            
        case EnemyVariant.Shooter:
            this.ctx.beginPath();
            this.ctx.moveTo(enemy.radius, 0);
            this.ctx.lineTo(0, enemy.radius * 0.7);
            this.ctx.lineTo(-enemy.radius, 0);
            this.ctx.lineTo(0, -enemy.radius * 0.7);
            this.ctx.closePath();
            this.ctx.fill();
            
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
            this.ctx.beginPath();
            this.ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
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
