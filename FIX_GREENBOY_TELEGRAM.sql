-- ============================================
-- HABILITAR TELEGRAM PARA TIENDA GREENBOY
-- ============================================
-- Ejecuta esto en Supabase SQL Editor

-- Paso 1: Verificar estado actual
SELECT 
  id, 
  name, 
  telegram_chat_id, 
  telegram_enabled, 
  notification_prefs
FROM vendors
WHERE id = 'f64fcf18-037f-47d8-b58a-9365cb62caf2';

-- Paso 2: Obtener chat_id desde los mensajes de Telegram
-- Si no tienes chat_id, primero necesitas conectar desde Store Settings
-- O visita: https://api.telegram.org/bot8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU/getUpdates
-- Busca tu mensaje y copia el chat.id

-- Paso 3: Habilitar Telegram
-- OPCIÓN A: Si ya tienes chat_id, solo habilita:
UPDATE vendors
SET 
  telegram_enabled = true,
  notification_prefs = COALESCE(notification_prefs, '{}'::jsonb) || '{"newOrder": true, "lowStock": true, "support": true}'::jsonb
WHERE id = 'f64fcf18-037f-47d8-b58a-9365cb62caf2'
  AND telegram_chat_id IS NOT NULL;

-- OPCIÓN B: Si necesitas establecer chat_id manualmente (reemplaza 123456789 con tu chat_id real):
-- UPDATE vendors
-- SET 
--   telegram_chat_id = '123456789',  -- Reemplaza con tu chat_id
--   telegram_enabled = true,
--   notification_prefs = '{"newOrder": true, "lowStock": true, "support": true}'::jsonb
-- WHERE id = 'f64fcf18-037f-47d8-b58a-9365cb62caf2';

-- Paso 4: Verificar que se actualizó
SELECT 
  id, 
  name, 
  telegram_chat_id, 
  telegram_enabled, 
  notification_prefs
FROM vendors
WHERE id = 'f64fcf18-037f-47d8-b58a-9365cb62caf2';

