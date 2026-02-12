'use client';

/**
 * [SCALABILITY] Virtualized Product Grid for ecommerce POS
 * Only renders visible products in the viewport (~12-20 cards)
 * instead of all products (1,000+) in the DOM.
 * Uses react-window v2 List with rowComponent API.
 */
import React, { useRef, useEffect, useState } from 'react';
import { List } from 'react-window';
import type { CSSProperties, ReactNode } from 'react';

interface RowCustomProps {
    products: any[];
    columns: number;
    gap: number;
    renderProduct: (product: any) => ReactNode;
}

const RowComponent = (props: { index: number; style: CSSProperties; ariaAttributes: any } & RowCustomProps) => {
    const { index, style, products, columns, gap, renderProduct } = props;
    const startIdx = index * columns;
    const rowProducts = products.slice(startIdx, startIdx + columns);

    return (
        <div style={{ ...style, paddingBottom: gap }} className="flex gap-4 px-1">
            {rowProducts.map((product: any) => (
                <div key={product.id} style={{ flex: `0 0 calc(${100 / columns}% - ${gap * (columns - 1) / columns}px)` }}>
                    {renderProduct(product)}
                </div>
            ))}
            {rowProducts.length < columns && Array.from({ length: columns - rowProducts.length }).map((_, i) => (
                <div key={`empty-${i}`} style={{ flex: `0 0 calc(${100 / columns}% - ${gap * (columns - 1) / columns}px)` }} />
            ))}
        </div>
    );
};

interface VirtualProductGridProps {
    products: any[];
    columns: number;
    density: 'compact' | 'normal' | 'comfortable';
    renderProduct: (product: any) => ReactNode;
    emptyMessage?: ReactNode;
}

export const VirtualProductGrid: React.FC<VirtualProductGridProps> = ({
    products,
    columns,
    density,
    renderProduct,
    emptyMessage,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(600);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerHeight(entry.contentRect.height);
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const rowCount = Math.ceil(products.length / columns);
    const ROW_HEIGHT = density === 'compact' ? 240 : density === 'comfortable' ? 360 : 300;
    const GAP = 16;

    if (products.length === 0) {
        return <>{emptyMessage}</>;
    }

    return (
        <div ref={containerRef} className="flex-1 overflow-hidden" style={{ minHeight: 400 }}>
            <List<RowCustomProps>
                rowCount={rowCount}
                rowHeight={ROW_HEIGHT + GAP}
                rowComponent={RowComponent}
                rowProps={{ products, columns, gap: GAP, renderProduct }}
                overscanCount={2}
                style={{ height: '100%', width: '100%' }}
            />
        </div>
    );
};
