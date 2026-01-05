import React, { useEffect, useState } from 'react';
import { usePersistence } from '../../../persistence/hooks/usePersistence';
import { calculateMps } from '../../../economy/logic/economyUtils';
import styles from './TitleScreen.module.css';

interface TitleScreenProps {
    onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
    const { loadGame } = usePersistence();
    const [earnedMana, setEarnedMana] = useState<number>(0);

    useEffect(() => {
        const { offlineEarnings, grid } = loadGame();
        if (grid && offlineEarnings > 0) {
            const currentMps = calculateMps(grid);
            const earned = Math.floor(currentMps * offlineEarnings);
            setEarnedMana(earned);
        }
    }, [loadGame]);

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>マジックマージ</h1>

                {earnedMana > 0 && (
                    <div className={styles.offlineBox}>
                        <p className={styles.offlineLabel}>お帰りなさい！</p>
                        <p className={styles.offlineValue}>
                            オフライン収益: <span className={styles.highlight}>{earnedMana.toLocaleString()}</span> マナ
                        </p>
                    </div>
                )}

                <button className={styles.startButton} onClick={onStart}>
                    スタート
                </button>
            </div>
        </div>
    );
};
