FROM node:20-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema (OpenSSL)
RUN apk add --no-cache openssl

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --only=production

# Copiar el resto del código fuente
COPY . .

# Generar Prisma Client dentro del contenedor (para linux-musl)
RUN npx prisma generate

# Exponer puerto
EXPOSE 3000

# Build entrypoint: run migrations then exec node as PID 1
RUN echo '#!/bin/sh' > /app/entrypoint.sh && \
    echo 'set -e' >> /app/entrypoint.sh && \
    echo 'npx prisma migrate deploy' >> /app/entrypoint.sh && \
    echo 'exec node src/server.js' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
