import React from 'react';
import { useEconomy } from '../../economy/context/EconomyContext';
import styles from './HUD.module.css';

export const HUD: React.FC = () => {
    const { mana, mps } = useEconomy();

    return (
        <div className={styles.container}>
            <div className={styles.stat}>
                <span className={styles.label}>Mana</span>
                <span className={styles.value}>{Math.floor(mana).toLocaleString()}</span>
            </div>

            <div className={styles.stat}>
                <span className={styles.label}>Rate</span>
                <span className={styles.mps}>{mps}/s</span>
            </div>
        </div>
    );
};
