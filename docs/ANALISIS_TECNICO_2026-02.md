# Análisis técnico detallado — POS-JE
**Fecha:** 2026-02-20  
**Objetivo:** detectar errores potenciales, mejorar seguridad, escalabilidad, rapidez y reducir costos de Firebase; además proponer nuevas features.

---

## 1) Resumen ejecutivo

**Estado general:** el proyecto está bien encaminado (ya usa `runTransaction`, `writeBatch`, índices compuestos y claims en reglas), pero todavía hay varios riesgos de seguridad y de costo si crece el volumen de datos.

### Hallazgos críticos (prioridad alta)
1. **Uso de `eval` en POS/calculadora** → riesgo de ejecución de código y fallos de estabilidad.
2. **Reglas de Storage demasiado permisivas en `/products/**`** → cualquier usuario autenticado puede escribir imágenes.
3. **Desalineación entre roles del frontend y reglas** → UI usa rol de documento (`users`), reglas usan custom claims (`request.auth.token.role`), provocando inconsistencias operativas.
4. **Listeners real-time amplios y consultas sin límites en vistas administrativas** → riesgo de crecimiento lineal en lecturas.

### Impacto esperado si se corrige
- **Seguridad:** reducción fuerte de superficie de ataque.
- **Rendimiento:** mejor tiempo de carga en dashboards grandes.
- **Costo Firebase:** menos lecturas por usuario/sesión y menor presión sobre índices.

---

## 2) Errores y riesgos detectados

## 2.1 Seguridad

### A. `eval` en interfaz de POS
- Se detecta evaluación dinámica de expresiones con `eval`.
- Riesgo: ejecución inesperada, errores silenciosos, y deuda de seguridad.
- Recomendación:
  - reemplazar por parser matemático controlado (p. ej. `math-expression-evaluator`) o una función aritmética limitada con regex + AST simple;
  - bloquear todo carácter fuera de `[0-9.+\-*/()% ]`.

### B. Regla de Storage inconsistente con el comentario funcional
- En `storage.rules`, la ruta `products/**` permite `write` a cualquier autenticado; el comentario indica “managers”.
- Riesgo: usuarios sin privilegio podrían subir/reemplazar archivos.
- Recomendación:
  - mover validación de rol a custom claim (`request.auth.token.role in ['MANAGER','ADMIN']`),
  - restringir MIME estricto (`image/jpeg|image/png|image/webp`),
  - exigir naming por carpeta (`products/{branchId}/{productId}.webp`) y tamaño por tipo.

### C. Inconsistencia de autorización (UI vs reglas)
- Frontend calcula `isAdmin/isManager/isCashier` con el documento `users/{uid}`.
- Reglas usan claims (`request.auth.token`).
- Riesgo: UI muestra opciones que luego Firestore rechaza (o viceversa), generando errores de negocio.
- Recomendación:
  - migrar frontend a `getIdTokenResult()` y usar claims como fuente principal;
  - dejar el doc `users` para metadata de perfil no sensible.

### D. Validación parcial de esquemas en reglas
- Algunas colecciones validan `hasAll`, pero no siempre limitan `hasOnly` ni tipos completos.
- Riesgo: escritura de campos inesperados (bloat, data drift, bugs de reporting).
- Recomendación:
  - en colecciones críticas (`transactions`, `inventory_movements`, `journal_entries`) aplicar `hasOnly([...])` + validaciones de tipo/rango.

---

## 2.2 Escalabilidad

### A. Consultas administrativas de alto volumen
- Existen rutas/servicios que pueden leer colecciones amplias (especialmente inventario y movimientos en modo “all”).
- Riesgo: crecimiento de latencia y costo proporcional al tamaño total.
- Recomendación:
  - paginación por cursor en todas las pantallas admin,
  - límites por defecto (`limit 50/100`),
  - filtros obligatorios por rango de fecha y sucursal.

### B. Dependencia fuerte de listeners real-time
- Real-time está bien para POS activo, pero en paneles analíticos puede sobrar.
- Riesgo: relecturas por reconexión/metadata + más RAM cliente.
- Recomendación:
  - usar `getDocs` paginado para histórico/reportes;
  - mantener `onSnapshot` solo para eventos transaccionales (ventas activas, estado de caja).

### C. Consultas FIFO por lotes a medida que crece inventario
- En ventas/transferencias, el costo de consultar lotes crece si no hay topes por documento o housekeeping.
- Recomendación:
  - TTL/archivado agresivo de lotes agotados,
  - compactación de lotes antiguos por producto/sucursal,
  - job de “health check” de cardinalidad por producto.

---

## 2.3 Rapidez (performance UX)

1. **POS offline-first** con cache en IndexedDB para catálogo y precios.
2. **Precalcular vistas pesadas** (KPIs diarios/semanales) en Cloud Functions.
3. **Virtualización de tablas** en vistas con >500 filas.
4. **Separar rutas “live” y “históricas”** para que reportes no compitan con flujo de venta.

---

## 2.4 Ahorro de Firebase (lecturas/escrituras)

## Quick wins (1-2 semanas)
1. Quitar listeners innecesarios en dashboards de solo lectura.
2. Reducir payload en documentos (evitar arrays enormes embebidos en docs calientes).
3. Implementar “resúmenes diarios” (`daily_metrics/{branchId_yyyy-mm-dd}`) y consultar eso primero.
4. Cache local con TTL para catálogos (`products`, `categories`, `roles`).

## Mid-term (2-6 semanas)
1. **Materialized views** por sucursal/mes para P&L e inventario.
2. **Particionar reporting por mes** (`journal_entries_YYYY_MM` o clave compuesta de período).
3. **Alertas de costo** con Budget + alertas por spikes de reads.

---

## 3) Plan recomendado por fases

## Fase 1 — Seguridad y estabilidad (prioridad máxima)
- Eliminar `eval` del POS.
- Endurecer `storage.rules` para `/products/**`.
- Alinear frontend a claims de Auth para permisos.
- Añadir pruebas de reglas de seguridad para casos de rol/sucursal.

## Fase 2 — Costo y rendimiento
- Convertir pantallas analíticas a consultas paginadas (`getDocs`) + filtros.
- Mantener real-time únicamente en flujo operativo.
- Activar caché local con invalidación por versión.

## Fase 3 — Escalabilidad de negocio
- Preagregados diarios/mensuales por Cloud Functions.
- Jobs de archivado/compactación de lotes.
- Dashboard de observabilidad (latencia media de venta, reads por sesión, errores por permiso).

---

## 4) Ideas de features de alto impacto

1. **Modo Offline de Caja con cola de sincronización** (ventas no se detienen por internet inestable).
2. **Reabastecimiento inteligente** (sugerencia de compra por rotación y días de inventario).
3. **Alertas de margen anómalo** (si costo promedio sube o margen cae por sucursal).
4. **Centro de auditoría** (timeline de cambios de precio, stock, y usuarios con trazabilidad).
5. **Programa de fidelidad básico** (puntos/cupones por ticket promedio y frecuencia).
6. **Forecast simple por producto** (promedio móvil/estacionalidad semanal).

---

## 5) Checklist técnico para ejecución

- [ ] Reemplazar `eval` por evaluador seguro.
- [ ] Refactor de permisos UI basados en claims.
- [ ] Hardening de `storage.rules` + tests.
- [ ] Paginación uniforme en admin/reportes.
- [ ] Métricas preagregadas para P&L y valorización.
- [ ] Monitor de costos y presupuesto Firebase.

---

## 6) KPIs sugeridos para medir mejora

1. **Reads por sesión (mediana)**
2. **Tiempo de apertura del POS (p50/p95)**
3. **Tiempo de registrar venta (p50/p95)**
4. **Errores de permisos por día**
5. **Costo mensual Firestore/Auth/Functions**
6. **Tasa de éxito offline-sync**

> Meta inicial: bajar 30-50% lecturas en panel administrativo y reducir errores de autorización percibidos por usuarios.
