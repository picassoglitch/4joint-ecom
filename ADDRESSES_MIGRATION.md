# Migración de Tabla de Direcciones

## Problema

Si ves errores como:
- `404 (Not Found)` al intentar guardar direcciones
- `Could not find the table 'public.addresses' in the schema cache`
- `PGRST205` error code

Significa que la tabla `addresses` no existe en tu base de datos de Supabase.

## Solución

Ejecuta la migración SQL en Supabase para crear la tabla de direcciones.

### Pasos:

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
   - Navega a **SQL Editor**

2. **Ejecuta la Migración**
   - Abre el archivo `supabase/migration_addresses.sql`
   - Copia todo el contenido del archivo
   - Pega el SQL en el SQL Editor de Supabase
   - Haz clic en **Run** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

3. **Verifica la Migración**
   - Ve a **Table Editor** en Supabase
   - Deberías ver la tabla `addresses` en la lista
   - La tabla debe tener las siguientes columnas:
     - `id` (UUID, Primary Key)
     - `user_id` (UUID, Foreign Key to auth.users)
     - `name` (VARCHAR)
     - `email` (VARCHAR)
     - `street` (VARCHAR)
     - `city` (VARCHAR)
     - `state` (VARCHAR)
     - `zip` (VARCHAR)
     - `country` (VARCHAR)
     - `phone` (VARCHAR)
     - `references_text` (TEXT)
     - `is_default` (BOOLEAN)
     - `created_at` (TIMESTAMP)
     - `updated_at` (TIMESTAMP)

## ¿Qué hace esta migración?

1. **Crea la tabla `addresses`** con todas las columnas necesarias
2. **Habilita Row Level Security (RLS)** para proteger los datos
3. **Crea políticas RLS** que permiten:
   - Usuarios pueden leer sus propias direcciones
   - Usuarios pueden insertar sus propias direcciones
   - Usuarios pueden actualizar sus propias direcciones
   - Usuarios pueden eliminar sus propias direcciones
4. **Crea un índice** en `user_id` para búsquedas más rápidas
5. **Crea un trigger** para actualizar automáticamente `updated_at`

## Nota Importante

- **Los usuarios invitados (guest)** NO pueden guardar direcciones - esto es intencional
- **Solo usuarios registrados** pueden guardar direcciones en su cuenta
- Si la tabla no existe, el checkout seguirá funcionando, pero las direcciones no se guardarán para futuras compras

## Después de Ejecutar la Migración

Una vez ejecutada la migración:
- Los usuarios registrados podrán guardar direcciones
- Las direcciones se guardarán automáticamente después de completar una orden
- Los usuarios podrán seleccionar direcciones guardadas en futuras compras

## Solución de Problemas

### Error: "relation already exists"
- La tabla ya existe, no necesitas ejecutar la migración de nuevo
- Verifica que la tabla tenga todas las columnas necesarias

### Error: "permission denied"
- Asegúrate de estar usando el SQL Editor con permisos de administrador
- Verifica que tu usuario tenga permisos para crear tablas

### Error: "function uuid_generate_v4() does not exist"
- Ejecuta primero: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
- Luego ejecuta la migración nuevamente

