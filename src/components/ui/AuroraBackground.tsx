'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * OceanBackground — Deep ocean waves + interactive constellation particles
 * Pure canvas, no external dependencies. Elegant black/white/blue palette.
 */
export function AuroraBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let W: number, H: number;
        let time = 0;
        let mouseX = -500;
        let mouseY = -500;
        let animId: number;

        // --- Colors ---
        const waveColors = [
            'rgba(30,58,138,',   // blue-900
            'rgba(59,130,246,',  // blue-500
            'rgba(148,163,184,', // slate-400
            'rgba(30,64,175,',   // blue-800
            'rgba(200,215,235,', // white-blue
        ];

        const particleColors = [
            [30, 58, 138],
            [59, 130, 246],
            [148, 163, 184],
            [200, 215, 235],
            [37, 99, 235],
        ];

        // --- Particles ---
        type Particle = {
            x: number; y: number;
            vx: number; vy: number;
            r: number; c: number[];
            a: number;
        };

        let particles: Particle[] = [];

        function initParticles() {
            particles = [];
            const count = Math.min(Math.floor((W * H) / 15000), 120);
            for (let i = 0; i < count; i++) {
                const c = particleColors[Math.floor(Math.random() * particleColors.length)];
                particles.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    r: Math.random() * 1.8 + 0.5,
                    c,
                    a: Math.random() * 0.5 + 0.2,
                });
            }
        }

        function resize() {
            W = canvas!.width = window.innerWidth;
            H = canvas!.height = window.innerHeight;
            initParticles();
        }

        function onMouseMove(e: MouseEvent) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        }

        // --- Draw ---
        function draw() {
            time += 0.003;

            // Clear
            ctx!.globalAlpha = 1;
            ctx!.fillStyle = '#030712';
            ctx!.fillRect(0, 0, W, H);

            // Waves (blur simulated with thick semi-transparent strokes)
            for (let w = 0; w < 5; w++) {
                const baseY = H * (0.25 + w * 0.12);
                const color = waveColors[w];

                for (let pass = 0; pass < 3; pass++) {
                    const alpha = 0.05 - pass * 0.015;
                    const lineW = 60 + pass * 30;

                    ctx!.beginPath();
                    ctx!.lineWidth = lineW;
                    ctx!.strokeStyle = color + alpha + ')';

                    for (let x = 0; x <= W; x += 4) {
                        const y = baseY
                            + Math.sin(x * 0.003 + time + w * 1.2) * 50
                            + Math.sin(x * 0.007 - time * 0.7 + w * 0.8) * 30
                            + Math.cos(x * 0.001 + time * 0.5 + w * 2.0) * 40;
                        if (x === 0) ctx!.moveTo(x, y);
                        else ctx!.lineTo(x, y);
                    }
                    ctx!.stroke();
                }
            }

            // Particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0) p.x += W;
                if (p.x > W) p.x -= W;
                if (p.y < 0) p.y += H;
                if (p.y > H) p.y -= H;

                // Dot
                ctx!.beginPath();
                ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx!.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${p.a})`;
                ctx!.fill();

                // Connections
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const d = dx * dx + dy * dy;
                    if (d < 14400) {
                        const op = (1 - Math.sqrt(d) / 120) * 0.12;
                        ctx!.beginPath();
                        ctx!.moveTo(p.x, p.y);
                        ctx!.lineTo(p2.x, p2.y);
                        ctx!.strokeStyle = `rgba(148,163,184,${op})`;
                        ctx!.lineWidth = 0.5;
                        ctx!.stroke();
                    }
                }

                // Mouse interaction
                const mdx = p.x - mouseX;
                const mdy = p.y - mouseY;
                const md = mdx * mdx + mdy * mdy;
                if (md < 40000) {
                    const dist = Math.sqrt(md);
                    const op = (1 - dist / 200) * 0.35;
                    ctx!.beginPath();
                    ctx!.moveTo(p.x, p.y);
                    ctx!.lineTo(mouseX, mouseY);
                    ctx!.strokeStyle = `rgba(59,130,246,${op})`;
                    ctx!.lineWidth = 0.7;
                    ctx!.stroke();

                    p.vx += (mouseX - p.x) * 0.00005;
                    p.vy += (mouseY - p.y) * 0.00005;
                }

                // Speed limit
                const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (spd > 0.6) {
                    p.vx *= 0.97;
                    p.vy *= 0.97;
                }
            }

            animId = requestAnimationFrame(draw);
        }

        // Init
        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', onMouseMove);
        draw();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 -z-10"
            style={{
                width: '100vw',
                height: '100vh',
                display: mounted ? 'block' : 'none',
            }}
        />
    );
}
