import React from 'react';
import { useEconomy } from '../../economy/context/EconomyContext';
import { calculateSummonUpgradeCost, getSummonProbabilities, isMaxSummonLevel, INVENTORY_ITEMS_META, calculateItemPrice, calculateOfflineUpgradeCost, type ItemId } from '../logic/shopLogic';
import { SoundManager } from '../../asmr/logic/SoundManager';
import styles from './ShopModal.module.css';

interface ShopModalProps {
    onClose: () => void;
    onBuyItem: (itemId: ItemId) => boolean;
}

export const ShopModal: React.FC<ShopModalProps> = ({ onClose, onBuyItem }) => {
    const { mana, consumeMana, upgrades, upgradeSummonLuck, mps, offlineStats, upgradeOfflineStats } = useEconomy();

    // Summon Luck Logic
    const currentLevel = upgrades.summonLuck;
    const isMax = isMaxSummonLevel(currentLevel);
    const nextCost = calculateSummonUpgradeCost(currentLevel);
    const currentProbs = getSummonProbabilities(currentLevel);
    const nextProbs = getSummonProbabilities(currentLevel + 1); // Safe even if max, handled by clamp

    const handleBuySummonUpgrade = () => {
        SoundManager.getInstance().play('button');
        if (consumeMana(nextCost)) {
            SoundManager.getInstance().play('merge', 1.5); // High pitch merge sound for success
            upgradeSummonLuck();
        } else {
            alert("マナが足りません！");
        }
    };

    const handleBuySpecial = (item: typeof INVENTORY_ITEMS_META[0]) => {
        SoundManager.getInstance().play('button');
        const price = calculateItemPrice(item.id, mps);

        if (mana < price) {
            alert("マナが足りません！");
            return;
        }

        if (consumeMana(price)) {
            const success = onBuyItem(item.id);
            if (success) {
                SoundManager.getInstance().play('merge', 1.2);
                alert(`${item.name}を購入しました！`);
            }
        }
    };

    const handleBuyOfflineUpgrade = (type: 'efficiency' | 'time') => {
        SoundManager.getInstance().play('button');
        const currentVal = type === 'efficiency' ? offlineStats.efficiency : offlineStats.maxTime;

        // Cap check
        if (type === 'efficiency' && currentVal >= 1.0) {
            alert("これ以上強化できません！");
            return;
        }
        if (type === 'time' && currentVal >= 43200) { // 12 hours max
            alert("これ以上強化できません！");
            return;
        }

        const price = calculateOfflineUpgradeCost(currentVal, type);

        if (consumeMana(price)) {
            upgradeOfflineStats(type);
            SoundManager.getInstance().play('merge', 1.5);
        } else {
            alert("マナが足りません！");
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.fixedHeader}>
                    <div className={styles.header}>
                        <h2>ショップ</h2>
                        <button
                            className={styles.closeButton}
                            onClick={() => {
                                SoundManager.getInstance().play('button');
                                onClose();
                            }}
                        >×</button>
                    </div>

                    <div className={styles.balance}>
                        所持マナ: <span className={styles.manaValue}>{Math.floor(mana).toLocaleString()}</span>
                    </div>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <h3>召喚運アップ (Lv.{currentLevel})</h3>
                        <p className={styles.desc}>
                            召喚時に高いランクが出る確率が上がります。
                        </p>
                        <div className={styles.stats}>
                            <div className={styles.probRow}>
                                <span>ランク 1:</span>
                                <span>{(currentProbs.tier1 * 100).toFixed(0)}%</span>
                                {!isMax && currentProbs.tier1 !== nextProbs.tier1 && (
                                    <span className={styles.arrow}>→ {(nextProbs.tier1 * 100).toFixed(0)}%</span>
                                )}
                            </div>
                            <div className={styles.probRow}>
                                <span>ランク 2:</span>
                                <span>{(currentProbs.tier2 * 100).toFixed(0)}%</span>
                                {!isMax && currentProbs.tier2 !== nextProbs.tier2 && (
                                    <span className={styles.diffPositive}>→ {(nextProbs.tier2 * 100).toFixed(0)}%</span>
                                )}
                            </div>
                            <div className={styles.probRow}>
                                <span>ランク 3:</span>
                                <span>{(currentProbs.tier3 * 100).toFixed(0)}%</span>
                                {!isMax && currentProbs.tier3 !== nextProbs.tier3 && (
                                    <span className={styles.diffPositive}>→ {(nextProbs.tier3 * 100).toFixed(0)}%</span>
                                )}
                            </div>
                        </div>
                        <button
                            className={styles.buyButton}
                            disabled={isMax || mana < nextCost}
                            onClick={handleBuySummonUpgrade}
                            style={isMax ? { background: '#aaa', cursor: 'default' } : {}}
                        >
                            {isMax ? '強化完了 (MAX)' : `強化する (${nextCost.toLocaleString()} マナ)`}
                        </button>
                    </div>


                    {/* System Upgrades */}
                    <div className={styles.section} style={{ marginTop: '20px', borderTop: '2px dashed #eee', paddingTop: '15px' }}>
                        <h3>🚀 システム強化</h3>
                        <p className={styles.desc}>放置収益の効率と時間を強化します。</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                            {/* Efficiency */}
                            <div className={styles.upgradeRow} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold' }}>放置収益効率</div>
                                    <div style={{ fontSize: '0.75rem', color: '#666' }}>現在: {(offlineStats.efficiency * 100).toFixed(0)}% → {(Math.min(1.0, offlineStats.efficiency + 0.05) * 100).toFixed(0)}%</div>
                                </div>
                                <button
                                    className={styles.buyButton}
                                    style={{ width: 'auto', minWidth: '120px', padding: '8px 16px', background: offlineStats.efficiency >= 1.0 ? '#ccc' : '#2ed573', color: 'white', border: 'none', borderRadius: '5px' }}
                                    disabled={offlineStats.efficiency >= 1.0 || mana < calculateOfflineUpgradeCost(offlineStats.efficiency, 'efficiency')}
                                    onClick={() => handleBuyOfflineUpgrade('efficiency')}
                                >
                                    {offlineStats.efficiency >= 1.0 ? 'MAX' : `${calculateOfflineUpgradeCost(offlineStats.efficiency, 'efficiency').toLocaleString()} マナ`}
                                </button>
                            </div>

                            {/* Time */}
                            <div className={styles.upgradeRow} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold' }}>最大放置時間</div>
                                    <div style={{ fontSize: '0.75rem', color: '#666' }}>現在: {(offlineStats.maxTime / 3600).toFixed(1)}時間 → {((offlineStats.maxTime + 3600) / 3600).toFixed(1)}時間</div>
                                </div>
                                <button
                                    className={styles.buyButton}
                                    style={{ width: 'auto', minWidth: '120px', padding: '8px 16px', background: offlineStats.maxTime >= 43200 ? '#ccc' : '#2ed573', color: 'white', border: 'none', borderRadius: '5px' }}
                                    disabled={offlineStats.maxTime >= 43200 || mana < calculateOfflineUpgradeCost(offlineStats.maxTime, 'time')}
                                    onClick={() => handleBuyOfflineUpgrade('time')}
                                >
                                    {offlineStats.maxTime >= 43200 ? 'MAX' : `${calculateOfflineUpgradeCost(offlineStats.maxTime, 'time').toLocaleString()} マナ`}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Always show Item Shop  */}
                    <div className={styles.section} style={{ marginTop: '20px', borderTop: '2px dashed #eee', paddingTop: '15px' }}>
                        <h3 style={{ color: isMax ? '#6c5ce7' : '#999' }}>
                            {isMax ? '✨ アイテムショップ ✨' : '🔒 アイテムショップ'}
                        </h3>
                        <p className={styles.desc} style={{ color: isMax ? '#666' : '#999' }}>
                            {isMax ? '魔法アイテムを購入してインベントリに追加できます。' : '召喚運 Lv.10 で解禁されます'}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                            {INVENTORY_ITEMS_META.map((item) => {
                                const price = calculateItemPrice(item.id, mps);
                                return (
                                    <button
                                        key={item.id}
                                        className={styles.buyButton}
                                        style={{
                                            background: isMax ? '#fff' : '#f5f5f5',
                                            border: '1px solid #ddd',
                                            color: isMax ? '#333' : '#999',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px',
                                            textAlign: 'left',
                                            opacity: isMax ? 1 : 0.6,
                                            cursor: isMax ? 'pointer' : 'not-allowed'
                                        }}
                                        disabled={!isMax || mana < price}
                                        onClick={() => isMax && handleBuySpecial(item)}
                                    >
                                        <span style={{ fontSize: '1.5rem', filter: isMax ? 'none' : 'grayscale(100%)' }}>{item.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: isMax ? '#666' : '#999' }}>{item.description}</div>
                                        </div>
                                        <div style={{ fontWeight: 'bold', color: isMax ? (mana >= price ? '#2ed573' : '#e17055') : '#999' }}>
                                            {isMax ? price.toLocaleString() : '???'}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
