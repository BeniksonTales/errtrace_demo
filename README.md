# errtrace Evaluation & Live Demo Server

> **Production-ready, zero-dependency demonstration and evaluation server for the [`errtrace`](https://www.npmjs.com/package/errtrace) npm package.**

This server demonstrates every feature, error class, async tracing mechanism, and error-handling pattern defined in the **`errtrace`** specification. It includes a **built-in interactive Web UI Playground** at `/` for evaluation, plus a complete REST API testable via `curl` or Postman.

---

## 🚀 Key Features Demonstrated

1. **Pure Node.js & Zero External Dependencies**: Runs entirely on native Node.js (`node:http`, `node:crypto`, `node:async_hooks`). No external runtime frameworks required.
2. **Trace ID Generation & Propagation**:
   - Preserves incoming `x-trace-id`, `x-request-id`, `x-correlation-id`, and `traceparent` headers.
   - Generates cryptographically secure UUID v4 trace IDs when headers are absent.
   - Automatically sets the response header `x-trace-id`.
3. **Async Context Tracing (`AsyncLocalStorage`)**:
   - Trace IDs are retrieved anywhere in service layers, database queries, and async queues via `getTraceId()` without passing `req` down through function arguments.
4. **Structured Developer Responses**:
   - Uniform response envelope matching `{ success: false, error: { traceId, code, message, statusCode, timestamp, method, path, details, stack } }`.
5. **Production Safety & Sanitization**:
   - In `NODE_ENV=production`, stack traces are hidden and unexpected 500 errors are masked to prevent leaking sensitive infrastructure details.
6. **Built-in Semantic Error Classes**:
   - `BadRequestError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `MethodNotAllowedError` (405), `ConflictError` (409), `ValidationError` (422), `TooManyRequestsError` (429), `InternalServerError` (500).
7. **Custom Domain Error Inheritance**:
   - Demonstrates extending `AppError` for domain-specific errors (e.g. `PaymentFailedError` with status 402).
8. **Direct Response Helper**:
   - Demonstrates `sendError(res, err, { req })` without middleware instantiation.
9. **Interactive Web Dashboard**:
   - Hosted at `GET /` with live triggers, status badges, custom header injector, latency timing, and JSON syntax highlighting.

---

## 🛠️ Quick Start (Local)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Test Suite
```bash
npm test
```
All 13 integration and contract tests run with Node's native test runner (`node --test`).

### 3. Start the Server
```bash
npm start
```
The server will start at:
- **Interactive Web UI**: [http://localhost:3000](http://localhost:3000)
- **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

---

## 🌐 Deploying for Instructor Evaluation

This project is configured for **1-click cloud deployment** on standard cloud platforms:

### Option A: Render (Recommended)
1. Push this repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** → **Web Service**.
3. Select your repository.
4. Render will automatically detect `render.yaml` or set:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Deploy**. Your live evaluation URL will be `https://<your-service-name>.onrender.com`.

### Option B: Railway
1. Push to GitHub and connect repository to [Railway](https://railway.app).
2. Railway detects `package.json` and runs `npm install && npm start`.
3. Generate a public domain under service settings.

### Option C: Docker / Fly.io / Cloud Run
Build and run using the included lightweight Dockerfile:
```bash
docker build -t errtrace-server .
docker run -p 3000:3000 -e NODE_ENV=production errtrace-server
```

---

## 🧪 Interactive Web Dashboard (`GET /`)

When you open the deployed server in a browser:
- **Custom Header Injector**: Type any custom trace ID (e.g., `instructor-trace-001`) to test header preservation.
- **Test Scenarios**: Click any scenario button to trigger the HTTP request and see status code, response headers, latency, and formatted JSON in real time.
- **Copy cURL**: One-click button to export the exact curl command for command-line verification.

---

## 📡 API Endpoint Reference & cURL Cheatsheet

| HTTP Method | Path | Expected Code | Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | `OK` | `200` | Health check with active trace ID and system uptime |
| `POST` | `/api/users` | `VALIDATION_ERROR` | `422` | Throws `ValidationError` with field-level issues |
| `GET` | `/api/users/:id` | `NOT_FOUND` | `404` | Throws `NotFoundError` with ID lookup metadata |
| `GET` | `/api/secure/profile` | `UNAUTHORIZED` | `401` | Throws `UnauthorizedError` when auth header is missing |
| `GET` | `/api/secure/admin` | `FORBIDDEN` | `403` | Throws `ForbiddenError` when role is insufficient |
| `POST` | `/api/orders/checkout` | `PAYMENT_FAILED` | `402` | Custom domain error extending `AppError` |
| `POST` | `/api/conflict-test` | `CONFLICT` | `409` | Throws `ConflictError` on unique constraint conflict |
| `POST` | `/api/rate-limit-test` | `TOO_MANY_REQUESTS` | `429` | Throws `TooManyRequestsError` with retry delay |
| `PUT` | `/api/read-only-resource` | `METHOD_NOT_ALLOWED` | `405` | Throws `MethodNotAllowedError` for invalid verb |
| `GET` | `/api/direct-error` | `BAD_REQUEST` | `400` | Directly uses `sendError(res, err, { req })` |
| `GET` | `/api/async-trace-audit` | `OK` | `200` | Proves `getTraceId()` across 3 async stages |
| `GET` | `/api/unhandled-crash` | `INTERNAL_SERVER_ERROR` | `500` | Captures uncaught error with stack trace |
| `GET` | `/api/compare-dev-prod` | `OK` | `200` | Compares dev vs production error formatting |

### Sample Terminal Commands:

#### 1. Validation Error (422) with Details
```bash
curl -i -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{"username": "a", "email": "invalid-email"}'
```

#### 2. Custom Incoming Trace ID Preservation
```bash
curl -i -X GET "http://localhost:3000/api/users/usr_unknown" \
  -H "x-trace-id: instructor-evaluation-trace-999"
```

#### 3. Custom Domain Error (402 PaymentFailedError)
```bash
curl -i -X POST "http://localhost:3000/api/orders/checkout" \
  -H "Content-Type: application/json" \
  -d '{"items": ["item_101"], "cardNumber": "4242424242420002", "amount": 199.99}'
```

#### 4. Async Context Propagation Audit
```bash
curl -i -X GET "http://localhost:3000/api/async-trace-audit"
```

---

## 📁 Project Architecture

```
npm_test_1/
├── src/
│   ├── errors/
│   │   └── customErrors.js # Subclasses of AppError (PaymentFailedError)
│   ├── routes/
│   │   └── apiRoutes.js   # Route handlers and error-triggering endpoints
│   ├── services/
│   │   ├── orderService.js # Async checkout & multi-stage trace audit
│   │   └── userService.js  # User validation, lookup & auth simulation
│   └── ui/
│       └── dashboard.js   # Self-contained interactive evaluation UI
├── test/
│   └── server.test.js     # Native test suite (13 passing tests)
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore file
├── Dockerfile             # Container definition for Cloud Run / Fly.io
├── express-example.js     # Express compatibility demonstration
├── package.json           # Scripts and dependencies (errtrace: ^1.0.0)
├── Procfile               # Heroku / Render / Railway process definition
├── render.yaml            # Render 1-click blueprint
├── server.js              # Pure Node.js HTTP server entry point
└── README.md              # Instructor evaluation guide
```

---

## 📄 License

MIT
# errtrace_demo
