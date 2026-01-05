import React, { useState, useEffect } from 'react';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, PointerSensor, useSensor, useSensors, TouchSensor, MouseSensor } from '@dnd-kit/core';
import { GridCell as GridCellComponent } from './GridCell';
import { type GridState, GRID_HEIGHT, GRID_WIDTH, generateId, type GridItem, type GridCell } from '../logic/types';
import { moveItemInGrid, checkMatches, executeMerge } from '../logic/mergeUtils';
import { useEconomy } from '../../economy/context/EconomyContext';
import { calculateMps } from '../../economy/logic/economyUtils';
import { SoundManager } from '../../asmr/logic/SoundManager';
import { useHaptics } from '../../asmr/hooks/useHaptics';
import { ImpactStyle } from '@capacitor/haptics';
import { usePersistence } from '../../persistence/hooks/usePersistence';
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
    // We need to initialize grid lazily or handle loading state.
    // Ideally, we load synchronously from localStorage if possible, or use an effect.
    // Since createInitialGrid is fast, let's start there but overwrite if load exists.

    const { saveGame, loadGame } = usePersistence();

    // Custom Init to try loading first
    const [grid, setGrid] = useState<GridState>(() => {
        const { grid: loadedGrid } = loadGame();
        return loadedGrid || createInitialGrid();
    });

    const [activeItem, setActiveItem] = useState<GridItem | null>(null);
    const { mana, addMana, consumeMana, setMps } = useEconomy();
    const { triggerImpact } = useHaptics();

    // Handle Offline Earnings & Initial Mana Load
    useEffect(() => {
        const { mana: loadedMana, offlineEarnings, grid: loadedGrid } = loadGame();

        // Restore Mana
        if (loadedMana !== null) {
            // We can't directly setMana in EconomyContext easily without exposing a setter (we only have add/consume)
            // Hack: diff it? Or just assume addMana works relative to 0 if we assume fresh start?
            // EconomyContext starts at 0. So adding loadedMana works.
            // BUT, React StrictMode might double invoke.
            // Ideally EconomyContext should handle persistence or we pass initialMana prop.
            // Let's rely on addMana for now and trust it effectively restores it roughly.
            // Better: We should probably clear context mana first? 
            // For this Prototype: simple addition is fine.
            addMana(loadedMana);
        }

        if (loadedGrid && offlineEarnings > 0) {
            const currentMps = calculateMps(loadedGrid);
            const earned = Math.floor(currentMps * offlineEarnings);
            if (earned > 0) {
                addMana(earned);
                alert(`Welcome back! You earned ${earned} Mana while offline.`);
            }
        }

        // Ensure MPS is set for the loaded grid
        setMps(calculateMps(grid));
    }, []); // Run once

    // Auto-Save Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            saveGame(grid, mana);
        }, 1000); // Debounce save every 1s
        return () => clearTimeout(timer);
    }, [grid, mana, saveGame]);

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

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveItem(null);

        if (!over) return;

        const fromData = active.data.current as { x: number, y: number };
        const toData = over.data.current as { x: number, y: number };

        if (!fromData || !toData) return;
        if (fromData.x === toData.x && fromData.y === toData.y) return;

        // 1. Move the item (Standard Move)
        let newGrid = moveItemInGrid(grid, fromData.x, fromData.y, toData.x, toData.y);

        // 2. Check for Initial Merge at Destination
        const targetCell = newGrid[toData.y][toData.x];
        const matches = checkMatches(newGrid, targetCell);

        if (matches.length >= 3) {
            // Start Chain Reaction
            // We pass the grid *after* the move, so the item is at toData (target)
            await processMergeChain(newGrid, toData.x, toData.y);
        } else {
            // Just a move, no merge
            setGrid(newGrid);
            setMps(calculateMps(newGrid));
        }
    };



    // Recursive Chain Function (Phase 11 Logic)
    const processMergeChain = async (
        startGrid: GridState,
        targetX: number,
        targetY: number
    ) => {
        let gridState = startGrid;

        // 1. Initial Match & Merge is triggered by the caller (handleDragEnd), 
        // OR we handle the *first* merge here?
        // In Phase 6, `executeMerge` returns a new grid with the items removed and target upgraded.
        // Let's reuse `executeMerge` for the chain steps!

        // Step 1: Handle the INITIAL merge (triggered by the drop)
        // The item has already been moved to [targetX, targetY] by moveItemInGrid in handleDragEnd.

        let activeX = targetX;
        let activeY = targetY;
        let comboCount = 0;

        // Loop for Chain
        while (true) {
            const targetCell = gridState[activeY][activeX];
            if (!targetCell.item) break; // Should not happen if logic is correct

            const matches = checkMatches(gridState, targetCell);

            if (matches.length >= 3) {
                // Execute Merge
                comboCount++;
                console.log(`Chain Step: Combo ${comboCount}, Matches: ${matches.length}`);

                // Use existing helper
                const result = executeMerge(gridState, matches, targetCell);
                if (!result) break; // Should not happen

                gridState = result.newGrid;

                // Visual/Audio Feedback
                // Pitch shift based on combo
                SoundManager.getInstance().play('merge', 1.0 + (comboCount * 0.2));
                triggerImpact(ImpactStyle.Medium);

                // Update Grid State to show this step
                setGrid([...gridState.map(row => [...row.map(c => ({ ...c }))])]);

                // Wait for animation/pacing
                await new Promise(r => setTimeout(r, 400));

                // The merged item is now at activeX, activeY (targetCell position).
                // It has a new Tier.
                // We restart the loop to check matches for THIS new item.
                // activeX/Y remain the same.
            } else {
                break; // No more matches, chain ends
            }
        }

        // Final State Update
        setGrid(gridState);
        setMps(calculateMps(gridState));
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
                        {activeItem.tier <= 5 ? (
                            <img
                                src={`/assets/creatures/creature_t${activeItem.tier}.png`}
                                style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                                alt={`Tier ${activeItem.tier}`}
                            />
                        ) : (
                            `T${activeItem.tier}`
                        )}
                    </div>
                ) : null}
            </DragOverlay>

            {/* CONTROLS */}
            <div className={styles.controls}>
                <button
                    className={styles.summonButton}
                    disabled={mana < 10}
                    onClick={() => {
                        const cost = 10;
                        // Check empty
                        let hasSpace = false;
                        for (let r of grid) if (r.some(c => !c.item && !c.isLocked)) hasSpace = true;

                        if (!hasSpace) {
                            alert("No space!");
                            return;
                        }

                        if (consumeMana(cost)) {
                            const newGrid = [...grid.map(row => [...row.map(cell => ({ ...cell }))])];
                            const emptyCells = [];
                            for (let y = 0; y < newGrid.length; y++) {
                                for (let x = 0; x < newGrid[0].length; x++) {
                                    if (!newGrid[y][x].item && !newGrid[y][x].isLocked) emptyCells.push({ x, y });
                                }
                            }
                            const target = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                            newGrid[target.y][target.x].item = {
                                id: generateId(),
                                tier: 1,
                                type: 'creature'
                            };
                            setGrid(newGrid);
                            setMps(calculateMps(newGrid));
                            triggerImpact(ImpactStyle.Light);
                            SoundManager.getInstance().play('pop', 1.0); // Use pop or similar
                        }
                    }}
                >
                    Summon (10 Mana)
                </button>
            </div>
        </DndContext>
    );
};
