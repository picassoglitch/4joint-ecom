# 📝 Guía Paso a Paso: Configurar Variables de Entorno en Vercel

## 🎯 Objetivo

Agregar las variables de entorno de Mercado Pago (y otras necesarias) en Vercel para que funcionen en producción.

---

## 📋 Paso 1: Acceder a Vercel Dashboard

1. Ve a [https://vercel.com](https://vercel.com)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto **4joint** (o el nombre que tenga tu proyecto)

---

## 📋 Paso 2: Ir a Settings → Environment Variables

1. En la página de tu proyecto, haz clic en **Settings** (Configuración) en el menú superior
2. En el menú lateral izquierdo, haz clic en **Environment Variables** (Variables de Entorno)

---

## 📋 Paso 3: Agregar Variables de Mercado Pago

Para cada variable, sigue estos pasos:

### Variable 1: MERCADOPAGO_ACCESS_TOKEN

1. Haz clic en el botón **Add New** (Agregar Nueva)
2. En el campo **Key** (Clave), escribe exactamente:
   ```
   MERCADOPAGO_ACCESS_TOKEN
   ```
3. En el campo **Value** (Valor), pega:
   ```
   APP_USR-3727099472713705-010815-bdff7b8923a3d8d25726e412128fb4f6-1243156223
   ```
4. Marca las casillas para los entornos:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development**
5. Haz clic en **Save** (Guardar)

### Variable 2: NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY

1. Haz clic en **Add New** nuevamente
2. **Key**: 
   ```
   NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
   ```
3. **Value**:
   ```
   APP_USR-3cb1e601-a891-4742-9295-176d43914d1f
   ```
4. Marca las casillas:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development**
5. Haz clic en **Save**

### Variable 3: NEXT_PUBLIC_SITE_URL (si no existe)

1. Haz clic en **Add New**
2. **Key**:
   ```
   NEXT_PUBLIC_SITE_URL
   ```
3. **Value**:
   ```
   https://4joint.net
   ```
4. Marca las casillas:
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development**
5. Haz clic en **Save**

---

## 📋 Paso 4: Verificar Variables Existentes

Asegúrate de que también tengas estas variables configuradas:

### Variables de Supabase (si no existen, agrégalas):

- `NEXT_PUBLIC_SUPABASE_URL` = tu URL de Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu clave anónima de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` = tu clave de servicio de Supabase

### Otras variables importantes:

- `RESEND_API_KEY` = `re_DRJZMp9c_4c2eXFBtaa3bKRo4f74fYJvX`
- `TELEGRAM_BOT_TOKEN` = `8501718133:AAEnmlFhPe04-0WjebhYwxOoSTbtnUg_HOU`
- `TELEGRAM_CHAT_ID` = `-4910459403`

---

## 📋 Paso 5: Redeploy (MUY IMPORTANTE)

Después de agregar las variables, **DEBES hacer un redeploy** para que los cambios surtan efecto:

### Opción A: Redeploy desde Deployments

1. Ve a la pestaña **Deployments** (Despliegues) en el menú superior
2. Encuentra el último deployment
3. Haz clic en los **tres puntos** (⋯) a la derecha del deployment
4. Selecciona **Redeploy** (Redesplegar)
5. Confirma el redeploy

### Opción B: Redeploy desde Settings

1. Ve a **Settings** → **Environment Variables**
2. Después de agregar todas las variables, verás un mensaje que dice algo como:
   > "Changes to environment variables require a new deployment"
3. Haz clic en el botón **Redeploy** que aparece

---

## ✅ Verificación Final

Después del redeploy, verifica:

1. **Build exitoso**: El deployment debe completarse sin errores
2. **Sitio funcionando**: Visita `https://4joint.net` y verifica que carga
3. **Mercado Pago funcionando**: 
   - Agrega productos al carrito
   - Ve al checkout
   - Selecciona "Mercado Pago"
   - Verifica que te redirija a Mercado Pago

---

## 🐛 Problemas Comunes

### ❌ "Variable not found" o "Missing environment variable"

**Solución:**
- Verifica que el nombre de la variable sea **exactamente** igual (case-sensitive)
- Asegúrate de haber marcado **Production** en los entornos
- Haz un **Redeploy** después de agregar las variables

### ❌ El sitio no carga después del redeploy

**Solución:**
1. Revisa los logs del deployment en Vercel
2. Verifica que todas las variables estén correctamente escritas
3. Asegúrate de que `NEXT_PUBLIC_SITE_URL` esté configurado

### ❌ Mercado Pago no funciona

**Solución:**
1. Verifica que `MERCADOPAGO_ACCESS_TOKEN` esté correctamente configurado
2. Verifica que `NEXT_PUBLIC_SITE_URL` sea `https://4joint.net` (no `http://`)
3. Revisa los logs del servidor en Vercel para ver errores

---

## 📸 Ejemplo Visual de la Interfaz

```
┌─────────────────────────────────────────┐
│  Vercel Dashboard                       │
│                                         │
│  [Settings] [Deployments] [Analytics]   │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Environment Variables             │ │
│  │                                   │ │
│  │  [Add New]                        │ │
│  │                                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │ Key: MERCADOPAGO_ACCESS_... │ │ │
│  │  │ Value: APP_USR-3727099...   │ │ │
│  │  │ ☑ Production                │ │ │
│  │  │ ☑ Preview                    │ │ │
│  │  │ ☑ Development                │ │ │
│  │  │ [Save] [Cancel]              │ │ │
│  │  └─────────────────────────────┘ │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 🎯 Resumen Rápido

1. ✅ Ve a **Settings** → **Environment Variables**
2. ✅ Agrega `MERCADOPAGO_ACCESS_TOKEN` con el valor completo
3. ✅ Agrega `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` con el valor completo
4. ✅ Verifica que `NEXT_PUBLIC_SITE_URL` sea `https://4joint.net`
5. ✅ Marca todas las variables para **Production**, **Preview**, y **Development**
6. ✅ Haz un **Redeploy**
7. ✅ Verifica que todo funcione

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas:
1. Revisa los logs del deployment en Vercel
2. Verifica que los nombres de las variables sean exactos
3. Asegúrate de haber hecho el redeploy después de agregar las variables

¡Listo! 🚀

