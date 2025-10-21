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

# Comando de inicio
CMD ["npm", "start"]
