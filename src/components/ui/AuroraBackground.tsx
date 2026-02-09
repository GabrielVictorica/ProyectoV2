'use client';

import { useEffect, useState } from 'react';

/**
 * AuroraBackground - Animated gradient background with subtle drifting lights
 * Creates a premium, sophisticated atmosphere inspired by Vercel/Linear design
 */
export function AuroraBackground() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="aurora-container" aria-hidden="true">
            {/* Primary gradient - Deep violet */}
            <div className="aurora-blob aurora-blob-1" />
            {/* Secondary gradient - Emerald */}
            <div className="aurora-blob aurora-blob-2" />
            {/* Tertiary gradient - Electric blue */}
            <div className="aurora-blob aurora-blob-3" />
        </div>
    );
}
