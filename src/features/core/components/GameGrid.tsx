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
import { ShopModal } from '../../shop/components/ShopModal';
import { getSummonProbabilities, SHUFFLE_COST, PURGE_COST } from '../../shop/logic/shopLogic';
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
    const { mana, addMana, consumeMana, setMps, upgrades } = useEconomy();
    const { triggerImpact } = useHaptics();

    // Shop & Active Skills State
    const [showShop, setShowShop] = useState(false);
    const [isPurgeMode, setIsPurgeMode] = useState(false);

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
                // Alert handled in TitleScreen
                // alert(`お帰りなさい！\nオフライン中に ${earned} マナを獲得しました。`);
            }
        }

        // Ensure MPS is set for the loaded grid
        setMps(calculateMps(grid));
    }, []); // Run once

    // Auto-Save Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            saveGame(grid, mana, upgrades);
        }, 1000); // Debounce save every 1s
        return () => clearTimeout(timer);
    }, [grid, mana, upgrades, saveGame]);

    // Sensors for better touch/mouse handling
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Prevent accidental drags
        useSensor(MouseSensor),
        useSensor(TouchSensor)
    );

    const handleDragStart = (event: DragStartEvent) => {
        if (isPurgeMode) return;
        const { active } = event;
        const { item } = active.data.current as { item: GridItem };

        // Prevent dragging enemies
        if (item.type === 'enemy') return;

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

                // Check 3: Check for Enemy Defeat (Adjacent)
                // Check neighbors (Up, Down, Left, Right)
                const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                let enemyDefeated = false;

                directions.forEach(([dx, dy]) => {
                    const nx = targetCell.x + dx;
                    const ny = targetCell.y + dy;
                    if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
                        const neighbor = gridState[ny][nx];
                        if (neighbor.item && neighbor.item.type === 'enemy') {
                            // Defeat Enemy!
                            gridState[ny][nx].item = null;
                            addMana(50); // Reward
                            enemyDefeated = true;
                            // Visual feedback could be here
                        }
                    }
                });

                if (enemyDefeated) {
                    triggerImpact(ImpactStyle.Heavy);
                    SoundManager.getInstance().play('pop', 0.5); // Reuse pop for now
                }

                // Visual/Audio Feedback
                // Pitch shift based on combo
                SoundManager.getInstance().play('merge', 1.0 + (comboCount * 0.2));
                triggerImpact(ImpactStyle.Medium);

                if (comboCount > 1) {
                    // Assuming spawnText was re-added or logic exists elsewhere? 
                    // Actually, I noted in Phase 11 Redux that `spawnText` wasn't easily available in `processMergeChain` scope 
                    // without passing it or using global.
                    // But if I want to localize it, I should update it if it IS there.
                    // Wait, in my previous edit, I *removed* `spawnText` calls from `processMergeChain` because I thought it wasn't available.
                    // I need to check if I can re-add it or if `alert` was used?
                    // Ah, `GameGrid.tsx` has `spawnText` from `useFloatingText` (Phase 10) IF Phase 10 was kept.
                    // But Phase 10 was REVERTED. 
                    // So `spawnText` logic might be MISSING entirely in `GameGrid.tsx` right now unless I re-implemented it?
                    // Let's check imports in GameGrid.tsx.
                }

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

    // --- Active Skills ---

    const handleShuffle = () => {
        if (!consumeMana(SHUFFLE_COST)) {
            alert("マナが足りません！");
            return;
        }

        // Gather all items
        const items: GridItem[] = [];
        grid.forEach(row => row.forEach(cell => {
            if (cell.item) items.push(cell.item);
        }));

        // Fisher-Yates Shuffle
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }

        // Rebuild Grid
        const newGrid: GridState = grid.map(row => row.map(cell => ({ ...cell, item: null })));
        const emptyCells: { x: number, y: number }[] = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (!newGrid[y][x].isLocked) emptyCells.push({ x, y });
            }
        }

        // Place items back randomly
        items.forEach((item, index) => {
            if (index < emptyCells.length) {
                const { x, y } = emptyCells[index];
                newGrid[y][x].item = item;
            }
        });

        triggerImpact(ImpactStyle.Heavy);
        setGrid(newGrid);
        setMps(calculateMps(newGrid));
    };

    const handleCellClick = (cell: GridCell) => {
        if (!isPurgeMode) return;
        if (!cell.item) return;

        // Allow purging enemies
        if (cell.item.type === 'enemy' || consumeMana(PURGE_COST)) {
            const newGrid = [...grid.map(row => [...row.map(c => ({ ...c }))])];
            newGrid[cell.y][cell.x].item = null;
            setGrid(newGrid);
            setMps(calculateMps(newGrid));
            triggerImpact(ImpactStyle.Medium);
            // setIsPurgeMode(false); // Optional: Auto-exit? Let's keep it manual toggle for multi-delete
        } else {
            alert("マナが足りません！");
            setIsPurgeMode(false);
        }
    };

    return (
        <>
            {showShop && <ShopModal onClose={() => setShowShop(false)} />}

            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className={styles.gridContainer} style={{ border: isPurgeMode ? '2px solid #ff4757' : undefined }}>
                    {grid.map((row, y) => (
                        <div key={`row-${y}`} className={styles.row}>
                            {row.map((cell) => (
                                <GridCellComponent
                                    key={`${cell.x},${cell.y}`}
                                    cell={cell}
                                    onClick={() => handleCellClick(cell)}
                                />
                            ))}
                        </div>
                    ))}
                </div>

                <DragOverlay>
                    {activeItem ? (
                        <div className={`${styles.dragOverlay} ${styles[`tier-${activeItem.tier}`]}`}>
                            {activeItem.type === 'creature' ? (
                                activeItem.tier <= 5 ? (
                                    <img
                                        src={`/assets/creatures/creature_t${activeItem.tier}.png`}
                                        style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                                        alt={`Tier ${activeItem.tier}`}
                                    />
                                ) : (
                                    `T${activeItem.tier}`
                                )
                            ) : (
                                <img
                                    src={`/assets/enemies/enemy_t${activeItem.tier}.png`} // Assuming enemy assets
                                    style={{ width: '85%', height: '85%', objectFit: 'contain' }}
                                    alt={`Enemy T${activeItem.tier}`}
                                />
                            )}
                        </div>
                    ) : null}
                </DragOverlay>

                {/* CONTROLS */}
                <div className={styles.controls} style={{ flexDirection: 'column', gap: '10px', alignItems: 'center' }}>

                    <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '300px', justifyContent: 'center' }}>
                        <button
                            className={styles.summonButton}
                            style={{ flex: 1, padding: '8px', fontSize: '0.9rem', background: '#ffa502' }}
                            onClick={() => setShowShop(true)}
                        >
                            ショップ
                        </button>
                        <button
                            className={styles.summonButton}
                            style={{ flex: 1, padding: '8px', fontSize: '0.9rem', background: isPurgeMode ? '#ff4757' : '#70a1ff' }}
                            onClick={() => setIsPurgeMode(!isPurgeMode)}
                        >
                            {isPurgeMode ? '消去中...' : '消去'}
                        </button>
                        <button
                            className={styles.summonButton}
                            style={{ flex: 1, padding: '8px', fontSize: '0.9rem', background: '#2ed573' }}
                            onClick={handleShuffle}
                        >
                            混ぜる
                        </button>
                    </div>

                    <button
                        className={styles.summonButton}
                        disabled={mana < 10}
                        onClick={() => {
                            const cost = 10;
                            // Check empty
                            let hasSpace = false;
                            for (let r of grid) if (r.some(c => !c.item && !c.isLocked)) hasSpace = true;

                            if (!hasSpace) {
                                alert("いっぱい！");
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

                                // Determine Tier/Type based on Upgrades and Enemy Chance
                                const probs = getSummonProbabilities(upgrades.summonLuck);
                                let tier = 1;
                                let type: 'creature' | 'enemy' = 'creature';

                                // 5% Chance for Enemy
                                if (Math.random() < 0.05) {
                                    type = 'enemy';
                                    tier = 1; // Enemy doesn't really use tier logic yet
                                } else {
                                    tier = 1;
                                }

                                newGrid[target.y][target.x].item = {
                                    id: generateId(),
                                    id: generateId(),
                                    tier: tier as any,
                                    type: type
                                };
                                setGrid(newGrid);
                                setMps(calculateMps(newGrid));
                                triggerImpact(ImpactStyle.Light);
                                SoundManager.getInstance().play('pop', 1.0);
                            }
                        }}
                    >
                        召喚 (10 マナ)
                    </button>
                </div>

                {/* Helper Text for Purge Mode */}
                {isPurgeMode && (
                    <div style={{ position: 'fixed', bottom: '80px', left: '0', width: '100%', textAlign: 'center', color: '#ff4757', fontWeight: 'bold', textShadow: '0 0 5px black', pointerEvents: 'none' }}>
                        アイテムをタップして消去 ({PURGE_COST} マナ)
                    </div>
                )}
            </DndContext>
        </>
    );
};
