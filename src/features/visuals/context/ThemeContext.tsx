import React, { createContext, useEffect, type ReactNode } from 'react';
import { useNightMode } from '../hooks/useNightMode';

interface ThemeContextType {
    isNight: boolean;
    theme: 'polluted' | 'purified'; // Simplified for now
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const isNight = useNightMode();
    const theme = 'purified'; // Hardcoded for 'Purified' as high saturation target, or logic to switch?
    // User Prompt: "Polluted when low saturation... Purified high saturation code"
    // Let's stick to setting CSS variables on the body based on these states.

    useEffect(() => {
        const root = document.documentElement;
        if (isNight) {
            root.classList.add('night-mode');
            root.classList.remove('day-mode');
        } else {
            root.classList.add('day-mode');
            root.classList.remove('night-mode');
        }

        // Default theme class
        root.classList.add('theme-purified');
    }, [isNight]);

    return (
        <ThemeContext.Provider value={{ isNight, theme }}>
            {children}
        </ThemeContext.Provider>
    );
};
