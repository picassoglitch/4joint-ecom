# ⚡ Configuración Rápida de Telegram - 5 Minutos

## ✅ Información del Bot (Ya Configurado)

**UN SOLO BOT para TODAS las tiendas** - No necesitas crear bots individuales.

- **Bot Username**: `@orders4jointbot`
- **Bot Token**: `8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU`
- **URL del Bot**: https://t.me/orders4jointbot

## 🚀 Paso 1: Agregar Variables de Entorno

Abre tu archivo `.env.local` (en la raíz del proyecto) y agrega estas líneas:

```env
# Telegram Bot Configuration (UN SOLO BOT PARA TODAS LAS TIENDAS)
TELEGRAM_BOT_TOKEN=8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU
TELEGRAM_BOT_USERNAME=orders4jointbot
```

**Nota**: `TELEGRAM_CHAT_ID` ya NO es necesario (ese era para el sistema antiguo de grupo único). Ahora cada tienda tiene su propio `chat_id` guardado en la base de datos.

## 🔄 Paso 2: Reiniciar el Servidor

```bash
# Detén el servidor (Ctrl+C)
# Luego reinícialo:
npm run dev
```

## ✅ Paso 3: Verificar que Funciona

1. Ve a **Store Settings** → **Notificaciones de Telegram**
2. Haz clic en **"Enviar Notificación de Prueba"**
3. Deberías recibir un mensaje en Telegram

## 📝 Cómo Funciona

### Para Tiendas (Automático):

1. El dueño de la tienda va a **Store Settings** → **Notificaciones de Telegram**
2. Hace clic en **"Conectar Telegram"**
3. Se abre Telegram con el bot `@orders4jointbot`
4. Presiona **"Start"**
5. ✅ La tienda queda conectada automáticamente
6. Recibirá notificaciones solo de SUS órdenes

### Para Admin (Manual - Opcional):

Si necesitas conectar una tienda manualmente:

1. **Obtén el chat_id del dueño de la tienda:**
   - El dueño debe iniciar conversación con `@orders4jointbot` en Telegram
   - Visita: https://api.telegram.org/bot8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU/getUpdates
   - Busca el mensaje del usuario y copia el `chat.id` (será un número como `123456789`)

2. **Actualiza la base de datos:**
   ```sql
   UPDATE vendors
   SET 
     telegram_chat_id = '123456789',  -- Reemplaza con el chat_id real
     telegram_enabled = true,
     notification_prefs = '{"newOrder": true, "lowStock": true, "support": true}'::jsonb
   WHERE id = 'VENDOR_ID_AQUI';
   ```

## 🔒 Seguridad: Cada Tienda Solo Recibe Sus Notificaciones

- ✅ Cada tienda tiene su propio `telegram_chat_id` único
- ✅ Las notificaciones se envían solo al `chat_id` de la tienda correspondiente
- ✅ No hay cruce de mensajes entre tiendas
- ✅ El sistema identifica automáticamente qué tienda debe recibir cada notificación

## 🐛 Solución de Problemas

### Error: "TELEGRAM_BOT_TOKEN not configured"

**Solución**: Agrega la variable a `.env.local` y reinicia el servidor.

### No recibo notificaciones después de conectar

1. Verifica que `TELEGRAM_BOT_TOKEN` esté en `.env.local`
2. Reinicia el servidor
3. Verifica en Store Settings que muestre "Telegram Conectado"
4. Haz una compra de prueba y revisa los logs del servidor

### Quiero ver los logs

Cuando creas una orden, deberías ver en los logs:
```
📬 Notification request received - Order: xxx, Vendor: yyy
📱 Attempting to send Telegram notification to vendor: yyy
🔍 Looking up store yyy for Telegram notification
📦 Store found: Nombre Tienda (yyy)
   - telegram_enabled: true
   - telegram_chat_id: SET
📤 Sending Telegram message to chat_id: 123456789 for store: Nombre Tienda
✅ Telegram message sent successfully
```

## 📚 Más Información

- **Configuración Completa**: Ver `TELEGRAM_NOTIFICATIONS_SETUP.md`
- **Troubleshooting**: Ver `TELEGRAM_TROUBLESHOOTING.md`
- **Variables de Entorno**: Ver `ENV_VARIABLES_EXAMPLE.md`

