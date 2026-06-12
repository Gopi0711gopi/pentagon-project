'use client';

import { useState, useEffect, useRef } from 'react';
import VoiceControl from './VoiceControl';
import FileUploader from './FileUploader';
import { useToast } from './ToastManager';

export default function CommandBar({ onSubmit, isStreaming, onSlashCommand, lastResponse }) {
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [slashCommands, setSlashCommands] = useState([]);
    const [selectedIdx, setSelectedIdx] = useState(-1);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyIdx, setHistoryIdx] = useState(-1);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);
    const { addToast } = useToast();

    // Load command history from localStorage
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('pentagon_cmd_history') || '[]');
            setHistory(saved);
        } catch { }
    }, []);

    const saveToHistory = (cmd) => {
        const updated = [cmd, ...history.filter(h => h !== cmd)].slice(0, 20);
        setHistory(updated);
        localStorage.setItem('pentagon_cmd_history', JSON.stringify(updated));
    };

    const fetchSuggestions = (q) => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (!q.trim()) {
                // Show history when empty
                setSuggestions(history.slice(0, 5).map(h => ({ label: h, icon: '🕐', category: 'history' })));
                setSlashCommands([]);
                setShowSuggestions(history.length > 0);
                return;
            }
            fetch(`http://localhost:8000/api/command-suggestions?q=${encodeURIComponent(q)}`)
                .then(r => r.json())
                .then(d => {
                    setSuggestions(d.suggestions || []);
                    setSlashCommands(d.slash || []);
                    setShowSuggestions((d.suggestions?.length > 0) || (d.slash?.length > 0));
                    setSelectedIdx(-1);
                })
                .catch(() => { });
        }, 150);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInput(val);
        setHistoryIdx(-1);
        fetchSuggestions(val);
    };

    const handleSubmit = (e) => {
        e?.preventDefault();
        const cmd = input.trim();
        if (!cmd || isStreaming) return;

        // Handle slash commands
        if (cmd.startsWith('/')) {
            onSlashCommand?.(cmd);
            setInput('');
            setShowSuggestions(false);
            return;
        }

        saveToHistory(cmd);
        onSubmit(cmd);
        setInput('');
        setShowSuggestions(false);
    };

    const acceptSuggestion = (text) => {
        setInput(text);
        setShowSuggestions(false);
        inputRef.current?.focus();
        // Auto-submit for slash commands
        if (text.startsWith('/')) {
            onSlashCommand?.(text);
            setInput('');
            return;
        }
    };

    const handleKeyDown = (e) => {
        const totalItems = suggestions.length + slashCommands.length;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx(i => Math.min(i + 1, totalItems - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (selectedIdx <= 0 && !showSuggestions) {
                // Navigate history
                const nextIdx = Math.min(historyIdx + 1, history.length - 1);
                setHistoryIdx(nextIdx);
                if (history[nextIdx]) setInput(history[nextIdx]);
                return;
            }
            setSelectedIdx(i => Math.max(i - 1, -1));
        } else if (e.key === 'Tab' && showSuggestions && selectedIdx >= 0) {
            e.preventDefault();
            const allItems = [...suggestions, ...slashCommands.map(s => ({ label: s.label }))];
            if (allItems[selectedIdx]) acceptSuggestion(allItems[selectedIdx].label);
        } else if (e.key === 'Enter' && showSuggestions && selectedIdx >= 0) {
            e.preventDefault();
            const allItems = [...suggestions, ...slashCommands.map(s => ({ label: s.label }))];
            if (allItems[selectedIdx]) {
                acceptSuggestion(allItems[selectedIdx].label);
                // If it's a natural language suggestion, submit it
                const item = allItems[selectedIdx];
                if (!item.label.startsWith('/')) {
                    saveToHistory(item.label);
                    onSubmit(item.label);
                    setInput('');
                }
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setSelectedIdx(-1);
        }
    };

    // Public ref method for focusing
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.__ecomindFocusCommand = () => inputRef.current?.focus();
        }
    }, []);

    // Handle click outside to close suggestions
    const containerRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            {/* Suggestions Dropdown */}
            {showSuggestions && (suggestions.length > 0 || slashCommands.length > 0) && (
                <div style={{
                    position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 8,
                    background: 'rgba(10,18,35,0.98)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '14px', padding: '8px', boxShadow: '0 -16px 48px rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(20px)', zIndex: 100, maxHeight: 280, overflowY: 'auto',
                }}>
                    {/* Slash Commands */}
                    {slashCommands.length > 0 && (
                        <div style={{ marginBottom: suggestions.length > 0 ? '8px' : 0 }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 8px', marginBottom: '4px' }}>
                                Commands
                            </div>
                            {slashCommands.map((cmd, i) => {
                                const idx = suggestions.length + i;
                                return (
                                    <div key={cmd.label}
                                        onClick={() => acceptSuggestion(cmd.label)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                                            borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s',
                                            background: selectedIdx === idx ? 'rgba(56,189,248,0.1)' : 'transparent',
                                        }}
                                        onMouseEnter={() => setSelectedIdx(idx)}
                                    >
                                        <span style={{ fontSize: '14px' }}>{cmd.icon}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: '#38bdf8' }}>{cmd.label}</span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', flex: 1 }}>{cmd.description}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Natural Language Suggestions */}
                    {suggestions.length > 0 && (
                        <div>
                            {slashCommands.length > 0 && (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 8px', marginBottom: '4px' }}>
                                    Suggestions
                                </div>
                            )}
                            {suggestions.map((s, i) => (
                                <div key={s.label}
                                    onClick={() => { acceptSuggestion(s.label); if (!s.label.startsWith('/')) { saveToHistory(s.label); onSubmit(s.label); setInput(''); } }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
                                        borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s',
                                        background: selectedIdx === i ? 'rgba(56,189,248,0.1)' : 'transparent',
                                    }}
                                    onMouseEnter={() => setSelectedIdx(i)}
                                >
                                    <span style={{ fontSize: '14px' }}>{s.icon}</span>
                                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{s.label}</span>
                                    {s.category === 'history' && <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>recent</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Keyboard hint */}
                    <div style={{ display: 'flex', gap: '12px', padding: '6px 8px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            ↑↓ navigate · Tab accept · Enter submit · Esc close
                        </span>
                    </div>
                </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSubmit}>
                <div className="command-input-wrapper animate-icon-wobble" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="icon" style={{ paddingLeft: '16px', fontSize: '16px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        🧠
                    </span>
                    <input
                        ref={inputRef}
                        className="command-input"
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => fetchSuggestions(input)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder={isStreaming ? "Processing..." : "Give Ecomind a command... (try / for slash commands)"}
                        disabled={isStreaming}
                        autoComplete="off"
                    />
                    <div style={{ padding: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <FileUploader
                            onUploadComplete={(data) => {
                                if (data.error) {
                                    addToast('error', 'Upload failed: ' + data.error);
                                } else {
                                    addToast('success', `Attached: ${data.filename}`);
                                    setInput(`Analyze ${data.filename}`);
                                }
                            }}
                        />
                        {/* Voice Control */}
                        <VoiceControl
                            onCommand={(cmd) => {
                                saveToHistory(cmd);
                                onSubmit(cmd);
                                setInput('');
                            }}
                            lastResponse={lastResponse}
                        />
                        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                        <kbd style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                            ⌘/
                        </kbd>
                        <button className="command-btn" type="submit" disabled={isStreaming || !input.trim()}>
                            {isStreaming ? '◉ Running' : 'Execute'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
