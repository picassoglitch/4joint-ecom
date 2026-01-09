# Fix: EXCLUDED_PAYMENT_TYPES_AND_IDS_ERROR

## ✅ Corrección Aplicada

Se agregó explícitamente `payment_methods` en la preferencia para asegurar que **TODOS** los métodos de pago estén disponibles:

```json
{
  "payment_methods": {
    "excluded_payment_methods": [],  // Vacío = permitir todos los métodos
    "excluded_payment_types": [],    // Vacío = permitir todos los tipos
    "installments": 12               // Permitir hasta 12 cuotas
  }
}
```

## 🔍 Posibles Causas del Error

El error `EXCLUDED_PAYMENT_TYPES_AND_IDS_ERROR` puede ocurrir por:

### 1. Restricciones en el Dashboard de Mercado Pago

**Verificar en Mercado Pago Dashboard:**
1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.mx/developers/panel)
2. Selecciona tu aplicación (N° 8839198636659965)
3. Ve a **Configuración** → **Medios de pago**
4. Verifica que **NO** haya métodos excluidos a nivel de aplicación
5. Si hay exclusiones, elimínalas o asegúrate de que sean solo para pruebas

### 2. Monto Muy Bajo

Algunos métodos de pago tienen montos mínimos:
- **Tarjetas de crédito**: Generalmente mínimo 1 MXN
- **Tarjetas de débito**: Generalmente mínimo 1 MXN
- **Efectivo (OXXO, 7-Eleven)**: Puede requerir montos mínimos más altos

**Solución:** El código ahora valida que el monto sea >= 1 MXN

### 3. Cuenta en Modo Prueba

Si tu cuenta está en modo prueba, algunos métodos pueden estar limitados.

**Verificar:**
- Las credenciales que estás usando (producción vs prueba)
- En el Dashboard, verifica el estado de tu aplicación

### 4. Configuración de la Cuenta

Algunas cuentas tienen restricciones por:
- Tipo de negocio
- País
- Verificación pendiente

**Solución:** Verifica en el Dashboard que tu cuenta esté completamente verificada

## 📋 Checklist de Verificación

- [x] ✅ `payment_methods` agregado explícitamente con exclusiones vacías
- [x] ✅ Validación de monto mínimo (>= 1 MXN)
- [x] ✅ `statement_descriptor` válido (máximo 13 caracteres)
- [ ] ⚠️ Verificar en Dashboard que no haya exclusiones a nivel de aplicación
- [ ] ⚠️ Verificar que la cuenta esté verificada
- [ ] ⚠️ Verificar que las credenciales sean de producción (no prueba)

## 🔧 Debugging

### Ver el Payload Exacto

En desarrollo, el código ahora imprime el payload completo en la consola:

```javascript
console.log('📤 Preference payload:', JSON.stringify(preferencePayload, null, 2));
```

Revisa los logs del servidor para ver exactamente qué se está enviando a Mercado Pago.

### Verificar Respuesta de Mercado Pago

Si el error persiste, revisa la respuesta completa de Mercado Pago en los logs:

```javascript
console.error('❌ Mercado Pago preference error:', mpJson);
```

Esto te dará más detalles sobre qué método específico está siendo excluido y por qué.

## 🚀 Próximos Pasos

1. **Reinicia el servidor** para cargar los cambios
2. **Intenta crear un pago** nuevamente
3. **Revisa los logs** para ver el payload exacto
4. **Si el error persiste:**
   - Verifica en el Dashboard de Mercado Pago que no haya exclusiones
   - Contacta a Mercado Pago soporte con el `payment_id` o `preference_id` que falla
   - Proporciona el error completo y el payload que enviaste

## 📞 Soporte Mercado Pago

Si el problema persiste después de verificar todo lo anterior:

1. Ve a [Soporte de Mercado Pago](https://www.mercadopago.com.mx/developers/support)
2. Proporciona:
   - Tu User ID: `1243156223`
   - N° de aplicación: `8839198636659965`
   - El error completo: `EXCLUDED_PAYMENT_TYPES_AND_IDS_ERROR`
   - El `preference_id` que falla (si lo tienes)


