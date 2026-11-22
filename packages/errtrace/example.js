'use strict';

const http = require('node:http');
const {
  createErrorHandler,
  createTraceMiddleware,
  ValidationError,
  NotFoundError,
  getTraceId
} = require('./index');

const traceMiddleware = createTraceMiddleware();
const errorHandler = createErrorHandler();

const server = http.createServer((req, res) => {
  traceMiddleware(req, res, () => {
    try {
      if (req.url === '/api/user') {
        throw new ValidationError('Validation error', {
          missing: ['username', 'email']
        });
      }

      if (req.url === '/api/not-found') {
        throw new NotFoundError('User profile not found');
      }

      if (req.url === '/crash') {
        throw new Error('Unexpected database connection timeout');
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        status: 'ok',
        traceId: getTraceId(),
        message: 'Hello from pure Node.js server'
      }));
    } catch (err) {
      errorHandler(err, req, res);
    }
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Try visiting:');
    console.log(`  http://localhost:${PORT}/api/user`);
    console.log(`  http://localhost:${PORT}/api/not-found`);
    console.log(`  http://localhost:${PORT}/crash`);
  });
}

module.exports = server;
