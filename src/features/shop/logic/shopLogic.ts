export interface SummonProbabilities {
    tier1: number;
    tier2: number;
    tier3: number;
}

export const calculateSummonUpgradeCost = (currentLevel: number): number => {
    // Base 1000, x2 per level
    // Level 1 -> Upgrade to 2 cost: 1000
    // Level 2 -> Upgrade to 3 cost: 2000
    return 1000 * Math.pow(2, currentLevel - 1);
};

export const getSummonProbabilities = (level: number): SummonProbabilities => {
    // Default Level 1
    let p = { tier1: 0.80, tier2: 0.20, tier3: 0.00 }; // Current base seems to indicate 20% T2 chance in GameGrid logic

    // Let's refine the progression
    // Level 1: 80% T1, 20% T2, 0% T3 (Matches existing logic somewhat "rand < 0.25")
    // Note: The previous logic had: < 0.05 (T3), < 0.25 (T2).
    // This means T3 was 5%, T2 was 20%, T1 was 75%.
    // Wait, the previous code:
    // if (rand < 0.05) -> T3
    // else if (rand < 0.25) -> T2
    // So T3 is 5%, T2 is 20% (0.25 - 0.05).

    // Let's make Level 1 weaker so upgrades feel good? Or match existing?
    // Let's match existing as Level 1 to not nerf the user.

    const baseT3 = 0.05;
    const baseT2 = 0.20;

    // Each level adds 2% to T3 and 5% to T2, constrained.

    // Actually, let's define a table for simplicity and localized display
    switch (level) {
        case 1: return { tier1: 0.75, tier2: 0.20, tier3: 0.05 };
        case 2: return { tier1: 0.65, tier2: 0.30, tier3: 0.05 };
        case 3: return { tier1: 0.55, tier2: 0.35, tier3: 0.10 };
        case 4: return { tier1: 0.45, tier2: 0.40, tier3: 0.15 };
        case 5: return { tier1: 0.30, tier2: 0.50, tier3: 0.20 };
        default: return { tier1: 0.75, tier2: 0.20, tier3: 0.05 };
    }
};

export const SHUFFLE_COST = 500;
export const PURGE_COST = 100;
