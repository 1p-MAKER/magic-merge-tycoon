import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { type GridCell as GridCellType } from '../logic/types';
import styles from './GridCell.module.css';

interface GridCellProps {
    cell: GridCellType;
    isSelected?: boolean;
    id?: string;
    onClick?: () => void;
}

export const GridCell: React.FC<GridCellProps> = ({ cell, id, onClick }) => {
    const cellId = `${cell.x},${cell.y}`;

    // Droppable handling (Accepts drops)
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: id || cellId, // Use prop id if available, otherwise default
        data: { x: cell.x, y: cell.y },
    });

    // Draggable handling (If item exists)
    const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
        id: cell.item ? cell.item.id : `empty-${cellId}`,
        data: { x: cell.x, y: cell.y, item: cell.item },
        disabled: !cell.item || cell.isLocked || cell.item.type === 'enemy',
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 999 : 'auto',
    } : undefined;

    return (
        <div
            ref={setDroppableRef}
            className={`${styles.cell} ${isOver ? styles.over : ''} ${cell.isLocked ? styles.locked : ''}`}
            onClick={onClick}
        >
            {cell.item && (
                <div
                    ref={setDraggableRef}
                    style={style}
                    {...listeners}
                    {...attributes}
                    className={`${styles.item} ${styles[`tier-${cell.item.tier}`]} ${cell.item.type === 'enemy' ? styles.enemyItem : ''}`}
                    onClick={() => {
                        // Ensure click propagates if not dragging, but dnd-kit might capture it.
                        // Actually, dnd-kit listeners usually capture mousedown/touchstart.
                        // Standard click should still fire if not dragged.
                        // But explicitly calling onClick here ensures it works.
                        if (onClick) onClick();
                    }}
                >
                    {cell.item.type === 'enemy' ? (() => {
                        const variant = cell.item.enemyVariant || 'shadow_slime';
                        const imagePath = `/assets/enemies/enemy_${variant}.png`;
                        return (
                            <img
                                src={imagePath}
                                className={styles.itemImage}
                                style={{ borderRadius: '16px' }}
                                alt={variant}
                            />
                        );
                    })() : cell.item.tier <= 10 ? (() => {
                        // Determine creature path based on realm origin
                        const realm = cell.item.realmOrigin;
                        const tier = cell.item.tier;
                        let basePath = '/assets/creatures';

                        if (realm === 'mine' && tier <= 5) {
                            basePath = '/assets/creatures/mine';
                        } else if (realm === 'sky' && tier <= 3) {
                            basePath = '/assets/creatures/sky';
                        }

                        return (
                            <img
                                src={`${basePath}/creature_t${tier}.png`}
                                className={styles.itemImage}
                                style={{ borderRadius: '16px' }}
                                alt={`Creature T${tier}`}
                            />
                        );
                    })() : (
                        <div className={styles.placeholder}>
                            Lv.{cell.item.tier}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
