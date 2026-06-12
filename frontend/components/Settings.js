'use client';

import { useState, useEffect } from 'react';

export default function Settings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saved, setSaved] = useState(false);
    const [activeSection, setActiveSection] = useState('general');
    const [editingKey, setEditingKey] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [prefs, setPrefs] = useState({});
    const [triggering, setTriggering] = useState(null);

    useEffect(() => {
        fetch('http://localhost:8000/api/settings').then(r => r.json()).then(d => { setSettings(d); setLoading(false); }).catch(() => setLoading(false));
        fetch('http://localhost:8000/api/scheduler/jobs').then(r => r.json()).then(setJobs).catch(() => { });
        fetch('http://localhost:8000/api/preferences').then(r => r.json()).then(setPrefs).catch(() => { });
    }, []);

    const triggerJob = async (name) => {
        setTriggering(name);
        try {
            await fetch(`http://localhost:8000/api/scheduler/trigger/${name}`, { method: 'POST' });
            const updated = await fetch('http://localhost:8000/api/scheduler/jobs').then(r => r.json());
            setJobs(updated);
            flashSaved();
        } catch { }
        setTriggering(null);
    };

    const savePref = async (key, value) => {
        try {
            await fetch('http://localhost:8000/api/preferences', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [key]: value })
            });
            setPrefs(p => ({ ...p, [key]: value }));
            flashSaved();
        } catch { }
    };

    const toggleAgent = async (agent, enabled) => {
        await fetch(`http://localhost:8000/api/settings/agents/${agent}/toggle?enabled=${enabled}`, { method: 'POST' });
        setSettings(s => ({ ...s, agents: { ...s.agents, [agent]: { ...s.agents[agent], enabled } } }));
        flashSaved();
    };

    const toggleConnector = (name) => {
        const next = !settings.connectors[name].enabled;
        setSettings(s => ({ ...s, connectors: { ...s.connectors, [name]: { ...s.connectors[name], enabled: next } } }));
        flashSaved();
    };

    const toggleNotif = (key) => {
        setSettings(s => ({ ...s, notifications: { ...s.notifications, [key]: !s.notifications[key] } }));
        flashSaved();
    };

    const saveApiKey = async (service, key) => {
        try {
            const res = await fetch(`http://localhost:8000/api/settings/api-keys/${service}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            });
            const data = await res.json();

            if (data.status === 'updated' || data.status === 'saved_but_failed_init') {
                setSettings(s => ({
                    ...s,
                    api_keys: { ...s.api_keys, [service]: data.config }
                }));
                setEditingKey(null);
                flashSaved();
                if (data.status === 'saved_but_failed_init') {
                    alert(`Key saved, but connector init failed: ${data.error}`);
                }
            } else {
                alert('Failed to update key: ' + data.error);
            }
        } catch (e) {
            alert('Error saving key: ' + e.message);
        }
    };

    const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

    if (loading) return <div className="animate-fade-in"><div className="section-header"><h2>Settings</h2></div><div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading settings...</div></div>;
    if (!settings) return <div className="empty-state">Could not load settings.</div>;

    const sections = [
        { id: 'general', icon: '⚙️', label: 'General' },
        { id: 'agents', icon: '🤖', label: 'Agents' },
        { id: 'connectors', icon: '🔌', label: 'Connectors' },
        { id: 'security', icon: '🛡️', label: 'Security' },
        { id: 'notifications', icon: '🔔', label: 'Notifications' },
        { id: 'api_keys', icon: '🔑', label: 'API Keys' },
        { id: 'scheduler', icon: '📅', label: 'Scheduler' },
        { id: 'preferences', icon: '🧠', label: 'Preferences' },
    ];

    const agentColors = { guardian: '#a78bfa', financier: '#4ade80', scout: '#38bdf8', operator: '#fbbf24', liaison: '#f472b6' };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800 }}><span className="gradient-text">Settings</span> ⚙️</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Configure Ecomind system preferences</p>
                </div>
                {saved && (
                    <div style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', animation: 'fadeIn 0.3s ease' }}>
                        ✓ Saved
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px' }}>
                {/* Section Nav */}
                <div className="glass-card" style={{ padding: '12px', height: 'fit-content' }}>
                    {sections.map(s => (
                        <div key={s.id} onClick={() => setActiveSection(s.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                                borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: activeSection === s.id ? 600 : 400,
                                background: activeSection === s.id ? 'rgba(56,189,248,0.1)' : 'transparent',
                                color: activeSection === s.id ? '#38bdf8' : 'var(--text-secondary)',
                                transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => { if (activeSection !== s.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                            onMouseOut={(e) => { if (activeSection !== s.id) e.currentTarget.style.background = 'transparent'; }}
                        >
                            <span>{s.icon}</span> {s.label}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="glass-card" style={{ padding: '28px' }}>
                    {activeSection === 'general' && (
                        <div>
                            <SectionTitle icon="⚙️" title="General" />
                            <SettingRow label="System Name" value={settings.general.system_name} mono />
                            <SettingRow label="Version" value={settings.general.version} mono />
                            <SettingRow label="Theme" value={settings.general.theme} badge />
                            <SettingRow label="Language" value={settings.general.language.toUpperCase()} badge />
                            <SettingRow label="Timezone" value={settings.general.timezone} mono />
                            <SettingRow label="Daily Brief Time" value={settings.general.daily_brief_time} mono />
                            <ToggleRow label="Notifications Enabled" checked={settings.general.notifications_enabled} onChange={() => { }} />
                            <ToggleRow label="Auto-Approve Low Risk" checked={settings.general.auto_approve_low_risk} onChange={() => { }} />
                        </div>
                    )}

                    {activeSection === 'agents' && (
                        <div>
                            <SectionTitle icon="🤖" title="Agent Configuration" />
                            {Object.entries(settings.agents).map(([name, config]) => (
                                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: agentColors[name], opacity: config.enabled ? 1 : 0.3 }} />
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'capitalize', opacity: config.enabled ? 1 : 0.5 }}>{name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                                Priority: {config.priority} · Max: {config.max_concurrent}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '5px', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', background: config.auto_run ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)', color: config.auto_run ? '#4ade80' : 'var(--text-muted)' }}>
                                            {config.auto_run ? 'Auto' : 'Manual'}
                                        </span>
                                        <Toggle checked={config.enabled} onChange={() => toggleAgent(name, !config.enabled)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeSection === 'connectors' && (
                        <div>
                            <SectionTitle icon="🔌" title="Connectors" />
                            {Object.entries(settings.connectors).map(([name, config]) => (
                                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'capitalize' }}>{name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                            Mode: {config.mode} · Sync: {config.sync_interval}s
                                        </div>
                                    </div>
                                    <Toggle checked={config.enabled} onChange={() => toggleConnector(name)} />
                                </div>
                            ))}
                        </div>
                    )}

                    {activeSection === 'security' && (
                        <div>
                            <SectionTitle icon="🛡️" title="Security" />
                            <ToggleRow label="Prompt Guard" checked={settings.security.prompt_guard_enabled} onChange={() => { }} />
                            <SettingRow label="Max Auto-Approve" value={`$${settings.security.max_financial_auto_approve.toLocaleString()}`} mono />
                            <SettingRow label="Require Approval Above" value={`$${settings.security.require_approval_above.toLocaleString()}`} mono />
                            <SettingRow label="Session Timeout" value={`${settings.security.session_timeout_minutes} min`} mono />
                            <SettingRow label="Audit Retention" value={`${settings.security.audit_retention_days} days`} mono />
                            <div style={{ marginTop: '16px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px' }}>Blocked Patterns</div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {settings.security.blocked_patterns.map(p => (
                                        <span key={p} style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'notifications' && (
                        <div>
                            <SectionTitle icon="🔔" title="Notification Preferences" />
                            {Object.entries(settings.notifications).filter(([k]) => k !== 'channels').map(([key, val]) => (
                                <ToggleRow key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} checked={val} onChange={() => toggleNotif(key)} />
                            ))}
                            <div style={{ marginTop: '16px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px' }}>Channels</div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {settings.notifications.channels.map(ch => (
                                        <span key={ch} style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{ch}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'api_keys' && (
                        <div>
                            <SectionTitle icon="🔑" title="API Keys" />
                            <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                Manage authentication keys for external services. Keys are stored securely and masked in the UI.
                                Updating a key will automatically re-initialize the connector.
                            </div>
                            {Object.entries(settings.api_keys).map(([name, config]) => (
                                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'capitalize' }}>{name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{config.masked || 'Not configured'}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '5px', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', background: config.configured ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)', color: config.configured ? '#4ade80' : 'var(--text-muted)' }}>
                                            {config.configured ? '● Connected' : '○ Not Set'}
                                        </span>
                                        <button
                                            onClick={() => setEditingKey({ service: name })}
                                            style={{
                                                padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', cursor: 'pointer',
                                                fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeSection === 'scheduler' && (
                        <div>
                            <SectionTitle icon="📅" title="Scheduled Jobs" />
                            <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                Ecomind agents run these jobs automatically on schedule. You can trigger them manually or toggle them on/off.
                            </div>
                            {jobs.map(job => (
                                <div key={job.name} style={{
                                    padding: '16px', marginBottom: '12px', borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
                                                {job.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{job.description}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{
                                                fontSize: '10px', padding: '3px 8px', borderRadius: '5px',
                                                fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase',
                                                background: job.enabled ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
                                                color: job.enabled ? '#4ade80' : 'var(--text-muted)',
                                            }}>
                                                {job.enabled ? '● Active' : '○ Paused'}
                                            </span>
                                            <button
                                                onClick={() => triggerJob(job.name)}
                                                disabled={triggering === job.name}
                                                style={{
                                                    padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(56,189,248,0.3)',
                                                    background: 'rgba(56,189,248,0.1)', color: '#38bdf8', cursor: 'pointer',
                                                    fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-mono)',
                                                    opacity: triggering === job.name ? 0.5 : 1,
                                                }}
                                            >
                                                {triggering === job.name ? '⏳ Running...' : '▶ Trigger'}
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                        {[
                                            { label: 'Interval', value: job.interval_human },
                                            { label: 'Runs', value: `${job.run_count}` },
                                            { label: 'Last Run', value: job.last_run ? new Date(job.last_run).toLocaleTimeString() : '—' },
                                            { label: 'Next Run', value: job.next_run ? new Date(job.next_run).toLocaleTimeString() : '—' },
                                        ].map(stat => (
                                            <div key={stat.label} style={{
                                                padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
                                                textAlign: 'center',
                                            }}>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{stat.label}</div>
                                                <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{stat.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {job.last_error && (
                                        <div style={{ marginTop: '8px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                                            ❌ {job.last_error}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {jobs.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>No scheduled jobs configured.</div>}
                        </div>
                    )}

                    {activeSection === 'preferences' && (
                        <div>
                            <SectionTitle icon="🧠" title="User Preferences" />
                            <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                These preferences adjust how Ecomind behaves. Changes are saved automatically.
                            </div>
                            {Object.entries(prefs).map(([key, value]) => (
                                <div key={key} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                                }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </div>
                                    </div>
                                    {typeof value === 'boolean' ? (
                                        <Toggle checked={value} onChange={() => savePref(key, !value)} />
                                    ) : (
                                        <input
                                            type="text"
                                            defaultValue={value}
                                            onBlur={(e) => { if (e.target.value !== String(value)) savePref(key, e.target.value); }}
                                            style={{
                                                width: '160px', padding: '6px 10px', borderRadius: '6px',
                                                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#fff', fontSize: '13px', fontFamily: 'var(--font-mono)',
                                                textAlign: 'right', outline: 'none',
                                            }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* API Key Modal */}
            {editingKey && (
                <ApiKeyModal
                    service={editingKey.service}
                    onClose={() => setEditingKey(null)}
                    onSave={saveApiKey}
                />
            )}
        </div>
    );
}

// Sub-components
function SectionTitle({ icon, title }) {
    return <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>{icon} {title}</h3>;
}

function SettingRow({ label, value, mono, badge }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{label}</span>
            {badge ? (
                <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{value}</span>
            ) : (
                <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value}</span>
            )}
        </div>
    );
}

function ToggleRow({ label, checked, onChange }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{label}</span>
            <Toggle checked={checked} onChange={onChange} />
        </div>
    );
}

function Toggle({ checked, onChange }) {
    return (
        <div onClick={onChange} style={{
            width: 40, height: 22, borderRadius: 11, cursor: 'pointer', position: 'relative', transition: 'all 0.3s',
            background: checked ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)',
            border: `1px solid ${checked ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.15)'}`,
        }}>
            <div style={{
                width: 16, height: 16, borderRadius: '50%', position: 'absolute', top: 2, transition: 'all 0.3s',
                left: checked ? 21 : 2,
                background: checked ? '#4ade80' : '#64748b',
                boxShadow: checked ? '0 0 8px rgba(74,222,128,0.4)' : 'none',
            }} />
        </div>
    );
}

function ApiKeyModal({ service, onClose, onSave }) {
    const [key, setKey] = useState('');
    const [showKey, setShowKey] = useState(false);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        }}
            onClick={onClose}
        >
            <div
                className="glass-card animate-fade-in"
                style={{ width: '400px', padding: '24px', position: 'relative' }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Update {service} Key</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Enter your new API key below. This will be stored securely and used to authenticate requests.
                    </p>
                </div>

                <div style={{ marginBottom: '24px', position: 'relative' }}>
                    <input
                        type={showKey ? 'text' : 'password'}
                        value={key}
                        onChange={e => setKey(e.target.value)}
                        placeholder={`sk_...`}
                        style={{
                            width: '100%', padding: '10px 12px', borderRadius: '8px',
                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '13px',
                            paddingRight: '40px'
                        }}
                    />
                    <button
                        onClick={() => setShowKey(!showKey)}
                        style={{
                            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px'
                        }}
                    >
                        {showKey ? '🙈' : '👁️'}
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px', borderRadius: '6px', border: 'none',
                            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                            fontSize: '13px', fontWeight: 500,
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(service, key)}
                        disabled={!key.trim()}
                        style={{
                            padding: '8px 16px', borderRadius: '6px', border: 'none',
                            background: key.trim() ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                            color: key.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                            cursor: key.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '13px', fontWeight: 600,
                        }}
                    >
                        Save Key
                    </button>
                </div>
            </div>
        </div>
    );
}
