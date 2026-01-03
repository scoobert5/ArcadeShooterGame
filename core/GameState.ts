
import { EntityManager } from '../entities/EntityManager';
import { PlayerEntity, EnemyEntity, ProjectileEntity, EntityType, EnemyVariant, DamageNumber, ParticleEntity } from '../entities/types';
import { ENEMY_SPAWN_RATE, GAME_WIDTH, GAME_HEIGHT, MAX_PLAYER_PROJECTILES, PROJECTILE_RADIUS, PROJECTILE_LIFETIME, Colors, VFX_BUDGET_PARTICLES_PER_FRAME, VFX_BUDGET_DEATHS_PER_SEC } from '../utils/constants';
import { SpatialHashGrid } from '../utils/spatialHash';
import { Vector2, Vec2 } from '../utils/math';

export enum GameStatus {
  Menu = 'menu',
  Playing = 'playing',
  Paused = 'paused',
  GameOver = 'game_over',
  WaveIntro = 'wave_intro', 
  Shop = 'shop', 
  DevConsole = 'dev_console', 
  Extraction = 'extraction', 
  ExtractionSuccess = 'extraction_success', 
  MetaHub = 'meta_hub' 
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
  [EnemyVariant.Shooter]: number; 
  [EnemyVariant.Boss]: number;
}

export interface MetaState {
    currency: number;
    xp: number;
    level: number; 
    unlockedMetaCategories: Set<string>;
    equippedStartingPerk: string | null;
    companionSlots: number;
}

// Particle Definition for Spawning
export interface ParticleDef {
    style: 'ricochet_trail' | 'spark' | 'impact' | 'muzzle' | 'explosion';
    position: { x: number, y: number };
    velocity?: { x: number, y: number };
    color: string;
    lifetime: number;
    radius?: number;
    width?: number;
    from?: { x: number, y: number };
    to?: { x: number, y: number };
}

/**
 * The single source of truth for the game's data.
 */
export class GameState {
  entityManager: EntityManager;
  spatialHash: SpatialHashGrid; 

  status: GameStatus;
  previousStatus: GameStatus; 
  
  worldWidth: number;
  worldHeight: number;
  gameTime: number; // Monotonically increasing game time (seconds)
  currentFps: number = 60; // Approximate FPS for debug

  score: number;
  highScore: number;
  wave: number;
  waveActive: boolean; 
  waveIntroTimer: number; 
  waveCleared: boolean; 
  scoreMultiplier: number;
  difficultyMultiplier: number; 
  isBossWave: boolean; 
  
  metaCurrency: number; 
  metaXP: number;       
  
  metaState: MetaState;

  runMetaCurrency: number; 
  runMetaXP: number;       
  hasDefeatedFirstBoss: boolean; 
  
  enemySpawnTimer: number;
  enemiesRemainingInWave: number; 
  waveEnemyWeights: WaveWeights; 
  
  areUpgradesExhausted: boolean;
  
  hitEvents: HitEvent[];
  playerHitEvents: PlayerHitEvent[];
  playerProjectileCollisionEvents: PlayerProjectileCollisionEvent[]; 
  
  ownedUpgrades: Map<string, number>;
  purchasedFamilyCounts: Map<string, number>;
  
  pendingUpgradeIds: string[];
  
  player: PlayerEntity | null = null; 
  isPlayerAlive: boolean;

  debugMode: boolean = false; 

  // --- JUICE STATE ---
  screenshake: {
      intensity: number;
      decay: number;
      offset: Vector2;
  };
  hitStopTimer: number;
  damageNumbers: DamageNumber[];

  // --- OPTIMIZED POOLS & VFX BUDGET ---
  static readonly MAX_PARTICLES = 300; 
  particlePool: ParticleEntity[];
  activeParticleCount: number = 0; // Updated by ParticleSystem
  
  // VFX Budget Tracking
  vfxState: {
      particlesSpawnedThisFrame: number;
      deathBurstsThisSecond: number;
      secondTimer: number;
      hitsProcessedThisFrame: number;
  };
  
  // Hard cap on player projectiles for FPS stability
  playerProjectilePool: ProjectileEntity[];
  playerProjectileHead: number = 0;
  activePlayerProjectileCount: number = 0; // Approximate tracker

  constructor() {
    this.entityManager = new EntityManager();
    this.spatialHash = new SpatialHashGrid(64); 
    this.status = GameStatus.Menu;
    this.previousStatus = GameStatus.Menu;
    
    this.worldWidth = GAME_WIDTH;
    this.worldHeight = GAME_HEIGHT;
    this.gameTime = 0;

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
    
    this.metaCurrency = 0;
    this.metaXP = 0;
    this.runMetaCurrency = 0;
    this.runMetaXP = 0;
    this.hasDefeatedFirstBoss = false;

    this.metaState = {
        currency: 0,
        xp: 0,
        level: 1, 
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

    this.screenshake = { intensity: 0, decay: 5.0, offset: { x: 0, y: 0 } };
    this.hitStopTimer = 0;
    this.damageNumbers = [];
    
    this.vfxState = {
        particlesSpawnedThisFrame: 0,
        deathBurstsThisSecond: 0,
        secondTimer: 0,
        hitsProcessedThisFrame: 0
    };

    // Initialize Particle Pool
    this.particlePool = [];
    for (let i = 0; i < GameState.MAX_PARTICLES; i++) {
        this.particlePool.push({
            id: `p_${i}`,
            type: EntityType.Particle,
            active: false,
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            radius: 0,
            rotation: 0,
            color: '#fff',
            lifetime: 0,
            maxLifetime: 1,
            style: 'spark',
            from: { x: 0, y: 0 },
            to: { x: 0, y: 0 },
            width: 0
        });
    }

    // Initialize Projectile Pool
    this.playerProjectilePool = [];
    for (let i = 0; i < MAX_PLAYER_PROJECTILES; i++) {
        // Pre-allocate trail array
        const trail = new Array(8).fill(0).map(() => ({ x: 0, y: 0 }));
        
        this.playerProjectilePool.push({
            id: `pp_${i}`,
            type: EntityType.Projectile,
            active: false,
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            radius: PROJECTILE_RADIUS,
            rotation: 0,
            color: Colors.Projectile,
            damage: 0,
            lifetime: 0,
            maxLifetime: PROJECTILE_LIFETIME,
            ownerId: 'player',
            isEnemyProjectile: false,
            bouncesRemaining: 0,
            piercesRemaining: 0,
            ricochetSearchRadius: 0,
            hitEntityIds: [],
            isVulnerabilityShot: false,
            isRicochet: false,
            age: 0,
            trail: trail,
            trailHead: 0
        });
    }
  }

  reset() {
    this.entityManager.clear();
    this.spatialHash.clear();
    this.status = GameStatus.Playing;
    this.previousStatus = GameStatus.Playing;
    this.gameTime = 0;
    this.score = 0;
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

    this.screenshake = { intensity: 0, decay: 5.0, offset: { x: 0, y: 0 } };
    this.hitStopTimer = 0;
    this.damageNumbers = [];
    
    // Clear particles
    for (const p of this.particlePool) {
        p.active = false;
    }
    // Clear projectiles
    for (const p of this.playerProjectilePool) {
        p.active = false;
    }
    this.playerProjectileHead = 0;
    this.activePlayerProjectileCount = 0;
    this.activeParticleCount = 0;
    
    this.vfxState = {
        particlesSpawnedThisFrame: 0,
        deathBurstsThisSecond: 0,
        secondTimer: 0,
        hitsProcessedThisFrame: 0
    };
  }

  getEnemiesRemaining(): number {
    const activeEnemies = this.entityManager.getByType(EntityType.Enemy).length;
    return this.enemiesRemainingInWave + activeEnemies;
  }

  resetFrameStats() {
      this.vfxState.particlesSpawnedThisFrame = 0;
      this.vfxState.hitsProcessedThisFrame = 0;
  }

  updateVfxTimers(dt: number) {
      this.vfxState.secondTimer += dt;
      if (this.vfxState.secondTimer >= 1.0) {
          this.vfxState.secondTimer = 0;
          this.vfxState.deathBurstsThisSecond = 0;
      }
  }

  spawnParticle(def: ParticleDef) {
      // 1. Budget Check
      if (this.vfxState.particlesSpawnedThisFrame >= VFX_BUDGET_PARTICLES_PER_FRAME) return;

      // 2. Find Inactive in Pool
      let p: ParticleEntity | undefined;
      for (let i = 0; i < this.particlePool.length; i++) {
          if (!this.particlePool[i].active) {
              p = this.particlePool[i];
              break;
          }
      }
      
      // If pool full, skip (Hard Cap)
      if (!p) return;

      // 3. Init Particle
      this.vfxState.particlesSpawnedThisFrame++;
      p.active = true;
      p.style = def.style;
      p.position.x = def.position.x;
      p.position.y = def.position.y;
      p.velocity.x = def.velocity?.x || 0;
      p.velocity.y = def.velocity?.y || 0;
      p.color = def.color;
      p.lifetime = def.lifetime;
      p.maxLifetime = def.lifetime;
      p.radius = def.radius || 2;
      p.width = def.width || 0;
      
      if (def.from) { p.from.x = def.from.x; p.from.y = def.from.y; }
      if (def.to) { p.to.x = def.to.x; p.to.y = def.to.y; }
  }

  spawnPlayerProjectile(data: Partial<ProjectileEntity>) {
      // Ring Buffer overwrites oldest
      const p = this.playerProjectilePool[this.playerProjectileHead];
      this.playerProjectileHead = (this.playerProjectileHead + 1) % MAX_PLAYER_PROJECTILES;

      // Reset and Assign
      p.active = true;
      p.position.x = data.position?.x || 0;
      p.position.y = data.position?.y || 0;
      p.velocity.x = data.velocity?.x || 0;
      p.velocity.y = data.velocity?.y || 0;
      p.radius = data.radius || PROJECTILE_RADIUS;
      p.rotation = data.rotation || 0;
      p.color = data.color || Colors.Projectile;
      p.damage = data.damage || 10;
      p.lifetime = data.lifetime || PROJECTILE_LIFETIME;
      p.maxLifetime = data.maxLifetime || PROJECTILE_LIFETIME;
      p.ownerId = data.ownerId || 'player';
      p.isEnemyProjectile = false;
      
      // Upgrades
      p.bouncesRemaining = data.bouncesRemaining || 0;
      p.piercesRemaining = data.piercesRemaining || 0;
      p.ricochetSearchRadius = data.ricochetSearchRadius || 200;
      p.isVulnerabilityShot = !!data.isVulnerabilityShot;
      p.isRicochet = !!data.isRicochet;
      
      // Internal
      p.age = 0;
      // OPTIMIZATION: Reuse existing array instead of allocating new one
      if (p.hitEntityIds) {
          p.hitEntityIds.length = 0;
      } else {
          p.hitEntityIds = []; 
      }
      p.trailHead = 0;
      
      // Reset Trail Points
      if (p.trail) {
          for(let i=0; i<p.trail.length; i++) {
              p.trail[i].x = p.position.x;
              p.trail[i].y = p.position.y;
          }
      }
  }

  addShake(intensity: number) {
      const MAX_SHAKE = 25;
      this.screenshake.intensity = Math.min(MAX_SHAKE, this.screenshake.intensity + intensity);
      this.screenshake.decay = 8.0; 
  }
}
