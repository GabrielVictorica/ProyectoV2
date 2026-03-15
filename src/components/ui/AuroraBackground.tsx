'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

/**
 * OrbitalBackground - Interactive gradient background
 * Features slow ambient animation combined with smooth cursor tracking
 * Delivers a premium, 3D-like feel with near zero performance cost
 */
export function AuroraBackground() {
    const [mounted, setMounted] = useState(false);
    
    // Smooth, physics-based springs for the mouse follower
    const mouseX = useSpring(0, { stiffness: 50, damping: 20 });
    const mouseY = useSpring(0, { stiffness: 50, damping: 20 });
    
    // Transform raw spring values into CSS calc strings
    const smoothHoverX = useTransform(mouseX, m => `calc(${m}% - 0px)`);
    const smoothHoverY = useTransform(mouseY, m => `calc(${m}% - 0px)`);

    useEffect(() => {
        setMounted(true);

        const handleMouseMove = (e: MouseEvent) => {
            // Calculate percentage position (0 to 1)
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;
            
            // Move the spring targets
            mouseX.set(x * 100);
            mouseY.set(y * 100);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#030712]">
            {/* Base gradient - Deep sophisticated dark */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1),rgba(3,7,18,1))]" />
            
            {/* Ambient slow moving blob 1 - Primary Brand Color (Violet/Purple) */}
            <motion.div
                className="absolute w-[60vw] h-[60vw] rounded-full opacity-20 blur-[100px] mix-blend-screen"
                style={{
                    background: 'radial-gradient(circle, rgba(139,92,246,0.8), rgba(0,0,0,0))',
                    top: '10%',
                    left: '10%',
                }}
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 50, 0],
                    y: [0, 30, 0],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Ambient slow moving blob 2 - Accent Color (Cyan/Teal) */}
            <motion.div
                className="absolute w-[50vw] h-[50vw] rounded-full opacity-20 blur-[120px] mix-blend-screen"
                style={{
                    background: 'radial-gradient(circle, rgba(14,165,233,0.8), rgba(0,0,0,0))',
                    bottom: '10%',
                    right: '10%',
                }}
                animate={{
                    scale: [1, 1.3, 1],
                    x: [0, -60, 0],
                    y: [0, -40, 0],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
            />

            {/* Interactive Mouse Follower Blob - Bright Energy */}
            <motion.div
                className="absolute w-[40vw] h-[40vw] rounded-full opacity-30 blur-[150px] mix-blend-screen"
                style={{
                    background: 'radial-gradient(circle, rgba(236,72,153,0.8), rgba(0,0,0,0))',
                    left: '-20vw', // offset to center on pointer
                    top: '-20vw',
                    x: smoothHoverX,
                    y: smoothHoverY,
                }}
            />
            
            {/* Static subtle noise/grain texture overlay for premium matte finish */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" 
                 style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} 
            />
        </div>
    );
}
