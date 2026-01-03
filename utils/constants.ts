
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
export const MAX_PLAYER_PROJECTILES = 400; // Hard cap for performance

// Enemy Global Stats
export const ENEMY_SPAWN_RATE = 1.5; // Seconds
export const ENEMY_MIN_SPAWN_RATE = 0.3; // Fastest possible spawn rate
export const ENEMY_SEPARATION_RADIUS = 60; // Distance at which enemies try to move apart
export const ENEMY_SEPARATION_FORCE = 0.8; // Lowered to allow tighter swarms

// VFX & Performance Settings
export const VFX_BUDGET_PARTICLES_PER_FRAME = 60; // Max particles to spawn in a single frame
export const VFX_BUDGET_DEATHS_PER_SEC = 15;     // Max full death explosions per second
export const VFX_IMPACT_COOLDOWN = 0.08;          // Min seconds between impact effects on same enemy
export const VFX_LOD_PROJECTILE_THRESHOLD = 150;  // Active projectiles count to trigger Low Detail Mode

// Difficulty Scaling
export const WAVE_DIFFICULTY_SCALING = 0.05; // 5% stat increase per wave

export const Colors = {
  Player: '#4f46e5', // Indigo 600
  Enemy: '#ef4444',  // Red 500
  Projectile: '#fbbf24', // Amber 400
  EnemyProjectile: '#e879f9', // Fuchsia 400 (Distinct from Amber)
  BossProjectile: '#c084fc', // Purple 400 (Brighter/Distinct)
  Background: '#0f172a', // Slate 900
  Boss: '#7e22ce',   // Purple 700 (Boss Color)
  Shield: '#0ea5e9', // Sky 500
  DashTrail: '#6366f1', // Indigo 500
};

// Enemy Variant Configuration
// TUNING: Reduced values to slow down economy (-25%)
export const ENEMY_VARIANTS = {
  [EnemyVariant.Basic]: {
    speed: 100,
    radius: 14,
    health: 20, // 2 hits
    damage: 10,
    value: 60, // Was 80
    color: '#ef4444' // Red 500
  },
  [EnemyVariant.Fast]: {
    speed: 180,
    radius: 10,
    health: 10, // 1 hit
    damage: 5,
    value: 90, // Was 120
    color: '#f97316' // Orange 500
  },
  [EnemyVariant.Tank]: {
    speed: 60,
    radius: 20,
    health: 30, // 3 hits (Base)
    damage: 20,
    value: 225, // Was 300
    color: '#991b1b' // Red 800
  },
  [EnemyVariant.Shooter]: {
    speed: 75,    // Slower, cautious
    radius: 14,
    health: 15,   // Fragile
    damage: 10,   // Projectile damage
    value: 110,   // Was 150
    color: '#d946ef' // Fuchsia 500
  },
  [EnemyVariant.Boss]: {
    speed: 85,   // Was 75 - Faster baseline
    radius: 65,  // Was 60 - Larger physical presence
    health: 1400, // Was 1200 - More durable
    damage: 35, 
    value: 5000, 
    color: Colors.Boss
  }
};
