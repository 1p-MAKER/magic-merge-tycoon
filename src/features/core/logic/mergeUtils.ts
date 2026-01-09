import { generateId, type GridCell, type GridItem, type GridState } from './types';

// Actually, I'll use specific chunks to fix the imports and the unused vars.


interface MergeResult {
    newGrid: GridState;
    createdItems: GridItem[]; // List of new high-tier items created
    score: number;
}

// ------------------------------------------------------------------
// Deep Clone for Immutability
// ------------------------------------------------------------------
const cloneGrid = (grid: GridState): GridState => {
    return grid.map(row => row.map(cell => ({ ...cell, item: cell.item ? { ...cell.item } : null })));
};

// ------------------------------------------------------------------
// Match Checking (Breadth-First Search)
// ------------------------------------------------------------------
export const checkMatches = (
    grid: GridState,
    startCell: GridCell
): GridCell[] => {
    if (!startCell.item) return [];

    const type = startCell.item.type;
    const tier = startCell.item.tier;

    const matches: GridCell[] = [];
    const visited = new Set<string>();
    const queue: GridCell[] = [startCell];

    visited.add(`${startCell.x},${startCell.y}`);

    while (queue.length > 0) {
        const current = queue.shift()!;
        matches.push(current);

        // Neighbors: Up, Down, Left, Right
        const neighbors = [
            { x: current.x, y: current.y - 1 },
            { x: current.x, y: current.y + 1 },
            { x: current.x - 1, y: current.y },
            { x: current.x + 1, y: current.y },
        ];

        for (const n of neighbors) {
            if (
                n.y >= 0 && n.y < grid.length &&
                n.x >= 0 && n.x < grid[0].length
            ) {
                const neighborCell = grid[n.y][n.x];
                const key = `${n.x},${n.y}`;

                if (!visited.has(key) && neighborCell.item) {
                    if (neighborCell.item.type === type && neighborCell.item.tier === tier) {
                        visited.add(key);
                        queue.push(neighborCell);
                    }
                }
            }
        }
    }

    return matches;
};

// ------------------------------------------------------------------
// Merge Execution Logic
// ------------------------------------------------------------------
export const executeMerge = (
    grid: GridState,
    matchedCells: GridCell[],
    targetCell: GridCell // The cell where the user dropped the item (merge focus)
): MergeResult | null => {
    const count = matchedCells.length;
    if (count < 3) return null; // Logic: Minimum 3 to merge

    const newGrid = cloneGrid(grid);
    const sampleItem = matchedCells[0].item!;
    const nextTier = (sampleItem.tier + 1) as any; // Allow overflow for now, ideally clamp

    // Calculate specific outputs based on 3-in-1 or 5-in-2
    // Rule: 5 merged -> 2 items (Bonus)
    // Rule: 3 merged -> 1 item (Standard)
    // Rule: 4 merged -> 1 item (Standard + 1 remainder usually, or just 1 stronger? Sticking to strict inputs for now: 3->1, 5->2)
    // Implementing simplified logic:
    // 3 or 4 items -> 1 result item
    // 5 or more -> 2 result items (Bonus!)

    const resultItemCount = count >= 5 ? 2 : 1;
    // Wait, standard merge games usually consume multiples.
    // 3 -> 1
    // 5 -> 2
    // 6 -> 2 ? Usually 5 is the optimal breakpoint. 
    // Let's implement: Any merge consumes ALL involved items and produces resultItemCount.

    // Remove all matched items from the new grid
    matchedCells.forEach(cell => {
        newGrid[cell.y][cell.x].item = null;
    });

    const createdItems: GridItem[] = [];

    // Create result items at the target location (or adjacent if multiple)
    for (let i = 0; i < resultItemCount; i++) {
        const newItem: GridItem = {
            id: generateId(),
            tier: nextTier,
            type: sampleItem.type,
        };
        createdItems.push(newItem);

        // Place the first result at the target location
        if (i === 0) {
            newGrid[targetCell.y][targetCell.x].item = newItem;
        } else {
            // Place second result (bonus) at a valid neighbor
            // Simple heuristic: First empty neighbor, or just closest valid match cell
            // For simplicity: Place at the LAST matched cell position that isn't the target
            // Try to place in one of the original spots to avoid jumping
            for (const cell of matchedCells) {
                if ((cell.x !== targetCell.x || cell.y !== targetCell.y) && !newGrid[cell.y][cell.x].item) {
                    newGrid[cell.y][cell.x].item = newItem;
                    break;
                }
            }
            // Fallback (shouldn't happen if 5 merged and we cleared 5 spots)
        }
    }

    return {
        newGrid,
        createdItems,
        score: resultItemCount * 100 * sampleItem.tier // Placeholder score
    };
};

// ------------------------------------------------------------------
// Move Item
// ------------------------------------------------------------------
export const moveItemInGrid = (
    grid: GridState,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
): GridState => {
    const newGrid = cloneGrid(grid);
    const item = newGrid[fromY][fromX].item;

    // Only allow moves to empty cells - no swapping
    const targetItem = newGrid[toY][toX].item;

    if (targetItem) {
        // Target cell is occupied - return grid unchanged
        return grid;
    }

    // Move item to empty cell
    newGrid[fromY][fromX].item = null;
    newGrid[toY][toX].item = item;

    return newGrid;
};

// ------------------------------------------------------------------
// Attack Range Calculation
// ------------------------------------------------------------------
export const getAttackRange = (
    centerX: number,
    centerY: number,
    tier: number,
    gridWidth: number,
    gridHeight: number
): { x: number, y: number }[] => {
    const range: { x: number, y: number }[] = [];

    const addTarget = (x: number, y: number) => {
        if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight && (x !== centerX || y !== centerY)) {
            range.push({ x, y });
        }
    };

    if (tier <= 2) {
        // 十字1マス
        [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => addTarget(centerX + dx, centerY + dy));
    } else if (tier <= 4) {
        // 周囲 3x3
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                addTarget(centerX + dx, centerY + dy);
            }
        }
    } else if (tier <= 6) {
        // 十字 2マス
        for (let i = 1; i <= 2; i++) {
            [[0, i], [0, -i], [i, 0], [-i, 0]].forEach(([dx, dy]) => addTarget(centerX + dx, centerY + dy));
        }
    } else if (tier <= 8) {
        // 周囲 5x5
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                addTarget(centerX + dx, centerY + dy);
            }
        }
    } else {
        // 周囲 7x7 (Tier 9, 10)
        for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
                addTarget(centerX + dx, centerY + dy);
            }
        }
    }

    return range;
};
