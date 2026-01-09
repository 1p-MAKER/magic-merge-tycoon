import React, { useState } from 'react';
import { useEconomy } from '../../economy/context/EconomyContext';
import { SoundManager } from '../../asmr/logic/SoundManager';
import styles from './HUD.module.css';
import { SettingsModal } from './SettingsModal';

export const HUD: React.FC = () => {
    const { mana, mps } = useEconomy();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <>
            <div className={styles.container}>
                <div className={styles.statsGroup}>
                    <div className={styles.stat}>
                        <span className={styles.label}>マナ</span>
                        <span className={styles.value}>{Math.floor(mana).toLocaleString()}</span>
                    </div>

                    <div className={styles.stat}>
                        <span className={styles.label}>マナスピード</span>
                        <span className={styles.mps}>{mps.toLocaleString(undefined, { maximumFractionDigits: 1 })}/s</span>
                    </div>
                </div>

                <button
                    className={styles.settingsButton}
                    onClick={() => {
                        SoundManager.getInstance().play('button');
                        setIsSettingsOpen(true);
                    }}
                    aria-label="Settings"
                >
                    ⚙️
                </button>
            </div>

            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
        </>
    );
};
