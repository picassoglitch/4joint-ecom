# Guía de Deployment para 4joint.net

Esta guía te ayudará a desplegar 4joint en producción usando el dominio 4joint.net.

## Opciones de Deployment

### Opción 1: Vercel (Recomendado)

Vercel es la plataforma oficial de Next.js y ofrece deployment automático.

#### Pasos:

1. **Instalar Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login en Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Configurar dominio personalizado:**
   - Ve a tu proyecto en [vercel.com](https://vercel.com)
   - Settings > Domains
   - Agrega `4joint.net` y `www.4joint.net`
   - Sigue las instrucciones para configurar DNS

5. **Configurar variables de entorno en Vercel:**
   - Ve a Settings > Environment Variables
   - Agrega todas las variables de `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY
     SUPABASE_SERVICE_ROLE_KEY
     ```

6. **Configurar Supabase para producción:**
   - Ve a Authentication > URL Configuration
   - Agrega a "Redirect URLs":
     - `https://4joint.net/auth/callback`
     - `https://www.4joint.net/auth/callback`
   - Agrega a "Site URL": `https://4joint.net`

### Opción 2: Netlify

1. **Instalar Netlify CLI:**
   ```bash
   npm i -g netlify-cli
   ```

2. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

3. **Configurar dominio:**
   - Netlify Dashboard > Domain settings
   - Agrega dominio personalizado

### Opción 3: Servidor propio (VPS)

1. **Build de producción:**
   ```bash
   npm run build
   ```

2. **Iniciar servidor:**
   ```bash
   npm start
   ```

3. **Configurar Nginx como reverse proxy:**
   ```nginx
   server {
       listen 80;
       server_name 4joint.net www.4joint.net;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Configurar SSL con Let's Encrypt:**
   ```bash
   sudo certbot --nginx -d 4joint.net -d www.4joint.net
   ```

## Configuración de DNS

Configura estos registros en tu proveedor de DNS:

### Para Vercel/Netlify:
```
A Record: @ → IP proporcionado por la plataforma
CNAME: www → cname proporcionado
```

### Para servidor propio:
```
A Record: @ → IP de tu servidor
A Record: www → IP de tu servidor
```

## Variables de Entorno de Producción

Crea un archivo `.env.production` o configura en tu plataforma:

```env
NEXT_PUBLIC_SUPABASE_URL=https://yqttcfpeebdycpyjmnrv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_O-hUs5yjnqI76Fjy5frNnA_8XWkONcL
SUPABASE_SERVICE_ROLE_KEY=sb_secret_Xyij2mG4FOHtikzrOSQz5Q_ZbYFVewj
NEXT_PUBLIC_SITE_URL=https://4joint.net
```

## Configuración de Supabase para Producción

1. **Authentication > URL Configuration:**
   - Site URL: `https://4joint.net`
   - Redirect URLs:
     - `https://4joint.net/auth/callback`
     - `https://www.4joint.net/auth/callback`
     - `http://localhost:3000/auth/callback` (para desarrollo)

2. **Storage Policies:**
   - Asegúrate de que las políticas de Storage estén configuradas correctamente
   - Verifica que el bucket `product-images` sea público

## Google OAuth Configuration

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Navega a APIs & Services > Credentials
3. Edita tu OAuth 2.0 Client ID
4. Agrega a "Authorized redirect URIs":
   - `https://4joint.net/auth/callback`
   - `https://www.4joint.net/auth/callback`

## Verificación Post-Deployment

- [ ] El sitio carga en https://4joint.net
- [ ] El login con email/password funciona
- [ ] El login con Google funciona
- [ ] Las imágenes se suben correctamente a Supabase Storage
- [ ] Las notificaciones en tiempo real funcionan
- [ ] El panel de admin es accesible
- [ ] SSL/HTTPS está configurado correctamente

## Monitoreo y Analytics

Considera agregar:
- Vercel Analytics (si usas Vercel)
- Google Analytics
- Sentry para error tracking

## Backup y Seguridad

- Configura backups automáticos de la base de datos en Supabase
- Revisa las políticas de RLS regularmente
- Mantén las dependencias actualizadas: `npm audit`
- Usa variables de entorno para todas las credenciales


