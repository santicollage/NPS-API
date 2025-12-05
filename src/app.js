import 'dotenv/config';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import OpenApiValidator from 'express-openapi-validator';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import RefParser from '@apidevtools/json-schema-ref-parser';
import compression from 'compression';
import errorHandler from './middlewares/errorHandler.js';
import setupSecurity from './config/security.js';
import apiRoutes from './routes/index.js';

const app = express();

setupSecurity(app);

app.use(compression());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes and error handling are left inside the async to allow the documentation reading and validation to be loaded correctly
(async () => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const openApiPath = path.resolve(__dirname, 'openapi', 'openapi.yaml');

    if (!fs.existsSync(openApiPath)) {
      throw new Error(`The OpenAPI file was not found in: ${openApiPath}`);
    }

    console.log('📘 Loading OpenAPI specification from:', openApiPath);

    // Resolve references ($ref:) correctly from openapi.yaml
    const resolvedSpec = await RefParser.dereference(openApiPath);

    console.log('✅ OpenAPI specification loaded and resolved successfully.');

    // Build Swagger UI with the documentation sorted
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(resolvedSpec));

    // OpenAPI Automatic Validation
    app.use(
      OpenApiValidator.middleware({
        apiSpec: resolvedSpec,
        validateRequests: true,
        validateResponses: false,
      })
    );

    // Routes
    app.use('/api', apiRoutes);

    // Middleware for missing routes
    app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });

    app.use(errorHandler);
  } catch (error) {
    console.error('❌ Error resolving OpenAPI references:', error.message);
  }
})();

export default app;
