# Device Management UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the existing `frontend/index.html` device management page into a mixed operations-admin dashboard with dark navigation, light content, table-first device management, and a contextual details panel.

**Architecture:** Keep the current static single-file frontend. Replace the visual shell and most CSS, preserve the existing device-management API endpoints, and centralize page state in plain JavaScript arrays and IDs. Add one small Node-based smoke test to enforce important UI contract checks before manual browser verification.

**Tech Stack:** Native HTML, CSS, JavaScript, Fetch API, Node.js for static smoke checks.

---

## Scope Check

This plan implements one page only: the existing device management frontend. It does not implement new backend endpoints, a router, map views, video pages, or a full admin system.

## Files

- Modify: `frontend/index.html`
- Create: `frontend/ui-smoke-test.mjs`
- Optional read-only reference: `docs/superpowers/specs/2026-04-18-device-management-ui-redesign-design.md`

## UI Contract

The implementation must keep these DOM IDs because existing JavaScript and smoke checks depend on them:

- `toast-container`
- `api-status`
- `status-dot`
- `status-text`
- `total-devices`
- `online-devices`
- `offline-devices`
- `alerts`
- `search`
- `filter-type`
- `filter-protocol`
- `filter-status`
- `device-table-body`
- `device-detail-panel`
- `add-device-modal`
- `edit-modal`
- `add-deviceId`
- `add-name`
- `add-type`
- `add-protocol`
- `add-status`
- `edit-id`
- `edit-deviceId`
- `edit-name`
- `edit-type`
- `edit-protocol`
- `edit-status`

The implementation must define these JavaScript functions:

- `fetchDevices`
- `renderDevices`
- `renderDeviceDetails`
- `selectDevice`
- `updateStats`
- `applyFilters`
- `searchDevices`
- `resetFilters`
- `openAddDeviceModal`
- `closeAddDeviceModal`
- `saveAddDevice`
- `editDevice`
- `closeEditModal`
- `saveEditDevice`
- `deleteDevice`
- `checkApiStatus`
- `showToast`

## Task 1: Add Static UI Smoke Test

**Files:**

- Create: `frontend/ui-smoke-test.mjs`

- [x] **Step 1: Write a failing static smoke test**

Create `frontend/ui-smoke-test.mjs` with this exact content:

```js
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
```

- [x] **Step 2: Run the smoke test and verify it fails**

Run:

```bash
node frontend/ui-smoke-test.mjs
```

Expected: FAIL with `Missing required id: device-detail-panel` or `UI still contains emoji icons`.

- [x] **Step 3: Commit the failing smoke test**

Run:

```bash
git add frontend/ui-smoke-test.mjs
git commit -m "test: add device management UI smoke test"
```

Expected: commit succeeds and includes only `frontend/ui-smoke-test.mjs`.

## Task 2: Replace Page Shell And Design Tokens

**Files:**

- Modify: `frontend/index.html`
- Test: `frontend/ui-smoke-test.mjs`

- [x] **Step 1: Replace CSS variables and base layout**

In `frontend/index.html`, replace the existing `:root`, reset, body, `.app-container`, `.sidebar`, `.main-content`, `.top-header`, `.page-content`, `.btn`, `.form-control`, `.modal`, `.toast`, and responsive CSS sections with the mixed operations-admin design. Use these exact tokens:

```css
:root {
  --bg-shell: #0f172a;
  --bg-sidebar: #172033;
  --bg-main: #eef3f8;
  --surface: #ffffff;
  --surface-soft: #f8fafc;
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --success: #16a34a;
  --warning: #f59e0b;
  --danger: #dc2626;
  --text: #172033;
  --muted: #64748b;
  --muted-strong: #475569;
  --border: #dbe3ee;
  --sidebar-text: #cbd5e1;
  --sidebar-muted: #94a3b8;
  --shadow-card: 0 14px 34px rgba(15, 23, 42, 0.08);
  --shadow-modal: 0 24px 70px rgba(15, 23, 42, 0.26);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 14px;
  --space-lg: 20px;
  --space-xl: 28px;
  --transition: 180ms ease;
}
```

Use this layout structure in the body:

```html
<div class="toast-container" id="toast-container"></div>
<div class="app-shell">
  <aside class="sidebar" aria-label="主导航">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">
        <svg class="icon" viewBox="0 0 24 24">
          <path d="M4 20h16M6 20V8l6-4 6 4v12M9 20v-6h6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      </span>
      <div>
        <strong>智慧工地运营中心</strong>
        <small>Smart Construction IoT</small>
      </div>
    </div>
    <nav class="sidebar-nav">
      <button class="nav-item" type="button">总览看板</button>
      <button class="nav-item active" type="button">设备管理</button>
      <button class="nav-item" type="button">视频监控</button>
      <button class="nav-item" type="button">告警中心</button>
      <button class="nav-item" type="button">数据分析</button>
      <button class="nav-item" type="button">系统设置</button>
    </nav>
    <div class="sidebar-footer">
      <div class="api-status" id="api-status">
        <span class="status-dot" id="status-dot"></span>
        <span id="status-text">检查中</span>
      </div>
    </div>
  </aside>
  <div class="workspace">
    <header class="topbar">
      <div>
        <span class="topbar-label">当前项目</span>
        <strong>城南工地 A</strong>
      </div>
      <div class="topbar-actions">
        <label class="global-search">
          <span class="sr-only">全局搜索</span>
          <input type="search" placeholder="搜索设备、告警或点位">
        </label>
        <button class="icon-button" type="button" aria-label="查看通知">
          <svg class="icon" viewBox="0 0 24 24">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </button>
        <span class="user-chip">管理员</span>
      </div>
    </header>
    <main class="page-content"></main>
  </div>
</div>
```

- [x] **Step 2: Replace emoji icons with inline SVG icons**

Use a small inline SVG pattern for each icon. Example:

```html
<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M4 20h16M6 20V8l6-4 6 4v12M9 20v-6h6v6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>
```

Every functional icon must use `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">` and every icon-only button must include either visible text or `aria-label`.

- [x] **Step 3: Run the smoke test**

Run:

```bash
node frontend/ui-smoke-test.mjs
```

Expected: still FAIL because details panel and function rewrites may not be complete yet, but the emoji failure should be gone.

## Task 3: Rebuild Main Device Management Markup

**Files:**

- Modify: `frontend/index.html`
- Test: `frontend/ui-smoke-test.mjs`

- [x] **Step 1: Replace the main content markup**

Replace the current page header, stats grid, filter card, and device table card with this structure:

```html
<section class="page-hero">
  <div>
    <p class="eyebrow">设备资产中心</p>
    <h1>设备管理</h1>
    <p>统一管理传感器、摄像头、控制器与执行器，快速识别在线状态和异常风险。</p>
  </div>
  <div class="page-actions">
    <button class="btn btn-secondary" type="button" onclick="fetchDevices()">刷新数据</button>
    <button class="btn btn-primary" type="button" onclick="openAddDeviceModal()">新增设备</button>
  </div>
</section>

<section class="stats-grid" aria-label="设备统计">
  <article class="stat-card">
    <span class="stat-label">总设备数</span>
    <strong class="stat-value" id="total-devices">0</strong>
    <span class="stat-note">当前筛选范围</span>
  </article>
  <article class="stat-card success">
    <span class="stat-label">在线设备</span>
    <strong class="stat-value" id="online-devices">0</strong>
    <span class="stat-note" id="online-rate">在线率 0%</span>
  </article>
  <article class="stat-card warning">
    <span class="stat-label">离线/异常</span>
    <strong class="stat-value" id="offline-devices">0</strong>
    <span class="stat-note">需关注设备</span>
  </article>
  <article class="stat-card danger">
    <span class="stat-label">活跃告警</span>
    <strong class="stat-value" id="alerts">0</strong>
    <span class="stat-note">基于离线/错误设备</span>
  </article>
</section>

<section class="filter-panel" aria-label="设备筛选">
  <div class="search-field">
    <label for="search">关键词搜索</label>
    <input type="search" id="search" class="form-control" placeholder="搜索设备名称或 ID" oninput="searchDevices()">
  </div>
  <label>
    设备类型
    <select id="filter-type" class="form-control" onchange="searchDevices()">
      <option value="">全部类型</option>
      <option value="sensor">传感器</option>
      <option value="camera">摄像头</option>
      <option value="actuator">执行器</option>
      <option value="controller">控制器</option>
    </select>
  </label>
  <label>
    通讯协议
    <select id="filter-protocol" class="form-control" onchange="searchDevices()">
      <option value="">全部协议</option>
      <option value="mqtt">MQTT</option>
      <option value="http">HTTP</option>
      <option value="modbus-tcp">Modbus TCP</option>
    </select>
  </label>
  <label>
    设备状态
    <select id="filter-status" class="form-control" onchange="searchDevices()">
      <option value="">全部状态</option>
      <option value="online">在线</option>
      <option value="offline">离线</option>
      <option value="disconnected">断开</option>
      <option value="error">错误</option>
    </select>
  </label>
  <button class="btn btn-secondary" type="button" onclick="resetFilters()">重置</button>
</section>

<section class="content-grid">
  <article class="device-list-card">
    <div class="section-header">
      <div>
        <h2>设备列表</h2>
        <p id="result-summary">正在加载设备</p>
      </div>
      <button class="btn btn-secondary" type="button" onclick="showToast('导出功能已记录，当前页面先保留入口')">导出</button>
    </div>
    <div class="device-table-container">
      <table class="device-table">
        <thead>
          <tr>
            <th>设备</th>
            <th>类型</th>
            <th>协议</th>
            <th>状态</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody id="device-table-body">
          <tr>
            <td colspan="6">
              <div class="loading">
                <span class="spinner"></span>
                <span>正在加载设备</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
  <aside class="device-detail-panel" id="device-detail-panel" aria-label="设备详情">
    <div class="detail-empty">
      <h2>选择设备查看详情</h2>
      <p>点击左侧设备列表中的任意行，可查看状态、协议、配置摘要和快捷操作。</p>
    </div>
  </aside>
</section>
```

- [x] **Step 2: Add responsive card fallback markup support**

Add CSS so `.content-grid` is two columns on desktop and one column under `1180px`. Under `720px`, hide the table header and render each row as stacked cells using `td::before { content: attr(data-label); }`.

- [x] **Step 3: Run the smoke test**

Run:

```bash
node frontend/ui-smoke-test.mjs
```

Expected: may still FAIL on missing functions if JavaScript has not been updated; all required IDs should now pass.

## Task 4: Centralize Device State And Details Panel

**Files:**

- Modify: `frontend/index.html`
- Test: `frontend/ui-smoke-test.mjs`

- [x] **Step 1: Add state variables**

At the top of the `<script>` block, use:

```js
const API_BASE = 'http://localhost:3001/api/v1';
const HEALTH_CHECK_URL = 'http://localhost:3001/health';

let allDevices = [];
let filteredDevices = [];
let selectedDeviceId = null;
let currentEditId = null;
```

- [x] **Step 2: Add formatting helpers**

Add these helpers:

```js
function getTypeLabel(type) {
  const labels = {
    sensor: '传感器',
    camera: '摄像头',
    actuator: '执行器',
    controller: '控制器'
  };
  return labels[type] || type || '未知类型';
}

function getStatusLabel(status) {
  const labels = {
    online: '在线',
    offline: '离线',
    disconnected: '断开',
    error: '错误'
  };
  return labels[status] || status || '未知';
}

function formatDateTime(value) {
  if (!value) return '暂无记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂无记录';
  return date.toLocaleString('zh-CN', { hour12: false });
}

function getDeviceInitial(device) {
  return (device.name || device.deviceId || '?').trim().slice(0, 1).toUpperCase();
}
```

- [x] **Step 3: Implement `selectDevice` and `renderDeviceDetails`**

Use this implementation:

```js
function selectDevice(id) {
  selectedDeviceId = id;
  renderDevices(filteredDevices);
  const selected = allDevices.find((device) => device.id === id);
  renderDeviceDetails(selected || null);
}

function renderDeviceDetails(device) {
  const panel = document.getElementById('device-detail-panel');

  if (!device) {
    panel.innerHTML = `
      <div class="detail-empty">
        <h2>选择设备查看详情</h2>
        <p>点击左侧设备列表中的任意行，可查看状态、协议、配置摘要和快捷操作。</p>
      </div>
    `;
    return;
  }

  const config = device.configuration || {};
  const configItems = Object.entries(config).slice(0, 4);
  const hasConfig = configItems.length > 0;

  panel.innerHTML = `
    <div class="detail-header">
      <div class="device-avatar">${getDeviceInitial(device)}</div>
      <div>
        <h2>${device.name}</h2>
        <p>${device.deviceId}</p>
      </div>
    </div>
    <div class="detail-status status-${device.status}">
      <span>${getStatusLabel(device.status)}</span>
      <small>最后更新 ${formatDateTime(device.updatedAt || device.updated_at)}</small>
    </div>
    <dl class="detail-list">
      <div><dt>设备类型</dt><dd>${getTypeLabel(device.type)}</dd></div>
      <div><dt>通讯协议</dt><dd>${device.protocol || '未配置'}</dd></div>
      <div><dt>内部 ID</dt><dd>${device.id}</dd></div>
      <div><dt>创建时间</dt><dd>${formatDateTime(device.createdAt || device.created_at)}</dd></div>
    </dl>
    <section class="detail-section">
      <h3>配置摘要</h3>
      ${
        hasConfig
          ? `<ul>${configItems.map(([key, value]) => `<li><span>${key}</span><strong>${String(value)}</strong></li>`).join('')}</ul>`
          : '<p class="muted">暂无通讯配置。</p>'
      }
    </section>
    <section class="detail-section">
      <h3>最近告警</h3>
      <p class="muted">${device.status === 'online' ? '暂无活跃告警。' : '设备当前不在线，请检查连接状态。'}</p>
    </section>
    <div class="detail-actions">
      <button class="btn btn-primary" type="button" onclick="editDevice(${device.id})">编辑配置</button>
      <button class="btn btn-danger" type="button" onclick="deleteDevice(${device.id})">删除设备</button>
    </div>
  `;
}
```

- [x] **Step 4: Run the smoke test**

Run:

```bash
node frontend/ui-smoke-test.mjs
```

Expected: may still FAIL on render or emoji checks until all markup and toasts are cleaned up.

## Task 5: Rewrite Rendering, Stats, And Filters

**Files:**

- Modify: `frontend/index.html`
- Test: `frontend/ui-smoke-test.mjs`

- [x] **Step 1: Replace `updateStats`**

Use this implementation:

```js
function updateStats(devices) {
  const totalDevices = devices.length;
  const onlineDevices = devices.filter((device) => device.status === 'online').length;
  const offlineDevices = devices.filter((device) => ['offline', 'disconnected', 'error'].includes(device.status)).length;
  const alerts = offlineDevices;
  const onlineRate = totalDevices === 0 ? 0 : Math.round((onlineDevices / totalDevices) * 100);

  document.getElementById('total-devices').textContent = totalDevices;
  document.getElementById('online-devices').textContent = onlineDevices;
  document.getElementById('offline-devices').textContent = offlineDevices;
  document.getElementById('alerts').textContent = alerts;

  const onlineRateEl = document.getElementById('online-rate');
  if (onlineRateEl) {
    onlineRateEl.textContent = `在线率 ${onlineRate}%`;
  }
}
```

- [x] **Step 2: Replace `renderDevices`**

Use this implementation:

```js
function renderDevices(devices) {
  const tbody = document.getElementById('device-table-body');
  const resultSummary = document.getElementById('result-summary');

  if (resultSummary) {
    resultSummary.textContent = `共 ${devices.length} 台设备`;
  }

  if (devices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <h3>暂无匹配设备</h3>
            <p>调整筛选条件，或新增一台设备。</p>
          </div>
        </td>
      </tr>
    `;
    renderDeviceDetails(null);
    return;
  }

  if (!selectedDeviceId || !devices.some((device) => device.id === selectedDeviceId)) {
    selectedDeviceId = devices[0].id;
  }

  tbody.innerHTML = devices.map((device) => `
    <tr class="${device.id === selectedDeviceId ? 'selected' : ''}" onclick="selectDevice(${device.id})">
      <td data-label="设备">
        <div class="device-cell">
          <span class="device-avatar small">${getDeviceInitial(device)}</span>
          <div>
            <strong>${device.name}</strong>
            <small>${device.deviceId}</small>
          </div>
        </div>
      </td>
      <td data-label="类型"><span class="tag">${getTypeLabel(device.type)}</span></td>
      <td data-label="协议"><span class="tag neutral">${device.protocol || '未配置'}</span></td>
      <td data-label="状态"><span class="status-badge ${device.status}">${getStatusLabel(device.status)}</span></td>
      <td data-label="更新时间">${formatDateTime(device.updatedAt || device.updated_at)}</td>
      <td data-label="操作">
        <div class="row-actions" onclick="event.stopPropagation()">
          <button class="btn btn-ghost" type="button" onclick="selectDevice(${device.id})">查看</button>
          <button class="btn btn-ghost" type="button" onclick="editDevice(${device.id})">编辑</button>
          <button class="btn btn-danger subtle" type="button" onclick="deleteDevice(${device.id})">删除</button>
        </div>
      </td>
    </tr>
  `).join('');

  renderDeviceDetails(allDevices.find((device) => device.id === selectedDeviceId) || devices[0]);
}
```

- [x] **Step 3: Replace `applyFilters`, `searchDevices`, and `resetFilters`**

Use this implementation:

```js
function applyFilters() {
  const searchTerm = document.getElementById('search').value.trim().toLowerCase();
  const filterType = document.getElementById('filter-type').value;
  const filterProtocol = document.getElementById('filter-protocol').value;
  const filterStatus = document.getElementById('filter-status').value;

  filteredDevices = allDevices.filter((device) => {
    const matchesSearch =
      !searchTerm ||
      (device.name || '').toLowerCase().includes(searchTerm) ||
      (device.deviceId || '').toLowerCase().includes(searchTerm);
    const matchesType = !filterType || device.type === filterType;
    const matchesProtocol = !filterProtocol || device.protocol === filterProtocol;
    const matchesStatus = !filterStatus || device.status === filterStatus;
    return matchesSearch && matchesType && matchesProtocol && matchesStatus;
  });

  updateStats(filteredDevices);
  renderDevices(filteredDevices);
}

function searchDevices() {
  applyFilters();
}

function resetFilters() {
  document.getElementById('search').value = '';
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-protocol').value = '';
  document.getElementById('filter-status').value = '';
  selectedDeviceId = null;
  applyFilters();
}
```

- [x] **Step 4: Run the smoke test**

Run:

```bash
node frontend/ui-smoke-test.mjs
```

Expected: all function-related checks should pass if previous tasks are complete.

## Task 6: Preserve CRUD Flows And Improve Modal UX

**Files:**

- Modify: `frontend/index.html`
- Test: `frontend/ui-smoke-test.mjs`

- [x] **Step 1: Replace `fetchDevices` and `checkApiStatus`**

Use this implementation:

```js
async function checkApiStatus() {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  try {
    const response = await fetch(HEALTH_CHECK_URL);
    const data = await response.json();
    if (!data.success) throw new Error('Health check failed');

    statusDot.classList.remove('disconnected');
    statusText.textContent = `${data.data.mode || 'API'} 模式 · 已连接`;
  } catch (error) {
    statusDot.classList.add('disconnected');
    statusText.textContent = 'API 未连接';
    console.error('API connection failed:', error);
  }
}

async function fetchDevices() {
  const tbody = document.getElementById('device-table-body');
  tbody.innerHTML = `
    <tr>
      <td colspan="7">
        <div class="loading">
          <span class="spinner"></span>
          <span>正在加载设备数据</span>
        </div>
      </td>
    </tr>
  `;

  try {
    const response = await fetch(`${API_BASE}/devices`);
    const data = await response.json();
    allDevices = data.data.devices || [];
    selectedDeviceId = selectedDeviceId || (allDevices[0] && allDevices[0].id) || null;
    applyFilters();
  } catch (error) {
    console.error('Failed to fetch devices:', error);
    allDevices = [];
    filteredDevices = [];
    updateStats([]);
    renderDeviceDetails(null);
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state error">
            <h3>获取设备列表失败</h3>
            <p>请确认设备管理服务运行在 http://localhost:3001。</p>
            <button class="btn btn-primary" type="button" onclick="fetchDevices()">重试</button>
          </div>
        </td>
      </tr>
    `;
  }
}
```

- [x] **Step 2: Update modal open/close functions**

Use:

```js
function openAddDeviceModal() {
  document.getElementById('add-deviceId').value = '';
  document.getElementById('add-name').value = '';
  document.getElementById('add-type').value = '';
  document.getElementById('add-protocol').value = '';
  document.getElementById('add-status').value = 'online';
  document.getElementById('add-device-modal').classList.add('show');
  document.getElementById('add-deviceId').focus();
}

function closeAddDeviceModal() {
  document.getElementById('add-device-modal').classList.remove('show');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('show');
  currentEditId = null;
}
```

- [x] **Step 3: Preserve `saveAddDevice`, `editDevice`, `saveEditDevice`, and `deleteDevice` API behavior**

Keep the same endpoints:

```js
POST   http://localhost:3001/api/v1/devices
GET    http://localhost:3001/api/v1/devices/:id
PUT    http://localhost:3001/api/v1/devices/:id
DELETE http://localhost:3001/api/v1/devices/:id
```

After successful create/update/delete, call `await fetchDevices()` and show a toast without emoji:

```js
showToast('设备保存成功');
showToast('设备删除成功');
showToast('操作失败，请检查网络连接', 'error');
```

- [x] **Step 4: Run the smoke test**

Run:

```bash
node frontend/ui-smoke-test.mjs
```

Expected: PASS with `UI smoke test passed`.

## Task 7: Manual Verification And Final Commit

**Files:**

- Modify: `frontend/index.html`
- Create: `frontend/ui-smoke-test.mjs`

- [x] **Step 1: Run static smoke test**

Run:

```bash
node frontend/ui-smoke-test.mjs
```

Expected:

```text
UI smoke test passed
```

- [x] **Step 2: Start demo backend if needed**

If the device management API is not running, run:

```bash
cd backend/services/device-management
node src/demo-index.js
```

Expected: demo service listens on `http://localhost:3001`.

- [x] **Step 3: Open the static frontend**

Run:

```bash
open frontend/index.html
```

Expected: browser opens the redesigned device management page.

- [x] **Step 4: Manual interaction checks**

Verify:

- API status shows connected when demo backend is running.
- Device list loads.
- Clicking a device row updates `device-detail-panel`.
- Search filters by name and ID.
- Type, protocol, and status filters update list and stats.
- Reset clears all filters.
- Add modal opens and can create a device.
- Edit modal opens with existing data.
- Delete asks for confirmation and removes the device.
- Page has no emoji UI icons.
- At 375px, 768px, 1024px, and 1440px widths, there is no horizontal page overflow.

- [x] **Step 5: Commit implementation**

Run:

```bash
git add frontend/index.html frontend/ui-smoke-test.mjs
git commit -m "feat: redesign device management UI"
```

Expected: commit includes only `frontend/index.html` and `frontend/ui-smoke-test.mjs`.

## Self-Review Checklist

- Spec coverage: the plan covers mixed operations-admin layout, dark navigation, light content, stats, filters, table, details panel, modals, responsive behavior, accessibility, and no backend API changes.
- Placeholder scan: the plan contains no unresolved placeholder instructions.
- Type consistency: DOM IDs and function names match the smoke test and implementation steps.
- Risk: the implementation rewrites a large single HTML file. Keep commits task-sized and verify with `git diff -- frontend/index.html` before the final commit.
