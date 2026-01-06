# 🔔 Configuración de Callbacks de Telegram

## 📋 Resumen

El sistema de notificaciones de Telegram ahora incluye botones inline que permiten a las tiendas:
- ✅ Aceptar pedidos
- ❌ Rechazar pedidos
- 📞 Ver información de contacto del cliente
- 🗺️ Abrir la dirección en Google Maps

## 🔧 Configuración del Webhook

El webhook de Telegram debe estar configurado para recibir tanto mensajes como callbacks (clicks en botones).

### URL del Webhook

```
https://tu-dominio.com/api/integrations/telegram/webhook
```

### Configurar el Webhook

Ejecuta este comando (reemplaza `YOUR_BOT_TOKEN` y `YOUR_DOMAIN`):

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_DOMAIN.com/api/integrations/telegram/webhook",
    "allowed_updates": ["message", "callback_query"]
  }'
```

**Importante**: `allowed_updates` debe incluir `"callback_query"` para recibir clicks en botones.

### Verificar el Webhook

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

Deberías ver:
```json
{
  "ok": true,
  "result": {
    "url": "https://tu-dominio.com/api/integrations/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "allowed_updates": ["message", "callback_query"]
  }
}
```

## 🎯 Cómo Funciona

### 1. Nueva Orden Recibida

Cuando se crea una orden, se envía un mensaje a Telegram con:
- Formato MarkdownV2 profesional
- Badge de estado (🟡 ORDER PLACED)
- Botones inline para acciones

### 2. Click en Botón

Cuando la tienda hace click en un botón:
1. Telegram envía un `callback_query` al webhook
2. El webhook lo redirige a `/api/integrations/telegram/callback`
3. El callback handler:
   - Valida la acción y el orderId
   - Verifica que la tienda es dueña de la orden
   - Actualiza el estado en la base de datos
   - Edita el mensaje original con el nuevo estado
   - Responde al callback query (feedback al usuario)

### 3. Actualización de Estado

El mensaje se edita automáticamente mostrando el nuevo badge:
- 🟡 ORDER PLACED → 🔵 PREPARANDO (al aceptar)
- 🟡 ORDER PLACED → 🔴 RECHAZADO (al rechazar)

## 🔒 Seguridad

- Los callbacks verifican que la tienda es dueña de la orden
- Solo la tienda que recibió la notificación puede interactuar con los botones
- El webhook verifica el secret token si está configurado

## 🐛 Troubleshooting

### Los botones no funcionan

1. Verifica que el webhook esté configurado con `allowed_updates: ["message", "callback_query"]`
2. Revisa los logs del servidor para ver si los callbacks están llegando
3. Verifica que `/api/integrations/telegram/callback` esté accesible

### El mensaje no se actualiza

1. Verifica que el `messageId` se esté guardando correctamente
2. Revisa que `editTelegramMessage` esté funcionando
3. Verifica que el `chatId` y `messageId` sean correctos

### Error "No autorizado"

- Verifica que el `telegram_chat_id` de la tienda coincida con el chat que hizo click
- Asegúrate de que la orden pertenezca a la tienda correcta

