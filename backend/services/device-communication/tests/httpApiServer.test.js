const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createHttpApiServer } = require('../src/http/httpApiServer');

function jsonHeaders() {
  return { 'Content-Type': 'application/json' };
}

test('设备通过 HTTP POST 上报数据，平台可查询最新数据', async () => {
  const app = createHttpApiServer();
  const address = await app.start(0);
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const postResp = await fetch(`${base}/api/v1/http/devices/dev-01/data`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ temperature: 25.8, humidity: 60 })
    });
    assert.equal(postResp.status, 200);

    const getResp = await fetch(`${base}/api/v1/http/devices/dev-01/data`);
    assert.equal(getResp.status, 200);
    const body = await getResp.json();
    assert.equal(body.success, true);
    assert.equal(body.data.deviceId, 'dev-01');
    assert.deepEqual(body.data.payload, { temperature: 25.8, humidity: 60 });
  } finally {
    await app.stop();
  }
});

test('平台向设备端点发送 HTTP GET 并获取响应数据', async () => {
  const mockDeviceServer = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/status') {
      const payload = JSON.stringify({ state: 'ok', battery: 88 });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(payload);
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => mockDeviceServer.listen(0, '127.0.0.1', resolve));
  const deviceAddress = mockDeviceServer.address();
  const deviceBase = `http://127.0.0.1:${deviceAddress.port}`;

  const app = createHttpApiServer();
  const appAddress = await app.start(0);
  const apiBase = `http://127.0.0.1:${appAddress.port}`;

  try {
    const registerResp = await fetch(`${apiBase}/api/v1/http/devices/register`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ deviceId: 'dev-http-2', baseUrl: deviceBase })
    });
    assert.equal(registerResp.status, 201);

    const pullResp = await fetch(`${apiBase}/api/v1/http/devices/dev-http-2/pull?path=/status`);
    assert.equal(pullResp.status, 200);
    const payload = await pullResp.json();

    assert.equal(payload.success, true);
    assert.equal(payload.data.status, 200);
    assert.deepEqual(payload.data.response, { state: 'ok', battery: 88 });
  } finally {
    await app.stop();
    await new Promise((resolve, reject) => {
      mockDeviceServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('未注册设备进行拉取返回 404', async () => {
  const app = createHttpApiServer();
  const address = await app.start(0);
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const resp = await fetch(`${base}/api/v1/http/devices/unknown/pull?path=/status`);
    assert.equal(resp.status, 404);
    const body = await resp.json();
    assert.equal(body.error, 'Endpoint not found');
  } finally {
    await app.stop();
  }
});
