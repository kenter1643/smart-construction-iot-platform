import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, 'index.html'), 'utf8');

const requiredIds = [
  'toast-container',
  'api-status',
  'status-dot',
  'status-text',
  'total-devices',
  'online-devices',
  'offline-devices',
  'alerts',
  'search',
  'filter-type',
  'filter-protocol',
  'filter-status',
  'device-table-body',
  'device-detail-panel',
  'add-device-modal',
  'edit-modal',
  'add-deviceId',
  'add-name',
  'add-type',
  'add-protocol',
  'add-status',
  'edit-id',
  'edit-deviceId',
  'edit-name',
  'edit-type',
  'edit-protocol',
  'edit-status'
];

const requiredFunctions = [
  'fetchDevices',
  'renderDevices',
  'renderDeviceDetails',
  'selectDevice',
  'updateStats',
  'applyFilters',
  'searchDevices',
  'resetFilters',
  'openAddDeviceModal',
  'closeAddDeviceModal',
  'saveAddDevice',
  'editDevice',
  'closeEditModal',
  'saveEditDevice',
  'deleteDevice',
  'checkApiStatus',
  'showToast'
];

const forbiddenEmojiPattern = /[🏗️📊📈🎥⚠️⚙️🟢🔴🚨🔍🔄➕📥❌📭✅✏️]/u;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const id of requiredIds) {
  assert(
    html.includes(`id="${id}"`) || html.includes(`id='${id}'`),
    `Missing required id: ${id}`
  );
}

for (const fn of requiredFunctions) {
  assert(
    new RegExp(`function\\s+${fn}\\s*\\(`).test(html) ||
      new RegExp(`const\\s+${fn}\\s*=`).test(html),
    `Missing required function: ${fn}`
  );
}

assert(html.includes('智慧工地运营中心'), 'Missing redesigned product title');
assert(html.includes('device-detail-panel'), 'Missing device detail panel');
assert(html.includes('focus-visible'), 'Missing keyboard focus-visible styles');
assert(html.includes('prefers-reduced-motion'), 'Missing reduced motion support');
assert(!forbiddenEmojiPattern.test(html), 'UI still contains emoji icons');

console.log('UI smoke test passed');
