require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');
const RefParser = require('@apidevtools/json-schema-ref-parser');

const apiRoutes = require('./routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // limit of 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

app.use('/api', apiRoutes);

(async () => {
  try {
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

    // Basic error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ error: 'Something went wrong!' });
    });

    // Middleware for missing routes
    app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
  } catch (error) {
    console.error('❌ Error resolving OpenAPI references:', error.message);
  }
})();

module.exports = app;
