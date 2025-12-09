# 🚀 Guía Completa de Configuración - 4joint

Esta guía contiene todas las instrucciones necesarias para configurar completamente tu aplicación 4joint.

## 📋 Tabla de Contenidos

1. [Configuración Inicial de Supabase](#1-configuración-inicial-de-supabase)
2. [Migraciones Requeridas](#2-migraciones-requeridas)
3. [Configuración de RLS (Row Level Security)](#3-configuración-de-rls-row-level-security)
4. [Configuración de Mercado Pago](#4-configuración-de-mercado-pago)
5. [Solución de Problemas Comunes](#5-solución-de-problemas-comunes)

---

## 1. Configuración Inicial de Supabase

### Paso 1: Crear Proyecto en Supabase
1. Ve a https://supabase.com/dashboard
2. Crea un nuevo proyecto
3. Anota tu `URL` y `anon key`

### Paso 2: Configurar Variables de Entorno
Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Mercado Pago Configuration
MERCADOPAGO_ACCESS_TOKEN=tu_access_token
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=tu_public_key

# Site URL
NEXT_PUBLIC_SITE_URL=https://4joint.net
```

### Paso 3: Ejecutar Schema Base
En Supabase Dashboard → SQL Editor, ejecuta el contenido completo de:
- `supabase/schema.sql`

Esto creará todas las tablas base necesarias.

---

## 2. Migraciones Requeridas

Ejecuta estas migraciones en orden en Supabase SQL Editor:

### 2.1 Guest Checkout (OBLIGATORIO)
**Archivo:** `supabase/migration_guest_checkout.sql`

```sql
-- Hacer user_id nullable (CRÍTICO)
ALTER TABLE orders 
  ALTER COLUMN user_id DROP NOT NULL;

-- Agregar campos de guest checkout
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS guest_address JSONB;

-- Agregar índice
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders(guest_email);
```

**⚠️ SIN ESTA MIGRACIÓN EL CHECKOUT NO FUNCIONARÁ**

### 2.2 Product Variants (Opcional pero recomendado)
**Archivo:** `supabase/migration_product_variants.sql`

```sql
ALTER TABLE products
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

UPDATE products
SET variants = '[]'::jsonb
WHERE variants IS NULL;
```

### 2.3 Delivery y Tip (Opcional)
**Archivo:** `supabase/migration_delivery_tip.sql`

```sql
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_option VARCHAR(50),
ADD COLUMN IF NOT EXISTS delivery_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tip_amount DECIMAL(10, 2) DEFAULT 0;
```

### 2.4 Mercado Pago (Opcional)
**Archivo:** `supabase/migration_mercadopago.sql`

```sql
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) DEFAULT 'COD';
```

### 2.5 Free Gram Promotion (Opcional - Para promoción "1 gr gratis")
**Archivo:** `supabase/migration_free_gram.sql`

```sql
-- Hacer product_id nullable para permitir items promocionales gratis
ALTER TABLE order_items 
  ALTER COLUMN product_id DROP NOT NULL;
```

### 2.6 Order Items Variant (Opcional)
**Archivo:** `supabase/migration_order_items_variant.sql`

```sql
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS variant JSONB;
```

---

## 3. Configuración de RLS (Row Level Security)

**⚠️ ESTO ES CRÍTICO - Sin estas políticas, no podrás crear pedidos**

Ejecuta el contenido completo de: `supabase/fix_rls_orders.sql`

O ejecuta este script completo:

```sql
-- ============================================
-- FIX RLS POLICIES - EJECUTAR COMPLETO
-- ============================================

-- 1. Fix orders policies
DROP POLICY IF EXISTS "Users and guests can create orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Vendors can update orders for their products" ON orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Vendors and users can update their orders" ON orders;

-- Very permissive INSERT policy for orders
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- SELECT policy for orders
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (true);

-- UPDATE policy
CREATE POLICY "Vendors and users can update their orders"
  ON orders FOR UPDATE
  USING (true);

-- 2. Fix order_items policies (CRÍTICO - esto causa el error actual)
-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Order items can be inserted with order" ON order_items;
DROP POLICY IF EXISTS "Order items are viewable by order owner or vendor" ON order_items;
DROP POLICY IF EXISTS "Anyone can insert order items" ON order_items;

-- Disable and re-enable RLS to ensure clean state
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Very permissive INSERT policy for order_items
CREATE POLICY "Anyone can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (true);  -- Permite todas las inserciones

-- SELECT policy for order_items
CREATE POLICY "Order items are viewable by order owner or vendor"
  ON order_items FOR SELECT
  USING (true);  -- Permite ver todos los order items
```

---

## 4. Configuración de Mercado Pago

### Paso 1: Obtener Credenciales
1. Crea una cuenta en Mercado Pago: https://www.mercadopago.com.mx
2. Ve a **Desarrolladores** → **Tus integraciones**
3. Crea una nueva aplicación o selecciona una existente
4. Obtén tu `Access Token` (Production o Sandbox)
5. Obtén tu `Public Key`
6. Agrega las credenciales a `.env.local`:
   ```env
   MERCADOPAGO_ACCESS_TOKEN=tu_access_token
   NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=tu_public_key
   ```

### Paso 2: Verificar Credenciales
**Importante:** Asegúrate de usar:
- **Sandbox:** Para pruebas (tokens de prueba)
- **Producción:** Para pagos reales (tokens de producción)

### Paso 3: Configurar Webhook
1. En Mercado Pago Dashboard → Tu aplicación → Webhooks
2. Configura el webhook URL:
   ```
   https://4joint.net/api/mercadopago/webhook
   ```
3. Selecciona los eventos: `payment`

### Paso 4: Configurar URLs de Retorno
Las URLs se configuran automáticamente usando `NEXT_PUBLIC_SITE_URL`:
- Success: `https://4joint.net/payment/success`
- Failure: `https://4joint.net/payment/failure`
- Pending: `https://4joint.net/payment/pending`

### Paso 5: Verificar Permisos
En el panel de Mercado Pago, asegúrate de que tu aplicación tenga:
- ✅ Permisos para crear preferencias
- ✅ IPs permitidas configuradas (si aplica)
- ✅ Estado de aplicación: Activa

**⚠️ Si recibes error "PolicyAgent" o "UNAUTHORIZED":**
- Verifica que las credenciales sean correctas
- Asegúrate de usar el tipo correcto (sandbox vs producción)
- Revisa `MERCADOPAGO_TROUBLESHOOTING.md` para más detalles

---

## 5. Gestión de Roles de Usuario

### Roles Disponibles
- **user**: Usuario regular (por defecto)
- **vendor**: Vendedor (puede crear productos y gestionar su tienda)
- **admin**: Administrador (acceso completo)

### Asignar Roles

**Método 1: Desde Admin Dashboard (Recomendado)**
1. Inicia sesión como admin
2. Ve a `/admin/users`
3. Selecciona el rol en el dropdown

**Método 2: Desde Supabase SQL**
```sql
-- Actualizar rol de un usuario
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'email@example.com';

-- Ver roles de usuarios
SELECT 
  email,
  raw_user_meta_data->>'role' as role
FROM auth.users;
```

**Método 3: Crear función SQL (reutilizable)**
Ejecuta primero `supabase/update_user_role.sql`, luego:
```sql
SELECT update_user_role('user-id-uuid'::uuid, 'admin'::text);
```

## 6. Solución de Problemas Comunes

### Error: "new row violates row-level security policy"
**Solución:** Ejecuta el script completo de `supabase/fix_rls_orders.sql`

### Error: "null value in column user_id violates not-null constraint"
**Solución:** Ejecuta `supabase/migration_guest_checkout.sql` (especialmente la línea `ALTER COLUMN user_id DROP NOT NULL`)

### Error: "Could not find the 'variants' column"
**Solución:** Ejecuta `supabase/migration_product_variants.sql`

### Error: "Could not find the 'delivery_cost' column"
**Solución:** Ejecuta `supabase/migration_delivery_tip.sql`

### Productos no se muestran en la tienda
**Verificación:**
1. Verifica que el vendedor esté aprobado:
   ```sql
   SELECT id, name, approved FROM vendors WHERE name ILIKE '%nombre_vendedor%';
   ```
2. Si no está aprobado:
   ```sql
   UPDATE vendors SET approved = true WHERE id = 'vendor_id';
   ```
3. Verifica que los productos estén en stock:
   ```sql
   UPDATE products SET in_stock = true WHERE vendor_id = 'vendor_id';
   ```

### Error al crear orden
**Checklist:**
- ✅ ¿Ejecutaste `migration_guest_checkout.sql`?
- ✅ ¿Ejecutaste `fix_rls_orders.sql`?
- ✅ ¿El `vendor_id` es un UUID válido?
- ✅ ¿Los productos tienen IDs válidos?

### Error: "new row violates row-level security policy for table 'order_items'"
**Solución:** 
1. Ejecuta el script completo de `supabase/fix_rls_orders.sql`
2. Si el error persiste, ejecuta esto directamente en Supabase SQL Editor:
   ```sql
   -- Deshabilitar y re-habilitar RLS para limpiar estado
   ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
   ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
   
   -- Eliminar todas las políticas existentes
   DROP POLICY IF EXISTS "Order items can be inserted with order" ON order_items;
   DROP POLICY IF EXISTS "Order items are viewable by order owner or vendor" ON order_items;
   DROP POLICY IF EXISTS "Anyone can insert order items" ON order_items;
   
   -- Crear política muy permisiva
   CREATE POLICY "Anyone can insert order items"
     ON order_items FOR INSERT
     WITH CHECK (true);
   
   -- Política SELECT permisiva
   CREATE POLICY "Order items are viewable by order owner or vendor"
     ON order_items FOR SELECT
     USING (true);
   ```
3. Recarga la página y vuelve a intentar crear la orden

### Usuario no puede acceder al panel admin
**Solución:**
1. Verifica que el rol esté asignado: `SELECT raw_user_meta_data->>'role' FROM auth.users WHERE email = 'email@example.com';`
2. El usuario debe cerrar sesión y volver a iniciar
3. Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté configurado

---

## 📝 Checklist Final

Antes de considerar la configuración completa, verifica:

- [ ] Schema base ejecutado (`schema.sql`)
- [ ] Migración de guest checkout ejecutada
- [ ] Políticas RLS configuradas (`fix_rls_orders.sql`)
- [ ] Variables de entorno configuradas (`.env.local`)
- [ ] Storage bucket creado en Supabase (`product-images`)
- [ ] Vendedor de prueba creado y aprobado
- [ ] Producto de prueba creado y en stock
- [ ] Mercado Pago configurado (si se usa)
- [ ] Migración de "1 gr gratis" ejecutada (`migration_free_gram.sql`)

---

## 🔗 Archivos de Referencia

- **Schema completo:** `supabase/schema.sql`
- **Fix RLS:** `supabase/fix_rls_orders.sql`
- **Guest Checkout:** `supabase/migration_guest_checkout.sql`
- **Product Variants:** `supabase/migration_product_variants.sql`
- **Delivery/Tip:** `supabase/migration_delivery_tip.sql`
- **Mercado Pago:** `supabase/migration_mercadopago.sql`
- **Free Gram Promotion:** `supabase/migration_free_gram.sql`

---

## 💡 Notas Importantes

1. **Las políticas RLS son muy permisivas** para facilitar el desarrollo. En producción, considera restringirlas según tus necesidades de seguridad.

2. **Las migraciones opcionales** mejoran la funcionalidad pero no son estrictamente necesarias. El código maneja la ausencia de estas columnas.

3. **Siempre ejecuta las migraciones en orden** para evitar errores de dependencias.

4. **Guarda tus credenciales de forma segura** y nunca las subas a Git.

---

## 🆘 Soporte

Si encuentras problemas:
1. Revisa la consola del navegador (F12) para ver errores detallados
2. Revisa los logs de Supabase Dashboard
3. Verifica que todas las migraciones se hayan ejecutado correctamente
4. Asegúrate de que las políticas RLS estén activas

