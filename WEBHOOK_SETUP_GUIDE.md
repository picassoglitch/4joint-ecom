# Configuración de Webhooks - Mercado Pago

## 📋 Resumen

Los webhooks permiten que Mercado Pago notifique a tu servidor cuando ocurren eventos relacionados con pagos (creación, actualización, aprobación, etc.).

## 🔧 Configuración en Mercado Pago Dashboard

### Paso 1: Acceder al Dashboard

1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.mx/developers/panel)
2. Inicia sesión con tu cuenta
3. Selecciona tu aplicación: **N° 8839198636659965**

### Paso 2: Configurar Webhook

1. En el menú lateral, ve a **Webhooks**
2. Haz clic en **Configurar Webhooks** o **Agregar Webhook**
3. Completa el formulario:

   **URL del Webhook:**
   ```
   https://4joint.net/api/mercadopago/webhook
   ```

   **Eventos a recibir:**
   - ✅ **payment** (creado)
   - ✅ **payment** (actualizado)

4. Haz clic en **Guardar** o **Crear Webhook**

### Paso 3: Verificar Configuración

Después de guardar, deberías ver:
- ✅ Estado: **Activo**
- ✅ URL: `https://4joint.net/api/mercadopago/webhook`
- ✅ Eventos: payment (creado, actualizado)

## 🔍 Cómo Funciona

### Flujo de Notificaciones

1. **Usuario completa pago:**
   - Mercado Pago procesa el pago
   - Mercado Pago envía notificación POST a tu webhook

2. **Webhook recibe notificación:**
   - Endpoint: `/api/mercadopago/webhook`
   - Extrae el `payment_id` de la notificación
   - Obtiene detalles del pago desde la API de Mercado Pago

3. **Actualiza orden en base de datos:**
   - Busca la orden usando `external_reference` (orderId)
   - Actualiza estado: `approved`, `pending`, `rejected`, etc.
   - Guarda `payment_id` y `transaction_amount`

4. **Retorna 200:**
   - Confirma a Mercado Pago que recibiste la notificación
   - Evita reintentos innecesarios

## 📝 Formato de Notificaciones

Mercado Pago puede enviar notificaciones en diferentes formatos:

### Formato 1: Tipo "payment"
```json
{
  "type": "payment",
  "data": {
    "id": "1234567890"
  }
}
```

### Formato 2: Topic "payment"
```json
{
  "topic": "payment",
  "resource": "1234567890"
}
```

Nuestro webhook maneja ambos formatos automáticamente.

## ✅ Verificación

### Probar el Webhook

1. **Realiza un pago de prueba:**
   - Agrega items al carrito
   - Selecciona Mercado Pago
   - Completa el pago (usa tarjeta de prueba)

2. **Verifica en logs de Vercel:**
   - Ve a tu proyecto en Vercel
   - Abre **Logs**
   - Busca mensajes como:
     ```
     📥 Webhook received: { paymentId: '...', orderId: '...', status: 'approved' }
     ✅ Order updated: order-123
     ```

3. **Verifica en base de datos:**
   - La orden debe tener:
     - `payment_id` actualizado
     - `status` actualizado (ORDER_PAID si approved)
     - `is_paid: true` si el pago fue aprobado

## 🐛 Troubleshooting

### Webhook no recibe notificaciones

**Causas posibles:**
1. URL del webhook incorrecta
2. Webhook no está activo en Mercado Pago Dashboard
3. Endpoint retorna error (500) en lugar de 200

**Solución:**
1. Verifica la URL en Mercado Pago Dashboard
2. Verifica que el webhook esté **Activo**
3. Revisa logs de Vercel para ver errores
4. Asegúrate de que el endpoint retorne 200

### Webhook recibe notificaciones pero no actualiza órdenes

**Causas posibles:**
1. `external_reference` no coincide con `orderId`
2. Error al actualizar base de datos
3. Access Token inválido

**Solución:**
1. Verifica que `external_reference` en la preferencia sea el `orderId`
2. Revisa logs para ver errores de base de datos
3. Verifica que `MP_ACCESS_TOKEN` sea válido

### Notificaciones duplicadas

**Causa:**
- Mercado Pago puede enviar múltiples notificaciones para el mismo pago

**Solución:**
- El webhook ya maneja esto: verifica si el pago ya fue procesado antes de actualizar

## 📊 Monitoreo

### Ver Notificaciones en Mercado Pago Dashboard

1. Ve a **Webhooks** en tu aplicación
2. Haz clic en el webhook configurado
3. Verás un historial de notificaciones enviadas
4. Puedes ver:
   - Estado de cada notificación (enviada, recibida, error)
   - Timestamp
   - Respuesta del servidor

### Logs en Vercel

Revisa los logs de Vercel para ver:
- Notificaciones recibidas
- Errores al procesar
- Actualizaciones de órdenes exitosas

## 🔒 Seguridad

### Validación de Notificaciones

El webhook actual:
- ✅ Obtiene detalles del pago desde la API de Mercado Pago (verificación)
- ✅ Valida que `external_reference` exista
- ✅ Retorna 200 incluso si hay errores (evita reintentos infinitos)

### Mejoras Futuras (Opcional)

Puedes agregar:
- Validación de IP de Mercado Pago
- Verificación de firma de notificaciones
- Idempotencia (evitar procesar la misma notificación dos veces)

## 📚 Referencias

- [Documentación de Webhooks - Mercado Pago](https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks)
- [Dashboard de Mercado Pago](https://www.mercadopago.com.mx/developers/panel)

