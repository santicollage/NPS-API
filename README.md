# NPS Diesel API

API RESTful completa para la plataforma de comercio electrónico de **NPS DIESEL S.A.S**, especializada en la venta de repuestos para vehículos de carga. La API proporciona gestión integral de usuarios, catálogo de productos, carrito de compras, procesamiento de pedidos, pagos en línea y análisis estadísticos.

## Características Principales

- **Autenticación Dual**: Soporte para registro tradicional con email/password y autenticación OAuth con Google
- **Guest Checkout**: Permite compras sin necesidad de registro previo
- **Gestión de Catálogo**: CRUD completo de productos con categorías, imágenes, inventario y visibilidad
- **Carrito Inteligente**: Manejo de carritos para usuarios autenticados e invitados con cálculo automático de envío
- **Sistema de Reservas**: Reserva automática de stock al crear pedidos con liberación en caso de pago fallido
- **Integración PayU**: Procesamiento de pagos con webhooks para actualización automática de estados
- **Dashboard Estadístico**: Métricas de ventas, conversión, productos más vendidos y comportamiento de clientes
- **Seguridad Robusta**: JWT con refresh tokens, rate limiting, validación de schemas y protección CSRF
- **Documentación OpenAPI 3.1**: Interfaz Swagger UI interactiva con especificación modular
- **Optimización**: Compresión gzip, caching deHeaders y manejo eficiente de imágenes con AWS S3

## Tecnologías

### Backend

- **Node.js** (v18+) + **Express.js** - Framework web
- **PostgreSQL** - Base de datos relacional
- **Prisma ORM** - Modelado y migraciones de BD

### Seguridad y Autenticación

- **JWT** (jsonwebtoken) - Tokens de autenticación y refresh
- **bcryptjs** - Hashing de contraseñas
- **Google OAuth 2.0** (google-auth-library) - Autenticación con Google
- **Helmet** - Headers de seguridad HTTP
- **express-rate-limit** - Limitación de peticiones
- **CORS** - Control de acceso entre orígenes

### Pagos e Integración

- **PayU Latam** - Procesamiento de pagos (via axios)
- **AWS S3** - Almacenamiento de imágenes de productos

### Documentación y Validación

- **OpenAPI 3.1** - Especificación de API
- **Swagger UI Express** - Interfaz interactiva de documentación
- **express-openapi-validator** - Validación automática de requests/responses

### Utilidades

- **node-cron** - Tareas programadas (limpieza de reservas)
- **compression** - Compresión gzip
- **morgan** - Logger HTTP
- **cookie-parser** - Manejo de cookies
- **Docker** + **Docker Compose** - Containerización

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

Copia `.env.example` a `.env` y configura las siguientes variables:

### Servidor

- `PORT`: Puerto del servidor (por defecto: 3000)
- `NODE_ENV`: Entorno de ejecución (development/production)
- `API_VERSION`: Versión de la API (por defecto: v1)

### Base de Datos

- `DATABASE_URL`: URL de conexión a PostgreSQL
  ```
  postgresql://user:password@localhost:5432/nps_diesel?schema=public
  ```

### Autenticación JWT

- `JWT_SECRET`: Clave secreta para firmar tokens JWT
- `JWT_EXPIRES_IN`: Tiempo de expiración del token de acceso (ej: 15m, 1h, 1d)
- `JWT_REFRESH_SECRET`: Clave secreta para refresh tokens
- `JWT_REFRESH_EXPIRES_IN`: Tiempo de expiración del refresh token (ej: 7d, 30d)

### Google OAuth

- `GOOGLE_CLIENT_ID`: Client ID de Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: Client Secret de Google OAuth
- `GOOGLE_REDIRECT_URI`: URI de redirección después de autenticación

### PayU (Pagos)

- `PAYU_MERCHANT_ID`: ID del comercio en PayU
- `PAYU_API_KEY`: API Key de PayU
- `PAYU_API_LOGIN`: Login de API de PayU
- `PAYU_ACCOUNT_ID`: ID de cuenta de PayU
- `PAYU_TEST_MODE`: Modo de prueba (true/false)
- `PAYU_PAYMENT_URL`: URL de checkout de PayU

### AWS S3 (Almacenamiento de Imágenes)

- `AWS_REGION`: Región del bucket S3 (ej: us-east-1)
- `AWS_ACCESS_KEY_ID`: Access Key de AWS IAM
- `AWS_SECRET_ACCESS_KEY`: Secret Key de AWS IAM
- `AWS_S3_BUCKET`: Nombre del bucket S3

### URLs del Frontend

- `FRONTEND_URL`: URL del frontend para CORS (ej: http://localhost:5173)
- `PAYMENT_SUCCESS_URL`: URL de redirección tras pago exitoso
- `PAYMENT_FAILURE_URL`: URL de redirección tras pago fallido

### Reservas de Stock

- `STOCK_RESERVATION_MINUTES`: Tiempo de reserva de stock en minutos (por defecto: 30)

### Rate Limiting

- `RATE_LIMIT_WINDOW_MS`: Ventana de tiempo para rate limit (ms)
- `RATE_LIMIT_MAX_REQUESTS`: Máximo de requests por ventana

## Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Inicia el servidor en modo desarrollo con hot-reload

# Producción
npm start                # Inicia el servidor en modo producción

# Base de Datos (Prisma)
npx prisma migrate dev   # Crea y aplica nueva migración
npx prisma migrate deploy # Aplica migraciones en producción
npx prisma db push       # Sincroniza schema sin crear migración
npx prisma studio        # Abre interfaz visual de la BD
npx prisma generate      # Genera el cliente Prisma
npm run seed             # Ejecuta el seed de datos de prueba

# Calidad de Código
npm run lint             # Ejecuta ESLint para detectar errores
npm run format           # Formatea el código con Prettier
npm test                 # Ejecuta las pruebas (pendiente implementar)

# Docker
docker-compose up --build    # Construye y levanta contenedores
docker-compose down          # Detiene y elimina contenedores
docker-compose logs -f api   # Ver logs del contenedor API
```

## Endpoints

> **Nota**: Todos los endpoints están bajo el prefijo `/api/v1`. La documentación completa e interactiva está disponible en `/docs`

### 🏥 Health & Monitoring

| Método | Endpoint  | Descripción                             | Auth |
| ------ | --------- | --------------------------------------- | ---- |
| GET    | `/ping`   | Verifica que la API está activa         | No   |
| GET    | `/health` | Estado detallado de la API y conexiones | No   |

### 👤 Usuarios

| Método | Endpoint                | Descripción               | Auth | Rol         |
| ------ | ----------------------- | ------------------------- | ---- | ----------- |
| GET    | `/users`                | Listar todos los usuarios | Sí   | Admin       |
| POST   | `/users`                | Crear nuevo usuario       | No   | -           |
| GET    | `/users/{user_id}`      | Obtener usuario por ID    | Sí   | Admin/Owner |
| PATCH  | `/users/{user_id}`      | Actualizar usuario        | Sí   | Admin/Owner |
| DELETE | `/users/{user_id}`      | Eliminar usuario          | Sí   | Admin       |
| PATCH  | `/users/{user_id}/role` | Cambiar rol de usuario    | Sí   | Admin       |

### 🔐 Autenticación

| Método | Endpoint                | Descripción                           | Auth |
| ------ | ----------------------- | ------------------------------------- | ---- |
| POST   | `/auth/login`           | Login con email/password              | No   |
| POST   | `/auth/logout`          | Cerrar sesión                         | Sí   |
| GET    | `/auth/me`              | Obtener usuario autenticado           | Sí   |
| POST   | `/auth/google`          | Autenticación con Google OAuth        | No   |
| POST   | `/auth/refresh`         | Renovar token de acceso               | No   |
| POST   | `/auth/change-password` | Cambiar contraseña                    | Sí   |
| POST   | `/auth/forgot-password` | Solicitar recuperación de contraseña  | No   |
| POST   | `/auth/reset-password`  | Resetear contraseña con token         | No   |
| POST   | `/auth/presigned-url`   | Obtener URL firmada para subir imagen | Sí   |

### 📦 Categorías

| Método | Endpoint                    | Descripción          | Auth | Rol   |
| ------ | --------------------------- | -------------------- | ---- | ----- |
| GET    | `/categories`               | Listar categorías    | No   | -     |
| POST   | `/categories`               | Crear categoría      | Sí   | Admin |
| GET    | `/categories/{category_id}` | Obtener categoría    | No   | -     |
| PATCH  | `/categories/{category_id}` | Actualizar categoría | Sí   | Admin |
| DELETE | `/categories/{category_id}` | Eliminar categoría   | Sí   | Admin |

### 🛍️ Productos

| Método | Endpoint                    | Descripción                                 | Auth | Rol   |
| ------ | --------------------------- | ------------------------------------------- | ---- | ----- |
| GET    | `/products`                 | Listar productos (con filtros y paginación) | No   | -     |
| POST   | `/products`                 | Crear producto                              | Sí   | Admin |
| GET    | `/products/{product_id}`    | Obtener producto por ID                     | No   | -     |
| PATCH  | `/products/{product_id}`    | Actualizar producto                         | Sí   | Admin |
| DELETE | `/products/{product_id}`    | Eliminar producto                           | Sí   | Admin |
| POST   | `/products/bulk`            | Crear múltiples productos                   | Sí   | Admin |
| PATCH  | `/products/bulk/visibility` | Cambiar visibilidad masiva                  | Sí   | Admin |

**Query Parameters para GET /products:**

- `page` - Número de página (default: 1)
- `limit` - Items por página (default: 20, max: 100)
- `category_id` - Filtrar por categoría
- `visible` - Filtrar por visibilidad (true/false)
- `active` - Filtrar por estado activo (true/false)
- `min_price` - Precio mínimo
- `max_price` - Precio máximo
- `size` - Filtrar por tamaño (extra_small, small, medium, large, extra_large)
- `search` - Búsqueda en nombre y descripción

### 🛒 Carrito (Usuarios Autenticados)

| Método | Endpoint                     | Descripción                    | Auth |
| ------ | ---------------------------- | ------------------------------ | ---- |
| GET    | `/cart`                      | Obtener carrito del usuario    | Sí   |
| POST   | `/cart/items`                | Agregar item al carrito        | Sí   |
| PATCH  | `/cart/items/{cart_item_id}` | Actualizar cantidad de item    | Sí   |
| DELETE | `/cart/items/{cart_item_id}` | Eliminar item del carrito      | Sí   |
| POST   | `/cart/abandon`              | Marcar carrito como abandonado | Sí   |

### 🛒 Carrito (Invitados - Guest)

| Método | Endpoint                                      | Descripción                 | Auth |
| ------ | --------------------------------------------- | --------------------------- | ---- |
| POST   | `/cart/guest`                                 | Crear carrito de invitado   | No   |
| GET    | `/cart/guest/{guest_id}`                      | Obtener carrito de invitado | No   |
| POST   | `/cart/guest/{guest_id}/items`                | Agregar item al carrito     | No   |
| PATCH  | `/cart/guest/{guest_id}/items/{cart_item_id}` | Actualizar cantidad         | No   |
| DELETE | `/cart/guest/{guest_id}/items/{cart_item_id}` | Eliminar item               | No   |
| POST   | `/cart/guest/{guest_id}/abandon`              | Abandonar carrito           | No   |

### 📋 Pedidos (Usuarios Autenticados)

| Método | Endpoint                    | Descripción                  | Auth | Rol            |
| ------ | --------------------------- | ---------------------------- | ---- | -------------- |
| GET    | `/orders`                   | Listar pedidos del usuario   | Sí   | Customer       |
| POST   | `/orders`                   | Crear pedido desde carrito   | Sí   | Customer       |
| GET    | `/orders/{order_id}`        | Obtener detalle de pedido    | Sí   | Customer/Admin |
| PATCH  | `/orders/{order_id}/status` | Actualizar estado del pedido | Sí   | Admin          |

**Query Parameters para GET /orders:**

- `status` - Filtrar por estado (pending, paid, shipped, delivered, cancelled)
- `page` - Número de página
- `limit` - Items por página

### 📋 Pedidos (Invitados - Guest)

| Método | Endpoint                      | Descripción                | Auth |
| ------ | ----------------------------- | -------------------------- | ---- |
| POST   | `/orders/guest`               | Crear pedido de invitado   | No   |
| GET    | `/orders/guest/{order_token}` | Consultar pedido con token | No   |

### 💳 Pagos

| Método | Endpoint               | Descripción                   | Auth    |
| ------ | ---------------------- | ----------------------------- | ------- |
| POST   | `/payments/create`     | Crear sesión de pago PayU     | Sí/No\* |
| POST   | `/payments/webhook`    | Webhook de PayU (uso interno) | No      |
| GET    | `/payments/{order_id}` | Obtener información de pago   | Sí      |

\*Requiere auth si es orden de usuario, no requiere si es orden de invitado (con guest_id)

### 📊 Inventario y Stock

| Método | Endpoint              | Descripción                   | Auth | Rol   |
| ------ | --------------------- | ----------------------------- | ---- | ----- |
| GET    | `/stock/movements`    | Listar movimientos de stock   | Sí   | Admin |
| POST   | `/stock/movements`    | Registrar movimiento de stock | Sí   | Admin |
| GET    | `/stock/reservations` | Ver reservas activas          | Sí   | Admin |
| POST   | `/stock/cleanup`      | Limpiar reservas expiradas    | Sí   | Admin |

### 📈 Estadísticas (Dashboard)

| Método | Endpoint               | Descripción                         | Auth | Rol   |
| ------ | ---------------------- | ----------------------------------- | ---- | ----- |
| GET    | `/stats/summary`       | Resumen general de métricas         | Sí   | Admin |
| GET    | `/stats/sales`         | Datos de ventas por periodo         | Sí   | Admin |
| GET    | `/stats/top-products`  | Productos más vendidos              | Sí   | Admin |
| GET    | `/stats/customers`     | Estadísticas de clientes            | Sí   | Admin |
| GET    | `/stats/conversion`    | Tasa de conversión (carrito→pedido) | Sí   | Admin |
| GET    | `/stats/purchase-time` | Tiempo promedio de compra           | Sí   | Admin |

**Query Parameters para estadísticas:**

- `start_date` - Fecha inicio (YYYY-MM-DD)
- `end_date` - Fecha fin (YYYY-MM-DD)
- `period` - Periodo de agrupación (day, week, month)

### ⚙️ Jobs y Tareas Programadas

| Método | Endpoint                     | Descripción                | Auth | Rol   |
| ------ | ---------------------------- | -------------------------- | ---- | ----- |
| POST   | `/jobs/cleanup-reservations` | Ejecutar limpieza manual   | Sí   | Admin |
| GET    | `/jobs/health`               | Estado de jobs programados | Sí   | Admin |

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

El proyecto utiliza **Prisma ORM** con **PostgreSQL** como base de datos relacional. A continuación se describen los modelos principales:

### 📊 Modelos de Datos

#### User (Usuarios)

Gestión de usuarios del sistema con dos roles: `customer` (cliente) y `admin` (administrador).

**Campos principales:**

- `user_id` (PK) - Identificador único
- `name` - Nombre completo
- `email` (único) - Correo electrónico
- `password` (hash) - Contraseña encriptada (opcional si usa Google OAuth)
- `google_id` - ID de Google OAuth (opcional)
- `phone` - Teléfono de contacto
- `role` - Rol (customer/admin)
- `department`, `city`, `address_line`, `postal_code` - Dirección de envío
- `image_url` - URL de foto de perfil
- `created_at`, `updated_at` - Timestamps

**Relaciones:**

- Un usuario puede tener múltiples carritos (Cart)
- Un usuario puede tener múltiples pedidos (Order)

#### Category (Categorías)

Categorías para organizar productos.

**Campos:**

- `category_id` (PK)
- `name` (único) - Nombre de la categoría
- `description` - Descripción opcional
- `created_at`

**Relaciones:**

- Una categoría puede tener múltiples productos (muchos a muchos)

#### Product (Productos)

Catálogo de productos disponibles para la venta.

**Campos:**

- `product_id` (PK)
- `name` - Nombre del producto
- `description` - Descripción detallada
- `price` - Precio unitario (Decimal)
- `size` - Tamaño (extra_small, small, medium, large, extra_large)
- `stock_quantity` - Cantidad disponible en inventario
- `reference` - Código de referencia
- `images` - Array de URLs de imágenes
- `visible` - Visible en catálogo (boolean)
- `active` - Producto activo (boolean)
- `created_at`

**Relaciones:**

- Pertenece a múltiples categorías (muchos a muchos)
- Puede estar en múltiples items de carrito (CartItem)
- Puede estar en múltiples items de pedido (OrderItem)
- Tiene múltiples movimientos de stock (StockMovement)

#### Cart (Carritos)

Carritos de compra tanto para usuarios autenticados como invitados.

**Campos:**

- `cart_id` (PK)
- `user_id` (FK, nullable) - Usuario autenticado
- `guest_id` (nullable) - Identificador de invitado (UUID)
- `status` - Estado (active, ordered, abandoned)
- `shipping_cost` - Costo de envío calculado
- `created_at`, `updated_at`

**Relaciones:**

- Pertenece a un usuario (opcional)
- Contiene múltiples items (CartItem)

#### CartItem (Items del Carrito)

Productos agregados al carrito.

**Campos:**

- `cart_item_id` (PK)
- `cart_id` (FK)
- `product_id` (FK)
- `quantity` - Cantidad del producto
- `reserved_until` - Fecha límite de reserva
- `created_at`

#### Order (Pedidos)

Pedidos confirmados listos para pago.

**Campos:**

- `order_id` (PK)
- `user_id` (FK, nullable) - Usuario autenticado
- `guest_id` (nullable) - Invitado
- `order_token` (nullable) - Token para acceso de invitados
- `total_amount` - Monto total
- `shipping_cost` - Costo de envío
- `status` - Estado (pending, paid, shipped, delivered, cancelled)
- `customer_name`, `customer_email`, `customer_phone` - Datos del cliente (para invitados)
- `customer_document` - Documento de identidad
- `department`, `city`, `address_line`, `postal_code` - Dirección de envío
- `created_at`

**Relaciones:**

- Pertenece a un usuario (opcional)
- Contiene múltiples items (OrderItem)
- Puede tener múltiples pagos (Payment)

#### OrderItem (Items del Pedido)

Productos incluidos en un pedido.

**Campos:**

- `order_item_id` (PK)
- `order_id` (FK)
- `product_id` (FK)
- `quantity` - Cantidad
- `unit_price` - Precio unitario al momento de la compra
- `subtotal` - Subtotal (quantity \* unit_price)

#### Payment (Pagos)

Registro de transacciones de pago.

**Campos:**

- `payment_id` (PK)
- `order_id` (FK, nullable)
- `guest_id` (nullable)
- `payu_transaction_id` - ID de transacción en PayU
- `amount` - Monto del pago
- `currency` - Moneda (COP)
- `status` - Estado (pending, approved, declined, error)
- `method` - Método de pago
- `created_at`

#### StockMovement (Movimientos de Inventario)

Registro de entradas y salidas de inventario.

**Campos:**

- `movement_id` (PK)
- `product_id` (FK)
- `quantity` - Cantidad (positivo=entrada, negativo=salida)
- `type` - Tipo (purchase, sale, adjustment, return, reservation, release)
- `reason` - Razón del movimiento
- `created_at`

#### StockReservation (Reservas de Stock)

Reservas temporales de productos al crear pedidos.

**Campos:**

- `reservation_id` (PK)
- `order_id` (FK)
- `product_id` (FK)
- `quantity` - Cantidad reservada
- `status` - Estado (active, confirmed, released)
- `expires_at` - Fecha de expiración de la reserva
- `created_at`

### 🔗 Diagrama de Relaciones

```
User (1) ─── (n) Cart ─── (n) CartItem ─── (1) Product
  │                                            │
  └── (n) Order ─── (n) OrderItem ─────────────┘
        │              │
        │              └── (n) StockReservation
        │
        └── (n) Payment

Product ─── (n) Category (many-to-many)
Product ─── (n) StockMovement
```

### 📝 Migraciones

Las migraciones se gestionan con Prisma. Para crear una nueva migración:

```bash
# Después de modificar prisma/schema.prisma
npx prisma migrate dev --name nombre_de_la_migracion
```

## 🔐 Autenticación y Seguridad

### Flujo de Autenticación JWT

1. **Login**: Usuario envía credenciales a `/auth/login` o `/auth/google`
2. **Response**: Se retornan dos tokens:
   - `accessToken`: Token de corta duración (15-60 min) para requests
   - `refreshToken`: Token de larga duración (7-30 días) en cookie httpOnly
3. **Requests autenticados**: Incluir header `Authorization: Bearer {accessToken}`
4. **Renovación**: Cuando expira el accessToken, usar `/auth/refresh` con el refreshToken

### Ejemplo de Autenticación

```javascript
// Login
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "password123"
}

// Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "name": "Juan Pérez",
    "email": "usuario@example.com",
    "role": "customer"
  }
}

// Usar token en requests
GET /api/v1/cart
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Autenticación con Google OAuth

```javascript
POST /api/v1/auth/google
Content-Type: application/json

{
  "token": "google_id_token_aqui"
}
```

### Middleware de Autorización

- `authenticateToken`: Valida JWT en todas las rutas protegidas
- `authorizeRoles(['admin'])`: Restringe acceso por rol
- `optionalAuth`: Permite acceso autenticado u opcional

### Medidas de Seguridad Implementadas

- ✅ **Hashing de contraseñas** con bcryptjs (10 rounds)
- ✅ **JWT con expiración** y refresh tokens
- ✅ **Rate limiting**: 100 requests/15 min por IP
- ✅ **Helmet**: Headers de seguridad HTTP
- ✅ **CORS configurado** para dominios permitidos
- ✅ **Validación de schemas** con OpenAPI Validator
- ✅ **Sanitización de inputs** en todos los endpoints
- ✅ **HttpOnly cookies** para refresh tokens
- ✅ **Protección CSRF** para operaciones sensibles

## 💡 Ejemplos de Uso

### Flujo de Compra Completo (Usuario Autenticado)

```javascript
// 1. Login
POST /api/v1/auth/login
{
  "email": "cliente@example.com",
  "password": "password123"
}
// → Guardar accessToken

// 2. Ver productos
GET /api/v1/products?category_id=1&page=1&limit=20
// → Listar productos de una categoría

// 3. Agregar al carrito
POST /api/v1/cart/items
Authorization: Bearer {accessToken}
{
  "product_id": 5,
  "quantity": 2
}

// 4. Ver carrito
GET /api/v1/cart
Authorization: Bearer {accessToken}
// → Ver total, shipping_cost y items

// 5. Crear pedido
POST /api/v1/orders
Authorization: Bearer {accessToken}
// → Crea orden desde carrito activo
// → Retorna order_id

// 6. Crear sesión de pago
POST /api/v1/payments/create
Authorization: Bearer {accessToken}
{
  "order_id": 123
}
// → Retorna payu_checkout_url

// 7. Redirigir al usuario a payu_checkout_url
// 8. PayU notifica via webhook al completar pago
// 9. El sistema actualiza estado de order a "paid"
```

### Flujo de Compra como Invitado (Guest)

```javascript
// 1. Crear carrito de invitado
POST /api/v1/cart/guest
{
  "guest_id": "550e8400-e29b-41d4-a716-446655440000"
}
// → Retorna cart con guest_id

// 2. Agregar productos
POST /api/v1/cart/guest/550e8400-e29b-41d4-a716-446655440000/items
{
  "product_id": 3,
  "quantity": 1
}

// 3. Crear pedido de invitado
POST /api/v1/orders/guest
{
  "guest_id": "550e8400-e29b-41d4-a716-446655440000",
  "customer_name": "María García",
  "customer_email": "maria@example.com",
  "customer_phone": "+57 300 123 4567",
  "customer_document": "123456789",
  "department": "Cundinamarca",
  "city": "Bogotá",
  "address_line": "Calle 123 #45-67",
  "postal_code": "110111"
}
// → Retorna order con order_token

// 4. Crear pago para orden de invitado
POST /api/v1/payments/create
{
  "order_id": 456,
  "guest_id": "550e8400-e29b-41d4-a716-446655440000"
}

// 5. Consultar orden con token
GET /api/v1/orders/guest/{order_token}
```

### Gestión de Productos (Admin)

```javascript
// Crear producto con categorías e imágenes
POST /api/v1/products
Authorization: Bearer {adminToken}
{
  "name": "Aceite Diésel 15W40",
  "description": "Aceite mineral para motores diésel de alto rendimiento",
  "price": 45000.00,
  "size": "medium",
  "stock_quantity": 100,
  "reference": "REF-001",
  "category_ids": [1, 2],
  "image_urls": [
    "https://s3.amazonaws.com/bucket/aceite-1.jpg",
    "https://s3.amazonaws.com/bucket/aceite-2.jpg"
  ]
}

// Actualizar stock masivamente
POST /api/v1/stock/movements
Authorization: Bearer {adminToken}
{
  "product_id": 5,
  "quantity": 50,
  "type": "purchase",
  "reason": "Compra a proveedor XYZ"
}
```

### Cálculo Automático de Envío

El sistema calcula automáticamente el costo de envío basándose en el tamaño y cantidad de productos:

- **Extra Small / Small**: Base $5,000 + $2,000 por unidad adicional
- **Medium**: Base $8,000 + $3,000 por unidad adicional
- **Large / Extra Large**: Base $12,000 + $5,000 por unidad adicional

El costo se calcula automáticamente al obtener el carrito o crear el pedido.

## 🚀 Características Avanzadas

### Sistema de Reservas de Stock

- Al crear un pedido, se reserva automáticamente el stock
- Las reservas tienen un tiempo de expiración configurable (default: 30 min)
- Si el pago no se completa, la reserva se libera automáticamente
- Un job cron ejecuta limpieza de reservas expiradas cada 5 minutos
- Al confirmar el pago, la reserva se marca como confirmada

### Webhook de PayU

El endpoint `/payments/webhook` recibe notificaciones automáticas de PayU:

1. PayU envía POST con estado de la transacción
2. Se valida la firma de la petición
3. Se actualiza el estado del pago en la BD
4. Se actualiza el estado de la orden (pending → paid)
5. Se confirman las reservas de stock si pago exitoso
6. Se liberan reservas si pago rechazado

### Jobs Programados (Cron)

```javascript
// Limpieza de reservas expiradas - cada 5 minutos
*/5 * * * * - Libera stock de reservas vencidas
```

### Subida de Imágenes a AWS S3

```javascript
// 1. Obtener URL pre-firmada
POST /api/v1/auth/presigned-url
Authorization: Bearer {token}
{
  "fileName": "producto-imagen.jpg",
  "fileType": "image/jpeg"
}
// → Retorna uploadUrl y finalUrl

// 2. Subir imagen directamente a S3
PUT {uploadUrl}
Content-Type: image/jpeg
[Binary data de la imagen]

// 3. Usar finalUrl al crear/actualizar producto
```

## 📊 Dashboard de Estadísticas

Endpoints para métricas del negocio (solo Admin):

### Resumen General

```javascript
GET /api/v1/stats/summary?start_date=2024-01-01&end_date=2024-12-31
```

Retorna: ventas totales, órdenes, ticket promedio, clientes, conversión, tiempo promedio de compra

### Ventas por Periodo

```javascript
GET /api/v1/stats/sales?period=month&start_date=2024-01-01&end_date=2024-12-31
```

Retorna: Array de ventas agrupadas por día/semana/mes

### Top Productos

```javascript
GET /api/v1/stats/top-products?limit=10
```

Retorna: Productos más vendidos con unidades y revenue

## 🏗️ Arquitectura del Proyecto

La API sigue una **arquitectura limpia en capas** (Clean Architecture) con separación de responsabilidades:

### Patrón de Capas

```
┌─────────────────────────────────────────────┐
│           HTTP Layer (Express)              │
│  ┌──────────────────────────────────────┐   │
│  │    Routes & Middlewares              │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         Controller Layer                    │
│  - Manejo de requests/responses             │
│  - Validación de inputs                     │
│  - Llamadas a servicios                     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          Service Layer                      │
│  - Lógica de negocio                        │
│  - Reglas de negocio                        │
│  - Transacciones                            │
│  - Llamadas a repositorios/ORM              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│       Data Access Layer (Prisma)            │
│  - Queries a base de datos                  │
│  - Modelos y relaciones                     │
│  - Migraciones                              │
└─────────────────────────────────────────────┘
```

### Estructura Detallada de Directorios

```
nps-diesel-api/
├── prisma/
│   ├── schema.prisma          # Definición de modelos
│   ├── migrations/            # Migraciones de BD
│   └── seed.js               # Datos de prueba
├── src/
│   ├── config/
│   │   ├── database.js       # Configuración de Prisma
│   │   ├── jwt.js           # Configuración de JWT
│   │   ├── aws.js           # Configuración de AWS S3
│   │   └── payu.js          # Configuración de PayU
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── productController.js
│   │   ├── categoryController.js
│   │   ├── cartController.js
│   │   ├── orderController.js
│   │   ├── paymentController.js
│   │   ├── stockController.js
│   │   └── statsController.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── productService.js
│   │   ├── cartService.js
│   │   ├── orderService.js
│   │   ├── paymentService.js
│   │   ├── stockService.js
│   │   └── statsService.js
│   ├── middlewares/
│   │   ├── auth.js          # Autenticación JWT
│   │   ├── authorize.js     # Autorización por roles
│   │   ├── errorHandler.js  # Manejo global de errores
│   │   ├── rateLimiter.js   # Rate limiting
│   │   └── validator.js     # Validación de schemas
│   ├── routes/
│   │   ├── index.js         # Enrutador principal
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── productRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── cartRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── stockRoutes.js
│   │   └── statsRoutes.js
│   ├── openapi/
│   │   ├── openapi.yaml     # Archivo principal
│   │   ├── paths/           # Definiciones de endpoints
│   │   └── schemas/         # Esquemas de datos
│   ├── utils/
│   │   ├── logger.js        # Logger personalizado
│   │   ├── validators.js    # Validadores personalizados
│   │   └── helpers.js       # Funciones auxiliares
│   ├── jobs/
│   │   └── cleanupReservations.js  # Jobs programados
│   ├── app.js               # Configuración de Express
│   └── server.js            # Punto de entrada
├── tests/                   # Tests unitarios e integración (pendiente)
├── .env.example             # Plantilla de variables de entorno
├── .eslintrc.json          # Configuración ESLint
├── .prettierrc             # Configuración Prettier
├── docker-compose.yml      # Orquestación Docker
├── Dockerfile              # Imagen Docker de la API
├── package.json
└── README.md
```

### Flujo de una Request

1. **Request HTTP** → Llega al servidor Express
2. **Middlewares globales** → Helmet, CORS, Rate Limit, Compression, Morgan
3. **Router** → Enrutador principal distribuye a rutas específicas
4. **OpenAPI Validator** → Valida schema del request
5. **Middleware de Auth** → Valida JWT si es ruta protegida
6. **Middleware de Autorización** → Verifica roles si es necesario
7. **Controller** → Procesa request, extrae datos
8. **Service** → Ejecuta lógica de negocio
9. **Prisma ORM** → Interactúa con PostgreSQL
10. **Service** → Retorna resultado al controller
11. **Controller** → Formatea response
12. **OpenAPI Validator** → Valida schema del response
13. **Response HTTP** → Retorna al cliente

### Patrones de Diseño Utilizados

- **Repository Pattern**: Prisma actúa como capa de abstracción de datos
- **Service Layer Pattern**: Separación de lógica de negocio
- **Dependency Injection**: Servicios inyectados en controllers
- **Factory Pattern**: Para creación de tokens JWT y URLs firmadas
- **Strategy Pattern**: Diferentes estrategias de autenticación (local, Google OAuth)
- **Observer Pattern**: Webhooks de PayU para notificaciones de pago

### Principios SOLID Aplicados

- **Single Responsibility**: Cada módulo tiene una única responsabilidad
- **Open/Closed**: Extensible mediante nuevos servicios sin modificar existentes
- **Liskov Substitution**: Servicios intercambiables que implementan interfaces comunes
- **Interface Segregation**: Interfaces específicas por funcionalidad
- **Dependency Inversion**: Dependencias hacia abstracciones, no implementaciones

## 🧪 Testing (Pendiente)

La estructura está preparada para implementar:

- **Tests Unitarios**: Jest + Supertest
- **Tests de Integración**: Con base de datos de prueba
- **Tests E2E**: Simulando flujos completos de usuario
- **Coverage**: Objetivo de 80%+ de cobertura

```bash
# Comandos futuros
npm test                    # Ejecutar todos los tests
npm run test:unit          # Solo tests unitarios
npm run test:integration   # Tests de integración
npm run test:coverage      # Reporte de cobertura
```

## 🚢 Deployment

### Docker Compose (Desarrollo)

```bash
docker-compose up -d
```

Levanta:

- Contenedor de PostgreSQL (puerto 5432)
- Contenedor de la API (puerto 3000)
- Red interna para comunicación

### Producción

**Variables de entorno críticas:**

- Cambiar `NODE_ENV=production`
- Usar secrets seguros para JWT_SECRET y JWT_REFRESH_SECRET
- Configurar DATABASE_URL con credenciales de producción
- Habilitar `PAYU_TEST_MODE=false`
- Configurar URLs de frontend real

**Recomendaciones:**

- Usar servicio de base de datos gestionado (AWS RDS, Railway, etc.)
- Implementar HTTPS con certificado SSL
- Configurar variables de entorno en el servicio de hosting
- Habilitar logs estructurados
- Configurar health checks
- Implementar backup automático de BD

### Plataformas Sugeridas

- **API**: Railway, Render, Heroku, AWS ECS, Google Cloud Run
- **Base de Datos**: AWS RDS, Railway PostgreSQL, Supabase
- **Almacenamiento**: AWS S3, Cloudinary
- **CDN**: Cloudflare, AWS CloudFront

## 📊 Monitoreo y Logs

### Logs Implementados

- **Morgan**: Logs HTTP en formato combinado
- **Console logs**: Errores y warnings en desarrollo
- **Structured logging**: Preparado para Winston/Bunyan

### Métricas Disponibles

- `/api/v1/health`: Estado de conexiones
- `/api/v1/stats/*`: Métricas de negocio
- `/api/v1/jobs/health`: Estado de jobs programados

### Monitoreo Recomendado (Futuro)

- **APM**: New Relic, Datadog, Sentry
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Error Tracking**: Sentry, Rollbar
- **Analytics**: Custom dashboard con métricas de negocio

## 🔒 Consideraciones de Seguridad

### Implementado

✅ HTTPS en producción (configurar en reverse proxy)  
✅ Rate limiting por IP  
✅ Helmet para headers de seguridad  
✅ CORS configurado  
✅ Validación de inputs con OpenAPI  
✅ Sanitización de queries SQL (Prisma)  
✅ Hashing de passwords con bcrypt  
✅ JWT con expiración  
✅ HttpOnly cookies para refresh tokens  
✅ Variables de entorno para secretos

### Recomendaciones Adicionales

- Implementar CSRF tokens para formularios web
- Agregar 2FA para usuarios admin
- Logging de acciones sensibles (audit trail)
- Encriptación de datos sensibles en BD
- Política de rotación de secrets
- Escaneo de dependencias con npm audit
- WAF (Web Application Firewall)
- DDoS protection

## 📚 Recursos Adicionales

### Documentación

- **Swagger UI**: `http://localhost:3000/docs` - Documentación interactiva completa
- **OpenAPI Spec**: `src/openapi/openapi.yaml` - Especificación en formato YAML
- **Prisma Studio**: `npx prisma studio` - Explorador visual de BD

### Enlaces Útiles

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [PayU Latam API Docs](https://developers.payulatam.com/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## 🤝 Contribución

1. Crea una rama para tu feature
2. Realiza los cambios
3. Ejecuta las pruebas
4. Envía un Pull Request

## Licencia

ISC
