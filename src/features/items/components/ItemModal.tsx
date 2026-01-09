import React from 'react';
import { useEconomy } from '../../economy/context/EconomyContext';
import { INVENTORY_ITEMS_META, type InventoryItemId } from '../../shop/logic/shopLogic';
import { SoundManager } from '../../asmr/logic/SoundManager';
import styles from './ItemModal.module.css';

interface ItemModalProps {
    onClose: () => void;
    onOpenShop: () => void;
    onUseItem: (itemId: InventoryItemId) => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({ onClose, onOpenShop, onUseItem }) => {
    const { inventory } = useEconomy();

    const handleUseItem = (itemId: InventoryItemId) => {
        const count = inventory[itemId];
        if (count > 0) {
            SoundManager.getInstance().play('button');
            onUseItem(itemId);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>アイテム</h2>
                    <button
                        className={styles.closeButton}
                        onClick={() => {
                            SoundManager.getInstance().play('button');
                            onClose();
                        }}
                    >×</button>
                </div>

                <div className={styles.itemGrid}>
                    {INVENTORY_ITEMS_META.map((item) => {
                        const count = inventory[item.id];
                        const hasItem = count > 0;

                        return (
                            <div key={item.id} className={styles.itemCard}>
                                <div className={styles.itemIcon}>{item.icon}</div>
                                <div className={styles.itemInfo}>
                                    <div className={styles.itemName}>{item.name}</div>
                                    <div className={styles.itemDesc}>{item.description}</div>
                                </div>
                                <div className={styles.itemActions}>
                                    <div className={styles.itemCount}>x{count}</div>
                                    <button
                                        className={styles.useButton}
                                        disabled={!hasItem}
                                        onClick={() => handleUseItem(item.id)}
                                    >
                                        使用
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button
                    className={styles.shopButton}
                    onClick={() => {
                        SoundManager.getInstance().play('button');
                        onOpenShop();
                    }}
                >
                    ショップで購入
                </button>
            </div>
        </div>
    );
};
