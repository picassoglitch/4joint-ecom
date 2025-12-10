# Instrucciones para Ejecutar la Migración de Cupones

## ⚠️ Error: "La tabla de cupones no existe"

Si estás viendo este error, significa que necesitas ejecutar la migración SQL en Supabase.

## Pasos para Ejecutar la Migración

### Opción 1: Ejecutar Migración Completa (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor** en el menú lateral
3. Haz clic en **New Query**
4. Abre el archivo `supabase/migration_advanced_coupons.sql` desde tu proyecto
5. Copia **TODO** el contenido del archivo
6. Pégalo en el SQL Editor de Supabase
7. Haz clic en **Run** o presiona `Ctrl + Enter`
8. Espera a que se complete la ejecución

### Opción 2: Ejecutar por Partes (Si la opción 1 falla)

Si encuentras errores ejecutando todo de una vez, ejecuta los archivos en este orden:

1. **Primero:** `supabase/migration_advanced_coupons_simple.sql`
   - Solo crea la tabla básica

2. **Segundo:** `supabase/migration_advanced_coupons_part2.sql`
   - Agrega foreign keys e índices

3. **Tercero:** `supabase/migration_advanced_coupons_part3.sql`
   - Configura Row Level Security (RLS)

4. **Cuarto:** `supabase/migration_advanced_coupons_part4.sql`
   - Agrega triggers y comentarios

## Verificación

Después de ejecutar la migración, verifica que la tabla se creó correctamente:

1. Ve a **Table Editor** en Supabase
2. Deberías ver la tabla `coupons` en la lista
3. La tabla debe tener las siguientes columnas:
   - `code` (VARCHAR, Primary Key)
   - `description` (TEXT)
   - `type` (VARCHAR)
   - `discount_value` (DECIMAL)
   - Y otras columnas según la migración

## Solución de Problemas

### Error: "relation already exists"
- La tabla ya existe. Puedes continuar o eliminar la tabla primero si quieres recrearla.

### Error: "function does not exist"
- Ejecuta primero `migration_advanced_coupons_part4.sql` que crea la función `update_updated_at_column()`

### Error: "products table does not exist"
- Esto es normal si aún no tienes productos. La foreign key se creará cuando exista la tabla `products`.

## Después de la Migración

Una vez completada la migración:
1. Recarga la página de admin/coupons
2. Deberías poder crear cupones sin errores
3. El sistema de cupones estará completamente funcional

