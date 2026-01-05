import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface UpgradeStats {
    summonLuck: number;
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
}

const EconomyContext = createContext<EconomyContextType | undefined>(undefined);

// Define Upgrade State locally to avoid circ dependency issues if any
interface UpgradeStats {
    summonLuck: number;
}

export const EconomyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mana, setMana] = useState(0);
    const [mps, setMps] = useState(0);
    const [upgrades, setUpgrades] = useState<UpgradeStats>({ summonLuck: 1 });

    // Passive Mana Generation
    useEffect(() => {
        if (mps <= 0) return;
        const interval = setInterval(() => {
            setMana(prev => prev + mps);
        }, 1000); // Add MPS every second
        return () => clearInterval(interval);
    }, [mps]);

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

    return (
        <EconomyContext.Provider value={{ mana, addMana, consumeMana, mps, setMps, upgrades, setUpgrades, upgradeSummonLuck }}>
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
