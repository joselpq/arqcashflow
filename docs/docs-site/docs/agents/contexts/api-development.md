---
title: "API Development Context for LLM Agents"
type: "context"
audience: ["agent"]
contexts: ["api", "rest", "backend", "security", "team-isolation"]
complexity: "intermediate"
last_updated: "2025-09-24"
version: "1.0"
agent_roles: ["api-developer", "backend-engineer", "security-engineer"]
related:
  - developer/architecture/overview.md
  - decisions/005-team-context-middleware-implementation.md
  - reference/api/index.md
dependencies: ["next.js", "prisma", "zod", "nextauth"]
---

# API Development Context for LLM Agents

## Context for LLM Agents

**Scope**: Comprehensive patterns for building secure, team-isolated API routes in ArqCashflow
**Prerequisites**: Understanding of Next.js API routes, Prisma ORM, authentication, and team-based security
**Key Patterns**:
- Team-based data isolation (CRITICAL security pattern)
- Consistent API structure and error handling
- Authentication and authorization patterns
- Input validation with Zod schemas
- RESTful resource management

## Critical Security Pattern: Team Isolation

**🚨 CRITICAL**: Every API route MUST enforce team-based data isolation. Financial data leakage between teams is a critical security vulnerability.

### Team Context Middleware Pattern

```typescript
// lib/middleware/team-context.ts
export interface TeamContext {
  user: User;
  teamId: string;
  prisma: PrismaClient; // Pre-scoped to team
}

export async function withTeamContext<T>(
  request: NextRequest,
  handler: (context: TeamContext) => Promise<T>
): Promise<NextResponse<T | ErrorResponse>> {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Get user with team information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, teamId: true },
    });

    if (!user?.teamId) {
      return NextResponse.json(
        { error: 'User not associated with a team' },
        { status: 403 }
      );
    }

    // 3. Create team-scoped context
    const context: TeamContext = {
      user,
      teamId: user.teamId,
      prisma: prisma, // In practice, could be team-scoped
    };

    // 4. Execute handler with team context
    const result = await handler(context);

    return NextResponse.json(result);

  } catch (error) {
    console.error('API Error:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.details },
        { status: 400 }
      );
    }

    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Team-Scoped Database Queries

```typescript
// ALWAYS include teamId in database queries
class SecureDatabaseService {
  // ✅ CORRECT: Team-scoped queries
  static async findContracts(teamId: string, filters?: ContractFilters) {
    return prisma.contract.findMany({
      where: {
        teamId, // CRITICAL: Always filter by team
        ...this.buildFilterWhere(filters),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findContractById(id: string, teamId: string) {
    const contract = await prisma.contract.findFirst({
      where: { id, teamId }, // CRITICAL: Both id AND teamId
    });

    if (!contract) {
      throw new NotFoundError('Contract not found or access denied');
    }

    return contract;
  }

  static async createContract(data: ContractCreateData, teamId: string) {
    return prisma.contract.create({
      data: {
        ...data,
        teamId, // CRITICAL: Always set team context
      },
    });
  }

  static async updateContract(
    id: string,
    data: ContractUpdateData,
    teamId: string
  ) {
    // CRITICAL: Verify team access before update
    await this.findContractById(id, teamId);

    return prisma.contract.update({
      where: { id },
      data: {
        ...data,
        // teamId should NOT be changeable in updates
      },
    });
  }

  static async deleteContract(id: string, teamId: string) {
    // CRITICAL: Verify team access before deletion
    await this.findContractById(id, teamId);

    return prisma.contract.delete({
      where: { id },
    });
  }
}

// ❌ WRONG: Global queries (NEVER DO THIS)
class InsecureDatabaseService {
  static async findAllContracts() {
    // SECURITY VULNERABILITY: Returns all contracts from all teams
    return prisma.contract.findMany();
  }

  static async findContractById(id: string) {
    // SECURITY VULNERABILITY: No team verification
    return prisma.contract.findFirst({ where: { id } });
  }
}
```

## API Route Structure Patterns

### 1. **Standard CRUD API Route**

```typescript
// app/api/contracts/route.ts
export async function GET(request: NextRequest) {
  return withTeamContext(request, async ({ teamId }) => {
    const { searchParams } = request.nextUrl;

    // Parse and validate query parameters
    const filters = ContractFiltersSchema.parse({
      status: searchParams.get('status'),
      clientName: searchParams.get('clientName'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      order: searchParams.get('order') || 'desc',
    });

    const contracts = await ContractService.findMany(teamId, filters);

    return {
      contracts,
      count: contracts.length,
      filters,
    };
  });
}

export async function POST(request: NextRequest) {
  return withTeamContext(request, async ({ teamId, user }) => {
    const body = await request.json();

    // Validate input data
    const validatedData = ContractCreateSchema.parse(body);

    const contract = await ContractService.create(validatedData, teamId, user.id);

    // Log the creation for audit trail
    await AuditService.logAction({
      userId: user.id,
      teamId,
      action: 'created',
      entityType: 'contract',
      entityId: contract.id,
      metadata: { api_endpoint: '/api/contracts' },
    });

    return contract;
  });
}
```

### 2. **Resource-Specific API Route**

```typescript
// app/api/contracts/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTeamContext(request, async ({ teamId }) => {
    const contract = await ContractService.findById(params.id, teamId);
    return contract;
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTeamContext(request, async ({ teamId, user }) => {
    const body = await request.json();
    const validatedData = ContractUpdateSchema.parse(body);

    const contract = await ContractService.update(
      params.id,
      validatedData,
      teamId
    );

    await AuditService.logAction({
      userId: user.id,
      teamId,
      action: 'updated',
      entityType: 'contract',
      entityId: contract.id,
      changes: validatedData,
    });

    return contract;
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withTeamContext(request, async ({ teamId, user }) => {
    await ContractService.delete(params.id, teamId);

    await AuditService.logAction({
      userId: user.id,
      teamId,
      action: 'deleted',
      entityType: 'contract',
      entityId: params.id,
    });

    return { success: true, message: 'Contract deleted successfully' };
  });
}
```

## Input Validation Patterns

### 1. **Comprehensive Schema Validation**

```typescript
import { z } from 'zod';

// Base schemas for reuse
const BaseEntitySchema = z.object({
  id: z.string().uuid().optional(),
  teamId: z.string().uuid(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

const FinancialAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .max(100000000, 'Amount exceeds maximum allowed value')
  .refine(
    (val) => Number.isFinite(val),
    'Amount must be a valid number'
  );

// Contract schemas
export const ContractCreateSchema = z.object({
  clientName: z.string().min(1, 'Client name is required').max(255),
  projectName: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(2000).optional(),
  totalValue: FinancialAmountSchema,
  signedDate: z.string().datetime('Invalid date format'),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
  // teamId will be set by the API, not from user input
});

export const ContractUpdateSchema = ContractCreateSchema.partial();

export const ContractFiltersSchema = z.object({
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
  clientName: z.string().optional(),
  sortBy: z.enum(['createdAt', 'totalValue', 'signedDate', 'clientName']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Type inference
export type ContractCreateData = z.infer<typeof ContractCreateSchema>;
export type ContractUpdateData = z.infer<typeof ContractUpdateSchema>;
export type ContractFilters = z.infer<typeof ContractFiltersSchema>;
```

### 2. **Request Validation Middleware**

```typescript
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<T> => {
    try {
      const body = await request.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('Invalid request data', error.errors);
      }
      throw error;
    }
  };
}

// Usage in API route
export async function POST(request: NextRequest) {
  return withTeamContext(request, async ({ teamId, user }) => {
    const validatedData = await validateRequest(ContractCreateSchema)(request);

    const contract = await ContractService.create(validatedData, teamId, user.id);
    return contract;
  });
}
```

## Error Handling Patterns

### 1. **Custom Error Classes**

```typescript
// lib/errors.ts
export class APIError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends APIError {
  constructor(message: string, public details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends APIError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}
```

### 2. **Consistent Error Response Format**

```typescript
interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
  path: string;
}

function formatErrorResponse(
  error: Error,
  request: NextRequest
): ErrorResponse {
  const baseResponse: ErrorResponse = {
    error: error.message,
    timestamp: new Date().toISOString(),
    path: request.nextUrl.pathname,
  };

  if (error instanceof APIError) {
    baseResponse.code = error.code;

    if (error instanceof ValidationError) {
      baseResponse.details = error.details;
    }
  }

  return baseResponse;
}
```

## Service Layer Pattern

### 1. **Separation of Concerns**

```typescript
// lib/services/contract.service.ts
export class ContractService {
  static async findMany(
    teamId: string,
    filters: ContractFilters = {}
  ): Promise<Contract[]> {
    const where = this.buildWhereClause(teamId, filters);

    return prisma.contract.findMany({
      where,
      orderBy: { [filters.sortBy]: filters.order },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      include: {
        receivables: {
          select: { id: true, amount: true, dueDate: true, status: true },
        },
      },
    });
  }

  static async findById(id: string, teamId: string): Promise<Contract> {
    const contract = await prisma.contract.findFirst({
      where: { id, teamId },
      include: {
        receivables: true,
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!contract) {
      throw new NotFoundError('Contract');
    }

    return contract;
  }

  static async create(
    data: ContractCreateData,
    teamId: string,
    userId: string
  ): Promise<Contract> {
    // Business logic validation
    await this.validateBusinessRules(data, teamId);

    const contract = await prisma.contract.create({
      data: {
        ...data,
        teamId,
        createdBy: userId,
      },
    });

    // Create initial receivables if applicable
    if (data.totalValue > 0) {
      await this.createInitialReceivables(contract);
    }

    return contract;
  }

  static async update(
    id: string,
    data: ContractUpdateData,
    teamId: string
  ): Promise<Contract> {
    // Verify existence and team access
    const existing = await this.findById(id, teamId);

    // Business logic validation
    await this.validateUpdateRules(existing, data);

    return prisma.contract.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  static async delete(id: string, teamId: string): Promise<void> {
    const contract = await this.findById(id, teamId);

    // Validate deletion rules
    if (contract.status === 'active') {
      throw new ConflictError('Cannot delete active contract');
    }

    // Soft delete with cascade handling
    await prisma.contract.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'cancelled',
      },
    });
  }

  private static buildWhereClause(
    teamId: string,
    filters: ContractFilters
  ): Prisma.ContractWhereInput {
    const where: Prisma.ContractWhereInput = {
      teamId,
      deletedAt: null, // Exclude soft-deleted records
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.clientName) {
      where.clientName = {
        contains: filters.clientName,
        mode: 'insensitive',
      };
    }

    return where;
  }

  private static async validateBusinessRules(
    data: ContractCreateData,
    teamId: string
  ): Promise<void> {
    // Check for duplicate contracts with same client/project
    const existing = await prisma.contract.findFirst({
      where: {
        teamId,
        clientName: data.clientName,
        projectName: data.projectName,
        status: { in: ['draft', 'active'] },
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictError(
        'A contract with this client and project already exists'
      );
    }

    // Validate business constraints
    if (new Date(data.signedDate) > new Date()) {
      throw new ValidationError('Signed date cannot be in the future');
    }
  }
}
```

## Response Formatting Patterns

### 1. **Consistent Success Responses**

```typescript
interface APIResponse<T = any> {
  data: T;
  meta?: {
    count?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  links?: {
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
  };
}

class ResponseFormatter {
  static success<T>(data: T, meta?: APIResponse<T>['meta']): APIResponse<T> {
    return { data, ...(meta && { meta }) };
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    totalCount: number,
    baseUrl: string
  ): APIResponse<T[]> {
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      meta: {
        count: data.length,
        page,
        limit,
        totalPages,
      },
      links: {
        first: `${baseUrl}?page=1&limit=${limit}`,
        prev: page > 1 ? `${baseUrl}?page=${page - 1}&limit=${limit}` : undefined,
        next: page < totalPages ? `${baseUrl}?page=${page + 1}&limit=${limit}` : undefined,
        last: `${baseUrl}?page=${totalPages}&limit=${limit}`,
      },
    };
  }
}

// Usage in API route
export async function GET(request: NextRequest) {
  return withTeamContext(request, async ({ teamId }) => {
    const contracts = await ContractService.findMany(teamId, filters);
    return ResponseFormatter.success(contracts, { count: contracts.length });
  });
}
```

## Rate Limiting and Security

### 1. **Rate Limiting Pattern**

```typescript
// lib/middleware/rate-limit.ts
import { LRUCache } from 'lru-cache';

const rateLimit = new LRUCache<string, number>({
  max: 500, // Maximum number of entries
  ttl: 60 * 1000, // 1 minute
});

export function rateLimitMiddleware(limit: number = 100) {
  return async (request: NextRequest, teamId: string): Promise<void> => {
    const key = `${teamId}:${request.ip || 'unknown'}`;
    const count = rateLimit.get(key) || 0;

    if (count >= limit) {
      throw new APIError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
    }

    rateLimit.set(key, count + 1);
  };
}

// Usage in high-traffic endpoints
export async function POST(request: NextRequest) {
  return withTeamContext(request, async ({ teamId }) => {
    await rateLimitMiddleware(50)(request, teamId); // 50 requests per minute

    // Process request...
  });
}
```

### 2. **Input Sanitization**

```typescript
function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potentially dangerous HTML/script tags
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .trim();
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}

// Apply to request data
export async function POST(request: NextRequest) {
  return withTeamContext(request, async ({ teamId }) => {
    const body = await request.json();
    const sanitizedBody = sanitizeInput(body);
    const validatedData = ContractCreateSchema.parse(sanitizedBody);

    // Process sanitized and validated data...
  });
}
```

## Testing Patterns

### 1. **API Route Testing**

```typescript
// tests/api/contracts.test.ts
describe('Contracts API', () => {
  let testTeam: Team;
  let testUser: User;

  beforeEach(async () => {
    testTeam = await createTestTeam();
    testUser = await createTestUser(testTeam.id);
  });

  describe('GET /api/contracts', () => {
    it('should return contracts for authenticated user team only', async () => {
      // Create contracts in different teams
      await createTestContract(testTeam.id);
      await createTestContract('other-team-id');

      const response = await request(app)
        .get('/api/contracts')
        .set('Authorization', `Bearer ${await getTestToken(testUser.id)}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].teamId).toBe(testTeam.id);
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app)
        .get('/api/contracts')
        .expect(401);
    });
  });

  describe('POST /api/contracts', () => {
    it('should create contract with team context', async () => {
      const contractData = {
        clientName: 'Test Client',
        projectName: 'Test Project',
        totalValue: 50000,
        signedDate: '2025-01-15T00:00:00Z',
      };

      const response = await request(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer ${await getTestToken(testUser.id)}`)
        .send(contractData)
        .expect(200);

      expect(response.body.data.teamId).toBe(testTeam.id);
      expect(response.body.data.clientName).toBe(contractData.clientName);
    });

    it('should validate input data', async () => {
      const invalidData = {
        clientName: '', // Invalid: empty string
        totalValue: -1000, // Invalid: negative amount
      };

      const response = await request(app)
        .post('/api/contracts')
        .set('Authorization', `Bearer ${await getTestToken(testUser.id)}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.details).toBeDefined();
    });
  });
});
```

## Performance Optimization

### 1. **Query Optimization**

```typescript
// Optimize database queries with indexes and proper selection
class OptimizedContractService {
  static async findManyOptimized(
    teamId: string,
    filters: ContractFilters
  ): Promise<Contract[]> {
    // Use database indexes effectively
    const query = prisma.contract.findMany({
      where: {
        teamId, // Indexed field first
        deletedAt: null,
        ...(filters.status && { status: filters.status }),
      },
      select: {
        // Only select needed fields
        id: true,
        clientName: true,
        projectName: true,
        totalValue: true,
        status: true,
        createdAt: true,
        // Avoid selecting large text fields unless needed
      },
      orderBy: { [filters.sortBy]: filters.order },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    });

    return query;
  }

  // Use aggregations for summary data
  static async getTeamSummary(teamId: string): Promise<TeamSummary> {
    const [
      totalContracts,
      activeContracts,
      totalValue,
    ] = await Promise.all([
      prisma.contract.count({
        where: { teamId, deletedAt: null },
      }),
      prisma.contract.count({
        where: { teamId, status: 'active', deletedAt: null },
      }),
      prisma.contract.aggregate({
        where: { teamId, status: 'active', deletedAt: null },
        _sum: { totalValue: true },
      }),
    ]);

    return {
      totalContracts,
      activeContracts,
      totalValue: totalValue._sum.totalValue || 0,
    };
  }
}
```

### 2. **Response Caching**

```typescript
// lib/cache.ts
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({
  max: 1000,
  ttl: 5 * 60 * 1000, // 5 minutes
});

export function cached<T>(
  keyGenerator: (...args: any[]) => string,
  ttl: number = 5 * 60 * 1000
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<T> {
      const key = keyGenerator(...args);
      const cached = cache.get(key);

      if (cached) {
        return cached;
      }

      const result = await method.apply(this, args);
      cache.set(key, result, { ttl });

      return result;
    };
  };
}

// Usage
class CachedContractService extends ContractService {
  @cached((teamId: string) => `contracts:${teamId}:summary`)
  static async getTeamSummary(teamId: string): Promise<TeamSummary> {
    return super.getTeamSummary(teamId);
  }
}
```

## Related Documentation

- [Team Context Middleware ADR](../decisions/005-team-context-middleware-implementation.md) - Detailed security implementation
- [Architecture Overview](../developer/architecture/overview.md) - System design context
- [API Reference](../reference/api/index.md) - Complete API documentation

---

*These patterns ensure all ArqCashflow APIs are secure, performant, and maintain strict team data isolation while providing excellent developer experience.*