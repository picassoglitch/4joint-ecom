# 📱 Cómo Conectar Telegram - Paso a Paso

## ⚠️ IMPORTANTE: No uses `/start` directamente

Si haces `/start` directamente en Telegram **NO funcionará**. Debes seguir estos pasos:

## ✅ Pasos Correctos

### 1. Ve a Store Settings
- Inicia sesión como vendedor
- Ve a **Store Settings** (Configuración de Tienda)

### 2. Busca "Notificaciones de Telegram"
- Desplázate hasta la sección **"Notificaciones de Telegram"**
- Deberías ver un botón azul/verde que dice **"Conectar Telegram"**

### 3. Haz clic en "Conectar Telegram"
- Se abrirá una nueva pestaña/ventana con Telegram
- La URL será algo como: `https://t.me/orders4jointbot?start=abc123def456...`
- **⚠️ IMPORTANTE**: El enlace incluye un token único (`abc123def456...`)

### 4. Presiona "Start" en Telegram
- Cuando se abra Telegram, verás el bot `@orders4jointbot`
- Presiona el botón **"START BOT"** o **"Iniciar"**
- Esto enviará `/start abc123def456...` (con el token)

### 5. Espera el mensaje de confirmación
- Deberías recibir un mensaje que dice:
  ```
  ✅ 4Joint conectado. Ya recibirás notificaciones de [Nombre de tu tienda].
  
  Ahora recibirás notificaciones cuando:
  • Se cree una nueva orden
  • Haya productos con bajo stock
  • Recibas mensajes de soporte
  ```

### 6. Verifica en Store Settings
- Regresa a Store Settings
- Deberías ver un mensaje verde que dice **"Telegram Conectado"**
- Ya no deberías ver el botón "Conectar Telegram"

## ❌ Qué NO Hacer

### NO hagas esto:
1. ❌ Abrir Telegram directamente
2. ❌ Buscar `@orders4jointbot` manualmente
3. ❌ Escribir `/start` sin el token
4. ❌ Usar un enlace viejo o compartido

### Por qué no funciona:
- El sistema necesita un **token único** generado para tu tienda
- El token solo se genera cuando haces clic en "Conectar Telegram" desde Store Settings
- El token expira después de 24 horas
- Cada token solo se puede usar una vez

## 🔍 Verificar que Está Conectado

### Opción 1: Desde Store Settings
- Debe mostrar "Telegram Conectado" (no el botón de conectar)

### Opción 2: Desde Supabase
```sql
SELECT id, name, telegram_chat_id, telegram_enabled
FROM vendors
WHERE id = 'TU_VENDOR_ID';
```

Debe mostrar:
- `telegram_chat_id`: Un número (ej: `123456789`)
- `telegram_enabled`: `true`

### Opción 3: Probar Notificación
- Haz clic en **"Enviar Notificación de Prueba"** en Store Settings
- Deberías recibir un mensaje en Telegram

## 🐛 Si No Funciona

### Problema: El botón "Conectar Telegram" no hace nada
**Solución**: 
- Verifica que estés en la página correcta (Store Settings)
- Recarga la página
- Verifica la consola del navegador para errores

### Problema: Se abre Telegram pero no pasa nada
**Solución**:
- Asegúrate de presionar "START BOT" o "Iniciar" en Telegram
- No solo escribas `/start` manualmente
- El enlace debe incluir `?start=...` con un token

### Problema: Recibo "Token inválido o ya utilizado"
**Solución**:
- El token expiró (24 horas) o ya se usó
- Genera un nuevo enlace desde Store Settings
- Haz clic en "Conectar Telegram" de nuevo

### Problema: Recibo "Token ha expirado"
**Solución**:
- Los tokens expiran después de 24 horas
- Genera un nuevo enlace desde Store Settings

## 📝 Notas Técnicas

- El token se genera cuando haces clic en "Conectar Telegram"
- El token es único para cada tienda
- El token se guarda en la tabla `telegram_connect_tokens`
- Cuando presionas "Start" con el token, el webhook:
  1. Valida el token
  2. Guarda tu `chat_id` en la tabla `vendors`
  3. Establece `telegram_enabled = true`
  4. Marca el token como usado

## 🎯 Resumen

**Para conectar Telegram:**
1. Store Settings → Notificaciones de Telegram
2. Clic en "Conectar Telegram" (genera token)
3. Se abre Telegram con el enlace especial
4. Presionar "Start" en Telegram (envía token)
5. ✅ Conectado

**NO funciona:**
- Abrir Telegram directamente
- Escribir `/start` sin token
- Usar enlaces viejos

