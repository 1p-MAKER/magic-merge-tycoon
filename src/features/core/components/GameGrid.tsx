import React, { useState } from 'react';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, PointerSensor, useSensor, useSensors, TouchSensor, MouseSensor } from '@dnd-kit/core';
import { GridCell as GridCellComponent } from './GridCell';
import { type GridState, GRID_HEIGHT, GRID_WIDTH, generateId, type GridItem, type GridCell } from '../logic/types';
import { moveItemInGrid, checkMatches, executeMerge } from '../logic/mergeUtils';
import styles from './GameGrid.module.css';

// Initial Helper
const createInitialGrid = (): GridState => {
    const grid: GridState = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        const row: GridCell[] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            // Randomly spawn some items for testing
            const hasItem = Math.random() > 0.7;
            const item: GridItem | null = hasItem ? {
                id: generateId(),
                tier: 1, // Start with Tier 1
                type: 'creature'
            } : null;

            row.push({ x, y, item });
        }
        grid.push(row);
    }
    return grid;
};

export const GameGrid: React.FC = () => {
    const [grid, setGrid] = useState<GridState>(createInitialGrid());
    const [activeItem, setActiveItem] = useState<GridItem | null>(null);

    // Sensors for better touch/mouse handling
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Prevent accidental drags
        useSensor(MouseSensor),
        useSensor(TouchSensor)
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const { item } = active.data.current as { item: GridItem };
        setActiveItem(item);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveItem(null);

        if (!over) return;

        const fromData = active.data.current as { x: number, y: number };
        const toData = over.data.current as { x: number, y: number };

        if (!fromData || !toData) return;
        if (fromData.x === toData.x && fromData.y === toData.y) return;

        // 1. Move the item
        let newGrid = moveItemInGrid(grid, fromData.x, fromData.y, toData.x, toData.y);

        // 2. Check for Merge at the destination (Target Cell)
        // We check the 'to' cell because that's where the item landed (or was swapped to).
        // Note: If swapped, we might need to check both checks? For now, let's focus on the moved item.

        // The item that was moved is now at [toY][toX] (or swapped out, but usually the active item lands there)
        // Wait, moveItemInGrid performs a swap. 
        // If we move A to B. A is now at B. B is at A.
        // Check matches for A at B.
        const targetCell = newGrid[toData.y][toData.x];
        const matches = checkMatches(newGrid, targetCell);

        // 3. Execute Merge if matches found
        if (matches.length >= 3) {
            console.log("Merge found!", matches.length);
            const mergeResult = executeMerge(newGrid, matches, targetCell);
            if (mergeResult) {
                newGrid = mergeResult.newGrid;
                // TODO: Play SFX, Particles here
            }
        }

        setGrid(newGrid);
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className={styles.gridContainer}>
                {grid.map((row, y) => (
                    <div key={`row-${y}`} className={styles.row}>
                        {row.map((cell) => (
                            <GridCellComponent key={`${cell.x},${cell.y}`} cell={cell} />
                        ))}
                    </div>
                ))}
            </div>

            <DragOverlay>
                {activeItem ? (
                    <div className={`${styles.dragOverlay} ${styles[`tier-${activeItem.tier}`]}`}>
                        T{activeItem.tier}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
