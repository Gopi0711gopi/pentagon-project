'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const saved = localStorage.getItem('pentagon_theme') || 'dark';
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

    const toggle = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('pentagon_theme', next);

        // Toast feedback
        window.__pentagonToast?.({
            message: `Switched to ${next} mode`,
            level: 'info',
            source: 'system',
        });
    };

    return (
        <button onClick={toggle} className="animate-icon-spin" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px', padding: '7px 11px', cursor: 'pointer', fontSize: '16px',
            color: 'var(--text-secondary)', transition: 'all 0.3s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
        >
            <span className="icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
        </button>
    );
}
