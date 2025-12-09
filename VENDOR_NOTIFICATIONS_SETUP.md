# Configuración de Notificaciones para Vendedores

Este documento explica cómo configurar las notificaciones por email y Telegram para vendedores cuando reciben nuevas órdenes.

## Requisitos

1. **Email**: Configurar Resend API (o similar)
2. **Telegram**: Crear un bot de Telegram y obtener el token

## Configuración de Email (Resend)

1. Crea una cuenta en [Resend](https://resend.com)
2. Obtén tu API key desde el dashboard (formato: `re_xxxxxxxxxxxxx`)
3. Agrega la variable de entorno a tu `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**Nota**: Si no configuras Resend, las notificaciones por email se omitirán silenciosamente. El sistema seguirá funcionando pero solo enviará notificaciones por Telegram.

## Configuración de Telegram

### Paso 1: Bot de Telegram (Ya Configurado ✅)

Tu bot de Telegram ya está configurado con el token:
```
8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU
```

**Nota**: Si necesitas crear un nuevo bot en el futuro, busca `@BotFather` en Telegram y sigue las instrucciones.

### Paso 2: Obtener Chat ID del Grupo

Ya agregaste el bot a un grupo. Ahora necesitas obtener el `chat_id` del grupo:

1. **Envía un mensaje al grupo** (cualquier mensaje, por ejemplo: "test")
2. **Visita esta URL** en tu navegador:
   ```
   https://api.telegram.org/bot8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU/getUpdates
   ```
3. **Busca en la respuesta JSON** el objeto con `"type": "group"` o `"type": "supergroup"`
4. **El `chat.id` será un número negativo** (por ejemplo: `-1001234567890` o `-987654321`)
5. **Copia ese número** (incluyendo el signo negativo)

**Ejemplo de lo que buscar:**
```json
{
  "message": {
    "chat": {
      "id": -1001234567890,  // <-- Este es el chat_id del grupo
      "title": "Nombre del Grupo",
      "type": "group"  // o "supergroup"
    }
  }
}
```

**Nota**: El JSON que compartiste muestra un chat privado (`"type": "private"` con `id: 8027256689`). Necesitas buscar el objeto del grupo, que tendrá un `id` negativo.

**Ver también**: `GET_TELEGRAM_CHAT_ID.md` para instrucciones más detalladas.

### Paso 3: Obtener Chat ID del Grupo

1. Envía un mensaje al grupo de Telegram donde agregaste el bot
2. Visita esta URL en tu navegador:
   ```
   https://api.telegram.org/bot8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU/getUpdates
   ```
3. Busca en la respuesta JSON el objeto con `"type": "group"` o `"type": "supergroup"`
4. El `chat.id` será un número negativo (ejemplo: `-1001234567890`)
5. Copia ese número (incluyendo el signo negativo)

**Ver también**: `GET_TELEGRAM_CHAT_ID.md` para instrucciones detalladas.

### Paso 4: Configurar Variables de Entorno

Agrega estas variables a tu `.env.local`:

```env
# Resend API Key (obtén una en https://resend.com)
# Formato: re_xxxxxxxxxxxxx
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Telegram Bot Configuration
# Token del bot (ya configurado)
TELEGRAM_BOT_TOKEN=8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU

# Chat ID del grupo "4joint-orders" (ya obtenido)
TELEGRAM_CHAT_ID=-4910459403
```

**Importante**: 
- Reemplaza `re_xxxxxxxxxxxxx` con tu API key real de Resend
- Reemplaza `-1001234567890` con el chat_id real de tu grupo (obténlo del Paso 2)

### Paso 5: Ejecutar Migración

Ejecuta la migración en Supabase SQL Editor:

```sql
-- Ver: supabase/migration_vendor_telegram.sql
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(100);
```

## Configuración por Vendedor

Si quieres que cada vendedor reciba notificaciones en su propio chat de Telegram:

1. El vendedor inicia conversación con el bot
2. Obtén su `chat.id` usando `getUpdates`
3. Actualiza la tabla `vendors` en Supabase:

```sql
UPDATE vendors 
SET telegram_chat_id = '123456789' 
WHERE id = 'vendor-uuid-here';
```

## Cómo Funciona

Cuando se crea una nueva orden:

1. El sistema llama a `/api/notify-vendor`
2. Se obtienen los detalles de la orden y el vendedor
3. Se envía un email al correo registrado del vendedor
4. Se envía un mensaje de Telegram al `telegram_chat_id` del vendedor (o al chat general si no tiene uno específico)

## Formato de Notificaciones

### Email
- **Asunto**: `🛒 Nueva Orden #XXXXXX - 4joint`
- **Contenido**: Detalles completos de la orden con formato HTML

### Telegram
- **Mensaje**: Detalles de la orden con formato de texto plano
- Incluye: ID de orden, total, productos, información del cliente, dirección, etc.

## Solución de Problemas

### Email no se envía
- Verifica que `RESEND_API_KEY` esté configurado
- Revisa los logs del servidor para errores
- Verifica que el dominio esté verificado en Resend

### Telegram no funciona
- Verifica que `TELEGRAM_BOT_TOKEN` sea correcto
- Verifica que el bot esté agregado al grupo/chat
- Verifica que `telegram_chat_id` esté correcto en la base de datos
- Prueba enviando un mensaje manual: `https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>&text=test`

## Alternativas

Si no quieres usar Resend para email, puedes:
- Usar Supabase Edge Functions con SendGrid
- Usar Mailgun
- Usar AWS SES
- Modificar `app/api/notify-vendor/route.js` para usar otro servicio

