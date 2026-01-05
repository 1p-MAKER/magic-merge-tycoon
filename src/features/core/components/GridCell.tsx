import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { type GridCell as GridCellType } from '../logic/types';
import styles from './GridCell.module.css';

interface GridCellProps {
    cell: GridCellType;
    isSelected?: boolean;
}

export const GridCell: React.FC<GridCellProps> = ({ cell }) => {
    const cellId = `${cell.x},${cell.y}`;

    // Droppable handling (Accepts drops)
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: cellId,
        data: { x: cell.x, y: cell.y },
    });

    // Draggable handling (If item exists)
    const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
        id: cell.item ? cell.item.id : `empty-${cellId}`,
        data: { x: cell.x, y: cell.y, item: cell.item },
        disabled: !cell.item || cell.isLocked,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 999 : 'auto',
    } : undefined;

    return (
        <div
            ref={setDroppableRef}
            className={`${styles.cell} ${isOver ? styles.over : ''} ${cell.isLocked ? styles.locked : ''}`}
        >
            {cell.item && (
                <div
                    ref={setDraggableRef}
                    style={style}
                    {...listeners}
                    {...attributes}
                    className={`${styles.item} ${styles[`tier-${cell.item.tier}`]}`}
                >
                    {cell.item.tier <= 5 ? (
                        <img
                            src={`/assets/creatures/creature_t${cell.item.tier}.png`}
                            className={styles.itemImage}
                            alt={`Tier ${cell.item.tier}`}
                        />
                    ) : (
                        <span className={styles.label}>
                            T{cell.item.tier}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
