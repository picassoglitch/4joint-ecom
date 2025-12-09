# Configuración del Dominio 4joint.net

Esta guía te ayudará a configurar el dominio **4joint.net** en tu sitio.

## ✅ Configuración Actual

El sitio ya está configurado para usar `4joint.net` en los siguientes lugares:

- ✅ `vercel.json` - Variable de entorno `NEXT_PUBLIC_SITE_URL`
- ✅ `app/layout.jsx` - Metadata del sitio
- ✅ `app/api/mercadopago/create-preference/route.js` - URLs de callback
- ✅ `app/api/notify-vendor/route.js` - Enlaces en emails
- ✅ `lib/supabase/auth.js` - URLs de redirección OAuth

## 🚀 Pasos para Configurar el Dominio en Vercel

### 1. Conectar el Dominio en Vercel

1. **Ve a tu proyecto en Vercel Dashboard**
   - Visita [vercel.com](https://vercel.com)
   - Selecciona tu proyecto

2. **Agrega el dominio**
   - Ve a **Settings** > **Domains**
   - Haz clic en **Add Domain**
   - Ingresa `4joint.net`
   - Haz clic en **Add**

3. **Configuración DNS**
   Vercel te dará instrucciones específicas. Generalmente necesitas:

   **Opción A: Usando registros A (si tu proveedor lo soporta)**
   ```
   Tipo: A
   Nombre: @
   Valor: 76.76.21.21 (o la IP que Vercel te proporcione)
   ```

   **Opción B: Usando CNAME (recomendado)**
   ```
   Tipo: CNAME
   Nombre: @
   Valor: cname.vercel-dns.com (o el CNAME que Vercel te proporcione)
   ```

   **Para www:**
   ```
   Tipo: CNAME
   Nombre: www
   Valor: cname.vercel-dns.com
   ```

4. **Espera la verificación**
   - Puede tomar de 5 minutos a 24 horas
   - Vercel verificará automáticamente cuando el DNS esté configurado

### 2. Configurar Variables de Entorno en Vercel

1. **Ve a Settings > Environment Variables**
2. **Agrega o verifica estas variables:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Site URL (IMPORTANTE)
NEXT_PUBLIC_SITE_URL=https://4joint.net

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=tu_mercadopago_token
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=tu_mercadopago_public_key

# Notificaciones
RESEND_API_KEY=re_DRJZMp9c_4c2eXFBtaa3bKRo4f74fYJvX
TELEGRAM_BOT_TOKEN=8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU
TELEGRAM_CHAT_ID=-4910459403
```

3. **Asegúrate de que `NEXT_PUBLIC_SITE_URL` esté configurado como:**
   ```
   https://4joint.net
   ```

### 3. Configurar Supabase para Producción

1. **Ve a Supabase Dashboard** > **Authentication** > **URL Configuration**

2. **Configura Site URL:**
   ```
   https://4joint.net
   ```

3. **Agrega Redirect URLs:**
   ```
   https://4joint.net/auth/callback
   https://www.4joint.net/auth/callback
   http://localhost:3000/auth/callback (para desarrollo)
   ```

### 4. Configurar Google OAuth (si lo usas)

1. **Ve a [Google Cloud Console](https://console.cloud.google.com)**
2. **Navega a APIs & Services > Credentials**
3. **Edita tu OAuth 2.0 Client ID**
4. **Agrega a "Authorized redirect URIs":**
   ```
   https://4joint.net/auth/callback
   https://www.4joint.net/auth/callback
   ```

### 5. Configurar Mercado Pago Webhooks

1. **Ve a tu panel de Mercado Pago**
2. **Configura el webhook para:**
   ```
   https://4joint.net/api/mercadopago/webhook
   ```

## 🔍 Verificación

Después de configurar el dominio, verifica:

- [ ] El sitio carga en `https://4joint.net`
- [ ] El sitio carga en `https://www.4joint.net` (redirige a 4joint.net)
- [ ] Los enlaces de autenticación funcionan
- [ ] Los callbacks de Mercado Pago funcionan
- [ ] Los emails se envían correctamente
- [ ] Las notificaciones de Telegram funcionan

## 📝 Notas Importantes

1. **SSL/HTTPS**: Vercel proporciona SSL automáticamente. No necesitas configurar certificados manualmente.

2. **www vs no-www**: Vercel puede configurar redirecciones automáticas. Recomendamos redirigir `www.4joint.net` a `4joint.net`.

3. **Variables de Entorno**: Asegúrate de que todas las variables de entorno estén configuradas en Vercel, especialmente `NEXT_PUBLIC_SITE_URL`.

4. **Cache**: Después de cambiar variables de entorno, es posible que necesites hacer un nuevo deploy o limpiar el cache.

## 🐛 Solución de Problemas

### El dominio no carga
- Verifica que los registros DNS estén configurados correctamente
- Espera hasta 24 horas para la propagación completa del DNS
- Verifica en Vercel Dashboard que el dominio esté verificado

### Los callbacks no funcionan
- Verifica que `NEXT_PUBLIC_SITE_URL` esté configurado correctamente
- Verifica que las URLs de callback estén agregadas en Supabase y Google OAuth
- Revisa los logs de Vercel para errores

### SSL no funciona
- Vercel proporciona SSL automáticamente
- Si hay problemas, verifica que el dominio esté correctamente verificado en Vercel

## 📚 Recursos Adicionales

- [Documentación de Vercel sobre dominios](https://vercel.com/docs/concepts/projects/domains)
- [Guía de Deployment completa](./DEPLOYMENT.md)
- [Configuración de Supabase](./SUPABASE_SETUP.md)

