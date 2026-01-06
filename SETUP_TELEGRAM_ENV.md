# 🔧 Configurar Variables de Entorno de Telegram

## ⚡ Solución Rápida (2 minutos)

### Paso 1: Abre `.env.local`

Crea o edita el archivo `.env.local` en la **raíz del proyecto** (mismo nivel que `package.json`).

### Paso 2: Agrega estas líneas

```env
TELEGRAM_BOT_TOKEN=8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU
TELEGRAM_BOT_USERNAME=orders4jointbot
```

### Paso 3: Reinicia el servidor

```bash
# Detén el servidor (Ctrl+C)
npm run dev
```

### Paso 4: Prueba

1. Ve a **Store Settings** → **Notificaciones de Telegram**
2. Haz clic en **"Enviar Notificación de Prueba"**
3. Deberías recibir un mensaje en Telegram ✅

## 📍 Ubicación del Archivo

El archivo `.env.local` debe estar en:
```
4joint-ecom/
├── .env.local          ← AQUÍ
├── package.json
├── next.config.mjs
└── ...
```

## ✅ Verificación

Después de agregar las variables y reiniciar, cuando crees una orden deberías ver en los logs:

```
📬 Notification request received - Order: xxx, Vendor: yyy
📱 Attempting to send Telegram notification to vendor: yyy
✅ Telegram message sent successfully
```

**NO deberías ver:**
```
❌ TELEGRAM_BOT_TOKEN not configured
```

## 🔄 Para Producción (Vercel)

1. Ve a [Vercel Dashboard](https://vercel.com) → Tu Proyecto
2. **Settings** → **Environment Variables**
3. Agrega:
   - **Key**: `TELEGRAM_BOT_TOKEN`
   - **Value**: `8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU`
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
4. Agrega también:
   - **Key**: `TELEGRAM_BOT_USERNAME`
   - **Value**: `orders4jointbot`
5. Haz clic en **Save**
6. Ve a **Deployments** → **Redeploy**

## ❓ Preguntas Frecuentes

### ¿Necesito crear un bot para cada tienda?

**NO**. Usamos **UN SOLO BOT** (`@orders4jointbot`) para todas las tiendas. Cada tienda se conecta al mismo bot y recibe notificaciones en su propia conversación.

### ¿Necesito el chat_id de cada tienda?

**NO manualmente**. Cuando una tienda se conecta desde Store Settings, el sistema guarda automáticamente su `chat_id` en la base de datos.

### ¿Puedo configurar tiendas manualmente?

Sí, pero es opcional. Ver `TELEGRAM_TROUBLESHOOTING.md` para instrucciones.

## 🆘 Si Aún No Funciona

1. Verifica que el archivo se llame exactamente `.env.local` (con el punto al inicio)
2. Verifica que esté en la raíz del proyecto
3. Reinicia el servidor completamente (detén y vuelve a iniciar)
4. Revisa los logs del servidor para ver errores específicos

