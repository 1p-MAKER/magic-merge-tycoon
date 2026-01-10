export interface SummonProbabilities {
    tier1: number;
    tier2: number;
    tier3: number;
}

export type SpecialItemId = 'bomb' | 'barrier' | 'boost' | 'elixir' | 'armageddon';
export type UpgradeItemId = 'offline_efficiency' | 'offline_time';
export type InventoryItemId = 'shuffle' | SpecialItemId;
export type ItemId = InventoryItemId | UpgradeItemId;

export const INVENTORY_ITEMS_META: { id: InventoryItemId; name: string; description: string; icon: string }[] = [
    { id: 'shuffle', name: 'シャッフル', description: '盤面をシャッフル', icon: '🔀' },
    { id: 'bomb', name: 'マナ・ボム', description: '敵を5体消滅させる', icon: '💣' },
    { id: 'barrier', name: '聖なる結界', description: '24時間、アプリ起動時に平和を保証', icon: '🛡️' },
    { id: 'boost', name: 'マナブースト', description: '60秒間、マナ生産量が2倍', icon: '⚡' },
    { id: 'elixir', name: '進化の秘薬', description: '最もランクが低いマナモンを全て1段階強化', icon: '🧪' },
    { id: 'armageddon', name: 'ハルマゲドン', description: '全敵を消滅させ、マナに還元', icon: '☄️' },
];

export const UPGRADE_ITEMS_META: { id: UpgradeItemId; name: string; description: string; icon: string }[] = [
    { id: 'offline_efficiency', name: '放置収益強化', description: '放置時の収益効率+5%', icon: '📈' },
    { id: 'offline_time', name: '放置時間延長', description: '最大放置時間+1時間', icon: '⏳' },
];

export const ITEM_METADATA = [...INVENTORY_ITEMS_META, ...UPGRADE_ITEMS_META];

export const calculateItemPrice = (itemId: ItemId, currentMps: number): number => {
    const priceConfigs: Record<ItemId, { mpsMultiplier: number; minCost: number }> = {
        shuffle: { mpsMultiplier: 60, minCost: 500 },
        bomb: { mpsMultiplier: 50, minCost: 10000 },
        barrier: { mpsMultiplier: 25, minCost: 5000 },
        boost: { mpsMultiplier: 100, minCost: 20000 },
        elixir: { mpsMultiplier: 250, minCost: 50000 },
        armageddon: { mpsMultiplier: 2500, minCost: 500000 },
        offline_efficiency: { mpsMultiplier: 0, minCost: 0 }, // Dynamic cost handled separately
        offline_time: { mpsMultiplier: 0, minCost: 0 },       // Dynamic cost handled separately
    };

    const config = priceConfigs[itemId];
    const mpsCost = Math.floor(currentMps * config.mpsMultiplier);
    return Math.max(config.minCost, mpsCost);
};

const MAX_SUMMON_LEVEL = 10;

export const calculateSummonUpgradeCost = (currentLevel: number): number => {
    if (currentLevel >= MAX_SUMMON_LEVEL) return 0; // Maxed out
    // Base 1000, x2 per level
    return 1000 * Math.pow(2, currentLevel - 1);
};

export const getSummonProbabilities = (level: number): SummonProbabilities => {
    // Defined table for progression
    const levels = [
        { tier1: 0.75, tier2: 0.20, tier3: 0.05 }, // Lv 1
        { tier1: 0.65, tier2: 0.30, tier3: 0.05 }, // Lv 2
        { tier1: 0.55, tier2: 0.35, tier3: 0.10 }, // Lv 3
        { tier1: 0.45, tier2: 0.40, tier3: 0.15 }, // Lv 4
        { tier1: 0.30, tier2: 0.50, tier3: 0.20 }, // Lv 5
        { tier1: 0.20, tier2: 0.55, tier3: 0.25 }, // Lv 6
        { tier1: 0.10, tier2: 0.60, tier3: 0.30 }, // Lv 7
        { tier1: 0.05, tier2: 0.60, tier3: 0.35 }, // Lv 8
        { tier1: 0.00, tier2: 0.60, tier3: 0.40 }, // Lv 9
        { tier1: 0.00, tier2: 0.50, tier3: 0.50 }, // Lv 10 (MAX)
    ];

    // User level is 1-based, array is 0-based.
    // Clamp to defined levels.
    const index = Math.min(Math.max(1, level), MAX_SUMMON_LEVEL) - 1;
    return levels[index];
};

export const isMaxSummonLevel = (level: number): boolean => {
    return level >= MAX_SUMMON_LEVEL;
};

export const calculateShuffleCost = (currentMana: number, currentMps: number): number => {
    // Minimum 500
    // Dynamic: 10% of current mana OR 60 seconds of MPS
    const manaCost = Math.floor(currentMana * 0.1);
    const mpsCost = Math.floor(currentMps * 60);
    return Math.max(500, manaCost, mpsCost);
};

export const calculateSummonCost = (currentMana: number, currentMps: number): number => {
    // Minimum 10
    // Dynamic: 5% of current mana OR 10 seconds of MPS
    const manaCost = Math.floor(currentMana * 0.05);
    const mpsCost = Math.floor(currentMps * 10);
    return Math.max(10, manaCost, mpsCost);
};

export const calculateEnemySpawnRate = (currentMana: number, currentMps: number, realmId?: string): number => {
    // Base 5%, increases with progression
    // +1% per 100k mana, +1% per 100 MPS, capped at 50%
    const manaBonus = Math.floor(currentMana / 100000) * 0.01;
    const mpsBonus = Math.floor(currentMps / 100) * 0.01;
    let rate = 0.05 + manaBonus + mpsBonus;

    // Mine realm: 3x rate (Very High Risk)
    if (realmId === 'mine') {
        rate *= 3.0;
    }
    // Sky realm: 2.5x rate (High Risk)
    else if (realmId === 'sky') {
        rate *= 2.5;
    }

    // Cap at 80% (was 50%)
    return Math.min(0.8, rate);
};

export const calculatePurgeCost = (currentMps: number): number => {
    // Minimum 100
    // Dynamic: 10 seconds of MPS
    // Stable cost: Depends only on production rate, not current savings.
    const mpsCost = Math.floor(currentMps * 10);
    return Math.max(100, mpsCost);
};

export const calculateOfflineUpgradeCost = (currentVal: number, type: 'efficiency' | 'time'): number => {
    // Base 5000, scales with level
    // Efficiency: level = (current - 0.25) / 0.05
    // Time: level = (current - 7200) / 3600

    let level = 0;
    if (type === 'efficiency') {
        level = Math.round((currentVal - 0.25) / 0.05);
    } else {
        level = Math.round((currentVal - 7200) / 3600);
    }

    return 5000 * Math.pow(2, level);
};
