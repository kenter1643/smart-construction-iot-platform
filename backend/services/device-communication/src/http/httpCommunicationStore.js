class HttpCommunicationStore {
  constructor() {
    this.deviceData = new Map();
    this.deviceEndpoints = new Map();
  }

  saveDeviceData(deviceId, payload) {
    const record = {
      deviceId,
      payload,
      receivedAt: new Date().toISOString()
    };
    this.deviceData.set(deviceId, record);
    return record;
  }

  getDeviceData(deviceId) {
    return this.deviceData.get(deviceId) || null;
  }

  registerEndpoint(deviceId, baseUrl) {
    const endpoint = {
      deviceId,
      baseUrl,
      registeredAt: new Date().toISOString()
    };
    this.deviceEndpoints.set(deviceId, endpoint);
    return endpoint;
  }

  getEndpoint(deviceId) {
    return this.deviceEndpoints.get(deviceId) || null;
  }
}

module.exports = HttpCommunicationStore;
