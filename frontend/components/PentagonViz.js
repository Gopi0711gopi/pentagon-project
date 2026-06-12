'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Ecomind Visualization — Interactive animated pentagon showing agent connections.
 * Each node glows and pulses when its agent is active, with animated connection lines.
 */
export default function PentagonViz({ activeAgents = [], size = 320 }) {
    const canvasRef = useRef(null);
    const [hovered, setHovered] = useState(null);

    const nodes = [
        { id: 'guardian', icon: '🛡️', label: 'Guardian', color: '#f87171', angle: -90 },
        { id: 'scout', icon: '🔍', label: 'Scout', color: '#60a5fa', angle: -18 },
        { id: 'operator', icon: '⚙️', label: 'Operator', color: '#fbbf24', angle: 54 },
        { id: 'liaison', icon: '👑', label: 'Liaison', color: '#38bdf8', angle: 126 },
        { id: 'financier', icon: '💰', label: 'Financier', color: '#4ade80', angle: 198 },
    ];

    // Calculate positions on the pentagon
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.38;

    const getPos = (angleDeg) => ({
        x: cx + radius * Math.cos((angleDeg * Math.PI) / 180),
        y: cy + radius * Math.sin((angleDeg * Math.PI) / 180),
    });

    // Animated glow ring on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let frame;
        let t = 0;

        const animate = () => {
            ctx.clearRect(0, 0, size, size);
            t += 0.02;

            // Draw rotating outer ring
            ctx.beginPath();
            ctx.arc(cx, cy, radius + 20, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.05 + 0.03 * Math.sin(t)})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw connection lines
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const p1 = getPos(nodes[i].angle);
                    const p2 = getPos(nodes[j].angle);
                    const isActive = activeAgents.includes(nodes[i].id) && activeAgents.includes(nodes[j].id);

                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);

                    if (isActive) {
                        ctx.strokeStyle = `rgba(56, 189, 248, ${0.2 + 0.15 * Math.sin(t * 2 + i)})`;
                        ctx.lineWidth = 1.5;
                    } else {
                        ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
                        ctx.lineWidth = 0.5;
                    }
                    ctx.stroke();
                }
            }

            // Draw pulse rings on active nodes
            activeAgents.forEach((agentId) => {
                const node = nodes.find((n) => n.id === agentId);
                if (!node) return;
                const pos = getPos(node.angle);
                const pulseR = 28 + 8 * Math.sin(t * 3);
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, pulseR, 0, Math.PI * 2);
                ctx.strokeStyle = `${node.color}33`;
                ctx.lineWidth = 2;
                ctx.stroke();
            });

            // Rotating dots on outer ring
            for (let i = 0; i < 3; i++) {
                const angle = t * 0.5 + (i * Math.PI * 2) / 3;
                const dotX = cx + (radius + 20) * Math.cos(angle);
                const dotY = cy + (radius + 20) * Math.sin(angle);
                ctx.beginPath();
                ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(56, 189, 248, ${0.3 + 0.2 * Math.sin(t + i)})`;
                ctx.fill();
            }

            frame = requestAnimationFrame(animate);
        };

        animate();
        return () => cancelAnimationFrame(frame);
    }, [activeAgents]);

    return (
        <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
            {/* Animated canvas layer */}
            <canvas
                ref={canvasRef}
                width={size}
                height={size}
                style={{ position: 'absolute', top: 0, left: 0 }}
            />

            {/* Agent nodes */}
            {nodes.map((node) => {
                const pos = getPos(node.angle);
                const isActive = activeAgents.includes(node.id);
                const isHover = hovered === node.id;

                return (
                    <div
                        key={node.id}
                        onMouseEnter={() => setHovered(node.id)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                            position: 'absolute',
                            left: pos.x - 26,
                            top: pos.y - 26,
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 22,
                            background: `${node.color}18`,
                            border: `2px solid ${node.color}${isActive ? 'cc' : '44'}`,
                            boxShadow: isActive
                                ? `0 0 20px ${node.color}40, 0 0 40px ${node.color}15`
                                : isHover
                                    ? `0 0 16px ${node.color}30`
                                    : 'none',
                            transform: isActive ? 'scale(1.15)' : isHover ? 'scale(1.08)' : 'scale(1)',
                            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            cursor: 'default',
                            zIndex: isActive || isHover ? 10 : 1,
                        }}
                    >
                        {node.icon}

                        {/* Label below */}
                        <div style={{
                            position: 'absolute',
                            bottom: -20,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: 10,
                            fontWeight: 600,
                            color: isActive ? node.color : 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                            whiteSpace: 'nowrap',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            opacity: isActive || isHover ? 1 : 0.6,
                            transition: 'all 0.3s ease',
                        }}>
                            {node.label}
                        </div>
                    </div>
                );
            })}

            {/* Center logo */}
            <div style={{
                position: 'absolute',
                left: cx - 20,
                top: cy - 20,
                width: 40,
                height: 40,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                background: 'rgba(56, 189, 248, 0.06)',
                border: '1px solid rgba(56, 189, 248, 0.15)',
            }}>
                🧠
            </div>
        </div>
    );
}
