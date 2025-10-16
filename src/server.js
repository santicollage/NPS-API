require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const $RefParser = require('json-refs');

const app = express();

// Middleware básico
app.use(express.json());

// Puerto configurable
const PORT = process.env.PORT || 3000;

// Endpoint de prueba
app.get('/api/ping', (req, res) => {
  res.status(200).json({
    status: 'ok',
    env: process.env.NODE_ENV || 'development'
  });
});

// Swagger UI setup
const openApiPath = path.join(__dirname, 'openapi', 'openapi.yaml');
const openApiDocument = yaml.load(fs.readFileSync(openApiPath, 'utf8'));

// Resolver referencias modulares
$RefParser.resolveRefs(openApiDocument, {
  location: openApiPath,
  loaderOptions: {
    processContent: (res, callback) => {
      callback(null, yaml.load(res.text));
    }
  }
}).then((resolvedSpec) => {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(resolvedSpec.resolved));
}).catch((err) => {
  console.error('Error al resolver referencias OpenAPI:', err);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Documentación disponible en http://localhost:${PORT}/docs`);
});

module.exports = app;