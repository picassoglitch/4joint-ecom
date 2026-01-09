# Configuración de Solicitudes de Tienda (Store Requests)

Este documento explica cómo configurar el sistema de solicitudes de tienda para que los usuarios puedan solicitar convertirse en vendedores.

## Problema Resuelto

Anteriormente, cuando un usuario se registraba y marcaba "Quiero ser tienda", el sistema intentaba crear una solicitud directamente desde el cliente, lo que fallaba si:
- El usuario aún no había confirmado su email (no tenía sesión activa)
- Las políticas RLS bloqueaban la inserción
- La tabla no existía

**Solución:** Ahora usamos un endpoint de API (`/api/store-requests/create`) que usa el service role key para crear la solicitud sin necesidad de sesión activa.

## Pasos de Configuración

### 1. Crear la Tabla `store_requests`

Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com) y ejecuta este SQL en el **SQL Editor**:

```sql
-- Migration: Create store_requests table for users interested in becoming vendors
CREATE TABLE IF NOT EXISTS store_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'approved', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_store_requests_user_id ON store_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_store_requests_status ON store_requests(status);
CREATE INDEX IF NOT EXISTS idx_store_requests_created_at ON store_requests(created_at DESC);

-- Add comment
COMMENT ON TABLE store_requests IS 'Stores requests from users who want to become vendors';
COMMENT ON COLUMN store_requests.status IS 'Status: pending, reviewed, approved, rejected';
```

### 2. Configurar Políticas RLS (Row Level Security)

Ejecuta este SQL en el **SQL Editor**:

```sql
-- Enable RLS on store_requests table
ALTER TABLE store_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own store requests
CREATE POLICY "Users can insert their own store requests"
ON store_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all store requests
CREATE POLICY "Admins can view all store requests"
ON store_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

-- Policy: Admins can update store requests
CREATE POLICY "Admins can update store requests"
ON store_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  )
);

-- Policy: Users can view their own store requests
CREATE POLICY "Users can view their own store requests"
ON store_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

### 3. Verificar Variables de Entorno

Asegúrate de que estas variables estén configuradas en tu `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key  # IMPORTANTE: Necesario para crear solicitudes
```

**Nota:** El `SUPABASE_SERVICE_ROLE_KEY` es necesario porque el endpoint de API lo usa para crear solicitudes sin necesidad de que el usuario tenga una sesión activa.

### 4. Probar la Funcionalidad

1. Ve a tu aplicación y crea una nueva cuenta
2. Marca la casilla "Quiero ser tienda"
3. Completa el registro
4. Deberías ver un mensaje de éxito: "Solicitud de tienda registrada. Te contactaremos pronto."
5. Ve al dashboard de admin (`/admin`) para ver la solicitud pendiente

## Cómo Funciona

1. **Usuario se registra:** El usuario completa el formulario de registro y marca "Quiero ser tienda"
2. **Creación de cuenta:** Se crea la cuenta de usuario en Supabase Auth
3. **Solicitud de tienda:** El frontend llama al endpoint `/api/store-requests/create` con:
   - `user_id`: ID del usuario recién creado
   - `user_email`: Email del usuario
   - `user_name`: Nombre del usuario
4. **Endpoint de API:** El endpoint usa el `SUPABASE_SERVICE_ROLE_KEY` para crear la solicitud en la tabla `store_requests` sin necesidad de sesión activa
5. **Notificación:** El usuario recibe un mensaje de éxito
6. **Admin Dashboard:** Los administradores pueden ver todas las solicitudes pendientes en `/admin`

## Verificar que Funciona

### En Supabase Dashboard:

1. Ve a **Table Editor** → `store_requests`
2. Deberías ver las solicitudes creadas con `status = 'pending'`

### En la Aplicación:

1. Ve a `/admin` (como administrador)
2. Deberías ver una sección "Solicitudes de Tienda" con las solicitudes pendientes

## Solución de Problemas

### Error: "La tabla store_requests no existe"

**Solución:** Ejecuta el SQL del paso 1 en el SQL Editor de Supabase.

### Error: "Error de permisos"

**Solución:** Ejecuta el SQL del paso 2 para configurar las políticas RLS.

### Error: "Error de configuración del servidor"

**Solución:** Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté configurado en tu `.env.local` y que esté disponible en el servidor (no es una variable pública).

### La solicitud no aparece en el admin dashboard

**Verifica:**
1. Que el usuario tenga el rol `admin` en `raw_user_meta_data`
2. Que las políticas RLS estén configuradas correctamente
3. Que la tabla `store_requests` exista y tenga datos

## Archivos Relacionados

- `app/api/store-requests/create/route.js` - Endpoint de API para crear solicitudes
- `components/AuthModal.jsx` - Formulario de registro con checkbox "Quiero ser tienda"
- `app/admin/page.jsx` - Dashboard de admin para ver solicitudes
- `supabase/migration_store_requests.sql` - SQL para crear la tabla
- `supabase/migration_store_requests_rls.sql` - SQL para configurar RLS





