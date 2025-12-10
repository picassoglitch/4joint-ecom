# Configuración de Mercado Pago

## Variables de Entorno

Agrega las siguientes variables a tu archivo `.env.local`:

```env
# Mercado Pago Configuration
MERCADOPAGO_ACCESS_TOKEN=APP_USR-2380007477498594-120822-d8c6b1e8c32283246dfd2ecd077d1faa-1243156223
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-bb9c706b-c33d-4581-86ba-88f69b1a14b2

# Site URL (importante para los callbacks)
NEXT_PUBLIC_SITE_URL=https://4joint.net
```

## Configuración en Mercado Pago

1. **Webhooks**: Configura el webhook en tu panel de Mercado Pago para que apunte a:
   ```
   https://4joint.net/api/mercadopago/webhook
   ```

2. **URLs de Retorno**: Las URLs de éxito, fallo y pendiente están configuradas automáticamente:
   - Éxito: `https://4joint.net/payment/success`
   - Fallo: `https://4joint.net/payment/failure`
   - Pendiente: `https://4joint.net/payment/pending`

## Flujo de Pago

1. El usuario selecciona "Mercado Pago" como método de pago
2. Se crea una orden en la base de datos con estado "pendiente"
3. Se crea una preferencia de pago en Mercado Pago
4. El usuario es redirigido a la página de pago de Mercado Pago
5. Después del pago, Mercado Pago redirige al usuario a la página de éxito/fallo
6. El webhook actualiza el estado de la orden cuando se completa el pago

## Notas

- **Producción**: Con credenciales de producción, el código usa automáticamente `init_point` (URL de producción)
- **Sandbox**: Si necesitas probar con sandbox, usa credenciales de sandbox y el código usará `init_point` que apuntará a sandbox
- El webhook debe ser configurado en el panel de Mercado Pago
- Asegúrate de que `NEXT_PUBLIC_SITE_URL` esté configurado correctamente para producción

## Solución de Problemas

Si encuentras errores como:
- `PolicyAgent` / `UNAUTHORIZED_RESULT_FROM_POLICIES`
- `401 Unauthorized`
- `403 Forbidden`

Revisa el archivo **`MERCADOPAGO_TROUBLESHOOTING.md`** para instrucciones detalladas de solución.

### Verificación Rápida

1. **Verifica que las credenciales estén en `.env.local`**
2. **Verifica que el Access Token sea válido** (no expirado)
3. **Verifica que estés usando el tipo correcto** (sandbox vs producción)
4. **Revisa el panel de Mercado Pago** para verificar el estado de tu aplicación

