# Configuración de Emails Personalizados en Supabase

Esta guía explica cómo configurar los emails de Supabase para que parezcan venir de tu marca en lugar de Supabase.

## 1. Acceder a la Configuración de Auth en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** → **Email Templates**
3. O ve a **Project Settings** → **Auth** → **Email Templates**

## 2. Personalizar Plantillas de Email

Supabase permite personalizar las siguientes plantillas:

- **Confirm signup** - Email de confirmación de registro
- **Magic Link** - Enlace mágico para iniciar sesión
- **Change Email Address** - Cambio de email
- **Reset Password** - Recuperación de contraseña
- **Invite user** - Invitación de usuario

### Plantilla de Confirmación de Registro (Confirm signup)

**Asunto (Subject):**
```
Confirma tu cuenta en [Tu Nombre de Marca]
```

**Contenido (Body):**
```html
<h2>¡Bienvenido a [Tu Nombre de Marca]!</h2>
<p>Gracias por registrarte. Por favor, confirma tu email haciendo clic en el siguiente enlace:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar mi email</a></p>
<p>Si no solicitaste esta cuenta, puedes ignorar este email.</p>
<p>Saludos,<br>El equipo de [Tu Nombre de Marca]</p>
```

## 3. Configurar Remitente y Dominio

### Opción A: Usar el Dominio de Supabase (Gratis, Limitado)

1. Ve a **Project Settings** → **Auth** → **SMTP Settings**
2. El remitente por defecto será `noreply@mail.app.supabase.io`
3. Puedes personalizar el nombre del remitente en las plantillas

### Opción B: Configurar SMTP Personalizado (Recomendado)

Para que los emails parezcan venir completamente de tu dominio:

1. Ve a **Project Settings** → **Auth** → **SMTP Settings**
2. Habilita **Custom SMTP**
3. Configura los siguientes valores:

**Para Gmail/Google Workspace:**
- **Host:** `smtp.gmail.com`
- **Port:** `587`
- **Username:** Tu email de Gmail
- **Password:** Contraseña de aplicación (no tu contraseña normal)
  - Genera una en: [Google App Passwords](https://myaccount.google.com/apppasswords)
- **Sender email:** `noreply@tudominio.com` o `hola@tudominio.com`
- **Sender name:** `[Tu Nombre de Marca]`

**Para SendGrid:**
- **Host:** `smtp.sendgrid.net`
- **Port:** `587`
- **Username:** `apikey`
- **Password:** Tu API key de SendGrid
- **Sender email:** `noreply@tudominio.com`
- **Sender name:** `[Tu Nombre de Marca]`

**Para Mailgun:**
- **Host:** `smtp.mailgun.org`
- **Port:** `587`
- **Username:** Tu SMTP username de Mailgun
- **Password:** Tu SMTP password de Mailgun
- **Sender email:** `noreply@tudominio.com`
- **Sender name:** `[Tu Nombre de Marca]`

## 4. Configurar URL de Redirección

Para que los usuarios sean redirigidos a tu página después de hacer clic en el enlace:

1. Ve a **Project Settings** → **Auth** → **URL Configuration**
2. En **Site URL**, coloca: `https://tudominio.com`
3. En **Redirect URLs**, agrega:
   - `https://tudominio.com/auth/verify-email`
   - `https://tudominio.com/auth/callback`
   - `http://localhost:3000/auth/verify-email` (para desarrollo)
   - `http://localhost:3000/auth/callback` (para desarrollo)

## 5. Variables Disponibles en Plantillas

Puedes usar estas variables en tus plantillas:

- `{{ .ConfirmationURL }}` - URL de confirmación
- `{{ .Email }}` - Email del usuario
- `{{ .Token }}` - Token de verificación
- `{{ .TokenHash }}` - Hash del token
- `{{ .SiteURL }}` - URL de tu sitio
- `{{ .RedirectTo }}` - URL de redirección

## 6. Ejemplo de Plantilla Completa Personalizada

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #00C6A2 0%, #00B894 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: #f9f9f9;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .button {
      display: inline-block;
      background: #00C6A2;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>[Tu Nombre de Marca]</h1>
    </div>
    <div class="content">
      <h2>¡Bienvenido!</h2>
      <p>Gracias por registrarte en [Tu Nombre de Marca]. Para completar tu registro, por favor confirma tu dirección de email haciendo clic en el siguiente botón:</p>
      <p style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">Confirmar mi Email</a>
      </p>
      <p>O copia y pega este enlace en tu navegador:</p>
      <p style="word-break: break-all; color: #00C6A2;">{{ .ConfirmationURL }}</p>
      <p>Si no solicitaste esta cuenta, puedes ignorar este email de forma segura.</p>
      <p>Saludos,<br>El equipo de [Tu Nombre de Marca]</p>
    </div>
    <div class="footer">
      <p>Este es un email automático, por favor no respondas a este mensaje.</p>
    </div>
  </div>
</body>
</html>
```

## 7. Verificar Configuración

1. Crea una cuenta de prueba
2. Revisa el email recibido
3. Verifica que:
   - El remitente muestra tu nombre de marca
   - El contenido es personalizado
   - El enlace redirige correctamente a tu sitio
   - El diseño se ve bien en diferentes clientes de email

## Notas Importantes

- Los cambios en las plantillas se aplican inmediatamente
- Los cambios en SMTP pueden tardar unos minutos en aplicarse
- Asegúrate de verificar tu dominio si usas SMTP personalizado
- Para producción, siempre usa SMTP personalizado con tu propio dominio
- Mantén las variables `{{ .ConfirmationURL }}` en las plantillas para que funcionen correctamente

## Soporte

Si tienes problemas con la configuración:
1. Revisa los logs en **Project Settings** → **Logs** → **Auth Logs**
2. Verifica que las URLs de redirección estén correctamente configuradas
3. Asegúrate de que tu dominio esté verificado si usas SMTP personalizado



