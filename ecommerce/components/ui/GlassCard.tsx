'use client';

import React from 'react';

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`backdrop-blur-xl bg-white/70 dark:bg-white/5 border border-white/40 dark:border-white/10 shadow-xl dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded-3xl transition-colors duration-300 ${className}`}
        >
            {children}
        </div>
    );
};
