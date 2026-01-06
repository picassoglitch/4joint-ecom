# Configuración de Notificaciones de Telegram

Este documento explica cómo configurar el sistema de notificaciones de Telegram para todas las tiendas usando un solo bot.

## Requisitos

1. **Bot de Telegram**: Ya configurado
   - **Bot Username**: `@orders4jointbot`
   - **Bot Token**: `8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU`
   - **URL del Bot**: `https://t.me/orders4jointbot`

2. **Variables de Entorno**: Configurar en `.env.local` y producción

## Variables de Entorno

**⚠️ IMPORTANTE**: Agrega estas variables a tu archivo `.env.local` en la **raíz del proyecto**:

```env
# Telegram Bot Configuration
# UN SOLO BOT para todas las tiendas - cada tienda se conecta automáticamente
TELEGRAM_BOT_TOKEN=8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU
TELEGRAM_BOT_USERNAME=orders4jointbot

# Optional: Webhook secret token for additional security
TELEGRAM_WEBHOOK_SECRET=your-secret-token-here
```

**📝 Nota**: 
- **NO necesitas** crear bots individuales para cada tienda
- **NO necesitas** el `TELEGRAM_CHAT_ID` global (ese era para el sistema antiguo)
- Cada tienda tiene su propio `chat_id` guardado automáticamente cuando se conecta

**Para producción (Vercel)**:
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega las mismas variables:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_BOT_USERNAME`
   - `TELEGRAM_WEBHOOK_SECRET` (opcional)

## Configuración del Webhook de Telegram

### Paso 1: Ejecutar la Migración SQL

Ejecuta la migración en Supabase SQL Editor:

```sql
-- Ver archivo: supabase/migration_telegram_notifications.sql
```

O copia y pega el contenido completo del archivo `supabase/migration_telegram_notifications.sql` en el editor SQL de Supabase y ejecútalo.

### Paso 2: Configurar el Webhook en Producción

Una vez que tu aplicación esté desplegada en producción, configura el webhook de Telegram:

**Opción A: Usando curl (recomendado)**

```bash
curl -X POST "https://api.telegram.org/bot8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://tu-dominio.com/api/integrations/telegram/webhook",
    "secret_token": "tu-secret-token-aqui"
  }'
```

**Opción B: Usando el navegador**

Visita esta URL (reemplaza `tu-dominio.com` con tu dominio real):

```
https://api.telegram.org/bot8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU/setWebhook?url=https://tu-dominio.com/api/integrations/telegram/webhook&secret_token=tu-secret-token-aqui
```

**Opción C: Usando BotFather**

1. Abre Telegram y busca `@BotFather`
2. Envía `/setwebhook`
3. Selecciona tu bot (`@orders4jointbot`)
4. Envía la URL: `https://tu-dominio.com/api/integrations/telegram/webhook`
5. Si configuraste `TELEGRAM_WEBHOOK_SECRET`, envíalo como secret token

### Paso 3: Verificar el Webhook

Para verificar que el webhook está configurado correctamente:

```bash
curl "https://api.telegram.org/bot8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU/getWebhookInfo"
```

O visita esta URL en tu navegador:
```
https://api.telegram.org/bot8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU/getWebhookInfo
```

Deberías ver algo como:
```json
{
  "ok": true,
  "result": {
    "url": "https://tu-dominio.com/api/integrations/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

## Cómo Funciona

### 1. Conectar una Tienda a Telegram

1. El dueño de la tienda va a **Store Settings** → **Notificaciones de Telegram**
2. Hace clic en **"Conectar Telegram"**
3. Se genera un token único de conexión (válido por 24 horas)
4. Se abre Telegram con un deep link: `https://t.me/orders4jointbot?start=<token>`
5. El usuario presiona "Start" en el bot
6. El webhook recibe el mensaje `/start <token>`
7. El sistema valida el token y guarda el `chat_id` en la base de datos
8. La tienda queda conectada

### 2. Enviar Notificaciones

Cuando ocurre un evento (nueva orden, bajo stock, etc.):

1. El sistema llama a `sendTelegramNotification(storeId, message, type)`
2. El servicio verifica:
   - Si Telegram está habilitado para la tienda
   - Si hay un `chat_id` guardado
   - Si el tipo de notificación está permitido en las preferencias
3. Si todo está bien, envía el mensaje vía API de Telegram
4. Registra el intento en `telegram_notification_logs`

### 3. Tipos de Notificaciones

- **newOrder**: Nueva orden recibida
- **lowStock**: Producto con bajo stock
- **support**: Mensajes de soporte
- **test**: Notificación de prueba (desde la UI)

## Uso en el Código

### Enviar una Notificación

```javascript
import { sendTelegramNotification, formatOrderNotification } from '@/lib/services/telegram'

// Ejemplo: Notificar nueva orden
const message = formatOrderNotification(order, orderItems)
await sendTelegramNotification(storeId, message, 'newOrder')

// Ejemplo: Notificación personalizada
await sendTelegramNotification(storeId, 'Mensaje personalizado', 'general')
```

### Verificar Estado de Conexión

```javascript
const { data: store } = await supabase
  .from('vendors')
  .select('telegram_chat_id, telegram_enabled')
  .eq('id', storeId)
  .single()

if (store?.telegram_chat_id && store?.telegram_enabled) {
  // Telegram está conectado y habilitado
}
```

## Seguridad

1. **Tokens de Conexión**:
   - Se generan con `crypto.randomBytes(32)`
   - Expiran después de 24 horas
   - Se marcan como usados después de la primera conexión
   - Solo el dueño de la tienda puede generar tokens

2. **Webhook**:
   - Opcionalmente verifica `TELEGRAM_WEBHOOK_SECRET`
   - Siempre devuelve `{ ok: true }` para evitar que Telegram reintente

3. **Rate Limiting**:
   - Los logs de notificaciones permiten monitorear el uso
   - Considera implementar rate limiting por tienda si es necesario

## Solución de Problemas

### El webhook no recibe mensajes

1. Verifica que el webhook esté configurado: `getWebhookInfo`
2. Verifica que la URL sea accesible públicamente (no localhost)
3. Revisa los logs del servidor para errores
4. Verifica que `TELEGRAM_BOT_TOKEN` esté correcto

### Las notificaciones no se envían

1. Verifica que la tienda esté conectada (`telegram_chat_id` no es null)
2. Verifica que `telegram_enabled` sea `true`
3. Revisa `telegram_notification_logs` para ver errores
4. Verifica que el bot no haya sido bloqueado por el usuario

### Error: "Token inválido o ya utilizado"

- Los tokens solo se pueden usar una vez
- Los tokens expiran después de 24 horas
- Genera un nuevo enlace de conexión desde Store Settings

## Estructura de la Base de Datos

### Tabla: `vendors` (campos agregados)

- `telegram_username` (VARCHAR, opcional): Username de Telegram
- `telegram_chat_id` (VARCHAR, nullable): Chat ID almacenado después de conectar
- `telegram_enabled` (BOOLEAN): Si las notificaciones están habilitadas
- `notification_prefs` (JSONB): Preferencias de notificaciones

### Tabla: `telegram_connect_tokens`

- `id` (UUID): ID único
- `store_id` (UUID): ID de la tienda
- `token` (VARCHAR): Token único de conexión
- `expires_at` (TIMESTAMP): Fecha de expiración
- `used_at` (TIMESTAMP, nullable): Fecha de uso
- `created_at` (TIMESTAMP): Fecha de creación
- `created_by` (UUID): Usuario que creó el token

### Tabla: `telegram_notification_logs`

- `id` (UUID): ID único
- `store_id` (UUID): ID de la tienda
- `chat_id` (VARCHAR): Chat ID al que se envió
- `message_text` (TEXT): Texto del mensaje
- `notification_type` (VARCHAR): Tipo de notificación
- `success` (BOOLEAN): Si se envió exitosamente
- `error_message` (TEXT, nullable): Mensaje de error si falló
- `telegram_response` (JSONB): Respuesta de la API de Telegram
- `created_at` (TIMESTAMP): Fecha de envío

## Próximos Pasos

1. Ejecutar la migración SQL en Supabase
2. Configurar variables de entorno
3. Configurar el webhook en producción
4. Probar la conexión desde una tienda
5. Verificar que las notificaciones se envíen correctamente

