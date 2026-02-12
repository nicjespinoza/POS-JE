/**
 * [SCALABILITY] Virtualized Product Grid
 * Only renders visible products in the viewport (~12-20 cards)
 * instead of all products (1,000+) in the DOM.
 * Uses react-window v2 Grid for efficient rendering.
 */

import React, { useRef } from 'react';
import { Grid } from 'react-window';
import type { CSSProperties, ReactElement } from 'react';
import { Product } from '../types';

interface VirtualProductGridProps {
    products: Product[];
    columns: number;
    density: 'compact' | 'normal' | 'comfortable';
    renderProduct: (product: Product) => React.ReactNode;
    emptyMessage?: React.ReactNode;
}

const ROW_HEIGHTS = {
    compact: 260,
    normal: 310,
    comfortable: 360,
};

interface CellProps {
    products: Product[];
    columns: number;
    gap: number;
    renderProduct: (product: Product) => React.ReactNode;
}

const CellComponent = ({
    columnIndex,
    rowIndex,
    style,
    products,
    columns,
    gap,
    renderProduct,
}: {
    ariaAttributes: any;
    columnIndex: number;
    rowIndex: number;
    style: CSSProperties;
} & CellProps): ReactElement | null => {
    const index = rowIndex * columns + columnIndex;
    if (index >= products.length) return null;
    const product = products[index];

    return (
        <div
            style={{
                ...style,
                paddingLeft: gap / 2,
                paddingRight: gap / 2,
                paddingTop: gap / 2,
                paddingBottom: gap / 2,
                boxSizing: 'border-box',
            }}
        >
            <div style={{ height: '100%' }}>
                {renderProduct(product)}
            </div>
        </div>
    ) as ReactElement;
};

export const VirtualProductGrid: React.FC<VirtualProductGridProps> = ({
    products,
    columns,
    density,
    renderProduct,
    emptyMessage,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rowHeight = ROW_HEIGHTS[density] || ROW_HEIGHTS.normal;
    const rowCount = Math.ceil(products.length / columns);
    const GAP = density === 'compact' ? 8 : 16;

    if (products.length === 0) {
        return (
            <div ref={containerRef} className="flex-1">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex-1" style={{ minHeight: 400 }}>
            <Grid<CellProps>
                columnCount={columns}
                columnWidth={`${100 / columns}%`}
                rowCount={rowCount}
                rowHeight={rowHeight}
                cellComponent={CellComponent}
                cellProps={{ products, columns, gap: GAP, renderProduct }}
                overscanCount={2}
                style={{ height: '100%', width: '100%' }}
            />
        </div>
    );
};

export default VirtualProductGrid;
