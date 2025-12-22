import { Vector2 } from '../utils/math';

export enum EntityType {
  Player = 'player',
  Enemy = 'enemy',
  Projectile = 'projectile',
  Particle = 'particle',
  Upgrade = 'upgrade',
}

export interface BaseEntity {
  id: string;
  type: EntityType;
  position: Vector2;
  velocity: Vector2;
  radius: number;
  color: string;
  active: boolean;
}

export interface PlayerEntity extends BaseEntity {
  type: EntityType.Player;
  health: number;
  maxHealth: number;
  weaponLevel: number;
  cooldown: number;
}

export interface EnemyEntity extends BaseEntity {
  type: EntityType.Enemy;
  health: number;
  value: number; // Score value
}

export interface ProjectileEntity extends BaseEntity {
  type: EntityType.Projectile;
  damage: number;
  ownerId: string; // Who fired it
  lifetime: number;
}

// Union type for all entities
export type GameEntity = PlayerEntity | EnemyEntity | ProjectileEntity;