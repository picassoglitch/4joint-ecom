<div align="center">
  <h1>🌿 4joint</h1>
  <p>
    Mercado multivendedor 420 en México. Plataforma de e-commerce moderna construida con Next.js y Tailwind CSS.
  </p>
  <p>
    <a href="./LICENSE.md"><img src="https://img.shields.io/github/license/4joint/4joint?style=for-the-badge" alt="License"></a>
    <a href="./CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge" alt="PRs Welcome"></a>
  </p>
</div>

---

## 📖 Tabla de Contenidos

- [✨ Características](#-características)
- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [🚀 Comenzar](#-comenzar)
- [🤝 Contribuir](#-contribuir)
- [📜 Licencia](#-licencia)

---

## ✨ Características

- **Arquitectura Multivendedor:** Permite que múltiples vendedores se registren, gestionen sus propios productos y vendan en una sola plataforma.
- **Tienda para Clientes:** Una interfaz de usuario hermosa y responsive para que los clientes naveguen y compren productos.
- **Paneles de Vendedor:** Dashboards dedicados para que los vendedores gestionen productos, vean análisis de ventas y rastreen pedidos.
- **Panel de Administración:** Un dashboard completo para que los administradores de la plataforma supervisen vendedores, productos y comisiones.
- **Tema 420 México:** Diseño moderno con paleta de colores mint (#00C6A2) y amarillo cálido (#FFD95E), tipografía redondeada y animaciones sutiles.
- **Verificación de Edad:** Modal de verificación 18+ con localStorage para recordar consentimiento.
- **Moneda MXN:** Configurado para pesos mexicanos.
- **Productos Semilla:** Incluye 5 productos de ejemplo: Aceite CBD 10%, Bong de Vidrio, Gominolas Hemp, Papel para Joints, Vaporizador.

## 🛠️ Stack Tecnológico <a name="-tech-stack"></a>

- **Framework:** Next.js 15
- **Estilos:** Tailwind CSS 4
- **Componentes UI:** Lucide React para iconos
- **Gestión de Estado:** Redux Toolkit
- **Animaciones:** Framer Motion
- **Gráficos:** Recharts
- **Internacionalización:** next-intl (Español MX)
- **Base de Datos:** Supabase (PostgreSQL con Realtime)
- **Autenticación:** Supabase Auth (Email/Password + Google OAuth)
- **Almacenamiento:** Supabase Storage (para imágenes de productos)

## 🚀 Comenzar <a name="-getting-started"></a>

### Instalación

Primero, instala las dependencias:

```bash
npm install
```

Luego, ejecuta el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver el resultado.

### 🌐 Dominio de Producción

El sitio está configurado para usar el dominio **4joint.net** en producción.

📖 **Guía de deployment:** Consulta [DEPLOYMENT.md](./DEPLOYMENT.md) y [CONFIGURAR_DOMINIO_4JOINT.md](./CONFIGURAR_DOMINIO_4JOINT.md) para instrucciones completas.

### Configuración Inicial

1. **Crea un archivo `.env.local`** en la raíz del proyecto (ver [ENV_VARIABLES_EXAMPLE.md](./ENV_VARIABLES_EXAMPLE.md))

2. **Configura Supabase:**
   - Crea un proyecto en [Supabase](https://supabase.com)
   - Ejecuta los scripts SQL en `supabase/` (schema.sql y migraciones)
   - Configura autenticación y OAuth
   - 📖 **Guía completa:** [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

3. **Configura Mercado Pago:**
   - Obtén tus credenciales de Mercado Pago
   - Agrega las variables de entorno
   - 📖 **Guía:** [MERCADOPAGO_SETUP.md](./MERCADOPAGO_SETUP.md)

4. **Configura Notificaciones (Opcional):**
   - Configura Resend para emails
   - Configura Telegram bot para notificaciones
   - 📖 **Guía:** [VENDOR_NOTIFICATIONS_SETUP.md](./VENDOR_NOTIFICATIONS_SETUP.md)

### Paleta de Colores

- **Primario:** #00C6A2 (Mint)
- **Acento:** #FFD95E (Amarillo Cálido)
- **Fondo:** #FAFAF6
- **Texto:** #1A1A1A

## ⚠️ Aviso Legal

**Productos hemp/CBD legales en México. Mayores de 18+. No THC >1%.**

Este proyecto es una plataforma de e-commerce para productos legales de cáñamo y CBD en México. Todos los productos deben cumplir con la legislación mexicana vigente.

---

## 🤝 Contribuir <a name="-contributing"></a>

¡Bienvenidas las contribuciones! Por favor, consulta nuestro [CONTRIBUTING.md](./CONTRIBUTING.md) para más detalles sobre cómo comenzar.

---

## 📜 Licencia <a name="-license"></a>

Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo [LICENSE.md](./LICENSE.md) para más detalles.

## 📚 Aprende Más

Para aprender más sobre Next.js, consulta los siguientes recursos:

- [Documentación de Next.js](https://nextjs.org/docs) - aprende sobre las características y API de Next.js.
- [Aprende Next.js](https://nextjs.org/learn) - un tutorial interactivo de Next.js.

Puedes revisar [el repositorio de Next.js en GitHub](https://github.com/vercel/next.js) - ¡tus comentarios y contribuciones son bienvenidos!
