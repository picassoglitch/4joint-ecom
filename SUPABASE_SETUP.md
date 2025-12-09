# Supabase Setup Guide para 4joint

Esta guía te ayudará a configurar Supabase para la aplicación 4joint.

## 1. Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Anota tu **Project URL** y **anon/public key** desde Settings > API

## 2. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://yqttcfpeebdycpyjmnrv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui  # Opcional, para operaciones admin
```

**Nota:** Reemplaza los valores con tus propias keys de Supabase. Puedes encontrarlas en Settings > API de tu proyecto Supabase.

## 3. Crear Storage Bucket para Imágenes

1. Ve a Storage en Supabase Dashboard
2. Clic en "New bucket"
3. Nombre: `product-images`
4. Marca "Public bucket" como activado
5. Clic en "Create bucket"

O ejecuta este SQL en SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true);
```

Luego crea las políticas de Storage:
```sql
-- Permitir a usuarios autenticados subir imágenes
CREATE POLICY "Users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Permitir acceso público de lectura
CREATE POLICY "Product images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');
```

## 4. Ejecutar Schema SQL

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a SQL Editor
3. Copia y pega el contenido de `supabase/schema.sql`
4. Ejecuta el script

Esto creará:
- Tabla `products` (id, name, price, vendor_id, category)
- Tabla `vendors` (id, email, approved)
- Tabla `orders` y `order_items`
- Row Level Security (RLS) policies
- Realtime subscriptions habilitadas

## 5. Configurar Autenticación

### Email/Password
1. Ve a Authentication > Providers en Supabase Dashboard
2. Asegúrate de que "Email" esté habilitado

### Google OAuth
1. Ve a Authentication > Providers > Google
2. Habilita Google provider
3. Agrega tu Client ID y Client Secret de Google Cloud Console
4. Agrega las URLs de callback:
   - `https://4joint.net/auth/callback` (producción)
   - `https://www.4joint.net/auth/callback` (producción con www)
   - `http://localhost:3000/auth/callback` (desarrollo)

## 6. Configurar Roles de Usuario

Los roles se almacenan en `user_metadata.role`:
- `user` - Usuario regular (por defecto) - Puede comprar productos
- `vendor` - Vendedor - Puede crear productos y gestionar pedidos
- `admin` - Administrador - Acceso completo al panel de administración

### Asignar Roles - Opciones:

**Opción 1: Desde Admin Dashboard (Recomendado)**
1. Inicia sesión como administrador
2. Ve a `/admin/users`
3. Selecciona el rol desde el dropdown

**Opción 2: Desde Supabase Dashboard**
1. Ve a Authentication > Users
2. Edita el usuario
3. En "User Metadata", agrega: `{"role": "admin"}` o `{"role": "vendor"}`

**Opción 3: Usando SQL**
```sql
-- Ver función helper en schema.sql
SELECT update_user_role('user_id', 'admin');
```

📖 **Guía completa:** Consulta [SETUP_COMPLETE.md](./SETUP_COMPLETE.md) sección "Gestión de Roles de Usuario" para más detalles

## 7. Habilitar Realtime

1. Ve a Database > Replication en Supabase Dashboard
2. Habilita la replicación para las tablas:
   - `vendors` (para notificaciones de nuevos vendedores)
   - `orders` (para notificaciones de nuevos pedidos)

## 8. Configurar para Producción (4joint.net)

1. Ve a Authentication > URL Configuration en Supabase Dashboard
2. Configura:
   - **Site URL:** `https://4joint.net`
   - **Redirect URLs:**
     - `https://4joint.net/auth/callback`
     - `https://www.4joint.net/auth/callback`
     - `http://localhost:3000/auth/callback` (para desarrollo)

3. En Google Cloud Console, agrega las mismas URLs a "Authorized redirect URIs"

📖 **Guía completa de deployment:** Consulta [DEPLOYMENT.md](./DEPLOYMENT.md)

## 9. Crear Usuario de Prueba

Antes de probar, crea un usuario de prueba:

1. Ve a Authentication > Users en Supabase Dashboard
2. Clic en "Add User" o "Invite User"
3. Completa:
   - Email: `test@4joint.net` (o cualquier email)
   - Password: `test123456` (mínimo 6 caracteres)
   - Marca "Auto Confirm User" para evitar verificación de email
4. Clic en "Create User"

Ahora puedes iniciar sesión con estas credenciales.

## 10. Probar la Integración

1. Inicia el servidor de desarrollo: `npm run dev`
2. Intenta iniciar sesión con el usuario de prueba creado
3. Intenta registrarte con un nuevo email/password
4. Prueba el login con Google (si está configurado)
5. Como admin, verifica que recibes notificaciones cuando se registra un nuevo vendedor

📖 **Problemas comunes:** Consulta [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) si encuentras errores

## Estructura de Base de Datos

### Products
```sql
- id (UUID)
- name (VARCHAR)
- description (TEXT)
- price (DECIMAL)
- mrp (DECIMAL)
- vendor_id (UUID) -> auth.users(id)
- category (VARCHAR)
- images (TEXT[])
- in_stock (BOOLEAN)
```

### Vendors
```sql
- id (UUID) -> auth.users(id)
- email (VARCHAR)
- name (VARCHAR)
- username (VARCHAR)
- approved (BOOLEAN)
- created_at (TIMESTAMP)
```

### Orders
```sql
- id (UUID)
- user_id (UUID) -> auth.users(id)
- vendor_id (UUID) -> vendors(id)
- total (DECIMAL)
- status (VARCHAR)
- payment_method (VARCHAR)
- is_paid (BOOLEAN)
- commission (DECIMAL)
- vendor_earnings (DECIMAL)
```

## Funcionalidades Implementadas

✅ Autenticación con email/password
✅ Autenticación con Google OAuth
✅ Roles de usuario (user/vendor/admin)
✅ Row Level Security (RLS)
✅ Realtime notifications para nuevos vendedores
✅ Funciones de base de datos para productos, vendedores y pedidos
✅ Componente AuthModal integrado en Navbar
✅ Notificaciones en tiempo real en panel admin

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Verifica que `.env.local` existe y tiene las variables correctas
- Reinicia el servidor de desarrollo después de agregar variables

### Error: "Row Level Security policy violation"
- Verifica que las políticas RLS estén correctamente configuradas
- Asegúrate de que el usuario esté autenticado

### Realtime no funciona
- Verifica que la replicación esté habilitada en Supabase Dashboard
- Asegúrate de que las tablas estén en la publicación `supabase_realtime`

