import { PlayerEntity, UpgradeRarity } from '../entities/types';

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
  tiers: UpgradeTier[];
}

export const CHAINS: UpgradeChain[] = [
  {
    id: 'dash',
    baseName: 'Dash',
    tiers: [
      {
        suffix: 'Unlock',
        description: 'Press [SPACE] to Dash. Leaves a damaging trail.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => { p.dashUnlocked = true; p.maxDashCharges = 1; p.dashCharges = 1; }
      },
      {
        suffix: 'II',
        description: '+1 Charge, +Distance, +Trail Duration.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => { p.maxDashCharges += 1; p.dashTrailDuration += 1.0; p.dashDuration += 0.05; }
      },
      {
        suffix: 'III',
        description: '+1 Charge, +Distance, +Trail Damage.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => { p.maxDashCharges += 1; p.dashTrailDamage += 10; p.dashDuration += 0.05; p.dashTrailDuration += 1.0; }
      },
      {
        suffix: 'Phase Shift',
        description: 'Dash recharges 2x faster.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => { p.maxDashCooldown *= 0.5; }
      }
    ]
  },
  {
    id: 'shield',
    baseName: 'Shield',
    tiers: [
      {
        suffix: 'Unlock',
        description: 'Blocks 1 hit per wave. Regenerates on wave start.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => { p.maxShields = 1; p.currentShields = 1; }
      },
      {
        suffix: 'II',
        description: 'Blocks +1 hit per wave.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => { p.maxShields += 1; p.currentShields += 1; }
      },
      {
        suffix: 'III',
        description: 'Blocks +1 hit per wave.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => { p.maxShields += 1; p.currentShields += 1; }
      },
      {
        suffix: 'Force Field',
        description: 'Blocks +2 hits per wave (Total 5).',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => { p.maxShields += 2; p.currentShields += 2; }
      }
    ]
  },
  {
    id: 'multi_shot',
    baseName: 'Multi-Shot',
    tiers: [
      {
        suffix: 'I',
        description: 'Fires +1 projectile (Parallel).',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.projectileCount += 1
      },
      {
        suffix: 'II',
        description: 'Fires +1 projectile (Total 3).',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.projectileCount += 1
      },
      {
        suffix: 'III',
        description: 'Fires +1 projectile (Total 4).',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.projectileCount += 1
      },
      {
        suffix: 'Volley',
        description: 'Fires +1 projectile (Total 5).',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.projectileCount += 1
      }
    ]
  },
  {
    id: 'split_shot',
    baseName: 'Split Shot',
    tiers: [
      {
        suffix: 'I',
        description: 'Adds +1 Stream.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => { p.projectileStreams += 1; }
      },
      {
        suffix: 'II',
        description: 'Adds +1 Stream.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => { p.projectileStreams += 1; }
      },
      {
        suffix: 'III',
        description: 'Adds +1 Stream.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => { p.projectileStreams += 1; }
      },
      {
        suffix: 'Starfish',
        description: 'Adds +2 Streams.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => { p.projectileStreams += 2; }
      }
    ]
  },
  {
    id: 'speed_boost',
    baseName: 'Speed Boost',
    tiers: [
      {
        suffix: 'I',
        description: 'Increases movement speed by 10%.',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.speed *= 1.10
      },
      {
        suffix: 'II',
        description: 'Increases movement speed by another 15%.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.speed *= 1.15
      },
      {
        suffix: 'III',
        description: 'Increases movement speed by another 20%.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.speed *= 1.20
      },
      {
        suffix: 'Overdrive',
        description: 'Maximum velocity. Increases speed by 30%.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.speed *= 1.30
      }
    ]
  },
  {
    id: 'rapid_fire',
    baseName: 'Rapid Fire',
    tiers: [
      {
        suffix: 'I',
        description: 'Decreases fire cooldown by 5%.',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.fireRate *= 0.95
      },
      {
        suffix: 'II',
        description: 'Decreases fire cooldown by another 5%.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.fireRate *= 0.95
      },
      {
        suffix: 'III',
        description: 'Decreases fire cooldown by another 10%.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.fireRate *= 0.90
      },
      {
        suffix: 'Minigun',
        description: 'Maximum fire rate. Decreases cooldown by 15%.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.fireRate *= 0.85
      }
    ]
  },
  {
    id: 'heavy_rounds',
    baseName: 'Heavy Rounds',
    tiers: [
      {
        suffix: 'I',
        description: 'Increases damage by 5.',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.damage += 5
      },
      {
        suffix: 'II',
        description: 'Increases damage by 10.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.damage += 10
      },
      {
        suffix: 'III',
        description: 'Increases damage by 20.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.damage += 20
      },
      {
        suffix: 'Titanium Slugs',
        description: 'Massive damage increase (+50).',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.damage += 50
      }
    ]
  },
  {
    id: 'vitality',
    baseName: 'Vitality',
    tiers: [
      {
        suffix: 'I',
        description: 'Increases Max HP by 20 and heals.',
        rarity: UpgradeRarity.Common,
        apply: (p) => { p.maxHealth += 20; p.health += 20; }
      },
      {
        suffix: 'II',
        description: 'Increases Max HP by 30 and heals.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => { p.maxHealth += 30; p.health += 30; }
      },
      {
        suffix: 'III',
        description: 'Increases Max HP by 50 and heals.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => { p.maxHealth += 50; p.health += 50; }
      },
      {
        suffix: 'Nanites',
        description: 'Increases Max HP by 100 and fully heals.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => { p.maxHealth += 100; p.health = p.maxHealth; }
      }
    ]
  },
  {
    id: 'regeneration',
    baseName: 'Regeneration',
    tiers: [
      {
        suffix: 'I',
        description: 'Heal +5% of missing HP after every wave.',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.waveHealRatio += 0.05
      },
      {
        suffix: 'II',
        description: 'Heal +5% of missing HP after every wave.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.waveHealRatio += 0.05
      },
      {
        suffix: 'III',
        description: 'Heal +5% of missing HP after every wave.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.waveHealRatio += 0.05
      },
      {
        suffix: 'Rebirth',
        description: 'Heal +10% of missing HP after every wave.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.waveHealRatio += 0.10
      }
    ]
  },
  {
    id: 'iron_skin',
    baseName: 'Iron Skin',
    tiers: [
      {
        suffix: 'I',
        description: 'Reduces incoming damage by 10%.',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.damageReduction += 0.10
      },
      {
        suffix: 'II',
        description: 'Reduces incoming damage by another 10%.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.damageReduction += 0.10
      },
      {
        suffix: 'III',
        description: 'Reduces incoming damage by another 15%.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.damageReduction += 0.15
      },
      {
        suffix: 'Diamond Plating',
        description: 'Reduces damage by another 25%. (Total 60%)',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.damageReduction += 0.25
      }
    ]
  },
  {
    id: 'ricochet',
    baseName: 'Ricochet',
    tiers: [
      {
        suffix: 'I',
        description: 'Projectiles chain to 1 additional enemy.',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.ricochetBounces += 1
      },
      {
        suffix: 'II',
        description: 'Projectiles chain to 2 additional enemies.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.ricochetBounces += 1
      },
      {
        suffix: 'III',
        description: 'Projectiles chain to 3 additional enemies.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.ricochetBounces += 1
      },
      {
        suffix: 'Chain Reaction',
        description: 'Projectiles chain to 4 additional enemies.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.ricochetBounces += 1
      }
    ]
  },
  {
    id: 'bigger_mags',
    baseName: 'Bigger Mags',
    tiers: [
      {
        suffix: 'I',
        description: 'Increases mag capacity by 10.',
        rarity: UpgradeRarity.Common,
        apply: (p) => { p.maxAmmo += 10; p.currentAmmo += 10; }
      },
      {
        suffix: 'II',
        description: 'Increases mag capacity by another 10.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => { p.maxAmmo += 10; p.currentAmmo += 10; }
      },
      {
        suffix: 'III',
        description: 'Increases mag capacity by another 10.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => { p.maxAmmo += 10; p.currentAmmo += 10; }
      },
      {
        suffix: 'Bottomless Pit',
        description: 'Increases mag capacity by another 10.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => { p.maxAmmo += 10; p.currentAmmo += 10; }
      }
    ]
  },
  {
    id: 'fast_reload',
    baseName: 'Fast Reload',
    tiers: [
      {
        suffix: 'I',
        description: 'Reloads 10% faster.',
        rarity: UpgradeRarity.Common,
        apply: (p) => p.maxReloadTime *= 0.9
      },
      {
        suffix: 'II',
        description: 'Reloads another 10% faster.',
        rarity: UpgradeRarity.Rare,
        apply: (p) => p.maxReloadTime *= 0.9
      },
      {
        suffix: 'III',
        description: 'Reloads another 10% faster.',
        rarity: UpgradeRarity.Epic,
        apply: (p) => p.maxReloadTime *= 0.9
      },
      {
        suffix: 'Sleight of Hand',
        description: 'Reloads another 15% faster.',
        rarity: UpgradeRarity.Legendary,
        apply: (p) => p.maxReloadTime *= 0.85
      }
    ]
  }
];