import { EntityManager } from '../entities/EntityManager';
import { PlayerEntity, EnemyEntity, ProjectileEntity, EntityType, EnemyVariant } from '../entities/types';
import { ENEMY_SPAWN_RATE, GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';
import { SpatialHashGrid } from '../utils/spatialHash';

export enum GameStatus {
  Menu = 'menu',
  Playing = 'playing',
  Paused = 'paused',
  GameOver = 'game_over',
  WaveIntro = 'wave_intro', // Countdown before wave starts
  Shop = 'shop', // Upgrade Shop (Opens between waves)
  DevConsole = 'dev_console', // Developer Testing Console
  Extraction = 'extraction', // Post-Boss Risk/Reward Screen
  ExtractionSuccess = 'extraction_success', // Confirmation screen after extracting
  MetaHub = 'meta_hub' // New: Meta Progression Hub
}

export interface HitEvent {
  projectile: ProjectileEntity;
  enemy: EnemyEntity;
}

export interface PlayerHitEvent {
  player: PlayerEntity;
  enemy: EnemyEntity;
}

export interface PlayerProjectileCollisionEvent {
    player: PlayerEntity;
    projectile: ProjectileEntity;
}

export interface WaveWeights {
  [EnemyVariant.Basic]: number;
  [EnemyVariant.Fast]: number;
  [EnemyVariant.Tank]: number;
  [EnemyVariant.Shooter]: number; // Added Shooter
  [EnemyVariant.Boss]: number;
}

/**
 * Persistent Meta Progression State
 * Stores long-term progress that survives individual runs.
 */
export interface MetaState {
    currency: number;
    xp: number;
    level: number; // Derived from XP, stored for easy access
    unlockedMetaCategories: Set<string>;
    equippedStartingPerk: string | null;
    companionSlots: number;
}

/**
 * The single source of truth for the game's data.
 * Systems read from and write to this object.
 * The Renderer reads from this object to draw the frame.
 */
export class GameState {
  entityManager: EntityManager;
  spatialHash: SpatialHashGrid; // Broadphase collision optimization

  status: GameStatus;
  previousStatus: GameStatus; // Track status before pausing
  
  // World Dimensions (Dynamic)
  worldWidth: number;
  worldHeight: number;

  // Global Progression State
  score: number;
  highScore: number;
  wave: number;
  waveActive: boolean; // Is the current wave actively spawning/fighting?
  waveIntroTimer: number; // Countdown timer for WaveIntro state
  waveCleared: boolean; // Flag to indicate wave completion (triggers upgrade/next wave)
  scoreMultiplier: number;
  difficultyMultiplier: number; // Multiplier for enemy stats based on wave
  isBossWave: boolean; // Flag to indicate if current wave is a boss encounter
  
  // META PROGRESSION STATE
  metaCurrency: number; // Legacy Persistent Total (Synced)
  metaXP: number;       // Legacy Persistent Total (Synced)
  
  // NEW: Structured Meta State
  metaState: MetaState;

  runMetaCurrency: number; // Earned this run (At Risk)
  runMetaXP: number;       // Earned this run (At Risk)
  hasDefeatedFirstBoss: boolean; // Flag for death penalty logic
  
  enemySpawnTimer: number;
  enemiesRemainingInWave: number; // Enemies left to spawn in current wave
  waveEnemyWeights: WaveWeights; // Probabilities for spawning enemy variants this wave
  
  // Upgrade Progression
  areUpgradesExhausted: boolean;
  
  // Transient Events (Cleared every frame or consumed by systems)
  hitEvents: HitEvent[];
  playerHitEvents: PlayerHitEvent[];
  playerProjectileCollisionEvents: PlayerProjectileCollisionEvent[]; // New: Enemy Projectile -> Player
  
  // Upgrade State
  // Map of upgradeId -> count owned
  ownedUpgrades: Map<string, number>;
  // Map of familyName -> count owned
  purchasedFamilyCounts: Map<string, number>;
  
  // Queue of upgrades to be processed by UpgradeSystem (external triggers)
  pendingUpgradeIds: string[];
  
  // Cache for quick access to the player entity (performance optimization)
  player: PlayerEntity | null = null; 
  isPlayerAlive: boolean;

  debugMode: boolean = false; // For logging

  constructor() {
    this.entityManager = new EntityManager();
    this.spatialHash = new SpatialHashGrid(64); // 64px cells (~2x max enemy diameter)
    this.status = GameStatus.Menu;
    this.previousStatus = GameStatus.Menu;
    
    // Default to constants, but these will be updated by resize
    this.worldWidth = GAME_WIDTH;
    this.worldHeight = GAME_HEIGHT;

    this.score = 0;
    this.highScore = 0;
    this.wave = 1;
    this.waveActive = false;
    this.waveIntroTimer = 0;
    this.waveCleared = false;
    this.scoreMultiplier = 1;
    this.difficultyMultiplier = 1;
    this.isBossWave = false;
    this.enemySpawnTimer = 0;
    this.enemiesRemainingInWave = 0;
    this.waveEnemyWeights = { 
        [EnemyVariant.Basic]: 1, 
        [EnemyVariant.Fast]: 0, 
        [EnemyVariant.Tank]: 0,
        [EnemyVariant.Shooter]: 0,
        [EnemyVariant.Boss]: 0 
    };
    
    // Init Meta
    this.metaCurrency = 0;
    this.metaXP = 0;
    this.runMetaCurrency = 0;
    this.runMetaXP = 0;
    this.hasDefeatedFirstBoss = false;

    // Init Structured Meta State
    this.metaState = {
        currency: 0,
        xp: 0,
        level: 1, // Default Level 1
        unlockedMetaCategories: new Set<string>(),
        equippedStartingPerk: null,
        companionSlots: 0
    };

    this.areUpgradesExhausted = false;
    this.hitEvents = [];
    this.playerHitEvents = [];
    this.playerProjectileCollisionEvents = [];
    this.ownedUpgrades = new Map();
    this.purchasedFamilyCounts = new Map();
    this.pendingUpgradeIds = [];
    this.isPlayerAlive = true;
  }

  /**
   * Resets the state for a new game session.
   * NOTE: Does NOT reset persistent metaCurrency/metaXP.
   */
  reset() {
    this.entityManager.clear();
    this.spatialHash.clear();
    this.status = GameStatus.Playing;
    this.previousStatus = GameStatus.Playing;
    this.score = 0;
    this.wave = 1;
    this.waveActive = false;
    this.waveIntroTimer = 0;
    this.waveCleared = false;
    this.scoreMultiplier = 1;
    this.difficultyMultiplier = 1;
    this.isBossWave = false;
    this.enemySpawnTimer = 0; // Reset spawn timer ensures immediate spawn or wait depending on logic
    this.enemiesRemainingInWave = 0;
    this.waveEnemyWeights = { 
        [EnemyVariant.Basic]: 1, 
        [EnemyVariant.Fast]: 0, 
        [EnemyVariant.Tank]: 0,
        [EnemyVariant.Shooter]: 0,
        [EnemyVariant.Boss]: 0 
    };
    
    // Reset Run Meta
    this.runMetaCurrency = 0;
    this.runMetaXP = 0;
    this.hasDefeatedFirstBoss = false;

    this.hitEvents = [];
    this.playerHitEvents = [];
    this.playerProjectileCollisionEvents = [];
    this.ownedUpgrades.clear();
    this.purchasedFamilyCounts.clear();
    this.pendingUpgradeIds = [];
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