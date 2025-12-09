# 🚀 Guía: Subir a GitHub y Deployar en Vercel

Esta guía te ayudará a subir tu proyecto a GitHub y conectarlo con Vercel para deployment automático.

## 📋 Prerequisitos

- Cuenta de GitHub
- Cuenta de Vercel (puedes crear una con tu cuenta de GitHub)
- Git instalado en tu computadora

## 🔧 Paso 1: Inicializar Git (si no lo has hecho)

Si tu proyecto no tiene Git inicializado:

```bash
# En la raíz del proyecto
git init
```

## 📤 Paso 2: Subir a GitHub

### Opción A: Crear Repositorio Nuevo en GitHub

1. **Ve a [GitHub](https://github.com) y crea un nuevo repositorio:**
   - Haz clic en el botón "+" en la esquina superior derecha
   - Selecciona "New repository"
   - Nombre: `4joint` (o el que prefieras)
   - Descripción: "Mercado multivendedor 420 en México"
   - **NO marques** "Initialize this repository with a README" (ya tienes uno)
   - Haz clic en "Create repository"

2. **Conecta tu repositorio local con GitHub:**

```bash
# Agrega todos los archivos
git add .

# Haz tu primer commit
git commit -m "Initial commit: 4joint marketplace"

# Agrega el remoto de GitHub (reemplaza USERNAME con tu usuario)
git remote add origin https://github.com/USERNAME/4joint.git

# Cambia a la rama main (si estás en otra)
git branch -M main

# Sube el código
git push -u origin main
```

### Opción B: Si ya tienes un repositorio en GitHub

```bash
# Agrega el remoto (reemplaza con tu URL)
git remote add origin https://github.com/USERNAME/4joint.git

# Sube el código
git add .
git commit -m "Initial commit: 4joint marketplace"
git push -u origin main
```

## 🚀 Paso 3: Conectar con Vercel

### Método 1: Desde Vercel Dashboard (Recomendado)

1. **Ve a [Vercel](https://vercel.com)**
   - Inicia sesión con tu cuenta de GitHub

2. **Importa tu proyecto:**
   - Haz clic en "Add New..." → "Project"
   - Selecciona "Import Git Repository"
   - Busca y selecciona tu repositorio `4joint`
   - Haz clic en "Import"

3. **Configura el proyecto:**
   - **Framework Preset:** Next.js (debería detectarse automáticamente)
   - **Root Directory:** `./` (dejar por defecto)
   - **Build Command:** `npm run build` (debería estar por defecto)
   - **Output Directory:** `.next` (dejar por defecto)
   - Haz clic en "Deploy"

4. **Configura Variables de Entorno:**
   - Después del primer deploy, ve a **Settings** → **Environment Variables**
   - Agrega todas las variables de tu `.env.local`:
     ```
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY
     SUPABASE_SERVICE_ROLE_KEY
     NEXT_PUBLIC_SITE_URL=https://4joint.net
     MERCADOPAGO_ACCESS_TOKEN
     NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
     RESEND_API_KEY
     TELEGRAM_BOT_TOKEN
     TELEGRAM_CHAT_ID
     ```
   - **IMPORTANTE:** Marca todas las variables para "Production", "Preview", y "Development"

5. **Redeploy:**
   - Después de agregar las variables, ve a **Deployments**
   - Haz clic en los tres puntos del último deployment
   - Selecciona "Redeploy"

### Método 2: Usando Vercel CLI

```bash
# Instala Vercel CLI globalmente
npm i -g vercel

# Login en Vercel
vercel login

# Desde la raíz del proyecto, deploya
vercel

# Sigue las instrucciones interactivas
# Cuando pregunte por variables de entorno, puedes agregarlas después en el dashboard
```

## 🌐 Paso 4: Configurar Dominio 4joint.net

Una vez que el proyecto esté deployado en Vercel:

1. **Ve a Settings → Domains**
2. **Agrega el dominio:**
   - Haz clic en "Add Domain"
   - Ingresa `4joint.net`
   - Sigue las instrucciones de DNS

📖 **Guía completa:** Consulta [CONFIGURAR_DOMINIO_4JOINT.md](./CONFIGURAR_DOMINIO_4JOINT.md)

## ✅ Verificación

Después del deployment, verifica:

- [ ] El sitio está disponible en la URL de Vercel (ej: `4joint.vercel.app`)
- [ ] Las variables de entorno están configuradas
- [ ] El dominio `4joint.net` está conectado (si lo configuraste)
- [ ] El sitio carga correctamente
- [ ] La autenticación funciona
- [ ] Los productos se cargan desde Supabase

## 🔄 Deployment Automático

Una vez conectado, Vercel hará deployment automático cada vez que hagas push a la rama `main`:

```bash
# Hacer cambios
git add .
git commit -m "Descripción de los cambios"
git push origin main

# Vercel automáticamente detectará el push y hará un nuevo deployment
```

## 📝 Notas Importantes

1. **Nunca subas `.env.local` a GitHub:**
   - Ya está en `.gitignore`
   - Siempre configura las variables en Vercel Dashboard

2. **Variables de Entorno:**
   - Las variables que empiezan con `NEXT_PUBLIC_` son públicas (visibles en el cliente)
   - Las demás son privadas (solo en el servidor)

3. **Builds:**
   - Si un build falla, revisa los logs en Vercel Dashboard
   - Verifica que todas las dependencias estén en `package.json`

4. **Dominio:**
   - Vercel proporciona SSL automáticamente
   - Puede tomar hasta 24 horas para que el DNS se propague completamente

## 🐛 Solución de Problemas

### Build falla
- Revisa los logs en Vercel Dashboard
- Verifica que todas las dependencias estén instaladas
- Asegúrate de que `package.json` tenga todos los scripts necesarios

### Variables de entorno no funcionan
- Verifica que estén configuradas en Vercel Dashboard
- Asegúrate de que estén marcadas para "Production"
- Haz un redeploy después de agregar variables

### El sitio no carga
- Verifica que el build haya sido exitoso
- Revisa los logs de Vercel
- Verifica que las variables de entorno estén correctas

## 📚 Recursos Adicionales

- [Documentación de Vercel](https://vercel.com/docs)
- [Guía de Deployment](./DEPLOYMENT.md)
- [Configuración de Dominio](./CONFIGURAR_DOMINIO_4JOINT.md)

