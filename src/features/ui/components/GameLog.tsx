import React, { useRef } from 'react';

export interface LogEntry {
    id: string;
    timestamp: string;
    text: string;
    type: 'info' | 'warning' | 'danger' | 'success';
}

interface GameLogProps {
    logs: LogEntry[];
}

export const GameLog: React.FC<GameLogProps> = ({ logs }) => {
    const listRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom directly without dependency array for logs to avoid jumpiness? 
    // Or just simple dependency.
    // Auto-scroll removed for new-on-top order

    return (
        <div style={{
            width: '100%',
            height: '150px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '8px',
            overflowY: 'auto',
            fontSize: '0.8rem',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '3px' }}>
                戦況報告
            </div>
            <div ref={listRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {logs.length === 0 && <div style={{ color: '#aaa', fontStyle: 'italic' }}>記録はありません...</div>}
                {logs.map((log) => (
                    <div key={log.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{ color: '#999', fontSize: '0.75rem', minWidth: '60px' }}>[{log.timestamp}]</span>
                        <span style={{
                            color: log.type === 'danger' ? '#e17055' :
                                log.type === 'warning' ? '#e1b12c' :
                                    log.type === 'success' ? '#00b894' : '#2d3436',
                            wordBreak: 'break-word',
                            flex: 1,
                        }}>
                            {log.text}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
