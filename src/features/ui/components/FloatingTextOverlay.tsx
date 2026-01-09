import { useState, forwardRef, useImperativeHandle, useRef } from 'react';

export interface FloatingTextHandle {
    addText: (x: number, y: number, text: string, color?: string) => void;
}

interface TextItem {
    id: number;
    x: number;
    y: number;
    text: string;
    color: string;
}

export const FloatingTextOverlay = forwardRef<FloatingTextHandle, {}>((_, ref) => {
    const [items, setItems] = useState<TextItem[]>([]);
    const counter = useRef(0);

    useImperativeHandle(ref, () => ({
        addText: (x, y, text, color = '#fff') => {
            const id = counter.current++;
            setItems(prev => [...prev, { id, x, y, text, color }]);

            // Auto remove after animation
            setTimeout(() => {
                setItems(prev => prev.filter(item => item.id !== id));
            }, 1000); // Match CSS animation duration
        }
    }));

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 1000 // High z-index
        }}>
            {items.map(item => (
                <div
                    key={item.id}
                    style={{
                        position: 'absolute',
                        left: item.x,
                        top: item.y,
                        color: item.color,
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        textShadow: '0px 2px 4px rgba(0,0,0,0.5)',
                        animation: 'floatUp 1s ease-out forwards',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                    }}
                >
                    {item.text}
                </div>
            ))}
            <style>{`
                @keyframes floatUp {
                    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                    20% { transform: translate(-50%, -100%) scale(1.2); opacity: 1; }
                    100% { transform: translate(-50%, -300%) scale(1); opacity: 0; }
                }
            `}</style>
        </div>
    );
});

FloatingTextOverlay.displayName = 'FloatingTextOverlay';
