# Implementación de Seguridad y Custom Claims

Hemos actualizado las reglas de seguridad (`firestore.rules`) para usar **Custom Claims** en lugar de lecturas de base de datos. Esto reduce drásticamente los costos y mejora la latencia, además de eliminar vulnerabilidades de seguridad (como el wildcard abierto).

## Pasos Requeridos para Producción

### 1. Configurar Service Account
Para que los scripts de administración funcionen, necesitas la llave de cuenta de servicio de Firebase.
1. Ve a [Firebase Console > Project Settings > Service Accounts](https://console.firebase.google.com/).
2. Genera una nueva **Private Key**.
3. Guarda el archivo JSON en una ubicación segura (NO en la carpeta pública del proyecto ni en git). Ejemplo: `C:\keys\service-account.json`.

### 2. Sincronizar Claims (Roles y Sucursales)
Como ahora las reglas de seguridad dependen de que el usuario tenga su rol y sucursal "pegados" a su token de autenticación (Auth Token), debes correr este script cada vez que cambies el rol de un usuario o crees uno nuevo.

**Comando en PowerShell:**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\a\tu\service-account.json"
node scripts/set-custom-claims.cjs
```

Este script:
1. Lee todos los usuarios de la colección `users` en Firestore.
2. Toma su `role` y `branchId`.
3. Inyecta estos datos en el sistema de Authentication de Firebase.

### 3. Verificar en Frontend
Los usuarios existentes deberán **Cerrar Sesión e Iniciar Sesión** nuevamente para recibir el nuevo token con los permisos actualizados.

## Cambios en Reglas
- **Eliminado**: `match /{document=**}` (Fallback inseguro).
- **Optimizado**: `getUserData()` y `hasRole()` ahora leen `request.auth.token` (Costo $0/lectura) en lugar de `get()` (Costo $1/lectura).
- **FIFO & Batch**: Se mantienen las reglas para `inventory_batches` necesarias para el costeo FIFO.
