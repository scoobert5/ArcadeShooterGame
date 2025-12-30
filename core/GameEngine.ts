import { GameState, GameStatus } from './GameState';
import { Loop } from './Loop';
import { InputManager } from './InputManager';
import { System } from '../systems/BaseSystem';
import { PlayerEntity, EntityType, EnemyVariant, EnemyEntity } from '../entities/types';
import { Colors } from '../utils/constants';
import { BALANCE } from '../config/balance';
import { Persistence } from '../utils/persistence';

// Import Systems (Order Matters)
import { PlayerSystem } from '../systems/PlayerSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { DamageSystem } from '../systems/DamageSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { WaveSystem } from '../systems/WaveSystem';

type GameEventType = 'score_change' | 'game_over' | 'wave_change' | 'wave_progress' | 'player_health_change' | 'enemy_hit' | 'status_change' | 'wave_intro_timer' | 'boss_health_change';
type GameEventListener = (data?: any) => void;

/**
 * GameEngine
 * - Owns GameState (Source of Truth)
 * - Owns Systems (Rules)
 * - Owns Loop (Time)
 * - Manages interactions between React UI and Game Logic via specific methods/events.
 */
export class GameEngine {
  public state: GameState;
  public inputManager: InputManager;
  
  private loop: Loop;
  private systems: System[];
  // Keep explicit references to special systems for direct calls
  private upgradeSystem: UpgradeSystem;
  private waveSystem: WaveSystem;
  private listeners: Map<GameEventType, Set<GameEventListener>>;
  
  private lastPlayerHealth: number = 100;
  private wasEscapePressed: boolean = false;
  private lastEnemiesRemaining: number = -1;
  private lastBossHealth: number = -1;

  constructor() {
    this.state = new GameState();
    this.inputManager = new InputManager();
    this.listeners = new Map();
    
    // LOAD META PROGRESSION
    const metaData = Persistence.load();
    this.state.metaCurrency = metaData.metaCurrency;
    this.state.metaXP = metaData.metaXP;
    
    this.upgradeSystem = new UpgradeSystem();
    this.waveSystem = new WaveSystem();

    // 1. Define the Fixed System Pipeline
    // Systems are executed sequentially every frame.
    // They do NOT communicate with each other directly.
    this.systems = [
      new PlayerSystem(),      // Input -> Velocity / Actions
      this.waveSystem,         // Wave Progression (Sets limits for EnemySystem, flags waveCleared)
      new ProjectileSystem(),  // Physics (Velocity -> Position)
      new EnemySystem(),       // AI Behavior & Spawning
      new CollisionSystem(),   // Interaction (Overlap detection & resolution)
      new DamageSystem(),      // Logic (Health calculations, Death)
      this.upgradeSystem,      // Logic (Apply pending upgrades)
      new ProgressionSystem()  // Rules (Win/Loss conditions)
    ];

    // 2. Initialize Loop with the update callback
    this.loop = new Loop(this.update.bind(this));
  }

  /**
   * --- Lifecycle Methods ---
   */

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
      
      // If player is out of bounds after resize, clamp them
      if (this.state.player) {
          const p = this.state.player;
          p.position.x = Math.max(p.radius, Math.min(width - p.radius, p.position.x));
          p.position.y = Math.max(p.radius, Math.min(height - p.radius, p.position.y));
      }
  }

  /**
   * Main Entry Point for a new session.
   */
  startGame() {
    this.resetRunState();
    this.createDefaultPlayer();
    this.initLevel();
    
    this.loop.start();
    
    // Initial Emit
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
    this.state.reset();
    this.inputManager.reset();
    this.lastEnemiesRemaining = -1;
    this.lastPlayerHealth = BALANCE.PLAYER.BASE_HP;
    this.lastBossHealth = -1;
  }

  private createDefaultPlayer() {
    // Spawn Player with Base Stats from Config
    const player: PlayerEntity = {
      id: 'player',
      type: EntityType.Player,
      position: { x: this.state.worldWidth / 2, y: this.state.worldHeight / 2 },
      velocity: { x: 0, y: 0 },
      radius: 16, // Physics constant kept inline
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
      
      // Ammo & Reload
      currentAmmo: BALANCE.PLAYER.BASE_AMMO,
      maxAmmo: BALANCE.PLAYER.BASE_AMMO,
      isReloading: false,
      reloadTimer: 0,
      maxReloadTime: BALANCE.PLAYER.RELOAD_TIME,

      // Ability Stats
      repulseCooldown: 0,
      maxRepulseCooldown: BALANCE.PLAYER.REPULSE_COOLDOWN,
      repulseVisualTimer: 0,
      
      // Ability Scaling
      repulseForceMult: 1.0,
      repulseDamage: BALANCE.PLAYER.REPULSE_DAMAGE,
      repulseDamageMult: 1.0,

      // Dash Ability
      dashUnlocked: false, // Default Locked
      dashCooldown: 0,
      maxDashCooldown: BALANCE.PLAYER.DASH_COOLDOWN,
      dashCharges: 0,
      maxDashCharges: 0,
      isDashing: false,
      dashDuration: BALANCE.PLAYER.DASH_DURATION,
      dashTimer: 0,
      dashTrailTimer: 0,
      dashTrailDuration: 3.0, // Base duration set to 3s per requirements
      dashTrailDamage: BALANCE.PLAYER.DASH_TRAIL_DAMAGE,
      dashFatigue: 0,
      activeDashTrailId: undefined,

      // Shield Ability
      currentShields: 0,
      maxShields: 0, // 0 = Locked
      shieldHitAnimTimer: 0,
      shieldPopTimer: 0,

      // Initial Upgradable Stats
      speed: BALANCE.PLAYER.BASE_SPEED,
      speedMultiplier: 1.0,
      fireRate: BALANCE.PLAYER.BASE_FIRE_RATE,
      damage: BALANCE.PLAYER.BASE_DAMAGE,
      
      // New Offensive Stats
      projectileCount: 1,
      projectileStreams: 1,
      splitAngle: 0.3,
      ricochetBounces: 0,
      ricochetSearchRadius: BALANCE.PLAYER.BASE_RICOCHET_RADIUS,
      
      // Burst
      burstQueue: 0,
      burstTimer: 0,

      damageReduction: 0,
      waveHealRatio: BALANCE.WAVE.HEAL_RATIO
    };
    
    this.state.entityManager.add(player);
    this.state.player = player;
  }

  private initLevel() {
      // Initialize Wave 1 via WaveSystem to ensure consistent budget/weight logic
      // We set wave to 0 so prepareNextWave increments it to 1
      this.state.wave = 0;
      this.waveSystem.prepareNextWave(this.state);
      
      // Start with Intro
      this.startWaveIntro();
  }

  togglePause() {
    // Allow pausing if Playing OR WaveIntro
    if (this.state.status === GameStatus.Playing || this.state.status === GameStatus.WaveIntro) {
      this.state.previousStatus = this.state.status;
      this.state.status = GameStatus.Paused;
      this.inputManager.reset(); // Prevent stuck keys
      this.emit('status_change', this.state.status);
    } else if (this.state.status === GameStatus.Paused) {
      this.state.status = this.state.previousStatus;
      this.inputManager.reset(); // Prevent stuck keys
      this.emit('status_change', this.state.status);
    }
  }
  
  /**
   * DEV CONSOLE: Toggles Dev Console visibility
   */
  toggleConsole() {
    // If open, close it
    if (this.state.status === GameStatus.DevConsole) {
        this.state.status = this.state.previousStatus;
        this.inputManager.reset();
        this.emit('status_change', this.state.status);
    } 
    // If closed (and game is running/paused/shop), open it
    else if (
        this.state.status === GameStatus.Playing || 
        this.state.status === GameStatus.WaveIntro || 
        this.state.status === GameStatus.Paused || 
        this.state.status === GameStatus.Shop ||
        this.state.status === GameStatus.Extraction
    ) {
        this.state.previousStatus = this.state.status;
        this.state.status = GameStatus.DevConsole;
        this.inputManager.reset();
        this.emit('status_change', this.state.status);
    }
  }

  /**
   * DEV CONSOLE: Give Score
   */
  giveScore(amount: number) {
      if (amount <= 0) return;
      this.state.score += amount;
      this.emit('score_change', this.state.score);
  }
  
  /**
   * DEV CONSOLE: Open Shop
   * Transitions directly to shop state.
   */
  openDevShop() {
      this.state.status = GameStatus.Shop;
      this.inputManager.reset();
      this.emit('status_change', this.state.status);
  }

  /**
   * DEV CONSOLE: Jump to specific wave
   */
  jumpToWave(targetWave: number) {
      if (targetWave < 1) return;
      
      // 1. Clear Active Entities
      this.state.entityManager.removeByType(EntityType.Enemy);
      this.state.entityManager.removeByType(EntityType.Projectile);
      this.state.entityManager.removeByType(EntityType.Particle);
      this.state.entityManager.removeByType(EntityType.Hazard);
      
      // 2. Setup Wave Counter
      // prepareNextWave increments the wave, so we set it to target - 1
      this.state.wave = targetWave - 1;
      
      // 3. Prepare Wave Logic (Budgets, Boss Checks, etc.)
      this.waveSystem.prepareNextWave(this.state);
      
      // 4. Refill Ammo (Reset Player State for fair test)
      if (this.state.player) {
          this.state.player.currentAmmo = this.state.player.maxAmmo;
          this.state.player.isReloading = false;
          this.state.player.reloadTimer = 0;
          this.state.player.wantsToFire = false;
      }
      
      // 5. Start Wave Intro
      this.startWaveIntro();
  }

  /**
   * Closes the shop and starts the next wave.
   */
  closeShop() {
      if (this.state.status !== GameStatus.Shop) return;
      
      this.startWaveIntro();
      this.inputManager.reset();
  }

  /**
   * Extraction Logic: Bank 100% and Quit
   */
  extract() {
      if (this.state.status !== GameStatus.Extraction) return;

      // Bank 100%
      this.state.metaCurrency += this.state.runMetaCurrency;
      this.state.metaXP += this.state.runMetaXP;
      
      // Save
      Persistence.save({
          metaCurrency: this.state.metaCurrency,
          metaXP: this.state.metaXP
      });

      // Quit
      this.quitGame();
  }

  /**
   * Extraction Logic: Continue (Risk)
   */
  continueRun() {
      if (this.state.status !== GameStatus.Extraction) return;

      // Mark boss as defeated for future checkpoints
      this.state.hasDefeatedFirstBoss = true;

      // Prepare Next Wave (Logic skipped in update loop to hold state)
      this.waveSystem.prepareNextWave(this.state);
      
      // Proceed to Shop
      this.state.status = GameStatus.Shop;
      this.emit('status_change', this.state.status);
      this.emit('wave_change', this.state.wave);
      this.inputManager.reset();
  }

  resumeGame() {
    if (this.state.status === GameStatus.Paused) {
      this.state.status = this.state.previousStatus;
      this.inputManager.reset(); // Prevent stuck keys
      this.emit('status_change', this.state.status);
    }
  }

  quitGame() {
    this.state.status = GameStatus.Menu;
    this.loop.stop();
    this.inputManager.reset(); // Prevent stuck keys
    this.emit('status_change', this.state.status);
  }

  /**
   * Transition to WaveIntro state.
   * This handles the 3-2-1 countdown before gameplay.
   */
  startWaveIntro() {
      this.state.status = GameStatus.WaveIntro;
      this.state.waveIntroTimer = 3.0;
      this.state.waveActive = false; // Wave System should not check clear condition
      
      // Auto-Fill Ammo Loop Fix
      if (this.state.player) {
          this.state.player.currentAmmo = this.state.player.maxAmmo;
          this.state.player.isReloading = false;
          this.state.player.reloadTimer = 0;
      }
      
      this.emit('status_change', this.state.status);
      this.emit('wave_change', this.state.wave);
      this.emit('wave_intro_timer', 3);
  }

  /**
   * Buy an upgrade from the Shop using Score.
   */
  buyUpgrade(upgradeId: string) {
      if (this.state.status !== GameStatus.Shop) return;
      
      const success = this.upgradeSystem.buyUpgrade(this.state, upgradeId);
      if (success) {
          // Update score UI
          this.emit('score_change', this.state.score);
          
          // Update player stats if needed
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

  /**
   * --- Main Game Loop ---
   * Called by the Loop class every animation frame.
   */
  private update(dt: number) {
    // 1. Always process global input (Pause)
    const input = this.inputManager.getState();
    
    // Edge Detection for Escape Key
    // Disabled pause toggle via Escape if in DevConsole (handled by console UI)
    if (this.state.status !== GameStatus.DevConsole) {
        if (input.escape && !this.wasEscapePressed) {
          this.togglePause();
        }
    }
    this.wasEscapePressed = input.escape;

    // 2. Special State: Wave Intro (Countdown)
    if (this.state.status === GameStatus.WaveIntro) {
        this.state.waveIntroTimer -= dt;
        
        // Notify UI of countdown
        this.emit('wave_intro_timer', Math.ceil(this.state.waveIntroTimer));

        if (this.state.waveIntroTimer <= 0) {
            // Start the wave!
            this.state.status = GameStatus.Playing;
            this.state.waveActive = true;
            this.emit('status_change', this.state.status);
        }
        
        // Do NOT run other systems (Player, Enemies, etc.) during intro
        // Maintenance cleanup is fine
        this.state.entityManager.cleanup();
        return; 
    }

    // 3. Guard: Only update game logic if Playing
    // This implicitly pauses the game if Status is DevConsole or Paused
    if (this.state.status !== GameStatus.Playing) return;

    const previousScore = this.state.score;
    const previousStatus = this.state.status;
    const previousWave = this.state.wave;
    
    // Snapshot player state for health change detection
    let prevShields = -1;
    if (this.state.player) prevShields = this.state.player.currentShields;

    // 4. Execute System Pipeline
    for (const system of this.systems) {
      system.update(dt, this.state, input);
    }

    // 5. Maintenance (Cleanup dead entities)
    this.state.entityManager.cleanup();

    // 6. Game Over Check (Death)
    if (!this.state.isPlayerAlive) {
      this.state.status = GameStatus.GameOver;
      
      // DEATH PENALTY LOGIC
      if (this.state.hasDefeatedFirstBoss) {
          // Keep 25%
          this.state.metaCurrency += Math.floor(this.state.runMetaCurrency * 0.25);
          this.state.metaXP += Math.floor(this.state.runMetaXP * 0.25);
      } else {
          // Keep 0%
          // (Designer choice: minimal or 0. Sticking to 0 for simplicity/punishment)
      }
      
      // Save Persistent Progress
      Persistence.save({
          metaCurrency: this.state.metaCurrency,
          metaXP: this.state.metaXP
      });

      this.loop.stop();
      this.emit('game_over');
      this.emit('status_change', GameStatus.GameOver);
      return; // Stop processing this frame
    }
    
    // 7. Check Wave Completion
    if (this.state.waveCleared) {
        // Wave Completed!

        // 1. Clear Projectiles & Hazards
        this.state.entityManager.removeByType(EntityType.Projectile);
        this.state.entityManager.removeByType(EntityType.Hazard);

        const wasBossWave = this.state.isBossWave; // Capture state before next wave prep

        if (wasBossWave) {
            // TRIGGER EXTRACTION
            this.state.status = GameStatus.Extraction;
            this.state.waveCleared = false;
            
            this.emit('status_change', this.state.status);
            this.inputManager.reset();
            return;
        } else {
            // NORMAL FLOW
            this.waveSystem.prepareNextWave(this.state);
            this.state.status = GameStatus.Shop;
            this.state.waveCleared = false; // Reset flag
            
            this.emit('status_change', this.state.status);
            this.emit('wave_change', this.state.wave);
            this.inputManager.reset();
            return; 
        }
    }

    // 8. Reactivity & Events
    if (this.state.score !== previousScore) {
      this.emit('score_change', this.state.score);
    }
    
    if (this.state.wave !== previousWave) {
      this.emit('wave_change', this.state.wave);
    }

    // Calculate Enemies Remaining (UI Logic)
    let currentEnemiesRemaining = 0;
    if (this.state.waveActive) {
        currentEnemiesRemaining = this.state.getEnemiesRemaining();
    }
    
    if (currentEnemiesRemaining !== this.lastEnemiesRemaining) {
        this.emit('wave_progress', currentEnemiesRemaining);
        this.lastEnemiesRemaining = currentEnemiesRemaining;
    }
    
    // Status Change (General catch-all)
    if (this.state.status !== previousStatus) {
      this.emit('status_change', this.state.status);
    }

    // Health/Shield Change Check
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

    // Hit Event Feedback
    if (this.state.hitEvents.length > 0) {
        this.emit('enemy_hit');
    }

    // Boss Health Tracking
    if (this.state.isBossWave) {
        // Find Boss
        const boss = this.state.entityManager.getAll().find(e => e.type === EntityType.Enemy && (e as EnemyEntity).variant === EnemyVariant.Boss) as EnemyEntity | undefined;
        
        if (boss) {
            // Boss exists
            if (boss.health !== this.lastBossHealth) {
                this.emit('boss_health_change', { current: boss.health, max: boss.maxHealth, active: true });
                this.lastBossHealth = boss.health;
            }
        } else {
            // No boss found (dead or not spawned yet)
            if (this.lastBossHealth !== -1) {
                this.emit('boss_health_change', { current: 0, max: 100, active: false });
                this.lastBossHealth = -1;
            }
        }
    } else {
        // Not a boss wave, ensure UI is clear
        if (this.lastBossHealth !== -1) {
             this.emit('boss_health_change', { current: 0, max: 100, active: false });
             this.lastBossHealth = -1;
        }
    }
  }

  /**
   * --- UI Event Bus ---
   */
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