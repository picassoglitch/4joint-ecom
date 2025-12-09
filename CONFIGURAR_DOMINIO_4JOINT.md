# 🚀 Configurar Dominio 4joint.net en Vercel

## ✅ Estado Actual

El sitio ya está preparado para usar `4joint.net`. Solo necesitas conectarlo en Vercel.

## 📋 Pasos para Configurar el Dominio

### 1. Agregar Dominio en Vercel

1. **Ve a tu proyecto en Vercel**
   - Visita [vercel.com](https://vercel.com)
   - Selecciona tu proyecto "gocart" o "4joint"

2. **Agrega el dominio**
   - Ve a **Settings** → **Domains**
   - Haz clic en **Add Domain**
   - Ingresa: `4joint.net`
   - Haz clic en **Add**

3. **Vercel te mostrará instrucciones de DNS**
   - Copia los valores que te proporcione
   - Necesitarás configurar estos registros en tu proveedor de DNS

### 2. Configurar DNS en tu Proveedor

**Ejemplo de configuración (ajusta según tu proveedor):**

#### Opción A: Usando CNAME (Recomendado)
```
Tipo: CNAME
Nombre: @
Valor: cname.vercel-dns.com (o el que Vercel te proporcione)
TTL: 3600 (o automático)
```

#### Opción B: Usando A Record
```
Tipo: A
Nombre: @
Valor: 76.76.21.21 (o la IP que Vercel te proporcione)
TTL: 3600
```

**Para www:**
```
Tipo: CNAME
Nombre: www
Valor: cname.vercel-dns.com
TTL: 3600
```

### 3. Verificar Variables de Entorno en Vercel

1. **Ve a Settings → Environment Variables**
2. **Asegúrate de tener estas variables configuradas:**

```env
# Site URL (MUY IMPORTANTE)
NEXT_PUBLIC_SITE_URL=https://4joint.net

# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=tu_mercadopago_token
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=tu_mercadopago_public_key

# Notificaciones
RESEND_API_KEY=re_DRJZMp9c_4c2eXFBtaa3bKRo4f74fYJvX
TELEGRAM_BOT_TOKEN=8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU
TELEGRAM_CHAT_ID=-4910459403
```

**⚠️ IMPORTANTE:** Asegúrate de que `NEXT_PUBLIC_SITE_URL` esté configurado como `https://4joint.net`

### 4. Configurar Supabase para Producción

1. **Ve a Supabase Dashboard** → **Authentication** → **URL Configuration**

2. **Site URL:**
   ```
   https://4joint.net
   ```

3. **Redirect URLs (agrega todas):**
   ```
   https://4joint.net/auth/callback
   https://www.4joint.net/auth/callback
   http://localhost:3000/auth/callback
   ```

### 5. Configurar Google OAuth (si lo usas)

1. **Ve a [Google Cloud Console](https://console.cloud.google.com)**
2. **APIs & Services** → **Credentials**
3. **Edita tu OAuth 2.0 Client ID**
4. **Authorized redirect URIs** (agrega):
   ```
   https://4joint.net/auth/callback
   https://www.4joint.net/auth/callback
   ```

### 6. Configurar Mercado Pago Webhook

1. **Ve a tu panel de Mercado Pago**
2. **Configura el webhook:**
   ```
   https://4joint.net/api/mercadopago/webhook
   ```

## ⏱️ Tiempo de Espera

- **DNS**: Puede tomar de 5 minutos a 24 horas para propagarse
- **Vercel**: Verificará automáticamente cuando el DNS esté listo
- **SSL**: Vercel proporciona SSL automáticamente (puede tomar unos minutos)

## ✅ Verificación

Una vez configurado, verifica:

- [ ] El sitio carga en `https://4joint.net`
- [ ] El sitio carga en `https://www.4joint.net` (debe redirigir)
- [ ] SSL funciona (candado verde en el navegador)
- [ ] Los enlaces de autenticación funcionan
- [ ] Los callbacks de Mercado Pago funcionan

## 🔍 Verificar Estado del Dominio

En Vercel Dashboard → Settings → Domains, deberías ver:
- ✅ `4joint.net` - Verificado
- ✅ SSL activo

## 🐛 Problemas Comunes

### "Domain not verified"
- Espera hasta 24 horas para la propagación del DNS
- Verifica que los registros DNS estén correctos
- Usa herramientas como [whatsmydns.net](https://www.whatsmydns.net) para verificar la propagación

### "SSL not working"
- Vercel proporciona SSL automáticamente
- Espera unos minutos después de verificar el dominio
- Si persiste, contacta a Vercel support

### "Callbacks not working"
- Verifica que `NEXT_PUBLIC_SITE_URL` esté configurado en Vercel
- Verifica que las URLs estén agregadas en Supabase y Google OAuth
- Revisa los logs de Vercel para errores

## 📚 Archivos de Configuración

El dominio ya está configurado en:
- ✅ `vercel.json` - Variable de entorno
- ✅ `app/layout.jsx` - Metadata
- ✅ `app/api/mercadopago/create-preference/route.js` - Callbacks
- ✅ `lib/supabase/auth.js` - OAuth redirects

## 🎉 Listo!

Una vez que el dominio esté verificado en Vercel, tu sitio estará disponible en:
- **https://4joint.net**
- **https://www.4joint.net** (redirige a 4joint.net)

