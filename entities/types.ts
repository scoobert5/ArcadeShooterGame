import { Vector2 } from '../utils/math';

export enum EntityType {
  Player = 'player',
  Enemy = 'enemy',
  Projectile = 'projectile',
  Particle = 'particle',
  Upgrade = 'upgrade',
  Hazard = 'hazard' // New entity type for ground zones
}

export enum UpgradeRarity {
  Common = 'common',
  Rare = 'rare',
  Epic = 'epic',
  Legendary = 'legendary'
}

export enum EnemyVariant {
  Basic = 'basic',
  Fast = 'fast',
  Tank = 'tank',
  Boss = 'boss',
  Shooter = 'shooter' // New Ranged Enemy
}

/**
 * Base properties shared by all entities in the game.
 */
export interface BaseEntity {
  id: string;
  type: EntityType;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  rotation: number; // Orientation in radians
  color: string;
  active: boolean; // If false, the entity will be cleaned up by the engine
  hitFlashTimer?: number; // Time in seconds to render the entity white (visual feedback)
}

export interface PlayerEntity extends BaseEntity {
  type: EntityType.Player;
  health: number;
  maxHealth: number;
  cooldown: number; // Time until next shot
  weaponLevel: number;
  wantsToFire: boolean; // Input state for firing intent
  invulnerabilityTimer: number; // Time in seconds until player can take damage again
  
  // Reload & Ammo
  currentAmmo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadTimer: number;
  maxReloadTime: number;

  // Ability: Repulse Pulse
  repulseCooldown: number;     // Current timer
  maxRepulseCooldown: number;  // Time to recharge
  repulseVisualTimer: number;  // For rendering the pulse wave effect
  
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
  dashDuration: number; // How long the velocity override lasts
  dashTimer: number;
  dashTrailTimer: number; // Controls frequency of trail spawn
  dashTrailDuration: number; // How long trail lasts (upgradeable)
  dashTrailDamage: number;
  dashFatigue: number; // 0 to 1, increases with rapid use
  activeDashTrailId?: string; // ID of the currently forming dash trail

  // Shield Ability
  currentShields: number;
  maxShields: number; // 0 means locked
  shieldHitAnimTimer: number; // Visual pop for shield hit (Used for pop visual)
  shieldPopTimer: number; // Dedicated timer for the burst effect
  
  // SYNERGY STATE
  synergyBulletTier: number; // 0-10
  synergyMobilityTier: number; // 0-10
  synergyDefenseTier: number; // 0-10
  
  shotsFired: number; // Counter for Bullet Synergy
  shieldRegenTimer: number; // Timer for Defense Synergy

  // Offensive Stats & Burst Logic
  projectileCount: number; // Number of projectiles fired per stream (Multi-Shot)
  projectileStreams: number; // Number of streams (Split-Shot)
  splitAngle: number; // Total arc in radians for split shot (0 = parallel)
  ricochetBounces: number; // How many times projectiles bounce (Ricochet)
  ricochetSearchRadius: number; // Max distance to look for next ricochet target
  piercingCount: number; // Number of enemies a bullet can pass through
  
  // Multi-Shot Bursting
  burstQueue: number; // How many shots left to fire in current burst
  burstTimer: number; // Time until next burst shot
  
  // Upgradable Stats
  speed: number;
  speedMultiplier: number; // Transient multiplier applied per frame (e.g. slows)
  fireRate: number; // Seconds between shots
  damage: number;
  
  // Defensive Stats
  damageReduction: number; // Percentage reduction (0.0 to 1.0)
  waveHealRatio: number; // Percentage of MISSING health to heal (0.0 to 1.0)
  thornsDamage: number; // Damage returned on hit
  dodgeChance: number; // Chance to ignore damage (0.0 to 1.0)
  reactivePulseOnHit: boolean; // Trigger pulse when hit
  
  // Mobility Mechanics
  dashReloadAmount: number; // Ammo amount reloaded on dash
  momentumDamageMult: number; // Damage multiplier based on speed
  moveSpeedShieldRegen: boolean; // Regen shield faster while moving
  postDashDamageBuff: number; // Multiplier for 1s after dash
  postDashTimer: number; // Timer for buffs
  
  // NEW MECHANICS (Step 22 Expansion)
  focusFireTarget?: string; // ID of enemy last hit
  focusFireStacks: number; // Current bonus damage stacks
  cullingThreshold: number; // HP% to execute/bonus damage
  shieldSiphonChance: number; // Chance to regen shield on kill
  fortressTimer: number; // How long player has been stationary
  staticCharge: number; // Built up charge from movement
  afterburnerEnabled: boolean; // Spawns fire trails on dash
  nitroEnabled: boolean; // Converts speed to fire rate
}

// Added 'telegraph_hazard' and 'spawn_hazard'
export type BossAiState = 'approach' | 'commit' | 'anchor' | 'telegraph_slam' | 'slam' | 'telegraph_charge' | 'charge' | 'telegraph_hazard' | 'spawn_hazard' | 'recovery';

export interface EnemyEntity extends BaseEntity {
  type: EntityType.Enemy;
  variant: EnemyVariant;
  health: number;
  maxHealth: number;
  damage: number; // Damage dealt to player on contact
  value: number;  // Score value when destroyed
  
  // Physics
  knockback: Vector2; // Separate vector for attack impulse forces (decays over time)

  // AI Behavior State
  aiState: BossAiState; 
  aiStateTimer: number;
  orbitDir: number; // 1 (CW) or -1 (CCW)
  hasEnteredArena: boolean; // Tracks if the enemy has fully entered the screen bounds
  
  // Boss Specifics
  attackCooldown: number;
  chargeVector?: Vector2; // Direction locked in for charge
  
  // Ranged & Boss Pulse Logic
  shootTimer?: number; 

  // Status Effects
  vulnerableTimer?: number; // Takes increased damage if > 0
}

export interface ProjectileEntity extends BaseEntity {
  type: EntityType.Projectile;
  damage: number;
  lifetime: number; // Seconds remaining until despawn
  ownerId: string;  // ID of the entity that fired this projectile
  isEnemyProjectile: boolean; // True if fired by an enemy (hurts player, ignored by enemies)
  
  // Ricochet & Pierce State
  bouncesRemaining: number;
  piercesRemaining: number; // New: Number of enemies to pass through
  ricochetSearchRadius: number; // Inherited from player at moment of firing
  hitEntityIds: string[]; // Track which enemies have been hit to prevent bouncing back
  
  // Synergy Properties
  isVulnerabilityShot?: boolean; // Applies vuln on hit
  isRicochet?: boolean; // Is this a bounced projectile?
  isTankShot?: boolean; // Is this a large tank projectile?
  isStaticShot?: boolean; // Consumes static charge for AoE/Dmg
}

export interface ParticleEntity extends BaseEntity {
  type: EntityType.Particle;
  style: 'ricochet_trail';
  from: Vector2;
  to: Vector2;
  lifetime: number;
  maxLifetime: number;
  width: number;
}

export interface HazardEntity extends BaseEntity {
    type: EntityType.Hazard;
    damage: number;
    lifetime: number;
    maxLifetime: number;
    tickTimer: number; // Controls damage tick rate
    isPlayerOwned?: boolean; // For Dash Trails
    style?: 'circle' | 'line'; // Visual style
    from?: Vector2; // Start point for line style
    to?: Vector2;   // End point for line style
}

export type GameEntity = PlayerEntity | EnemyEntity | ProjectileEntity | ParticleEntity | HazardEntity;