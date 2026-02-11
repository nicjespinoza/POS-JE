'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface Column<T> {
    key: string;
    header: string;
    width?: string;
    render: (item: T, index: number) => React.ReactNode;
}

interface VirtualTableProps<T> {
    data: T[];
    columns: Column<T>[];
    rowHeight?: number;
    maxHeight?: number;
    onRowClick?: (item: T) => void;
    emptyMessage?: string;
    className?: string;
}

export function VirtualTable<T>({
    data,
    columns,
    rowHeight = 52,
    maxHeight = 600,
    onRowClick,
    emptyMessage = 'Sin datos',
    className = ''
}: VirtualTableProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: data.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan: 10,
    });

    if (data.length === 0) {
        return (
            <div className={`text-center py-12 text-gray-400 ${className}`}>
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className={className}>
            {/* Header */}
            <div className="flex border-b border-white/10 bg-white/5 rounded-t-lg sticky top-0 z-10">
                {columns.map(col => (
                    <div
                        key={col.key}
                        className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                        style={{ width: col.width || `${100 / columns.length}%` }}
                    >
                        {col.header}
                    </div>
                ))}
            </div>

            {/* Virtualized Body */}
            <div
                ref={parentRef}
                style={{ height: Math.min(data.length * rowHeight, maxHeight), overflow: 'auto' }}
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {virtualizer.getVirtualItems().map(virtualRow => {
                        const item = data[virtualRow.index];
                        return (
                            <div
                                key={virtualRow.index}
                                className={`flex items-center border-b border-white/5 hover:bg-white/5 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                                onClick={() => onRowClick?.(item)}
                            >
                                {columns.map(col => (
                                    <div
                                        key={col.key}
                                        className="px-4 py-2 text-sm truncate"
                                        style={{ width: col.width || `${100 / columns.length}%` }}
                                    >
                                        {col.render(item, virtualRow.index)}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 text-xs text-gray-500 bg-white/5 rounded-b-lg">
                {data.length} registros
            </div>
        </div>
    );
}

export type { Column };
