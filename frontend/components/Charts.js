'use client';

import { useEffect, useRef } from 'react';

/**
 * Animated bar chart drawn on canvas with smooth entrance animation.
 */
/**
 * Animated bar chart drawn on canvas with smooth entrance animation.
 */
export function BarChart({ data = [], width = 400, height = 200, barColor = '#38bdf8', label = '', onClick, selectedLabel }) {
    const canvasRef = useRef(null);
    const animRef = useRef(0);
    const prevDataKey = useRef('');

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length === 0) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // Click handler
        const handleClick = (e) => {
            if (!onClick) return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left);
            const padding = { top: 20, right: 20, bottom: 40, left: 60 };
            const chartW = width - padding.left - padding.right;

            // Reverse mapping from x to index
            if (x > padding.left && x < width - padding.right) {
                const relX = x - padding.left;
                const barSlotWidth = chartW / data.length;
                const index = Math.floor(relX / barSlotWidth);
                if (index >= 0 && index < data.length) {
                    onClick(data[index]);
                }
            }
        };
        canvas.onclick = handleClick;

        const maxVal = Math.max(...data.map((d) => d.value), 1);
        const padding = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartW = width - padding.left - padding.right;
        const chartH = height - padding.top - padding.bottom;
        const barW = Math.min(chartW / data.length - 8, 40);
        let progress = 0;

        function draw() {
            ctx.clearRect(0, 0, width, height);
            progress = Math.min(progress + 0.03, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic

            // Y-axis gridlines
            for (let i = 0; i <= 4; i++) {
                const y = padding.top + (chartH * i) / 4;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(width - padding.right, y);
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Y labels
                const val = maxVal - (maxVal * i) / 4;
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.font = '10px monospace';
                ctx.textAlign = 'right';
                ctx.fillText(formatK(val), padding.left - 8, y + 4);
            }

            // Bars
            data.forEach((d, i) => {
                const x = padding.left + (chartW / data.length) * i + (chartW / data.length - barW) / 2;
                const barH = (d.value / maxVal) * chartH * ease;
                const y = padding.top + chartH - barH;

                // Dim if not selected
                const isDimmed = selectedLabel && d.label !== selectedLabel;
                const baseAlpha = isDimmed ? 0.1 : 0.4;
                const shadowBlur = isDimmed ? 0 : 8;

                // Gradient bar
                const grad = ctx.createLinearGradient(x, y, x, y + barH);
                grad.addColorStop(0, d.color || barColor);
                grad.addColorStop(1, adjustAlpha(d.color || barColor, baseAlpha));
                ctx.fillStyle = grad;

                // Rounded top
                const r = Math.min(4, barW / 2);
                ctx.beginPath();
                ctx.moveTo(x, y + barH);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
                ctx.lineTo(x + barW - r, y);
                ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
                ctx.lineTo(x + barW, y + barH);
                ctx.closePath();
                ctx.fill();

                // Glow
                ctx.shadowColor = d.color || barColor;
                ctx.shadowBlur = shadowBlur;
                ctx.fill();
                ctx.shadowBlur = 0;

                // X label
                ctx.fillStyle = selectedLabel === d.label ? '#fff' : 'rgba(255,255,255,0.45)';
                ctx.font = selectedLabel === d.label ? 'bold 10px monospace' : '10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(d.label || '', x + barW / 2, height - padding.bottom + 16);

                // Value on top (always show if selected, otherwise animate in)
                if (ease > 0.8 || selectedLabel === d.label) {
                    ctx.fillStyle = isDimmed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)';
                    ctx.font = 'bold 11px monospace';
                    ctx.fillText(formatK(d.value), x + barW / 2, y - 6);
                }
            });

            if (progress < 1) {
                animRef.current = requestAnimationFrame(draw);
            }
        }

        // Only animate if the actual data values changed
        const dataKey = JSON.stringify(data.map(d => d.value));
        const shouldAnimate = dataKey !== prevDataKey.current && !selectedLabel; // Don't re-animate on selection toggle
        prevDataKey.current = dataKey;
        progress = shouldAnimate ? 0 : 1;
        draw();
        return () => {
            cancelAnimationFrame(animRef.current);
            canvas.onclick = null;
        };
    }, [data, width, height, barColor, selectedLabel, onClick]);

    return (
        <div>
            {label && (
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {label}
                </div>
            )}
            <canvas ref={canvasRef} style={{ width, height, display: 'block', cursor: onClick ? 'pointer' : 'default' }} />
        </div>
    );
}

/**
 * Animated donut/ring chart.
 */
export function DonutChart({ segments = [], size = 160, thickness = 20, label = '', onClick, selectedLabel }) {
    const canvasRef = useRef(null);
    const animRef = useRef(0);
    const prevSegKey = useRef('');

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || segments.length === 0) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        const total = segments.reduce((s, d) => s + d.value, 0);
        const cx = size / 2;
        const cy = size / 2;
        const radius = size / 2 - thickness;

        // Click handler
        const handleClick = (e) => {
            if (!onClick) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left - cx;
            const y = e.clientY - rect.top - cy;

            // Check distance from center (within ring)
            const dist = Math.sqrt(x * x + y * y);
            if (dist < radius - thickness / 2 || dist > radius + thickness * 1.5) return;

            // Calculate angle
            let angle = Math.atan2(y, x);
            if (angle < -Math.PI / 2) angle += Math.PI * 2; // Normalize to match startAngle -90deg

            // Find segment
            let currentAngle = -Math.PI / 2;
            for (const seg of segments) {
                const sweep = (seg.value / total) * Math.PI * 2;
                // Handle wrap-around
                let endAngle = currentAngle + sweep;
                if (angle >= currentAngle && angle <= endAngle) {
                    onClick(seg);
                    break;
                }
                currentAngle += sweep;
            }
        };
        canvas.onclick = handleClick;

        let progress = 0;

        function draw() {
            ctx.clearRect(0, 0, size, size);
            progress = Math.min(progress + 0.025, 1);
            const ease = 1 - Math.pow(1 - progress, 3);

            // Background ring
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = thickness;
            ctx.stroke();

            // Segments
            let startAngle = -Math.PI / 2;
            segments.forEach((seg) => {
                const isDimmed = selectedLabel && seg.label !== selectedLabel;
                const sweep = (seg.value / total) * Math.PI * 2 * ease;

                ctx.beginPath();
                ctx.arc(cx, cy, radius, startAngle, startAngle + sweep);
                ctx.strokeStyle = isDimmed ? adjustAlpha(seg.color, 0.2) : seg.color;
                ctx.lineWidth = thickness;
                ctx.lineCap = 'round';
                ctx.stroke();
                startAngle += sweep;
            });

            // Center text
            if (ease > 0.5) {
                ctx.fillStyle = 'var(--text-primary, #fff)';
                ctx.font = 'bold 22px system-ui';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const displayText = selectedLabel ? segments.find(s => s.label === selectedLabel)?.value || total : total;
                ctx.fillText(displayText.toString(), cx, cy - 6);

                ctx.font = '10px monospace';
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fillText(selectedLabel ? selectedLabel.toUpperCase() : 'TOTAL', cx, cy + 12);
            }

            if (progress < 1) animRef.current = requestAnimationFrame(draw);
        }

        const segKey = JSON.stringify(segments.map(s => s.value));
        const shouldAnimate = segKey !== prevSegKey.current && !selectedLabel;
        prevSegKey.current = segKey;
        progress = shouldAnimate ? 0 : 1;
        draw();
        return () => {
            cancelAnimationFrame(animRef.current);
            canvas.onclick = null;
        };
    }, [segments, size, thickness, selectedLabel, onClick]);

    return (
        <div>
            {label && (
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {label}
                </div>
            )}
            <canvas ref={canvasRef} style={{ width: size, height: size, display: 'block', margin: '0 auto', cursor: onClick ? 'pointer' : 'default' }} />
            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                {segments.map((seg, i) => (
                    <div key={i}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px',
                            color: selectedLabel && selectedLabel !== seg.label ? 'var(--text-muted)' : 'var(--text-secondary)',
                            opacity: selectedLabel && selectedLabel !== seg.label ? 0.5 : 1,
                            cursor: 'pointer'
                        }}
                        onClick={() => onClick && onClick(seg)}
                    >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, display: 'inline-block' }} />
                        {seg.label}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Animated sparkline / mini area chart.
 */
export function SparkLine({ data = [], width = 200, height = 50, color = '#4ade80' }) {
    const canvasRef = useRef(null);
    const animRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length < 2) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const maxVal = Math.max(...data, 1);
        const minVal = Math.min(...data, 0);
        const range = maxVal - minVal || 1;
        const pad = 4;
        let progress = 0;

        function draw() {
            ctx.clearRect(0, 0, width, height);
            progress = Math.min(progress + 0.04, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const pointCount = Math.ceil(data.length * ease);

            // Area fill
            ctx.beginPath();
            for (let i = 0; i < pointCount; i++) {
                const x = pad + (i / (data.length - 1)) * (width - pad * 2);
                const y = pad + (1 - (data[i] - minVal) / range) * (height - pad * 2);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            const lastX = pad + ((pointCount - 1) / (data.length - 1)) * (width - pad * 2);
            ctx.lineTo(lastX, height - pad);
            ctx.lineTo(pad, height - pad);
            ctx.closePath();
            const grad = ctx.createLinearGradient(0, 0, 0, height);
            grad.addColorStop(0, adjustAlpha(color, 0.2));
            grad.addColorStop(1, adjustAlpha(color, 0.01));
            ctx.fillStyle = grad;
            ctx.fill();

            // Line
            ctx.beginPath();
            for (let i = 0; i < pointCount; i++) {
                const x = pad + (i / (data.length - 1)) * (width - pad * 2);
                const y = pad + (1 - (data[i] - minVal) / range) * (height - pad * 2);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.stroke();

            // End dot
            if (pointCount > 0) {
                const ex = pad + ((pointCount - 1) / (data.length - 1)) * (width - pad * 2);
                const ey = pad + (1 - (data[pointCount - 1] - minVal) / range) * (height - pad * 2);
                ctx.beginPath();
                ctx.arc(ex, ey, 3, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.shadowColor = color;
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            if (progress < 1) animRef.current = requestAnimationFrame(draw);
        }

        progress = 0;
        draw();
        return () => cancelAnimationFrame(animRef.current);
    }, [data, width, height, color]);

    return <canvas ref={canvasRef} style={{ width, height, display: 'block' }} />;
}

// ── Helpers ──
function formatK(n) {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
    return `$${n}`;
}

function adjustAlpha(hex, alpha) {
    // Simple hex to rgba
    const r = parseInt(hex.slice(1, 3), 16) || 56;
    const g = parseInt(hex.slice(3, 5), 16) || 189;
    const b = parseInt(hex.slice(5, 7), 16) || 248;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
