
import { GameState, GameStatus } from './GameState';
import { Loop } from './Loop';
import { InputManager } from './InputManager';
import { System } from '../systems/BaseSystem';
import { PlayerEntity, EntityType, EnemyVariant, EnemyEntity, HazardEntity } from '../entities/types';
import { Colors } from '../utils/constants';
import { BALANCE } from '../config/balance';
import { Persistence } from '../utils/persistence';
import { Vec2 } from '../utils/math';

// Import Systems (Order Matters)
import { PlayerSystem } from '../systems/PlayerSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { DamageSystem } from '../systems/DamageSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { MetaProgressionSystem } from '../systems/MetaProgressionSystem';
import { ParticleSystem } from '../systems/ParticleSystem';

type GameEventType = 'score_change' | 'game_over' | 'wave_change' | 'wave_progress' | 'player_health_change' | 'enemy_hit' | 'status_change' | 'wave_intro_timer' | 'boss_health_change';
type GameEventListener = (data?: any) => void;

export class GameEngine {
  public state: GameState;
  public inputManager: InputManager;
  
  private loop: Loop;
  private systems: System[];
  private upgradeSystem: UpgradeSystem;
  private waveSystem: WaveSystem;
  private metaProgressionSystem: MetaProgressionSystem;
  private listeners: Map<GameEventType, Set<GameEventListener>>;
  
  private lastPlayerHealth: number = 100;
  private wasEscapePressed: boolean = false;
  private lastEnemiesRemaining: number = -1;
  private lastBossHealth: number = -1;
  
  // Trackers for hooks
  private previousDashState: boolean = false;
  private hazardContactCooldown: number = 0;

  constructor() {
    this.state = new GameState();
    this.inputManager = new InputManager();
    this.listeners = new Map();
    this.metaProgressionSystem = new MetaProgressionSystem();
    
    // LOAD META PROGRESSION
    const metaData = Persistence.load();
    this.state.metaCurrency = metaData.metaCurrency;
    this.state.metaXP = metaData.metaXP;
    this.state.metaState.currency = metaData.metaCurrency;
    this.state.metaState.xp = metaData.metaXP;
    
    const { level } = this.metaProgressionSystem.getLevelFromXP(this.state.metaState.xp);
    this.state.metaState.level = level;

    if (metaData.equippedStartingPerk !== undefined) {
        this.state.metaState.equippedStartingPerk = metaData.equippedStartingPerk;
    }
    
    this.upgradeSystem = new UpgradeSystem();
    this.waveSystem = new WaveSystem();

    this.systems = [
      new PlayerSystem(),      
      this.waveSystem,         
      new ProjectileSystem(),  
      new EnemySystem(),       
      new CollisionSystem(),   
      new DamageSystem(),
      new ParticleSystem(), // New System      
      this.upgradeSystem,      
      new ProgressionSystem()  
    ];

    this.loop = new Loop(this.update.bind(this));
  }

  init(inputElement: HTMLElement) {
    this.inputManager.attach(inputElement);
  }

  destroy(inputElement: HTMLElement) {
    this.inputManager.detach(inputElement);
    this.loop.stop();
    this.listeners.clear();
  }
  
  resize(width: number, height: number) {
      this.state.worldWidth = width;
      this.state.worldHeight = height;
      if (this.state.player) {
          const p = this.state.player;
          p.position.x = Math.max(p.radius, Math.min(width - p.radius, p.position.x));
          p.position.y = Math.max(p.radius, Math.min(height - p.radius, p.position.y));
      }
  }

  startGame() {
    this.resetRunState();
    this.createDefaultPlayer();
    this.initLevel();
    this.loop.start();
    
    if (this.state.player) {
        this.emit('score_change', this.state.score);
        this.emit('player_health_change', { 
            current: this.state.player.health, 
            max: this.state.player.maxHealth,
            shields: this.state.player.currentShields,
            maxShields: this.state.player.maxShields 
        });
    }
  }

  private resetRunState() {
    this.state.reset(); // This already clears projectiles
    this.inputManager.resetAll();
    this.lastEnemiesRemaining = -1;
    this.lastPlayerHealth = BALANCE.PLAYER.BASE_HP;
    this.lastBossHealth = -1;
    this.previousDashState = false;
    this.hazardContactCooldown = 0;
  }

  private createDefaultPlayer() {
    const player: PlayerEntity = {
      id: 'player',
      type: EntityType.Player,
      position: { x: this.state.worldWidth / 2, y: this.state.worldHeight / 2 },
      velocity: { x: 0, y: 0 },
      radius: 16,
      rotation: 0,
      color: Colors.Player,
      active: true,
      health: BALANCE.PLAYER.BASE_HP,
      maxHealth: BALANCE.PLAYER.BASE_HP,
      cooldown: 0,
      weaponLevel: 1,
      wantsToFire: false,
      invulnerabilityTimer: 0,
      hitFlashTimer: 0,
      
      // VISUALS
      recoil: { x: 0, y: 0 },

      currentAmmo: BALANCE.PLAYER.BASE_AMMO,
      maxAmmo: BALANCE.PLAYER.BASE_AMMO,
      isReloading: false,
      reloadTimer: 0,
      maxReloadTime: BALANCE.PLAYER.RELOAD_TIME,
      repulseCooldown: 0,
      maxRepulseCooldown: BALANCE.PLAYER.REPULSE_COOLDOWN,
      repulseVisualTimer: 0,
      repulseForceMult: 1.0,
      repulseDamage: BALANCE.PLAYER.REPULSE_DAMAGE,
      repulseDamageMult: 1.0,
      dashUnlocked: false,
      dashCooldown: 0,
      maxDashCooldown: BALANCE.PLAYER.DASH_COOLDOWN,
      dashCharges: 0,
      maxDashCharges: 0,
      isDashing: false,
      dashDuration: BALANCE.PLAYER.DASH_DURATION,
      dashTimer: 0,
      dashTrailTimer: 0,
      dashTrailDuration: 3.0,
      dashTrailDamage: BALANCE.PLAYER.DASH_TRAIL_DAMAGE,
      dashFatigue: 0,
      currentShields: 0,
      maxShields: 0,
      shieldHitAnimTimer: 0,
      shieldPopTimer: 0,
      synergyBulletTier: 0,
      synergyMobilityTier: 0,
      synergyDefenseTier: 0,
      shotsFired: 0,
      shieldRegenTimer: 0,
      projectileCount: 1,
      projectileStreams: 1,
      splitAngle: 0.3,
      ricochetBounces: 0,
      ricochetSearchRadius: BALANCE.PLAYER.BASE_RICOCHET_RADIUS,
      piercingCount: 0,
      burstQueue: 0,
      burstTimer: 0,
      speed: BALANCE.PLAYER.BASE_SPEED,
      speedMultiplier: 1.0,
      fireRate: BALANCE.PLAYER.BASE_FIRE_RATE,
      damage: BALANCE.PLAYER.BASE_DAMAGE,
      damageReduction: 0,
      waveHealRatio: BALANCE.WAVE.HEAL_RATIO,
      thornsDamage: 0,
      dodgeChance: 0,
      reactivePulseOnHit: false,
      dashReloadAmount: 0,
      momentumDamageMult: 0,
      moveSpeedShieldRegen: false,
      postDashDamageBuff: 0,
      postDashTimer: 0,
      focusFireStacks: 0,
      cullingThreshold: 0,
      shieldSiphonChance: 0,
      fortressTimer: 0,
      staticCharge: 0,
      afterburnerEnabled: false,
      nitroEnabled: false,
      ricochetEnabled: true,
      shieldsDisabled: false,
      dashInvulnerable: false,
      fireRateMultMoving: 1.0,

      // Perk Flags
      dashPrimePerWave: false,
      dashPrimeUsedThisWave: false,
      autoReloadPerk: false,
      fieldPatchPerk: false
    };
    
    // META PERK INIT
    this.metaProgressionSystem.onRunStart(this.state, player);

    this.state.entityManager.add(player);
    this.state.player = player;
  }

  private initLevel() {
      this.state.wave = 0;
      this.waveSystem.prepareNextWave(this.state);
      this.startWaveIntro();
  }

  enterMetaHub() {
      if (this.state.status === GameStatus.Menu) {
          this.state.status = GameStatus.MetaHub;
          this.emit('status_change', this.state.status);
      }
  }

  exitMetaHub() {
      if (this.state.status === GameStatus.MetaHub) {
          this.state.status = GameStatus.Menu;
          this.emit('status_change', this.state.status);
      }
  }

  equipMetaPerk(perkId: string | null) {
      this.metaProgressionSystem.setEquippedStartingPerk(this.state, perkId);
      Persistence.save({
          metaCurrency: this.state.metaState.currency,
          metaXP: this.state.metaState.xp,
          equippedStartingPerk: this.state.metaState.equippedStartingPerk
      });
  }

  togglePause() {
    if (this.state.status === GameStatus.Playing || this.state.status === GameStatus.WaveIntro) {
      this.state.previousStatus = this.state.status;
      this.state.status = GameStatus.Paused;
      this.inputManager.resetAll();
      this.emit('status_change', this.state.status);
    } else if (this.state.status === GameStatus.Paused) {
      this.state.status = this.state.previousStatus;
      this.inputManager.resetAll();
      this.emit('status_change', this.state.status);
    }
  }
  
  toggleConsole() {
    if (this.state.status === GameStatus.DevConsole) {
        this.state.status = this.state.previousStatus;
        this.inputManager.resetAll();
        this.emit('status_change', this.state.status);
    } 
    else if (
        this.state.status === GameStatus.Playing || 
        this.state.status === GameStatus.WaveIntro || 
        this.state.status === GameStatus.Paused || 
        this.state.status === GameStatus.Shop || 
        this.state.status === GameStatus.Extraction
    ) {
        this.state.previousStatus = this.state.status;
        this.state.status = GameStatus.DevConsole;
        this.inputManager.resetAll();
        this.emit('status_change', this.state.status);
    }
  }

  giveScore(amount: number) {
      if (amount <= 0) return;
      this.state.score += amount;
      this.emit('score_change', this.state.score);
  }
  
  openDevShop() {
      this.state.status = GameStatus.Shop;
      this.inputManager.resetAll();
      this.emit('status_change', this.state.status);
  }

  giveFamilyUpgrades(family: string) {
      this.upgradeSystem.maxOutFamily(this.state, family);
      if (this.state.player) {
          this.emit('player_health_change', { 
                current: this.state.player.health, 
                max: this.state.player.maxHealth,
                shields: this.state.player.currentShields,
                maxShields: this.state.player.maxShields 
          });
      }
  }

  jumpToWave(targetWave: number) {
      if (targetWave < 1) return;
      this.state.clearProjectiles(); // CLEANUP
      this.state.entityManager.removeByType(EntityType.Enemy);
      this.state.entityManager.removeByType(EntityType.Projectile);
      // Remove Hazards but NOT Particles (managed by pool now)
      this.state.entityManager.removeByType(EntityType.Hazard);
      
      this.state.wave = targetWave - 1;
      this.waveSystem.prepareNextWave(this.state);
      if (this.state.player) {
          this.state.player.currentAmmo = this.state.player.maxAmmo;
          this.state.player.isReloading = false;
          this.state.player.reloadTimer = 0;
          this.state.player.wantsToFire = false;
      }
      this.startWaveIntro();
  }

  closeShop() {
      if (this.state.status !== GameStatus.Shop) return;
      this.startWaveIntro();
      this.inputManager.resetAll();
  }

  extract() {
      if (this.state.status !== GameStatus.Extraction) return;
      this.metaProgressionSystem.consolidateRewards(this.state, this.state.runMetaCurrency, this.state.runMetaXP);
      Persistence.save({
          metaCurrency: this.state.metaState.currency,
          metaXP: this.state.metaState.xp,
          equippedStartingPerk: this.state.metaState.equippedStartingPerk
      });
      this.state.status = GameStatus.ExtractionSuccess;
      this.inputManager.resetAll();
      this.emit('status_change', this.state.status);
  }

  completeExtraction() {
      if (this.state.status !== GameStatus.ExtractionSuccess) return;
      this.quitGame();
  }

  continueRun() {
      if (this.state.status !== GameStatus.Extraction) return;
      this.state.hasDefeatedFirstBoss = true;
      this.waveSystem.prepareNextWave(this.state);
      this.state.status = GameStatus.Shop;
      this.emit('status_change', this.state.status);
      this.emit('wave_change', this.state.wave);
      this.inputManager.resetAll();
  }

  resumeGame() {
    if (this.state.status === GameStatus.Paused) {
      this.state.status = this.state.previousStatus;
      this.inputManager.resetAll();
      this.emit('status_change', this.state.status);
    }
  }

  quitGame() {
    this.state.status = GameStatus.Menu;
    this.loop.stop();
    this.inputManager.resetAll();
    this.emit('status_change', this.state.status);
  }

  startWaveIntro() {
      this.state.status = GameStatus.WaveIntro;
      this.state.waveIntroTimer = 3.0;
      this.state.waveActive = false;
      this.inputManager.resetAll();
      this.state.clearProjectiles(); // CLEANUP OLD PROJECTILES 
      
      if (this.state.player) {
          this.state.player.wantsToFire = false;
          this.state.player.burstQueue = 0;
          this.state.player.currentAmmo = this.state.player.maxAmmo;
          this.state.player.isReloading = false;
          this.state.player.reloadTimer = 0;
          
          // FORCE CENTER POSITION
          this.state.player.position.x = this.state.worldWidth / 2;
          this.state.player.position.y = this.state.worldHeight / 2;
          this.state.player.velocity = { x: 0, y: 0 };
          this.state.player.recoil = { x: 0, y: 0 };
          
          // META PERK HOOK: Wave Start
          if (this.state.metaState.equippedStartingPerk) {
              this.metaProgressionSystem.onWaveStart(this.state.player, this.state.metaState.equippedStartingPerk);
          }
      }
      
      this.emit('status_change', this.state.status);
      this.emit('wave_change', this.state.wave);
      this.emit('wave_intro_timer', 3);
  }

  buyUpgrade(upgradeId: string) {
      if (this.state.status !== GameStatus.Shop) return;
      const success = this.upgradeSystem.buyUpgrade(this.state, upgradeId);
      if (success) {
          this.emit('score_change', this.state.score);
          if (this.state.player) {
            this.emit('player_health_change', { 
                current: this.state.player.health, 
                max: this.state.player.maxHealth,
                shields: this.state.player.currentShields,
                maxShields: this.state.player.maxShields 
            });
            this.lastPlayerHealth = this.state.player.health;
          }
      }
  }

  private update(dt: number) {
    const input = this.inputManager.getState();
    
    // 0. Update Game Time & Performance Counters
    this.state.gameTime += dt;
    this.state.resetFrameStats();
    this.state.updateVfxTimers(dt);

    // 2. Update Screenshake
    if (this.state.screenshake.intensity > 0) {
        const { intensity, decay } = this.state.screenshake;
        // Exponential decay
        this.state.screenshake.intensity = Math.max(0, intensity - (intensity * decay * dt));
        // Clamp min
        if (this.state.screenshake.intensity < 0.5) this.state.screenshake.intensity = 0;
        
        if (this.state.screenshake.intensity > 0) {
            this.state.screenshake.offset.x = (Math.random() - 0.5) * this.state.screenshake.intensity;
            this.state.screenshake.offset.y = (Math.random() - 0.5) * this.state.screenshake.intensity;
        } else {
            this.state.screenshake.offset.x = 0;
            this.state.screenshake.offset.y = 0;
        }
    }

    // 3. Update Damage Numbers (Visuals update independent of hitstop)
    for (let i = this.state.damageNumbers.length - 1; i >= 0; i--) {
        const dn = this.state.damageNumbers[i];
        dn.life -= dt;
        if (dn.life <= 0) {
            this.state.damageNumbers.splice(i, 1);
        } else {
            dn.position.x += dn.velocity.x * dt;
            dn.position.y += dn.velocity.y * dt;
            dn.velocity.y += 100 * dt; // Gravity
        }
    }

    // --- HIT STOP CHECK ---
    // If HitStop is active, we skip the physics update but keep rendering/UI events
    if (this.state.hitStopTimer > 0) {
        this.state.hitStopTimer -= dt;
        if (this.state.hitStopTimer < 0) this.state.hitStopTimer = 0;
        return; 
    }

    if (this.state.status !== GameStatus.DevConsole) {
        if (input.escape && !this.wasEscapePressed) {
          this.togglePause();
        }
    }
    this.wasEscapePressed = input.escape;

    if (this.state.status === GameStatus.WaveIntro) {
        this.state.waveIntroTimer -= dt;
        this.emit('wave_intro_timer', Math.ceil(this.state.waveIntroTimer));
        if (this.state.waveIntroTimer <= 0) {
            this.state.status = GameStatus.Playing;
            this.state.waveActive = true;
            this.inputManager.resetAll();
            if (this.state.player) {
                this.state.player.wantsToFire = false;
            }
            this.emit('status_change', this.state.status);
        }
        this.state.entityManager.cleanup();
        return; 
    }

    if (this.state.status !== GameStatus.Playing) return;

    // Hook Data
    const perkId = this.state.metaState.equippedStartingPerk;
    const previousScore = this.state.score;
    const player = this.state.player;
    
    // HOOK: Update Logic (Kinetic Charger etc)
    if (player && perkId) {
        this.metaProgressionSystem.updatePerkLogic(dt, this.state, input);
        
        // HOOK: Detect Dash
        if (player.isDashing && !this.previousDashState) {
            this.metaProgressionSystem.onDash(player, perkId);
        }
        this.previousDashState = player.isDashing;
    }

    // HOOK: Hazard Seals Logic (Manual Override since we can't touch PlayerSystem)
    if (player && perkId === 'pack_seals') {
        // Debounce
        if (this.hazardContactCooldown > 0) this.hazardContactCooldown -= dt;
        
        // Check Contact
        if (this.metaProgressionSystem.shouldApplyHazardSlow(player, perkId)) {
            // Check if Slowed
            if (player.speedMultiplier < 1.0) {
                const hazards = this.state.entityManager.getByType(EntityType.Hazard) as HazardEntity[];
                let inHazard = false;
                for (const h of hazards) {
                    if (!h.isPlayerOwned && Vec2.dist(player.position, h.position) < h.radius + player.radius) {
                        inHazard = true;
                        break;
                    }
                }
                
                if (inHazard && (player.hazardSealsRemaining || 0) > 0) {
                    if (this.hazardContactCooldown <= 0) {
                        this.metaProgressionSystem.consumeHazardSeal(player, perkId);
                        this.hazardContactCooldown = 2.0; // 2s Immunity/Debounce per seal use
                    }
                    player.speedMultiplier = 1.0; // Force Immunity
                } else if (inHazard && (player.hazardSealsRemaining || 0) <= 0) {
                    player.speedMultiplier = 0.45; // Tradeoff: Stronger Slow
                }
            }
        }
    }

    // Capture Health for Hook
    let hpBefore = player ? player.health : 0;

    // --- SYSTEM UPDATE ---
    let prevShields = -1;
    if (this.state.player) prevShields = this.state.player.currentShields;

    for (const system of this.systems) {
      system.update(dt, this.state, input);
    }
    
    // HOOK: Damage Interception (Armor Plating / Scrap Injector)
    if (player && player.active && perkId) {
        const hpAfter = player.health;
        const damageTaken = hpBefore - hpAfter;
        if (damageTaken > 0) {
            const actualDamage = this.metaProgressionSystem.onPlayerDamage(player, perkId, damageTaken);
            // Refund difference
            const refund = damageTaken - actualDamage;
            if (refund > 0) {
                player.health += refund;
            }
        }
    }

    // HOOK: Score Multiplier (Salvage Magnet)
    const currentScore = this.state.score;
    if (currentScore > previousScore && perkId) {
        const gain = currentScore - previousScore;
        const mult = this.metaProgressionSystem.getScoreMultiplier(this.state, perkId);
        if (mult !== 1.0) {
            const bonus = Math.floor(gain * mult) - gain;
            this.state.score += bonus;
        }
    }

    this.state.entityManager.cleanup();

    // Death Check
    if (!this.state.isPlayerAlive) {
      this.state.status = GameStatus.GameOver;
      this.inputManager.resetAll(); 
      
      let recoveredCurrency = 0;
      let recoveredXP = 0;

      if (this.state.hasDefeatedFirstBoss) {
          recoveredCurrency = Math.floor(this.state.runMetaCurrency * 0.25);
          recoveredXP = Math.floor(this.state.runMetaXP * 0.25);
      } else {
          recoveredCurrency = Math.floor(this.state.runMetaCurrency * 0.15);
          recoveredXP = Math.floor(this.state.runMetaXP * 0.15);
      }
      
      // Extractor's Gamble Tradeoff
      if (perkId === 'pack_gamble' && this.state.isBossWave) {
          recoveredXP = 0;
      }

      this.metaProgressionSystem.consolidateRewards(this.state, recoveredCurrency, recoveredXP);
      Persistence.save({
          metaCurrency: this.state.metaState.currency,
          metaXP: this.state.metaState.xp,
          equippedStartingPerk: this.state.metaState.equippedStartingPerk
      });

      this.loop.stop();
      this.emit('game_over');
      this.emit('status_change', GameStatus.GameOver);
      return; 
    }
    
    // Wave Clear
    if (this.state.waveCleared) {
        this.state.entityManager.removeByType(EntityType.Projectile);
        this.state.entityManager.removeByType(EntityType.Hazard);
        this.state.clearProjectiles(); // CLEANUP
        
        // HOOK: Wave Clear
        if (this.state.player && perkId) {
            this.metaProgressionSystem.onWaveClear(this.state, this.state.player, perkId);
        }
        
        // HOOK: Boss Kill Reward
        if (this.state.isBossWave && perkId) {
            this.metaProgressionSystem.onBossKill(this.state, perkId);
        }

        const wasBossWave = this.state.isBossWave; 

        if (wasBossWave) {
            this.state.status = GameStatus.Extraction;
            this.state.waveCleared = false;
            this.emit('status_change', this.state.status);
            this.inputManager.resetAll(); 
            return;
        } else {
            this.waveSystem.prepareNextWave(this.state);
            this.state.status = GameStatus.Shop;
            this.state.waveCleared = false; 
            this.emit('status_change', this.state.status);
            this.emit('wave_change', this.state.wave);
            this.inputManager.resetAll(); 
            return; 
        }
    }

    // Events
    if (this.state.score !== previousScore) {
      this.emit('score_change', this.state.score);
    }
    
    const previousWave = 0; 
    
    let currentEnemiesRemaining = 0;
    if (this.state.waveActive) {
        currentEnemiesRemaining = this.state.getEnemiesRemaining();
    }
    if (currentEnemiesRemaining !== this.lastEnemiesRemaining) {
        this.emit('wave_progress', currentEnemiesRemaining);
        this.lastEnemiesRemaining = currentEnemiesRemaining;
    }
    
    if (this.state.player) {
        const p = this.state.player;
        if (p.health !== this.lastPlayerHealth || p.currentShields !== prevShields) {
            this.emit('player_health_change', { 
                current: p.health, 
                max: p.maxHealth,
                shields: p.currentShields,
                maxShields: p.maxShields 
            });
            this.lastPlayerHealth = p.health;
        }
    }

    if (this.state.hitEvents.length > 0) {
        this.emit('enemy_hit');
    }

    if (this.state.isBossWave) {
        const boss = this.state.entityManager.getAll().find(e => e.type === EntityType.Enemy && (e as EnemyEntity).variant === EnemyVariant.Boss) as EnemyEntity | undefined;
        if (boss) {
            if (boss.health !== this.lastBossHealth) {
                this.emit('boss_health_change', { current: boss.health, max: boss.maxHealth, active: true });
                this.lastBossHealth = boss.health;
            }
        } else {
            if (this.lastBossHealth !== -1) {
                this.emit('boss_health_change', { current: 0, max: 100, active: false });
                this.lastBossHealth = -1;
            }
        }
    } else {
        if (this.lastBossHealth !== -1) {
             this.emit('boss_health_change', { current: 0, max: 100, active: false });
             this.lastBossHealth = -1;
        }
    }
  }

  on(event: GameEventType, listener: GameEventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(listener);
  }

  off(event: GameEventType, listener: GameEventListener) {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: GameEventType, data?: any) {
    this.listeners.get(event)?.forEach(listener => listener(data));
  }
}
