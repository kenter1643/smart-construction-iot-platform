## Why

Current authz/data-scope enforcement is complete for `device-management` but not yet consistent across `data-storage`, `alerts-notifications`, and `video-streaming`. This creates behavior divergence against baseline security intent.

## What Changes

- Introduce unified JWT authentication and permission enforcement for remaining core backend services.
- Add access-profile based data-scope enforcement where resource queries are user/department scoped.
- Standardize error shape and permission codes across services.

## Capabilities

### New Capabilities
- `service-authz-parity`: Ensure consistent authentication, authorization, and data scope enforcement across all core backend services.

### Modified Capabilities
- None.

## Impact

- Affected modules: `backend/services/data-storage`, `backend/services/alerts-notifications`, `backend/services/video-streaming`
- Runtime behavior: unauthorized requests become explicitly rejected in previously unguarded paths.
- Process: improves alignment with baseline security governance.
