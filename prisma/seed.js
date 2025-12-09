const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const sampleProducts = [
  {
    name: "Aceite CBD 10%",
    description: "Aceite de CBD de alta calidad con 10% de concentración. Producto legal en México, elaborado con cáñamo industrial. Perfecto para relajación y bienestar. Sin THC, 100% legal. Envase de 30ml con gotero incluido.",
    mrp: 899,
    price: 699,
    images: ["https://via.placeholder.com/400?text=Aceite+CBD"],
    category: "Aceite CBD",
    inStock: true,
  },
  {
    name: "Bong de Vidrio",
    description: "Bong de vidrio borosilicato de alta calidad. Diseño ergonómico con difusor de burbujas para una experiencia suave. Incluye bowl y downstem. Perfecto para uso con productos legales de cáñamo.",
    mrp: 599,
    price: 449,
    images: ["https://via.placeholder.com/400?text=Bong+Vidrio"],
    category: "Bongs",
    inStock: true,
  },
  {
    name: "Gominolas Hemp",
    description: "Gominolas de cáñamo con sabor natural. Cada gomita contiene 25mg de CBD. Pack de 30 unidades. Producto vegano, sin azúcar añadida. Perfecto para consumo diario de CBD de forma deliciosa.",
    mrp: 499,
    price: 399,
    images: ["https://via.placeholder.com/400?text=Gominolas+Hemp"],
    category: "Gominolas",
    inStock: true,
  },
  {
    name: "Papel para Joints",
    description: "Papel para enrollar de alta calidad, ultra delgado y natural. Pack de 50 hojas. Quema lenta y uniforme. Sin blanqueadores ni aditivos químicos. Ideal para productos de cáñamo legal.",
    mrp: 99,
    price: 79,
    images: ["https://via.placeholder.com/400?text=Papel+Joints"],
    category: "Papel para Joints",
    inStock: true,
  },
  {
    name: "Vaporizador Portátil",
    description: "Vaporizador portátil de última generación. Calentamiento por convección para sabor puro. Batería de larga duración. Pantalla OLED. Compatible con extractos de CBD y flores de cáñamo legal.",
    mrp: 2499,
    price: 1999,
    images: ["https://via.placeholder.com/400?text=Vaporizador"],
    category: "Vaporizadores",
    inStock: true,
  },
]

async function main() {
  console.log('🌿 Iniciando seed de 4joint...')

  // Nota: Para usar este seed, necesitas tener al menos un Store y un User creados
  // Este es un ejemplo básico. Ajusta según tu estructura de datos.

  console.log('✅ Seed completado. Recuerda asociar los productos con un storeId válido.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

