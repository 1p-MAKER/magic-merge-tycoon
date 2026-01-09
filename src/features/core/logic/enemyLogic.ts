import { type GridCell, GRID_HEIGHT, GRID_WIDTH, generateId } from '../logic/types';

export const processEnemyActions = (
    grid: GridCell[][],
    currentMana: number
): { newGrid: GridCell[][], manaLost: number, logs: string[] } => {
    let newGrid = grid.map(row => [...row.map(cell => ({ ...cell }))]);
    let manaLost = 0;
    const logs: string[] = [];
    let hasSpread = false;

    // Iterate through grid to find enemies
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = grid[y][x];
            if (cell.item && cell.item.type === 'enemy') {
                const enemy = cell.item;

                // Action: Mana Steal (Small chance or always?)
                // Let's say 10% chance to steal per tick per enemy, or small constant drain.
                // "こっそりとマナを奪う" -> Maybe active stealing event.
                if (Math.random() < 0.1) {
                    const stealAmount = enemy.tier * 10;
                    if (currentMana >= stealAmount) {
                        manaLost += stealAmount;
                        // Don't log every small steal to avoid spam? Or maybe log only significant ones or aggregate?
                        // Only log if it's the first one this tick to avoid spam
                        if (logs.length === 0) {
                            // logs.push(`敵がマナを奪いました (-${stealAmount})`);
                        }
                    }
                }

                // Action: Spread (10% chance to duplicate to adjacent empty cell)
                // Limit spread to avoid instant game over
                if (!hasSpread && Math.random() < 0.05) {
                    const directions = [
                        { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                        { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
                    ];
                    // Shuffle directions
                    directions.sort(() => Math.random() - 0.5);

                    for (const dir of directions) {
                        const nx = x + dir.dx;
                        const ny = y + dir.dy;

                        if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
                            if (!newGrid[ny][nx].item && !newGrid[ny][nx].isLocked) {
                                // Spread!
                                newGrid[ny][nx].item = {
                                    id: generateId(),
                                    type: 'enemy',
                                    tier: enemy.tier,
                                    isLocked: false
                                };
                                logs.push(`敵が分裂しました！`);
                                hasSpread = true; // Limit one spread per tick per grid pass?
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    // Only return mana lost if calculate positive
    return { newGrid, manaLost, logs };
};
