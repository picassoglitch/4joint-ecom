# Mercado Pago - Configuración de Producción ✅

## 🔑 Credenciales de Producción

Las siguientes credenciales están configuradas para **PRODUCCIÓN**:

```env
# Mercado Pago - Producción
MERCADOPAGO_ACCESS_TOKEN=APP_USR-3727099472713705-010815-bdff7b8923a3d8d25726e412128fb4f6-1243156223
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-3cb1e601-a891-4742-9295-176d43914d1f
```

## 📋 Variables de Entorno Requeridas

Agrega estas variables a tu `.env.local` (desarrollo) y Vercel (producción):

```env
# Mercado Pago - Producción
MERCADOPAGO_ACCESS_TOKEN=APP_USR-3727099472713705-010815-bdff7b8923a3d8d25726e412128fb4f6-1243156223
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-3cb1e601-a891-4742-9295-176d43914d1f

# Site URL (IMPORTANTE para callbacks)
NEXT_PUBLIC_SITE_URL=https://4joint.net
```

## 🔧 Configuración en Vercel

1. Ve a **Vercel Dashboard** → Tu proyecto → **Settings** → **Environment Variables**
2. Agrega las siguientes variables:
   - `MERCADOPAGO_ACCESS_TOKEN` = `APP_USR-3727099472713705-010815-bdff7b8923a3d8d25726e412128fb4f6-1243156223`
   - `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` = `APP_USR-3cb1e601-a891-4742-9295-176d43914d1f`
   - `NEXT_PUBLIC_SITE_URL` = `https://4joint.net`
3. Marca todas para **Production**, **Preview**, y **Development**
4. Haz un **Redeploy** después de agregar las variables

## 🔗 Configurar Webhook en Mercado Pago

1. Ve a [Mercado Pago Dashboard](https://www.mercadopago.com.mx/developers/panel/app)
2. Selecciona tu aplicación **4jointecom**
3. Ve a **Webhooks** o **Notificaciones**
4. Configura la URL del webhook:
   ```
   https://4joint.net/api/mercadopago/webhook
   ```
5. Selecciona los eventos:
   - ✅ `payment`
   - ✅ `payment.created`
   - ✅ `payment.updated`

## ✅ Verificación

Después de configurar todo, verifica:

- [ ] Credenciales agregadas en `.env.local` (desarrollo)
- [ ] Credenciales agregadas en Vercel (producción)
- [ ] `NEXT_PUBLIC_SITE_URL` configurado como `https://4joint.net`
- [ ] Webhook configurado en Mercado Pago Dashboard
- [ ] Redeploy realizado en Vercel
- [ ] Probar un pago de prueba en producción

## 🧪 Probar en Producción

1. Ve a tu sitio en producción: `https://4joint.net`
2. Agrega productos al carrito
3. Selecciona **Mercado Pago** como método de pago
4. Completa el checkout
5. Serás redirigido a Mercado Pago para completar el pago
6. Después del pago, serás redirigido de vuelta a tu sitio

## 📝 Notas Importantes

- **Access Token**: Solo se usa en el servidor (nunca se expone al cliente)
- **Public Key**: Se puede usar en el cliente, pero no es necesario para Checkout Pro
- **Webhook**: Debe estar configurado para recibir notificaciones de pago
- **URLs de retorno**: Se configuran automáticamente usando `NEXT_PUBLIC_SITE_URL`

## 🐛 Troubleshooting

### Error: "Token de acceso inválido"
- Verifica que `MERCADOPAGO_ACCESS_TOKEN` esté correctamente configurado
- Asegúrate de usar las credenciales de **PRODUCCIÓN** (no sandbox)
- Reinicia el servidor después de agregar las variables

### Webhook no recibe notificaciones
- Verifica que la URL del webhook sea: `https://4joint.net/api/mercadopago/webhook`
- Asegúrate de que el webhook esté activo en Mercado Pago Dashboard
- Verifica los logs de Vercel para ver si el webhook está siendo llamado

### Redirect no funciona
- Verifica que `NEXT_PUBLIC_SITE_URL` esté configurado como `https://4joint.net`
- Asegúrate de que las URLs de retorno estén correctamente configuradas

## 📚 Recursos

- [Mercado Pago Dashboard](https://www.mercadopago.com.mx/developers/panel/app)
- [Documentación de Checkout Pro](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/landing)
- [Guía de Webhooks](https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks)

