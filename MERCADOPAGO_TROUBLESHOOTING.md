# 🔧 Solución de Problemas - Mercado Pago

## Error: "PolicyAgent" / "UNAUTHORIZED_RESULT_FROM_POLICIES"

Este error indica que Mercado Pago está bloqueando la creación de preferencias debido a políticas de seguridad.

### Soluciones:

#### 1. Verificar Credenciales

Asegúrate de que tus credenciales estén correctas en `.env.local`:

```env
MERCADOPAGO_ACCESS_TOKEN=tu_access_token_aqui
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=tu_public_key_aqui
```

**Importante:**
- El `ACCESS_TOKEN` debe ser un token de producción o sandbox válido
- Verifica que no haya espacios extra o caracteres especiales
- Asegúrate de que el token no haya expirado

#### 2. Verificar Tipo de Cuenta

**Modo Sandbox (Pruebas):**
- Usa credenciales de sandbox
- Los tokens de sandbox empiezan con `TEST-` o tienen un formato específico
- Solo funciona con tarjetas de prueba

**Modo Producción:**
- Necesitas credenciales de producción
- Requiere verificación de cuenta completa
- Funciona con pagos reales

#### 3. Verificar Configuración en Mercado Pago Dashboard

1. Ve a https://www.mercadopago.com.mx/developers/panel
2. Selecciona tu aplicación
3. Verifica:
   - **Estado de la aplicación:** Debe estar activa
   - **Permisos:** Debe tener permisos para crear preferencias
   - **IPs permitidas:** Si tienes restricciones de IP, agrega tu IP del servidor
   - **Webhooks:** Configura el webhook URL correctamente

#### 4. Verificar Políticas de Seguridad

En el panel de Mercado Pago:
1. Ve a **Configuración** → **Seguridad**
2. Verifica que no haya políticas que bloqueen tu aplicación
3. Si estás en modo sandbox, asegúrate de estar usando credenciales de sandbox

#### 5. Regenerar Credenciales

Si las credenciales están expiradas o son inválidas:

1. Ve al panel de desarrolladores de Mercado Pago
2. Selecciona tu aplicación
3. Ve a **Credenciales**
4. Genera nuevas credenciales
5. Actualiza `.env.local` con las nuevas credenciales
6. Reinicia el servidor de desarrollo

#### 6. Verificar que el Access Token sea Correcto

Ejecuta este comando para verificar (reemplaza con tu token):

```bash
curl -X GET "https://api.mercadopago.com/v1/payment_methods" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN_AQUI"
```

Si recibes un error 401, el token es inválido.

#### 7. Solución Temporal: Usar Modo COD

Si Mercado Pago no funciona, puedes:
1. Usar solo "Contra Entrega" (COD) como método de pago
2. Deshabilitar temporalmente Mercado Pago en el checkout
3. Resolver el problema de credenciales y luego habilitarlo

### Verificación Rápida

Ejecuta este script en Node.js para verificar tus credenciales:

```javascript
const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

const preference = new Preference(client);

// Intentar crear una preferencia de prueba
preference.create({
  body: {
    items: [{
      title: 'Test',
      quantity: 1,
      unit_price: 10,
      currency_id: 'MXN',
    }],
  }
}).then(response => {
  console.log('✅ Credenciales válidas:', response.id);
}).catch(error => {
  console.error('❌ Error:', error.message);
  console.error('Detalles:', error);
});
```

### Contacto con Soporte

Si el problema persiste:
1. Contacta al soporte de Mercado Pago
2. Proporciona el código de error: `PA_UNAUTHORIZED_RESULT_FROM_POLICIES`
3. Incluye el ID de tu aplicación de Mercado Pago

### Notas Importantes

- **Sandbox vs Producción:** Asegúrate de usar las credenciales correctas según el entorno
- **IPs Bloqueadas:** Si tu servidor tiene una IP fija, agrégalo a las IPs permitidas en Mercado Pago
- **Rate Limits:** Mercado Pago tiene límites de requests. Si excedes el límite, espera unos minutos
- **Cuenta Verificada:** En producción, tu cuenta debe estar completamente verificada

