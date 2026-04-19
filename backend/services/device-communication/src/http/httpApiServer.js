const http = require('node:http');
const { URL } = require('node:url');
const HttpCommunicationStore = require('./httpCommunicationStore');

function createHttpApiServer(options = {}) {
  const store = options.store || new HttpCommunicationStore();
  const fetchImpl = options.fetchImpl || fetch;
  const requestTimeoutMs = options.requestTimeoutMs || 5000;

  const server = http.createServer(async (req, res) => {
    try {
      await routeRequest(req, res);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      writeJson(res, statusCode, {
        error: statusCode === 500 ? 'Internal server error' : 'Bad request',
        details: error.message
      });
    }
  });

  async function routeRequest(req, res) {
    const host = req.headers.host || '127.0.0.1';
    const url = new URL(req.url, `http://${host}`);
    const path = url.pathname;

    if (req.method === 'GET' && path === '/health') {
      return writeJson(res, 200, {
        success: true,
        data: {
          service: 'device-communication-http',
          status: 'healthy',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (req.method === 'POST' && path === '/api/v1/http/devices/register') {
      const body = await readJsonBody(req);
      if (!body.deviceId || !body.baseUrl) {
        return writeJson(res, 400, {
          error: 'Validation error',
          details: 'deviceId and baseUrl are required'
        });
      }
      const endpoint = store.registerEndpoint(String(body.deviceId), String(body.baseUrl));
      return writeJson(res, 201, { success: true, data: endpoint });
    }

    const ingestMatch = path.match(/^\/api\/v1\/http\/devices\/([^/]+)\/data$/);
    if (req.method === 'POST' && ingestMatch) {
      const body = await readJsonBody(req);
      const deviceId = decodeURIComponent(ingestMatch[1]);
      const record = store.saveDeviceData(deviceId, body);
      return writeJson(res, 200, { success: true, data: record });
    }

    if (req.method === 'GET' && ingestMatch) {
      const deviceId = decodeURIComponent(ingestMatch[1]);
      const record = store.getDeviceData(deviceId);
      if (!record) {
        return writeJson(res, 404, {
          error: 'Data not found',
          details: `No HTTP data for device "${deviceId}"`
        });
      }
      return writeJson(res, 200, { success: true, data: record });
    }

    const pullMatch = path.match(/^\/api\/v1\/http\/devices\/([^/]+)\/pull$/);
    if (req.method === 'GET' && pullMatch) {
      const deviceId = decodeURIComponent(pullMatch[1]);
      const endpoint = store.getEndpoint(deviceId);
      if (!endpoint) {
        return writeJson(res, 404, {
          error: 'Endpoint not found',
          details: `No endpoint registered for device "${deviceId}"`
        });
      }

      const devicePath = url.searchParams.get('path') || '/';
      const targetUrl = new URL(devicePath, endpoint.baseUrl).toString();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const downstream = await fetchImpl(targetUrl, {
          method: 'GET',
          signal: controller.signal
        });
        const contentType = downstream.headers.get('content-type') || '';
        const data = contentType.includes('application/json')
          ? await downstream.json()
          : await downstream.text();

        return writeJson(res, 200, {
          success: true,
          data: {
            targetUrl,
            status: downstream.status,
            response: data
          }
        });
      } catch (error) {
        return writeJson(res, 502, {
          error: 'Downstream request failed',
          details: error.name === 'AbortError' ? 'Request timeout' : error.message
        });
      } finally {
        clearTimeout(timer);
      }
    }

    return writeJson(res, 404, {
      error: 'Not found',
      details: `Path "${path}" is not defined`
    });
  }

  return {
    server,
    store,
    async start(port = 3002, host = '127.0.0.1') {
      await new Promise((resolve) => server.listen(port, host, resolve));
      return server.address();
    },
    async stop() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  };
}

function writeJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('Invalid JSON body');
    error.statusCode = 400;
    throw error;
  }
}

module.exports = {
  createHttpApiServer,
  HttpCommunicationStore
};
