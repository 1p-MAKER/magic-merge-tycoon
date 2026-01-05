import React from 'react';
import { useEconomy } from '../../economy/context/EconomyContext';
import { calculateSummonUpgradeCost, getSummonProbabilities } from '../logic/shopLogic';
import styles from './ShopModal.module.css';

interface ShopModalProps {
    onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ onClose }) => {
    const { mana, consumeMana, upgrades, upgradeSummonLuck } = useEconomy();

    // Summon Luck Logic
    const currentLevel = upgrades.summonLuck;
    const nextCost = calculateSummonUpgradeCost(currentLevel);
    const currentProbs = getSummonProbabilities(currentLevel);
    const nextProbs = getSummonProbabilities(currentLevel + 1);

    const handleBuySummonUpgrade = () => {
        if (consumeMana(nextCost)) {
            upgradeSummonLuck();
            // Play purchase sound?
        } else {
            alert("マナが足りません！");
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>ショップ</h2>
                    <button className={styles.closeButton} onClick={onClose}>×</button>
                </div>

                <div className={styles.balance}>
                    所持マナ: <span className={styles.manaValue}>{Math.floor(mana).toLocaleString()}</span>
                </div>

                <div className={styles.section}>
                    <h3>召喚運アップ (Lv.{currentLevel})</h3>
                    <p className={styles.desc}>
                        召喚時に高いTierが出る確率が上がります。
                    </p>
                    <div className={styles.stats}>
                        <div className={styles.probRow}>
                            <span>Tier 1:</span>
                            <span>{(currentProbs.tier1 * 100).toFixed(0)}%</span>
                            {currentProbs.tier1 !== nextProbs.tier1 && (
                                <span className={styles.arrow}>→ {(nextProbs.tier1 * 100).toFixed(0)}%</span>
                            )}
                        </div>
                        <div className={styles.probRow}>
                            <span>Tier 2:</span>
                            <span>{(currentProbs.tier2 * 100).toFixed(0)}%</span>
                            {currentProbs.tier2 !== nextProbs.tier2 && (
                                <span className={styles.diffPositive}>→ {(nextProbs.tier2 * 100).toFixed(0)}%</span>
                            )}
                        </div>
                        <div className={styles.probRow}>
                            <span>Tier 3:</span>
                            <span>{(currentProbs.tier3 * 100).toFixed(0)}%</span>
                            {currentProbs.tier3 !== nextProbs.tier3 && (
                                <span className={styles.diffPositive}>→ {(nextProbs.tier3 * 100).toFixed(0)}%</span>
                            )}
                        </div>
                    </div>
                    <button
                        className={styles.buyButton}
                        disabled={mana < nextCost}
                        onClick={handleBuySummonUpgrade}
                    >
                        強化する ({nextCost.toLocaleString()} マナ)
                    </button>
                </div>
            </div>
        </div>
    );
};
