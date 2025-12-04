import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos de prueba...');

  // Contraseñas visibles y sus hashes
  const passwordAdmin = 'admin123';
  const passwordCustomer = 'customer123';
  const passwordGuest = 'guest123';

  const hashedAdmin = await bcrypt.hash(passwordAdmin, 10);
  const hashedCustomer = await bcrypt.hash(passwordCustomer, 10);
  const hashedGuest = await bcrypt.hash(passwordGuest, 10);

  // 🧍 Usuarios
  await prisma.user.createMany({
    data: [
      {
        name: 'Admin User',
        email: 'admin@npsdiesel.com',
        password_hash: hashedAdmin,
        role: 'admin',
      },
      {
        name: 'Carlos Pérez',
        email: 'carlos@example.com',
        password_hash: hashedCustomer,
        role: 'customer',
      },
      {
        name: 'Invitado Test',
        email: 'guest@example.com',
        password_hash: hashedGuest,
        role: 'customer',
      },
    ],
  });

  // 🧭 Categorías
  await prisma.category.createMany({
    data: [
      {
        name: 'Filtros',
        description: 'Filtros de aire, aceite y combustible.',
      },
      {
        name: 'Frenos',
        description: 'Discos, pastillas y componentes de freno.',
      },
      { name: 'Motor', description: 'Componentes internos del motor.' },
    ],
  });

  // 🧱 Productos
  await prisma.product.createMany({
    data: [
      {
        name: 'Filtro de Aire Mann',
        description: 'Filtro de aire para motor Cummins ISX.',
        price: 150000,
        size: 'medium',
        stock_quantity: 20,
        active: true,
        visible: true,
      },
      {
        name: 'Disco de Freno Bosch',
        description: 'Disco ventilado de alta resistencia.',
        price: 320000,
        size: 'medium',
        stock_quantity: 15,
        active: true,
        visible: true,
      },
      {
        name: 'Biela Caterpillar',
        description: 'Biela reforzada para motor CAT C15.',
        price: 800000,
        size: 'large',
        stock_quantity: 10,
        active: true,
        visible: true,
      },
    ],
  });

  // 🔗 Relacionar productos con categorías
  await prisma.productCategory.createMany({
    data: [
      { product_id: 1, category_id: 1 },
      { product_id: 2, category_id: 2 },
      { product_id: 3, category_id: 3 },
    ],
  });

  // 🛒 Carrito de prueba
  const cart = await prisma.cart.create({
    data: {
      user_id: 2, // cliente Carlos Pérez
      items: {
        create: [
          { product_id: 1, quantity: 1 },
          { product_id: 2, quantity: 1 },
        ],
      },
    },
    include: { items: true },
  });

  // 📦 Orden de prueba
  const order = await prisma.order.create({
    data: {
      user_id: 2,
      total_amount: 470000,
      status: 'pending',
      items: {
        create: [
          { product_id: 1, quantity: 1, unit_price: 150000, subtotal: 150000 },
          { product_id: 2, quantity: 1, unit_price: 320000, subtotal: 320000 },
        ],
      },
    },
    include: { items: true },
  });

  console.log('✅ Seed completado correctamente');
  console.table([
    { user: 'admin@npsdiesel.com', password: passwordAdmin },
    { user: 'carlos@example.com', password: passwordCustomer },
    { user: 'guest@example.com', password: passwordGuest },
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
