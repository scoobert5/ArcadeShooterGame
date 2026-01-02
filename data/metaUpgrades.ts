
export enum MetaCategory {
  BASE_CHASSIS = 'BASE_CHASSIS',
  STARTING_PERKS = 'STARTING_PERKS',
  COMPANIONS = 'COMPANIONS',
  AMMO_ARCHETYPES = 'AMMO_ARCHETYPES',
  ARMOR_ARCHETYPES = 'ARMOR_ARCHETYPES'
}

export type PerkBranch = 'OFFENSE' | 'DEFENSE' | 'MOBILITY';

export interface MetaUpgradeNode {
  id: string;
  category: MetaCategory;
  name: string;
  description: string;
  requiredLevel: number; // Player Meta Level required
  branch?: PerkBranch;
  prerequisites?: string[]; // IDs of required previous nodes
  mutuallyExclusiveGroup?: string; // Only one from this group can be equipped (handled by UI logic mainly)
}

// LEVEL CURVE CONSTANTS
export const LEVEL_BASE_XP = 100;
export const LEVEL_XP_GROWTH = 50;

export const META_CATEGORIES: Record<MetaCategory, MetaUpgradeNode[]> = {
  [MetaCategory.BASE_CHASSIS]: [
    { id: 'chassis_mk1', category: MetaCategory.BASE_CHASSIS, name: 'Standard Chassis', description: 'The reliable standard issue frame.', requiredLevel: 1 },
    { id: 'chassis_mk2', category: MetaCategory.BASE_CHASSIS, name: 'Heavy Chassis', description: 'Reinforced plating for stationary defense.', requiredLevel: 5 }
  ],
  
  [MetaCategory.STARTING_PERKS]: [
    // --- OFFENSE PACKS ---
    { 
        id: 'pack_kinetic', 
        category: MetaCategory.STARTING_PERKS, 
        name: 'Kinetic Charger', 
        description: 'EFFECT: Fire continuously for 2s to supercharge your next Pulse (+25% Damage). TRADEOFF: Pulse cooldown +10%.', 
        requiredLevel: 1, 
        branch: 'OFFENSE' 
    },
    { 
        id: 'pack_overclock', 
        category: MetaCategory.STARTING_PERKS, 
        name: 'Overclock Fuse', 
        description: 'EFFECT: Fire Rate +15% for the first 30s of run. TRADEOFF: Fire Rate -5% after fuse burns out.', 
        requiredLevel: 3, 
        branch: 'OFFENSE',
        prerequisites: ['pack_kinetic']
    },
    { 
        id: 'pack_targeting', 
        category: MetaCategory.STARTING_PERKS, 
        name: 'Targeting Uplink', 
        description: 'EFFECT: Keeping aim stable for 2s grants +10% Damage. TRADEOFF: Speed -3% while buff is active.', 
        requiredLevel: 6, 
        branch: 'OFFENSE',
        prerequisites: ['pack_overclock']
    },

    // --- MOBILITY PACKS ---
    { 
        id: 'pack_thruster', 
        category: MetaCategory.STARTING_PERKS, 
        name: 'Thruster Burst', 
        description: 'EFFECT: First dash each wave refunds 50% fatigue. TRADEOFF: Dash recharge 15% slower when empty.', 
        requiredLevel: 1, 
        branch: 'MOBILITY' 
    },
    { 
        id: 'pack_seals', 
        category: MetaCategory.STARTING_PERKS, 
        name: 'Hazard Seals', 
        description: 'EFFECT: Immune to first 3 slow-zone contacts. TRADEOFF: Subsequent slows are 10% stronger.', 
        requiredLevel: 4, 
        branch: 'MOBILITY',
        prerequisites: ['pack_thruster']
    },
    { 
        id: 'pack_beacon', 
        category: MetaCategory.STARTING_PERKS, 
        name: 'Emergency Beacon', 
        description: 'EFFECT: Dying after Wave 10 saves +10% more Currency. TRADEOFF: Extracting gives NO bonus currency.', 
        requiredLevel: 8, 
        branch: 'MOBILITY',
        prerequisites: ['pack_seals']
    },

    // --- DEFENSE / UTILITY PACKS ---
    { 
        id: 'pack_armor', 
        category: MetaCategory.STARTING_PERKS, 
        name: 'Armor Prototype', 
        description: 'EFFECT: Start with "Guard" (Reduces first hit by 60%). TRADEOFF: Max HP -5%.', 
        requiredLevel: 1, 
        branch: 'DEFENSE' 
    },
    { 
        id: 'pack_magnet', 
        category: MetaCategory.STARTING_PERKS, 
        name: 'Salvage Magnet', 
        description: 'EFFECT: +15% Score drops for Waves 1-5. TRADEOFF: -10% Score drops after Wave 5.', 
        requiredLevel: 2, 
        branch: 'DEFENSE',
        prerequisites: ['pack_armor']
    },
    { 
        id: 'pack_injector', 
        category: MetaCategory.STARTING_PERKS, 
        name: 'Scrap Injector', 
        description: 'EFFECT: Wave clear grants temp Shield Buffer (3% HP). TRADEOFF: Wave healing -1%.', 
        requiredLevel: 5, 
        branch: 'DEFENSE',
        prerequisites: ['pack_magnet']
    },
    { 
        id: 'pack_gamble', 
        category: MetaCategory.STARTING_PERKS, 
        name: 'Extractor\'s Gamble', 
        description: 'EFFECT: Boss kills grant +20% Meta XP. TRADEOFF: Dying on Boss wave yields 0 Boss XP.', 
        requiredLevel: 9, 
        branch: 'DEFENSE',
        prerequisites: ['pack_injector']
    }
  ],
  
  [MetaCategory.COMPANIONS]: [
    { id: 'drone_slot_1', category: MetaCategory.COMPANIONS, name: 'Drone Bay A', description: 'Unlocks the first companion slot.', requiredLevel: 10 }
  ],
  [MetaCategory.AMMO_ARCHETYPES]: [
    { id: 'ammo_plasma', category: MetaCategory.AMMO_ARCHETYPES, name: 'Plasma Rounds', description: 'Unlocks Plasma ammo upgrades in the pool.', requiredLevel: 15 }
  ],
  [MetaCategory.ARMOR_ARCHETYPES]: [
    { id: 'armor_reactive', category: MetaCategory.ARMOR_ARCHETYPES, name: 'Reactive Plating', description: 'Unlocks Reactive Armor upgrades in the pool.', requiredLevel: 20 }
  ]
};
