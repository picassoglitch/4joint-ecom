# Mercado Pago - Credenciales de Producción

## ✅ Credenciales Configuradas

### Credenciales de Producción

```
Public Key: APP_USR-b62c2b9e-e8c4-458a-a850-f12a604850c4
Access Token: APP_USR-2471869463223778-010819-6e9f17a960618c6cc0908d88cb5da0a9-3052668204
User ID: 1243156223
N° de aplicación: 8839198636659965
Producto integrado: Checkout Pro
```

## Variables de Entorno

### Para Desarrollo (.env.local)

```bash
# Mercado Pago - Producción
MP_ACCESS_TOKEN=APP_USR-2471869463223778-010819-6e9f17a960618c6cc0908d88cb5da0a9-3052668204
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-b62c2b9e-e8c4-458a-a850-f12a604850c4

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Para Producción (Vercel)

Configura estas variables en Vercel Dashboard:

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:

```
MP_ACCESS_TOKEN = APP_USR-2471869463223778-010819-6e9f17a960618c6cc0908d88cb5da0a9-3052668204
NEXT_PUBLIC_MP_PUBLIC_KEY = APP_USR-b62c2b9e-e8c4-458a-a850-f12a604850c4
NEXT_PUBLIC_SITE_URL = https://4joint.net
```

**⚠️ IMPORTANTE:**
- `MP_ACCESS_TOKEN` es **SECRETO** - solo se usa en el servidor
- `NEXT_PUBLIC_MP_PUBLIC_KEY` es **PÚBLICO** - seguro de exponer en el cliente
- `NEXT_PUBLIC_SITE_URL` debe ser `https://4joint.net` en producción

## Configuración de Webhooks

### Paso 1: Configurar Webhook en Mercado Pago Dashboard

1. Ve a tu [Dashboard de Mercado Pago](https://www.mercadopago.com.mx/developers/panel)
2. Selecciona tu aplicación (N° 8839198636659965)
3. Ve a **Webhooks** en el menú lateral
4. Haz clic en **Configurar Webhooks**
5. Agrega la URL de tu webhook:

```
https://4joint.net/api/mercadopago/webhook
```

6. Selecciona los eventos a recibir:
   - ✅ **payment** (creado)
   - ✅ **payment** (actualizado)

7. Guarda la configuración

### Paso 2: Verificar que el Webhook Funciona

El webhook está configurado en:
- **Ruta:** `/api/mercadopago/webhook`
- **Método:** POST
- **Funcionalidad:**
  - Recibe notificaciones de Mercado Pago
  - Obtiene detalles del pago desde la API de Mercado Pago
  - Actualiza el estado de la orden en la base de datos
  - Retorna 200 para confirmar recepción

### Paso 3: Probar el Webhook

1. Realiza un pago de prueba en tu sitio
2. Verifica en los logs de Vercel que el webhook recibió la notificación
3. Verifica que la orden se actualizó en tu base de datos

## Endpoints Configurados

### 1. Crear Preferencia
- **Ruta:** `/api/mp/preference`
- **Método:** POST
- **Body:**
  ```json
  {
    "items": [
      {
        "title": "Producto",
        "quantity": 1,
        "unit_price": 100
      }
    ],
    "total": 100,
    "orderId": "order-123"
  }
  ```
- **Response:**
  ```json
  {
    "preferenceId": "1234567890-abc-def-ghi"
  }
  ```

### 2. Webhook de Notificaciones
- **Ruta:** `/api/mercadopago/webhook`
- **Método:** POST
- **Configurado en:** Mercado Pago Dashboard
- **URL:** `https://4joint.net/api/mercadopago/webhook`

## Flujo Completo

1. **Usuario inicia pago:**
   - Frontend llama a `/api/mp/preference`
   - Backend crea preferencia con `notification_url`
   - Retorna `preferenceId`

2. **Usuario completa pago:**
   - Mercado Pago procesa el pago
   - Mercado Pago envía notificación a `/api/mercadopago/webhook`
   - Webhook actualiza orden en base de datos

3. **Usuario es redirigido:**
   - A `/checkout/success` si el pago fue aprobado
   - A `/checkout/failure` si fue rechazado
   - A `/checkout/pending` si está pendiente

## Verificación de Configuración

### ✅ Checklist de Producción

- [ ] Variables de entorno configuradas en Vercel
- [ ] `NEXT_PUBLIC_SITE_URL` es `https://4joint.net`
- [ ] Webhook configurado en Mercado Pago Dashboard
- [ ] URL del webhook es `https://4joint.net/api/mercadopago/webhook`
- [ ] Eventos de webhook configurados (payment created/updated)
- [ ] Probar pago de prueba y verificar webhook funciona
- [ ] Verificar que órdenes se actualizan correctamente

## Troubleshooting

### Webhook no recibe notificaciones

1. Verifica que la URL del webhook sea accesible públicamente
2. Verifica que el endpoint retorne 200 (no 500)
3. Revisa los logs de Vercel para ver si hay errores
4. Verifica que el Access Token sea válido

### Preferencia no se crea

1. Verifica que `MP_ACCESS_TOKEN` esté configurado
2. Verifica que el Access Token sea válido y no haya expirado
3. Revisa los logs del servidor para ver errores de Mercado Pago

### Payment Brick no carga

1. Verifica que `NEXT_PUBLIC_MP_PUBLIC_KEY` esté configurado
2. Verifica que la Public Key sea válida
3. Revisa la consola del navegador para errores

## Soporte

Para problemas con las credenciales:
- Verifica en el [Dashboard de Mercado Pago](https://www.mercadopago.com.mx/developers/panel)
- Revisa la [documentación oficial](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/integration-test/test-cards)

