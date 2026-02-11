# AUDITORÍA DE ESCALABILIDAD FULL-STACK — POS-JE
**Fecha:** 2026-02-11  
**Auditor:** Cascade AI — Arquitecto Full-Stack Serverless  
**Repositorio:** https://github.com/nicjespinoza/POS-JE  
**Stack:** Next.js 16 + React 18 + TypeScript + Firebase (Firestore, Auth, Hosting)  

---

## RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| **Score de Escalabilidad (0-100)** | **45/100** ⚠️ |
| **Productos soportados sin cambios** | ~500 |
| **Movimientos diarios soportados** | ~200 |
| **Usuarios concurrentes soportados** | ~10 |
| **Cuellos de botella críticos** | 6 |
| **Cuellos de botella altos** | 5 |
| **Cuellos de botella medios** | 4 |

**Veredicto:** El proyecto funciona correctamente para un negocio pequeño (12 productos, 3 sucursales, <5 usuarios). Sin embargo, **NO escala a 1,000+ productos ni a cientos de movimientos diarios** sin cambios estructurales. Los principales problemas son: lecturas completas sin paginación, listeners real-time sobre colecciones enteras, y transacciones atómicas que hacen N+1 queries internas.

---

## 1. INVENTARIO DE QUERIES FIRESTORE

### 1.1 Mapa Completo de Accesos a Firestore

| # | Archivo | Colección | Tipo | Query | Paginación | Índice Requerido | Severidad |
|---|---------|-----------|------|-------|------------|-----------------|-----------|
| Q1 | `DataProvider.tsx:53` | `products` | `onSnapshot` | `collection(db, 'products')` — **TODA la colección** | ❌ NINGUNA | No | 🔴 CRÍTICO |
| Q2 | `DataProvider.tsx:80-89` | `transactions` | `onSnapshot` | `orderBy('date','desc'), limit(50)` ó `where('branchId'), orderBy, limit(50)` | ✅ limit(50) | `branchId + date` | ✅ OK |
| Q3 | `contexts/DataContext.tsx:47` | `products` | `onSnapshot` | `collection(db, 'products')` — **TODA la colección** (duplicada) | ❌ NINGUNA | No | 🔴 CRÍTICO |
| Q4 | `contexts/DataContext.tsx:69-78` | `transactions` | `onSnapshot` | Similar a Q2 | ✅ limit(50) | `branchId + date` | ✅ OK |
| Q5 | `inventoryService.ts:46-48` | `inventory` | `onSnapshot` | `where('branchId')` ó **TODA la colección** (si `branchId='all'`) | ❌ NINGUNA | No | 🟡 ALTO |
| Q6 | `inventoryService.ts:68-79` | `inventory_movements` | `onSnapshot` | `where('branchId'), orderBy('createdAt','desc'), limit(N)` | ✅ limit(N) | `branchId + createdAt` | ✅ OK |
| Q7 | `AdminDashboard.tsx:160` | `inventory` | `onSnapshot` | `getInventoryByBranch('all')` — **TODA la colección** | ❌ NINGUNA | No | 🔴 CRÍTICO |
| Q8 | `AdminDashboard.tsx:164` | `inventory_movements` | `onSnapshot` | `getInventoryMovements('all', 200)` | ⚠️ limit(200) | `createdAt` | 🟡 ALTO |
| Q9 | `processAtomicSale:430-437` | `inventory_batches` | `getDocs` (dentro de txn) | `where('productId'), where('branchId'), where('remainingStock', '>', 0)` — **POR CADA ITEM** | ❌ NINGUNA | `productId + branchId + remainingStock` | 🔴 CRÍTICO |
| Q10 | `transferService.ts:53-58` | `inventory_batches` | `getDocs` (dentro de txn) | Misma query que Q9 — **POR CADA ITEM** | ❌ NINGUNA | `productId + branchId + remainingStock` | 🔴 CRÍTICO |
| Q11 | `reportingService.ts:37-42` | `journal_entries` | `getDocs` | `where('date','>='), where('date','<='), where('status','==')` | ❌ NINGUNA | `status + date` | 🟡 ALTO |
| Q12 | `reportingService.ts:100-107` | `inventory_batches` | `getDocs` | `where('remainingStock', '>', 0)` ± `where('branchId')` | ❌ NINGUNA | `branchId + remainingStock` | 🟡 ALTO |
| Q13 | `CartContext.tsx:37-53` | `products` | `onSnapshot` | **UN LISTENER POR ITEM EN CARRITO** — `doc(db, 'products', item.id)` | N/A (doc) | No | 🟠 MEDIO |
| Q14 | `dashboard/page.tsx:33-37` | `orders` | `onSnapshot` | `where('userId'), orderBy('createdAt','desc')` | ❌ NINGUNA | `userId + createdAt` | 🟠 MEDIO |
| Q15 | `portal/page.tsx:61` | `authorized_ips` | `getDocs` | `where('ip', '==', ip)` — Una sola vez | ✅ Single | No | ✅ OK |

### 1.2 Resumen de Problemas de Queries

| Problema | Instancias | Impacto |
|----------|-----------|---------|
| **Full-collection reads sin paginación** | Q1, Q3, Q5, Q7 | Con 10K productos = 10K reads por cada usuario que abre la app |
| **N+1 queries dentro de transacciones** | Q9, Q10 | Sale con 5 items = 5 queries de batches + 5 transaction.get() cada una |
| **Listeners real-time sobre datos que no cambian frecuentemente** | Q1, Q3, Q7 | Productos no cambian cada segundo, pero onSnapshot dispara reads continuos |
| **Índices compuestos no definidos** | Q2, Q4, Q6, Q9, Q10, Q11, Q12, Q14 | Sin `firestore.indexes.json`, Firestore genera errores al primer deploy |
| **DataContext duplicado** | Q1 vs Q3, Q2 vs Q4 | Dos providers idénticos = doble de reads |

---

## 2. CUELLOS DE BOTELLA POR CAPA

### 2.1 Backend (Firestore)

| # | Cuello de Botella | Ubicación | Impacto a Escala | Costo Estimado |
|---|-------------------|-----------|-----------------|----------------|
| B1 | **Products: Full-collection listener** | `DataProvider.tsx:53`, `DataContext.tsx:47` | 10K productos × N usuarios × cambios = explosión de reads | 10K reads/apertura × $0.06/100K = $0.006/apertura. 1000 aperturas/día = $6/día |
| B2 | **Inventory: Full-collection listener con `branchId='all'`** | `AdminDashboard.tsx:160` | Admin dashboard carga TODOS los inventory docs. Con 10K productos × 10 branches = 100K docs | 100K reads/apertura admin |
| B3 | **FIFO batch query dentro de transacciones** | `processAtomicSale`, `createStockTransfer` | Query sin índice + sort en JS. Con 100 batches por producto, cada venta lee todos. | Latencia >2s por venta |
| B4 | **Reporting: Aggregación client-side** | `reportingService.ts:30-92` | P&L lee TODOS los journal_entries del rango. 1 año × 100 ventas/día = 36,500 docs leídos para un solo reporte | 36.5K reads/reporte |
| B5 | **Inventory Valuation: Full scan** | `reportingService.ts:99-118` | Lee todos los batches activos (remainingStock > 0). Con 10K productos × 3 branches × ~5 batches = 150K docs | 150K reads/llamada |
| B6 | **Firestore transaction limit: 500 writes** | `processAtomicSale`, `createStockTransfer` | Una venta de 20 items genera ~60 writes (inventory + movements + batches + transaction + journal). Con 500 limit, máximo ~150 items/transacción | Hard limit de Firestore |

### 2.2 Frontend (React)

| # | Cuello de Botella | Ubicación | Impacto |
|---|-------------------|-----------|---------|
| F1 | **Re-render de TODA la lista de productos** | `DataProvider` → `useData()` → todos los consumers | Cada cambio en 1 producto re-renderiza todos los componentes que usan `products` |
| F2 | **`createInventorySummary` en cada render** | `AdminDashboard.tsx:171-173` | O(products × branches) = 10K × 10 = 100K iteraciones en `useMemo`. Con `find()` interno = O(P × B × I) |
| F3 | **No hay virtualización de listas** | Admin tabla de productos, kardex | Renderiza TODOS los rows del DOM. Con 10K rows = browser lag severo |
| F4 | **CartContext: N listeners simultáneos** | `CartContext.tsx:37-53` | Cada producto en carrito tiene su propio `onSnapshot`. 20 items = 20 listeners |
| F5 | **Double Context (DataContext + DataProvider)** | `contexts/DataContext.tsx` + `ecommerce/providers/DataProvider.tsx` | Dos copias casi idénticas hacen doble de queries a Firestore |

---

## 3. ANÁLISIS MULTI-SUCURSAL

### 3.1 Diseño Actual

```
inventory/{productId}_{branchId}   ← Composite ID, flat collection
inventory_movements/{uuid}          ← Flat, filtered by branchId
inventory_batches/{uuid}            ← Flat, filtered by productId + branchId
transactions/{uuid}                 ← Flat, filtered by branchId
```

### 3.2 Cómo Escala

| Escenario | Products | Branches | Inventory Docs | Batches (est.) | Movements/día | Impacto |
|-----------|----------|----------|---------------|----------------|---------------|---------|
| **Actual** | 12 | 3 | 36 | ~36 | ~20 | ✅ Funciona bien |
| **Medio** | 500 | 5 | 2,500 | ~5,000 | ~200 | ⚠️ Admin dashboard lento (2,500 docs en onSnapshot) |
| **Grande** | 2,000 | 10 | 20,000 | ~40,000 | ~500 | 🔴 Full-collection reads = $12/día solo en reads |
| **Enterprise** | 10,000 | 20 | 200,000 | ~500,000 | ~2,000 | ❌ Inutilizable. 200K docs en listener = timeout |

### 3.3 Problemas Específicos Multi-Branch

| Problema | Detalle |
|----------|---------|
| **Admin ve TODO** | `getInventoryByBranch('all')` lee toda la colección sin filtro. Con 20 sucursales, esto es O(products × branches). |
| **Branch isolation solo en queries** | No hay subcolecciones por branch. Todos los docs están en la misma colección flat. Firestore no puede indexar eficientemente `branchId` en una colección de 200K docs con onSnapshot. |
| **FIFO batches crecen sin límite** | Cada entrada de mercancía crea un batch. Nunca se archivan/eliminan. Con 500 entregas × 10 branches = 5,000 batches que se escanean en cada venta. |
| **Movements crecen linealmente** | 500 movimientos/día × 365 = 182,500/año. La query `limit(200)` del admin lee las últimas 200 pero el costo del índice crece. |

---

## 4. IMPACTO DE CRECIMIENTO — PROYECCIONES

### 4.1 Reads de Firestore (costo principal)

| Escenario | Reads/día (estimado) | Costo/mes (Spark→Blaze) |
|-----------|---------------------|------------------------|
| **Actual (12 prod, 3 suc, 3 users)** | ~5,000 | Gratis (50K/día free) |
| **100 productos, 3 suc, 5 users** | ~15,000 | Gratis |
| **500 productos, 5 suc, 10 users** | ~80,000 | ~$1.50/mes |
| **1,000 productos, 5 suc, 15 users** | ~250,000 | ~$4.50/mes |
| **5,000 productos, 10 suc, 30 users** | ~2,000,000 | ~$36/mes |
| **10,000 productos, 20 suc, 50 users** | ~15,000,000 | ~$270/mes 🔴 |

> **Nota:** Estos costos ASUMEN que se corrigen los full-collection reads. Sin corrección, los costos se multiplican ×10.

### 4.2 Writes de Firestore

| Operación | Writes Actuales | Con 1K prod + 500 ventas/día |
|-----------|----------------|------------------------------|
| Venta POS (5 items promedio) | ~15 writes | 500 × 15 = 7,500/día |
| Entrada mercancía | ~3 writes | ~50 × 3 = 150/día |
| Transferencias | ~10 writes | ~20 × 10 = 200/día |
| **Total writes/día** | ~100 | **~8,000** |
| **Costo writes/mes** | Gratis | ~$1.50 |

### 4.3 Latencia Esperada

| Operación | Actual (12 prod) | 500 prod | 5,000 prod | 10,000 prod |
|-----------|-----------------|----------|-----------|-------------|
| Abrir POS (cargar productos) | <500ms | ~1.5s | ~5s 🔴 | >10s ❌ |
| Procesar venta (5 items) | ~800ms | ~1.2s | ~3s 🔴 | ~5s ❌ |
| Abrir Admin Dashboard | ~300ms | ~2s | ~8s 🔴 | timeout ❌ |
| Generar P&L mensual | ~200ms | ~1s | ~5s | ~15s 🔴 |
| Inventory Valuation | ~100ms | ~500ms | ~3s | ~10s 🔴 |

---

## 5. MEJORAS PROPUESTAS CON CÓDIGO

### 5.1 [CRÍTICO] Paginación de Productos con Cursor

**Estado actual:** `onSnapshot` sobre TODA la colección products.

**Mejora:** Paginación con cursor-based infinite scroll + búsqueda server-side.

```typescript
// ecommerce/services/productService.ts — NUEVO
import { db, collection, query, orderBy, limit, startAfter, getDocs, where, onSnapshot, DocumentSnapshot } from '../lib/firebase';
import { Product } from '../lib/types';

const PAGE_SIZE = 50;

export interface ProductPage {
    products: Product[];
    lastDoc: DocumentSnapshot | null;
    hasMore: boolean;
}

/**
 * Paginated product loading (replaces full-collection onSnapshot)
 */
export const getProductsPage = async (
    lastDoc?: DocumentSnapshot | null,
    category?: string,
    searchTerm?: string
): Promise<ProductPage> => {
    let q = query(
        collection(db, 'products'),
        orderBy('name'),
        limit(PAGE_SIZE)
    );

    if (category && category !== 'all') {
        q = query(
            collection(db, 'products'),
            where('category', '==', category),
            orderBy('name'),
            limit(PAGE_SIZE)
        );
    }

    if (lastDoc) {
        q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
    } as Product));

    return {
        products,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === PAGE_SIZE
    };
};

/**
 * Real-time listener for a SINGLE page of products (dashboard overview)
 * For POS: load all products of the branch once, cache locally
 */
export const subscribeToProductUpdates = (
    productIds: string[],
    callback: (products: Product[]) => void
) => {
    // Firestore 'in' query supports max 30 items
    // For larger sets, batch into chunks of 30
    const chunks: string[][] = [];
    for (let i = 0; i < productIds.length; i += 30) {
        chunks.push(productIds.slice(i, i + 30));
    }

    const unsubscribes = chunks.map(chunk => {
        const q = query(
            collection(db, 'products'),
            where('__name__', 'in', chunk)
        );
        return onSnapshot(q, (snapshot) => {
            const products = snapshot.docs.map(doc => doc.data() as Product);
            callback(products);
        });
    });

    return () => unsubscribes.forEach(unsub => unsub());
};
```

### 5.2 [CRÍTICO] Inventario: Subcolecciones por Branch

**Estado actual:** Flat collection `inventory/{productId}_{branchId}`.

**Mejora:** Reestructurar para acceso eficiente por branch.

```
ACTUAL (flat):
  inventory/nike-air-max-90_suc-1  { productId, branchId, stock }
  inventory/nike-air-max-90_suc-2  { productId, branchId, stock }
  inventory/nike-air-max-90_suc-3  { productId, branchId, stock }

PROPUESTO (subcolección):
  branches/suc-1/inventory/nike-air-max-90  { stock, lowStockThreshold }
  branches/suc-2/inventory/nike-air-max-90  { stock, lowStockThreshold }

  // O alternativamente con Collection Group Queries:
  // Mantener flat pero usar índices optimizados + paginación
```

**Implementación pragmática (sin migración masiva):**

```typescript
// Mejora: Paginación del inventario para Admin
export const getInventoryPaginated = async (
    branchId: string,
    pageSize: number = 100,
    lastDoc?: DocumentSnapshot | null
): Promise<{ items: InventoryItem[]; lastDoc: DocumentSnapshot | null; hasMore: boolean }> => {
    let q;
    
    if (branchId === 'all') {
        q = query(
            collection(db, 'inventory'),
            orderBy('productId'),
            limit(pageSize)
        );
    } else {
        q = query(
            collection(db, 'inventory'),
            where('branchId', '==', branchId),
            orderBy('productId'),
            limit(pageSize)
        );
    }

    if (lastDoc) {
        q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
    } as InventoryItem));

    return {
        items,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize
    };
};
```

### 5.3 [CRÍTICO] FIFO Batch Optimization — Batch Index + Archiving

**Problema:** Cada venta hace `getDocs` de TODOS los batches con `remainingStock > 0` para un producto.

**Mejora 1: Composite Index (inmediato)**

```json
// firestore.indexes.json — CREAR ESTE ARCHIVO
{
    "indexes": [
        {
            "collectionGroup": "inventory_batches",
            "queryScope": "COLLECTION",
            "fields": [
                { "fieldPath": "productId", "order": "ASCENDING" },
                { "fieldPath": "branchId", "order": "ASCENDING" },
                { "fieldPath": "remainingStock", "order": "ASCENDING" },
                { "fieldPath": "createdAt", "order": "ASCENDING" }
            ]
        },
        {
            "collectionGroup": "transactions",
            "queryScope": "COLLECTION",
            "fields": [
                { "fieldPath": "branchId", "order": "ASCENDING" },
                { "fieldPath": "date", "order": "DESCENDING" }
            ]
        },
        {
            "collectionGroup": "inventory_movements",
            "queryScope": "COLLECTION",
            "fields": [
                { "fieldPath": "branchId", "order": "ASCENDING" },
                { "fieldPath": "createdAt", "order": "DESCENDING" }
            ]
        },
        {
            "collectionGroup": "journal_entries",
            "queryScope": "COLLECTION",
            "fields": [
                { "fieldPath": "status", "order": "ASCENDING" },
                { "fieldPath": "date", "order": "ASCENDING" }
            ]
        },
        {
            "collectionGroup": "orders",
            "queryScope": "COLLECTION",
            "fields": [
                { "fieldPath": "userId", "order": "ASCENDING" },
                { "fieldPath": "createdAt", "order": "DESCENDING" }
            ]
        },
        {
            "collectionGroup": "inventory_batches",
            "queryScope": "COLLECTION",
            "fields": [
                { "fieldPath": "branchId", "order": "ASCENDING" },
                { "fieldPath": "remainingStock", "order": "ASCENDING" }
            ]
        }
    ],
    "fieldOverrides": []
}
```

**Mejora 2: Archive depleted batches (Cloud Function)**

```typescript
// functions/src/archiveBatches.ts
// Scheduled Cloud Function: Moves depleted batches to archive
export const archiveDepletedBatches = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async () => {
        const db = admin.firestore();
        const snapshot = await db.collection('inventory_batches')
            .where('remainingStock', '==', 0)
            .limit(500)
            .get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            // Move to archive collection
            batch.set(db.doc(`inventory_batches_archive/${doc.id}`), doc.data());
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Archived ${snapshot.docs.length} depleted batches`);
    });
```

### 5.4 [ALTO] Reporting: Pre-aggregated Summaries via Cloud Functions

**Problema:** `getProfitAndLoss` lee TODOS los journal entries del rango.

**Mejora:** Cloud Function que mantiene summaries incrementales.

```typescript
// functions/src/onSaleCreated.ts
export const onTransactionCreated = functions.firestore
    .document('journal_entries/{entryId}')
    .onCreate(async (snap, context) => {
        const entry = snap.data() as JournalEntry;
        const db = admin.firestore();
        
        // Extract month key: "2026-02"
        const monthKey = entry.date.substring(0, 7);
        const summaryRef = db.doc(`financial_summaries/${monthKey}_${entry.branchId || 'all'}`);
        
        // Increment counters atomically
        const increments: Record<string, admin.firestore.FieldValue> = {
            transactionCount: admin.firestore.FieldValue.increment(1),
        };

        entry.lines.forEach(line => {
            if (line.accountId.startsWith('4.')) {
                increments.revenue = admin.firestore.FieldValue.increment(line.credit - line.debit);
            } else if (line.accountId === '5.1.01.01') {
                increments.cogs = admin.firestore.FieldValue.increment(line.debit - line.credit);
            } else if (line.accountId.startsWith('5.')) {
                increments.expenses = admin.firestore.FieldValue.increment(line.debit - line.credit);
            }
        });

        await summaryRef.set(increments, { merge: true });
    });

// Client-side: Read single doc instead of scanning entire collection
export const getMonthlyPnL = async (year: number, month: number, branchId?: string): Promise<ReportPnL> => {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const docId = branchId ? `${monthKey}_${branchId}` : `${monthKey}_all`;
    
    const snap = await getDoc(doc(db, 'financial_summaries', docId));
    const data = snap.data() || { revenue: 0, cogs: 0, expenses: 0 };
    
    return {
        startDate: `${monthKey}-01`,
        endDate: `${monthKey}-31`,
        revenue: data.revenue || 0,
        cogs: data.cogs || 0,
        grossProfit: (data.revenue || 0) - (data.cogs || 0),
        expenses: data.expenses || 0,
        netProfit: (data.revenue || 0) - (data.cogs || 0) - (data.expenses || 0),
        details: { revenueByAccount: {}, expensesByAccount: {} }
    };
};
```

### 5.5 [ALTO] Frontend: Virtualización de Listas + React.memo

```typescript
// Instalar: npm install @tanstack/react-virtual

// Ejemplo: Tabla de productos virtualizada
import { useVirtualizer } from '@tanstack/react-virtual';

const VirtualProductTable: React.FC<{ products: Product[] }> = ({ products }) => {
    const parentRef = React.useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: products.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 60, // row height in px
        overscan: 10,
    });

    return (
        <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                {virtualizer.getVirtualItems().map(virtualRow => {
                    const product = products[virtualRow.index];
                    return (
                        <div
                            key={product.id}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <ProductRow product={product} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Memoize individual rows to prevent re-renders
const ProductRow = React.memo<{ product: Product }>(({ product }) => (
    <tr className="border-b">
        <td>{product.name}</td>
        <td>{product.category}</td>
        <td>${product.price}</td>
        <td>{product.stock}</td>
    </tr>
));
```

### 5.6 [ALTO] Eliminar DataContext Duplicado

**Problema:** `contexts/DataContext.tsx` y `ecommerce/providers/DataProvider.tsx` son casi idénticos — ambos leen `products` y `transactions` con `onSnapshot`.

**Solución:** Eliminar `contexts/DataContext.tsx` y que el proyecto root use `ecommerce/providers/DataProvider.tsx` como fuente única.

### 5.7 [MEDIO] Zustand Store con Cache Local (reemplaza Context para productos)

```typescript
// ecommerce/stores/productStore.ts — NUEVO
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../lib/types';
import { getProductsPage, ProductPage } from '../services/productService';

interface ProductStore {
    products: Product[];
    lastDoc: any;
    hasMore: boolean;
    loading: boolean;
    lastFetched: number;
    
    loadInitial: () => Promise<void>;
    loadMore: () => Promise<void>;
    updateProduct: (product: Product) => void;
    invalidateCache: () => void;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useProductStore = create<ProductStore>()(
    persist(
        (set, get) => ({
            products: [],
            lastDoc: null,
            hasMore: true,
            loading: false,
            lastFetched: 0,

            loadInitial: async () => {
                const state = get();
                // Skip if cache is fresh
                if (Date.now() - state.lastFetched < CACHE_TTL && state.products.length > 0) {
                    return;
                }

                set({ loading: true });
                const page = await getProductsPage(null);
                set({
                    products: page.products,
                    lastDoc: page.lastDoc,
                    hasMore: page.hasMore,
                    loading: false,
                    lastFetched: Date.now()
                });
            },

            loadMore: async () => {
                const state = get();
                if (!state.hasMore || state.loading) return;

                set({ loading: true });
                const page = await getProductsPage(state.lastDoc);
                set(prev => ({
                    products: [...prev.products, ...page.products],
                    lastDoc: page.lastDoc,
                    hasMore: page.hasMore,
                    loading: false
                }));
            },

            updateProduct: (product) => {
                set(prev => ({
                    products: prev.products.map(p => p.id === product.id ? product : p)
                }));
            },

            invalidateCache: () => {
                set({ lastFetched: 0 });
            }
        }),
        {
            name: 'pos-products-cache',
            partialize: (state) => ({
                products: state.products,
                lastFetched: state.lastFetched
            })
        }
    )
);
```

### 5.8 [MEDIO] Batch Writes para Bulk Operations

**Estado actual:** `handleBulkDelete` y `handleBulkEdit` en AdminDashboard hacen `Promise.all` de N writes individuales.

```typescript
// ACTUAL (N writes paralelas sin control):
const promises = Array.from(selectedIds).map(id => deleteDoc(doc(db, 'transactions', id)));
await Promise.all(promises);

// MEJORADO (Firestore batched writes, max 500):
import { writeBatch } from 'firebase/firestore';

const handleBulkDelete = async () => {
    if (!window.confirm(`¿Eliminar ${selectedIds.size} transacciones?`)) return;
    
    const ids = Array.from(selectedIds);
    
    // Process in chunks of 500 (Firestore batch limit)
    for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        const batch = writeBatch(db);
        chunk.forEach(id => batch.delete(doc(db, 'transactions', id)));
        await batch.commit();
    }
    
    setSelectedIds(new Set());
};

const handleBulkEdit = async () => {
    const updates: any = {};
    if (bulkEditValues.category) updates.category = bulkEditValues.category;
    if (bulkEditValues.date) updates.date = new Date(bulkEditValues.date).toISOString();
    if (Object.keys(updates).length === 0) return;

    const ids = Array.from(selectedIds);
    
    for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        const batch = writeBatch(db);
        chunk.forEach(id => batch.update(doc(db, 'transactions', id), updates));
        await batch.commit();
    }
    
    setShowBulkEditModal(false);
    setSelectedIds(new Set());
};
```

---

## 6. COMPARATIVA: ESTADO ACTUAL vs MEJORADO

### 6.1 Reads por Operación

| Operación | Actual | Mejorado | Reducción |
|-----------|--------|----------|-----------|
| Abrir POS (cargar productos) | ALL products (10K) | 50 (paginated) | **99.5%** |
| Admin Dashboard | ALL products + ALL inventory + 200 movements | 50 products + 100 inventory (branch) + 50 movements | **95%** |
| Procesar venta (5 items FIFO) | 5 × ALL batches del producto (~500 reads) | 5 × top-3 batches (indexed, 15 reads) | **97%** |
| P&L mensual | ALL journal_entries del mes (3,000) | 1 doc (pre-aggregated) | **99.97%** |
| Inventory Valuation | ALL active batches (50,000) | 1 doc (pre-aggregated) | **99.998%** |

### 6.2 Latencia Esperada con 5,000 Productos

| Operación | Actual | Mejorado |
|-----------|--------|----------|
| Abrir POS | ~5s | <500ms |
| Procesar venta | ~3s | <800ms |
| Admin Dashboard | ~8s | <1.5s |
| P&L mensual | ~5s | <200ms |
| Búsqueda de producto | Client-side filter (all in memory) | Server-side query + cached |

### 6.3 Costo Mensual (5K productos, 10 sucursales, 30 users)

| Componente | Actual | Mejorado |
|-----------|--------|----------|
| Reads | ~$36/mes | ~$3/mes |
| Writes | ~$2/mes | ~$2/mes (sin cambio) |
| Storage | ~$0.50/mes | ~$0.50/mes |
| **Total** | **~$38.50/mes** | **~$5.50/mes** |

---

## 7. ÍNDICES COMPUESTOS REQUERIDOS

No existe `firestore.indexes.json`. Esto es crítico — sin índices, las queries compuestas fallan en producción.

| Colección | Campos | Orden | Necesario Para |
|-----------|--------|-------|---------------|
| `transactions` | `branchId` ASC, `date` DESC | Composite | DataProvider: transactions por branch |
| `inventory_movements` | `branchId` ASC, `createdAt` DESC | Composite | Kardex por branch |
| `inventory_batches` | `productId` ASC, `branchId` ASC, `remainingStock` ASC | Composite | FIFO en ventas y transferencias |
| `inventory_batches` | `branchId` ASC, `remainingStock` ASC | Composite | Inventory valuation |
| `journal_entries` | `status` ASC, `date` ASC | Composite | P&L reporting |
| `orders` | `userId` ASC, `createdAt` DESC | Composite | Customer dashboard |

---

## 8. PLAN DE IMPLEMENTACIÓN PRIORIZADO

| Fase | Acción | Prioridad | Esfuerzo | Impacto |
|------|--------|-----------|----------|---------|
| **Fase 0** | Crear `firestore.indexes.json` con todos los índices (§5.3) | 🔴 CRÍTICO | 30min | Evita crash en producción |
| **Fase 0** | Eliminar DataContext duplicado (§5.6) | 🔴 CRÍTICO | 15min | -50% reads inmediato |
| **Fase 1** | Paginación de productos en DataProvider (§5.1) | 🟡 ALTO | 4h | -99% reads en products |
| **Fase 1** | Paginación de inventario en Admin (§5.2) | 🟡 ALTO | 3h | -95% reads en inventory |
| **Fase 1** | Batch writes para bulk operations (§5.8) | 🟡 ALTO | 1h | Atomic, más rápido |
| **Fase 2** | Pre-aggregated financial summaries (§5.4) | 🟠 MEDIO-ALTO | 6h | -99% reads en reportes |
| **Fase 2** | Archive depleted batches (§5.3 Cloud Function) | 🟠 MEDIO | 3h | Reduce FIFO scan |
| **Fase 2** | Virtualización de tablas con @tanstack/react-virtual (§5.5) | 🟠 MEDIO | 3h | Elimina DOM lag |
| **Fase 3** | Zustand store con cache (§5.7) | 🔵 MEDIO | 4h | Offline-capable, UX fluida |
| **Fase 3** | Migrar inventario a subcolecciones por branch | 🔵 BAJO | 8h+ | Arquitectura óptima long-term |

---

## 9. ARQUITECTURA RECOMENDADA SI SE SUPERAN LÍMITES DE FIRESTORE

Si el proyecto crece más allá de ~50,000 documentos activos o necesita queries analíticas complejas:

| Escenario | Solución Recomendada |
|-----------|---------------------|
| **>50K productos activos** | Migrar catálogo a **Algolia** o **Typesense** para búsqueda, mantener Firestore para stock/transacciones |
| **>1M movimientos** | Exportar movimientos históricos a **BigQuery** via Firestore Extension, mantener solo últimos 90 días en Firestore |
| **Reportes complejos (cross-branch analytics)** | **BigQuery** + **Looker Studio** conectado via Firestore-to-BigQuery extension |
| **>100 usuarios concurrentes** | Considerar **Firebase Realtime Database** para datos de alta-frecuencia (stock real-time) + Firestore para datos transaccionales |
| **Necesidad de SQL/JOINs** | Mantener Firestore para operacional, agregar **Cloud SQL (PostgreSQL)** para analytics via Cloud Functions sync |

---

*Fin del reporte de escalabilidad. La implementación de las Fases 0 y 1 es obligatoria antes de superar 500 productos.*
