# Actualizar Credenciales de Mercado Pago

## ⚠️ IMPORTANTE: Reinicia el servidor

Después de actualizar las credenciales en `.env.local`, **DEBES reiniciar el servidor** para que los cambios surtan efecto.

### Pasos:

1. **Detén el servidor** (Ctrl+C en la terminal donde corre `npm run dev`)

2. **Inicia el servidor nuevamente:**
   ```bash
   npm run dev
   ```

3. **Verifica que las nuevas credenciales estén cargadas:**
   - Intenta crear un pago
   - Si aún ves el error "invalid access token", verifica que:
     - Las credenciales estén correctamente escritas en `.env.local`
     - No haya espacios extra antes o después del `=`
     - El servidor se haya reiniciado completamente

## Credenciales Actualizadas

### Producción (Nuevas)

```bash
MP_ACCESS_TOKEN=APP_USR-2471869463223778-010819-6e9f17a960618c6cc0908d88cb5da0a9-3052668204
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-b62c2b9e-e8c4-458a-a850-f12a604850c4
```

### Verificación

Para verificar que las credenciales están correctas:

1. Abre `.env.local`
2. Busca estas líneas exactas (sin espacios extra):
   ```
   MP_ACCESS_TOKEN=APP_USR-2471869463223778-010819-6e9f17a960618c6cc0908d88cb5da0a9-3052668204
   NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-b62c2b9e-e8c4-458a-a850-f12a604850c4
   ```

3. Si están correctas, **reinicia el servidor**

## Si el error persiste

1. **Verifica que no haya variables duplicadas** en `.env.local`
2. **Elimina cualquier variable antigua** (`MERCADOPAGO_ACCESS_TOKEN` viejo)
3. **Reinicia el servidor completamente**
4. **Limpia la caché de Next.js:**
   ```bash
   rm -rf .next
   npm run dev
   ```

