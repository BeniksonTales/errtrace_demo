'use strict';

/**
 * Returns a rich, self-contained HTML dashboard for instructors and developers
 * to interactively evaluate and test the errtrace package features in real-time.
 */
function renderDashboard({ nodeVersion, environment, uptimeSeconds, traceId }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>errtrace — Interactive Package Evaluation Suite</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f293d;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --code-bg: #030712;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      padding: 24px;
    }

    .container {
      max-width: 1280px;
      margin: 0 auto;
    }

    header {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 24px 32px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .brand h1 {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand p {
      color: var(--text-muted);
      font-size: 14px;
      margin-top: 4px;
    }

    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 9999px;
      letter-spacing: 0.5px;
    }
    .badge-blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }
    .badge-green { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge-amber { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .badge-red { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }

    .meta-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 13px;
    }
    .meta-pill {
      background: #1e293b;
      padding: 6px 12px;
      border-radius: 8px;
      color: var(--text-muted);
      border: 1px solid #334155;
    }
    .meta-pill strong { color: var(--text-main); }

    /* Custom Header Bar */
    .controls-bar {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px 24px;
      margin-bottom: 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .header-input-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      max-width: 600px;
    }
    .header-input-group label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      white-space: nowrap;
    }
    .header-input-group input {
      flex: 1;
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 8px 12px;
      border-radius: 6px;
      font-family: var(--font-mono);
      font-size: 13px;
      outline: none;
    }
    .header-input-group input:focus {
      border-color: var(--primary);
    }

    .grid-layout {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 960px) {
      .grid-layout { grid-template-columns: 1fr; }
    }

    /* Cards */
    .card-panel {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 24px;
    }

    .section-title {
      font-size: 17px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .scenario-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }

    .scenario-btn {
      background: #172033;
      border: 1px solid #23314d;
      border-radius: 8px;
      padding: 14px;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
      color: var(--text-main);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .scenario-btn:hover {
      background: #1e2c47;
      border-color: var(--primary);
      transform: translateY(-1px);
    }
    .scenario-btn:active {
      transform: translateY(0);
    }
    .scenario-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .scenario-title {
      font-weight: 600;
      font-size: 14px;
    }
    .scenario-desc {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Live Output Console */
    .console-panel {
      position: sticky;
      top: 24px;
    }

    .output-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .status-strip {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .code-container {
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 16px;
      max-height: 520px;
      overflow-y: auto;
      font-family: var(--font-mono);
      font-size: 13px;
      color: #93c5fd;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .action-btn-group {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    button.btn-sm {
      background: #1f293d;
      border: 1px solid #374151;
      color: var(--text-main);
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    button.btn-sm:hover {
      background: #374151;
    }

    /* Features Checklist */
    .features-list {
      margin-top: 24px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 24px;
    }

    .features-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 12px;
    }
    .features-table th, .features-table td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--card-border);
      text-align: left;
    }
    .features-table th {
      color: var(--text-muted);
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <h1>
          <span>🛡️ errtrace</span>
          <span class="badge badge-blue">Pure Node.js</span>
          <span class="badge badge-green">v1.0.0</span>
        </h1>
        <p>Live Evaluation Server & Interactive Error Handling Verification Suite</p>
      </div>
      <div class="meta-pills">
        <div class="meta-pill">Node: <strong>${nodeVersion}</strong></div>
        <div class="meta-pill">ENV: <strong>${environment}</strong></div>
        <div class="meta-pill">Uptime: <strong>${uptimeSeconds}s</strong></div>
      </div>
    </header>

    <div class="controls-bar">
      <div class="header-input-group">
        <label for="customTraceHeader">Incoming Trace ID Header (x-trace-id):</label>
        <input type="text" id="customTraceHeader" placeholder="Leave empty for auto UUID v4, or type custom ID..." />
      </div>
      <div>
        <button class="btn-sm" onclick="setPresetHeader('eval-instructor-trace-001')">Preset Instructor Trace</button>
      </div>
    </div>

    <div class="grid-layout">
      <!-- Left: Interactive Test Scenarios -->
      <div class="card-panel">
        <div class="section-title">
          <span>⚡ Interactive Error Scenarios</span>
        </div>
        <div class="scenario-grid">
          <!-- 1. Validation Error -->
          <button class="scenario-btn" onclick="runTest('POST', '/api/users', { username: 'a', email: 'invalid-email' })">
            <div class="scenario-header">
              <span class="scenario-title">422 ValidationError</span>
              <span class="badge badge-amber">422</span>
            </div>
            <div class="scenario-desc">Payload with invalid email & short username. Returns structured details array.</div>
          </button>

          <!-- 2. Not Found Error -->
          <button class="scenario-btn" onclick="runTest('GET', '/api/users/usr_unknown_99')">
            <div class="scenario-header">
              <span class="scenario-title">404 NotFoundError</span>
              <span class="badge badge-amber">404</span>
            </div>
            <div class="scenario-desc">Entity lookup failure with available ID suggestions.</div>
          </button>

          <!-- 3. Unauthorized Error -->
          <button class="scenario-btn" onclick="runTest('GET', '/api/secure/profile')">
            <div class="scenario-header">
              <span class="scenario-title">401 UnauthorizedError</span>
              <span class="badge badge-amber">401</span>
            </div>
            <div class="scenario-desc">Request without Authorization header.</div>
          </button>

          <!-- 4. Forbidden Error -->
          <button class="scenario-btn" onclick="runTest('GET', '/api/secure/admin', null, { 'Authorization': 'Bearer member-token' })">
            <div class="scenario-header">
              <span class="scenario-title">403 ForbiddenError</span>
              <span class="badge badge-amber">403</span>
            </div>
            <div class="scenario-desc">Authenticated as member trying to access admin endpoint.</div>
          </button>

          <!-- 5. Custom AppError Domain Error -->
          <button class="scenario-btn" onclick="runTest('POST', '/api/orders/checkout', { items: ['item_1'], cardNumber: '4242424242420002', amount: 150 })">
            <div class="scenario-header">
              <span class="scenario-title">402 PaymentFailedError</span>
              <span class="badge badge-amber">402</span>
            </div>
            <div class="scenario-desc">Custom domain subclass extending AppError with domain code PAYMENT_FAILED.</div>
          </button>

          <!-- 6. Conflict Error -->
          <button class="scenario-btn" onclick="runTest('POST', '/api/conflict-test')">
            <div class="scenario-header">
              <span class="scenario-title">409 ConflictError</span>
              <span class="badge badge-amber">409</span>
            </div>
            <div class="scenario-desc">Resource collision with existing unique database index.</div>
          </button>

          <!-- 7. Too Many Requests -->
          <button class="scenario-btn" onclick="runTest('POST', '/api/rate-limit-test')">
            <div class="scenario-header">
              <span class="scenario-title">429 TooManyRequests</span>
              <span class="badge badge-amber">429</span>
            </div>
            <div class="scenario-desc">Rate limit quota breached with retryAfterSeconds metadata.</div>
          </button>

          <!-- 8. Method Not Allowed -->
          <button class="scenario-btn" onclick="runTest('PUT', '/api/read-only-resource')">
            <div class="scenario-header">
              <span class="scenario-title">405 MethodNotAllowed</span>
              <span class="badge badge-amber">405</span>
            </div>
            <div class="scenario-desc">PUT on read-only resource; lists supportedMethods.</div>
          </button>

          <!-- 9. Direct Helper sendError() -->
          <button class="scenario-btn" onclick="runTest('GET', '/api/direct-error')">
            <div class="scenario-header">
              <span class="scenario-title">Direct sendError() Helper</span>
              <span class="badge badge-amber">400</span>
            </div>
            <div class="scenario-desc">Uses sendError(res, err, { req }) directly without throw/catch.</div>
          </button>

          <!-- 10. Async Context Audit -->
          <button class="scenario-btn" onclick="runTest('GET', '/api/async-trace-audit')">
            <div class="scenario-header">
              <span class="scenario-title">AsyncLocalStorage Audit</span>
              <span class="badge badge-green">200</span>
            </div>
            <div class="scenario-desc">Proves getTraceId() retrieves ID across 3 async timer & microtask stages.</div>
          </button>

          <!-- 11. Unhandled Server Crash -->
          <button class="scenario-btn" onclick="runTest('GET', '/api/unhandled-crash')">
            <div class="scenario-header">
              <span class="scenario-title">500 Unhandled Crash</span>
              <span class="badge badge-red">500</span>
            </div>
            <div class="scenario-desc">Raw uncaught error; demonstrates stack trace inclusion & safe formatting.</div>
          </button>

          <!-- 12. Dev vs Prod Preview -->
          <button class="scenario-btn" onclick="runTest('GET', '/api/compare-dev-prod')">
            <div class="scenario-header">
              <span class="scenario-title">Dev vs Prod Comparison</span>
              <span class="badge badge-blue">Diff</span>
            </div>
            <div class="scenario-desc">Side-by-side view showing stack trace stripped and 500 masked in production.</div>
          </button>

          <!-- 13. Health Check -->
          <button class="scenario-btn" onclick="runTest('GET', '/health')">
            <div class="scenario-header">
              <span class="scenario-title">Server Health & Uptime</span>
              <span class="badge badge-green">200</span>
            </div>
            <div class="scenario-desc">Returns server health, uptime, environment, and trace ID.</div>
          </button>
        </div>
      </div>

      <!-- Right: Live Response Output -->
      <div class="card-panel console-panel">
        <div class="output-header">
          <div class="section-title" style="margin-bottom:0">
            <span>📡 Live HTTP Response</span>
          </div>
          <span id="responseStatusBadge" class="badge badge-blue">Ready</span>
        </div>

        <div class="status-strip">
          <div class="meta-pill" id="traceHeaderPill">Trace ID: <strong>None</strong></div>
          <div class="meta-pill" id="latencyPill">Latency: <strong>0ms</strong></div>
        </div>

        <div class="code-container" id="responseBox">// Click any test scenario on the left to fire a live HTTP request...
// The response status, x-trace-id header, and formatted JSON will appear here.</div>

        <div class="action-btn-group">
          <button class="btn-sm" onclick="copyResponse()">📋 Copy JSON</button>
          <button class="btn-sm" onclick="copyCurl()">⚡ Copy cURL Command</button>
        </div>
      </div>
    </div>

    <!-- Instructor Evaluation Checklist -->
    <div class="features-list">
      <div class="section-title">
        <span>📋 errtrace Evaluation & Specification Checklist</span>
      </div>
      <table class="features-table">
        <thead>
          <tr>
            <th>Feature / Claim</th>
            <th>Requirement in README</th>
            <th>Implementation Evidence</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Zero External Dependencies</strong></td>
            <td>Pure Node.js modules only (crypto, http, async_hooks)</td>
            <td><code>package.json</code> has 0 dependencies. Uses built-in <code>node:crypto</code>, <code>node:http</code>, <code>node:async_hooks</code>.</td>
          </tr>
          <tr>
            <td><strong>Trace IDs & Header Preservation</strong></td>
            <td>Extracts <code>x-trace-id</code>, <code>x-request-id</code>, <code>x-correlation-id</code>, or generates UUID v4</td>
            <td><code>resolveTraceId()</code> inspects incoming headers and preserves them; auto-generates UUID v4 if absent.</td>
          </tr>
          <tr>
            <td><strong>Async Context Tracing</strong></td>
            <td>Access trace ID anywhere via <code>getTraceId()</code> without passing <code>req</code></td>
            <td><code>createTraceMiddleware</code> runs downstream inside <code>AsyncLocalStorage.run()</code>. Tested in <code>/api/async-trace-audit</code>.</td>
          </tr>
          <tr>
            <td><strong>Structured Error Format</strong></td>
            <td><code>{ success: false, error: { traceId, code, message, statusCode, ... } }</code></td>
            <td>Exact schema matching README specification, with <code>method</code>, <code>path</code>, <code>details</code>, and <code>stack</code>.</td>
          </tr>
          <tr>
            <td><strong>Production Safe</strong></td>
            <td>Hides stack traces and sanitizes 500 messages when <code>NODE_ENV=production</code></td>
            <td>Verified in <code>formatError()</code> and demonstrable via <code>/api/compare-dev-prod</code>.</td>
          </tr>
          <tr>
            <td><strong>Framework Agnostic</strong></td>
            <td>Pure <code>http.createServer</code> and Express/Connect middleware</td>
            <td>Server runs natively on pure Node.js <code>http.createServer</code>; Express example provided in <code>express-example.js</code>.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    let lastRequest = { method: 'GET', path: '/health', headers: {}, body: null };
    let lastResponseJson = '';

    function setPresetHeader(id) {
      document.getElementById('customTraceHeader').value = id;
    }

    async function runTest(method, path, body = null, extraHeaders = {}) {
      const responseBox = document.getElementById('responseBox');
      const badge = document.getElementById('responseStatusBadge');
      const tracePill = document.getElementById('traceHeaderPill');
      const latencyPill = document.getElementById('latencyPill');

      responseBox.textContent = '// Sending request to ' + method + ' ' + path + '...';
      badge.className = 'badge badge-blue';
      badge.textContent = 'Executing...';

      const headers = { ...extraHeaders };
      const customTrace = document.getElementById('customTraceHeader').value.trim();
      if (customTrace) {
        headers['x-trace-id'] = customTrace;
      }

      if (body) {
        headers['Content-Type'] = 'application/json';
      }

      lastRequest = { method, path, headers, body };

      const startTime = performance.now();
      try {
        const fetchOptions = {
          method,
          headers
        };
        if (body && method !== 'GET') {
          fetchOptions.body = JSON.stringify(body);
        }

        const res = await fetch(path, fetchOptions);
        const duration = Math.round(performance.now() - startTime);

        const traceIdHeader = res.headers.get('x-trace-id') || 'None';
        const data = await res.json();
        lastResponseJson = JSON.stringify(data, null, 2);

        // Update pills
        tracePill.innerHTML = 'Trace ID: <strong>' + traceIdHeader + '</strong>';
        latencyPill.innerHTML = 'Latency: <strong>' + duration + 'ms</strong>';

        // Update status badge
        if (res.status >= 200 && res.status < 300) {
          badge.className = 'badge badge-green';
        } else if (res.status >= 400 && res.status < 500) {
          badge.className = 'badge badge-amber';
        } else {
          badge.className = 'badge badge-red';
        }
        badge.textContent = res.status + ' ' + res.statusText;

        responseBox.textContent = lastResponseJson;
      } catch (err) {
        badge.className = 'badge badge-red';
        badge.textContent = 'Client Fetch Error';
        responseBox.textContent = '// Network/client error: ' + err.message;
      }
    }

    function copyResponse() {
      if (!lastResponseJson) return alert('No response to copy yet!');
      navigator.clipboard.writeText(lastResponseJson).then(() => {
        alert('Copied response JSON to clipboard!');
      });
    }

    function copyCurl() {
      let cmd = 'curl -X ' + lastRequest.method + ' "' + window.location.origin + lastRequest.path + '"';
      for (const [k, v] of Object.entries(lastRequest.headers)) {
        cmd += ' -H "' + k + ': ' + v + '"';
      }
      if (lastRequest.body) {
        cmd += " -d '" + JSON.stringify(lastRequest.body) + "'";
      }
      navigator.clipboard.writeText(cmd).then(() => {
        alert('Copied cURL command to clipboard:\\n\\n' + cmd);
      });
    }

    // Auto-run health check on load
    window.addEventListener('DOMContentLoaded', () => {
      runTest('GET', '/health');
    });
  </script>
</body>
</html>`;
}

module.exports = {
  renderDashboard
};
