---
title: "Authentication Guide"
type: "guide"
audience: ["developer", "agent"]
contexts: ["authentication", "security", "nextauth", "sessions"]
complexity: "intermediate"
last_updated: "2025-09-22"
version: "1.0"
agent_roles: ["auth-developer", "security-implementer"]
related:
  - developer/setup.md
  - developer/architecture/overview.md
dependencies: ["nextauth.js", "prisma", "jwt"]
---

# Authentication Guide

Comprehensive authentication implementation in ArqCashflow using NextAuth.js with multi-tenant security.

## Context for LLM Agents

**Scope**: Complete authentication system including session management, team isolation, and API security
**Prerequisites**: Understanding of NextAuth.js, JWT tokens, middleware patterns, and multi-tenant architecture
**Key Patterns**:
- Credential-based authentication with NextAuth.js
- Team-based data isolation for multi-tenant security
- Middleware-based route protection
- Session management with JWT tokens
- API endpoint authentication

## Overview

ArqCashflow implements a secure authentication system with:

- **NextAuth.js**: Industry-standard authentication library
- **Credential Provider**: Email/password authentication
- **Team Isolation**: Multi-tenant data segregation
- **Route Protection**: Middleware-based authentication guards
- **Session Management**: JWT-based sessions

## Authentication Flow

### User Registration
```typescript
// POST /api/auth/register
1. User submits email, password, and name
2. Password is hashed using bcrypt
3. User record is created in database
4. Team record is auto-created for the user
5. User is automatically signed in
```

### User Login
```typescript
// POST /api/auth/signin
1. User submits credentials
2. NextAuth verifies against database
3. JWT session token is created
4. Session includes user and team information
5. User is redirected to dashboard
```

### Session Management
```typescript
// Middleware checks on every request
1. Extract session from JWT token
2. Verify token validity and expiration
3. Attach user/team context to request
4. Redirect to login if unauthorized
```

## Implementation Details

### NextAuth Configuration
```typescript
// lib/auth.ts
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Verify credentials against database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { team: true }
        });

        if (user && await bcrypt.compare(credentials.password, user.password)) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            teamId: user.teamId
          };
        }
        return null;
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.teamId = user.teamId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.teamId = token.teamId;
      return session;
    }
  }
};
```

### Route Protection Middleware
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Add team context to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-team-id', token.teamId);

  return NextResponse.next({
    request: { headers: requestHeaders }
  });
}

export const config = {
  matcher: [
    '/((?!api/auth|login|register|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### API Authentication
```typescript
// API route authentication pattern
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // All database queries include team isolation
  const data = await prisma.model.findMany({
    where: { teamId: session.user.teamId }
  });

  return NextResponse.json(data);
}
```

## Team-Based Data Isolation

### Team Creation
```typescript
// Automatic team creation during registration
const user = await prisma.user.create({
  data: {
    email,
    password: hashedPassword,
    name,
    team: {
      create: {
        name: `${name}'s Team`
      }
    }
  },
  include: { team: true }
});
```

### Data Access Patterns
```typescript
// Always filter by team in database queries
const contracts = await prisma.contract.findMany({
  where: {
    teamId: session.user.teamId,  // Required for isolation
    status: 'active'
  }
});

// Team context in all mutations
const newContract = await prisma.contract.create({
  data: {
    ...contractData,
    teamId: session.user.teamId  // Always include team
  }
});
```

## Environment Variables

### Required Configuration
```env
# NextAuth.js configuration
NEXTAUTH_SECRET="your-secure-random-string"
NEXTAUTH_URL="http://localhost:3000"  # or production URL

# Database connection (for user storage)
DATABASE_URL="postgresql://..."
```

### Secret Generation
```bash
# Generate secure NEXTAUTH_SECRET
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Security Features

### Password Security
- **Bcrypt Hashing**: Industry-standard password hashing
- **Salt Rounds**: Configurable salt rounds for performance/security balance
- **No Plain Text**: Passwords never stored in plain text

### Session Security
- **JWT Tokens**: Stateless, secure session management
- **Token Expiration**: Configurable session timeouts
- **Secure Cookies**: HTTPOnly, Secure, SameSite attributes

### Data Isolation
- **Team Boundaries**: Complete data separation between teams
- **API Level**: All endpoints enforce team filtering
- **Database Level**: Team ID required in all queries

## Client-Side Usage

### Session Hook
```typescript
// Using NextAuth session hook
import { useSession } from 'next-auth/react';

export default function Component() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <p>Loading...</p>;
  if (status === 'unauthenticated') return <p>Not authenticated</p>;

  return <p>Welcome {session.user.name}!</p>;
}
```

### Protected Pages
```typescript
// Page-level protection
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return <div>Protected content</div>;
}
```

## API Integration

### Session Access in API Routes
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use session.user.teamId for team isolation
  // Use session.user.id for user-specific operations
}
```

### Frontend API Calls
```typescript
// API calls automatically include session
const response = await fetch('/api/contracts', {
  method: 'GET',
  credentials: 'include'  // Include session cookies
});
```

## Troubleshooting

### Common Issues

#### "Session not found"
```typescript
// Ensure session provider wraps your app
// app/layout.tsx
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
```

#### "Unauthorized API access"
```typescript
// Check session in API routes
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

#### "Team isolation not working"
```typescript
// Always include teamId in queries
const data = await prisma.model.findMany({
  where: {
    teamId: session.user.teamId,  // This is required!
    // ... other filters
  }
});
```

### Debug Mode
```typescript
// Enable NextAuth debug logging
export const authOptions: AuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  // ... other options
};
```

## Testing Authentication

### Test User Creation
```typescript
// Create test users for different teams
const testUser1 = await prisma.user.create({
  data: {
    email: 'test1@example.com',
    password: await bcrypt.hash('password', 10),
    name: 'Test User 1',
    team: { create: { name: 'Team 1' } }
  }
});
```

### API Testing
```bash
# Test authentication endpoints
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test protected API with session
curl -X GET http://localhost:3000/api/contracts \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

## Related Documentation

- [Development Setup](./setup.md) - Environment configuration
- [Architecture Overview](./architecture/overview.md) - System design
- [API Reference](../reference/api/index.md) - API endpoints

---

*This authentication system provides secure, scalable multi-tenant access control for ArqCashflow while maintaining simplicity for developers and LLM agents.*