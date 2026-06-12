'use client';

import { useEffect, useCallback } from 'react';

export default function useKeyboard({ onTabSwitch, onFocusSearch, onFocusCommand, onShowHelp }) {
    const handleKeyDown = useCallback((e) => {
        const tag = e.target.tagName;
        const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

        // Ctrl+K → Focus search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            onFocusSearch?.();
            return;
        }

        // Ctrl+/ → Focus command bar
        if ((e.metaKey || e.ctrlKey) && e.key === '/') {
            e.preventDefault();
            onFocusCommand?.();
            return;
        }

        // Escape → blur active input
        if (e.key === 'Escape') {
            if (isTyping) {
                e.target.blur();
                return;
            }
        }

        // Don't capture when typing in inputs
        if (isTyping) return;

        // ? → keyboard help
        if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onShowHelp?.();
            return;
        }

        // 1-8 → tab switching
        const num = parseInt(e.key);
        if (num >= 1 && num <= 8 && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            onTabSwitch?.(num - 1);
        }
    }, [onTabSwitch, onFocusSearch, onFocusCommand, onShowHelp]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
