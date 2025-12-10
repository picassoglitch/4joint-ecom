# Configuración de Google OAuth para 4joint

Esta guía te ayudará a configurar correctamente Google OAuth para el inicio de sesión.

## 1. Configurar Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en **Create Credentials** → **OAuth client ID**
5. Si es la primera vez, configura la pantalla de consentimiento OAuth:
   - Tipo de aplicación: **Web application**
   - Nombre: **4joint**
   - Email de soporte: Tu email
   - Dominios autorizados: `4joint.net`, `www.4joint.net`
6. Crea el OAuth 2.0 Client ID:
   - Tipo: **Web application**
   - Nombre: **4joint Web Client**
   - **Authorized JavaScript origins:**
     - `https://4joint.net`
     - `https://www.4joint.net`
     - `http://localhost:3000` (para desarrollo)
   - **Authorized redirect URIs:**
     - `https://4joint.net/auth/callback`
     - `https://www.4joint.net/auth/callback`
     - `http://localhost:3000/auth/callback` (para desarrollo)
7. Copia el **Client ID** y **Client Secret**

## 2. Configurar Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **Authentication** → **Providers**
3. Busca **Google** y haz clic para habilitarlo
4. Ingresa:
   - **Client ID (for OAuth)**: El Client ID de Google Cloud Console
   - **Client Secret (for OAuth)**: El Client Secret de Google Cloud Console
5. Guarda los cambios

## 3. Configurar URLs de Redirección en Supabase

1. Ve a **Authentication** → **URL Configuration**
2. Configura:
   - **Site URL:**
     - Producción: `https://4joint.net`
     - Desarrollo: `http://localhost:3000`
   - **Redirect URLs** (agrega todas):
     - `https://4joint.net/auth/callback`
     - `https://www.4joint.net/auth/callback`
     - `http://localhost:3000/auth/callback`

## 4. Verificar Variables de Entorno

Asegúrate de que estas variables estén configuradas:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://4joint.net  # Para producción
# O
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Para desarrollo
```

## 5. Probar la Integración

1. Inicia tu aplicación en desarrollo:
   ```bash
   npm run dev
   ```

2. Ve a la página de inicio de sesión
3. Haz clic en "Continuar con Google"
4. Deberías ser redirigido a Google para autenticarte
5. Después de autenticarte, serás redirigido de vuelta a `/auth/callback`
6. El callback procesará la sesión y te redirigirá a la página principal

## Problemas Comunes

### El botón se queda en "Cargando..."
- **Causa**: La redirección a Google no está ocurriendo
- **Solución**: 
  - Verifica que Google OAuth esté habilitado en Supabase
  - Verifica que las URLs de redirección estén configuradas correctamente
  - Verifica la consola del navegador para errores

### Error: "redirect_uri_mismatch"
- **Causa**: La URL de redirección no coincide con las configuradas en Google Cloud Console
- **Solución**: 
  - Verifica que todas las URLs estén exactamente iguales en:
    - Google Cloud Console → Authorized redirect URIs
    - Supabase → Authentication → URL Configuration → Redirect URLs
    - Código: `lib/supabase/auth.js` → `redirectUrl`

### Error: "invalid_client"
- **Causa**: El Client ID o Client Secret son incorrectos
- **Solución**: 
  - Verifica que hayas copiado correctamente el Client ID y Client Secret
  - Asegúrate de que estén configurados en Supabase → Authentication → Providers → Google

### No se crea la sesión después del callback
- **Causa**: El callback no está procesando correctamente el código
- **Solución**: 
  - Verifica que el archivo `app/auth/callback/route.js` exista
  - Verifica los logs del servidor para errores
  - Asegúrate de que las variables de entorno estén configuradas

## Verificación Final

Después de configurar todo, verifica:

- [ ] Google OAuth está habilitado en Supabase
- [ ] Client ID y Client Secret están configurados en Supabase
- [ ] URLs de redirección están configuradas en Google Cloud Console
- [ ] URLs de redirección están configuradas en Supabase
- [ ] `NEXT_PUBLIC_SITE_URL` está configurado correctamente
- [ ] El botón "Continuar con Google" redirige a Google
- [ ] Después de autenticarte, regresas a la aplicación y estás autenticado


