import { useCallback } from 'react';
import { type GridState } from '../../core/logic/types';

const STORAGE_KEY_GRID = 'mmt_grid';
const STORAGE_KEY_MANA = 'mmt_mana';
const STORAGE_KEY_TIME = 'mmt_time';

interface LoadedState {
    grid: GridState | null;
    mana: number | null;
    offlineEarnings: number;
}

export const usePersistence = () => {

    const saveGame = useCallback((grid: GridState, mana: number) => {
        localStorage.setItem(STORAGE_KEY_GRID, JSON.stringify(grid));
        localStorage.setItem(STORAGE_KEY_MANA, mana.toString());
        localStorage.setItem(STORAGE_KEY_TIME, Date.now().toString());
    }, []);

    const loadGame = useCallback((): LoadedState => {
        const gridStr = localStorage.getItem(STORAGE_KEY_GRID);
        const manaStr = localStorage.getItem(STORAGE_KEY_MANA);
        const timeStr = localStorage.getItem(STORAGE_KEY_TIME);

        let grid: GridState | null = null;
        let mana: number | null = null;
        let offlineEarnings = 0;

        if (gridStr) {
            try {
                grid = JSON.parse(gridStr);
            } catch (e) {
                console.error("Failed to parse grid", e);
            }
        }

        if (manaStr) {
            mana = parseInt(manaStr, 10);
        }

        if (timeStr) {
            const lastTime = parseInt(timeStr, 10);
            const now = Date.now();
            const elapsedSeconds = (now - lastTime) / 1000;

            // Max offline time: 12 hours (12 * 3600 = 43200 seconds)
            const effectiveSeconds = Math.min(elapsedSeconds, 43200);

            // We need MPS to calculate actual earnings, but MPS depends on the Grid.
            // We will return the Seconds, and let the caller calculate earnings based on the loaded grid.
            // Wait, caller needs to do: earnings = calculateMps(grid) * effectiveSeconds
            // Storing effectiveSeconds in offlineEarnings for now, assuming 1 MPS per sec as placeholder?
            // Better: Return effectiveSeconds.
            offlineEarnings = effectiveSeconds;
        }

        return { grid, mana, offlineEarnings };
    }, []);

    const clearSave = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY_GRID);
        localStorage.removeItem(STORAGE_KEY_MANA);
        localStorage.removeItem(STORAGE_KEY_TIME);
    }, []);

    return { saveGame, loadGame, clearSave };
};
