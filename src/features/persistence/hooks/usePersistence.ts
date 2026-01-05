import { useCallback } from 'react';
import { type GridState } from '../../core/logic/types';

const STORAGE_KEY_GRID = 'mmt_grid';
const STORAGE_KEY_MANA = 'mmt_mana';
const STORAGE_KEY_TIME = 'mmt_time';
const STORAGE_KEY_UPGRADES = 'mmt_upgrades';

interface UpgradeState {
    summonLuck: number;
}

interface LoadedState {
    grid: GridState | null;
    mana: number | null;
    offlineEarnings: number;
    upgrades: UpgradeState | null;
}

export const usePersistence = () => {

    const saveGame = useCallback((grid: GridState, mana: number, upgrades: UpgradeState) => {
        localStorage.setItem(STORAGE_KEY_GRID, JSON.stringify(grid));
        localStorage.setItem(STORAGE_KEY_MANA, mana.toString());
        localStorage.setItem(STORAGE_KEY_UPGRADES, JSON.stringify(upgrades));
        localStorage.setItem(STORAGE_KEY_TIME, Date.now().toString());
    }, []);

    const loadGame = useCallback((): LoadedState => {
        const gridStr = localStorage.getItem(STORAGE_KEY_GRID);
        const manaStr = localStorage.getItem(STORAGE_KEY_MANA);
        const upgradeStr = localStorage.getItem(STORAGE_KEY_UPGRADES);
        const timeStr = localStorage.getItem(STORAGE_KEY_TIME);

        let grid: GridState | null = null;
        let mana: number | null = null;
        let upgrades: UpgradeState | null = null;
        let offlineEarnings = 0;

        if (gridStr) {
            try {
                grid = JSON.parse(gridStr);
            } catch (e) {
                console.error("Failed to parse grid", e);
            }
        }

        if (manaStr) mana = parseInt(manaStr, 10);

        if (upgradeStr) {
            try {
                upgrades = JSON.parse(upgradeStr);
            } catch (e) { console.error("Failed to parse upgrades", e); }
        }

        if (timeStr) {
            const lastTime = parseInt(timeStr, 10);
            const now = Date.now();
            const elapsedSeconds = (now - lastTime) / 1000;
            const effectiveSeconds = Math.min(elapsedSeconds, 43200);
            offlineEarnings = effectiveSeconds;
        }

        return { grid, mana, offlineEarnings, upgrades };
    }, []);

    const clearSave = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY_GRID);
        localStorage.removeItem(STORAGE_KEY_MANA);
        localStorage.removeItem(STORAGE_KEY_TIME);
    }, []);

    return { saveGame, loadGame, clearSave };
};
