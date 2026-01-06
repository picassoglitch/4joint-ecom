# 🔧 Solucionar: Telegram Notifications Disabled

## Problema

Los logs muestran:
```
⚠️ Telegram notifications disabled for store xxx (Nombre Tienda)
❌ Telegram notification failed: Telegram notifications disabled for this store
```

## Solución Rápida

### Opción 1: Desde Store Settings (Recomendado)

1. Ve a **Store Settings** → **Notificaciones de Telegram**
2. Si muestra "Telegram Conectado", haz clic en **"Desconectar"**
3. Luego haz clic en **"Conectar Telegram"** de nuevo
4. Abre Telegram y presiona **"Start"**
5. ✅ Esto habilitará `telegram_enabled = true` automáticamente

### Opción 2: Desde Supabase SQL (Manual)

Ejecuta este SQL en Supabase SQL Editor (reemplaza `VENDOR_ID` con el ID de tu tienda):

```sql
-- Habilitar Telegram para una tienda específica
UPDATE vendors
SET 
  telegram_enabled = true,
  notification_prefs = COALESCE(notification_prefs, '{}'::jsonb) || '{"newOrder": true, "lowStock": true, "support": true}'::jsonb
WHERE id = 'VENDOR_ID'
  AND telegram_chat_id IS NOT NULL;
```

**Para la tienda "GreenBoy" (ID: f64fcf18-037f-47d8-b58a-9365cb62caf2):**

```sql
UPDATE vendors
SET 
  telegram_enabled = true,
  notification_prefs = COALESCE(notification_prefs, '{}'::jsonb) || '{"newOrder": true, "lowStock": true, "support": true}'::jsonb
WHERE id = 'f64fcf18-037f-47d8-b58a-9365cb62caf2'
  AND telegram_chat_id IS NOT NULL;
```

### Opción 3: Habilitar para TODAS las tiendas conectadas

```sql
-- Habilitar Telegram para todas las tiendas que tienen chat_id
UPDATE vendors
SET 
  telegram_enabled = true,
  notification_prefs = COALESCE(notification_prefs, '{}'::jsonb) || '{"newOrder": true, "lowStock": true, "support": true}'::jsonb
WHERE telegram_chat_id IS NOT NULL
  AND telegram_enabled = false;
```

## Verificar

Después de ejecutar el UPDATE, verifica:

```sql
SELECT id, name, telegram_chat_id, telegram_enabled, notification_prefs
FROM vendors
WHERE id = 'VENDOR_ID';
```

Debe mostrar:
- `telegram_chat_id`: Un número (no NULL)
- `telegram_enabled`: `true`
- `notification_prefs`: `{"newOrder": true, ...}`

## Prevenir en el Futuro

El webhook ya está configurado para establecer `telegram_enabled = true` automáticamente cuando una tienda se conecta. Si esto no sucede, puede ser porque:

1. El webhook no está configurado en producción
2. La conexión se hizo antes de que el webhook funcionara
3. Alguien lo deshabilitó manualmente

**Solución**: Siempre reconecta desde Store Settings para asegurar que todo esté configurado correctamente.

