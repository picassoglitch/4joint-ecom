# Instrucciones para Importar Códigos Postales

## Paso 1: Ejecutar Migración SQL

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **SQL Editor**
3. Copia y pega el contenido completo de `supabase/migration_zip_codes.sql`
4. Haz clic en **Run** o presiona `Ctrl+Enter`

## Paso 2: Ejecutar Script de Importación

Una vez que la tabla esté creada, ejecuta:

```bash
node scripts/auto-import-zip-codes.js "C:\Users\USER\Documents\Downloads\CodigosPostales.xls"
```

El script:
- ✅ Verificará si la tabla existe
- ✅ Esperará automáticamente si no existe (hasta 5 minutos)
- ✅ Importará todos los códigos postales del archivo Excel
- ✅ Mostrará progreso en tiempo real

## Nota

El script usa las variables de entorno existentes:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

No se modifican ni se crean nuevas variables.

