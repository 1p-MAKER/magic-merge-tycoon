import { type GridState } from '../../core/logic/types';

export const calculateMps = (grid: GridState): number => {
    let totalMps = 0;
    for (const row of grid) {
        for (const cell of row) {
            if (cell.item) {
                // Base: 10, Multiplier: 1.6^(Tier-1) for balanced progression
                const itemMps = 10 * Math.pow(1.6, cell.item.tier - 1);
                totalMps += itemMps;
            }
        }
    }
    return totalMps;
};
