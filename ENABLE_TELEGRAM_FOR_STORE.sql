-- Script para habilitar Telegram para una tienda específica
-- Reemplaza 'VENDOR_ID' con el ID de la tienda

-- Verificar estado actual
SELECT id, name, telegram_chat_id, telegram_enabled, notification_prefs
FROM vendors
WHERE id = 'f64fcf18-037f-47d8-b58a-9365cb62caf2';

-- Habilitar Telegram (si ya tiene chat_id)
UPDATE vendors
SET 
  telegram_enabled = true,
  notification_prefs = COALESCE(notification_prefs, '{}'::jsonb) || '{"newOrder": true, "lowStock": true, "support": true}'::jsonb
WHERE id = 'f64fcf18-037f-47d8-b58a-9365cb62caf2'
  AND telegram_chat_id IS NOT NULL;

-- Verificar que se actualizó
SELECT id, name, telegram_chat_id, telegram_enabled, notification_prefs
FROM vendors
WHERE id = 'f64fcf18-037f-47d8-b58a-9365cb62caf2';

