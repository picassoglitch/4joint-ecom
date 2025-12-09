-- Script para actualizar el rol de tu usuario específico
-- Ejecuta esto en SQL Editor de Supabase
-- Copia y pega todo este bloque y ejecuta

-- Paso 1: Actualizar tu usuario a admin
-- Esto preserva email_verified y solo agrega/actualiza el campo 'role'
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE id = '9fd46906-d579-487e-8b7d-0aed6c8fc540'::uuid;

-- Paso 2: Verificar que se actualizó correctamente
SELECT 
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data
FROM auth.users
WHERE id = '9fd46906-d579-487e-8b7d-0aed6c8fc540'::uuid;

-- Resultado esperado:
-- email: picassoglitch@gmail.com
-- role: admin
-- raw_user_meta_data: {"email_verified": true, "role": "admin"}

