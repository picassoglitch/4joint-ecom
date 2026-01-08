# Variables de Entorno para Vercel

Copia y pega estas variables en **Vercel Dashboard → Settings → Environment Variables**.

> 📖 **Guía detallada paso a paso**: Ver [VERCEL_ENV_SETUP_GUIDE.md](./VERCEL_ENV_SETUP_GUIDE.md)

## ⚠️ IMPORTANTE

1. Agrega **TODAS** estas variables
2. Marca todas para **Production**, **Preview**, y **Development**
3. Haz un **Redeploy** después de agregar las variables

## 📋 Variables Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Site URL (MUY IMPORTANTE)
NEXT_PUBLIC_SITE_URL=https://4joint.net

# Mercado Pago - Producción ✅
MERCADOPAGO_ACCESS_TOKEN=APP_USR-3727099472713705-010815-bdff7b8923a3d8d25726e412128fb4f6-1243156223
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-3cb1e601-a891-4742-9295-176d43914d1f

# Notificaciones - Email (Resend)
RESEND_API_KEY=re_DRJZMp9c_4c2eXFBtaa3bKRo4f74fYJvX

# Notificaciones - Telegram
TELEGRAM_BOT_TOKEN=8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU
TELEGRAM_CHAT_ID=-4910459403
```

## 🔧 Cómo Agregar en Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com)
2. **Settings** → **Environment Variables**
3. Haz clic en **Add New**
4. Para cada variable:
   - **Key**: El nombre de la variable (ej: `NEXT_PUBLIC_SITE_URL`)
   - **Value**: El valor (ej: `https://4joint.net`)
   - **Environments**: Marca ✅ Production, ✅ Preview, ✅ Development
5. Haz clic en **Save**
6. Repite para todas las variables
7. Ve a **Deployments** y haz clic en los tres puntos del último deployment
8. Selecciona **Redeploy**

## ✅ Verificación

Después del redeploy, verifica que:
- [ ] El build se completa sin errores
- [ ] El sitio carga correctamente
- [ ] La autenticación funciona
- [ ] Los productos se cargan desde Supabase

## 🐛 Si el Build Falla

Si ves errores como:
- `Missing Supabase environment variables`

**Solución:**
1. Verifica que todas las variables estén agregadas en Vercel
2. Verifica que estén marcadas para "Production"
3. Haz un redeploy completo
4. Si persiste, verifica que los nombres de las variables sean exactos (case-sensitive)

