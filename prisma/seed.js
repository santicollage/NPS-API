import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...');

  // --- Categorías ---
  const categories = await prisma.category.createMany({
    data: [
      { name: 'Filtros', description: 'Filtros de aire, aceite y combustible' },
      { name: 'Frenos', description: 'Pastillas, discos y kits de freno' },
      {
        name: 'Suspensión',
        description: 'Amortiguadores, resortes y componentes',
      },
      { name: 'Motor', description: 'Repuestos y componentes del motor' },
    ],
  });
  console.log('✅ Categorías creadas');

  // --- Productos ---
  const products = await prisma.product.createMany({
    data: [
      {
        name: 'Filtro de aire Cummins',
        description: 'Filtro de aire de alta eficiencia para motor Cummins.',
        price: 85000,
        size: 'medium',
        stock_quantity: 20,
        image_url: 'https://via.placeholder.com/200x200.png?text=Filtro+Aire',
        reference: 'FA-CUM-001',
      },
      {
        name: 'Pastillas de freno Bosch',
        description: 'Juego de pastillas de freno de alto rendimiento Bosch.',
        price: 120000,
        size: 'small',
        stock_quantity: 15,
        image_url:
          'https://via.placeholder.com/200x200.png?text=Pastillas+Bosch',
        reference: 'PF-BOS-002',
      },
      {
        name: 'Amortiguador delantero Monroe',
        description: 'Amortiguador de gas para vehículos de carga.',
        price: 230000,
        size: 'large',
        stock_quantity: 10,
        image_url: 'https://via.placeholder.com/200x200.png?text=Amortiguador',
        reference: 'AM-MON-003',
      },
    ],
  });
  console.log('✅ Productos creados');

  // --- Asociaciones Producto-Categoría ---
  const [product1, product2, product3] = await prisma.product.findMany();
  const [catFiltros, catFrenos, catSuspension] =
    await prisma.category.findMany();

  await prisma.productCategory.createMany({
    data: [
      { product_id: product1.product_id, category_id: catFiltros.category_id },
      { product_id: product2.product_id, category_id: catFrenos.category_id },
      {
        product_id: product3.product_id,
        category_id: catSuspension.category_id,
      },
    ],
  });
  console.log('✅ Relaciones producto-categoría creadas');

  // --- Usuario admin y usuario cliente ---
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@npsdiesel.com',
      password_hash: '$2b$10$123456789012345678901uMOPWk9k9KJKJJKJJK', // hash ficticio
      role: 'admin',
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: 'Juan Pérez',
      email: 'juanperez@example.com',
      password_hash: '$2b$10$0987654321KJJJKJJKJJKJJKJKJJKJJKJKJJKJK',
      phone: '3001234567',
      city: 'Bogotá',
      department: 'Cundinamarca',
      address_line: 'Calle 123 #45-67',
      postal_code: '110111',
      role: 'customer',
    },
  });
  console.log('✅ Usuarios creados');

  // --- Carrito de prueba ---
  const cart = await prisma.cart.create({
    data: {
      user_id: customer.user_id,
      items: {
        create: [
          { product_id: product1.product_id, quantity: 2 },
          { product_id: product2.product_id, quantity: 1 },
        ],
      },
    },
  });
  console.log('✅ Carrito con items creado');

  // --- Pedido de prueba ---
  const order = await prisma.order.create({
    data: {
      user_id: customer.user_id,
      total_amount: 290000,
      shipping_cost: 15000,
      status: 'paid',
      items: {
        create: [
          {
            product_id: product1.product_id,
            quantity: 2,
            unit_price: 85000,
            subtotal: 170000,
          },
          {
            product_id: product2.product_id,
            quantity: 1,
            unit_price: 120000,
            subtotal: 120000,
          },
        ],
      },
    },
  });
  console.log('✅ Orden de prueba creada');

  // --- Pago de prueba ---
  await prisma.payment.create({
    data: {
      order_id: order.order_id,
      amount: 305000,
      status: 'approved',
      method: 'Wompi',
      wompi_transaction_id: 'TXN_TEST_001',
    },
  });
  console.log('✅ Pago de prueba registrado');

  console.log('🌿 Seed completado exitosamente.');
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
