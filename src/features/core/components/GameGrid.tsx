import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { GridCell as GridCellComponent } from './GridCell';
import { type GridState, GRID_HEIGHT, GRID_WIDTH, generateId, type GridItem, type GridCell, type RealmId } from '../logic/types';
import { moveItemInGrid, checkMatches, executeMerge, getAttackRange } from '../logic/mergeUtils';
import { processEnemyActions } from '../logic/enemyLogic';
import { FloatingTextOverlay, type FloatingTextHandle } from '../../ui/components/FloatingTextOverlay';
import { GameLog, type LogEntry } from '../../ui/components/GameLog';
import { useEconomy } from '../../economy/context/EconomyContext';
import { calculateMps } from '../../economy/logic/economyUtils';
import { SoundManager } from '../../asmr/logic/SoundManager';
import { useHaptics } from '../../asmr/hooks/useHaptics';
import { ImpactStyle } from '@capacitor/haptics';
import { usePersistence } from '../../persistence/hooks/usePersistence';
import { ShopModal } from '../../shop/components/ShopModal';
import { ItemModal } from '../../items/components/ItemModal';
import {
    calculateSummonCost,
    calculatePurgeCost,
    calculateEnemySpawnRate,
    getSummonProbabilities,
    type InventoryItemId
} from '../../shop/logic/shopLogic';
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

const createInitialRealms = (): Record<RealmId, GridState> => ({
    plains: createInitialGrid(),
    mine: createInitialGrid(), // Initially empty in logic, but populated if unlocked
    sky: createInitialGrid()
});

const REALM_CONFIG: Record<RealmId, { name: string; cost: number; enemiesRequired: number; description: string }> = {
    plains: { name: '平原', cost: 0, enemiesRequired: 0, description: '穏やかな平原' },
    mine: { name: '鉱山', cost: 50000, enemiesRequired: 50, description: 'マナ豊富だが危険 (必要討伐数: 50)' },
    sky: { name: '天空', cost: 500000, enemiesRequired: 200, description: '神秘の土地 (必要討伐数: 200)' }
};


// Basic Trash Bin Component (Inline for simplicity)
const TrashBin: React.FC<{ activeItem: GridItem | null, mana: number, cost: number }> = ({ activeItem, mana, cost }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: 'trash-zone',
    });

    const isAffordable = mana >= cost;
    const isActive = !!activeItem;
    // Highlight if dragging and affordable. Red if expensive?
    // Style: Simple box with icon.

    // Determine style
    const baseStyle: React.CSSProperties = {
        flex: 1,
        // height: '40px', // Removed fixed height to stretch
        minHeight: '40px', // Ensure at least this tall
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        border: '2px solid #ff4757',
        backgroundColor: '#fff0f0', // Light red background
        color: '#ff4757', // Red text
        transition: 'all 0.2s',
        fontSize: '0.75rem', // Smaller text
        fontWeight: 'bold',
        cursor: 'default', // pointer usually implies click, default is fine
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis'
    };

    if (isActive) {
        if (isOver) {
            // Over trash
            if (isAffordable) {
                baseStyle.borderColor = '#ff4757';
                baseStyle.backgroundColor = '#ffe0e3';
                baseStyle.color = '#ff4757';
                baseStyle.transform = 'scale(1.05)';
            } else {
                baseStyle.borderColor = '#555';
                baseStyle.backgroundColor = '#ddd';
                baseStyle.color = '#555';
            }
        } else {
            // Dragging but not over
            baseStyle.borderColor = '#ff4757';
            baseStyle.color = '#ff4757';
        }
    }


    return (
        <div
            ref={setNodeRef}
            style={baseStyle}
            onClick={() => {
                if (!isActive) {
                    alert('ここにドラッグしてね！\nマナモンをドラッグして、このゴミ箱にドロップすると消去できます。');
                }
            }}
        >
            {isActive ? (isOver ? `消去確認 (${cost.toLocaleString()}マナ)` : 'ここにドロップして消去') : `ゴミ箱 (${cost.toLocaleString()})`}
        </div>
    );
};

export const GameGrid: React.FC = () => {
    // We need to initialize grid lazily or handle loading state.
    // Ideally, we load synchronously from localStorage if possible, or use an effect.
    // Since createInitialGrid is fast, let's start there but overwrite if load exists.

    const { saveGame, loadGame } = usePersistence();

    // Multi-Realm State
    const [realms, setRealms] = useState<Record<RealmId, GridState>>(() => {
        const loaded = loadGame();
        return loaded?.realms || createInitialRealms();
    });
    const [unlockedRealms, setUnlockedRealms] = useState<RealmId[]>(() => {
        const loaded = loadGame();
        return loaded?.unlockedRealms || ['plains'];
    });
    const [activeRealmId, setActiveRealmId] = useState<RealmId>('plains');

    // setActiveGrid wrapper to update specific realm
    const setActiveGrid = useCallback((update: GridState | ((prev: GridState) => GridState)) => {
        setRealms(prev => {
            const currentGrid = prev[activeRealmId];
            const newGrid = typeof update === 'function' ? update(currentGrid) : update;
            return { ...prev, [activeRealmId]: newGrid };
        });
    }, [activeRealmId]);

    // Derived active grid for rendering
    const grid = realms[activeRealmId];
    // Alias setGrid to maintain compatibility with existing logic
    const setGrid = setActiveGrid;

    const [activeItem, setActiveItem] = useState<GridItem | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [boostEndTime, setBoostEndTime] = useState<number>(0);
    const [barrierEndTime, setBarrierEndTime] = useState<number>(0);
    const floatingTextRef = useRef<FloatingTextHandle>(null);

    const {
        mana,
        addMana,
        consumeMana,
        mps,
        setMps,
        upgrades,
        setMpsMultiplier,
        inventory,
        addItemToInventory,
        useItemFromInventory,
        offlineStats,
        enemiesDefeated,
        incrementEnemiesDefeated
    } = useEconomy();
    const { triggerImpact } = useHaptics();

    // Shop & Active Skills State
    const [showShop, setShowShop] = useState(false);
    const [showItemModal, setShowItemModal] = useState(false);

    // Handle Offline Earnings & Initial Mana Load
    // Boost & Barrier Expiry Check
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            if (boostEndTime > 0) {
                if (now < boostEndTime) {
                    setMpsMultiplier(2);
                } else {
                    setMpsMultiplier(1);
                    setBoostEndTime(0);
                    addLog("マナブーストの効果が切れました。", "info");
                }
            } else {
                setMpsMultiplier(1);
            }

            if (barrierEndTime > 0 && now >= barrierEndTime) {
                setBarrierEndTime(0);
                addLog("聖なる結界の効果が切れました。", "warning");
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [boostEndTime, barrierEndTime, setMpsMultiplier]);

    // Handle Unlocking Realm
    const handleUnlockRealm = (realmId: RealmId) => {
        const config = REALM_CONFIG[realmId];
        if (consumeMana(config.cost)) {
            setUnlockedRealms(prev => [...prev, realmId]);
            setActiveRealmId(realmId);
            SoundManager.getInstance().play('merge', 1.5);
            addLog(`${config.name}を開放しました！`, 'success');
        } else {
            alert('マナが足りません！');
        }
    };

    // Auto-Save Effect
    useEffect(() => {
        const timer = setTimeout(() => {
            const specials = { boostEndTime, barrierEndTime };
            saveGame(realms, unlockedRealms, mana, upgrades, specials, inventory, offlineStats, enemiesDefeated);
        }, 1000);
        return () => clearTimeout(timer);
    }, [realms, unlockedRealms, mana, upgrades, offlineStats, boostEndTime, barrierEndTime, inventory, saveGame]);

    // Get Sky realm time-based multiplier
    const getSkyTimeMultiplier = (): number => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return 1.2;      // 朝: 1.2倍
        if (hour >= 12 && hour < 18) return 1.0;     // 昼: 1.0倍
        if (hour >= 18 && hour < 22) return 1.5;     // 夕方: 1.5倍（ゴールデンタイム）
        return 0.8;                                   // 夜: 0.8倍
    };

    // Global MPS Calculation (Sum of all unlocked realms)
    useEffect(() => {
        let totalMps = 0;
        unlockedRealms.forEach(id => {
            let multiplier = 1;
            if (id === 'mine') multiplier = 1.5;
            if (id === 'sky') multiplier = getSkyTimeMultiplier();

            totalMps += calculateMps(realms[id]) * multiplier;
        });
        setMps(totalMps);
    }, [realms, unlockedRealms, setMps]);

    // Initial Load Effect
    useEffect(() => {
        const loaded = loadGame();
        if (!loaded) return;

        const { mana: loadedMana, offlineEarnings, realms: loadedRealms, specials, inventory: loadedInventory, enemiesDefeated: loadedKills } = loaded;

        if (loadedMana !== null) addMana(loadedMana);
        if (loadedKills !== undefined) incrementEnemiesDefeated(loadedKills);


        if (loadedInventory) {
            Object.entries(loadedInventory).forEach(([itemId, count]) => {
                if (count > 0) addItemToInventory(itemId as any, count);
            });
        }

        if (specials) {
            setBoostEndTime(specials.boostEndTime);
            setBarrierEndTime(specials.barrierEndTime);
            if (Date.now() < specials.barrierEndTime) {
                addLog("聖なる結界により、不在中の敵の侵攻は阻止されました。", "success");
            }
        }

        if (loadedRealms && offlineEarnings > 0) {
            let totalOfflineMps = 0;
            // Calculate total MPS from saved state to determine earnings
            // Assuming we use loadedRealms or current state? 
            // Current 'realms' might be initial state if useState run first, but loadGame is synchronous in useState.
            // So 'realms' state is already loaded.
            const currentUnlocked = loaded.unlockedRealms || ['plains'];
            currentUnlocked.forEach(id => {
                totalOfflineMps += calculateMps(loadedRealms[id]);
            });

            const earned = Math.floor(totalOfflineMps * offlineEarnings);
            if (earned > 0) {
                addMana(earned);
                const hrs = Math.floor(offlineEarnings / 3600);
                const mins = Math.floor((offlineEarnings % 3600) / 60);
                addLog(`おかえりなさい！ ${hrs}時間${mins}分の放置収益: +${earned.toLocaleString()}マナ`, 'success');
            }
        }
    }, []);

    // Enemy AI Loop
    const manaRef = useRef(mana);
    useEffect(() => { manaRef.current = mana; }, [mana]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (activeItem) return; // Pause while dragging

            setGrid(currentGrid => {
                const { newGrid, manaLost, logs: newLogs } = processEnemyActions(currentGrid, manaRef.current);

                if (manaLost > 0 || newLogs.length > 0) {
                    setTimeout(() => {
                        if (manaLost > 0) consumeMana(manaLost);
                        newLogs.forEach(l => addLog(l, 'danger'));
                        if (manaLost > 0) addLog(`マナが奪われました (-${manaLost})`, 'danger');
                    }, 0);
                    return newGrid;
                }
                return currentGrid;
            });

        }, 5000); // Every 5 seconds

        return () => clearInterval(intervalId);
    }, [activeItem, consumeMana]);

    // Dnd Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Must move 8px to start dragging, allows clicks
            },
        })
    );

    const addLog = (text: string, type: 'info' | 'warning' | 'danger' | 'success' = 'info') => {
        const now = new Date();
        const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        const newLog: LogEntry = {
            id: generateId(),
            timestamp,
            text,
            type,
        };
        setLogs(prev => [newLog, ...prev.slice(0, 49)]);
    };

    const handleDragStart = (event: DragStartEvent) => {
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

        // --- 0. Trash Bin Drop ---
        if (over.id === 'trash-zone') {
            const dragItem = active.data.current?.item as GridItem;
            // Prevent deleting enemies (safety check, though dragging them restricted anyway)
            if (dragItem?.type === 'enemy') return;

            const cost = calculatePurgeCost(mps);
            if (consumeMana(cost)) {
                SoundManager.getInstance().play('purge');
                const fromData = active.data.current as { x: number, y: number };
                // Remove item from grid
                const newGrid = [...grid.map(row => [...row.map(c => ({ ...c }))])];
                newGrid[fromData.y][fromData.x].item = null;
                setGrid(newGrid);
                setMps(calculateMps(newGrid));
                triggerImpact(ImpactStyle.Medium);

                // Show purge text
                const cellId = `cell-${fromData.x}-${fromData.y}`;
                const element = document.getElementById(cellId);
                if (element && floatingTextRef.current) {
                    const rect = element.getBoundingClientRect();
                    const container = document.querySelector(`.${styles.gridContainer}`);
                    const containerRect = container?.getBoundingClientRect() || { left: 0, top: 0 };

                    floatingTextRef.current.addText(
                        rect.left - containerRect.left + rect.width / 2,
                        rect.top - containerRect.top + rect.height / 2,
                        `-${cost}マナ`,
                        "#ff4757" // Red
                    );
                }
                addLog(`アイテムを消去しました。 (${cost.toLocaleString()}マナ消費)`, 'warning');
            } else {
                alert("マナが足りません！");
            }
            return;
        }

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

    const showFloatingText = (x: number, y: number, text: string, color: string) => {
        const cellId = `cell-${x}-${y}`;
        const element = document.getElementById(cellId);
        if (element && floatingTextRef.current) {
            const rect = element.getBoundingClientRect();
            const container = document.querySelector(`.${styles.gridContainer}`);
            const containerRect = container?.getBoundingClientRect() || { left: 0, top: 0 };

            floatingTextRef.current.addText(
                rect.left - containerRect.left + rect.width / 2,
                rect.top - containerRect.top + rect.height / 2,
                text,
                color
            );
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
        let totalManaGained = 0;

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

                // Show Merge Text
                showFloatingText(activeX, activeY, "MERGE!", "#ffa502");
                addLog(`ランク${result.createdItems[0].tier}のマナモンを合成！`, 'success');

                // Check 3: Check for Enemy Defeat (AoE based on Tier)
                const attackTargets = getAttackRange(targetCell.x, targetCell.y, result.createdItems[0].tier, GRID_WIDTH, GRID_HEIGHT);
                let enemyDefeatedCount = 0;

                attackTargets.forEach(({ x, y }) => {
                    const cell = gridState[y][x];
                    if (cell.item && cell.item.type === 'enemy') {
                        // Defeat Enemy!
                        gridState[y][x].item = null;
                        const reward = 50 * result.createdItems[0].tier; // Tier-based reward
                        addMana(reward);
                        totalManaGained += reward;
                        enemyDefeatedCount++;
                        incrementEnemiesDefeated(1);
                        showFloatingText(x, y, `+${reward}マナ`, "#2ed573");

                        addLog(`敵を撃破！ +${reward}マナ`, 'success');
                    }
                });

                if (enemyDefeatedCount > 0) {
                    triggerImpact(ImpactStyle.Heavy);
                    SoundManager.getInstance().play('pop', 0.5); // Reuse pop for now
                }

                // Visual/Audio Feedback
                // Pitch shift based on combo
                SoundManager.getInstance().play('merge', 1.0 + (comboCount * 0.2));
                triggerImpact(ImpactStyle.Medium);

                if (comboCount > 1) {
                    showFloatingText(activeX, activeY, `x${comboCount} COMBO!`, "#ff6b81");
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
        if (totalManaGained > 0) {
            showFloatingText(targetX, targetY, `+${totalManaGained}マナ`, "#2ed573");
        }
    };

    // --- Active Skills ---

    const handleUseItem = (itemId: InventoryItemId) => {
        // Try to use the item from inventory
        if (!useItemFromInventory(itemId)) {
            alert('アイテムを所持していません！');
            return;
        }

        // Execute the item effect (reuse existing logic from handleBuySpecialItem)
        switch (itemId) {
            case 'shuffle':
                useShuffleItem();
                break;
            case 'bomb':
                useBombItem();
                break;
            case 'barrier':
                useBarrierItem();
                break;
            case 'boost':
                useBoostItem();
                break;
            case 'elixir':
                useElixirItem();
                break;
            case 'armageddon':
                useArmageddonItem();
                break;
        }
    };

    const useShuffleItem = () => {
        try { SoundManager.getInstance().play('shuffle'); } catch (e) { console.error(e); }
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
        for (let i = emptyCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
        }

        items.forEach((item, index) => {
            if (index < emptyCells.length) {
                const { x, y } = emptyCells[index];
                newGrid[y][x].item = item;
            }
        });

        triggerImpact(ImpactStyle.Heavy);
        setGrid(newGrid);
        setMps(calculateMps(newGrid));
        showFloatingText(Math.floor(GRID_WIDTH / 2), Math.floor(GRID_HEIGHT / 2), "シャッフル！", "#00b894");
        addLog('シャッフルを使用しました。', 'info');
    };

    const useBombItem = () => {
        setGrid(currentGrid => {
            const newGrid = currentGrid.map(row => row.map(c => ({ ...c })));
            const enemies = [];
            for (let y = 0; y < GRID_HEIGHT; y++) {
                for (let x = 0; x < GRID_WIDTH; x++) {
                    if (newGrid[y][x].item?.type === 'enemy') {
                        enemies.push({ x, y });
                    }
                }
            }

            if (enemies.length === 0) {
                addLog("敵が見当たりませんでした...", "info");
                return newGrid;
            }

            for (let i = enemies.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [enemies[i], enemies[j]] = [enemies[j], enemies[i]];
            }

            const targets = enemies.slice(0, 5);
            targets.forEach(({ x, y }) => {
                newGrid[y][x].item = null;
                incrementEnemiesDefeated(1);
                showFloatingText(x, y, "BOOM!", "#e17055");
            });


            triggerImpact(ImpactStyle.Heavy);
            addLog(`マナ・ボムを使用！ ${targets.length}体の敵を吹き飛ばしました。`, "success");
            return newGrid;
        });
    };

    const useBarrierItem = () => {
        setBarrierEndTime(Date.now() + 24 * 60 * 60 * 1000);
        addLog("聖なる結界を展開しました。(24時間有効)", "success");
    };

    const useBoostItem = () => {
        setBoostEndTime(Date.now() + 60 * 1000);
        setMpsMultiplier(2);
        addLog("マナブースト発動！生産量2倍！(60秒)", "success");
    };

    const useElixirItem = () => {
        setGrid(currentGrid => {
            const newGrid = currentGrid.map(row => row.map(c => ({ ...c })));
            let minTier = 999;
            const items: { x: number, y: number, tier: number }[] = [];

            for (let y = 0; y < GRID_HEIGHT; y++) {
                for (let x = 0; x < GRID_WIDTH; x++) {
                    const item = newGrid[y][x].item;
                    if (item && item.type === 'creature' && !newGrid[y][x].isLocked) {
                        if (item.tier < minTier) minTier = item.tier;
                        items.push({ x, y, tier: item.tier });
                    }
                }
            }

            if (items.length === 0) return newGrid;

            const targets = items.filter(i => i.tier === minTier);
            targets.forEach(({ x, y }) => {
                const cell = newGrid[y][x];
                if (cell.item) {
                    cell.item.tier = Math.min(10, cell.item.tier + 1) as any;
                    showFloatingText(x, y, "LEVEL UP!", "#a29bfe");
                }
            });

            SoundManager.getInstance().play('merge', 1.0);
            addLog(`進化の秘薬を使用。ランク${minTier}のマナモンたちが成長しました！`, "success");
            setMps(calculateMps(newGrid));
            return newGrid;
        });
    };

    const useArmageddonItem = () => {
        setGrid(currentGrid => {
            const newGrid = currentGrid.map(row => row.map(c => ({ ...c })));
            let count = 0;
            let manaGain = 0;
            for (let y = 0; y < GRID_HEIGHT; y++) {
                for (let x = 0; x < GRID_WIDTH; x++) {
                    if (newGrid[y][x].item?.type === 'enemy') {
                        newGrid[y][x].item = null;
                        count++;
                        incrementEnemiesDefeated(1);
                        manaGain += 500;
                        showFloatingText(x, y, "+500", "#e17055");

                    }
                }
            }
            if (count > 0) {
                triggerImpact(ImpactStyle.Heavy);
                addMana(manaGain);
                addLog(`ハルマゲドンを使用！全ての敵が塵となり、${manaGain.toLocaleString()}マナへと還りました。`, "success");
            } else {
                addLog("敵はいませんでした。平和な世界です。", "info");
            }
            return newGrid;
        });
    };

    return (
        <>
            {showShop && <ShopModal onClose={() => setShowShop(false)} onBuyItem={(itemId) => {
                addItemToInventory(itemId as any, 1);
                return true;
            }} />}
            {showItemModal && <ItemModal onClose={() => setShowItemModal(false)} onOpenShop={() => { setShowItemModal(false); setShowShop(true); }} onUseItem={handleUseItem} />}

            {/* REALM TABS - MOVED OUTSIDE GRID CONTAINER */}
            <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', padding: '2px 0', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
                {(['plains', 'mine', 'sky'] as RealmId[]).map(realmId => {
                    const isUnlocked = unlockedRealms.includes(realmId);
                    const isActive = activeRealmId === realmId;
                    const config = REALM_CONFIG[realmId];
                    const hasKills = enemiesDefeated >= config.enemiesRequired;
                    const canUnlock = !isUnlocked && mana >= config.cost && hasKills;

                    return (
                        <button
                            key={realmId}
                            onClick={() => {
                                SoundManager.getInstance().play('button');
                                if (isUnlocked) {
                                    setActiveRealmId(realmId);
                                } else {
                                    if (confirm(`${config.name}を開放しますか？\nコスト: ${config.cost.toLocaleString()}マナ\n必要討伐数: ${config.enemiesRequired} (現在: ${enemiesDefeated})\n\n${config.description}`)) {
                                        handleUnlockRealm(realmId);
                                    }
                                }
                            }}
                            style={{
                                flex: 1,
                                minWidth: '80px',
                                padding: '8px 4px',
                                borderRadius: '12px',
                                border: isActive ? '2px solid #6c5ce7' : (canUnlock ? '2px solid #2ed573' : '1px solid rgba(0,0,0,0.1)'),
                                background: isActive ? '#6c5ce7' : (isUnlocked ? '#ffffff' : (canUnlock ? 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' : '#f1f2f6')),
                                color: isActive ? '#fff' : (isUnlocked ? '#333' : (canUnlock ? '#1e3c1f' : '#a4b0be')),

                                fontWeight: 'bold',
                                cursor: 'pointer',
                                opacity: isUnlocked ? 1 : (canUnlock ? 1 : 0.7),
                                boxShadow: isActive ? '0 4px 10px rgba(108, 92, 231, 0.4)' : (canUnlock ? '0 0 12px rgba(46, 213, 115, 0.6)' : 'none'),
                                transition: 'all 0.2s',
                                fontSize: '0.9rem',
                                animation: canUnlock ? 'pulse 1.5s ease-in-out infinite' : 'none',
                                position: 'relative' as const
                            }}
                        >
                            {isUnlocked ? config.name : (canUnlock ? `✨ ${config.name}` : `🔒 ${config.name}`)}
                            {canUnlock && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-5px',
                                    background: '#e17055',
                                    color: '#fff',
                                    fontSize: '0.6rem',
                                    padding: '2px 5px',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                }}>
                                    OPEN!
                                </span>
                            )}
                            {/* Sky realm time bonus indicator */}
                            {realmId === 'sky' && isUnlocked && (
                                <span style={{
                                    position: 'absolute',
                                    bottom: '-6px',
                                    right: '-5px',
                                    background: getSkyTimeMultiplier() >= 1.5 ? '#ffd700' : (getSkyTimeMultiplier() >= 1.0 ? '#74b9ff' : '#636e72'),
                                    color: getSkyTimeMultiplier() >= 1.5 ? '#333' : '#fff',
                                    fontSize: '0.55rem',
                                    padding: '2px 4px',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }}>
                                    ×{getSkyTimeMultiplier().toFixed(1)}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className={styles.gridContainer}>
                    <FloatingTextOverlay ref={floatingTextRef} />

                    {grid.map((row, y) => (
                        <div key={`row-${y}`} className={styles.row}>
                            {row.map((cell) => (
                                <GridCellComponent
                                    key={`${cell.x},${cell.y}`}
                                    id={`cell-${cell.x}-${cell.y}`}
                                    cell={cell}
                                />
                            ))}
                        </div>
                    ))}
                </div>

                <DragOverlay>
                    {activeItem ? (
                        <div className={`${styles.dragOverlay} ${styles[`tier-${activeItem.tier}`]} ${activeItem.type === 'enemy' ? styles.enemyItem : ''}`}>
                            {activeItem.type === 'creature' ? (
                                activeItem.tier <= 10 ? (
                                    <img
                                        src={(() => {
                                            const realm = activeItem.realmOrigin;
                                            const tier = activeItem.tier;
                                            let basePath = '/assets/creatures';

                                            if (realm === 'mine' && tier <= 5) {
                                                basePath = '/assets/creatures/mine';
                                            } else if (realm === 'sky' && tier <= 3) {
                                                basePath = '/assets/creatures/sky';
                                            }
                                            return `${basePath}/creature_t${tier}.png`;
                                        })()}
                                        style={{ width: '85%', height: '85%', objectFit: 'contain', borderRadius: '16px' }}
                                        alt={`Tier ${activeItem.tier}`}
                                    />
                                ) : (
                                    `Lv.${activeItem.tier}`
                                )
                            ) : (
                                <img
                                    src={`/assets/enemies/enemy_${activeItem.enemyVariant || 'shadow_slime'}.png`}
                                    style={{ width: '85%', height: '85%', objectFit: 'contain', borderRadius: '16px' }}
                                    alt={`Enemy T${activeItem.tier}`}
                                />
                            )}
                        </div>
                    ) : null}
                </DragOverlay>

                {/* CONTROLS */}
                <div className={styles.controls}>

                    <div style={{ display: 'flex', gap: '4px', width: '100%', maxWidth: '300px', justifyContent: 'center' }}>
                        <button
                            className={styles.summonButton}
                            style={{ flex: 1, padding: '8px', fontSize: '0.85rem', background: '#ffa502' }}
                            onClick={() => {
                                try { SoundManager.getInstance().play('button'); } catch (e) { console.error(e); }
                                setShowShop(true);
                            }}
                        >
                            ショップ
                        </button>
                        {/* Trash Bin Area */}
                        <TrashBin activeItem={activeItem} mana={mana} cost={calculatePurgeCost(mps)} />

                        <button
                            className={styles.summonButton}
                            style={{ flex: 1, padding: '8px', fontSize: '0.85rem', background: '#6c5ce7' }}
                            onClick={() => {
                                try { SoundManager.getInstance().play('button'); } catch (e) { console.error(e); }
                                setShowItemModal(true);
                            }}
                        >
                            🎒 アイテム
                        </button>
                    </div>

                    <button
                        className={styles.summonButton}
                        disabled={mana < calculateSummonCost(mana, mps)}
                        onClick={() => {
                            SoundManager.getInstance().play('button');
                            const cost = calculateSummonCost(mana, mps);
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
                                const rand = Math.random();
                                let tier = 1;
                                let type: 'creature' | 'enemy' = 'creature';

                                // Dynamic Enemy Chance based on progression
                                const enemyRate = calculateEnemySpawnRate(mana, mps, activeRealmId);
                                if (Math.random() < enemyRate) {
                                    type = 'enemy';
                                    tier = 1; // Enemy doesn't really use tier logic yet
                                } else {
                                    // Creature Logic - Use the probability from upgrades
                                    if (rand < probs.tier3) {
                                        tier = 3;
                                    } else if (rand < probs.tier3 + probs.tier2) {
                                        tier = 2;
                                    } else {
                                        tier = 1;
                                    }
                                }

                                // Determine enemy variant based on realm
                                const getEnemyVariant = () => {
                                    switch (activeRealmId) {
                                        case 'mine': return 'rock_golem' as const;
                                        case 'sky': return 'phantom' as const;
                                        default: return 'shadow_slime' as const;
                                    }
                                };

                                newGrid[target.y][target.x].item = {
                                    id: generateId(),
                                    tier: tier as any,
                                    type: type,
                                    realmOrigin: activeRealmId,
                                    ...(type === 'enemy' && { enemyVariant: getEnemyVariant() })
                                };
                                setGrid(newGrid);
                                setMps(calculateMps(newGrid));
                                triggerImpact(ImpactStyle.Light);
                                SoundManager.getInstance().play('pop', 1.0);
                            }
                        }}
                    >
                        召喚 ({calculateSummonCost(mana, mps).toLocaleString()} マナ)
                    </button>
                </div>

                {/* Helper Text for Purge Mode - REMOVED */}
            </DndContext>

            {/* Game Log Area */}
            <GameLog logs={logs} />
        </>
    );
};
