import { type GridCell, GRID_HEIGHT, GRID_WIDTH, generateId, type EnemyVariant } from '../logic/types';

export const processEnemyActions = (
    grid: GridCell[][],
    currentMana: number
): { newGrid: GridCell[][], manaLost: number, logs: string[], cellsLocked: number } => {
    let newGrid = grid.map(row => [...row.map(cell => ({ ...cell }))]);
    let manaLost = 0;
    const logs: string[] = [];
    let hasSpread = false;
    let cellsLocked = 0;

    // Iterate through grid to find enemies
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const cell = grid[y][x];
            if (cell.item && cell.item.type === 'enemy') {
                const enemy = cell.item;
                const variant: EnemyVariant = enemy.enemyVariant || 'shadow_slime';

                switch (variant) {
                    case 'shadow_slime':
                        // Shadow Slime: Mana steal + Spread
                        if (Math.random() < 0.1) {
                            const stealAmount = enemy.tier * 10;
                            if (currentMana >= stealAmount) {
                                manaLost += stealAmount;
                            }
                        }
                        // Spread logic
                        if (!hasSpread && Math.random() < 0.05) {
                            const directions = [
                                { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                                { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
                            ];
                            directions.sort(() => Math.random() - 0.5);
                            for (const dir of directions) {
                                const nx = x + dir.dx;
                                const ny = y + dir.dy;
                                if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
                                    if (!newGrid[ny][nx].item && !newGrid[ny][nx].isLocked) {
                                        newGrid[ny][nx].item = {
                                            id: generateId(),
                                            type: 'enemy',
                                            tier: enemy.tier,
                                            enemyVariant: 'shadow_slime'
                                        };
                                        logs.push(`シャドウスライムが分裂しました！`);
                                        hasSpread = true;
                                        break;
                                    }
                                }
                            }
                        }
                        break;

                    case 'rock_golem':
                        // Rock Golem: Locks adjacent cells (no spread, no steal)
                        if (Math.random() < 0.08) {
                            const directions = [
                                { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                                { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
                            ];
                            directions.sort(() => Math.random() - 0.5);
                            for (const dir of directions) {
                                const nx = x + dir.dx;
                                const ny = y + dir.dy;
                                if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
                                    if (!newGrid[ny][nx].isLocked && newGrid[ny][nx].item) {
                                        newGrid[ny][nx].isLocked = true;
                                        cellsLocked++;
                                        logs.push(`ロックゴーレムがセルを封印しました！`);
                                        break;
                                    }
                                }
                            }
                        }
                        break;

                    case 'phantom':
                        // Phantom: High mana steal + Random warp
                        if (Math.random() < 0.15) {
                            const stealAmount = enemy.tier * 25; // Higher steal
                            if (currentMana >= stealAmount) {
                                manaLost += stealAmount;
                                logs.push(`ファントムがマナを吸収！ (-${stealAmount})`);
                            }
                        }
                        // Random warp
                        if (Math.random() < 0.1) {
                            const emptyCells: { x: number, y: number }[] = [];
                            for (let ey = 0; ey < GRID_HEIGHT; ey++) {
                                for (let ex = 0; ex < GRID_WIDTH; ex++) {
                                    if (!newGrid[ey][ex].item && !newGrid[ey][ex].isLocked) {
                                        emptyCells.push({ x: ex, y: ey });
                                    }
                                }
                            }
                            if (emptyCells.length > 0) {
                                const target = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                                newGrid[target.y][target.x].item = { ...enemy };
                                newGrid[y][x].item = null;
                                logs.push(`ファントムがワープしました！`);
                            }
                        }
                        break;
                }
            }
        }
    }

    return { newGrid, manaLost, logs, cellsLocked };
};
