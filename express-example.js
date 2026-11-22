'use strict';

/**
 * Express / Connect Integration Example for errtrace.
 * Demonstrates the "Framework Agnostic" capability documented in the README.
 *
 * To run this example with Express:
 *   npx --yes express node express-example.js
 */

try {
  const express = require('express');
  const {
    createTraceMiddleware,
    createErrorHandler,
    ValidationError,
    NotFoundError,
    getTraceId
  } = require('errtrace');

  const app = express();
  app.use(express.json());

  // 1. Mount trace middleware at top of pipeline
  app.use(createTraceMiddleware());

  // Sample routes
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'ok',
      traceId: getTraceId() // Accessible anywhere
    });
  });

  app.post('/api/validate', (req, res) => {
    if (!req.body.name) {
      throw new ValidationError('Validation failed', { missing: ['name'] });
    }
    res.json({ success: true, name: req.body.name });
  });

  // 404 handler
  app.use((req, res, next) => {
    next(new NotFoundError(`Route ${req.originalUrl} not found`));
  });

  // 2. Mount error handler at the end of middleware chain
  app.use(createErrorHandler());

  const PORT = process.env.EXPRESS_PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Express errtrace demo running on http://localhost:${PORT}`);
  });
} catch (err) {
  console.log('To run this Express demo, install express: npm i express');
  console.log('Or run the main zero-dependency pure Node.js server with: npm start');
}
