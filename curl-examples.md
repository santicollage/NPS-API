# Ejemplos de Testing con cURL

## Endpoint de Health Check

### GET /api/ping
```bash
curl -X GET http://localhost:3000/api/ping \
  -H "Content-Type: application/json"
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "env": "development"
}
```

## Conexión a Base de Datos

Para verificar la conexión a la base de datos, puedes usar Prisma Studio:

```bash
npx prisma studio
```

O ejecutar una consulta simple desde la aplicación (requiere implementar un endpoint adicional).

## Testing con Docker

Si usas Docker Compose, los comandos serían:

```bash
# Health check
curl -X GET http://localhost:3000/api/ping

# Ver logs de la aplicación
docker-compose logs app

# Ver logs de PostgreSQL
docker-compose logs postgres
```

## Testing de Documentación

### GET /docs
Accede a la documentación Swagger UI en el navegador:
```
http://localhost:3000/docs