import { EnemyVariant } from '../entities/types';

export const GAME_WIDTH = 800; // Legacy fallback, real size is dynamic
export const GAME_HEIGHT = 600; // Legacy fallback

export const FPS = 60;
export const TIME_STEP = 1 / FPS;

// Player Stats
export const PLAYER_SPEED = 250; // Pixels per second
export const PLAYER_RADIUS = 16;
export const PLAYER_FIRE_RATE = 0.15; // Seconds between shots

// Projectile Stats
export const PROJECTILE_SPEED = 600;
export const PROJECTILE_RADIUS = 4;
export const PROJECTILE_LIFETIME = 2.0; // Seconds

// Enemy Global Stats
export const ENEMY_SPAWN_RATE = 1.5; // Seconds
export const ENEMY_MIN_SPAWN_RATE = 0.3; // Fastest possible spawn rate
export const ENEMY_SEPARATION_RADIUS = 60; // Distance at which enemies try to move apart
export const ENEMY_SEPARATION_FORCE = 0.8; // Lowered to allow tighter swarms

// Difficulty Scaling
export const WAVE_DIFFICULTY_SCALING = 0.05; // 5% stat increase per wave

export const Colors = {
  Player: '#4f46e5', // Indigo 600
  Enemy: '#ef4444',  // Red 500
  Projectile: '#fbbf24', // Amber 400
  Background: '#0f172a', // Slate 900
};

// Enemy Variant Configuration
// TUNING: Increased values to boost economy for 10-wave runs
export const ENEMY_VARIANTS = {
  [EnemyVariant.Basic]: {
    speed: 100,
    radius: 14,
    health: 20, // 2 hits
    damage: 10,
    value: 150, // Was 100
    color: '#ef4444' // Red 500
  },
  [EnemyVariant.Fast]: {
    speed: 180,
    radius: 10,
    health: 10, // 1 hit
    damage: 5,
    value: 250, // Was 150
    color: '#f97316' // Orange 500
  },
  [EnemyVariant.Tank]: {
    speed: 60,
    radius: 20,
    health: 30, // 3 hits (Base)
    damage: 20,
    value: 600, // Was 300
    color: '#991b1b' // Red 800
  }
};