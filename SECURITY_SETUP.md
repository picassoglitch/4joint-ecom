# Configuración de Seguridad

Este documento describe las medidas de seguridad implementadas y cómo configurarlas.

## Protecciones Implementadas

### 1. Rate Limiting (Límite de Solicitudes)

Se ha implementado rate limiting en los siguientes endpoints:

- **Registro de usuarios**: 5 registros por hora por IP
- **Solicitudes de tienda**: 3 solicitudes por 15 minutos por IP

**Archivo:** `lib/rate-limit.js`

**Nota:** Para producción, considera usar Redis o un servicio dedicado como Upstash Redis para rate limiting distribuido.

### 2. Verificación de Email Obligatoria

- Las cuentas NO se activan hasta que el usuario verifique su email
- Las solicitudes de tienda solo se permiten para usuarios con email verificado
- El sistema requiere confirmación de email antes de permitir acciones críticas

### 3. Validaciones de Seguridad

- Validación de formato de email
- Validación de fortaleza de contraseña (mínimo 8 caracteres)
- Detección de contraseñas débiles comunes
- Validación de UUID para user_id
- Verificación de existencia de usuario antes de crear solicitudes

### 4. Protección contra Ataques

- **Spam/DoS**: Rate limiting previene registros masivos
- **Cuentas no verificadas**: No pueden realizar acciones críticas
- **Validación de datos**: Todos los inputs son validados antes de procesar

## Configuración en Supabase

### 1. Habilitar Verificación de Email Obligatoria

1. Ve a **Supabase Dashboard** → **Authentication** → **Settings**
2. En la sección **Email Auth**, asegúrate de que:
   - ✅ **Enable email confirmations** esté activado
   - ✅ **Secure email change** esté activado
   - ✅ **Double confirm email changes** esté activado (opcional pero recomendado)

3. En **Email Templates**, personaliza el email de confirmación

### 2. Configurar Límites de Rate Limiting en Supabase

1. Ve a **Project Settings** → **API** → **Rate Limiting**
2. Configura límites para:
   - **Sign up**: 5 por hora
   - **Sign in**: 10 por hora
   - **Password reset**: 3 por hora

### 3. Configurar Protección contra Spam

1. Ve a **Authentication** → **Settings** → **Email Auth**
2. Habilita:
   - ✅ **Enable email confirmations**
   - ✅ **Secure email change**
   - Considera habilitar **CAPTCHA** si está disponible

### 4. Configurar RLS (Row Level Security)

Asegúrate de que todas las tablas críticas tengan RLS habilitado:

```sql
-- Ejemplo para store_requests
ALTER TABLE store_requests ENABLE ROW LEVEL SECURITY;
```

## Mejoras Adicionales Recomendadas

### 1. Implementar CAPTCHA

Para producción, considera agregar reCAPTCHA v3 o hCaptcha:

```bash
npm install @google-cloud/recaptcha-enterprise
# o
npm install @hcaptcha/react-hcaptcha
```

### 2. Usar Redis para Rate Limiting

Para rate limiting distribuido en producción:

```bash
npm install ioredis
```

Luego actualiza `lib/rate-limit.js` para usar Redis.

### 3. Monitoreo y Alertas

Configura alertas para:
- Múltiples intentos de registro fallidos desde la misma IP
- Patrones sospechosos de actividad
- Intentos de acceso a endpoints protegidos

### 4. Logging de Seguridad

Implementa logging para:
- Intentos de registro
- Solicitudes de tienda
- Cambios de contraseña
- Accesos administrativos

## Verificación de Configuración

### Verificar que Email Confirmation está Habilitado

1. Intenta crear una cuenta nueva
2. Verifica que recibes un email de confirmación
3. Intenta iniciar sesión sin confirmar el email - debería fallar
4. Confirma el email y luego intenta iniciar sesión - debería funcionar

### Verificar Rate Limiting

1. Intenta crear múltiples cuentas rápidamente desde la misma IP
2. Después de 5 intentos, deberías recibir un error 429 (Too Many Requests)
3. Espera 1 hora y deberías poder crear cuentas nuevamente

### Verificar Protección de Solicitudes de Tienda

1. Crea una cuenta pero NO confirmes el email
2. Intenta crear una solicitud de tienda - debería fallar con "EMAIL_NOT_VERIFIED"
3. Confirma tu email
4. Intenta crear la solicitud nuevamente - debería funcionar

## Variables de Entorno Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Site URL (para redirecciones de email)
NEXT_PUBLIC_SITE_URL=https://tudominio.com
```

## Troubleshooting

### "Too many requests" aparece muy rápido

- Ajusta los límites en `lib/rate-limit.js`
- Considera usar Redis para rate limiting más preciso

### Los usuarios no reciben emails de confirmación

- Verifica la configuración de SMTP en Supabase
- Revisa la carpeta de spam
- Verifica que "Enable email confirmations" esté activado

### Las cuentas se activan sin verificar email

- Verifica que "Enable email confirmations" esté activado en Supabase
- Asegúrate de que el código no esté usando `autoConfirm: true` en signUp

## Próximos Pasos

1. ✅ Rate limiting implementado
2. ✅ Verificación de email obligatoria
3. ✅ Validaciones de seguridad
4. ⏳ Implementar CAPTCHA (recomendado para producción)
5. ⏳ Migrar a Redis para rate limiting distribuido
6. ⏳ Implementar logging de seguridad
7. ⏳ Configurar alertas de monitoreo





