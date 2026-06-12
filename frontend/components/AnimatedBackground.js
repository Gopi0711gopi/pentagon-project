'use client';

import { useEffect, useRef } from 'react';

/**
 * Animated floating particle/orb background.
 * Creates a canvas with slowly drifting, glowing particles
 * that give the UI a premium, living feel.
 */
export default function AnimatedBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationId;
        let particles = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resize();
        window.addEventListener('resize', resize);

        // Particle class
        class Particle {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 3 + 1;
                this.speedX = (Math.random() - 0.5) * 0.3;
                this.speedY = (Math.random() - 0.5) * 0.3;
                this.opacity = Math.random() * 0.4 + 0.1;
                this.pulse = Math.random() * Math.PI * 2;
                this.pulseSpeed = Math.random() * 0.01 + 0.005;

                // Color palette: cyan, blue, purple
                const colors = [
                    [56, 189, 248],   // cyan
                    [59, 130, 246],   // blue
                    [167, 139, 250],  // purple
                    [96, 165, 250],   // light blue
                    [244, 114, 182],  // pink (rare)
                ];
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                this.pulse += this.pulseSpeed;

                // Wrap around edges
                if (this.x < -10) this.x = canvas.width + 10;
                if (this.x > canvas.width + 10) this.x = -10;
                if (this.y < -10) this.y = canvas.height + 10;
                if (this.y > canvas.height + 10) this.y = -10;
            }

            draw() {
                const currentOpacity = this.opacity * (0.6 + 0.4 * Math.sin(this.pulse));
                const [r, g, b] = this.color;

                // Glow
                ctx.beginPath();
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, this.size * 8
                );
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${currentOpacity * 0.3})`);
                gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                ctx.fillStyle = gradient;
                ctx.arc(this.x, this.y, this.size * 8, 0, Math.PI * 2);
                ctx.fill();

                // Core dot
                ctx.beginPath();
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${currentOpacity})`;
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Create particles
        const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }

        // Draw connection lines between nearby particles
        function drawConnections() {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        const opacity = (1 - dist / 150) * 0.08;
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        }

        // Large ambient orbs (slow-moving background glow)
        const orbs = [
            { x: 0.2, y: 0.3, size: 300, color: [56, 189, 248], speed: 0.0003, phase: 0 },
            { x: 0.8, y: 0.7, size: 250, color: [167, 139, 250], speed: 0.0004, phase: 2 },
            { x: 0.5, y: 0.5, size: 200, color: [59, 130, 246], speed: 0.0002, phase: 4 },
        ];

        let time = 0;

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            time++;

            // Draw ambient orbs
            orbs.forEach((orb) => {
                const ox = (orb.x + Math.sin(time * orb.speed + orb.phase) * 0.05) * canvas.width;
                const oy = (orb.y + Math.cos(time * orb.speed * 0.7 + orb.phase) * 0.05) * canvas.height;
                const [r, g, b] = orb.color;
                const gradient = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.size);
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.04)`);
                gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.02)`);
                gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
                ctx.fillStyle = gradient;
                ctx.fillRect(ox - orb.size, oy - orb.size, orb.size * 2, orb.size * 2);
            });

            // Update and draw particles
            particles.forEach((p) => {
                p.update();
                p.draw();
            });

            drawConnections();
            animationId = requestAnimationFrame(animate);
        }

        animate();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    );
}
