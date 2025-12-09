# Troubleshooting Guide para 4joint

## Error: "Invalid login credentials"

Este error ocurre cuando las credenciales de inicio de sesión son incorrectas o el usuario no existe.

### Soluciones:

1. **Verifica que el usuario existe:**
   - Ve a Supabase Dashboard > Authentication > Users
   - Busca el email que estás intentando usar
   - Si no existe, créalo manualmente o regístrate primero

2. **Crea un usuario de prueba:**
   - Ve a Authentication > Users > Add User
   - Ingresa email y contraseña
   - Marca "Auto Confirm User" si quieres que esté verificado automáticamente
   - Clic en "Create User"

3. **Verifica la configuración de Email:**
   - Ve a Authentication > Providers > Email
   - Asegúrate de que "Enable Email Provider" esté activado
   - Si "Confirm email" está activado, el usuario debe verificar su email antes de poder iniciar sesión

4. **Prueba con un usuario nuevo:**
   - Usa el formulario de registro en la app
   - Crea una cuenta nueva
   - Luego intenta iniciar sesión con esas credenciales

### Crear Usuario de Prueba desde Supabase Dashboard:

1. Ve a tu proyecto en Supabase
2. Navega a Authentication > Users
3. Clic en "Add User" o "Invite User"
4. Completa:
   - Email: `test@4joint.net` (o cualquier email)
   - Password: `test123456` (mínimo 6 caracteres)
   - Marca "Auto Confirm User" para evitar verificación de email
5. Clic en "Create User"
6. Ahora puedes iniciar sesión con estas credenciales

## Error: "Auth session missing"

Este error generalmente se resuelve:
- Limpiando el localStorage del navegador
- Cerrando y abriendo el navegador
- Verificando que las variables de entorno estén configuradas correctamente

## Error: "Missing Supabase environment variables"

1. Verifica que `.env.local` existe en la raíz del proyecto
2. Verifica que contiene:
   ```
   NEXT_PUBLIC_SUPABASE_URL=tu_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
   ```
3. Reinicia el servidor de desarrollo después de agregar variables

## Error: "Row Level Security policy violation"

1. Verifica que el usuario esté autenticado
2. Revisa las políticas RLS en Supabase Dashboard > Authentication > Policies
3. Asegúrate de que las políticas permitan las operaciones necesarias

## Error: Storage upload fails

1. Verifica que el bucket `product-images` existe
2. Verifica que las políticas de Storage están configuradas
3. Asegúrate de que el usuario esté autenticado antes de subir

## Verificar Configuración de Supabase

### Checklist rápido:

- [ ] Variables de entorno configuradas en `.env.local`
- [ ] Bucket `product-images` creado en Storage
- [ ] Políticas de Storage configuradas
- [ ] Schema SQL ejecutado (tablas creadas)
- [ ] Email provider habilitado en Authentication
- [ ] Al menos un usuario de prueba creado
- [ ] Realtime habilitado para tablas `vendors` y `orders`

## Contacto y Soporte

Si los problemas persisten:
1. Revisa los logs en Supabase Dashboard > Logs
2. Revisa la consola del navegador para errores detallados
3. Verifica la documentación de Supabase: https://supabase.com/docs

