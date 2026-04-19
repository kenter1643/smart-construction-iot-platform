import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { fetchDevices, createDevice, updateDevice, removeDevice } from "../api";

export const useDeviceStore = defineStore("device", () => {
  const devices = ref([]);
  const loading = ref(false);
  const keyword = ref("");
  const status = ref("");

  const filteredDevices = computed(() => {
    return devices.value.filter((item) => {
      const matchesKeyword =
        !keyword.value ||
        item.name?.toLowerCase().includes(keyword.value.toLowerCase()) ||
        item.deviceId?.toLowerCase().includes(keyword.value.toLowerCase());
      const matchesStatus = !status.value || item.status === status.value;
      return matchesKeyword && matchesStatus;
    });
  });

  const stats = computed(() => {
    const total = filteredDevices.value.length;
    const online = filteredDevices.value.filter((d) => d.status === "online").length;
    const offline = filteredDevices.value.filter((d) => d.status !== "online").length;
    return { total, online, offline };
  });

  async function reload() {
    loading.value = true;
    try {
      devices.value = await fetchDevices();
    } finally {
      loading.value = false;
    }
  }

  async function add(payload) {
    await createDevice(payload);
    await reload();
  }

  async function edit(id, payload) {
    await updateDevice(id, payload);
    await reload();
  }

  async function remove(id) {
    await removeDevice(id);
    await reload();
  }

  return {
    devices,
    loading,
    keyword,
    status,
    filteredDevices,
    stats,
    reload,
    add,
    edit,
    remove
  };
});
