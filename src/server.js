require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const RefParser = require('@apidevtools/json-schema-ref-parser');

const app = express();

// Middleware básico
app.use(express.json());

// Puerto configurable
const PORT = process.env.PORT || 3000;

// Endpoint de prueba
app.get('/api/ping', (req, res) => {
  res.status(200).json({
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
  });
});

// --- Cargar y resolver OpenAPI ---
(async () => {
  try {
    // Ruta absoluta al archivo principal OpenAPI
    const openApiPath = path.resolve(__dirname, 'openapi', 'openapi.yaml');

    // Verificar existencia del archivo principal
    if (!fs.existsSync(openApiPath)) {
      throw new Error(`No se encontró el archivo OpenAPI en: ${openApiPath}`);
    }

    console.log('📘 Cargando especificación OpenAPI desde:', openApiPath);

    // Resolver referencias ($ref:) correctamente
    const resolvedSpec = await RefParser.dereference(openApiPath);

    console.log('✅ Especificación OpenAPI cargada y resuelta correctamente');

    // Montar Swagger UI con la documentación resuelta
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(resolvedSpec));
  } catch (error) {
    console.error('❌ Error al resolver referencias OpenAPI:', error.message);
  }
})();

// --- Iniciar servidor ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📄 Documentación disponible en http://localhost:${PORT}/docs`);
});

module.exports = app;
