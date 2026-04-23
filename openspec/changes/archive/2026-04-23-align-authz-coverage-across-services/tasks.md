## 1. Service Auth Middleware Parity

- [x] 1.1 Add JWT authentication middleware to data-storage routes
- [x] 1.2 Add JWT authentication middleware to alerts-notifications routes
- [x] 1.3 Add JWT authentication middleware to video-streaming routes

## 2. Permission and Scope Enforcement

- [x] 2.1 Define and map permission codes for each protected endpoint
- [x] 2.2 Integrate access-profile lookup and apply data-scope filters where applicable
- [x] 2.3 Add/adjust tests for unauthorized, forbidden, and scoped-access scenarios

## 3. Rollout and Validation

- [x] 3.1 Validate cross-service consistency of error responses and permission behavior
- [x] 3.2 Update docs for required auth headers and permission expectations
