
import { Vector2 } from '../utils/math';

export enum EntityType {
  Player = 'player',
  Enemy = 'enemy',
  Projectile = 'projectile',
  Particle = 'particle',
  Upgrade = 'upgrade',
  Hazard = 'hazard' 
}

export enum UpgradeRarity {
  Common = 'common',
  Rare = 'rare',
  Epic = 'epic',
  Legendary = 'legendary',
  Identity = 'identity'
}

export enum EnemyVariant {
  Basic = 'basic',
  Fast = 'fast',
  Tank = 'tank',
  Boss = 'boss',
  Shooter = 'shooter'
}

/**
 * Base properties shared by all entities.
 */
export interface BaseEntity {
  id: string;
  type: EntityType;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  rotation: number; 
  color: string;
  active: boolean; 
  hitFlashTimer?: number; 
}

export interface PlayerEntity extends BaseEntity {
  type: EntityType.Player;
  health: number;
  maxHealth: number;
  cooldown: number; 
  weaponLevel: number;
  wantsToFire: boolean; 
  invulnerabilityTimer: number; 
  
  // VISUALS
  recoil: Vector2; 

  // Reload & Ammo
  currentAmmo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadTimer: number;
  maxReloadTime: number;

  // Ability: Repulse Pulse
  repulseCooldown: number;     
  maxRepulseCooldown: number;  
  repulseVisualTimer: number;  
  
  // Ability Scaling
  repulseForceMult: number;
  repulseDamage: number;
  repulseDamageMult: number;

  // Dash Ability
  dashUnlocked: boolean;
  dashCooldown: number;
  maxDashCooldown: number;
  dashCharges: number;
  maxDashCharges: number;
  isDashing: boolean;
  dashDuration: number; 
  dashTimer: number;
  dashTrailTimer: number; 
  dashTrailDuration: number; 
  dashTrailDamage: number; 
  dashFatigue: number; 
  activeDashTrailId?: string; 

  // Shield Ability
  currentShields: number;
  maxShields: number; 
  shieldHitAnimTimer: number; 
  shieldPopTimer: number; 
  
  // SYNERGY STATE
  synergyBulletTier: number; 
  synergyMobilityTier: number; 
  synergyDefenseTier: number; 
  
  shotsFired: number; 
  shieldRegenTimer: number; 

  // Offensive Stats
  projectileCount: number; 
  projectileStreams: number; 
  splitAngle: number; 
  ricochetBounces: number; 
  ricochetSearchRadius: number; 
  piercingCount: number; 
  
  // Bursting
  burstQueue: number; 
  burstTimer: number; 
  
  // Stats
  speed: number;
  speedMultiplier: number; 
  fireRate: number; 
  damage: number;
  
  // Defensive
  damageReduction: number; 
  waveHealRatio: number; 
  thornsDamage: number; 
  dodgeChance: number; 
  reactivePulseOnHit: boolean; 
  
  // Mobility
  dashReloadAmount: number; 
  momentumDamageMult: number; 
  moveSpeedShieldRegen: boolean; 
  postDashDamageBuff: number; 
  postDashTimer: number; 
  
  // MECHANICS
  focusFireTarget?: string; 
  focusFireStacks: number; 
  cullingThreshold: number; 
  shieldSiphonChance: number; 
  fortressTimer: number; 
  staticCharge: number; 
  afterburnerEnabled: boolean; 
  nitroEnabled: boolean; 

  // IDENTITY
  activeIdentityId?: string; 
  ricochetEnabled: boolean; 
  shieldsDisabled: boolean; 
  dashInvulnerable: boolean; 
  fireRateMultMoving: number; 

  // Perks
  dashPrimePerWave: boolean;
  dashPrimeUsedThisWave: boolean;
  autoReloadPerk: boolean;

  // --- OPERATOR STARTING PACK STATE ---
  kineticTimer?: number;
  kineticReady?: boolean;
  armorPlatingActive?: boolean;
  thrusterBurstAvailable?: boolean; 
  overclockTimer?: number;
  baseFireRate?: number; 
  uplinkTimer?: number;
  uplinkActive?: boolean;
  lastRotation?: number; 
  hazardSealsRemaining?: number;
  scrapShieldAmount?: number;
  scrapShieldTimer?: number;
  
  // Just ensuring boolean for the perk flag if strict mode complains
  fieldPatchPerk: boolean;
}

export type BossAiState = 'approach' | 'commit' | 'anchor' | 'telegraph_slam' | 'slam' | 'telegraph_charge' | 'charge' | 'telegraph_hazard' | 'spawn_hazard' | 'recovery';

export interface EnemyEntity extends BaseEntity {
  type: EntityType.Enemy;
  variant: EnemyVariant;
  health: number;
  maxHealth: number;
  damage: number; 
  value: number;  
  
  knockback: Vector2; 
  wobble: number; 

  aiState: BossAiState; 
  aiStateTimer: number;
  orbitDir: number; 
  hasEnteredArena?: boolean; 
  
  attackCooldown: number;
  chargeVector?: Vector2; 
  
  bossVulnTimer?: number;        
  bossVulnIsActive?: boolean;    
  bossVulnNextDuration?: number; 
  
  shootTimer?: number; 
  vulnerableTimer?: number; 
  
  // PERFORMANCE
  lastImpactTime?: number; // GameTime of last visual impact
}

export interface ProjectileEntity extends BaseEntity {
  type: EntityType.Projectile;
  damage: number;
  lifetime: number; 
  maxLifetime: number; 
  ownerId: string;  
  isEnemyProjectile: boolean; 
  
  shape?: 'circle' | 'square' | 'diamond' | 'triangle';

  bouncesRemaining: number;
  piercesRemaining: number; 
  ricochetSearchRadius: number; 
  hitEntityIds: string[]; 
  
  isVulnerabilityShot?: boolean; 
  isRicochet?: boolean; 
  isTankShot?: boolean; 
  isStaticShot?: boolean; 
  
  age?: number; 
  hasBurst?: boolean; 
  isTankFragment?: boolean; 
  
  // --- NEW: Visual Trail (Ring Buffer) ---
  trail: { x: number, y: number }[]; // Reused objects
  trailHead: number; // Index of latest point
}

export interface ParticleEntity extends BaseEntity {
  type: EntityType.Particle;
  style: 'ricochet_trail' | 'spark' | 'impact' | 'muzzle' | 'explosion';
  from: Vector2; // Reused
  to: Vector2;   // Reused
  lifetime: number;
  maxLifetime: number;
  width: number;
}

export interface HazardEntity extends BaseEntity {
    type: EntityType.Hazard;
    damage: number;
    lifetime: number;
    maxLifetime: number;
    tickTimer: number; 
    isPlayerOwned?: boolean; 
    style?: 'circle' | 'line'; 
    from?: Vector2; 
    to?: Vector2;   
}

export interface DamageNumber {
    id: string;
    value: number;
    position: Vector2;
    velocity: Vector2;
    life: number;
    maxLife: number;
    color: string;
    scale: number;
    isCritical?: boolean;
}

export type GameEntity = PlayerEntity | EnemyEntity | ProjectileEntity | ParticleEntity | HazardEntity;
