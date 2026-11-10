# NPS Diesel API

API REST del e-commerce de **NPS Diesel S.A.S.**, empresa colombiana de repuestos para vehículos de carga. La diseñé y construí como único desarrollador backend, junto con el frontend ([NPS-WEB](https://github.com/santicollage/NPS-WEB)).

**Estado del proyecto:** desarrollo terminado entre diciembre de 2025 y marzo de 2026. La integración con PayU se probó en **sandbox**: el cliente no llegó a crear su cuenta de PayU, así que los pagos nunca operaron en producción.

**Documentación en vivo:** [api.npsdieselsas.com/docs](https://api.npsdieselsas.com/docs). Está en el plan gratuito de Render: si lleva un rato sin uso, la primera petición puede tardar cerca de un minuto en responder.

## Qué hace

- Catálogo de productos con categorías (muchos a muchos), imágenes en AWS S3 y control de visibilidad.
- Carrito y pedidos para usuarios registrados y para **invitados** (compra sin registro, consulta del pedido con un token).
- **Reserva de stock** al crear el pedido, con liberación automática si el pago no llega.
- Pagos con **PayU Latam**: creación de la transacción y webhook para actualizar pago, pedido e inventario.
- Autenticación con email/contraseña y con **Google**, recuperación de contraseña por correo.
- Correos transaccionales con Brevo (confirmación de pedido al cliente y al administrador).
- Estadísticas para el panel administrativo: ventas por periodo, productos más vendidos, clientes, conversión y tiempo de compra.

63 operaciones en 13 módulos, documentadas con OpenAPI 3.1.

## Stack

Node.js 20 · Express · PostgreSQL 15 · Prisma · JWT · Google Auth Library · PayU · AWS S3 · Brevo · node-cron · Winston · Docker / Docker Compose · OpenAPI 3.1 + Swagger UI · ESLint · Prettier

## Arquitectura

Arquitectura en capas: `routes → controllers → services → Prisma`.

- **Routes:** definen el endpoint y los middlewares (autenticación, rol, rate limit).
- **Controllers:** leen la petición, llaman al servicio y arman la respuesta (incluidas las cookies).
- **Services:** reglas de negocio y acceso a datos con Prisma, con transacciones donde varias escrituras deben ir juntas.

Antes de llegar a las rutas, cada petición pasa por Helmet, CORS, rate limit global, compresión y el validador de OpenAPI.

## Decisiones técnicas

### El stock se descuenta al pagar, no al pedir
Crear un pedido no toca `stock_quantity`: crea registros de `StockReservation` que vencen a los 15 minutos. El stock disponible se calcula como `stock − reservas activas`. Solo cuando el webhook de PayU confirma el pago se descuenta el inventario y se registra un `StockMovement`.

Así un pedido abandonado no deja inventario "perdido" que alguien tenga que corregir a mano. Si el pago se rechaza o nunca llega, la reserva vence y un cron (cada 15 minutos) la elimina dentro de una transacción. También se puede lanzar a mano desde `/jobs/cleanup-reservations`.

### Access token en header, refresh token en cookie
- El **access token** dura 15 minutos y viaja en `Authorization: Bearer`. Como el navegador no lo envía solo, las rutas protegidas no quedan expuestas a CSRF.
- El **refresh token** dura 7 días y va en una cookie `httpOnly` y `SameSite=Lax`, así que JavaScript no puede leerlo. En la base de datos se guarda su **hash con bcrypt**, no el token, y al cerrar sesión se borra para invalidarlo.
- CORS solo acepta los orígenes configurados en `CORS_ORIGINS`.

### OpenAPI como contrato y como validación
La especificación está dividida por archivos en `src/openapi/` (paths y schemas) y se resuelve al arrancar. El mismo documento sirve para dos cosas: Swagger UI en `/docs` y `express-openapi-validator`, que rechaza peticiones que no cumplen el esquema antes de llegar al controlador. De esa forma la documentación no se desactualiza respecto a lo que la API acepta.

### Webhook de PayU verificado
El webhook valida la **firma MD5** que envía PayU (API key, comercio, referencia, valor, moneda y estado) y la **IP de origen** contra la lista de PayU. Solo después actualiza el pago, y el pedido y el inventario dentro de una transacción.

### Rate limiting por tipo de operación
- Global: 100 peticiones cada 15 minutos por IP.
- Login: 5 intentos fallidos cada 15 minutos (los exitosos no cuentan).
- Recuperación de contraseña: 3 solicitudes cada 15 minutos.
- Creación de pedidos: 3 por minuto.

### Operación
- Health checks en `/health`, `/health/live` y `/health/ready` (incluye la conexión a la base de datos).
- Apagado ordenado: deja de aceptar peticiones, espera las que están en curso y el cron activo, y cierra Prisma.
- Logs con Winston y caché en memoria (node-cache) para consultas frecuentes.
- Las variables de entorno críticas se validan al arrancar: si falta una, la API no inicia.

## Limitaciones conocidas

Las dejo explícitas porque son lo siguiente que corregiría:

- **Carrera al crear pedidos.** La disponibilidad se revisa antes de la transacción que crea las reservas. Dos compras simultáneas del último producto podrían pasar ambas. La solución es hacer la verificación dentro de la transacción con bloqueo de fila (`SELECT … FOR UPDATE`) o con una restricción en la base de datos.
- **Webhook no idempotente.** Si PayU reenvía una notificación de pago aprobado, el stock se descontaría otra vez. Falta ignorar notificaciones de pagos que ya están en estado final.
- **Sin pruebas automatizadas.** Las pruebas fueron manuales (Swagger y `curl-examples.md`) y en el sandbox de PayU.
- **Caché en memoria.** Solo funciona con una instancia; con varias habría que pasar a Redis.

## Cómo correrlo

### Con Docker
```bash
git clone https://github.com/santicollage/NPS-API.git
cd NPS-API
cp .env.example .env.docker   # completar las variables
docker compose up --build
```
Levanta PostgreSQL, la API (aplica las migraciones al iniciar) y pgAdmin para desarrollo.

- API: `http://localhost:3000/api/v1`
- Documentación: `http://localhost:3000/docs`
- pgAdmin: `http://localhost:5050`

### Local
```bash
npm install
cp .env.example .env          # completar las variables
npx prisma migrate dev
npm run seed                  # datos de prueba (opcional)
npm run dev
```

Requiere cuentas propias de Google Cloud (OAuth), PayU (sandbox), AWS S3 y Brevo. La lista completa de variables está en `.env.example`.

## Estructura

```
prisma/          schema, migraciones y seed
src/
├── config/      entorno, base de datos, seguridad, rate limits, caché
├── routes/      endpoints por módulo
├── controllers/ manejo de petición y respuesta
├── services/    lógica de negocio y acceso a datos
├── middlewares/ autenticación, roles, invitados, caché, errores
├── openapi/     especificación OpenAPI dividida en paths y schemas
└── utils/       JWT y logger
```

## Autor

Santiago Urrego · [santicollage.com](https://www.santicollage.com) · [LinkedIn](https://www.linkedin.com/in/jose-santiago-urrego-olaya-145a98210)
