import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface EconomyContextType {
    mana: number;
    addMana: (amount: number) => void;
    consumeMana: (amount: number) => boolean;
    mps: number;
    setMps: (mps: number) => void;
}

const EconomyContext = createContext<EconomyContextType | undefined>(undefined);

export const EconomyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mana, setMana] = useState(0);
    const [mps, setMps] = useState(0);

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

    return (
        <EconomyContext.Provider value={{ mana, addMana, consumeMana, mps, setMps }}>
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
