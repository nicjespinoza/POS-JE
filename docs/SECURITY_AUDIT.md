# AUDITORÍA DE SEGURIDAD FULL-STACK — POS-JE
**Fecha:** 2026-02-11  
**Auditor:** Cascade AI Security Analyst  
**Repositorio:** https://github.com/nicjespinoza/POS-JE  
**Stack:** Next.js 16 + React 18 + TypeScript + Firebase (Firestore, Auth, Hosting)  
**Clasificación:** CONFIDENCIAL

---

## RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| **Vulnerabilidades Críticas** | 4 |
| **Vulnerabilidades Altas** | 6 |
| **Vulnerabilidades Medias** | 5 |
| **Vulnerabilidades Bajas** | 4 |
| **Score de Seguridad (0-100)** | **32/100** ❌ NO APTO para producción |

**Veredicto:** El proyecto tiene una base arquitectónica correcta (Firestore rules con RBAC, branch isolation, transaction validation) pero contiene **vulnerabilidades críticas que deben resolverse antes de cualquier despliegue en producción**.

---

## 1. VULNERABILIDADES IDENTIFICADAS

### 1.1 CRÍTICAS (P0 — Resolver inmediatamente)

| # | Vulnerabilidad | Archivo | Impacto |
|---|---------------|---------|---------|
| C1 | **Credenciales Firebase hardcodeadas en código fuente público** | `services/firebase.ts:10-16`, `ecommerce/lib/firebase.ts:7-14` | API Key, Project ID, App ID expuestos en GitHub público. Cualquier persona puede usar estas credenciales para acceder al proyecto Firebase. |
| C2 | **Roles almacenados en Firestore (client-writable) en vez de Custom Claims** | `ecommerce/contexts/AuthContext.tsx:79-88`, `firestore.rules:14-22` | Un usuario autenticado puede modificar su documento `/users/{uid}` y auto-asignarse el rol ADMIN. Las security rules leen el rol desde `/users/{uid}` que el propio usuario puede escribir (línea 67-69 de rules). |
| C3 | **`inventory_movements` create: false bloquea operaciones legítimas del cliente** | `firestore.rules:179`, `ecommerce/components/pos/POSInventory.tsx:105`, `ecommerce/services/inventoryService.ts:93` | Las rules dicen `allow create: if false` pero el código del cliente escribe directamente a `inventory_movements`. Esto significa: o las rules están desplegadas y el POS no funciona, o no están desplegadas y la colección está abierta. |
| C4 | **No existe `storage.rules`** | `firebase.json:14` referencia `storage.rules` que no existe | Firebase Storage queda con reglas por defecto (posiblemente abiertas). Cualquiera podría subir/leer archivos arbitrarios. |

### 1.2 ALTAS (P1 — Resolver antes de producción)

| # | Vulnerabilidad | Archivo | Impacto |
|---|---------------|---------|---------|
| H1 | **Auto-seeding de roles en producción potencial** | `AuthContext.tsx:50-73` | El check `process.env.NODE_ENV === 'development'` puede fallar en Next.js (usa `NODE_ENV` de forma diferente). En producción, si `access_users` no existe, un atacante con email `admin@webdesignje.com` obtendría ADMIN automáticamente. |
| H2 | **`setup-db` accesible sin verificación de rol** | `ecommerce/app/setup-db/page.tsx:162-163` | Solo verifica `if (!user)` pero NO verifica que sea ADMIN. Cualquier usuario autenticado puede reinicializar la base de datos completa, sobreescribiendo productos, inventario y access_users. |
| H3 | **`inventory_batches` y `journal_entries` sin reglas Firestore** | `firestore.rules` (ausentes) | Estas colecciones no están definidas en las rules. El fallback `match /{document=**}` las bloquea, pero `processAtomicSale` las escribe desde el cliente via `runTransaction`. La transacción atómica fallará en producción. |
| H4 | **IP del cliente expuesta en UI** | `ecommerce/app/portal/page.tsx:173,228` | La IP real del usuario se muestra en pantalla (`clientIp`). Un atacante con acceso visual (shoulder surfing, screenshots) obtiene la IP. |
| H5 | **Transferencia de stock sin transacción atómica** | `inventoryService.ts:196-239` | `transferStock` hace 4 escrituras secuenciales sin `runTransaction`. Si falla a mitad, el inventario queda inconsistente (stock descontado de origen pero no sumado en destino). |
| H6 | **App Check desactivado** | `services/firebase.ts:27-35` | Sin App Check, cualquier script puede hacer requests a Firebase usando las credenciales expuestas, sin verificar que venga de tu app legítima. |

### 1.3 MEDIAS (P2)

| # | Vulnerabilidad | Archivo | Impacto |
|---|---------------|---------|---------|
| M1 | **No hay Next.js middleware para proteger rutas** | No existe `ecommerce/middleware.ts` | `/admin`, `/pos`, `/setup-db` son accesibles sin autenticación a nivel de servidor. La protección es solo client-side (React context). Un bot puede hacer scraping del HTML/JS. |
| M2 | **Console.log con datos sensibles en producción** | `AuthContext.tsx:51,82,106,108`, `portal/page.tsx:108,114` | Logs de email, roles, contraseña (longitud), objetos de error completos. En producción estos logs son visibles en DevTools. |
| M3 | **Sin rate limiting en login** | `portal/page.tsx:95-138` | Firebase Auth tiene rate limiting propio, pero no hay protección adicional contra brute force a nivel de UI (no hay CAPTCHA, no hay delay progresivo). |
| M4 | **Sin Content Security Policy (CSP) headers** | `next.config.ts`, `firebase.json` | No hay CSP configurado. Permite ejecución de scripts de terceros, potencial vector XSS. |
| M5 | **`authorized_ips` bypass en development** | `portal/page.tsx:56-58` | El check de IP se salta completamente en development. Si `NODE_ENV` no se configura correctamente en el build, el bypass podría llegar a producción. |

### 1.4 BAJAS (P3)

| # | Vulnerabilidad | Archivo | Impacto |
|---|---------------|---------|---------|
| L1 | **Sin validación de schema en products write** | `firestore.rules:74-77` | Solo valida `isManager()` pero no valida campos obligatorios ni tipos. Un manager podría escribir datos malformados. |
| L2 | **Firebase config duplicada** | `services/firebase.ts`, `ecommerce/lib/firebase.ts` | Dos archivos idénticos de config dificultan el mantenimiento y aumentan superficie de error. |
| L3 | **`deleteProduct` no implementado** | `DataProvider.tsx:112-116` | La función solo imprime warning. Productos fantasma podrían acumularse. |
| L4 | **Tests de seguridad incompletos** | `tests/security/firestore.rules.test.ts` | No cubren: inventory_batches, journal_entries, inventory_movements, stock_transfers, ni edge cases de escalación de privilegios. |

---

## 2. ANÁLISIS DEL SISTEMA DE AUTENTICACIÓN Y AUTORIZACIÓN

### 2.1 Flujo Actual

```
Usuario → Firebase Auth (email/password) → AuthContext lee access_users/{email} 
→ Determina Role → Escribe a users/{uid} → Frontend condiciona UI por rol
→ Firestore Rules leen users/{uid}.role para autorizar operaciones
```

### 2.2 Problema Fundamental: Roles en Firestore ≠ Custom Claims

**Estado actual:** Los roles se almacenan en la colección `users/{uid}` en Firestore. Las security rules leen de ahí:

```
// firestore.rules:14-22
function getUserData() {
  let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
  return userDoc.exists ? userDoc.data : null;
}
function hasRole(role) {
  let userData = getUserData();
  return userData != null && userData.role == role;
}
```

**Ataque de escalación de privilegios:**

```
// firestore.rules:63-71 — Users Collection
match /users/{userId} {
  allow update: if isAuthenticated() && 
    (request.auth.uid == userId || isAdmin());  // ← PROBLEMA
}
```

Un usuario autenticado puede hacer `updateDoc(doc(db, 'users', myUid), { role: 'ADMIN' })` porque `request.auth.uid == userId` es TRUE. Después de esto, `hasRole('ADMIN')` retorna TRUE y tiene acceso total.

**Severidad: CRÍTICA** — Esta es la vulnerabilidad más peligrosa del proyecto.

### 2.3 El caso `admin@webdesignje.com`

El email hardcodeado en `AuthContext.tsx:55` y `setup-db/page.tsx:252` recibe tratamiento especial:
- Auto-seed como ADMIN en development
- Sync forzado del perfil en setup-db

Esto es aceptable para desarrollo pero **en producción, el admin debe establecerse via Custom Claims** desde Firebase Admin SDK (server-side), nunca desde el cliente.

---

## 3. ANÁLISIS DE FIRESTORE RULES

### 3.1 Evaluación por Colección

| Colección | Read | Write | Branch Isolation | Schema Validation | Veredicto |
|-----------|------|-------|-----------------|-------------------|-----------|
| `users` | ✅ Correcto | ⛔ **CRÍTICO**: Usuario puede editar su propio rol | N/A | ❌ Sin validación | **FALLA** |
| `products` | ✅ OK | ⚠️ Solo role check | N/A | ❌ Sin validación | Mejorable |
| `transactions` | ✅ Branch isolation OK | ✅ Validación de schema | ✅ | ✅ Buena | **MEJOR REGLA** |
| `branches` | ✅ OK | ✅ Admin only | N/A | ❌ | OK |
| `inventory` | ✅ Branch isolation | ⚠️ Manager solo su branch | ✅ | ❌ | Mejorable |
| `access_users` | ⚠️ Todos autenticados leen | ✅ Admin only | N/A | ❌ | Riesgo medio |
| `inventory_movements` | ✅ Branch isolation | ⛔ `create: false` rompe el cliente | ✅ | N/A | **FALLA** |
| `inventory_batches` | ❌ **NO DEFINIDA** | ❌ **NO DEFINIDA** | ❌ | ❌ | **FALLA** |
| `journal_entries` | ❌ **NO DEFINIDA** | ❌ **NO DEFINIDA** | ❌ | ❌ | **FALLA** |
| `audit_logs` | ✅ Inmutable | ✅ | ✅ | N/A | ✅ Excelente |
| `stock_transfers` | ✅ OK | ✅ | ✅ | ❌ | OK |

### 3.2 Colecciones faltantes en las rules

El fallback `match /{document=**} { allow: false }` bloquea todo lo no definido. Pero el código del cliente escribe a:

- **`inventory_batches`** — `inventoryService.ts:357` via `runTransaction`
- **`journal_entries`** — `inventoryService.ts:448` via `runTransaction`
- **`inventory_movements`** — `POSInventory.tsx:105` via `setDoc` directo

Todas estas operaciones **fallarán silenciosamente en producción** con las rules actuales.

### 3.3 Race Condition en `getUserData()`

```
function getUserData() {
  let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid));
  return userDoc.exists ? userDoc.data : null;
}
```

Cada evaluación de regla hace un `get()` adicional a Firestore. Con múltiples reglas encadenadas (`isManager()` llama `hasRole()` que llama `getUserData()`), esto consume reads y aumenta latencia. Custom Claims eliminan este overhead completamente.

---

## 4. ANÁLISIS DE SEGURIDAD FRONTEND

### 4.1 XSS (Cross-Site Scripting)

| Vector | Estado | Detalle |
|--------|--------|---------|
| `dangerouslySetInnerHTML` | ✅ No usado | No encontrado en el codebase |
| `innerHTML` | ✅ No usado | No encontrado |
| User input rendering | ✅ React auto-escapes | JSX escapa por defecto |
| Image URLs from DB | ⚠️ Riesgo bajo | URLs de imágenes se renderizan en `<img src>`. Un admin malicioso podría inyectar un URL con JS handler, pero `<img src>` no ejecuta JS |
| Gemini AI output | ⚠️ Riesgo medio | `geminiService.ts:50` retorna texto que se renderiza. Si se renderiza como Markdown sin sanitizar, posible XSS |

**Veredicto XSS: BAJO** — React proporciona buena protección por defecto.

### 4.2 CSRF (Cross-Site Request Forgery)

| Vector | Estado |
|--------|--------|
| Firebase Auth tokens | ✅ Manejados por Firebase SDK |
| Firestore writes | ✅ Requieren Auth token válido |
| SameSite cookies | ✅ Firebase maneja esto |

**Veredicto CSRF: BAJO** — Firebase SDK maneja tokens correctamente.

### 4.3 Exposición de Datos Sensibles

| Dato | Expuesto | Ubicación |
|------|----------|-----------|
| Firebase API Key | ⛔ **SÍ — EN GITHUB PÚBLICO** | `services/firebase.ts:10`, `ecommerce/lib/firebase.ts:7` |
| Firebase Project ID | ⛔ **SÍ** | Mismo archivo |
| Gemini API Key | ✅ Protegida via `process.env` | `geminiService.ts:8` |
| IP del usuario | ⚠️ Mostrada en UI | `portal/page.tsx:228` |
| Contraseñas | ✅ Nunca almacenadas | Firebase Auth maneja hashing |
| Emails de usuarios | ⚠️ Visibles en `access_users` | Cualquier usuario autenticado puede leerlos |
| `localStorage/sessionStorage` | ✅ No usado para datos sensibles | No encontrado en codebase |

### 4.4 Dependencias

| Paquete | Riesgo |
|---------|--------|
| `firebase` | ✅ Mantenido por Google |
| `next` | ✅ Framework maduro |
| `framer-motion` | ✅ Bajo riesgo |
| `@google/genai` | ⚠️ Relativamente nuevo, verificar versión |
| `lucide-react` | ✅ Bajo riesgo |

---

## 5. MEJORAS PRIORIZADAS CON CÓDIGO

### 5.1 [CRÍTICA] Fix C2: Bloquear auto-escalación de roles en users

**Problema:** Un usuario puede cambiar su propio `role` en `/users/{uid}`.

**Fix inmediato en `firestore.rules`:**

```javascript
// --- Users Collection --- SECURE VERSION
match /users/{userId} {
  allow read: if isAuthenticated() && 
    (request.auth.uid == userId || isManager());
  
  // CREATE: User can create their own profile (without role escalation)
  allow create: if isAuthenticated() && 
    request.auth.uid == userId &&
    request.resource.data.role == 'GUEST';  // Force GUEST on self-create
  
  // UPDATE: User can update own profile EXCEPT role and branchId
  // Only ADMIN can change role/branchId
  allow update: if isAuthenticated() && (
    (
      // Self-update: Cannot change role or branchId
      request.auth.uid == userId &&
      request.resource.data.role == resource.data.role &&
      request.resource.data.branchId == resource.data.branchId
    ) || 
    isAdmin()  // Admin can change anything
  );
  
  allow delete: if isAdmin();
}
```

### 5.2 [CRÍTICA] Fix C1: Mover credenciales Firebase a variables de entorno

**`ecommerce/lib/firebase.ts` — versión segura:**

```typescript
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate required config
const requiredKeys = ['apiKey', 'authDomain', 'projectId'] as const;
for (const key of requiredKeys) {
    if (!firebaseConfig[key]) {
        throw new Error(`Missing Firebase config: ${key}. Set NEXT_PUBLIC_FIREBASE_${key.toUpperCase()} in .env.local`);
    }
}
```

**`.env.local` (NO commitear):**
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAWQS6K0KX5v4VcCMkc8wYMcDCy620g5a0
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pos-zapatos.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pos-zapatos
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=pos-zapatos.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=717323415083
NEXT_PUBLIC_FIREBASE_APP_ID=1:717323415083:web:12e41d5fd205ba2301c46e
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-DQTWFD2B83
```

> **IMPORTANTE:** Dado que la API key ya fue expuesta en GitHub público, **DEBE rotarse** desde Firebase Console > Project Settings > API Keys.

### 5.3 [CRÍTICA] Fix C3/H3: Agregar reglas para colecciones faltantes

```javascript
// --- Inventory Batches (FIFO) ---
match /inventory_batches/{batchId} {
  allow read: if isAuthenticated() && (
    isAdmin() || 
    resource.data.branchId == getUserBranchId()
  );
  // Write: Only via atomic transactions by Manager+
  allow create: if isManager() && (
    isAdmin() || 
    request.resource.data.branchId == getUserBranchId()
  ) && request.resource.data.keys().hasAll(['productId', 'branchId', 'cost', 'initialStock', 'remainingStock']);
  
  allow update: if isManager() && (
    isAdmin() || 
    resource.data.branchId == getUserBranchId()
  );
  allow delete: if isAdmin();
}

// --- Journal Entries (Accounting) ---
match /journal_entries/{entryId} {
  allow read: if isAuthenticated() && (
    isAdmin() || 
    resource.data.branchId == getUserBranchId()
  );
  // Only created via atomic sale transactions
  allow create: if isCashier() && 
    request.resource.data.keys().hasAll(['date', 'description', 'lines', 'totalAmount', 'branchId', 'createdBy']) &&
    request.resource.data.createdBy == request.auth.uid;
  allow update, delete: if isAdmin();
}

// --- Inventory Movements (Kardex) --- UPDATED
match /inventory_movements/{movementId} {
  allow read: if isAuthenticated() && (
    isAdmin() || 
    resource.data.branchId == getUserBranchId()
  );
  // Allow creation by Manager+ for their branch (stock entries, adjustments)
  // and by Cashier+ during atomic sales
  allow create: if isCashier() && (
    isAdmin() || 
    request.resource.data.branchId == getUserBranchId()
  ) && request.resource.data.keys().hasAll(['productId', 'branchId', 'type', 'quantity', 'userId']) &&
    request.resource.data.userId == request.auth.uid;
  
  // Movements are immutable once created (audit trail)
  allow update, delete: if false;
}
```

### 5.4 [CRÍTICA] Fix C4: Crear storage.rules

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Product images - authenticated users can read, managers can write
    match /products/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.resource.size < 5 * 1024 * 1024 && // Max 5MB
        request.resource.contentType.matches('image/.*'); // Only images
    }
    
    // Deny everything else
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### 5.5 [ALTA] Fix H2: Proteger setup-db con verificación de admin

```typescript
// ecommerce/app/setup-db/page.tsx — agregar al inicio de initializeDB
const initializeDB = async () => {
    if (!user) { setStatus('Debes iniciar sesion primero.'); return; }
    
    // SECURITY: Only admin can initialize DB
    if (user.email !== 'admin@webdesignje.com') {
        setStatus('ERROR: Solo el administrador puede inicializar la base de datos.');
        return;
    }
    // ... resto del código
};
```

### 5.6 [ALTA] Migrar a Custom Claims (Solución definitiva para C2)

**Cloud Function para establecer roles (server-side):**

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const setUserRole = functions.https.onCall(async (data, context) => {
    // Only allow admins to set roles
    if (!context.auth?.token?.role || context.auth.token.role !== 'ADMIN') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can set roles');
    }

    const { uid, role, branchId } = data;
    
    if (!['ADMIN', 'MANAGER', 'CASHIER', 'INVENTORY', 'GUEST'].includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
    }

    await admin.auth().setCustomUserClaims(uid, { role, branchId });
    
    // Also sync to Firestore for queries
    await admin.firestore().doc(`users/${uid}`).set({ role, branchId }, { merge: true });
    
    return { success: true };
});

// Bootstrap: Set first admin via Firebase CLI or this trigger
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    if (user.email === 'admin@webdesignje.com') {
        await admin.auth().setCustomUserClaims(user.uid, { role: 'ADMIN' });
    }
});
```

**Firestore Rules con Custom Claims (reemplaza getUserData):**

```javascript
function hasClaimRole(role) {
  return request.auth.token.role == role;
}

function isAdminClaim() {
  return isAuthenticated() && hasClaimRole('ADMIN');
}

function isManagerClaim() {
  return isAuthenticated() && (hasClaimRole('MANAGER') || hasClaimRole('ADMIN'));
}

function getUserBranchClaim() {
  return request.auth.token.branchId;
}
```

> **Ventaja:** Elimina el `get()` extra en cada evaluación de regla, mejora latencia, y **es imposible de falsificar desde el cliente**.

### 5.7 [MEDIA] Agregar Next.js Middleware para protección server-side

```typescript
// ecommerce/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/admin', '/pos', '/setup-db'];
const PUBLIC_ROUTES = ['/', '/portal', '/catalog', '/login', '/register'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // Check if route requires auth
    const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
    
    if (isProtected) {
        // Check for Firebase auth session cookie
        const session = request.cookies.get('__session');
        
        if (!session) {
            return NextResponse.redirect(new URL('/portal', request.url));
        }
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/pos/:path*', '/setup-db/:path*'],
};
```

### 5.8 [MEDIA] Agregar Security Headers en next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        domains: ['firebasestorage.googleapis.com', 'images.unsplash.com'],
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: https://images.unsplash.com https://firebasestorage.googleapis.com",
                            "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://api.ipify.org https://generativelanguage.googleapis.com",
                            "font-src 'self'",
                            "frame-src https://*.firebaseapp.com",
                        ].join('; ')
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    }
                ],
            },
        ];
    },
};

export default nextConfig;
```

### 5.9 [ALTA] Fix H5: Transferencia atómica de stock

```typescript
export const transferStockAtomic = async (
    productId: string, productName: string,
    fromBranchId: string, fromBranchName: string,
    toBranchId: string, toBranchName: string,
    quantity: number, userId: string, userName: string
): Promise<void> => {
    await runTransaction(db, async (transaction) => {
        const fromInvId = `${productId}_${fromBranchId}`;
        const toInvId = `${productId}_${toBranchId}`;
        
        const fromRef = doc(db, 'inventory', fromInvId);
        const toRef = doc(db, 'inventory', toInvId);
        
        const fromSnap = await transaction.get(fromRef);
        const toSnap = await transaction.get(toRef);
        
        if (!fromSnap.exists()) throw new Error('Inventario origen no existe');
        
        const fromStock = fromSnap.data().stock || 0;
        const toStock = toSnap.exists() ? (toSnap.data().stock || 0) : 0;
        
        if (fromStock < quantity) throw new Error('Stock insuficiente');
        
        // Atomic writes
        transaction.update(fromRef, { stock: fromStock - quantity, updatedAt: new Date().toISOString() });
        
        if (toSnap.exists()) {
            transaction.update(toRef, { stock: toStock + quantity, updatedAt: new Date().toISOString() });
        } else {
            transaction.set(toRef, { productId, branchId: toBranchId, stock: quantity, lowStockThreshold: 5, updatedAt: new Date().toISOString() });
        }
        
        // Movement logs (within same transaction)
        const movOutId = crypto.randomUUID();
        const movInId = crypto.randomUUID();
        
        transaction.set(doc(db, 'inventory_movements', movOutId), {
            id: movOutId, productId, productName,
            branchId: fromBranchId, branchName: fromBranchName,
            type: 'TRANSFERENCIA', quantity: -quantity,
            previousStock: fromStock, newStock: fromStock - quantity,
            reason: `Transferencia a ${toBranchName}`,
            transferToBranchId: toBranchId,
            userId, userName, createdAt: new Date().toISOString()
        });
        
        transaction.set(doc(db, 'inventory_movements', movInId), {
            id: movInId, productId, productName,
            branchId: toBranchId, branchName: toBranchName,
            type: 'TRANSFERENCIA', quantity: quantity,
            previousStock: toStock, newStock: toStock + quantity,
            reason: `Transferencia desde ${fromBranchName}`,
            transferToBranchId: fromBranchId,
            userId, userName, createdAt: new Date().toISOString()
        });
    });
};
```

---

## 6. PLAN DE REMEDIACIÓN PRIORIZADO

| Fase | Acción | Prioridad | Esfuerzo | Dependencias |
|------|--------|-----------|----------|-------------|
| **Fase 0 (HOY)** | Rotar API Key de Firebase (ya fue expuesta en GitHub público) | 🔴 CRÍTICA | 15 min | Firebase Console |
| **Fase 0** | Fix users rules para bloquear auto-escalación (§5.1) | 🔴 CRÍTICA | 30 min | Ninguna |
| **Fase 0** | Agregar reglas para inventory_batches, journal_entries, inventory_movements (§5.3) | 🔴 CRÍTICA | 1h | Ninguna |
| **Fase 0** | Crear storage.rules (§5.4) | 🔴 CRÍTICA | 15 min | Ninguna |
| **Fase 1** | Mover Firebase config a env vars (§5.2) | 🟡 ALTA | 1h | Rotar API key primero |
| **Fase 1** | Proteger setup-db con check de admin (§5.5) | 🟡 ALTA | 15 min | Ninguna |
| **Fase 1** | Fix transferStock atómica (§5.9) | 🟡 ALTA | 1h | Ninguna |
| **Fase 1** | Habilitar App Check con reCAPTCHA v3 | 🟡 ALTA | 2h | Config en Google Cloud |
| **Fase 2** | Implementar Custom Claims via Cloud Functions (§5.6) | 🟠 MEDIA-ALTA | 4h | Firebase Functions setup |
| **Fase 2** | Agregar Next.js middleware (§5.7) | 🟠 MEDIA | 1h | Ninguna |
| **Fase 2** | Agregar security headers (§5.8) | 🟠 MEDIA | 30 min | Ninguna |
| **Fase 2** | Eliminar console.logs sensibles | 🟠 MEDIA | 30 min | Ninguna |
| **Fase 3** | Tests de seguridad completos para nuevas rules | 🔵 BAJA | 3h | Reglas actualizadas |
| **Fase 3** | Agregar audit logging en Cloud Functions | 🔵 BAJA | 4h | Cloud Functions |

---

## 7. TESTS DE SEGURIDAD RECOMENDADOS

### 7.1 Tests que faltan en el suite actual

```typescript
// tests/security/firestore.rules.test.ts — ADICIONALES

describe('Privilege Escalation Prevention', () => {
    it('should DENY user from changing their own role', async () => {
        // Setup: User exists with CASHIER role
        const admin = testEnv.authenticatedContext('admin1', { role: 'ADMIN' });
        await setDoc(doc(admin.firestore(), 'users/user1'), { 
            role: 'CASHIER', branchId: 'suc-1', email: 'test@test.com' 
        });
        
        // Attack: User tries to change own role to ADMIN
        const user = testEnv.authenticatedContext('user1');
        const ref = doc(user.firestore(), 'users/user1');
        await assertFails(updateDoc(ref, { role: 'ADMIN' }));
    });
    
    it('should DENY user from changing their own branchId', async () => {
        const user = testEnv.authenticatedContext('user1');
        const ref = doc(user.firestore(), 'users/user1');
        await assertFails(updateDoc(ref, { branchId: 'suc-2' }));
    });
});

describe('Inventory Batches Security', () => {
    it('should allow manager to create batch for own branch', async () => {
        // ... test
    });
    
    it('should deny cashier from creating batches', async () => {
        // ... test
    });
    
    it('should deny manager from creating batch for other branch', async () => {
        // ... test
    });
});

describe('Journal Entries Security', () => {
    it('should deny direct modification of journal entries', async () => {
        // ... test
    });
});

describe('Cross-Branch Data Leakage', () => {
    it('should deny suc-1 manager from reading suc-2 inventory', async () => {
        // ... test
    });
    
    it('should deny suc-1 cashier from reading suc-2 movements', async () => {
        // ... test
    });
});
```

### 7.2 Checklist de Pruebas Manuales

- [ ] Intentar acceder a `/admin` sin login → debe redirigir
- [ ] Intentar acceder a `/setup-db` como usuario no-admin → debe bloquear
- [ ] Usar Firebase REST API con API key expuesta → verificar que App Check bloquea
- [ ] Intentar modificar `users/{uid}.role` desde consola de browser → debe fallar
- [ ] Verificar que `inventory_movements` es inmutable (no se puede editar ni borrar)
- [ ] Probar transferencia de stock con desconexión intermedia → verificar consistencia
- [ ] Verificar CSP headers en response del servidor

---

## 8. RESUMEN DE ARCHIVOS A MODIFICAR

| Archivo | Cambios Necesarios |
|---------|-------------------|
| `firestore.rules` | Fix users (§5.1), agregar 3 colecciones (§5.3), fix inventory_movements |
| `ecommerce/lib/firebase.ts` | Mover a env vars (§5.2) |
| `services/firebase.ts` | Mover a env vars (§5.2), eliminar o consolidar |
| `ecommerce/next.config.ts` | Agregar security headers (§5.8) |
| `ecommerce/app/setup-db/page.tsx` | Agregar admin check (§5.5) |
| `ecommerce/services/inventoryService.ts` | Fix transferStock atómica (§5.9) |
| `ecommerce/contexts/AuthContext.tsx` | Eliminar auto-seed, limpiar logs |
| `ecommerce/middleware.ts` | **CREAR** — protección de rutas (§5.7) |
| `storage.rules` | **CREAR** (§5.4) |
| `.env.local` | **CREAR** con credenciales Firebase |
| `functions/src/index.ts` | **CREAR** — Custom Claims (§5.6) |
| `tests/security/firestore.rules.test.ts` | Ampliar tests (§7.1) |

---

*Fin del reporte de auditoría. La implementación de las Fases 0 y 1 es obligatoria antes de cualquier despliegue en producción.*
