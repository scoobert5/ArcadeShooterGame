import { Vector2 } from '../utils/math';

export enum EntityType {
  Player = 'player',
  Enemy = 'enemy',
  Projectile = 'projectile',
  Particle = 'particle',
  Upgrade = 'upgrade'
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
  Tank = 'tank'
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

  // Offensive Stats
  projectileCount: number; // Number of projectiles fired per shot (Multi-Shot)
  ricochetBounces: number; // How many times projectiles bounce (Ricochet)
  
  // Upgradable Stats
  speed: number;
  fireRate: number; // Seconds between shots
  damage: number;
  
  // Defensive Stats
  damageReduction: number; // Percentage reduction (0.0 to 1.0)
  waveHealRatio: number; // Percentage of MISSING health to heal (0.0 to 1.0)
}

export interface EnemyEntity extends BaseEntity {
  type: EntityType.Enemy;
  variant: EnemyVariant;
  health: number;
  maxHealth: number;
  damage: number; // Damage dealt to player on contact
  value: number;  // Score value when destroyed
  
  // Physics
  knockback: Vector2; // Separate vector for impulse forces (decays over time)

  // AI Behavior State
  aiState: 'approach' | 'commit';
  aiStateTimer: number;
  orbitDir: number; // 1 (CW) or -1 (CCW)
  hasEnteredArena: boolean; // Tracks if the enemy has fully entered the screen bounds
}

export interface ProjectileEntity extends BaseEntity {
  type: EntityType.Projectile;
  damage: number;
  lifetime: number; // Seconds remaining until despawn
  ownerId: string;  // ID of the entity that fired this projectile
  
  // Ricochet State
  bouncesRemaining: number;
  hitEntityIds: string[]; // Track which enemies have been hit to prevent bouncing back
}

export type GameEntity = PlayerEntity | EnemyEntity | ProjectileEntity;