# Seguridad del Proyecto POS Tienda Zapatos

## 1. Plan de Rotación de API Keys

### 1.1 Keys a Rotar

| Key | Frecuencia de Rotación | Método de Rotación | Responsable |
|-----|----------------------|-------------------|-------------|
| `VITE_FIREBASE_API_KEY` | Cada 90 días o tras incidente | Regenerate en Firebase Console → Update .env → Deploy | Admin Firebase |
| `VITE_FIREBASE_APP_ID` | En caso de compromiso | Regenerate en Firebase Console → Update .env → Deploy | Admin Firebase |
| `VITE_GEMINI_API_KEY` | Cada 90 días | Regenerate en Google AI Studio → Update .env → Deploy | Admin Firebase |

### 1.2 Procedimiento de Rotación

1. **Generar nueva key** en el servicio correspondiente (Firebase Console / Google AI Studio)
2. **Actualizar `.env`** en el servidor de deployment (nunca en git)
3. **Redeploy** de la aplicación
4. **Revocar key anterior** (si el servicio lo permite)
5. **Verificar** que la aplicación funciona correctamente

### 1.3 Detección de Compromiso

- Monitorear uso anómalo en Firebase Console
- Revisar logs de errores 401/403
- Alertas de IP sospechosas

---

## 2. Firebase App Check

### 2.1 Configuración

Para activar App Check:

1. **ReCaptcha Enterprise** (para Web):
   - Crear key en Google Cloud Console
   - Configurar dominios permitidos
   - Agregar a `.env`: `VITE_RECAPTCHA_SITE_KEY`

2. **Activar App Check** en Firebase Console:
   - Project Settings → App Check → Register app
   - Seleccionar proveedor: reCAPTCHA Enterprise

3. **Instalar SDK**:
   ```bash
   npm install firebase @firebase/app-check
   ```

4. **Inicializar en código** (agregar a `services/firebase.ts`):

```typescript
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// App Check initialization (solo en producción)
if (import.meta.env.PROD) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
}
```

### 2.2 Enforcement

Activar **Enforcement** en Firebase Console:
- Firestore Database → App Check → Enforcement → ON
- Storage → App Check → Enforcement → ON
- Realtime Database → App Check → Enforcement → ON (si se usa)

### 2.3 Debug Token (solo desarrollo)

```bash
# Agregar a .env.local (nunca commitear)
FIREBASE_APP_CHECK_DEBUG_TOKEN=your_debug_token_from_console
```

---

## 3. Threat Model

### 3.1 Superficie de Ataque

| Componente | Vectores de Amenaza | Mitigación Actual |
|------------|-------------------|-------------------|
| Firebase Auth | Credential stuffing, brute force | Firebase Auth maneja rate limiting |
| Firestore | Data exfiltration, unauthorized access | Security Rules con RBAC |
| API Keys | Extraction from client code | Restricted to domains in Firebase Console |
| Client App | XSS, localStorage access | Input validation, no sensitive data in localStorage |
| Network | MITM, replay attacks | HTTPS enforced, Firebase handles TLS |

### 3.2 Escenarios de Amenaza

#### T1: Exfiltración de datos por usuario malicioso
- **Impacto**: Alto
- **Probabilidad**: Media
- **Mitigación**: 
  - Branch isolation en Firestore Rules
  - Solo datos de branch asignada visibles para usuarios no-admin

#### T2: Escalamiento de privilegios
- **Impacto**: Crítico
- **Probabilidad**: Baja
- **Mitigación**:
  - RBAC estricto: CASHIER < MANAGER < ADMIN
  - Validación de roles en Firestore Rules
  - Solo ADMIN puede modificar roles

#### T3: Modificación de transacciones históricas
- **Impacto**: Alto
- **Probabilidad**: Media
- **Mitigación**:
  - Solo MANAGER+ puede update/delete
  - Validación de branchId no modificable
  - Audit logs (pendiente de implementar)

#### T4: Exposición de API keys
- **Impacto**: Medio
- **Probabilidad**: Media
- **Mitigación**:
  - Variables de entorno (no en código)
  - Domain restriction en Firebase Console
  - Rotación periódica

#### T5: Ataque de fuerza bruta a credenciales
- **Impacto**: Medio
- **Probabilidad**: Baja
- **Mitigación**:
  - Firebase Auth rate limiting
  - Recomendado: Activar reCAPTCHA en login

### 3.3 Controles de Seguridad Implementados

✅ **Authentication**: Firebase Auth con email/password
✅ **Authorization**: Firestore Security Rules con RBAC
✅ **Data Validation**: Schema validation en Rules
✅ **Branch Isolation**: Solo datos de branch asignada
✅ **Audit**: `createdBy` field en transacciones
✅ **Transport**: HTTPS/TLS por Firebase
🔄 **App Check**: Configuración pendiente (sección 2)
🔄 **Audit Logging**: Estructura creada, implementación pendiente

---

## 4. Firebase Emulator Setup

### 4.1 Instalación

```bash
npm install -g firebase-tools
firebase login
firebase init emulators
```

### 4.2 Configuración (`firebase.json`)

```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": true,
      "port": 4000
    },
    "singleProjectMode": true
  }
}
```

### 4.3 Scripts (`package.json`)

```json
{
  "scripts": {
    "emulators:start": "firebase emulators:start",
    "emulators:exec": "firebase emulators:exec",
    "test:rules": "firebase emulators:exec --only firestore 'npm run test:security'"
  }
}
```

### 4.4 Variables de entorno para desarrollo

```bash
# .env.local
VITE_FIREBASE_API_KEY=fake-api-key-for-testing
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_PROJECT_ID=pos-tienda-zapatos-demo
VITE_FIREBASE_STORAGE_BUCKET=localhost
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_USE_EMULATOR=true
```

### 4.5 Configuración del emulador en código

```typescript
// services/firebase.ts
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

---

## 5. Checklist de Seguridad Pre-Deploy

- [ ] Variables de entorno configuradas (no hardcodeadas)
- [ ] Firestore Rules actualizadas y desplegadas
- [ ] Firebase App Check configurado (PROD)
- [ ] API Keys con domain restriction
- [ ] reCAPTCHA activado en forms públicos
- [ ] HTTPS enforcement activado
- [ ] Audit logs implementados
- [ ] Pruebas de seguridad pasadas
- [ ] Plan de rotación de keys definido
- [ ] Documento de threat model actualizado

---

## 6. Referencias

- [Firebase Security Rules Reference](https://firebase.google.com/docs/rules)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Checklist](https://firebase.google.com/support/guides/security-checklist)
