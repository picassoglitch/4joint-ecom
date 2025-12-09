-- Script para actualizar el rol de un usuario
-- Reemplaza 'USER_ID_AQUI' con el ID del usuario
-- Reemplaza 'admin' con el rol deseado: 'user', 'vendor', o 'admin'

-- Opción 1: Actualización directa (RECOMENDADO - más simple y siempre funciona)
-- Este SQL preserva todos los campos existentes en raw_user_meta_data y solo agrega/actualiza el campo 'role'
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE id = '9fd46906-d579-487e-8b7d-0aed6c8fc540'::uuid;

-- Opción 2: Si quieres usar la función helper (primero debes crearla)
-- Primero ejecuta la función del schema.sql, luego:
-- SELECT update_user_role('9fd46906-d579-487e-8b7d-0aed6c8fc540'::uuid, 'admin'::text);

-- Verificar el cambio (ejecuta esto después del UPDATE)
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data
FROM auth.users
WHERE id = '9fd46906-d579-487e-8b7d-0aed6c8fc540'::uuid;

-- Deberías ver en los resultados:
-- role: "admin"
-- raw_user_meta_data: {"email_verified": true, "role": "admin"}

