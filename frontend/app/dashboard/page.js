'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedBackground from '@/components/AnimatedBackground';
import DailyBrief from '@/components/DailyBrief';
import WarRoom from '@/components/WarRoom';
import ApprovalQueue from '@/components/ApprovalQueue';
import ThoughtTrace from '@/components/ThoughtTrace';
import Analytics from '@/components/Analytics';
import Settings from '@/components/Settings';
import ActivityLog from '@/components/ActivityLog';
import ReportViewer from '@/components/ReportViewer';
import NotificationBell from '@/components/NotificationBell';
import CommandBar from '@/components/CommandBar';
import AgentStatusCard from '@/components/AgentStatusCard';
import KeyboardHelp from '@/components/KeyboardHelp';
import ToastManager from '@/components/ToastManager';
import ThemeToggle from '@/components/ThemeToggle';
import History from '@/components/History';
import NotificationCenter from '@/components/NotificationCenter';
import useWebSocket from '@/hooks/useWebSocket';
import useKeyboard from '@/hooks/useKeyboard';

const NAV_ITEMS = [
  { id: 'brief', icon: '📋', label: 'Daily Brief' },
  { id: 'warroom', icon: '⬠', label: 'War Room' },
  { id: 'analytics', icon: '📊', label: 'Analytics' },
  { id: 'reports', icon: '📑', label: 'Reports' },
  { id: 'approvals', icon: '✅', label: 'Approvals' },
  { id: 'activity', icon: '📜', label: 'Activity Log' },
  { id: 'trace', icon: '🧠', label: 'Thought Trace' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
  { id: 'history', icon: '💬', label: 'History' },
  { id: 'notifications', icon: '🔔', label: 'Alerts' },
];

const AGENTS = [
  { key: 'guardian', icon: '/avatars/guardian.png', name: 'Guardian' },
  { key: 'financier', icon: '/avatars/financier.png', name: 'Financier' },
  { key: 'scout', icon: '/avatars/scout.png', name: 'Scout' },
  { key: 'operator', icon: '/avatars/operator.png', name: 'Operator' },
  { key: 'liaison', icon: '/avatars/liaison.png', name: 'Liaison' },
];

export default function HomePage() {
  const [activePage, setActivePage] = useState('Daily Brief'); // Changed from activeTab to activePage
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [traces, setTraces] = useState([]);
  const [lastAgentResponse, setLastAgentResponse] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const searchRef = useRef(null);
  const router = useRouter();

  // ── Authentication Check & Fetch Interceptor ────────────────
  useEffect(() => {
    const token = localStorage.getItem('ecomind_token');
    if (!token) {
      window.location.href = '/';
      return;
    }

    // Global Fetch Interceptor to attach JWT
    const { fetch: originalFetch } = window;
    window.fetch = async (...args) => {
      let [resource, config] = args;
      config = config || {};
      const t = localStorage.getItem('ecomind_token');
      if (t && typeof resource === 'string' && resource.startsWith('http')) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${t}`
        };
      }
      const response = await originalFetch(resource, config);
      if (response.status === 401 && !resource.includes('/auth/token')) {
        localStorage.removeItem('ecomind_token');
        window.location.href = '/';
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  // ── WebSocket for live agent status ──────────────────────────
  const { agentStatuses, isConnected, lastMessage } = useWebSocket();

  // ── Keyboard shortcuts ──────────────────────────────────────
  useKeyboard({
    onTabSwitch: useCallback((idx) => {
      if (idx < NAV_ITEMS.length) setActivePage(NAV_ITEMS[idx].label); // Changed setActiveTab to setActivePage, and item.id to item.label
    }, []),
    onFocusSearch: useCallback(() => {
      setSearchOpen(true);
      setTimeout(() => searchRef.current?.focus(), 50);
    }, []),
    onFocusCommand: useCallback(() => {
      window.__ecomindFocusCommand?.();
    }, []),
    onShowHelp: useCallback(() => setShowKeyboardHelp(true), []),
  });

  // ── Execute task via SSE streaming ───────────────────────────
  const executeTask = async (task) => {
    setIsStreaming(true);
    setTraces([]);
    setLastAgentResponse(null);
    setActivePage('Thought Trace'); // Changed setActiveTab to setActivePage, and 'trace' to 'Thought Trace'

    try {
      const res = await fetch('http://localhost:8000/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, user_id: 'default' }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.event_type !== 'done') {
                setTraces((prev) => [...prev, event]);
                // Capture content for TTS if it's a final response or interesting step
                if (event.event_type === 'response' || (event.event_type === 'step' && event.content)) {
                  setLastAgentResponse(event.content);
                }
              }
            } catch (e) { }
          }
        }
      }
    } catch (err) {
      console.error('Stream error:', err);
      setTraces((prev) => [...prev, {
        event_type: 'status_update',
        agent: 'system',
        agent_icon: '⚠️',
        content: 'Connection error — is the backend running on port 8000?',
      }]);
    } finally {
      setIsStreaming(false);
    }
  };

  // ── Slash command handler ────────────────────────────────────
  const handleSlashCommand = (cmd) => {
    const slashMap = {
      '/agents': 'War Room', // Changed to label
      '/report': 'Reports', // Changed to label
      '/search': () => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); },
      '/settings': 'Settings', // Changed to label
      '/health': 'Analytics', // Changed to label
      '/clear': () => setTraces([]),
    };
    const action = slashMap[cmd];
    if (typeof action === 'function') action();
    else if (action) setActivePage(action); // Changed setActiveTab to setActivePage
  };

  // ── Global Search ──────────────────────────────────────────────
  const runSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults(null); return; }
    try {
      const res = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch { setSearchResults(null); }
  };

  const renderTab = () => {
    switch (activePage) { // Changed activeTab to activePage
      case 'Daily Brief': return <DailyBrief onExecuteCommand={executeTask} />; // Changed 'brief' to 'Daily Brief'
      case 'War Room': return <WarRoom traces={traces} isStreaming={isStreaming} />; // Changed 'warroom' to 'War Room'
      case 'Analytics': return <Analytics />; // Changed 'analytics' to 'Analytics'
      case 'Reports': return <ReportViewer />; // Changed 'reports' to 'Reports'
      case 'Approvals': return <ApprovalQueue />; // Changed 'approvals' to 'Approvals'
      case 'Activity Log': return <ActivityLog />; // Changed 'activity' to 'Activity Log'
      case 'Thought Trace': return <ThoughtTrace traces={traces} />; // Changed 'trace' to 'Thought Trace'
      case 'Settings': return <Settings />; // Changed 'settings' to 'Settings'
      case 'History': return <History />; // Changed 'history' to 'History'
      case 'Alerts': return <NotificationCenter onExecuteCommand={executeTask} />; // Changed 'notifications' to 'Alerts'
      default: return <DailyBrief />;
    }
  };

  return (
    <ToastManager wsMessage={lastMessage}>
      <div className="flex h-screen bg-gray-900 text-white overflow-hidden relative">
        <AnimatedBackground />

        {/* Mobile Header (Only visible on small screens) */}
        <div className="mobile-header group">
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🧠</span>
            <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '1px' }} className="gradient-text">ECOMIND</span>
          </div>
        </div>

        {/* Keyboard Help Modal */}
        <KeyboardHelp isOpen={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />

        {/* Mobile Sidebar Backdrop */}
        <div className={`sidebar-backdrop ${mobileMenuOpen ? 'visible' : ''}`} onClick={() => setMobileMenuOpen(false)} />

        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
              <div style={{ fontSize: '32px', lineHeight: 1 }}>🧠</div>
              <div>
                <div className="gradient-text" style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px' }}>
                  ECOMIND
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  v2.0.0 · SOVEREIGN
                  {/* WebSocket indicator */}
                  <span style={{
                    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                    background: isConnected ? '#4ade80' : '#f87171',
                    boxShadow: isConnected ? '0 0 6px rgba(74,222,128,0.5)' : '0 0 6px rgba(248,113,113,0.5)',
                    transition: 'all 0.3s',
                  }} title={isConnected ? 'WebSocket connected' : 'WebSocket disconnected'} />
                </div>
              </div>
            </div>
          </div>

          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {NAV_ITEMS.map((item, idx) => (
              <div
                key={item.id}
                className={`sidebar-nav-item animate-icon-jump ${activePage === item.label ? 'active' : ''}`}
                onClick={() => { setActivePage(item.label); setMobileMenuOpen(false); }}
              >
                <span className="icon">{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {/* Tab number shortcut hint */}
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', opacity: activePage === item.label ? 0.8 : 0.3 }}>
                  {idx + 1}
                </span>
              </div>
            ))}
          </nav>

          {/* Live Agent Health Cards */}
          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', marginTop: '8px' }}>
            <div style={{
              fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600,
              marginBottom: '8px', paddingLeft: '8px', textTransform: 'uppercase', letterSpacing: '1px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '12px',
            }}>
              <span>Agents</span>
              <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>cpu / mem</span>
            </div>
            {AGENTS.map((agent) => {
              const live = agentStatuses[agent.key] || {};
              return (
                <AgentStatusCard
                  key={agent.key}
                  name={agent.name}
                  icon={agent.icon}
                  status={live.status || 'idle'}
                  cpu={live.cpu || 0}
                  memory={live.memory || 0}
                  lastActive={live.last_active}
                  tasksRunning={live.tasks_running || 0}
                />
              );
            })}
          </div>
        </aside>

        {/* ── Main Content ────────────────────────────────────── */}
        <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Top Bar with Search + Notifications */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px',
            padding: '12px 0', marginBottom: '8px', position: 'relative',
          }}>
            {/* Mobile hamburger */}
            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} style={{
              display: 'none', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', padding: '8px 11px', cursor: 'pointer', fontSize: '18px',
              color: 'var(--text-secondary)',
            }}>☰</button>

            {/* Keyboard shortcut hint */}
            <button onClick={() => setShowKeyboardHelp(true)} className="animate-icon-pop" style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '10px',
              color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', transition: 'all 0.2s',
              marginRight: 'auto',
            }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              <span className="icon" style={{ display: 'inline-block', marginRight: '4px' }}>?</span> shortcuts
            </button>

            {/* Search Bar */}
            <div style={{ position: 'relative', flex: searchOpen ? 1 : 0, maxWidth: searchOpen ? '400px' : '0', transition: 'all 0.3s ease', overflow: 'hidden' }}>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => runSearch(e.target.value)}
                placeholder="Search tasks, invoices, agents... (Ctrl+K)"
                style={{
                  width: '100%', padding: '8px 14px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => { if (!searchQuery) setTimeout(() => setSearchOpen(false), 200); }}
              />
              {/* Search Results Dropdown */}
              {searchResults && searchResults.total > 0 && searchOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
                  background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', padding: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(20px)', zIndex: 999, maxHeight: 300, overflowY: 'auto',
                }}>
                  {searchResults.results.tasks?.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '6px' }}>Tasks</div>
                      {searchResults.results.tasks.slice(0, 5).map((t, i) => (
                        <div key={i} style={{ padding: '6px 8px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer' }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                          onClick={() => { setActivePage('Activity Log'); setSearchOpen(false); setSearchQuery(''); setSearchResults(null); }}
                        >
                          {t.task}
                        </div>
                      ))}
                    </div>
                  )}
                  {searchResults.results.invoices?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '6px' }}>Invoices</div>
                      {searchResults.results.invoices.map((inv, i) => (
                        <div key={i} style={{ padding: '6px 8px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer' }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                          onClick={() => { setActivePage('Daily Brief'); setSearchOpen(false); setSearchQuery(''); setSearchResults(null); }}
                        >
                          {inv.customer} · ${(inv.amount / 100).toLocaleString()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button className="animate-icon-wobble" onClick={() => { setSearchOpen(!searchOpen); setTimeout(() => searchRef.current?.focus(), 100); }} style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '16px',
              color: 'var(--text-secondary)', transition: 'all 0.2s',
            }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            ><span className="icon">🔍</span></button>

            <ThemeToggle />
            <NotificationBell onCount={setNotifCount} />
          </div>

          {/* Active Tab */}
          <div className="animate-fade-in" key={activePage} style={{ flex: 1, overflow: 'auto', paddingBottom: '100px' }}>
            {renderTab()}
          </div>

          {/* Command Bar — pinned to bottom */}
          <div style={{ position: 'fixed', bottom: 0, left: 'var(--sidebar-width)', right: 0, padding: '16px 32px 20px', background: 'linear-gradient(to top, var(--bg-primary) 60%, transparent)', zIndex: 50 }}>
            <CommandBar
              onSubmit={executeTask}
              isStreaming={isStreaming}
              onSlashCommand={handleSlashCommand}
              lastResponse={lastAgentResponse}
            />
          </div>
        </main>
      </div>
    </ToastManager>
  );
}