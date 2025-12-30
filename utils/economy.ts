import { GameState } from '../core/GameState';
import { CHAINS } from '../data/upgrades';
import { getUpgradeCost } from '../config/balance';

/**
 * Calculates the final cost of an upgrade based on build identity rules.
 * Rules:
 * 1. Generalist Tax: Buying into a new family becomes expensive if you already have investments in multiple other families.
 * 2. Specialization Discount: Deep investment in a single family makes future upgrades in that family cheaper.
 */
export const calculateUpgradeCost = (state: GameState, upgradeId: string): number => {
    const chain = CHAINS.find(c => c.id === upgradeId);
    if (!chain) return 99999;

    const currentLevel = state.ownedUpgrades.get(upgradeId) || 0;
    const baseCost = getUpgradeCost(currentLevel);

    const family = chain.family;
    const upgradesInFamily = state.purchasedFamilyCounts.get(family) || 0;
    
    // Count how many families have at least one investment
    let activeFamilies = 0;
    for (const count of state.purchasedFamilyCounts.values()) {
        if (count > 0) activeFamilies++;
    }

    let multiplier = 1.0;

    // RULE 1: Generalist Tax (Entry Fee)
    // If this is the FIRST purchase in this family...
    if (upgradesInFamily === 0) {
        if (activeFamilies >= 2) {
            multiplier += 0.25; // Tax for 3rd family
        }
        if (activeFamilies >= 3) {
            multiplier += 0.50; // Tax for 4th family
        }
    }

    // RULE 2: Specialization Discount
    // If deep in family (3+ upgrades)
    if (upgradesInFamily >= 3) {
        multiplier -= 0.10;
    }

    return Math.floor(baseCost * multiplier);
};