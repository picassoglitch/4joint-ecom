# Configuración Rápida de Notificaciones

## ✅ Lo que ya tienes:

1. **Token del Bot de Telegram**: `8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU`
2. **Bot agregado al grupo**: ✅

## 🔧 Lo que necesitas hacer:

### 1. Obtener el Chat ID del Grupo

1. Ve al grupo de Telegram donde agregaste el bot
2. Envía cualquier mensaje (ej: "test")
3. Visita esta URL:
   ```
   https://api.telegram.org/bot8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU/getUpdates
   ```
4. Busca el objeto con `"type": "group"` o `"type": "supergroup"`
5. Copia el `chat.id` (será un número negativo como `-1001234567890`)

### 2. Obtener API Key de Resend

1. Ve a [https://resend.com](https://resend.com)
2. Crea una cuenta o inicia sesión
3. Ve a "API Keys" en el dashboard
4. Crea una nueva API key
5. Copia la key (formato: `re_xxxxxxxxxxxxx`)

### 3. Agregar Variables de Entorno

Abre tu archivo `.env.local` y agrega:

```env
# Resend API Key (obténla en https://resend.com)
RESEND_API_KEY=re_TU_API_KEY_AQUI

# Telegram (ya configurado)
TELEGRAM_BOT_TOKEN=8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU
TELEGRAM_CHAT_ID=-4910459403  # Grupo: "4joint-orders"
```

### 4. Probar las Notificaciones

1. Reinicia tu servidor de desarrollo (`npm run dev`)
2. Crea una orden de prueba desde el sitio
3. Verifica que:
   - Se envíe un email al vendedor
   - Se envíe un mensaje al grupo de Telegram

## 🐛 Solución de Problemas

### No recibo mensajes en Telegram

1. Verifica que el bot esté en el grupo
2. Verifica que el `TELEGRAM_CHAT_ID` sea correcto (debe ser negativo para grupos)
3. Prueba enviando un mensaje manual:
   ```
   https://api.telegram.org/bot8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU/sendMessage?chat_id=TU_CHAT_ID&text=test
   ```

### No recibo emails

1. Verifica que `RESEND_API_KEY` esté correcto
2. Verifica que el dominio esté verificado en Resend (si usas un dominio personalizado)
3. Revisa los logs del servidor para errores

## 📚 Documentación Completa

Para más detalles, consulta:
- `VENDOR_NOTIFICATIONS_SETUP.md` - Guía completa
- `GET_TELEGRAM_CHAT_ID.md` - Cómo obtener el chat ID

