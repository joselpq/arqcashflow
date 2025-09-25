---
title: "Authenticated Testing with Test Users"
type: "guide"
audience: ["developer", "agent"]
contexts: ["testing", "authentication", "middleware", "team-isolation", "service-validation", "crud", "uuid", "cuid"]
complexity: "intermediate"
last_updated: "2025-09-25"
version: "1.0"
agent_roles: ["test-implementer", "middleware-validator", "security-tester"]
related:
  - testing/strategies.md
  - testing/standardized-test-port.md
  - decisions/005-team-context-middleware-implementation.md
dependencies: ["next-auth", "prisma", "test-users", "port-3010"]
---

# Authenticated Testing with Test Users

Comprehensive guide for testing ArqCashflow with authenticated users, team isolation validation, and middleware testing.

## Context for LLM Agents

**Scope**: Complete authenticated testing system including test user management, team isolation testing, and middleware validation
**Prerequisites**: Understanding of NextAuth.js, team-based data isolation, and middleware architecture
**Key Patterns**:
- Test user seeding for development environments
- Authenticated API testing with real sessions
- Team isolation verification
- Middleware functionality validation
- Cross-team security testing
- Comprehensive CRUD operations testing
- Business rule validation (date constraints, value validation)
- UUID/CUID identifier support testing

## Overview

ArqCashflow implements a comprehensive authenticated testing system that provides:

- **Test Users**: Pre-configured users with known credentials
- **Team Isolation**: Two separate teams for cross-team testing
- **Sample Data**: Realistic data for each team
- **Middleware Validation**: Automated testing of team context middleware
- **Security Testing**: Verification of unauthorized access protection

## Test User System

### Available Test Users

```bash
# Test User 1 - Team Alpha
Email: test@example.com
Password: password123
User ID: cmfvsa8v00002t0im966k7o90
Team ID: cmfvsa8tt0000t0imqr96svt4
Company: Alpha Architecture Studio

# Test User 2 - Team Beta
Email: test2@example.com
Password: password123
User ID: cmfvsa8v00003t0im966k7o91
Team ID: cmfvsa8tt0001t0imqr96svt5
Company: Beta Design Group
```

### Test Data Structure

Each team has:
- **2 contracts** with different values and clients
- **2 expenses** (operational and project-related)
- **2 receivables** linked to contracts
- **Isolated data** (no cross-team visibility)

## Quick Start

### 1. Setup Test Environment

```bash
# Ensure test users exist
npx tsx lib/dev-seed.ts

# Start development server on testing port
PORT=3010 npm run dev
```

### 2. Run Authenticated Validation

```bash
# Full middleware and authentication testing
npx tsx lib/middleware/validate-with-auth.ts
```

### 3. Manual Testing with curl

```bash
# Test unauthenticated access (should return 401)
curl http://localhost:3010/api/contracts

# Test with authenticated session (requires login flow)
# See "Manual Authentication Testing" section below
```

## Test User Management

### Creating/Resetting Test Users

```bash
# Create test users (if they don't exist)
npx tsx lib/dev-seed.ts

# Reset all test data (clears and recreates)
npx tsx lib/dev-seed.ts --reset

# Check if test users exist
npx tsx -e "
import { prisma } from './lib/prisma.js';
const users = await prisma.user.findMany({
  where: { email: { in: ['test@example.com', 'test2@example.com'] } }
});
console.log(\`Found \${users.length} test users\`);
"
```

### Development Auto-Seeding

The system automatically creates test users when:
- Running in development environment (`NODE_ENV=development`)
- Test users don't already exist
- Called from other development scripts

```typescript
// Auto-seed integration
import { autoSeedIfNeeded } from '@/lib/dev-seed'

// In your development scripts
await autoSeedIfNeeded()
```

## Authentication Testing Workflows

### 1. Team Isolation Testing

**Purpose**: Verify users can only access their own team's data

```bash
# Run automated team isolation test
npx tsx lib/middleware/validate-with-auth.ts

# Expected results:
# ✅ User 1 sees only Team Alpha data
# ✅ User 2 sees only Team Beta data
# ✅ No data overlap between teams
# ✅ All records have correct team IDs
```

**Manual Verification**:
1. Login as `test@example.com`
2. Note contract/expense counts and IDs
3. Logout and login as `test2@example.com`
4. Verify completely different data set
5. Confirm no shared records

### 2. Middleware Functionality Testing

**Purpose**: Verify team context middleware works correctly

```bash
# Automated middleware validation
npx tsx lib/middleware/validate-with-auth.ts

# Tests performed:
# - Authentication enforcement (401 for unauthenticated)
# - Team scoping (automatic teamId addition)
# - Data creation (teamId automatically assigned)
# - Error handling (proper error responses)
```

**What it validates**:
- ✅ Unauthorized requests blocked with 401
- ✅ Team isolation enforced automatically
- ✅ Contract creation assigns correct teamId
- ✅ Cross-team data leakage prevented

### 3. Security Testing

**Purpose**: Verify unauthorized access is properly blocked

```bash
# Test unauthorized API access
curl http://localhost:3010/api/contracts
# Expected: 401 Unauthorized

# Test session validation
curl http://localhost:3010/api/auth/session
# Expected: 200 with null user (no session)
```

## Manual Authentication Testing

### Login Flow Testing

```bash
# 1. Get CSRF token
curl -c cookies.txt http://localhost:3010/api/auth/csrf

# 2. Extract CSRF token from response
# (Manual process - see automated script for full implementation)

# 3. Login with credentials
curl -b cookies.txt -c cookies.txt \
  -X POST http://localhost:3010/api/auth/callback/credentials \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "csrfToken=TOKEN&email=test@example.com&password=password123"

# 4. Test authenticated request
curl -b cookies.txt http://localhost:3010/api/contracts
# Expected: 200 with contract data
```

### Session Validation

```bash
# Check current session
curl -b cookies.txt http://localhost:3010/api/auth/session

# Expected response:
{
  "user": {
    "id": "cmfvsa8v00002t0im966k7o90",
    "email": "test@example.com",
    "teamId": "cmfvsa8tt0000t0imqr96svt4"
  }
}
```

## API Testing with Authentication

### Contracts API Testing

```bash
# Using authenticated validation script
npx tsx lib/middleware/validate-with-auth.ts

# Manual testing (requires session setup)
# GET contracts
curl -b cookies.txt http://localhost:3010/api/contracts

# POST new contract
curl -b cookies.txt \
  -X POST http://localhost:3010/api/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Test Client",
    "projectName": "Test Project",
    "totalValue": 50000,
    "signedDate": "2024-03-01",
    "status": "active",
    "category": "test"
  }'
```

### Cross-Team Access Testing

```bash
# Test 1: Login as User 1, get contract IDs
# Test 2: Login as User 2, try to access User 1's contracts
# Expected: Should not see User 1's data

# This is automated in the validation script:
npx tsx lib/middleware/validate-with-auth.ts
```

## Automated Testing Scripts

### Main Validation Script

**Location**: `lib/middleware/validate-with-auth.ts`

**Purpose**: Comprehensive automated testing

**What it tests**:
- Authentication system functionality
- Team isolation enforcement
- Unauthorized access blocking
- Contract creation with team assignment
- Cross-team data leakage prevention

**Usage**:
```bash
# Run full validation suite
npx tsx lib/middleware/validate-with-auth.ts

# Expected output:
# 🧪 Team Context Middleware - Authenticated Validation
# ✅ Authentication system working
# ✅ Team isolation enforced
# ✅ Unauthorized access blocked
# ✅ Middleware functionality verified
```

### Development Seeding Script

**Location**: `lib/dev-seed.ts`

**Purpose**: Create and manage test users and data

**Features**:
- Creates test users with known credentials
- Generates sample data for each team
- Supports reset/recreation of test data
- Development environment detection
- Auto-seeding capability

**Usage**:
```bash
# Create test users and data
npx tsx lib/dev-seed.ts

# Reset all test data
npx tsx lib/dev-seed.ts --reset

# Force creation in any environment
npx tsx lib/dev-seed.ts --force-dev
```

## Testing Checklist

### Pre-Testing Setup

- [ ] Development server running on port 3010
- [ ] Test users exist (`npx tsx lib/dev-seed.ts`)
- [ ] Database is accessible
- [ ] Environment variables configured

### Authentication Tests

- [ ] Unauthorized requests return 401
- [ ] Login flow works for both test users
- [ ] Sessions contain correct user and team data
- [ ] Logout clears session properly

### Team Isolation Tests

- [ ] User 1 sees only Team Alpha data
- [ ] User 2 sees only Team Beta data
- [ ] No shared contracts between teams
- [ ] All created records have correct teamId

### Middleware Tests

- [ ] withTeamContext enforces authentication
- [ ] Team scoping applied automatically
- [ ] Contract creation assigns teamId
- [ ] Error handling works correctly

### Security Tests

- [ ] Cross-team access blocked
- [ ] Invalid sessions rejected
- [ ] Malformed requests handled safely
- [ ] SQL injection prevention verified

## Troubleshooting

### Test Users Not Found

```bash
# Check if users exist
npx tsx -e "
import { prisma } from './lib/prisma.js';
const count = await prisma.user.count({
  where: { email: { in: ['test@example.com', 'test2@example.com'] } }
});
console.log(\`Test users found: \${count}\`);
"

# Create if missing
npx tsx lib/dev-seed.ts
```

### Authentication Failing

```bash
# Check server is running
curl http://localhost:3010/api/auth/session

# Check test user credentials
# Email: test@example.com
# Password: password123

# Reset test data if corrupted
npx tsx lib/dev-seed.ts --reset
```

### Team Isolation Not Working

```bash
# Run validation to see specific failure
npx tsx lib/middleware/validate-with-auth.ts

# Check middleware is properly applied
# Verify API routes use withTeamContext
```

### Port Issues

```bash
# Ensure using port 3010 for testing
PORT=3010 npm run dev

# Kill any existing processes
lsof -ti:3010 | xargs kill -9
```

## Best Practices

### For Developers

1. **Always use test users** for authenticated testing
2. **Reset test data** when needed for clean state
3. **Use port 3010** for all testing
4. **Run validation scripts** before committing changes
5. **Document new test scenarios** as you add them

### For LLM Agents

1. **Check test users exist** before attempting authentication
2. **Use automated validation** instead of manual testing
3. **Verify team isolation** in all multi-user scenarios
4. **Test unauthorized access** for security validation
5. **Reset test data** if state becomes inconsistent

### Testing Strategy

1. **Start with automated validation** to catch major issues
2. **Use manual testing** for specific scenarios
3. **Test both positive and negative cases**
4. **Verify team isolation** in all multi-tenant features
5. **Document edge cases** for future reference

## Integration with CI/CD

### Future Automation

```bash
# Proposed CI/CD testing workflow
1. npm install
2. npx tsx lib/dev-seed.ts --reset
3. PORT=3010 npm run dev & # Background
4. npx tsx lib/middleware/validate-with-auth.ts
5. kill background server
```

### Environment Variables

```bash
# Required for testing
NODE_ENV=development
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3010"
CLAUDE_API_KEY="..."
```

## Related Documentation

- **[Testing Strategies](./strategies.md)**: General testing approaches
- **[Standardized Test Port](./standardized-test-port.md)**: Port 3010 configuration
- **[Middleware Implementation](../../decisions/005-team-context-middleware-implementation.md)**: Technical details
- **[Development Setup](../setup.md)**: Environment configuration

---

*This authenticated testing system ensures ArqCashflow maintains security and team isolation while supporting rapid development and testing workflows.*