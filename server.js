'use strict';

const http = require('node:http');
const {
  createErrorHandler,
  createTraceMiddleware,
  NotFoundError,
  getTraceId
} = require('errtrace');

const { handleApiRoute } = require('./src/routes/apiRoutes');
const { renderDashboard } = require('./src/ui/dashboard');

// Initialize errtrace trace propagation middleware
const traceMiddleware = createTraceMiddleware();

// Initialize errtrace structured error handler
const errorHandler = createErrorHandler({
  headerName: 'x-trace-id',
  includeDetails: true,
  includeRequestInfo: true,
  // Custom logger callback as documented in errtrace API Reference
  logger: (payload, err) => {
    const { traceId, statusCode, code, message } = payload.error;
    console.log(`[${new Date().toISOString()}] [Trace: ${traceId}] HTTP ${statusCode} ${code} - ${message}`);
  },
  // Custom error hook as documented in errtrace API Reference
  onError: (err, req, res, traceId) => {
    // Allows sending alert/metrics or audit log
  }
});

/**
 * Pure Node.js HTTP Server.
 * Demonstrates native zero-dependency integration with errtrace.
 */
const server = http.createServer((req, res) => {
  // 1. Wrap request in errtrace trace context
  traceMiddleware(req, res, async () => {
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      // 2. Serve interactive HTML dashboard at root
      if ((parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') && req.method === 'GET') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(
          renderDashboard({
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development',
            uptimeSeconds: Math.floor(process.uptime()),
            traceId: getTraceId()
          })
        );
      }

      // 3. Dispatch to API routes
      const handled = await handleApiRoute(req, res);
      if (handled !== null) {
        return;
      }

      // 4. Default 404 for unmapped endpoints
      throw new NotFoundError(`Endpoint "${parsedUrl.pathname}" does not exist`, {
        requestedPath: parsedUrl.pathname,
        method: req.method,
        suggestion: 'Visit GET / for the interactive API testing dashboard or GET /api/catalog for all endpoints'
      });
    } catch (err) {
      // 5. Catch any synchronous or asynchronous error and dispatch via errtrace
      errorHandler(err, req, res);
    }
  });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 errtrace Evaluation Server listening on port ${PORT}`);
    console.log(`🌐 Live Dashboard:  http://localhost:${PORT}`);
    console.log(`🩺 Health Endpoint: http://localhost:${PORT}/health`);
    console.log(`Environment:       ${process.env.NODE_ENV || 'development'}`);
    console.log('====================================================');
  });

  const shutdown = () => {
    console.log('\nShutting down server gracefully...');
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = server;
