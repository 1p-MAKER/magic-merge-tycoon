import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface UpgradeStats {
    summonLuck: number;
}

import { type InventoryItemId } from '../../shop/logic/shopLogic';

export interface Inventory {
    shuffle: number;
    bomb: number;
    barrier: number;
    boost: number;
    elixir: number;
    armageddon: number;
}

export interface OfflineStats {
    efficiency: number; // 0.25 (25%) to 1.0 (100%)
    maxTime: number;    // Seconds, e.g., 7200 (2 hours)
}

interface EconomyContextType {
    mana: number;
    addMana: (amount: number) => void;
    consumeMana: (amount: number) => boolean;
    mps: number;
    setMps: (mps: number) => void;
    upgrades: UpgradeStats;
    setUpgrades: React.Dispatch<React.SetStateAction<UpgradeStats>>;
    upgradeSummonLuck: () => void;
    mpsMultiplier: number;
    setMpsMultiplier: (multiplier: number) => void;
    inventory: Inventory;
    addItemToInventory: (itemId: InventoryItemId, count: number) => void;
    useItemFromInventory: (itemId: InventoryItemId) => boolean;
    offlineStats: OfflineStats;
    upgradeOfflineStats: (type: 'efficiency' | 'time') => void;
}

const EconomyContext = createContext<EconomyContextType | undefined>(undefined);

// Upgrade State defined at top of file

export const EconomyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mana, setMana] = useState(0);
    const [mps, setMps] = useState(0);
    const [mpsMultiplier, setMpsMultiplier] = useState(1);
    const [upgrades, setUpgrades] = useState<UpgradeStats>({ summonLuck: 1 });
    const [inventory, setInventory] = useState<Inventory>({
        shuffle: 0,
        bomb: 0,
        barrier: 0,
        boost: 0,
        elixir: 0,
        armageddon: 0,
    });
    const [offlineStats, setOfflineStats] = useState<OfflineStats>({
        efficiency: 0.25, // Start at 25% efficiency
        maxTime: 7200,    // Start at 2 hours
    });

    // Passive Mana Generation
    useEffect(() => {
        const effectiveMps = mps * mpsMultiplier;
        if (effectiveMps <= 0) return;
        const interval = setInterval(() => {
            setMana(prev => prev + effectiveMps);
        }, 1000); // Add MPS every second
        return () => clearInterval(interval);
    }, [mps, mpsMultiplier]);

    const addMana = (amount: number) => {
        setMana(prev => prev + amount);
    };

    const consumeMana = (amount: number): boolean => {
        if (mana >= amount) {
            setMana(prev => prev - amount);
            return true;
        }
        return false;
    };

    const upgradeSummonLuck = () => {
        setUpgrades(prev => ({ ...prev, summonLuck: prev.summonLuck + 1 }));
    };

    const addItemToInventory = (itemId: InventoryItemId, count: number = 1) => {
        setInventory(prev => ({
            ...prev,
            [itemId]: prev[itemId] + count,
        }));
    };

    const useItemFromInventory = (itemId: InventoryItemId): boolean => {
        if (inventory[itemId] > 0) {
            setInventory(prev => ({
                ...prev,
                [itemId]: prev[itemId] - 1,
            }));
            return true;
        }
        return false;
    };

    const upgradeOfflineStats = (type: 'efficiency' | 'time') => {
        setOfflineStats(prev => {
            if (type === 'efficiency') {
                return { ...prev, efficiency: Math.min(1.0, prev.efficiency + 0.05) };
            } else {
                return { ...prev, maxTime: prev.maxTime + 3600 }; // +1 hour
            }
        });
    };

    return (
        <EconomyContext.Provider value={{
            mana,
            addMana,
            consumeMana,
            mps,
            setMps,
            upgrades,
            setUpgrades,
            upgradeSummonLuck,
            mpsMultiplier,
            setMpsMultiplier,
            inventory,
            addItemToInventory,
            useItemFromInventory,
            offlineStats,
            upgradeOfflineStats,
        }}>
            {children}
        </EconomyContext.Provider>
    );
};

export const useEconomy = () => {
    const context = useContext(EconomyContext);
    if (!context) {
        throw new Error('useEconomy must be used within an EconomyProvider');
    }
    return context;
};
