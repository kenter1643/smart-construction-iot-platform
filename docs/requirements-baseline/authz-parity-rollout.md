# Service AuthZ Parity Rollout

## Scope

Services covered in this rollout:

- `backend/services/device-management`
- `backend/services/data-storage`
- `backend/services/alerts-notifications`
- `backend/services/video-streaming`

## Required Authentication Header

All protected API endpoints SHALL include:

- `Authorization: Bearer <JWT_TOKEN>`

Token verification uses `JWT_SECRET` and rejects:

- Missing token: `401 Unauthorized`
- Invalid/expired token: `403 Forbidden`

## Access Profile Dependency

Protected services call auth service:

- `GET /api/v1/auth/access/profile`

Required env:

- `AUTH_SERVICE_BASE` (default: `http://localhost:3005/api/v1/auth`)

If profile fetch fails unexpectedly, services return `502 Bad Gateway`.

## Permission Mapping

- `device-management`
  - read/list: `device.read`
  - create: `device.create`
  - update: `device.update`
  - delete: `device.delete`
  - status control: `device.control`
- `data-storage`
  - query/read: `device.read`
  - write sensor/device data: `device.update`
  - export: `data.export`
- `alerts-notifications`
  - read/list/history/stats: `alert.read`
  - create/update/delete/rule toggle/resolve/notification ops: `alert.manage`
- `video-streaming`
  - live/playback/transcode test endpoints: `video.view`

## Data Scope Enforcement

Where device-scoped access applies, services enforce device scope using auth profile `dataScope` and `device_departments`:

- `ALL`: full access
- non-`ALL`: request must resolve to an allowed device scope

Denied scope returns:

- `403 Forbidden` with scope denial details

## Validation Evidence

- Root unit tests include service auth parity cases:
  - `tests/unit/service-authz-parity.test.js`
- Service tests pass:
  - `device-management` test suite
  - `video-streaming` node test suite
- Syntax checks passed for new middleware/routes/index files.
