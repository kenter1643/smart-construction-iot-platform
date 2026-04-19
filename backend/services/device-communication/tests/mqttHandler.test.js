const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MqttCommunicationHandler,
  MQTT_PROTOCOLS,
  topicMatches
} = require('../src/mqtt/mqttHandler');

test('支持 MQTT 协议版本映射（3.1/3.1.1/5.0）', () => {
  const h31 = new MqttCommunicationHandler({ protocolVersion: '3.1' });
  const h311 = new MqttCommunicationHandler({ protocolVersion: '3.1.1' });
  const h50 = new MqttCommunicationHandler({ protocolVersion: '5.0' });

  assert.equal(h31.getConnectOptions().protocolVersion, MQTT_PROTOCOLS['3.1']);
  assert.equal(h311.getConnectOptions().protocolVersion, MQTT_PROTOCOLS['3.1.1']);
  assert.equal(h50.getConnectOptions().protocolVersion, MQTT_PROTOCOLS['5.0']);
});

test('发布消息：订阅者可收到并解析 JSON 载荷', async () => {
  const handler = new MqttCommunicationHandler();
  handler.connect();

  const received = await new Promise((resolve) => {
    handler.subscribe('site/1/sensors/temp', resolve);
    handler.publish('site/1/sensors/temp', { value: 26.5, unit: 'C' });
  });

  assert.equal(received.topic, 'site/1/sensors/temp');
  assert.deepEqual(received.payload, { value: 26.5, unit: 'C' });
});

test('订阅通配符主题：可接收匹配消息', async () => {
  const handler = new MqttCommunicationHandler();
  handler.connect();

  const received = await new Promise((resolve) => {
    handler.subscribe('site/+/alerts/#', resolve);
    handler.publish('site/a/alerts/fire/zone-1', { level: 'high' });
  });

  assert.equal(received.topic, 'site/a/alerts/fire/zone-1');
  assert.deepEqual(received.payload, { level: 'high' });
});

test('取消订阅后不再接收消息', async () => {
  const handler = new MqttCommunicationHandler();
  handler.connect();
  let hitCount = 0;

  const fn = () => {
    hitCount += 1;
  };
  handler.subscribe('site/2/status', fn);
  handler.publish('site/2/status', { online: true });
  handler.unsubscribe('site/2/status', fn);
  handler.publish('site/2/status', { online: false });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(hitCount, 1);
});

test('未连接状态下发布/订阅会报错', () => {
  const handler = new MqttCommunicationHandler();

  assert.throws(() => handler.publish('a/b', { ok: true }), /not connected/);
  assert.throws(() => handler.subscribe('a/b', () => {}), /not connected/);
});

test('topicMatches 支持 + 和 #', () => {
  assert.equal(topicMatches('a/+/c', 'a/b/c'), true);
  assert.equal(topicMatches('a/+/c', 'a/b/d'), false);
  assert.equal(topicMatches('a/#', 'a/b/c/d'), true);
  assert.equal(topicMatches('a/b', 'a/b/c'), false);
});
