import { GameState, GameStatus } from './GameState';
import { Loop } from './Loop';
import { InputManager } from './InputManager';
import { System } from '../systems/BaseSystem';
import { PlayerEntity, EntityType } from '../entities/types';
import { GAME_WIDTH, GAME_HEIGHT, Colors, PLAYER_RADIUS, PLAYER_SPEED, PLAYER_FIRE_RATE } from '../utils/constants';

// Import Systems (Order Matters)
import { PlayerSystem } from '../systems/PlayerSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { DamageSystem } from '../systems/DamageSystem';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { WaveSystem } from '../systems/WaveSystem';

type GameEventType = 'score_change' | 'game_over' | 'wave_change' | 'wave_progress' | 'level_up' | 'player_health_change' | 'enemy_hit' | 'status_change' | 'wave_intro_timer';
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
  private wasShopPressed: boolean = false;
  private lastEnemiesRemaining: number = -1;

  constructor() {
    this.state = new GameState();
    this.inputManager = new InputManager();
    this.listeners = new Map();
    
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

  startGame() {
    this.state.reset();
    this.inputManager.reset();
    
    // Spawn Player with Base Stats
    const player: PlayerEntity = {
      id: 'player',
      type: EntityType.Player,
      position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
      velocity: { x: 0, y: 0 },
      radius: PLAYER_RADIUS,
      rotation: 0,
      color: Colors.Player,
      active: true,
      health: 100,
      maxHealth: 100,
      cooldown: 0,
      weaponLevel: 1,
      wantsToFire: false,
      invulnerabilityTimer: 0,
      hitFlashTimer: 0,
      
      // Ammo & Reload
      currentAmmo: 10,
      maxAmmo: 10,
      isReloading: false,
      reloadTimer: 0,
      maxReloadTime: 1.5, // 1.5 Seconds base reload time

      // Ability Stats
      repulseCooldown: 0,
      maxRepulseCooldown: 5.0, // 5 Seconds
      repulseVisualTimer: 0,
      
      // Ability Scaling
      repulseForceMult: 1.0,
      repulseDamage: 10, // Base damage to verify upgrades
      repulseDamageMult: 1.0,

      // Initial Upgradable Stats
      speed: PLAYER_SPEED,
      fireRate: PLAYER_FIRE_RATE,
      damage: 10,
      
      // New Offensive Stats
      projectileCount: 1,
      ricochetBounces: 0,

      damageReduction: 0,
      waveHealRatio: 0.15 // Start with 15% catch-up healing
    };
    
    this.state.entityManager.add(player);
    this.state.player = player;
    this.lastPlayerHealth = player.health;
    this.lastEnemiesRemaining = -1;
    
    // Initialize Wave 1 via WaveSystem to ensure consistent budget/weight logic
    // We set wave to 0 so prepareNextWave increments it to 1
    this.state.wave = 0;
    this.waveSystem.prepareNextWave(this.state);
    
    // Start with Intro
    this.startWaveIntro();
    
    this.loop.start();
    this.emit('score_change', this.state.score);
    this.emit('player_health_change', { current: player.health, max: player.maxHealth });
  }

  togglePause() {
    // Allow pausing if Playing OR LevelUp (Upgrade Menu)
    if (this.state.status === GameStatus.Playing || this.state.status === GameStatus.LevelUp || this.state.status === GameStatus.WaveIntro) {
      this.state.previousStatus = this.state.status;
      this.state.status = GameStatus.Paused;
      this.inputManager.reset(); // Prevent stuck keys
      // We do NOT stop the loop, we just stop processing systems in update()
      // This allows us to keep checking input for resume
      this.emit('status_change', this.state.status);
    } else if (this.state.status === GameStatus.Paused) {
      this.state.status = this.state.previousStatus;
      this.inputManager.reset(); // Prevent stuck keys
      this.emit('status_change', this.state.status);
    }
  }

  toggleShop() {
    // Only allow opening shop if NO active enemies or during Wave Intro
    // Simple check: waveActive is false (during intro or cleared)
    if (!this.state.waveActive || this.state.status === GameStatus.WaveIntro) {
        if (this.state.status === GameStatus.Shop) {
            // Close Shop -> Return to Previous (usually WaveIntro)
            this.state.status = this.state.previousStatus;
            this.inputManager.reset();
            this.emit('status_change', this.state.status);
        } else if (this.state.status === GameStatus.WaveIntro || this.state.status === GameStatus.Playing) { // Allow opening from Intro or Playing (if safe)
            this.state.previousStatus = this.state.status;
            this.state.status = GameStatus.Shop;
            this.inputManager.reset();
            this.emit('status_change', this.state.status);
        }
    }
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
      
      this.emit('status_change', this.state.status);
      this.emit('wave_change', this.state.wave);
      this.emit('wave_intro_timer', 3);
  }

  /**
   * Applies a selected upgrade and resumes the game.
   * Call this from the UI when a user selects an option.
   */
  selectUpgrade(upgradeId: string) {
    if (this.state.status !== GameStatus.LevelUp) return;

    // Verify validity against options (security check)
    const isValidOption = this.state.upgradeOptions.some(u => u.id === upgradeId);
    if (!isValidOption) {
      console.warn("Attempted to select an invalid upgrade option");
      return;
    }

    const success = this.upgradeSystem.applyUpgrade(this.state, upgradeId);
    
    if (success) {
      // Clear options
      this.state.upgradeOptions = [];

      // Clear projectiles for clean slate next wave
      this.state.entityManager.removeByType(EntityType.Projectile);
      
      // Prepare next wave stats
      this.waveSystem.prepareNextWave(this.state);
      
      // Go to Intro
      this.startWaveIntro();
      
      // Reset input
      this.inputManager.reset();

      // Emit health update if upgrade changed maxHealth/health (Vitality)
      if (this.state.player) {
         this.emit('player_health_change', { current: this.state.player.health, max: this.state.player.maxHealth });
         this.lastPlayerHealth = this.state.player.health;
      }
    }
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
            this.emit('player_health_change', { current: this.state.player.health, max: this.state.player.maxHealth });
            this.lastPlayerHealth = this.state.player.health;
          }
      }
  }

  /**
   * --- Main Game Loop ---
   * Called by the Loop class every animation frame.
   */
  private update(dt: number) {
    // 1. Always process global input (Pause & Shop)
    const input = this.inputManager.getState();
    
    // Edge Detection for Escape Key
    if (input.escape && !this.wasEscapePressed) {
      this.togglePause();
    }
    this.wasEscapePressed = input.escape;

    // Edge Detection for Shop Key (U)
    if (input.shop && !this.wasShopPressed) {
        this.toggleShop();
    }
    this.wasShopPressed = input.shop;

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
    // Paused, Menu, GameOver, LevelUp, Shop states do not run physics/logic
    if (this.state.status !== GameStatus.Playing) return;

    const previousScore = this.state.score;
    const previousStatus = this.state.status;
    const previousWave = this.state.wave;

    // 4. Execute System Pipeline
    for (const system of this.systems) {
      system.update(dt, this.state, input);
    }

    // 5. Maintenance (Cleanup dead entities)
    this.state.entityManager.cleanup();

    // 6. Game Over Check
    if (!this.state.isPlayerAlive) {
      this.state.status = GameStatus.GameOver;
      this.loop.stop();
      this.emit('game_over');
      this.emit('status_change', GameStatus.GameOver);
      return; // Stop processing this frame
    }
    
    // 7. Check Wave Completion & Trigger Level Up
    if (this.state.waveCleared) {
        // Try to trigger Level Up
        const triggered = this.upgradeSystem.triggerLevelUp(this.state);
        
        if (triggered) {
            // Game paused inside triggerLevelUp (status changed to LevelUp)

            // Clear projectiles for clean visuals behind menu
            this.state.entityManager.removeByType(EntityType.Projectile);

            this.emit('level_up', this.state.upgradeOptions);
            this.emit('status_change', this.state.status);
            this.inputManager.reset();
            // Return to stop further processing this frame
            return; 
        } else {
            // Upgrades exhausted, proceed directly to next wave

            // Clear projectiles
            this.state.entityManager.removeByType(EntityType.Projectile);

            this.waveSystem.prepareNextWave(this.state);
            this.startWaveIntro();
        }
    }

    // 8. Reactivity
    if (this.state.score !== previousScore) {
      this.emit('score_change', this.state.score);
    }
    
    if (this.state.wave !== previousWave) {
        // Fallback catch, though explicit emits are better
      this.emit('wave_change', this.state.wave);
    }

    // Calculate Enemies Remaining (UI Logic)
    // If wave is active, show count. If in delay, show 0 to indicate "waiting".
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

    // Health Change Check
    if (this.state.player && this.state.player.health !== this.lastPlayerHealth) {
      this.emit('player_health_change', { current: this.state.player.health, max: this.state.player.maxHealth });
      this.lastPlayerHealth = this.state.player.health;
    }

    // Hit Event Feedback
    if (this.state.hitEvents.length > 0) {
        this.emit('enemy_hit');
    }
  }

  /**
   * --- UI Event Bus ---
   * Strictly for notifying the UI of state changes.
   * Gameplay systems should NOT use this.
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