import { EntityManager } from '../entities/EntityManager';
import { PlayerEntity, EnemyEntity, ProjectileEntity, EntityType, EnemyVariant } from '../entities/types';
import { ENEMY_SPAWN_RATE } from '../utils/constants';
import { UpgradeDefinition } from '../systems/UpgradeSystem';

export enum GameStatus {
  Menu = 'menu',
  Playing = 'playing',
  Paused = 'paused',
  GameOver = 'game_over',
  LevelUp = 'level_up', // Pauses game for upgrade selection
  WaveIntro = 'wave_intro', // Countdown before wave starts
  Shop = 'shop' // New: Upgrade Shop
}

export interface HitEvent {
  projectile: ProjectileEntity;
  enemy: EnemyEntity;
}

export interface PlayerHitEvent {
  player: PlayerEntity;
  enemy: EnemyEntity;
}

export interface WaveWeights {
  [EnemyVariant.Basic]: number;
  [EnemyVariant.Fast]: number;
  [EnemyVariant.Tank]: number;
}

/**
 * The single source of truth for the game's data.
 * Systems read from and write to this object.
 * The Renderer reads from this object to draw the frame.
 */
export class GameState {
  entityManager: EntityManager;
  status: GameStatus;
  previousStatus: GameStatus; // Track status before pausing
  
  // Global Progression State
  score: number;
  highScore: number;
  wave: number;
  waveActive: boolean; // Is the current wave actively spawning/fighting?
  waveIntroTimer: number; // Countdown timer for WaveIntro state
  waveCleared: boolean; // Flag to indicate wave completion (triggers upgrade/next wave)
  scoreMultiplier: number;
  difficultyMultiplier: number; // Multiplier for enemy stats based on wave
  
  enemySpawnTimer: number;
  enemiesRemainingInWave: number; // Enemies left to spawn in current wave
  waveEnemyWeights: WaveWeights; // Probabilities for spawning enemy variants this wave
  
  // Upgrade Progression
  areUpgradesExhausted: boolean;
  
  // Transient Events (Cleared every frame or consumed by systems)
  hitEvents: HitEvent[];
  playerHitEvents: PlayerHitEvent[];
  
  // Upgrade State
  // Map of upgradeId -> count owned
  ownedUpgrades: Map<string, number>;
  // Queue of upgrades to be processed by UpgradeSystem (external triggers)
  pendingUpgradeIds: string[];
  // Current options presented to the player during LevelUp
  upgradeOptions: UpgradeDefinition[];
  
  // Cache for quick access to the player entity (performance optimization)
  player: PlayerEntity | null = null; 
  isPlayerAlive: boolean;

  constructor() {
    this.entityManager = new EntityManager();
    this.status = GameStatus.Menu;
    this.previousStatus = GameStatus.Menu;
    this.score = 0;
    this.highScore = 0;
    this.wave = 1;
    this.waveActive = false;
    this.waveIntroTimer = 0;
    this.waveCleared = false;
    this.scoreMultiplier = 1;
    this.difficultyMultiplier = 1;
    this.enemySpawnTimer = 0;
    this.enemiesRemainingInWave = 0;
    this.waveEnemyWeights = { [EnemyVariant.Basic]: 1, [EnemyVariant.Fast]: 0, [EnemyVariant.Tank]: 0 };
    this.areUpgradesExhausted = false;
    this.hitEvents = [];
    this.playerHitEvents = [];
    this.ownedUpgrades = new Map();
    this.pendingUpgradeIds = [];
    this.upgradeOptions = [];
    this.isPlayerAlive = true;
  }

  /**
   * Resets the state for a new game session.
   */
  reset() {
    this.entityManager.clear();
    this.status = GameStatus.Playing;
    this.previousStatus = GameStatus.Playing;
    this.score = 0;
    this.wave = 1;
    this.waveActive = false;
    this.waveIntroTimer = 0;
    this.waveCleared = false;
    this.scoreMultiplier = 1;
    this.difficultyMultiplier = 1;
    this.enemySpawnTimer = 0; // Reset spawn timer ensures immediate spawn or wait depending on logic
    this.enemiesRemainingInWave = 0;
    this.waveEnemyWeights = { [EnemyVariant.Basic]: 1, [EnemyVariant.Fast]: 0, [EnemyVariant.Tank]: 0 };
    this.hitEvents = [];
    this.playerHitEvents = [];
    this.ownedUpgrades.clear();
    this.pendingUpgradeIds = [];
    this.upgradeOptions = [];
    this.player = null;
    this.areUpgradesExhausted = false;
    this.isPlayerAlive = true;
  }

  /**
   * Returns the total number of enemies the player must defeat to clear the current wave.
   * Includes enemies yet to spawn and active enemies on screen.
   */
  getEnemiesRemaining(): number {
    const activeEnemies = this.entityManager.getByType(EntityType.Enemy).length;
    return this.enemiesRemainingInWave + activeEnemies;
  }
}