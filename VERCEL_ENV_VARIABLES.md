# Variables de Entorno para Vercel

Copia y pega estas variables en **Vercel Dashboard → Settings → Environment Variables**.

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

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-2380007477498594-120822-d8c6b1e8c32283246dfd2ecd077d1faa-1243156223
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-bb9c706b-c33d-4581-86ba-88f69b1a14b2

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
- [ ] Los pagos de Mercado Pago funcionan

## 🐛 Si el Build Falla

Si ves errores como:
- `Missing Supabase environment variables`
- `MERCADOPAGO_ACCESS_TOKEN no está configurado`

**Solución:**
1. Verifica que todas las variables estén agregadas en Vercel
2. Verifica que estén marcadas para "Production"
3. Haz un redeploy completo
4. Si persiste, verifica que los nombres de las variables sean exactos (case-sensitive)

