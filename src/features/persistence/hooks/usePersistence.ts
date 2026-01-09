import { useState, useCallback } from 'react';
import { type GridState, type RealmId, type SpecialState, GRID_WIDTH, GRID_HEIGHT } from '../../core/logic/types';
import { type UpgradeStats, type Inventory, type OfflineStats } from '../../economy/context/EconomyContext';

const STORAGE_KEY_GRID = 'manamon_grid'; // Legacy
const STORAGE_KEY_REALMS = 'manamon_realms';
const STORAGE_KEY_UNLOCKED_REALMS = 'manamon_unlocked_realms';
const STORAGE_KEY_MANA = 'manamon_mana';
const STORAGE_KEY_UPGRADES = 'manamon_upgrades';
const STORAGE_KEY_TIME = 'manamon_last_time';
const STORAGE_KEY_SPECIALS = 'manamon_specials';
const STORAGE_KEY_INVENTORY = 'manamon_inventory';
const STORAGE_KEY_OFFLINE = 'manamon_offline_stats';

export interface LoadedState {
    realms: Record<RealmId, GridState>;
    unlockedRealms: RealmId[];
    mana: number;
    upgrades: UpgradeStats;
    offlineEarnings: number;
    specials: SpecialState | null;
    inventory: Inventory | null;
    offlineStats: OfflineStats | null;
}

const createEmptyGrid = (): GridState => {
    return Array(GRID_HEIGHT).fill(null).map((_, y) =>
        Array(GRID_WIDTH).fill(null).map((_, x) => ({
            x, y, item: null
        }))
    );
};

export const usePersistence = () => {
    const [isLoaded, setIsLoaded] = useState(false);

    const saveGame = useCallback((
        realms: Record<RealmId, GridState>,
        unlockedRealms: RealmId[],
        mana: number,
        upgrades: UpgradeStats,
        specials?: SpecialState,
        inventory?: Inventory,
        offlineStats?: OfflineStats
    ) => {
        localStorage.setItem(STORAGE_KEY_REALMS, JSON.stringify(realms));
        localStorage.setItem(STORAGE_KEY_UNLOCKED_REALMS, JSON.stringify(unlockedRealms));
        localStorage.setItem(STORAGE_KEY_MANA, mana.toString());
        localStorage.setItem(STORAGE_KEY_UPGRADES, JSON.stringify(upgrades));
        localStorage.setItem(STORAGE_KEY_TIME, Date.now().toString());
        if (specials) localStorage.setItem(STORAGE_KEY_SPECIALS, JSON.stringify(specials));
        if (inventory) localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(inventory));
        if (offlineStats) localStorage.setItem(STORAGE_KEY_OFFLINE, JSON.stringify(offlineStats));
    }, []);

    const loadGame = useCallback((): LoadedState | null => {
        const realmsStr = localStorage.getItem(STORAGE_KEY_REALMS);
        const unlockedRealmsStr = localStorage.getItem(STORAGE_KEY_UNLOCKED_REALMS);
        const legacyGridStr = localStorage.getItem(STORAGE_KEY_GRID);
        const manaStr = localStorage.getItem(STORAGE_KEY_MANA);
        const upgradesStr = localStorage.getItem(STORAGE_KEY_UPGRADES);
        const timeStr = localStorage.getItem(STORAGE_KEY_TIME);
        const specialsStr = localStorage.getItem(STORAGE_KEY_SPECIALS);
        const inventoryStr = localStorage.getItem(STORAGE_KEY_INVENTORY);
        const offlineStatsStr = localStorage.getItem(STORAGE_KEY_OFFLINE);

        let realms: Record<RealmId, GridState>;
        let unlockedRealms: RealmId[] = ['plains'];

        if (realmsStr) {
            realms = JSON.parse(realmsStr);
            if (unlockedRealmsStr) {
                unlockedRealms = JSON.parse(unlockedRealmsStr);
            }
        } else if (legacyGridStr) {
            console.log("Migrating legacy save...");
            const legacyGrid = JSON.parse(legacyGridStr);
            realms = {
                plains: legacyGrid,
                mine: createEmptyGrid(),
                sky: createEmptyGrid(),
            };
        } else {
            return null;
        }

        // Ensure all realms exist
        if (!realms.plains) realms.plains = createEmptyGrid();
        if (!realms.mine) realms.mine = createEmptyGrid();
        if (!realms.sky) realms.sky = createEmptyGrid();

        const mana = manaStr ? parseFloat(manaStr) : 0;
        const upgrades = upgradesStr ? JSON.parse(upgradesStr) : { summonLuck: 1 };
        const specials = specialsStr ? JSON.parse(specialsStr) : null;
        const inventory = inventoryStr ? JSON.parse(inventoryStr) : null;
        const offlineStats = offlineStatsStr ? JSON.parse(offlineStatsStr) : { efficiency: 0.25, maxTime: 7200 };

        let offlineEarnings = 0;
        if (timeStr) {
            const lastTime = parseInt(timeStr, 10);
            const now = Date.now();
            const elapsedSeconds = (now - lastTime) / 1000;
            const efficiency = offlineStats?.efficiency ?? 0.25;
            const maxTime = offlineStats?.maxTime ?? 7200;
            offlineEarnings = Math.min(elapsedSeconds, maxTime) * efficiency;
        }

        return { realms, unlockedRealms, mana, upgrades, offlineEarnings, specials, inventory, offlineStats };
    }, []);

    const clearSave = useCallback(() => {
        localStorage.clear(); // Simple clear all for now
        window.location.reload();
    }, []);

    return { saveGame, loadGame, clearSave, isLoaded, setIsLoaded };
};
