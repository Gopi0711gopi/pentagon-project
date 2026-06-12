'use client';

const SHORTCUTS = [
    { keys: ['Ctrl', 'K'], action: 'Focus search bar' },
    { keys: ['Ctrl', '/'], action: 'Focus command bar' },
    { keys: ['1-8'], action: 'Switch between tabs' },
    { keys: ['?'], action: 'Show this help' },
    { keys: ['Esc'], action: 'Close modal / blur input' },
    { keys: ['↑', '↓'], action: 'Navigate suggestions' },
    { keys: ['Tab'], action: 'Accept suggestion' },
    { keys: ['Enter'], action: 'Execute command' },
];

export default function KeyboardHelp({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)', zIndex: 9998,
            }} />

            {/* Modal */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: 420, background: 'rgba(10,18,35,0.98)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px', padding: '28px 32px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(20px)', zIndex: 9999,
                animation: 'fadeIn 0.2s ease',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800 }}>
                        <span className="gradient-text">Keyboard Shortcuts</span> ⌨️
                    </h2>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', color: 'var(--text-muted)',
                        fontSize: '12px', fontFamily: 'var(--font-mono)',
                    }}>
                        ESC
                    </button>
                </div>

                {SHORTCUTS.map((s, i) => (
                    <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: i < SHORTCUTS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{s.action}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {s.keys.map(k => (
                                <kbd key={k} style={{
                                    fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600,
                                    padding: '3px 8px', borderRadius: '6px',
                                    background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)',
                                    color: '#38bdf8', minWidth: '24px', textAlign: 'center',
                                }}>
                                    {k}
                                </kbd>
                            ))}
                        </div>
                    </div>
                ))}

                <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.1)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        💡 Shortcuts work when no input field is focused (except Ctrl+K and Ctrl+/)
                    </div>
                </div>
            </div>
        </>
    );
}
