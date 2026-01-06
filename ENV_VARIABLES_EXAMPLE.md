# Variables de Entorno - Ejemplo Completo

Copia estas variables a tu archivo `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Site URL
NEXT_PUBLIC_SITE_URL=https://4joint.net

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=your_mercadopago_access_token
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=your_mercadopago_public_key

# Email Notifications (Resend) - ✅ CONFIGURADO
RESEND_API_KEY=re_DRJZMp9c_4c2eXFBtaa3bKRo4f74fYJvX

# Telegram Notifications - ✅ CONFIGURADO
# UN SOLO BOT para todas las tiendas - cada tienda se conecta automáticamente
TELEGRAM_BOT_TOKEN=8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU
TELEGRAM_BOT_USERNAME=orders4jointbot

# Nota: TELEGRAM_CHAT_ID ya no es necesario (sistema antiguo)
# Cada tienda ahora tiene su propio chat_id guardado en la base de datos
```

## ✅ Configuración de Notificaciones Completa

- **Resend API Key**: `re_DRJZMp9c_4c2eXFBtaa3bKRo4f74fYJvX`
- **Telegram Bot Token**: `8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU`
- **Telegram Chat ID**: `-4910459403` (Grupo: "4joint-orders")

## Próximo Paso

1. Agrega estas variables a tu `.env.local`
2. Reinicia el servidor: `npm run dev`
3. Prueba creando una orden - deberías recibir notificaciones en Telegram y Email

