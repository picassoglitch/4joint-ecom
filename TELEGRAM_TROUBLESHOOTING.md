# Solución de Problemas de Notificaciones de Telegram

## Problema: No Recibo Notificaciones

### Verificación Paso a Paso

1. **Verifica que la tienda esté conectada a Telegram:**
   - Ve a **Store Settings** → **Notificaciones de Telegram**
   - Debe mostrar "Telegram Conectado" (no el botón "Conectar Telegram")
   - Si no está conectado, haz clic en "Conectar Telegram" y sigue los pasos

2. **Verifica en la Base de Datos:**
   ```sql
   SELECT id, name, telegram_chat_id, telegram_enabled, notification_prefs
   FROM vendors
   WHERE id = 'TU_VENDOR_ID';
   ```
   
   Debe mostrar:
   - `telegram_chat_id`: Un número (ej: `123456789`)
   - `telegram_enabled`: `true`
   - `notification_prefs`: JSON con `{"newOrder": true, ...}`

3. **Verifica los Logs del Servidor:**
   
   Cuando se crea una orden, deberías ver en los logs:
   ```
   📬 Notification request received - Order: xxx, Vendor: yyy
   📱 Attempting to send Telegram notification to vendor: yyy
   🔍 Looking up store yyy for Telegram notification
   📦 Store found: Nombre Tienda (yyy)
      - telegram_enabled: true
      - telegram_chat_id: SET
   📤 Sending Telegram message to chat_id: 123456789 for store: Nombre Tienda
   ✅ Telegram message sent successfully to store yyy (Nombre Tienda)
   ```

4. **Verifica los Logs de Notificaciones:**
   ```sql
   SELECT * FROM telegram_notification_logs
   WHERE store_id = 'TU_VENDOR_ID'
   ORDER BY created_at DESC
   LIMIT 10;
   ```
   
   Esto te mostrará:
   - Si se intentó enviar la notificación
   - Si fue exitosa (`success: true`)
   - El error si falló (`error_message`)

### Problemas Comunes

#### 1. "Store not connected to Telegram"
**Causa**: La tienda no tiene `telegram_chat_id` guardado.

**Solución**:
- Ve a Store Settings → Notificaciones de Telegram
- Haz clic en "Conectar Telegram"
- Abre Telegram y presiona "Start" en el bot
- Verifica que recibas el mensaje de confirmación

#### 2. "Telegram notifications disabled for this store"
**Causa**: `telegram_enabled` es `false` en la base de datos.

**Solución**:
```sql
UPDATE vendors
SET telegram_enabled = true
WHERE id = 'TU_VENDOR_ID';
```

O reconecta Telegram desde Store Settings.

#### 3. "Notification type newOrder is disabled"
**Causa**: Las preferencias de notificación tienen `newOrder: false`.

**Solución**:
```sql
UPDATE vendors
SET notification_prefs = jsonb_set(
  notification_prefs,
  '{newOrder}',
  'true'
)
WHERE id = 'TU_VENDOR_ID';
```

#### 4. "Telegram API error: Chat not found"
**Causa**: El usuario bloqueó el bot o el `chat_id` es incorrecto.

**Solución**:
- Desconecta Telegram desde Store Settings
- Reconecta Telegram (esto generará un nuevo `chat_id`)

#### 5. No aparece nada en los logs
**Causa**: El endpoint `/api/notify-vendor` no se está llamando o falla silenciosamente.

**Solución**:
- Verifica que `order.vendor_id` esté correcto cuando se crea la orden
- Revisa la consola del navegador para errores de red
- Verifica que el servidor esté corriendo y accesible

### Verificar que Cada Tienda Recibe Solo Sus Notificaciones

El sistema está diseñado para que cada tienda tenga su propio `telegram_chat_id` único:

1. **Cada tienda se conecta individualmente:**
   - Cada dueño de tienda genera su propio token de conexión
   - El token es único y solo funciona para esa tienda
   - Cuando se conecta, se guarda el `chat_id` específico de esa conversación

2. **Las notificaciones usan el `chat_id` correcto:**
   - Cuando se crea una orden, se identifica el `vendor_id`
   - Se busca el `telegram_chat_id` de ese `vendor_id` específico
   - Se envía el mensaje solo a ese `chat_id`

3. **Verificación:**
   ```sql
   -- Ver todas las tiendas conectadas
   SELECT id, name, telegram_chat_id, telegram_enabled
   FROM vendors
   WHERE telegram_chat_id IS NOT NULL;
   
   -- Verificar que cada chat_id es único
   SELECT telegram_chat_id, COUNT(*) as count
   FROM vendors
   WHERE telegram_chat_id IS NOT NULL
   GROUP BY telegram_chat_id
   HAVING COUNT(*) > 1;
   -- Si esto devuelve resultados, hay un problema (no debería pasar)
   ```

### Testing Manual

1. **Probar notificación de prueba:**
   - Ve a Store Settings → Notificaciones de Telegram
   - Haz clic en "Enviar Notificación de Prueba"
   - Deberías recibir un mensaje en Telegram

2. **Crear una orden de prueba:**
   - Crea una orden desde el frontend
   - Revisa los logs del servidor
   - Verifica que se llame a `/api/notify-vendor`
   - Revisa `telegram_notification_logs` en la base de datos

### Configuración para Múltiples Tiendas

El sistema ya está diseñado para múltiples tiendas:

- ✅ Cada tienda tiene su propio `telegram_chat_id`
- ✅ Las notificaciones se envían solo al `chat_id` de la tienda correspondiente
- ✅ No hay cruce de mensajes entre tiendas
- ✅ Cada tienda puede habilitar/deshabilitar notificaciones independientemente

### Configuración Manual para Admin

Si necesitas configurar Telegram manualmente para una tienda:

```sql
-- Conectar una tienda manualmente (requiere obtener el chat_id primero)
UPDATE vendors
SET 
  telegram_chat_id = '123456789',  -- Reemplaza con el chat_id real
  telegram_enabled = true,
  notification_prefs = '{"newOrder": true, "lowStock": true, "support": true}'::jsonb
WHERE id = 'VENDOR_ID';
```

**Para obtener el chat_id:**
1. El dueño de la tienda debe iniciar conversación con el bot
2. Visita: `https://api.telegram.org/bot8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU/getUpdates`
3. Busca el mensaje del usuario y copia el `chat.id`
4. Úsalo en el UPDATE anterior

### Logs Detallados

Ahora el sistema tiene logging detallado. Revisa los logs del servidor para ver:
- ✅ Si se recibió la solicitud de notificación
- ✅ Si se encontró la tienda
- ✅ Si Telegram está habilitado
- ✅ Si se envió el mensaje exitosamente
- ❌ Cualquier error que ocurra

