import { PlayerEntity, UpgradeRarity } from '../entities/types';

export type UpgradeFamily = 'BULLETS' | 'DEFENSE' | 'MOBILITY';

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  rarity: UpgradeRarity;
  maxStack: number;
  apply: (player: PlayerEntity) => void;
}

export interface UpgradeTier {
  suffix: string; // e.g., "I", "II", "Max"
  description: string;
  rarity: UpgradeRarity;
  apply: (player: PlayerEntity) => void;
}

export interface UpgradeChain {
  id: string;
  baseName: string;
  family: UpgradeFamily;
  isIdentity?: boolean; // NEW: Marks this as a mutually exclusive Keystone upgrade
  tiers: UpgradeTier[];
}

export interface SynergyMilestone {
    tier: number;
    levelsRequired: number;
    description: string;
}

export const SYNERGY_LEVELS: Record<UpgradeFamily, SynergyMilestone[]> = {
    BULLETS: [
        { tier: 1, levelsRequired: 3, description: "Ricochet +1 Guaranteed Hop" },
        { tier: 2, levelsRequired: 6, description: "Every 5th Shot Applies Vulnerable (1.5s)" },
        { tier: 3, levelsRequired: 9, description: "Ricochets Deal +50% Damage" },
        { tier: 4, levelsRequired: 12, description: "Crit Chance +10% (Flat)" },
        { tier: 5, levelsRequired: 15, description: "Projectiles Pierce +1 Enemy" },
        { tier: 6, levelsRequired: 18, description: "Fire Rate +15% (Uncapped)" },
        { tier: 7, levelsRequired: 21, description: "Critical Hits Deal 200% Damage" },
        { tier: 8, levelsRequired: 24, description: "Vulnerability Effect Doubled (+60% Dmg)" },
        { tier: 9, levelsRequired: 27, description: "Ricochet +1 Hop (Total +2)" },
        { tier: 10, levelsRequired: 30, description: "BULLET STORM: 2x Projectiles, 2x Spread" }
    ],
    DEFENSE: [
        { tier: 1, levelsRequired: 3, description: "Shield Break emits Repulse Pulse" },
        { tier: 2, levelsRequired: 6, description: "Shield Passive Regen (10s Delay)" },
        { tier: 3, levelsRequired: 9, description: "Regen 2x Faster While Stationary" },
        { tier: 4, levelsRequired: 12, description: "Damage Reduction +5%" },
        { tier: 5, levelsRequired: 15, description: "Heal 2 HP on every Kill" },
        { tier: 6, levelsRequired: 18, description: "Max HP +20%" },
        { tier: 7, levelsRequired: 21, description: "Thorns Damage +100%" },
        { tier: 8, levelsRequired: 24, description: "Shield Blocks 2 Hits Before Breaking" },
        { tier: 9, levelsRequired: 27, description: "Damage Reduction +10%" },
        { tier: 10, levelsRequired: 30, description: "JUGGERNAUT: Ignore Stuns & Slows" }
    ],
    MOBILITY: [
        { tier: 1, levelsRequired: 3, description: "Dash Trail Duration +1s" },
        { tier: 2, levelsRequired: 6, description: "Dash Trails Amplify Pulse Damage" },
        { tier: 3, levelsRequired: 9, description: "Dash Cooldown -50% While Moving" },
        { tier: 4, levelsRequired: 12, description: "Move Speed +10%" },
        { tier: 5, levelsRequired: 15, description: "Dodge Chance +10%" },
        { tier: 6, levelsRequired: 18, description: "Max Dash Charges +1" },
        { tier: 7, levelsRequired: 21, description: "Dash Reloads 5 Ammo" },
        { tier: 8, levelsRequired: 24, description: "Movement Speed Soft-Cap Removed" },
        { tier: 9, levelsRequired: 27, description: "Dodge Chance +10%" },
        { tier: 10, levelsRequired: 30, description: "FLASH STEP: Dashes are Instant Teleports" }
    ]
};

export const CHAINS: UpgradeChain[] = [
  // --- IDENTITY UPGRADES (Keystones) ---
  {
    id: 'ballistic_overclock',
    baseName: 'Ballistic Overclock',
    family: 'BULLETS',
    isIdentity: true,
    tiers: [
      { 
        suffix: 'IDENTITY', 
        description: 'Damage +100%, Fire Rate +20%. Max HP reduced by 50%.', 
        rarity: UpgradeRarity.Identity, 
        apply: (p) => { 
          p.damage *= 2.0; 
          p.fireRate *= 0.8; 
          p.maxHealth = Math.floor(p.maxHealth * 0.5); 
          p.health = Math.min(p.health, p.maxHealth); 
        } 
      }
    ]
  },
  {
    id: 'ironclad_hull',
    baseName: 'Ironclad Hull',
    family: 'DEFENSE',
    isIdentity: true,
    tiers: [
      { 
        suffix: 'IDENTITY', 
        description: 'Max HP +300. Dash is DISABLED. Speed -25%.', 
        rarity: UpgradeRarity.Identity, 
        apply: (p) => { 
          p.maxHealth += 300; 
          p.health += 300; 
          p.dashUnlocked = false; 
          p.maxDashCharges = 0; 
          p.speed *= 0.75; 
        } 
      }
    ]
  },
  {
    id: 'phase_runner',
    baseName: 'Phase Runner',
    family: 'MOBILITY',
    isIdentity: true,
    tiers: [
      { 
        suffix: 'IDENTITY', 
        description: 'Dash is Invulnerable. Shields are DISABLED.', 
        rarity: UpgradeRarity.Identity, 
        apply: (p) => { 
          p.dashInvulnerable = true; 
          p.shieldsDisabled = true; 
          p.currentShields = 0; 
          p.maxShields = 0; 
        } 
      }
    ]
  },

  // --- BULLETS FAMILY ---
  {
    id: 'focus_fire',
    baseName: 'Focus Fire',
    family: 'BULLETS',
    tiers: [
      { suffix: 'I', description: '+2 damage per consecutive hit on target.', rarity: UpgradeRarity.Rare, apply: (p) => p.focusFireStacks += 2 },
      { suffix: 'II', description: '+3 damage per consecutive hit.', rarity: UpgradeRarity.Epic, apply: (p) => p.focusFireStacks += 3 },
      { suffix: 'III', description: '+5 damage per consecutive hit.', rarity: UpgradeRarity.Epic, apply: (p) => p.focusFireStacks += 5 },
      { suffix: 'Laser Focus', description: 'Stacks cap at 20 (was 10).', rarity: UpgradeRarity.Legendary, apply: (p) => { /* Cap logic in system */ } }
    ]
  },
  {
    id: 'culling',
    baseName: 'Culling',
    family: 'BULLETS',
    tiers: [
      { suffix: 'I', description: '+30% damage to enemies < 30% HP.', rarity: UpgradeRarity.Common, apply: (p) => p.cullingThreshold = 0.3 },
      { suffix: 'II', description: '+50% damage to enemies < 40% HP.', rarity: UpgradeRarity.Rare, apply: (p) => p.cullingThreshold = 0.4 },
      { suffix: 'III', description: '+100% damage to enemies < 50% HP.', rarity: UpgradeRarity.Epic, apply: (p) => p.cullingThreshold = 0.5 },
      { suffix: 'Executioner', description: 'Instantly kill non-bosses < 20% HP.', rarity: UpgradeRarity.Legendary, apply: (p) => p.cullingThreshold = 0.99 } // Special flag logic
    ]
  },
  {
    id: 'piercing_rounds',
    baseName: 'Piercing Rounds',
    family: 'BULLETS',
    tiers: [
      { suffix: 'I', description: 'Projectiles pass through 1 enemy.', rarity: UpgradeRarity.Rare, apply: (p) => p.piercingCount += 1 },
      { suffix: 'II', description: 'Projectiles pass through 2 enemies.', rarity: UpgradeRarity.Epic, apply: (p) => p.piercingCount += 1 },
      { suffix: 'III', description: 'Projectiles pass through 3 enemies.', rarity: UpgradeRarity.Epic, apply: (p) => p.piercingCount += 1 },
      { suffix: 'Railgun', description: 'Projectiles pass through 5 enemies.', rarity: UpgradeRarity.Legendary, apply: (p) => p.piercingCount += 2 }
    ]
  },
  {
    id: 'multi_shot',
    baseName: 'Multi-Shot',
    family: 'BULLETS',
    tiers: [
      { suffix: 'I', description: 'Fires +1 projectile (Parallel).', rarity: UpgradeRarity.Rare, apply: (p) => p.projectileCount += 1 },
      { suffix: 'II', description: 'Fires +1 projectile (Total 3).', rarity: UpgradeRarity.Epic, apply: (p) => p.projectileCount += 1 },
      { suffix: 'III', description: 'Fires +1 projectile (Total 4).', rarity: UpgradeRarity.Epic, apply: (p) => p.projectileCount += 1 },
      { suffix: 'Volley', description: 'Fires +1 projectile (Total 5).', rarity: UpgradeRarity.Legendary, apply: (p) => p.projectileCount += 1 }
    ]
  },
  {
    id: 'split_shot',
    baseName: 'Split Shot',
    family: 'BULLETS',
    tiers: [
      { suffix: 'I', description: 'Adds +1 Stream.', rarity: UpgradeRarity.Rare, apply: (p) => { p.projectileStreams += 1; } },
      { suffix: 'II', description: 'Adds +1 Stream.', rarity: UpgradeRarity.Epic, apply: (p) => { p.projectileStreams += 1; } },
      { suffix: 'III', description: 'Adds +1 Stream.', rarity: UpgradeRarity.Epic, apply: (p) => { p.projectileStreams += 1; } },
      { suffix: 'Starfish', description: 'Adds +2 Streams.', rarity: UpgradeRarity.Legendary, apply: (p) => { p.projectileStreams += 2; } }
    ]
  },
  {
    id: 'rapid_fire',
    baseName: 'Rapid Fire',
    family: 'BULLETS',
    tiers: [
      { suffix: 'I', description: 'Decreases fire cooldown by 5%.', rarity: UpgradeRarity.Common, apply: (p) => p.fireRate *= 0.95 },
      { suffix: 'II', description: 'Decreases fire cooldown by another 5%.', rarity: UpgradeRarity.Rare, apply: (p) => p.fireRate *= 0.95 },
      { suffix: 'III', description: 'Decreases fire cooldown by another 10%.', rarity: UpgradeRarity.Epic, apply: (p) => p.fireRate *= 0.90 },
      { suffix: 'Minigun', description: 'Decreases cooldown by 15%.', rarity: UpgradeRarity.Legendary, apply: (p) => p.fireRate *= 0.85 }
    ]
  },
  {
    id: 'heavy_rounds',
    baseName: 'Heavy Rounds',
    family: 'BULLETS',
    tiers: [
      { suffix: 'I', description: 'Increases damage by 5.', rarity: UpgradeRarity.Common, apply: (p) => p.damage += 5 },
      { suffix: 'II', description: 'Increases damage by 10.', rarity: UpgradeRarity.Rare, apply: (p) => p.damage += 10 },
      { suffix: 'III', description: 'Increases damage by 20.', rarity: UpgradeRarity.Epic, apply: (p) => p.damage += 20 },
      { suffix: 'Titanium', description: 'Damage +50.', rarity: UpgradeRarity.Legendary, apply: (p) => p.damage += 50 }
    ]
  },
  {
    id: 'ricochet',
    baseName: 'Ricochet',
    family: 'BULLETS',
    tiers: [
      { suffix: 'I', description: 'Projectiles chain to 1 enemy.', rarity: UpgradeRarity.Common, apply: (p) => p.ricochetBounces += 1 },
      { suffix: 'II', description: 'Projectiles chain to 2 enemies.', rarity: UpgradeRarity.Rare, apply: (p) => p.ricochetBounces += 1 },
      { suffix: 'III', description: 'Projectiles chain to 3 enemies.', rarity: UpgradeRarity.Epic, apply: (p) => p.ricochetBounces += 1 },
      { suffix: 'Chain Reaction', description: 'Projectiles chain to 4 enemies.', rarity: UpgradeRarity.Legendary, apply: (p) => p.ricochetBounces += 1 }
    ]
  },
  {
    id: 'bigger_mags',
    baseName: 'Bigger Mags',
    family: 'BULLETS',
    tiers: [
      { suffix: 'I', description: 'Capacity +10.', rarity: UpgradeRarity.Common, apply: (p) => { p.maxAmmo += 10; p.currentAmmo += 10; } },
      { suffix: 'II', description: 'Capacity +10.', rarity: UpgradeRarity.Rare, apply: (p) => { p.maxAmmo += 10; p.currentAmmo += 10; } },
      { suffix: 'III', description: 'Capacity +10.', rarity: UpgradeRarity.Epic, apply: (p) => { p.maxAmmo += 10; p.currentAmmo += 10; } },
      { suffix: 'Bottomless', description: 'Capacity +10.', rarity: UpgradeRarity.Legendary, apply: (p) => { p.maxAmmo += 10; p.currentAmmo += 10; } }
    ]
  },
  {
    id: 'fast_reload',
    baseName: 'Fast Reload',
    family: 'BULLETS',
    tiers: [
      { suffix: 'I', description: 'Reload 10% faster.', rarity: UpgradeRarity.Common, apply: (p) => p.maxReloadTime *= 0.9 },
      { suffix: 'II', description: 'Reload 10% faster.', rarity: UpgradeRarity.Rare, apply: (p) => p.maxReloadTime *= 0.9 },
      { suffix: 'III', description: 'Reload 10% faster.', rarity: UpgradeRarity.Epic, apply: (p) => p.maxReloadTime *= 0.9 },
      { suffix: 'Sleight', description: 'Reload 15% faster.', rarity: UpgradeRarity.Legendary, apply: (p) => p.maxReloadTime *= 0.85 }
    ]
  },

  // --- DEFENSE FAMILY ---
  {
    id: 'siphon',
    baseName: 'Energy Siphon',
    family: 'DEFENSE',
    tiers: [
      { suffix: 'I', description: '5% Chance to regen 1 Shield on kill.', rarity: UpgradeRarity.Rare, apply: (p) => p.shieldSiphonChance += 0.05 },
      { suffix: 'II', description: '10% Chance to regen 1 Shield on kill.', rarity: UpgradeRarity.Epic, apply: (p) => p.shieldSiphonChance += 0.05 },
      { suffix: 'III', description: '15% Chance to regen 1 Shield on kill.', rarity: UpgradeRarity.Epic, apply: (p) => p.shieldSiphonChance += 0.05 },
      { suffix: 'Vampire', description: 'Shield regen on kill guaranteed.', rarity: UpgradeRarity.Legendary, apply: (p) => p.shieldSiphonChance = 1.0 }
    ]
  },
  {
    id: 'fortress',
    baseName: 'Fortress Protocol',
    family: 'DEFENSE',
    tiers: [
      { suffix: 'Unlock', description: 'Stand still for 1s to gain armor.', rarity: UpgradeRarity.Common, apply: (p) => { /* logic in system */ } },
      { suffix: 'II', description: 'Stationary armor +10%.', rarity: UpgradeRarity.Rare, apply: (p) => { /* logic */ } },
      { suffix: 'III', description: 'Stationary regens ammo.', rarity: UpgradeRarity.Epic, apply: (p) => { /* logic */ } },
      { suffix: 'Bunker', description: 'Stationary firing is 2x faster.', rarity: UpgradeRarity.Legendary, apply: (p) => { /* logic */ } }
    ]
  },
  {
    id: 'emergency_protocol',
    baseName: 'Emergency Protocol',
    family: 'DEFENSE',
    tiers: [
      { suffix: 'I', description: 'Invulnerability after hit +0.5s.', rarity: UpgradeRarity.Common, apply: (p) => { /* logic in DamageSystem */ } },
      { suffix: 'II', description: 'Invulnerability after hit +1.0s.', rarity: UpgradeRarity.Rare, apply: (p) => { /* logic */ } },
      { suffix: 'III', description: 'Speed +50% while invulnerable.', rarity: UpgradeRarity.Epic, apply: (p) => { /* logic */ } },
      { suffix: 'Phase Shift', description: 'Taking damage triggers a free pulse.', rarity: UpgradeRarity.Legendary, apply: (p) => p.reactivePulseOnHit = true }
    ]
  },
  {
    id: 'titan_heart',
    baseName: 'Titan Heart',
    family: 'DEFENSE',
    tiers: [
      { suffix: 'I', description: 'Max HP +50, Speed -5%.', rarity: UpgradeRarity.Rare, apply: (p) => { p.maxHealth += 50; p.health += 50; p.speed *= 0.95; } },
      { suffix: 'II', description: 'Max HP +100, Speed -5%.', rarity: UpgradeRarity.Epic, apply: (p) => { p.maxHealth += 100; p.health += 100; p.speed *= 0.95; } },
      { suffix: 'III', description: 'Max HP +150, Speed -5%.', rarity: UpgradeRarity.Epic, apply: (p) => { p.maxHealth += 150; p.health += 150; p.speed *= 0.95; } },
      { suffix: 'Colossus', description: 'Max HP +500. Cannot be knocked back.', rarity: UpgradeRarity.Legendary, apply: (p) => { p.maxHealth += 500; p.health += 500; } }
    ]
  },
  {
    id: 'thorns',
    baseName: 'Thorns',
    family: 'DEFENSE',
    tiers: [
      { suffix: 'I', description: 'Return 5 damage when hit.', rarity: UpgradeRarity.Common, apply: (p) => p.thornsDamage += 5 },
      { suffix: 'II', description: 'Return 10 damage when hit.', rarity: UpgradeRarity.Rare, apply: (p) => p.thornsDamage += 10 },
      { suffix: 'III', description: 'Return 20 damage when hit.', rarity: UpgradeRarity.Epic, apply: (p) => p.thornsDamage += 20 },
      { suffix: 'Spiked Armor', description: 'Return 50 damage when hit.', rarity: UpgradeRarity.Legendary, apply: (p) => p.thornsDamage += 50 }
    ]
  },
  {
    id: 'reactive_pulse',
    baseName: 'Reactive Plating',
    family: 'DEFENSE',
    tiers: [
      { suffix: 'Unlock', description: 'Trigger Pulse when hit (30s CD).', rarity: UpgradeRarity.Rare, apply: (p) => p.reactivePulseOnHit = true },
      { suffix: 'II', description: 'Pulse knocks back further.', rarity: UpgradeRarity.Epic, apply: (p) => p.repulseForceMult *= 1.2 },
      { suffix: 'III', description: 'Pulse deals double damage.', rarity: UpgradeRarity.Epic, apply: (p) => p.repulseDamageMult *= 2.0 },
      { suffix: 'Nova', description: 'Pulse triggers on every 3rd hit.', rarity: UpgradeRarity.Legendary, apply: (p) => { /* Logic Handled in DamageSystem */ } }
    ]
  },
  {
    id: 'momentum_armor',
    baseName: 'Momentum Shield',
    family: 'DEFENSE',
    tiers: [
      { suffix: 'I', description: 'Moving regenerates shield 10% faster.', rarity: UpgradeRarity.Rare, apply: (p) => p.moveSpeedShieldRegen = true },
      { suffix: 'II', description: 'Max Shields +1.', rarity: UpgradeRarity.Epic, apply: (p) => { p.maxShields += 1; p.currentShields += 1; } },
      { suffix: 'III', description: 'Max Shields +1.', rarity: UpgradeRarity.Epic, apply: (p) => { p.maxShields += 1; p.currentShields += 1; } },
      { suffix: 'Kinetic Barrier', description: 'Max Shields +2.', rarity: UpgradeRarity.Legendary, apply: (p) => { p.maxShields += 2; p.currentShields += 2; } }
    ]
  },
  {
    id: 'adaptive_regen',
    baseName: 'Adaptive Regen',
    family: 'DEFENSE',
    tiers: [
      { suffix: 'I', description: 'Heal 5% on wave clear.', rarity: UpgradeRarity.Common, apply: (p) => p.waveHealRatio += 0.05 },
      { suffix: 'II', description: 'Heal 10% on wave clear.', rarity: UpgradeRarity.Rare, apply: (p) => p.waveHealRatio += 0.10 },
      { suffix: 'III', description: 'Heal 15% on wave clear.', rarity: UpgradeRarity.Epic, apply: (p) => p.waveHealRatio += 0.15 },
      { suffix: 'Reconstruction', description: 'Fully heal on wave clear.', rarity: UpgradeRarity.Legendary, apply: (p) => p.waveHealRatio += 1.0 }
    ]
  },
  {
    id: 'shield',
    baseName: 'Shield',
    family: 'DEFENSE',
    tiers: [
      { suffix: 'Unlock', description: 'Blocks 1 hit. Regens on wave.', rarity: UpgradeRarity.Rare, apply: (p) => { p.maxShields += 1; p.currentShields += 1; } },
      { suffix: 'II', description: 'Blocks +1 hit.', rarity: UpgradeRarity.Epic, apply: (p) => { p.maxShields += 1; p.currentShields += 1; } },
      { suffix: 'III', description: 'Blocks +1 hit.', rarity: UpgradeRarity.Epic, apply: (p) => { p.maxShields += 1; p.currentShields += 1; } },
      { suffix: 'Force Field', description: 'Blocks +2 hits.', rarity: UpgradeRarity.Legendary, apply: (p) => { p.maxShields += 2; p.currentShields += 2; } }
    ]
  },
  {
    id: 'vitality',
    baseName: 'Vitality',
    family: 'DEFENSE',
    tiers: [
      { suffix: 'I', description: 'Max HP +20.', rarity: UpgradeRarity.Common, apply: (p) => { p.maxHealth += 20; p.health += 20; } },
      { suffix: 'II', description: 'Max HP +30.', rarity: UpgradeRarity.Rare, apply: (p) => { p.maxHealth += 30; p.health += 30; } },
      { suffix: 'III', description: 'Max HP +50.', rarity: UpgradeRarity.Epic, apply: (p) => { p.maxHealth += 50; p.health += 50; } },
      { suffix: 'Nanites', description: 'Max HP +100.', rarity: UpgradeRarity.Legendary, apply: (p) => { p.maxHealth += 100; p.health = p.maxHealth; } }
    ]
  },
  {
    id: 'iron_skin',
    baseName: 'Iron Skin',
    family: 'DEFENSE',
    tiers: [
      { suffix: 'I', description: 'Damage Taken -10%.', rarity: UpgradeRarity.Common, apply: (p) => p.damageReduction += 0.10 },
      { suffix: 'II', description: 'Damage Taken -10%.', rarity: UpgradeRarity.Rare, apply: (p) => p.damageReduction += 0.10 },
      { suffix: 'III', description: 'Damage Taken -15%.', rarity: UpgradeRarity.Epic, apply: (p) => p.damageReduction += 0.15 },
      { suffix: 'Diamond Plating', description: 'Damage Taken -25%.', rarity: UpgradeRarity.Legendary, apply: (p) => p.damageReduction += 0.25 }
    ]
  },

  // --- MOBILITY FAMILY ---
  {
    id: 'afterburner',
    baseName: 'Afterburner',
    family: 'MOBILITY',
    tiers: [
      { suffix: 'Unlock', description: 'Dash leaves a fire trail.', rarity: UpgradeRarity.Rare, apply: (p) => p.afterburnerEnabled = true },
      { suffix: 'II', description: 'Fire trail lasts 2x longer.', rarity: UpgradeRarity.Epic, apply: (p) => p.dashTrailDuration += 2.0 },
      { suffix: 'III', description: 'Fire trail damage +10.', rarity: UpgradeRarity.Epic, apply: (p) => p.dashTrailDamage += 10 },
      { suffix: 'Napalm', description: 'Trail applies vulnerability.', rarity: UpgradeRarity.Legendary, apply: (p) => { /* System logic */ } }
    ]
  },
  {
    id: 'static_discharge',
    baseName: 'Static Discharge',
    family: 'MOBILITY',
    tiers: [
      { suffix: 'Unlock', description: 'Moving builds charge. Shot releases it.', rarity: UpgradeRarity.Rare, apply: (p) => { /* System logic */ } },
      { suffix: 'II', description: 'Charge builds 50% faster.', rarity: UpgradeRarity.Epic, apply: (p) => { /* System logic */ } },
      { suffix: 'III', description: 'Max charge +100%.', rarity: UpgradeRarity.Epic, apply: (p) => { /* System logic */ } },
      { suffix: 'Storm', description: 'Discharge arcs to enemies.', rarity: UpgradeRarity.Legendary, apply: (p) => { /* System logic */ } }
    ]
  },
  {
    id: 'nitro',
    baseName: 'Nitro',
    family: 'MOBILITY',
    tiers: [
      { suffix: 'I', description: 'Fire rate increases with speed.', rarity: UpgradeRarity.Rare, apply: (p) => p.nitroEnabled = true },
      { suffix: 'II', description: 'Base speed +10%.', rarity: UpgradeRarity.Epic, apply: (p) => p.speed *= 1.1 },
      { suffix: 'III', description: 'Max fire rate cap increased.', rarity: UpgradeRarity.Epic, apply: (p) => { /* Logic */ } },
      { suffix: 'Adrenaline', description: 'Kills boost speed for 2s.', rarity: UpgradeRarity.Legendary, apply: (p) => { /* Logic */ } }
    ]
  },
  {
    id: 'aerodynamics',
    baseName: 'Aerodynamics',
    family: 'MOBILITY',
    tiers: [
      { suffix: 'I', description: 'Dash cooldown -0.5s.', rarity: UpgradeRarity.Common, apply: (p) => p.maxDashCooldown -= 0.5 },
      { suffix: 'II', description: 'Dash distance +20%.', rarity: UpgradeRarity.Rare, apply: (p) => p.dashDuration *= 1.2 },
      { suffix: 'III', description: 'Dash grants brief speed boost.', rarity: UpgradeRarity.Epic, apply: (p) => { /* Logic */ } },
      { suffix: 'Tailwind', description: 'Kills instantly refresh Dash.', rarity: UpgradeRarity.Legendary, apply: (p) => { /* Logic */ } }
    ]
  },
  {
    id: 'skirmisher',
    baseName: 'Skirmisher',
    family: 'MOBILITY',
    tiers: [
      { suffix: 'I', description: 'Move 10% faster while firing.', rarity: UpgradeRarity.Common, apply: (p) => { /* Logic */ } },
      { suffix: 'II', description: 'Damage +10% while moving.', rarity: UpgradeRarity.Rare, apply: (p) => p.momentumDamageMult += 0.1 },
      { suffix: 'III', description: 'Damage +20% while moving.', rarity: UpgradeRarity.Epic, apply: (p) => p.momentumDamageMult += 0.2 },
      { suffix: 'Blitzkrieg', description: 'Firing no longer slows you down.', rarity: UpgradeRarity.Legendary, apply: (p) => { /* Logic */ } }
    ]
  },
  {
    id: 'phasing',
    baseName: 'Phasing',
    family: 'MOBILITY',
    tiers: [
      { suffix: 'I', description: 'Dash makes you ethereal (50% DR).', rarity: UpgradeRarity.Rare, apply: (p) => { /* Logic */ } },
      { suffix: 'II', description: 'Dash makes you ethereal (80% DR).', rarity: UpgradeRarity.Epic, apply: (p) => { /* Logic */ } },
      { suffix: 'III', description: 'Dash lasts 50% longer.', rarity: UpgradeRarity.Epic, apply: (p) => p.dashDuration *= 1.5 },
      { suffix: 'Ghost', description: 'Pass through enemies while dashing.', rarity: UpgradeRarity.Legendary, apply: (p) => { /* Logic */ } }
    ]
  },
  {
    id: 'dash_reload',
    baseName: 'Tactical Reload',
    family: 'MOBILITY',
    tiers: [
      { suffix: 'I', description: 'Dash reloads 2 ammo.', rarity: UpgradeRarity.Common, apply: (p) => p.dashReloadAmount += 2 },
      { suffix: 'II', description: 'Dash reloads 4 ammo.', rarity: UpgradeRarity.Rare, apply: (p) => p.dashReloadAmount += 4 },
      { suffix: 'III', description: 'Dash reloads 8 ammo.', rarity: UpgradeRarity.Epic, apply: (p) => p.dashReloadAmount += 8 },
      { suffix: 'Gun Kata', description: 'Dash fully reloads weapon.', rarity: UpgradeRarity.Legendary, apply: (p) => p.dashReloadAmount += 999 }
    ]
  },
  {
    id: 'run_and_gun',
    baseName: 'Run & Gun',
    family: 'MOBILITY',
    tiers: [
      { suffix: 'I', description: 'Move Speed +5%.', rarity: UpgradeRarity.Common, apply: (p) => p.speed *= 1.05 },
      { suffix: 'II', description: 'Move Speed +10%.', rarity: UpgradeRarity.Rare, apply: (p) => p.speed *= 1.10 },
      { suffix: 'III', description: 'Move Speed +15%.', rarity: UpgradeRarity.Epic, apply: (p) => p.speed *= 1.15 },
      { suffix: 'Blitz', description: 'Speed +25%, Accel +50%.', rarity: UpgradeRarity.Legendary, apply: (p) => { p.speed *= 1.25; } }
    ]
  },
  {
    id: 'kinetic_battery',
    baseName: 'Kinetic Battery',
    family: 'MOBILITY',
    tiers: [
      { suffix: 'I', description: 'Dash cooldown -10%.', rarity: UpgradeRarity.Rare, apply: (p) => p.maxDashCooldown *= 0.9 },
      { suffix: 'II', description: 'Dash cooldown -15%.', rarity: UpgradeRarity.Epic, apply: (p) => p.maxDashCooldown *= 0.85 },
      { suffix: 'III', description: 'Dash cooldown -20%.', rarity: UpgradeRarity.Epic, apply: (p) => p.maxDashCooldown *= 0.8 },
      { suffix: 'Perpetual Motion', description: 'Dash cooldown -30%.', rarity: UpgradeRarity.Legendary, apply: (p) => p.maxDashCooldown *= 0.7 }
    ]
  },
  {
    id: 'swift_vengeance',
    baseName: 'Swift Vengeance',
    family: 'MOBILITY',
    tiers: [
      { suffix: 'I', description: '+20% Damage for 1s after dash.', rarity: UpgradeRarity.Rare, apply: (p) => p.postDashDamageBuff += 0.2 },
      { suffix: 'II', description: '+40% Damage for 1s after dash.', rarity: UpgradeRarity.Epic, apply: (p) => p.postDashDamageBuff += 0.4 },
      { suffix: 'III', description: '+60% Damage for 1s after dash.', rarity: UpgradeRarity.Epic, apply: (p) => p.postDashDamageBuff += 0.6 },
      { suffix: 'Momentum Strike', description: '+100% Damage for 2s after dash.', rarity: UpgradeRarity.Legendary, apply: (p) => p.postDashDamageBuff += 1.0 }
    ]
  },
  {
    id: 'blur',
    baseName: 'Blur',
    family: 'MOBILITY',
    tiers: [
      { suffix: 'I', description: '10% chance to dodge damage.', rarity: UpgradeRarity.Rare, apply: (p) => p.dodgeChance += 0.1 },
      { suffix: 'II', description: '15% chance to dodge damage.', rarity: UpgradeRarity.Epic, apply: (p) => p.dodgeChance += 0.15 },
      { suffix: 'III', description: '20% chance to dodge damage.', rarity: UpgradeRarity.Epic, apply: (p) => p.dodgeChance += 0.2 },
      { suffix: 'Phase', description: '30% chance to dodge damage.', rarity: UpgradeRarity.Legendary, apply: (p) => p.dodgeChance += 0.3 }
    ]
  },
  {
    id: 'lightweight_frame',
    baseName: 'Lightweight Frame',
    family: 'MOBILITY',
    tiers: [
      { suffix: 'I', description: 'Speed +10%.', rarity: UpgradeRarity.Common, apply: (p) => p.speed *= 1.10 },
      { suffix: 'II', description: 'Speed +15%.', rarity: UpgradeRarity.Rare, apply: (p) => p.speed *= 1.15 },
      { suffix: 'III', description: 'Speed +20%.', rarity: UpgradeRarity.Epic, apply: (p) => p.speed *= 1.20 },
      { suffix: 'Featherweight', description: 'Speed +30%.', rarity: UpgradeRarity.Legendary, apply: (p) => p.speed *= 1.30 }
    ]
  },
  {
    id: 'dash',
    baseName: 'Dash',
    family: 'MOBILITY',
    tiers: [
      { suffix: 'Unlock', description: 'Press [SPACE] to Dash.', rarity: UpgradeRarity.Rare, apply: (p) => { p.dashUnlocked = true; p.maxDashCharges = 1; p.dashCharges = 1; } },
      { suffix: 'II', description: '+1 Charge, +Distance.', rarity: UpgradeRarity.Epic, apply: (p) => { p.maxDashCharges += 1; p.dashDuration += 0.05; } },
      { suffix: 'III', description: '+1 Charge, +Distance.', rarity: UpgradeRarity.Epic, apply: (p) => { p.maxDashCharges += 1; p.dashDuration += 0.05; } },
      { suffix: 'Phase Shift', description: 'Dash recharges 2x faster.', rarity: UpgradeRarity.Legendary, apply: (p) => { p.maxDashCooldown *= 0.5; } }
    ]
  },
  {
    id: 'speed_boost',
    baseName: 'Speed Boost',
    family: 'MOBILITY',
    tiers: [
      { suffix: 'I', description: 'Speed +10%.', rarity: UpgradeRarity.Common, apply: (p) => p.speed *= 1.10 },
      { suffix: 'II', description: 'Speed +15%.', rarity: UpgradeRarity.Rare, apply: (p) => p.speed *= 1.15 },
      { suffix: 'III', description: 'Speed +20%.', rarity: UpgradeRarity.Epic, apply: (p) => p.speed *= 1.20 },
      { suffix: 'Overdrive', description: 'Speed +30%.', rarity: UpgradeRarity.Legendary, apply: (p) => p.speed *= 1.30 }
    ]
  }
];