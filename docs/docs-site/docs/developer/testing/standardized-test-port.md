---
title: "Standardized Test Port Configuration"
type: "guide"
audience: ["developer", "agent"]
contexts: ["testing", "development", "api-testing"]
complexity: "beginner"
last_updated: "2025-09-23"
version: "1.0"
agent_roles: ["tester", "developer"]
related:
  - developer/setup.md
  - decisions/005-team-context-middleware-implementation.md
dependencies: ["next.js", "node.js"]
---

# Standardized Test Port Configuration

## Overview

All local development tests in ArqCashflow use **port 3010** as the standard testing port. This ensures consistency across all agents and developers.

## Context for LLM Agents

**Scope**: Local API testing and development server configuration
**Prerequisites**: Node.js installed, project dependencies installed
**Key Pattern**: Always kill existing processes on port 3010 before starting tests

## Quick Start

### 1. Start Test Server

```bash
# Ensure port 3010 is free and start server
npm run dev:test
```

This command:
- Kills any existing process on port 3010
- Starts the Next.js development server on port 3010
- Uses the same configuration as production

### 2. Run API Tests

```bash
# In a separate terminal
npm run test:api
```

### 3. Manual Testing

```bash
# Test any endpoint
curl http://localhost:3010/api/contracts

# Expected: 401 Unauthorized (if not logged in)
```

## Available Scripts

| Script | Description | Port |
|--------|-------------|------|
| `npm run dev` | Standard development server | 3000 (or next available) |
| `npm run dev:test` | Test development server | 3010 |
| `npm run test:api` | Run API test suite | Tests against 3010 |
| `npm run test:setup` | Verify test configuration | N/A |

## Test Utilities

### Standard Test Configuration

Location: `lib/test-utils/standard-test-config.js`

```javascript
const TEST = require('./lib/test-utils/standard-test-config');

// Configuration
TEST.port         // 3010
TEST.baseUrl      // http://localhost:3010
TEST.timeout      // Request and server timeouts

// Helpers
await TEST.ensurePortFree()    // Kill processes on 3010
await TEST.startDevServer()    // Start server on 3010
await TEST.makeRequest(path)   // Make test request
```

### Middleware Migration Tests

Location: `lib/test-utils/test-middleware-migration.js`

Tests API endpoints after middleware migration:
- Validates authentication requirements
- Checks error response formats
- Measures response times
- Compares with expected behavior

## Port 3010 Convention

### Why Port 3010?

1. **Consistency**: All agents use the same port
2. **Isolation**: Separate from default dev port (3000)
3. **Predictability**: Tests always know where to connect
4. **Clean State**: Always killed before new tests

### Ensuring Port is Free

The test utilities automatically kill any process on port 3010:

```bash
# Manual cleanup if needed
lsof -ti:3010 | xargs kill -9
```

## Testing Workflow

### For API Testing

1. **Start server on 3010**
   ```bash
   npm run dev:test
   ```

2. **Run tests in another terminal**
   ```bash
   npm run test:api
   ```

3. **Check results**
   - All endpoints should return 401 without auth
   - Response times should be < 500ms
   - Error formats should be consistent

### For Manual Testing

1. **Start server**
   ```bash
   npm run dev:test
   ```

2. **Test with curl**
   ```bash
   # GET request
   curl http://localhost:3010/api/contracts

   # POST request
   curl -X POST http://localhost:3010/api/contracts \
     -H "Content-Type: application/json" \
     -d '{"clientName":"Test"}'
   ```

## Integration with CI/CD

Future CI/CD pipelines should:

1. Use port 3010 for all API tests
2. Kill processes on 3010 before starting
3. Run `npm run dev:test` in background
4. Execute `npm run test:api` for validation
5. Clean up processes after tests

## Troubleshooting

### Port 3010 Already in Use

```bash
# Find and kill process
lsof -ti:3010 | xargs kill -9

# Or use the helper
npm run test:setup
```

### Server Not Responding

1. Check server is running: `npm run dev:test`
2. Verify port: Should show "http://localhost:3010"
3. Check logs for compilation errors

### Tests Timing Out

- Increase timeout in `standard-test-config.js`
- Ensure server is fully started before testing
- Check for middleware compilation errors

## Best Practices

1. **Always use port 3010** for local API testing
2. **Kill existing processes** before starting new tests
3. **Use standard utilities** instead of custom scripts
4. **Document test requirements** in code comments
5. **Keep tests isolated** - don't depend on external state

---

*This standardized configuration ensures all developers and agents test consistently on port 3010.*