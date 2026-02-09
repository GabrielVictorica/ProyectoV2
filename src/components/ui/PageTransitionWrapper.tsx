'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

interface PageTransitionWrapperProps {
    children: React.ReactNode;
}

/**
 * PageTransitionWrapper - Wraps page content with smooth fade-in and slide-up animation
 * Uses Framer Motion for performant animations
 */
export function PageTransitionWrapper({ children }: PageTransitionWrapperProps) {
    const pathname = usePathname();

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.2,
                ease: [0.22, 1, 0.36, 1], // snappier circOut style
            }}
        >
            {children}
        </motion.div>
    );
}
