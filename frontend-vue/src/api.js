import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_DEVICE_API_BASE || "http://localhost:3001/api/v1",
  timeout: 10000
});

export async function fetchDevices() {
  const { data } = await client.get("/devices");
  return data?.data?.devices || [];
}

export async function createDevice(payload) {
  const { data } = await client.post("/devices", payload);
  return data?.data;
}

export async function updateDevice(id, payload) {
  const { data } = await client.put(`/devices/${id}`, payload);
  return data?.data;
}

export async function removeDevice(id) {
  await client.delete(`/devices/${id}`);
}
