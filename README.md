# NPS Diesel API

API RESTful para e-commerce de repuestos para vehículos de carga.

## Tecnologías

- Node.js + Express
- PostgreSQL + Prisma ORM
- OpenAPI 3.1 + Swagger UI
- Docker + Docker Compose

## Instalación

### Opción 1: Con Docker (Recomendado)

1. Clona el repositorio:
```bash
git clone <repository-url>
cd nps-diesel-api
```

2. Copia el archivo de variables de entorno:
```bash
cp .env.example .env
```

3. Levanta los servicios con Docker Compose:
```bash
docker-compose up --build
```

La aplicación estará disponible en `http://localhost:3000` y la documentación en `http://localhost:3000/docs`.

### Opción 2: Instalación local

1. Clona el repositorio:
```bash
git clone <repository-url>
cd nps-diesel-api
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura la base de datos PostgreSQL local y actualiza `.env` con la URL correcta.

4. Ejecuta las migraciones de Prisma:
```bash
npx prisma migrate dev --name init
```

5. Inicia el servidor:
```bash
npm run dev
```

## Variables de Entorno

Copia `.env.example` a `.env` y configura:

- `DATABASE_URL`: URL de conexión a PostgreSQL
- `PORT`: Puerto del servidor (por defecto 3000)
- `NODE_ENV`: Entorno (development/production)

## Comandos Disponibles

- `npm start`: Inicia el servidor en producción
- `npm run dev`: Inicia el servidor en modo desarrollo con nodemon
- `npm run lint`: Ejecuta ESLint
- `npm run format`: Formatea el código con Prettier

## Endpoints

### Health Check
- `GET /api/ping`: Verifica el estado de la API

### Documentación
- `GET /docs`: Interfaz Swagger UI con la documentación OpenAPI

## Estructura del Proyecto

```
src/
├── config/          # Configuraciones
├── controllers/     # Controladores de rutas
├── routes/          # Definición de rutas
├── services/        # Lógica de negocio
├── middlewares/     # Middlewares personalizados
├── prisma/          # Cliente Prisma
├── openapi/         # Documentación OpenAPI modular
│   ├── paths/       # Definiciones de paths
│   ├── components/  # Componentes reutilizables
│   └── schemas/     # Esquemas de datos
└── utils/           # Utilidades
```

## Base de Datos

El proyecto utiliza Prisma con PostgreSQL. Los modelos principales son:

- **User**: Usuarios del sistema (admin/customer)
- **Category**: Categorías de productos
- **Product**: Productos con stock y precios

## Próximas Funcionalidades

- Autenticación JWT + OAuth con Google
- CRUD completo de productos y categorías
- Gestión de carrito y reservas de stock
- Sistema de pedidos y pagos con Wompi
- Dashboard administrativo
- Movimientos de inventario

## Contribución

1. Crea una rama para tu feature
2. Realiza los cambios
3. Ejecuta las pruebas
4. Envía un Pull Request

## Licencia

ISC