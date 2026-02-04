# Sistema Financiero & Contable - Documentación Técnica

**Versión:** 1.0  
**Fecha:** Febrero 2026  
**Módulo:** Contabilidad Core & Inventario Avanzado

---

## 1. Arquitectura General

El sistema ha evolucionado de un simple registro de ventas a un **Mini-ERP** que integra operaciones de venta con contabilidad de partida doble e inventario valorado.

### Flujo de Datos (Data Flow)

1.  **Venta en POS (Frontend `inventoryService.ts`)**:
    *   El usuario confirma venta.
    *   **Paso 1 (FIFO):** El sistema busca lotes (`inventory_batches`) disponibles ordenados por fecha (`asc`).
    *   **Paso 2 (Cálculo):** Consume stock de los lotes y calcula el *Costo Real* de la venta.
    *   **Paso 3 (Atomicidad):** En una sola transacción de Firestore:
        *   Resta stock de lotes.
        *   Resta stock global.
        *   Crea documento `transactions`.
        *   Crea asiento contable `journal_entries` (Debe Costo / Haber Inventario).

2.  **Reportes (`reportingService.ts`)**:
    *   **P&L**: Agrega documentos de `journal_entries` para calcular Utilidad Neta en tiempo real.
    *   **Valuación**: Suma el costo remanente en `inventory_batches`.

---

## 2. Inventario Avanzado (FIFO)

### Concepto
El sistema utiliza **PEPS (Primeras Entradas, Primeras Salidas)**.

*   **Entrada (`addInventoryBatch`)**: Cada vez que se recibe mercadería, se crea un "Lote" con su costo específico.
*   **Salida**: Al vender, se descuenta del lote más viejo.
*   **Transferencia**: Al mover entre sucursales, el sistema "empaqueta" los costos de los lotes origen y recrea lotes idénticos en el destino para preservar el valor financiero.

### Estructura de Datos
*   **`inventory_batches`**: `{ id, productId, branchId, cost, remainingStock, createdAt }`

---

## 3. Contabilidad Core

### Catálogo de Cuentas (Estándar NI)
El sistema opera con un catálogo estándar pre-cargado en Firebase (`accounts`):
*   `1.x.x`: Activos (Caja, Inventario)
*   `2.x.x`: Pasivos (IVA por Pagar)
*   `4.x.x`: Ingresos (Ventas)
*   `5.x.x`: Costos & Gastos

### Asientos Automáticos
Cada venta genera un asiento con 2 pares de movimientos:
1.  **Ingreso**:
    *   Debe: Caja General (1.1.01) [Total Venta]
    *   Haber: Ventas (4.1.01) [Subtotal]
    *   Haber: IVA por Pagar (2.1.05) [Impuesto]
2.  **Costo**:
    *   Debe: Costo de Venta (5.1.01) [Costo calculado FIFO]
    *   Haber: Inventario (1.3.01) [Costo calculado FIFO]

---

## 4. Troubleshooting (Solución de Problemas)

### Margen de Utilidad Negativo
*   **Causa:** El costo de los productos en el lote es mayor al precio de venta.
*   **Solución:** Revisar el costo ingresado al crear el lote en `inventory_batches`.

### Asientos Descuadrados
*   **Causa:** Error en la transacción o manipulación manual de datos.
*   **Verificación:** Revisar colección `journal_entries` donde `debit != credit`. (El sistema bloquea esto por código, pero posible si se edita en consola).

### Inventario vs Contabilidad
*   El valor en `getInventoryValuation()` debe coincidir teóricamente con el saldo de la cuenta `1.3.01` (Inventario). Pequeñas diferencias pueden deberse a redondeos.

---

## 5. Comandos Útiles

*   **Verificar Integridad:** Ejecutar `seedAccounting.ts` en modo validación (futuro).
*   **Re-inicializar Cuentas:** Usar el botón "Semilla Contable" en `/setup`.
